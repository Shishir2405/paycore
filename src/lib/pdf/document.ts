/**
 * Composable pdf-lib helpers for building branded, invoice-grade PDFs
 * (payslips, statutory reports, invoices). Each helper draws onto a page and
 * returns the new cursor `y` so callers can stack blocks top-to-bottom.
 *
 * Coordinates are PDF-native (origin bottom-left). All helpers honour a left/
 * right margin so output stays aligned across blocks.
 */
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib';

export const PAGE = { width: 595.28, height: 841.89 }; // A4 portrait, points
export const MARGIN = 40;

const INK = rgb(0.12, 0.14, 0.18);
const MUTED = rgb(0.42, 0.46, 0.52);
const LINE = rgb(0.86, 0.88, 0.91);
const ZEBRA = rgb(0.97, 0.98, 0.99);
const BRAND = rgb(0.12, 0.32, 0.78);

export type Fonts = { regular: PDFFont; bold: PDFFont };

export type Doc = {
  pdf: PDFDocument;
  fonts: Fonts;
  /** Add a fresh A4 page and return it with the cursor at the top margin. */
  addPage: () => { page: PDFPage; y: number };
  /** Serialize to bytes for storage/download. */
  save: () => Promise<Uint8Array>;
};

/** Create a document with embedded Helvetica fonts. */
export async function createDocument(): Promise<Doc> {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonts: Fonts = { regular, bold };
  return {
    pdf,
    fonts,
    addPage() {
      const page = pdf.addPage([PAGE.width, PAGE.height]);
      return { page, y: PAGE.height - MARGIN };
    },
    save() {
      return pdf.save();
    },
  };
}

const contentWidth = () => PAGE.width - MARGIN * 2;

function clip(font: PDFFont, text: string, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && font.widthOfTextAtSize(`${out}…`, size) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out}…`;
}

/** Branded header: company name (left), document title (right), rule below. */
export function drawHeader(
  page: PDFPage,
  fonts: Fonts,
  opts: { companyName: string; title: string; subtitle?: string },
): number {
  const top = PAGE.height - MARGIN;
  page.drawText(opts.companyName, {
    x: MARGIN,
    y: top - 14,
    size: 15,
    font: fonts.bold,
    color: INK,
  });

  const titleSize = 11;
  const titleWidth = fonts.bold.widthOfTextAtSize(opts.title, titleSize);
  page.drawText(opts.title, {
    x: PAGE.width - MARGIN - titleWidth,
    y: top - 13,
    size: titleSize,
    font: fonts.bold,
    color: BRAND,
  });

  let y = top - 24;
  if (opts.subtitle) {
    const subWidth = fonts.regular.widthOfTextAtSize(opts.subtitle, 8.5);
    page.drawText(opts.subtitle, {
      x: PAGE.width - MARGIN - subWidth,
      y,
      size: 8.5,
      font: fonts.regular,
      color: MUTED,
    });
  }

  y -= 8;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE.width - MARGIN, y },
    thickness: 1,
    color: BRAND,
  });
  return y - 18;
}

/**
 * A two-column key/value block (e.g. employee + pay-period meta). Renders pairs
 * across `columns` columns, wrapping rows as needed. Returns the cursor below.
 */
export function drawKeyValueBlock(
  page: PDFPage,
  fonts: Fonts,
  pairs: Array<{ label: string; value: string }>,
  y: number,
  columns = 2,
): number {
  if (pairs.length === 0) return y;
  const size = 9;
  const lineH = 16;
  const colWidth = contentWidth() / columns;
  let cursor = y;

  for (let i = 0; i < pairs.length; i += columns) {
    for (let c = 0; c < columns; c += 1) {
      const pair = pairs[i + c];
      if (!pair) continue;
      const x = MARGIN + c * colWidth;
      page.drawText(`${pair.label}`, {
        x,
        y: cursor,
        size: 8,
        font: fonts.regular,
        color: MUTED,
      });
      page.drawText(clip(fonts.bold, pair.value, size, colWidth - 6), {
        x,
        y: cursor - 11,
        size,
        font: fonts.bold,
        color: INK,
      });
    }
    cursor -= lineH + 12;
  }
  return cursor;
}

export type PdfColumn = {
  header: string;
  /** Fractional width (0..1) of content width; defaults to equal split. */
  width?: number;
  align?: 'left' | 'right';
};

/**
 * Aligned data table with a header band, zebra rows and an optional totals row.
 * `rows` are pre-stringified cells. Returns the cursor below the table.
 */
export function drawTable(
  page: PDFPage,
  fonts: Fonts,
  columns: PdfColumn[],
  rows: string[][],
  y: number,
  totals?: string[],
): number {
  const size = 8.5;
  const rowH = 18;
  const padX = 6;
  const cw = contentWidth();

  // Resolve column widths (fractions -> points).
  const explicit = columns.reduce((s, c) => s + (c.width ?? 0), 0);
  const autoCount = columns.filter((c) => c.width === undefined).length;
  const autoW = autoCount > 0 ? (1 - explicit) / autoCount : 0;
  const widths = columns.map((c) => (c.width ?? autoW) * cw);
  const xs: number[] = [];
  let acc = MARGIN;
  for (const w of widths) {
    xs.push(acc);
    acc += w;
  }

  const drawCells = (cells: string[], cy: number, font: PDFFont, color: RGB) => {
    columns.forEach((col, i) => {
      const text = clip(font, cells[i] ?? '', size, widths[i] - padX * 2);
      const align = col.align ?? 'left';
      const x =
        align === 'right'
          ? xs[i] + widths[i] - padX - font.widthOfTextAtSize(text, size)
          : xs[i] + padX;
      page.drawText(text, { x, y: cy, size, font, color });
    });
  };

  let cursor = y;
  // Header band.
  page.drawRectangle({
    x: MARGIN,
    y: cursor - rowH + 5,
    width: cw,
    height: rowH,
    color: rgb(0.95, 0.96, 0.98),
  });
  drawCells(
    columns.map((c) => c.header),
    cursor - rowH + 11,
    fonts.bold,
    INK,
  );
  cursor -= rowH;

  // Body rows with zebra striping.
  rows.forEach((row, idx) => {
    if (idx % 2 === 1) {
      page.drawRectangle({
        x: MARGIN,
        y: cursor - rowH + 5,
        width: cw,
        height: rowH,
        color: ZEBRA,
      });
    }
    drawCells(row, cursor - rowH + 11, fonts.regular, INK);
    cursor -= rowH;
  });

  // Bounding rule under the body.
  page.drawLine({
    start: { x: MARGIN, y: cursor + 4 },
    end: { x: MARGIN + cw, y: cursor + 4 },
    thickness: 0.75,
    color: LINE,
  });

  // Optional totals row.
  if (totals) {
    drawCells(totals, cursor - rowH + 11, fonts.bold, INK);
    cursor -= rowH;
    page.drawLine({
      start: { x: MARGIN, y: cursor + 4 },
      end: { x: MARGIN + cw, y: cursor + 4 },
      thickness: 1,
      color: BRAND,
    });
  }

  return cursor - 6;
}

/** Footer note + page rule pinned to the bottom margin. */
export function drawFooter(page: PDFPage, fonts: Fonts, text: string): void {
  const y = MARGIN;
  page.drawLine({
    start: { x: MARGIN, y: y + 14 },
    end: { x: PAGE.width - MARGIN, y: y + 14 },
    thickness: 0.5,
    color: LINE,
  });
  page.drawText(text, {
    x: MARGIN,
    y,
    size: 7.5,
    font: fonts.regular,
    color: MUTED,
  });
}
