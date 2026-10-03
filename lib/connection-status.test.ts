import {
  connectionLines,
  friendlyExtractError,
  isSheetNotConfiguredError,
  shouldShowPullNotice,
} from './connection-status';
import type { HealthSnapshot } from './sync-status';

const connected: HealthSnapshot = {
  mode: 'connected',
  spreadsheetId: 'sheet-123',
  integrations: { sheets: true, sheetsRead: true, sheetsWrite: true, diaryWrite: true, oauth: true, ai: true },
};
const local: HealthSnapshot = {
  mode: 'local',
  spreadsheetId: null,
  integrations: { sheets: false, sheetsRead: false, sheetsWrite: false, diaryWrite: false, oauth: false, ai: false },
};
const NOT_CONFIGURED = 'GOOGLE_SHEETS_ID is not configured in .env.local and no id param was provided';

describe('isSheetNotConfiguredError', () => {
  it('matches the extract route not-configured message, case-insensitively', () => {
    expect(isSheetNotConfiguredError(NOT_CONFIGURED)).toBe(true);
    expect(isSheetNotConfiguredError('Sheet NOT CONFIGURED')).toBe(true);
  });
  it('does not match other failures or empty values', () => {
    expect(isSheetNotConfiguredError('Failed to extract Google Sheet')).toBe(false);
    expect(isSheetNotConfiguredError('')).toBe(false);
    expect(isSheetNotConfiguredError(null)).toBe(false);
  });
});

describe('shouldShowPullNotice', () => {
  it('is hidden without an error', () => {
    expect(shouldShowPullNotice({ error: null, health: connected, healthFailed: false })).toBe(false);
  });
  it('is shown for a real failure when connected (including the silent initial pull)', () => {
    expect(shouldShowPullNotice({ error: 'Upstream failure', health: connected, healthFailed: false })).toBe(true);
  });
  it('is hidden in local mode', () => {
    expect(shouldShowPullNotice({ error: 'Upstream failure', health: local, healthFailed: false })).toBe(false);
  });
  it('is hidden when the error only says the sheet is not configured', () => {
    expect(shouldShowPullNotice({ error: NOT_CONFIGURED, health: connected, healthFailed: false })).toBe(false);
  });
  it('waits for the health check, then shows when the health check failed', () => {
    expect(shouldShowPullNotice({ error: 'Upstream failure', health: null, healthFailed: false })).toBe(false);
    expect(shouldShowPullNotice({ error: 'Upstream failure', health: null, healthFailed: true })).toBe(true);
  });
});

describe('friendlyExtractError', () => {
  it('rewrites the not-configured error without env-var names', () => {
    const text = friendlyExtractError(NOT_CONFIGURED);
    expect(text).not.toMatch(/GOOGLE_SHEETS_ID|\.env/);
    expect(text).toMatch(/No spreadsheet is set up/);
  });
  it('passes other messages through', () => {
    expect(friendlyExtractError('Timed out')).toBe('Timed out');
  });
});

describe('connectionLines', () => {
  it('local, env-free health shows "Not configured" and "Saved on this device"', () => {
    const lines = connectionLines(local);
    const byId = Object.fromEntries(lines.map((line) => [line.id, line]));
    expect(byId.spreadsheet.value).toBe('Not configured');
    expect(byId.spreadsheet.detail).toBeUndefined();
    expect(byId['sheets-read'].value).toBe('Not configured');
    expect(byId['schedule-write'].value).toBe('Not configured');
    expect(byId['diary-write'].value).toBe('Not configured');
    expect(byId.ai.value).toBe('Not configured');
    expect(byId.mode.value).toBe('Saved on this device');
  });
  it('fully connected health shows the sheet id and all integrations ready', () => {
    const byId = Object.fromEntries(connectionLines(connected).map((line) => [line.id, line]));
    expect([byId.spreadsheet.value, byId.spreadsheet.detail, byId.spreadsheet.tone]).toEqual(['Connected', 'sheet-123', 'ok']);
    expect(byId['sheets-read'].value).toBe('Ready');
    expect(byId['schedule-write'].value).toBe('Ready');
    expect(byId['diary-write'].value).toBe('Ready');
    expect(byId.ai.value).toBe('Ready');
    expect(byId.mode.value).toBe('This device and the spreadsheet');
  });
  it('a sheet id without a working integration is "Partly set up", never "Connected"', () => {
    const partial: HealthSnapshot = { ...connected, mode: 'connected', integrations: { ...connected.integrations, sheets: false } };
    const byId = Object.fromEntries(connectionLines(partial).map((line) => [line.id, line]));
    expect([byId.spreadsheet.value, byId.spreadsheet.tone]).toEqual(['Partly set up', 'warn']);
    expect(byId.mode.value).toBe('Saved on this device');
  });
  it('never uses the old hardcoded status wording', () => {
    for (const health of [local, connected]) {
      const text = JSON.stringify(connectionLines(health));
      expect(text).not.toMatch(/Dual-Sync|Connected \(|nova-clone|Aiven|PostgreSQL/);
    }
  });
});
