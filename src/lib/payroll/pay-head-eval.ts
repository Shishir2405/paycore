/**
 * Safe pay-head evaluator. Computes the rupee value of a single pay head given a
 * payroll context. The Formula branch uses a hand-written recursive-descent
 * parser over a tiny grammar — NEVER eval/Function — so untrusted, tenant-authored
 * formulas can be stored and run without code-injection risk.
 *
 * Grammar (precedence climbing):
 *   expr    := term   (('+' | '-') term)*
 *   term    := factor (('*' | '/' | '%') factor)*
 *   factor  := NUMBER | '{' CODE '}' | '(' expr ')' | ('+' | '-') factor
 *
 * `{CODE}` resolves to the already-computed value of another pay head (or the
 * special BASIC / GROSS references). Any unknown token or reference is rejected.
 *
 * Exported so the payroll engine can import `evaluatePayHead`.
 */

export type PayHeadCalcType = 'Flat' | 'PercentOfBasic' | 'PercentOfGross' | 'Formula';

/** Minimal shape the evaluator needs — compatible with the PayHead model. */
export type EvaluablePayHead = {
  code: string;
  calcType: PayHeadCalcType;
  value: number;
  formula?: string | null;
};

export type PayHeadContext = {
  basic: number;
  gross: number;
  /** Values of sibling pay heads, keyed by uppercase code. */
  heads: Record<string, number>;
};

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

/** Round to 2 decimals (paise) avoiding binary float drift. */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ─── Tokenizer ──────────────────────────────────────────────────────────────

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ref'; code: string }
  | { kind: 'op'; value: '+' | '-' | '*' | '/' | '%' }
  | { kind: 'lparen' }
  | { kind: 'rparen' };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    const ch = input[i];

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i += 1;
      continue;
    }

    // Numbers (integers or decimals)
    if ((ch >= '0' && ch <= '9') || ch === '.') {
      let num = '';
      let dots = 0;
      while (i < input.length && ((input[i] >= '0' && input[i] <= '9') || input[i] === '.')) {
        if (input[i] === '.') dots += 1;
        if (dots > 1) throw new FormulaError('Malformed number with multiple decimal points');
        num += input[i];
        i += 1;
      }
      const value = Number.parseFloat(num);
      if (!Number.isFinite(value)) throw new FormulaError(`Invalid number "${num}"`);
      tokens.push({ kind: 'num', value });
      continue;
    }

    // {CODE} references
    if (ch === '{') {
      const end = input.indexOf('}', i + 1);
      if (end === -1) throw new FormulaError('Unterminated reference — missing "}"');
      const code = input.slice(i + 1, end).trim().toUpperCase();
      if (!/^[A-Z0-9_]+$/.test(code)) {
        throw new FormulaError(`Invalid reference {${code}} — use letters, digits, underscore`);
      }
      tokens.push({ kind: 'ref', code });
      i = end + 1;
      continue;
    }

    // Operators
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '%') {
      tokens.push({ kind: 'op', value: ch });
      i += 1;
      continue;
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen' });
      i += 1;
      continue;
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen' });
      i += 1;
      continue;
    }

    // Anything else is rejected — no identifiers, no function calls, no eval surface.
    throw new FormulaError(`Unexpected character "${ch}" in formula`);
  }

  return tokens;
}

// ─── Parser / evaluator (precedence climbing) ───────────────────────────────

