import React from 'react';

interface PaginationProps {
  totalItems: number;
  visibleItems: number;
  onShowMore: () => void;
  onShowLess: () => void;
  pageSize?: number;
  className?: string;
}

export function Pagination({
  totalItems,
  visibleItems,
  onShowMore,
  onShowLess,
  pageSize = 5,
  className = ''
}: PaginationProps) {
  const canShowMore = visibleItems < totalItems;
  const canShowLess = visibleItems > pageSize;

  if (totalItems <= pageSize) {
    return null; // Don't show pagination if all items fit on one page
  }

  return (
    <div className={`flex items-center justify-center gap-3 pt-4 ${className}`}>
      {canShowLess && (
        <button
          onClick={onShowLess}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
        >
          Show Less
        </button>
      )}
      {canShowMore && (
        <button
          onClick={onShowMore}
          className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
        >
          Show More
        </button>
      )}
    </div>
  );
}

// Hook for managing pagination state
export function usePagination(totalItems: number, initialPageSize: number = 5) {
  const [visibleItems, setVisibleItems] = React.useState(initialPageSize);

  const handleShowMore = () => {
    setVisibleItems(Math.min(visibleItems + initialPageSize, totalItems));
  };

  const handleShowLess = () => {
    setVisibleItems(Math.max(initialPageSize, visibleItems - initialPageSize));
  };

  const resetPagination = () => {
    setVisibleItems(initialPageSize);
  };

  return {
    visibleItems,
    handleShowMore,
    handleShowLess,
    resetPagination,
    canShowMore: visibleItems < totalItems,
    canShowLess: visibleItems > initialPageSize
  };
}
