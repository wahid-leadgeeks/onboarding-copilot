import { BLOCKING_DIALOG_SELECTOR, hasBlockingDialog } from './useModalPresence';
import { canRestoreFocus } from './useRestoreFocus';

type Stub = { role: string; ariaModal?: string; classes?: string[]; assistant?: boolean };

/**
 * Stand-in for querySelector: it only knows the intended semantics of the
 * default selector, so this does not validate the `:is()` syntax itself
 * (the browser sweep covers that).
 */
function stubRoot(elements: Stub[]) {
  return {
    querySelector: (selector: string) => {
      expect(selector).toBe(BLOCKING_DIALOG_SELECTOR);
      return (
        elements.find(
          (el) =>
            el.ariaModal === 'true' &&
            (el.role === 'dialog' || el.role === 'alertdialog') &&
            !el.classes?.includes('guide-tour-popover') &&
            !el.assistant
        ) ?? null
      ) as Element | null;
    },
  };
}

describe('hasBlockingDialog (stubbed querySelector)', () => {
  it('names both dialog roles and both exclusions in the default selector', () => {
    expect(BLOCKING_DIALOG_SELECTOR).toContain('[aria-modal="true"]');
    expect(BLOCKING_DIALOG_SELECTOR).toContain('[role="dialog"]');
    expect(BLOCKING_DIALOG_SELECTOR).toContain('[role="alertdialog"]');
    expect(BLOCKING_DIALOG_SELECTOR).toContain(':not(.guide-tour-popover)');
    expect(BLOCKING_DIALOG_SELECTOR).toContain(':not([data-assistant])');
  });

  it('detects a ConfirmDialog-like alertdialog', () => {
    expect(hasBlockingDialog(stubRoot([{ role: 'alertdialog', ariaModal: 'true' }]))).toBe(true);
  });

  it('detects a ModalDialog-like dialog', () => {
    expect(hasBlockingDialog(stubRoot([{ role: 'dialog', ariaModal: 'true' }]))).toBe(true);
  });

  it('ignores the Assistant panel, the guide tour and non-modal dialogs', () => {
    expect(hasBlockingDialog(stubRoot([{ role: 'dialog', ariaModal: 'true', assistant: true }]))).toBe(false);
    expect(hasBlockingDialog(stubRoot([{ role: 'dialog', ariaModal: 'true', classes: ['guide-tour-popover'] }]))).toBe(false);
    expect(hasBlockingDialog(stubRoot([{ role: 'dialog' }]))).toBe(false);
  });

  it('is false without a root or when the selector throws', () => {
    expect(hasBlockingDialog(null)).toBe(false);
    expect(hasBlockingDialog({ querySelector: () => { throw new Error('bad selector'); } })).toBe(false);
  });
});

describe('canRestoreFocus', () => {
  it('only restores to connected focusable elements', () => {
    expect(canRestoreFocus({ focus: () => {}, isConnected: true })).toBe(true);
    expect(canRestoreFocus({ focus: () => {}, isConnected: false })).toBe(false);
    expect(canRestoreFocus(null)).toBe(false);
  });
});
