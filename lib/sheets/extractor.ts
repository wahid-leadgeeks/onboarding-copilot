import type { Activity } from '@/lib/types/activity';
import type { StoredDiary } from '@/lib/local-records';
import { parseScheduleFromMatrix, parseDiarySheet } from '@/lib/import/import-schedule';
import { parseXlsxSheets } from '@/lib/import/xlsx';

export interface ExtractedTimelineItem {
  stageNumber: string;
  stageName: string;
  start: string;
  end: string;
  objective: string;
  keyActivities: string;
  outputsEvidence: string;
  minimumDuration: string;
  topicCovered?: string;
}

export interface ExtractedFeedbackItem {
  rowNumber: number;
  sessionTitle: string;
  pic: string;
  topic?: string;
  department?: string;
}

export interface ExtractedSheetSummary {
  title: string;
  sheetId?: number;
  rowCount: number;
  columnCount: number;
}

export interface ExtractedSpreadsheetContent {
  spreadsheetId: string;
  title?: string;
  extractedAt: string;
  sheets: ExtractedSheetSummary[];
  schedule?: {
    activities: Activity[];
    count: number;
    skipped: number;
    warnings: string[];
  };
  diary?: {
    entries: StoredDiary[];
    count: number;
  };
  timeline?: {
    stages: ExtractedTimelineItem[];
    count: number;
  };
  feedback?: {
    sessions: ExtractedFeedbackItem[];
    count: number;
  };
  rawMatrices?: Record<string, string[][]>;
}

export interface GoogleSheetsAuth {
  accessToken?: string;
  apiKey?: string;
}

/**
 * Parses Timeline rows from a 2D matrix (rows 2-4 in HR workbook).
 */
export function parseTimelineMatrix(matrix: string[][]): ExtractedTimelineItem[] {
  if (matrix.length < 2) return [];

  // Look for header row containing 'stage' or similar
  let headerIndex = -1;
  for (let i = 0; i < Math.min(5, matrix.length); i++) {
    const rowStr = matrix[i].join(' ').toLowerCase();
    if (rowStr.includes('stage') || rowStr.includes('objective')) {
      headerIndex = i;
      break;
    }
  }

  const dataRows = headerIndex >= 0 ? matrix.slice(headerIndex + 1) : matrix;
  const items: ExtractedTimelineItem[] = [];

  for (const row of dataRows) {
    if (!row.some((c) => c && c.trim())) continue;
    const stageNumber = (row[0] || '').trim();
    const stageName = (row[1] || '').trim();
    if (!stageNumber && !stageName) continue;

    items.push({
      stageNumber,
      stageName,
      start: (row[2] || '').trim(),
      end: (row[3] || '').trim(),
      objective: (row[4] || '').trim(),
      keyActivities: (row[5] || '').trim(),
      outputsEvidence: (row[6] || '').trim(),
      minimumDuration: (row[7] || '').trim(),
      topicCovered: (row[8] || '').trim() || undefined,
    });
  }

  return items;
}

/**
 * Parses Feedback Sheet rows from a 2D matrix (rows 4-16 in HR workbook).
 */
export function parseFeedbackMatrix(matrix: string[][]): ExtractedFeedbackItem[] {
  if (matrix.length < 2) return [];

  const items: ExtractedFeedbackItem[] = [];

  for (let i = 0; i < matrix.length; i++) {
    const row = matrix[i];
    if (!row.some((c) => c && c.trim())) continue;

    // Detect session rows (usually have a number or title in col A/B and PIC in col C)
    const col0 = (row[0] || '').trim();
    const col1 = (row[1] || '').trim();
    const col2 = (row[2] || '').trim();

    // Check if col1 looks like a session title
    const isHeader = col0.toLowerCase().includes('no') || col1.toLowerCase().includes('session') || col1.toLowerCase().includes('topic');
    if (isHeader) continue;

    if (col1 && col1.length > 3) {
      items.push({
        rowNumber: i + 1,
        sessionTitle: col1,
        pic: col2 || '',
        topic: col1,
      });
    }
  }

  return items;
}

/**
 * Extracts and unifies all 4 sheets from a collection of raw string matrices.
 */
