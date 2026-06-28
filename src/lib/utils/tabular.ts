/**
 * Reusable CSV/Excel import & export helpers shared by every module.
 * Export: rows + a column spec -> CSV string or XLSX buffer.
 * Import: uploaded file -> array of raw record objects (keyed by header).
 */
import Papa from 'papaparse';
import ExcelJS from 'exceljs';

export type Column<T> = {
  key: keyof T | string;
  header: string;
  /** Optional value formatter (e.g. dates, masking). */
  format?: (row: T) => string | number | null;
};

function cell<T>(row: T, col: Column<T>): string | number | null {
  if (col.format) return col.format(row);
  const v = (row as Record<string, unknown>)[col.key as string];
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') return JSON.stringify(v);
  return v as string | number;
}

export function toCsv<T>(rows: T[], columns: Column<T>[]): string {
  const data = rows.map((row) => {
    const record: Record<string, unknown> = {};
    for (const col of columns) record[col.header] = cell(row, col);
    return record;
  });
  return Papa.unparse({ fields: columns.map((c) => c.header), data });
}

export async function toXlsx<T>(rows: T[], columns: Column<T>[], sheetName = 'Sheet1'): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.columns = columns.map((c) => ({ header: c.header, key: c.header, width: 22 }));
  ws.getRow(1).font = { bold: true };
  for (const row of rows) {
    const record: Record<string, unknown> = {};
    for (const col of columns) record[col.header] = cell(row, col);
    ws.addRow(record);
  }
  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

/** A CSV/XLSX template (headers only) for guided imports. */
export function csvTemplate(headers: string[]): string {
  return Papa.unparse({ fields: headers, data: [] });
}

export type ParsedImport = { rows: Record<string, string>[]; headers: string[] };

export async function parseUpload(file: File): Promise<ParsedImport> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXlsx(file);
  return parseCsv(file);
}

async function parseCsv(file: File): Promise<ParsedImport> {
  const text = await file.text();
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  return { rows: result.data, headers: result.meta.fields ?? [] };
}

async function parseXlsx(file: File): Promise<ParsedImport> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await file.arrayBuffer());
  const ws = wb.worksheets[0];
  if (!ws) return { rows: [], headers: [] };

  const headers: string[] = [];
  ws.getRow(1).eachCell((c, col) => {
    headers[col - 1] = String(c.value ?? '').trim();
  });

  const rows: Record<string, string>[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const record: Record<string, string> = {};
    row.eachCell((c, col) => {
      const key = headers[col - 1];
      if (key) record[key] = c.value === null || c.value === undefined ? '' : String(c.value);
    });
    if (Object.values(record).some((v) => v !== '')) rows.push(record);
  });

  return { rows, headers };
}
