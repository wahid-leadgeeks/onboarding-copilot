import { strToU8, zipSync } from 'fflate';
import { importScheduleFromFile } from './import-schedule';

function importCsv(text: string, filename = 'schedule.csv') {
  return importScheduleFromFile(strToU8(text), filename);
}

function messageOf(action: () => void): string {
  try {
    action();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return '';
}

// Schedule workbook: header, fraction times, inline string, empty-name row, bad-time row.
function buildScheduleXlsx(): Uint8Array {
  return zipSync({
    '[Content_Types].xml': strToU8(
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
        '</Types>'
    ),
    '_rels/.rels': strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    ),
    'xl/workbook.xml': strToU8(
      '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets><sheet name="Schedule" sheetId="1" r:id="rId1"/></sheets>' +
        '</workbook>'
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '</Relationships>'
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<sheetData>' +
        '<row r="1">' +
        '<c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>2</v></c><c r="D1" t="s"><v>3</v></c>' +
        '</row>' +
        '<row r="2">' +
        '<c r="A2" t="s"><v>4</v></c><c r="B2"><v>0.375</v></c><c r="C2"><v>0.41666666666666663</v></c><c r="D2" t="s"><v>5</v></c>' +
        '</row>' +
        '<row r="3">' +
        '<c r="A3" t="inlineStr"><is><t>Shadow a call</t></is></c><c r="B3"><v>11:00</v></c><c r="C3"><v>12:30</v></c><c r="D3" t="s"><v>6</v></c>' +
        '</row>' +
        '<row r="4"><c r="B4"><v>09:00</v></c><c r="C4"><v>10:00</v></c></row>' +
        '<row r="5"><c r="A5" t="s"><v>7</v></c><c r="B5" t="s"><v>8</v></c><c r="C5"><v>13:00</v></c></row>' +
        '</sheetData>' +
        '</worksheet>'
    ),
    'xl/sharedStrings.xml': strToU8(
      '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="9" uniqueCount="9">' +
        '<si><t>Activity</t></si>' +
        '<si><t>Start</t></si>' +
        '<si><t>End</t></si>' +
        '<si><t>Status</t></si>' +
        '<si><t>Read handbook</t></si>' +
        '<si><t>done</t></si>' +
        '<si><t>In Progress</t></si>' +
        '<si><t>Broken row</t></si>' +
        '<si><t>whenever</t></si>' +
        '</sst>'
    ),
  });
}

