import { strFromU8, unzipSync } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { ImportError } from './error';

const INVALID_WORKBOOK = 'This file is not a valid Excel workbook.';
const MAX_COLUMNS = 16384; // Excel's XFD limit; refs beyond it are malformed input.

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false, trimValues: false });

export type XlsxParsedSheet = {
  name: string;
  matrix: string[][];
};

/** Extracts parsed worksheets from an .xlsx workbook. Untrusted input. */
export function parseXlsxSheets(bytes: Uint8Array): XlsxParsedSheet[] {
  let files;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new ImportError(INVALID_WORKBOOK);
  }
  const workbookXml = readXml(files, 'xl/workbook.xml');
  const sheets = listSheets(workbookXml);
  if (sheets.length === 0) throw new ImportError(INVALID_WORKBOOK);
  const relsXml = readXml(files, 'xl/_rels/workbook.xml.rels');
  const shared = readXml(files, 'xl/sharedStrings.xml');
  const sharedStrings = shared === null ? [] : parseSharedStrings(shared);

  const results: XlsxParsedSheet[] = [];
  for (const sheet of sheets) {
    const target = sheetTarget(relsXml, sheet.rid);
    if (!target) continue;
    const path = resolveTarget(target);
    const sheetBytes = files[path];
    if (!sheetBytes) continue;
    results.push({
      name: sheet.name,
      matrix: parseSheet(strFromU8(sheetBytes), sharedStrings),
    });
  }
  if (results.length === 0) throw new ImportError(INVALID_WORKBOOK);
  return results;
}

/** Extracts the schedule worksheet (or preferred sheet, or first worksheet) of an .xlsx into a dense string matrix. Untrusted input. */
export function parseXlsx(bytes: Uint8Array, preferredSheetName?: string): string[][] {
  const sheets = parseXlsxSheets(bytes);
  if (preferredSheetName) {
    const found = sheets.find((s) => s.name.toLowerCase().includes(preferredSheetName.toLowerCase()));
    if (found) return found.matrix;
  }
  const scheduleSheet = sheets.find((s) => s.name.toLowerCase().includes('schedule'));
  if (scheduleSheet) return scheduleSheet.matrix;
  return sheets[0].matrix;
}

function readXml(files: Record<string, Uint8Array>, path: string): string | null {
  const bytes = files[path];
  return bytes ? strFromU8(bytes) : null;
}

type SheetRef = { name: string; rid: string };

function listSheets(workbookXml: string | null): SheetRef[] {
  if (workbookXml === null) return [];
  const doc: unknown = parser.parse(workbookXml);
  const sheets = recordOf(recordOf(doc)?.['workbook'])?.['sheets'];
  const sheetList = asArray(recordOf(sheets)?.['sheet']);
  const result: SheetRef[] = [];
  for (const sheetNode of sheetList) {
    const record = recordOf(sheetNode);
    if (!record) continue;
    const name = typeof record['@_name'] === 'string' ? record['@_name'] : '';
    const rid = typeof record['@_r:id'] === 'string' ? record['@_r:id'] : typeof record['@_id'] === 'string' ? record['@_id'] : '';
    if (rid) result.push({ name, rid });
  }
  return result;
}

function sheetTarget(relsXml: string | null, rid: string): string | null {
  if (relsXml === null) return null;
  const doc: unknown = parser.parse(relsXml);
  const relationships = asArray(recordOf(recordOf(doc)?.['Relationships'])?.['Relationship']);
  for (const relationship of relationships) {
    const record = recordOf(relationship);
    if (record && record['@_Id'] === rid) {
      const target = record['@_Target'];
      return typeof target === 'string' && target !== '' ? target : null;
    }
  }
  return null;
}

/** Resolves a relationship target: absolute ('/xl/…') from the zip root, relative under 'xl/'. */
function resolveTarget(target: string): string {
  const raw = target.startsWith('/') ? target.slice(1) : `xl/${target}`;
  const parts: string[] = [];
  for (const segment of raw.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') parts.pop();
    else parts.push(segment);
  }
  return parts.join('/');
}

function parseSharedStrings(sharedStringsXml: string): string[] {
  const doc: unknown = parser.parse(sharedStringsXml);
  const items = asArray(recordOf(recordOf(doc)?.['sst'])?.['si']);
  const strings: string[] = [];
  for (const item of items) {
    const parts: string[] = [];
    collectText(item, parts);
    strings.push(parts.join(''));
  }
  return strings;
}

/** Concatenates the text of every `t` descendant (plain and rich-text runs). */
function collectText(node: unknown, parts: string[]): void {
  if (Array.isArray(node)) {
    for (const item of node) collectText(item, parts);
    return;
  }
  const record = recordOf(node);
  if (record === null) return;
  for (const [key, value] of Object.entries(record)) {
    if (key === 't') parts.push(textOf(value));
    else if (key.startsWith('@_')) continue;
    else collectText(value, parts);
  }
}

function parseSheet(sheetXml: string, sharedStrings: string[]): string[][] {
  const doc: unknown = parser.parse(sheetXml);
  const sheetData = recordOf(recordOf(doc)?.['worksheet'])?.['sheetData'];
  const rows = asArray(recordOf(sheetData)?.['row']);
  const matrix: string[][] = [];
  for (const rowNode of rows) {
    const row = recordOf(rowNode);
    if (row !== null) matrix.push(parseRow(row, sharedStrings));
  }
  return matrix;
}

function parseRow(row: Record<string, unknown>, sharedStrings: string[]): string[] {
  const cells = asArray(row['c']);
  const values: string[] = [];
  let nextIndex = 0;
  for (const cellNode of cells) {
    const cell = recordOf(cellNode);
    if (cell === null) continue;
    const ref = cell['@_r'];
    const index = typeof ref === 'string' ? columnIndexOf(ref) : nextIndex;
    if (index === null || index >= MAX_COLUMNS) continue;
    nextIndex = index + 1;
    while (values.length <= index) values.push('');
    values[index] = cellText(cell, sharedStrings);
  }
  return values;
}

/** Zero-based column index of a cell reference like 'B7'; null for malformed refs. */
function columnIndexOf(ref: string): number | null {
  const letters = ref.match(/^[A-Za-z]+/);
  if (letters === null || !/^[A-Za-z]+\d+$/.test(ref)) return null;
  let index = 0;
  for (const char of letters[0]) index = index * 26 + char.charCodeAt(0) % 32;
  return index - 1;
}

function cellText(cell: Record<string, unknown>, sharedStrings: string[]): string {
  const kind = cell['@_t'];
  if (kind === 's') {
    const index = Number(textOf(cell['v']));
    return Number.isInteger(index) && index >= 0 && index < sharedStrings.length ? sharedStrings[index] : '';
  }
  if (kind === 'inlineStr') {
    const parts: string[] = [];
    collectText(cell['is'], parts);
    return parts.join('');
  }
  if (kind === 'b') {
    const flag = textOf(cell['v']).toLowerCase();
    return flag === '1' || flag === 'true' ? 'TRUE' : 'FALSE';
  }
  const value = textOf(cell['v']);
  return kind === 'str' ? value : value.trim();
}

/** Reads an XML node's text: a string body, or the '#text' of an object body. */
function textOf(node: unknown): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);
  const record = recordOf(node);
  const text = record === null ? undefined : record['#text'];
  if (typeof text === 'string') return text;
  if (typeof text === 'number' || typeof text === 'boolean') return String(text);
  return '';
}

type XmlNode = Record<string, unknown>;

function recordOf(value: unknown): XmlNode | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as XmlNode;
  return null;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}
