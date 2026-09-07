import { createToastItem, DEFAULT_TOAST_DURATION } from './Toast';

describe('Toast helper utilities', () => {
  it('creates toast item with default duration and auto-generated id', () => {
    const toast = createToastItem({
      type: 'success',
      message: 'Copied to clipboard',
    });

    expect(toast.id).toBeDefined();
    expect(toast.id.length).toBeGreaterThan(0);
    expect(toast.type).toBe('success');
    expect(toast.message).toBe('Copied to clipboard');
    expect(toast.duration).toBe(DEFAULT_TOAST_DURATION);
  });

  it('respects custom duration and custom ID generator', () => {
    const toast = createToastItem(
      {
        type: 'error',
        message: 'Failed to sync',
        duration: 5000,
      },
      () => 'test-id-123'
    );

    expect(toast.id).toBe('test-id-123');
    expect(toast.type).toBe('error');
    expect(toast.message).toBe('Failed to sync');
    expect(toast.duration).toBe(5000);
  });

  it('attaches action button if provided', () => {
    const onClick = jest.fn();
    const toast = createToastItem({
      type: 'info',
      message: 'New update available',
      action: {
        label: 'Refresh',
        onClick,
      },
    });

    expect(toast.action).toBeDefined();
    expect(toast.action?.label).toBe('Refresh');
    toast.action?.onClick();
    expect(onClick.mock.calls.length).toBe(1);
  });
});