export function extractContentFromMatrices(
  spreadsheetId: string,
  matrices: Record<string, string[][]>,
  title?: string,
  includeRawMatrices = false
): ExtractedSpreadsheetContent {
  const sheets: ExtractedSheetSummary[] = [];

  for (const [name, matrix] of Object.entries(matrices)) {
    sheets.push({
      title: name,
      rowCount: matrix.length,
      columnCount: matrix.reduce((max, r) => Math.max(max, r.length), 0),
    });
  }

  // Find corresponding sheets by case-insensitive name matching
  const findSheet = (pattern: string): string[][] | undefined => {
    const key = Object.keys(matrices).find((k) => k.toLowerCase().includes(pattern.toLowerCase()));
    return key ? matrices[key] : undefined;
  };

  const scheduleMatrix = findSheet('schedule');
  const diaryMatrix = findSheet('diary');
  const timelineMatrix = findSheet('timeline');
  const feedbackMatrix = findSheet('feedback');

  let scheduleResult: ExtractedSpreadsheetContent['schedule'] | undefined;
  if (scheduleMatrix) {
    try {
      const parsed = parseScheduleFromMatrix(scheduleMatrix);
      scheduleResult = {
        activities: parsed.activities,
        count: parsed.activities.length,
        skipped: parsed.skipped,
        warnings: parsed.warnings,
      };
    } catch {
      // Ignore schedule parse failure if sheet format differs
    }
  }

  let diaryResult: ExtractedSpreadsheetContent['diary'] | undefined;
  if (diaryMatrix) {
    const entries = parseDiarySheet(diaryMatrix);
    diaryResult = {
      entries,
      count: entries.length,
    };
  }

  let timelineResult: ExtractedSpreadsheetContent['timeline'] | undefined;
  if (timelineMatrix) {
    const stages = parseTimelineMatrix(timelineMatrix);
    timelineResult = {
      stages,
      count: stages.length,
    };
  }

  let feedbackResult: ExtractedSpreadsheetContent['feedback'] | undefined;
  if (feedbackMatrix) {
    const sessions = parseFeedbackMatrix(feedbackMatrix);
    feedbackResult = {
      sessions,
      count: sessions.length,
    };
  }

  return {
    spreadsheetId,
    title,
    extractedAt: new Date().toISOString(),
    sheets,
    schedule: scheduleResult,
    diary: diaryResult,
    timeline: timelineResult,
    feedback: feedbackResult,
    ...(includeRawMatrices ? { rawMatrices: matrices } : {}),
  };
}

/**
 * Extracts all content from an Excel (.xlsx) buffer containing the united sheets.
 */
export function extractContentFromWorkbookBytes(
  bytes: Uint8Array,
  spreadsheetId = 'local-workbook',
  title = 'United Onboarding Kit'
): ExtractedSpreadsheetContent {
  const parsedSheets = parseXlsxSheets(bytes);
  const matrices: Record<string, string[][]> = {};
  for (const s of parsedSheets) {
    matrices[s.name] = s.matrix;
  }
  return extractContentFromMatrices(spreadsheetId, matrices, title);
}

/**
 * Calls Google Sheets API v4 to extract all sheets from a Google Spreadsheet.
 */
