// ═══════════════════════════════════════════════════════════════════════════════
// FILE: src/components/common/Pagination.tsx
// PURPOSE: Reusable pagination component with RTL support
// ═══════════════════════════════════════════════════════════════════════════════

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaginationMeta } from '@/types';
import { motion } from 'framer-motion';

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (page: number) => void;
  /** Show page numbers in the middle */
  showPageNumbers?: boolean;
  /** Custom class for the container */
  className?: string;
}

export default function Pagination({
  pagination,
  onPageChange,
  showPageNumbers = false,
  className = '',
}: PaginationProps) {
  const { page, totalPages, hasNext, hasPrev, total } = pagination;

  // Don't render if there's only one page or no data
  if (totalPages <= 1 && total === 0) return null;

  // Generate page numbers to show (always show first, last, current, and neighbors)
  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages: (number | 'ellipsis')[] = [];
    const current = page;
    const delta = 1;

    // Always add first page
    pages.push(1);

    // Add ellipsis if needed
    if (current - delta > 2) {
      pages.push('ellipsis');
    }

    // Add pages around current
    for (let i = Math.max(2, current - delta); i <= Math.min(totalPages - 1, current + delta); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }

    // Add ellipsis if needed
    if (current + delta < totalPages - 1) {
      pages.push('ellipsis');
    }

    // Always add last page
    if (!pages.includes(totalPages)) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className={`flex items-center justify-between gap-4 ${className}`}>
      {/* Info Text */}
      <div className="text-sm text-fg-3">
        الصفحة <span className="font-semibold text-fg-1">{page}</span> من{' '}
        <span className="font-semibold text-fg-1">{totalPages}</span>
        <span className="hidden sm:inline"> · {total} عنصر</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Previous Button */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrev}
          className={`
            inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm
            transition-all duration-200
            ${hasPrev
              ? 'bg-surface-2/80 border-line-strong hover:bg-surface-2 hover:border-line-strong/80 text-fg-1'
              : 'bg-surface-1/40 border-line/40 text-fg-4 cursor-not-allowed opacity-50'
            }
          `}
        >
          <ChevronRight className="w-4 h-4" />
          السابق
        </button>

        {/* Page Numbers */}
        {showPageNumbers && totalPages > 1 && (
          <div className="hidden md:flex items-center gap-1">
            {getPageNumbers().map((p, index) =>
              p === 'ellipsis' ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-2 py-2 text-fg-4"
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  className={`
                    h-9 min-w-[36px] rounded-lg text-sm font-medium transition-all duration-200
                    ${p === page
                      ? 'bg-brass text-fg-1 shadow-depth-1'
                      : 'text-fg-2 hover:bg-surface-2 hover:text-fg-1'
                    }
                  `}
                >
                  {p}
                </button>
              )
            )}
          </div>
        )}

        {/* Next Button */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className={`
            inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm
            transition-all duration-200
            ${hasNext
              ? 'bg-surface-2/80 border-line-strong hover:bg-surface-2 hover:border-line-strong/80 text-fg-1'
              : 'bg-surface-1/40 border-line/40 text-fg-4 cursor-not-allowed opacity-50'
            }
          `}
        >
          التالي
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Simple Loading Skeleton ──────────────────────────────────────────────────

export function PaginationSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <div className="h-4 w-24 bg-surface-2 rounded animate-pulse" />
      <div className="flex items-center gap-2">
        <div className="h-9 w-20 bg-surface-2 rounded-xl animate-pulse" />
        <div className="h-9 w-20 bg-surface-2 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}