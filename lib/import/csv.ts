import { ImportError } from './error';

const CANDIDATE_DELIMITERS = [',', ';', '\t'] as const;

type Delimiter = (typeof CANDIDATE_DELIMITERS)[number];

/** RFC 4180 CSV parser with delimiter auto-detection. Untrusted input. */
export function parseCsv(text: string): string[][] {
  const source = text.startsWith('﻿') ? text.slice(1) : text;
  const delimiter = detectDelimiter(source);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(field);
      field = '';
    } else if (char === '\n' && !quoted) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char === '\r' && !quoted) {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      if (source[i + 1] === '\n') i++;
    } else {
      field += char;
    }
  }
  if (quoted) throw new ImportError('The file contains an unterminated quoted field.');
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function detectDelimiter(text: string): Delimiter {
  const firstLine = firstNonEmptyLine(text);
  if (firstLine === null) return ',';
  let best: Delimiter = ',';
  let bestCount = 0;
  for (const candidate of CANDIDATE_DELIMITERS) {
    const count = splitLine(firstLine, candidate).length;
    if (count > bestCount) {
      best = candidate;
      bestCount = count;
    }
  }
  return best;
}

function firstNonEmptyLine(text: string): string | null {
  for (const line of text.split(/\r\n|\r|\n/)) {
    if (line.length > 0) return line;
  }
  return null;
}

/** Splits one line on a delimiter, honoring quoted fields (quote-aware count for detection). */
function splitLine(line: string, delimiter: Delimiter): string[] {
  const fields: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      fields.push(field);
      field = '';
    } else {
      field += char;
    }
  }
  fields.push(field);
  return fields;
}