export async function extractGoogleSpreadsheet(
  spreadsheetId: string,
  auth: GoogleSheetsAuth,
  options: { includeRawMatrices?: boolean } = {}
): Promise<ExtractedSpreadsheetContent> {
  const headers: Record<string, string> = {};
  let keyQuery = '';

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  } else if (auth.apiKey) {
    keyQuery = `&key=${encodeURIComponent(auth.apiKey)}`;
  } else {
    throw new Error('Google authentication (OAuth access token or API key) is required to access Google Sheets API');
  }

  // 1. Fetch metadata (sheet list)
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}?fields=properties.title,sheets.properties${keyQuery}`;
  const metaRes = await fetch(metaUrl, { headers, cache: 'no-store' });

  if (!metaRes.ok) {
    const errText = await metaRes.text().catch(() => '');
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch { /* use raw text */ }
    throw new Error(`Google Sheets API metadata request failed (${metaRes.status}): ${detail}`);
  }

  interface GoogleSheetMeta {
    properties?: { title?: string };
    sheets?: Array<{
      properties?: {
        sheetId?: number;
        title?: string;
        gridProperties?: { rowCount?: number; columnCount?: number };
      };
    }>;
  }

  const metaData = (await metaRes.json()) as GoogleSheetMeta;
  const docTitle = metaData.properties?.title || 'Google Spreadsheet';
  const sheetList = metaData.sheets || [];

  if (sheetList.length === 0) {
    throw new Error('No worksheets found in this Google Spreadsheet');
  }

  // 2. Fetch cell values for all sheets in a single batchGet
  const rangesQuery = sheetList
    .map((s) => s.properties?.title)
    .filter((t): t is string => Boolean(t))
    .map((t) => `ranges=${encodeURIComponent(t)}`)
    .join('&');

  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values:batchGet?${rangesQuery}&valueRenderOption=FORMATTED_VALUE${keyQuery}`;
  const valuesRes = await fetch(valuesUrl, { headers, cache: 'no-store' });

  if (!valuesRes.ok) {
    const errText = await valuesRes.text().catch(() => '');
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch { /* use raw text */ }
    throw new Error(`Google Sheets API values request failed (${valuesRes.status}): ${detail}`);
  }

  interface GoogleBatchValues {
    valueRanges?: Array<{
      range?: string;
      values?: string[][];
    }>;
  }

  const batchData = (await valuesRes.json()) as GoogleBatchValues;
  const matrices: Record<string, string[][]> = {};

  if (batchData.valueRanges) {
    for (let i = 0; i < batchData.valueRanges.length; i++) {
      const vr = batchData.valueRanges[i];
      const sheetName = sheetList[i]?.properties?.title || `Sheet${i + 1}`;
      matrices[sheetName] = vr.values || [];
    }
  }

  return extractContentFromMatrices(spreadsheetId, matrices, docTitle, options.includeRawMatrices);
}

export interface UpdateCellResult {
  updatedRange: string;
  updatedRows: number;
  updatedColumns: number;
  updatedCells: number;
}

/**
 * Updates a specific cell or range in a Google Spreadsheet via Google Sheets API v4.
 */
export async function updateSheetCell(
  spreadsheetId: string,
  range: string,
  value: string,
  auth: GoogleSheetsAuth
): Promise<UpdateCellResult> {
  if (!auth.accessToken && !auth.apiKey) {
    throw new Error('Google authentication is required to update spreadsheet cells');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  let keyQuery = '';

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  } else if (auth.apiKey) {
    keyQuery = `?key=${encodeURIComponent(auth.apiKey)}&valueInputOption=USER_ENTERED`;
  }

  const queryPrefix = keyQuery ? `${keyQuery}&` : '?valueInputOption=USER_ENTERED';
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}${queryPrefix}`;

  const res = await fetch(url, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [[value]],
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let detail = errText;
    try {
      const parsed = JSON.parse(errText);
      if (parsed?.error?.message) detail = parsed.error.message;
    } catch { /* use raw */ }
    throw new Error(`Google Sheets API update failed (${res.status}): ${detail}`);
  }

  interface GoogleUpdateResponse {
    updatedRange?: string;
    updatedRows?: number;
    updatedColumns?: number;
    updatedCells?: number;
  }

  const data = (await res.json()) as GoogleUpdateResponse;
  return {
    updatedRange: data.updatedRange || range,
    updatedRows: data.updatedRows || 1,
    updatedColumns: data.updatedColumns || 1,
    updatedCells: data.updatedCells || 1,
  };
}

/**
 * Reads a specific cell or range from a Google Spreadsheet via Google Sheets API v4.
 */
export async function getSheetRange(
  spreadsheetId: string,
  range: string,
  auth: GoogleSheetsAuth
): Promise<string[][]> {
  if (!auth.accessToken && !auth.apiKey) {
    throw new Error('Google authentication is required to read spreadsheet cells');
  }

  const headers: Record<string, string> = {};
  let keyQuery = '';

  if (auth.accessToken) {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  } else if (auth.apiKey) {
    keyQuery = `&key=${encodeURIComponent(auth.apiKey)}`;
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE${keyQuery}`;
  const res = await fetch(url, { headers, cache: 'no-store' });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to read range ${range} (${res.status}): ${errText}`);
  }

  interface GoogleValuesResponse {
    values?: string[][];
  }

  const data = (await res.json()) as GoogleValuesResponse;
  return data.values || [];
}

