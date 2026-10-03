/** Elements that own an Escape press while a Sheet tools menu is open (the menu itself or its expanded trigger). */
export const OPEN_MENU_SELECTOR = '[role="menu"], [aria-haspopup="menu"][aria-expanded="true"]';

interface EscapeLike {
  readonly key: string;
  readonly target: unknown;
}

function hasClosest(value: unknown): value is { closest: (selector: string) => unknown } {
  return typeof value === 'object' && value !== null && typeof (value as { closest?: unknown }).closest === 'function';
}

/**
 * Whether a slide-over sheet should close for this keydown. Sheets listen in the capture phase, so this runs
 * before the Sheet tools menu's own handler: while a menu is open (focus inside it, or on its expanded trigger —
 * including when every item is disabled and focus stays on the trigger) Escape belongs to the menu.
 */
export function shouldSheetCloseOnEscape(event: EscapeLike): boolean {
  if (event.key !== 'Escape') return false;
  if (hasClosest(event.target) && event.target.closest(OPEN_MENU_SELECTOR)) return false;
  return true;
}