class Parser {
  private pos = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly ctx: PayHeadContext,
    /** When true, references resolve to 0 (used by static formula validation). */
    private readonly syntaxOnly = false,
  ) {}

  evaluate(): number {
    const value = this.parseExpr();
    if (this.pos < this.tokens.length) {
      throw new FormulaError('Unexpected trailing tokens in formula');
    }
    return value;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private parseExpr(): number {
    let left = this.parseTerm();
    let tok = this.peek();
    while (tok && tok.kind === 'op' && (tok.value === '+' || tok.value === '-')) {
      this.pos += 1;
      const right = this.parseTerm();
      left = tok.value === '+' ? left + right : left - right;
      tok = this.peek();
    }
    return left;
  }

  private parseTerm(): number {
    let left = this.parseFactor();
    let tok = this.peek();
    while (tok && tok.kind === 'op' && (tok.value === '*' || tok.value === '/' || tok.value === '%')) {
      this.pos += 1;
      const right = this.parseFactor();
      if (tok.value === '*') left = left * right;
      else if (tok.value === '/') {
        if (right === 0) throw new FormulaError('Division by zero');
        left = left / right;
      } else {
        if (right === 0) throw new FormulaError('Modulo by zero');
        left = left % right;
      }
      tok = this.peek();
    }
    return left;
  }

  private parseFactor(): number {
    const tok = this.peek();
    if (!tok) throw new FormulaError('Unexpected end of formula');

    // Unary +/-
    if (tok.kind === 'op' && (tok.value === '+' || tok.value === '-')) {
      this.pos += 1;
      const v = this.parseFactor();
      return tok.value === '-' ? -v : v;
    }

    if (tok.kind === 'num') {
      this.pos += 1;
      return tok.value;
    }

    if (tok.kind === 'ref') {
      this.pos += 1;
      return this.resolveRef(tok.code);
    }

    if (tok.kind === 'lparen') {
      this.pos += 1;
      const v = this.parseExpr();
      const close = this.peek();
      if (!close || close.kind !== 'rparen') throw new FormulaError('Missing closing ")"');
      this.pos += 1;
      return v;
    }

    throw new FormulaError('Unexpected token in formula');
  }

  private resolveRef(code: string): number {
    // In syntax-only mode every reference resolves to 0 so we surface structural
    // errors without requiring sibling pay heads to actually exist.
    if (this.syntaxOnly) return 0;
    if (code === 'BASIC') return this.ctx.basic;
    if (code === 'GROSS') return this.ctx.gross;
    const value = this.ctx.heads[code];
    if (value === undefined) {
      throw new FormulaError(`Unknown reference {${code}} — pay head not found in context`);
    }
    return value;
  }
}

/**
 * Evaluate a single pay head against the payroll context. Returns a non-negative
 * rupee amount rounded to 2 decimals. Throws FormulaError on a malformed formula
 * or unknown reference (caller decides whether to surface or skip).
 */
export function evaluatePayHead(head: EvaluablePayHead, context: PayHeadContext): number {
  let result: number;

  switch (head.calcType) {
    case 'Flat':
      result = head.value;
      break;
    case 'PercentOfBasic':
      result = (context.basic * head.value) / 100;
      break;
    case 'PercentOfGross':
      result = (context.gross * head.value) / 100;
      break;
    case 'Formula': {
      const expr = (head.formula ?? '').trim();
      if (!expr) throw new FormulaError('Formula is empty');
      const tokens = tokenize(expr);
      if (tokens.length === 0) throw new FormulaError('Formula is empty');
      result = new Parser(tokens, context).evaluate();
      break;
    }
    default:
      throw new FormulaError(`Unsupported calc type "${String(head.calcType)}"`);
  }

  if (!Number.isFinite(result)) throw new FormulaError('Formula did not produce a finite number');
  // Pay heads never go negative — clamp to protect downstream net-pay math.
  return round2(Math.max(0, result));
}

/**
 * Static validation for a formula string (used by the validator/UI). Checks that
 * it tokenizes and parses against a zero context; does not require references to
 * resolve to real pay heads. Returns null on success or an error message.
 */
export function validateFormula(formula: string): string | null {
  try {
    const tokens = tokenize(formula.trim());
    if (tokens.length === 0) return 'Formula is empty';
    // Parse with permissive context: any reference resolves to 0 so we only
    // surface structural/syntax errors here, not "unknown pay head" ones.
    new Parser(tokens, { basic: 0, gross: 0, heads: {} }, true).evaluate();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : 'Invalid formula';
  }
}
