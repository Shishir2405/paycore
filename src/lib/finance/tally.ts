/**
 * Tally XML builder. Tally Prime / ERP 9 imports accounting vouchers via an
 * `ENVELOPE` payload of `TALLYMESSAGE` voucher nodes. This converts our internal
 * journal entries into that import-compatible XML string. Pure + side-effect
 * free so it can be unit-tested and reused by the export route.
 */

export type TallyLine = {
  account: string;
  debit: number;
  credit: number;
  costCenter?: string | null;
};

export type TallyEntry = {
  voucherNo: string;
  date: Date | string;
  narration: string;
  lines: TallyLine[];
};

/** Escape the five XML-significant characters. */
function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Tally expects dates as YYYYMMDD. */
function tallyDate(date: Date | string): string {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

/** A debit line in Tally is `ISDEEMEDPOSITIVE=Yes` with a negative amount. */
function ledgerEntry(line: TallyLine): string {
  const isDebit = line.debit > 0;
  const amount = isDebit ? -Math.abs(line.debit) : Math.abs(line.credit);
  const costCenter =
    line.costCenter && line.costCenter.trim()
      ? `        <CATEGORYALLOCATIONS.LIST>\n` +
        `         <CATEGORY>Primary Cost Category</CATEGORY>\n` +
        `         <COSTCENTREALLOCATIONS.LIST>\n` +
        `          <NAME>${esc(line.costCenter)}</NAME>\n` +
        `          <AMOUNT>${amount.toFixed(2)}</AMOUNT>\n` +
        `         </COSTCENTREALLOCATIONS.LIST>\n` +
        `        </CATEGORYALLOCATIONS.LIST>\n`
      : '';
  return (
    `       <ALLLEDGERENTRIES.LIST>\n` +
    `        <LEDGERNAME>${esc(line.account)}</LEDGERNAME>\n` +
    `        <ISDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE>\n` +
    `        <AMOUNT>${amount.toFixed(2)}</AMOUNT>\n` +
    costCenter +
    `       </ALLLEDGERENTRIES.LIST>\n`
  );
}

function voucher(entry: TallyEntry): string {
  const date = tallyDate(entry.date);
  const lines = entry.lines.map(ledgerEntry).join('');
  return (
    `    <TALLYMESSAGE xmlns:UDF="TallyUDF">\n` +
    `     <VOUCHER VCHTYPE="Journal" ACTION="Create">\n` +
    `      <DATE>${date}</DATE>\n` +
    `      <EFFECTIVEDATE>${date}</EFFECTIVEDATE>\n` +
    `      <VOUCHERTYPENAME>Journal</VOUCHERTYPENAME>\n` +
    `      <VOUCHERNUMBER>${esc(entry.voucherNo)}</VOUCHERNUMBER>\n` +
    `      <NARRATION>${esc(entry.narration)}</NARRATION>\n` +
    lines +
    `     </VOUCHER>\n` +
    `    </TALLYMESSAGE>\n`
  );
}

/** Build a complete Tally-import XML document for the given journal entries. */
export function buildTallyXml(entries: TallyEntry[]): string {
  const body = entries.map(voucher).join('');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<ENVELOPE>\n` +
    ` <HEADER>\n` +
    `  <TALLYREQUEST>Import Data</TALLYREQUEST>\n` +
    ` </HEADER>\n` +
    ` <BODY>\n` +
    `  <IMPORTDATA>\n` +
    `   <REQUESTDESC>\n` +
    `    <REPORTNAME>Vouchers</REPORTNAME>\n` +
    `   </REQUESTDESC>\n` +
    `   <REQUESTDATA>\n` +
    body +
    `   </REQUESTDATA>\n` +
    `  </IMPORTDATA>\n` +
    ` </BODY>\n` +
    `</ENVELOPE>\n`
  );
}
