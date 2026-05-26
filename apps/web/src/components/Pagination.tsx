import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';

// ── Hook ─────────────────────────────────────────────────────────────────────
export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);

  // Reset to page 1 whenever the dataset changes (sort, filter, new data)
  useEffect(() => { setPage(1); }, [items.length]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;
  const paged = items.slice(start, start + pageSize);

  return {
    page: safePage,
    setPage,
    totalPages,
    paged,
    start,
    end: Math.min(start + pageSize, items.length),
    total: items.length,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
interface PaginationProps {
  page: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  onPageChange: (p: number) => void;
}

export function Pagination({ page, totalPages, start, end, total, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build visible page numbers: always show first, last, current ±1, with '…' gaps
  const pages: (number | '…')[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };

  add(1);
  if (page - 2 > 2) pages.push('…');
  for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) add(i);
  if (page + 2 < totalPages - 1) pages.push('…');
  if (totalPages > 1) add(totalPages);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t border-border">
      <p className="text-xs text-text-muted order-2 sm:order-1">
        Showing <span className="text-white font-medium">{start + 1}–{end}</span> of{' '}
        <span className="text-white font-medium">{total}</span>
      </p>

      <div className="flex items-center gap-1 order-1 sm:order-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-white hover:border-border-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-text-muted text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={clsx(
                'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors',
                p === page
                  ? 'bg-primary text-bg-primary font-bold'
                  : 'border border-border text-text-secondary hover:text-white hover:border-border-light',
              )}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-white hover:border-border-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
