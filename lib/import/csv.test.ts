import { parseCsv } from './csv';
import { ImportError } from './error';

describe('parseCsv', () => {
  it('splits plain rows and fields on commas', () => {
    expect(parseCsv('Activity,Start,End\nRead handbook,09:00,10:00')).toEqual([
      ['Activity', 'Start', 'End'],
      ['Read handbook', '09:00', '10:00'],
    ]);
  });

  it('strips a leading UTF-8 BOM', () => {
    expect(parseCsv('﻿Activity,Start')).toEqual([['Activity', 'Start']]);
  });

  it('accepts CRLF, LF, and CR line endings', () => {
    expect(parseCsv('a,b\r\nc,d\n\re,f')).toEqual([['a', 'b'], ['c', 'd'], [''], ['e', 'f']]);
  });

  it('keeps quoted delimiters, newlines, and doubled quotes', () => {
    expect(parseCsv('"a,b","line1\nline2","say ""hi""",c')).toEqual([['a,b', 'line1\nline2', 'say "hi"', 'c']]);
  });

  it('throws ImportError on an unterminated quoted field', () => {
    let message = '';
    try {
      parseCsv('a,"b,c');
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toBe('The file contains an unterminated quoted field.');
  });

  it('auto-detects the semicolon delimiter', () => {
    expect(parseCsv('Activity;Start;End\nSetup;09:00;10:00')).toEqual([
      ['Activity', 'Start', 'End'],
      ['Setup', '09:00', '10:00'],
    ]);
  });

  it('auto-detects the tab delimiter', () => {
    expect(parseCsv('Activity\tStart\tEnd\nSetup\t09:00\t10:00')).toEqual([
      ['Activity', 'Start', 'End'],
      ['Setup', '09:00', '10:00'],
    ]);
  });

  it('falls back to comma when no delimiter wins', () => {
    expect(parseCsv('single')).toEqual([['single']]);
    expect(parseCsv('a;b,c')).toEqual([['a;b', 'c']]);
  });

  it('detects delimiters quote-aware so embedded ones do not win', () => {
    expect(parseCsv('"a;b","c;d"\nx,y')).toEqual([['a;b', 'c;d'], ['x', 'y']]);
  });

  it('ignores a leading blank line when detecting the delimiter', () => {
    expect(parseCsv('\n\na;b;c')).toEqual([[''], [''], ['a', 'b', 'c']]);
  });

  it('returns an empty matrix for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});