describe('importScheduleFromFile', () => {
  it('imports a csv with 24h and am/pm times', () => {
    const result = importCsv('Activity,Start,End\nRead handbook,9:00,10:00\nLunch,12:00 PM,1:30 pm');
    expect(result.skipped).toBe(0);
    expect(result.warnings).toEqual([]);
    expect(result.activities).toHaveLength(2);
    expect(result.activities[0].id).toBe('import-1-read-handbook');
    expect(result.activities[0].plannedStart).toBe('09:00');
    expect(result.activities[0].plannedEnd).toBe('10:00');
    expect(result.activities[0].status).toBe('not-started');
    expect(result.activities[1].plannedStart).toBe('12:00');
    expect(result.activities[1].plannedEnd).toBe('13:30');
  });

  it('converts excel time fractions and rounds to the nearest minute', () => {
    const result = importCsv('Activity,Start,End\nDemo,0.5,0.72917');
    expect(result.activities[0].plannedStart).toBe('12:00');
    expect(result.activities[0].plannedEnd).toBe('17:30');
  });

  it('detects headers after title rows', () => {
    const result = importCsv('My Onboarding Plan\n\nActivity,Start,End,Type,Status\nIntro,09:00,10:00,meeting,completed\n');
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0].name).toBe('Intro');
    expect(result.activities[0].type).toBe('meeting');
    expect(result.activities[0].status).toBe('done');
  });

  it('defaults type to learning and normalizes every other status to not-started', () => {
    const result = importCsv('Activity,Start,End,Status\nA,09:00,10:00,meh\nB,09:00,10:00,late\nC,09:00,10:00\n');
    expect(result.activities[0].type).toBe('learning');
    expect(result.activities[0].status).toBe('not-started');
    expect(result.activities[1].status).toBe('overdue');
    expect(result.activities[2].status).toBe('not-started');
  });

  it('maps header aliases like task/from/until', () => {
    const result = importCsv('Task,From,Until\nSetup,09:00,10:00');
    expect(result.activities[0].name).toBe('Setup');
    expect(result.activities[0].plannedStart).toBe('09:00');
    expect(result.activities[0].plannedEnd).toBe('10:00');
  });

  it('skips bad time rows with numbered warnings capped at five', () => {
    const rows = ['Activity,Start,End'];
    for (let i = 1; i <= 7; i++) rows.push(`Row ${i},nope,10:00`);
    rows.push('Good,09:00,10:00');
    const result = importCsv(rows.join('\n'));
    expect(result.activities).toHaveLength(1);
    expect(result.skipped).toBe(7);
    expect(result.warnings).toHaveLength(5);
    expect(result.warnings[0]).toBe('Row 1: could not read the start/end time');
    expect(result.warnings[4]).toBe('Row 5: could not read the start/end time');
  });

  it('silently skips rows with empty names without counting them as skipped', () => {
    const result = importCsv('Activity,Start,End\n,09:00,10:00\n   ,09:00,10:00\nReal,09:00,10:00');
    expect(result.activities).toHaveLength(1);
    expect(result.activities[0].name).toBe('Real');
    expect(result.activities[0].id).toBe('import-3-real');
    expect(result.skipped).toBe(0);
  });

  it('imports an xlsx workbook with fraction, inline, and shared-string cells', () => {
    const result = importScheduleFromFile(buildScheduleXlsx(), 'schedule.xlsx');
    expect(result.activities).toHaveLength(2);
    expect(result.activities[0].name).toBe('Read handbook');
    expect(result.activities[0].plannedStart).toBe('09:00');
    expect(result.activities[0].plannedEnd).toBe('10:00');
    expect(result.activities[0].status).toBe('done');
    expect(result.activities[1].name).toBe('Shadow a call');
    expect(result.activities[1].status).toBe('in-progress');
    expect(result.activities[1].id).toBe('import-2-shadow-a-call');
    expect(result.skipped).toBe(1);
    expect(result.warnings).toEqual(['Row 4: could not read the start/end time']);
  });

  it('parses tsv and txt files as csv', () => {
    expect(importCsv('Activity\tStart\tEnd\nSetup\t09:00\t10:00', 's.tsv').activities).toHaveLength(1);
    expect(importCsv('Activity,Start,End\nSetup,09:00,10:00', 's.TXT').activities).toHaveLength(1);
  });

  it('rejects unsupported file types', () => {
    expect(messageOf(() => importCsv('Activity,Start,End', 'plan.pdf'))).toBe('Unsupported file type. Use .xlsx, .csv, or .tsv.');
  });

  it('rejects an .xlsx name that is not a zip workbook', () => {
    expect(messageOf(() => importCsv('not a zip', 'broken.xlsx'))).toBe('This file is not a valid Excel workbook.');
  });

  it('rejects files with more than 201 rows', () => {
    const rows = ['Activity,Start,End'];
    for (let i = 0; i < 201; i++) rows.push('A,09:00,10:00');
    expect(messageOf(() => importCsv(rows.join('\n')))).toBe('The file has too many rows. Keep it under 200 activities.');
  });

  it('allows exactly 201 rows', () => {
    const rows = ['Activity,Start,End'];
    for (let i = 0; i < 200; i++) rows.push('A,09:00,10:00');
    expect(importCsv(rows.join('\n')).activities).toHaveLength(200);
  });

  it('rejects files with more than 26 columns', () => {
    const header = ['Activity', 'Start', 'End'];
    for (let i = 0; i < 24; i++) header.push(`Extra${i}`);
    expect(messageOf(() => importCsv(`${header.join(',')}\nA,09:00,10:00`))).toBe('The file has too many columns.');
  });

  it('rejects files without recognizable schedule columns', () => {
    expect(messageOf(() => importCsv('foo\nbar\nbaz'))).toBe('Could not find the schedule columns. Expected columns like "Activity", "Start", and "End".');
  });

  it('rejects files where no valid activity remains', () => {
    expect(messageOf(() => importCsv('Activity,Start,End\n,09:00,10:00\n,11:00,12:00'))).toBe('No valid activities were found in this file.');
  });
});
