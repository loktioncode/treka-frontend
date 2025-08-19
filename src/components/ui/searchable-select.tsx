'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';

interface SearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  className,
  disabled = false,
  searchPlaceholder = 'Search...'
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(option => option.value === value);
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery('');
        setHighlightedIndex(-1);
      }
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchQuery('');
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer hover:border-ring"
        )}
        onClick={handleToggle}
      >
        <div className="flex-1 truncate">
          {selectedOption ? (
            <span className="text-foreground">{selectedOption.label}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </div>
        
        <div className="flex items-center gap-2 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={clearSelection}
              className="p-1 hover:bg-muted rounded-sm"
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          )}
          <ChevronDown 
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} 
          />
        </div>
      </div>

      {isOpen && createPortal(
        <div 
          className="fixed z-[9999] bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-hidden"
          style={{
            top: containerRef.current ? containerRef.current.getBoundingClientRect().bottom + 4 : 0,
            left: containerRef.current ? containerRef.current.getBoundingClientRect().left : 0,
            width: containerRef.current ? containerRef.current.getBoundingClientRect().width : 'auto',
            minWidth: containerRef.current ? containerRef.current.getBoundingClientRect().width : 'auto'
          }}
        >
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full pl-10 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-md outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 placeholder:text-gray-500"
              />
            </div>
            {searchQuery && (
              <div className="text-xs text-gray-600 mt-1">
                {filteredOptions.length} result{filteredOptions.length !== 1 ? 's' : ''} found
              </div>
            )}
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center bg-gray-50">
                {searchQuery ? `No results found for "${searchQuery}"` : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <div
                  key={option.value}
                  className={cn(
                    "px-3 py-2 text-sm cursor-pointer hover:bg-teal-50 border-l-2 border-transparent",
                    index === highlightedIndex && "bg-teal-50 border-l-teal-500",
                    option.value === value && "bg-teal-100 border-l-teal-600 text-teal-900 font-medium",
                    option.disabled && "opacity-50 cursor-not-allowed bg-gray-50"
                  )}
                  onClick={() => !option.disabled && handleSelect(option.value)}
                >
                  {option.label}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
