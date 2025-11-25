"use client";

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, total, pageSize, onPageChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="flex items-center justify-end gap-2 text-xs text-[#9f9f9f]">
      <span>
        Page {page} / {pageCount}
      </span>
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded border border-[#2c2c2c] px-2 py-1 text-[#f1f1f1] disabled:opacity-50"
      >
        Prev
      </button>
      <button
        onClick={() => onPageChange(Math.min(pageCount, page + 1))}
        disabled={page >= pageCount}
        className="rounded border border-[#2c2c2c] px-2 py-1 text-[#f1f1f1] disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
