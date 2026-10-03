import { shouldDismissOnEscape } from './ModalDialog';

describe('shouldDismissOnEscape', () => {
  it('dismisses on Escape only when dismissible', () => {
    expect(shouldDismissOnEscape(true, 'Escape')).toBe(true);
    expect(shouldDismissOnEscape(false, 'Escape')).toBe(false);
  });

  it('ignores other keys', () => {
    expect(shouldDismissOnEscape(true, 'Enter')).toBe(false);
    expect(shouldDismissOnEscape(true, 'Esc')).toBe(false);
  });
});
