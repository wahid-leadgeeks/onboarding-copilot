import { strToU8, zipSync } from 'fflate';
import { parseXlsx } from './xlsx';

// Minimal but real .xlsx: shared strings, an inline string, a number, a gap cell, two rows.
function buildXlsx(): Uint8Array {
  const parts = {
    '[Content_Types].xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
        '<Default Extension="xml" ContentType="application/xml"/>' +
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
        '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
        '</Types>'
    ),
    '_rels/.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
        '</Relationships>'
    ),
    'xl/workbook.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
        '<sheets>' +
        '<sheet name="Schedule" sheetId="1" r:id="rId1"/>' +
        '<sheet name="Ignored" sheetId="2" r:id="rId2"/>' +
        '</sheets>' +
        '</workbook>'
    ),
    'xl/_rels/workbook.xml.rels': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet2.xml"/>' +
        '</Relationships>'
    ),
    'xl/worksheets/sheet1.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<sheetData>' +
        '<row r="1">' +
        '<c r="A1" t="s"><v>0</v></c>' +
        '<c r="B1" t="s"><v>1</v></c>' +
        '<c r="C1" t="inlineStr"><is><t>inline note</t></is></c>' +
        '<c r="D1"><v>60</v></c>' +
        '</row>' +
        '<row r="2">' +
        '<c r="A2" t="s"><v>2</v></c>' +
        '<c r="C2" t="s"><v>99</v></c>' +
        '<c r="D2" t="b"><v>1</v></c>' +
        '</row>' +
        '</sheetData>' +
        '</worksheet>'
    ),
    'xl/worksheets/sheet2.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
        '<sheetData><row r="1"><c r="A1"><v>SHOULD_BE_IGNORED</v></c></row></sheetData>' +
        '</worksheet>'
    ),
    'xl/sharedStrings.xml': strToU8(
      '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="3" uniqueCount="3">' +
        '<si><t>Setup &amp; tools</t></si>' +
        '<si><t xml:space="preserve">  spaced  </t></si>' +
        '<si><r><t>Road</t></r><r><t>map</t></r></si>' +
        '</sst>'
    ),
  };
  return zipSync(parts);
}

describe('parseXlsx', () => {
  it('parses a real workbook into a dense matrix', () => {
    expect(parseXlsx(buildXlsx())).toEqual([
      ['Setup & tools', '  spaced  ', 'inline note', '60'],
      ['Roadmap', '', '', 'TRUE'],
    ]);
  });

  it('throws ImportError on non-zip bytes', () => {
    let message = '';
    try {
      parseXlsx(strToU8('not a zip'));
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe('This file is not a valid Excel workbook.');
  });

  it('throws ImportError when the workbook part is missing', () => {
    let message = '';
    try {
      parseXlsx(zipSync({ 'random/file.txt': strToU8('nope') }));
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe('This file is not a valid Excel workbook.');
  });
});
