'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (item: T, value: unknown) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  width?: string;
  className?: string;
}

export interface DataTableAction<T> {
  key: string;
  label: string | ((item: T) => string);
  icon?: React.ComponentType<{ className?: string }> | ((item: T) => React.ComponentType<{ className?: string }>);
  onClick: (item: T) => void;
  variant?: 'default' | 'destructive' | 'secondary' | 'warning' | 'success' | ((item: T) => 'default' | 'destructive' | 'secondary' | 'warning' | 'success');
  show?: (item: T) => boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  actions?: DataTableAction<T>[];
  loading?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  filterable?: boolean;
  onFilter?: () => void;
  addButton?: {
    label: string;
    onClick: () => void;
  };
  pagination?: {
    current: number;
    total: number;
    pageSize: number;
    onPageChange: (page: number) => void;
  };
  emptyState?: {
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  className?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  actions = [],
  loading = false,
  searchable = true,
  searchPlaceholder = 'Search...',
  onSearch,
  filterable = false,
  onFilter,
  addButton,
  pagination,
  emptyState,
  className
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onSearch?.(query);
  };

  const handleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    
    const columnKey = column.key as string;
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const getValue = (item: T, column: Column<T>) => {
    const keys = (column.key as string).split('.');
    let value: unknown = item;
    for (const key of keys) {
      if (value && typeof value === 'object' && value !== null) {
        value = (value as Record<string, unknown>)[key];
      } else {
        value = undefined;
        break;
      }
    }
    return value;
  };

  const renderActions = (item: T) => {
    const visibleActions = actions.filter(action => action.show ? action.show(item) : true);
    
    if (visibleActions.length === 0) return null;

    if (visibleActions.length === 1) {
      const action = visibleActions[0];
      const Icon = typeof action.icon === 'function' ? action.icon(item) : action.icon;
      const label = typeof action.label === 'function' ? action.label(item) : action.label;
      const variant = typeof action.variant === 'function' ? action.variant(item) : action.variant;
      
      return (
        <Button
          variant={variant || 'ghost'}
          size="sm"
          onClick={() => action.onClick(item)}
          className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground transition-colors"
        >
          {Icon ? <Icon className="h-4 w-4" /> : label}
        </Button>
      );
    }

    // For multiple actions, render them as separate buttons in a flex container
    return (
      <div className="flex items-center gap-1">
        {visibleActions.map((action) => {
          const Icon = typeof action.icon === 'function' ? action.icon(item) : action.icon;
          const label = typeof action.label === 'function' ? action.label(item) : action.label;
          const variant = typeof action.variant === 'function' ? action.variant(item) : action.variant;
          
          return (
            <Button
              key={`${item.id || `item-${Math.random()}`}-action-${action.key}`}
              variant={variant || 'ghost'}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                action.onClick(item);
              }}
              className="h-8 w-8 p-0 hover:bg-primary hover:text-primary-foreground transition-colors"
              title={label}
            >
              {Icon ? <Icon className="h-4 w-4" /> : label.slice(0, 1)}
            </Button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="rounded-md border">
          <div className="p-4">
            {[...Array(5)].map((_, i) => (
              <div key={`skeleton-row-${i}`} className="flex items-center space-x-4 py-3">
                {columns.map((column, j) => (
                  <Skeleton key={`skeleton-col-${i}-${column.key as string}-${j}`} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          )}
          {filterable && (
            <Button variant="outline" onClick={onFilter} className="shrink-0">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          )}
        </div>
        {addButton && (
          <Button onClick={addButton.onClick} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            {addButton.label}
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {columns.map((column, index) => (
                  <th
                    key={column.key ? (column.key as string) : `column-${index}`}
                    className={cn(
                      "px-4 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider",
                      column.sortable && "cursor-pointer hover:text-gray-700",
                      column.className,
                      column.width && `w-${column.width}`
                    )}
                    onClick={() => handleSort(column)}
                  >
                    <div className="flex items-center gap-2">
                      {column.title}
                      {column.sortable && sortColumn === column.key && (
                        <span className="text-xs">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                {actions.length > 0 && (
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500 uppercase tracking-wider w-32">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="wait">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length + (actions.length > 0 ? 1 : 0)} className="px-4 py-8">
                      <div className="text-center">
                        <div className="text-gray-500 text-sm">
                          {emptyState ? (
                            <div className="space-y-3">
                              <h3 className="font-medium text-gray-900">{emptyState.title}</h3>
                              <p className="text-gray-500">{emptyState.description}</p>
                              {emptyState.action && (
                                <Button onClick={emptyState.action.onClick} variant="outline">
                                  {emptyState.action.label}
                                </Button>
                              )}
                            </div>
                          ) : (
                            'No data available'
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.map((item, index) => (
                    <motion.tr
                      key={item.id || `item-${index}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      {columns.map((column) => {
                        const value = getValue(item, column);
                        return (
                          <td
                            key={`${item.id || `item-${index}`}-${column.key || `col-${columns.indexOf(column)}`}`}
                            className={cn("px-4 py-3 text-sm text-gray-900", column.className)}
                          >
                            {column.render ? column.render(item, value) : (
                              typeof value === 'object' && value !== null ? 
                                JSON.stringify(value) : 
                                (value as React.ReactNode)
                            )}
                          </td>
                        );
                      })}
                      {actions.length > 0 && (
                        <td className="px-4 py-3 text-right">
                          {renderActions(item)}
                        </td>
                      )}
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {Math.min((pagination.current - 1) * pagination.pageSize + 1, pagination.total)} to{' '}
            {Math.min(pagination.current * pagination.pageSize, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.current === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.current - 1)}
              disabled={pagination.current === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium px-3 py-1 border rounded">
              {pagination.current}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.current + 1)}
              disabled={pagination.current * pagination.pageSize >= pagination.total}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => pagination.onPageChange(Math.ceil(pagination.total / pagination.pageSize))}
              disabled={pagination.current * pagination.pageSize >= pagination.total}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
