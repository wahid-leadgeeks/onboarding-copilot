export interface RowTagProps {
  rowNumber: number;
  className?: string;
}

/** Quiet spreadsheet row reference: "#12", with the full meaning in a tooltip and for screen readers. */
export function RowTag({ rowNumber, className = '' }: RowTagProps) {
  return (
    <span
      title={`Spreadsheet row ${rowNumber}`}
      className={`inline-flex shrink-0 items-center text-xs font-medium tabular-nums text-stone-500 ${className}`}
    >
      <span className="sr-only">row </span>#{rowNumber}
    </span>
  );
}
