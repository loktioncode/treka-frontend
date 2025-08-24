"use client";

import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface MultiSearchableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MultiSearchableSelectProps {
  options: MultiSearchableSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  searchPlaceholder?: string;
  maxSelections?: number;
}

export function MultiSearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select options...",
  className,
  disabled = false,
  searchPlaceholder = "Search...",
  maxSelections,
}: MultiSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedOptions = options.filter((option) =>
    value.includes(option.value),
  );
  const filteredOptions = options.filter(
    (option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !value.includes(option.value), // Don't show already selected options
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        event.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1,
        );
        break;
      case "Enter":
        event.preventDefault();
        if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchQuery("");
        setHighlightedIndex(-1);
        break;
    }
  };

  const handleSelect = (optionValue: string) => {
    if (maxSelections && value.length >= maxSelections) {
      return; // Don't allow more selections than the limit
    }
    const newValue = [...value, optionValue];
    onChange(newValue);
    setSearchQuery("");
    setHighlightedIndex(-1);
    // Keep dropdown open for multiple selections
  };

  const handleRemove = (optionValue: string) => {
    onChange(value.filter((v) => v !== optionValue));
  };

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchQuery("");
        setHighlightedIndex(-1);
      }
    }
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
    setSearchQuery("");
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      <div
        className={cn(
          "flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer hover:border-ring",
        )}
        onClick={handleToggle}
      >
        <div className="flex-1 flex flex-wrap gap-1 min-h-6">
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground py-1">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <span
                key={option.value}
                className="inline-flex items-center gap-2 bg-teal-100 text-teal-800 text-xs px-2 py-1 rounded-md"
              >
                <div className="w-3 h-3 border border-teal-600 rounded bg-teal-600 flex items-center justify-center">
                  <Check className="w-2 h-2 text-white" />
                </div>
                {option.label}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(option.value);
                  }}
                  className="hover:bg-teal-200 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          )}
        </div>

        <div className="flex items-center gap-2 ml-2">
          {value.length > 0 && !disabled && (
            <>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                {value.length} selected
              </span>
              <button
                type="button"
                onClick={clearAll}
                className="p-1 hover:bg-muted rounded-sm"
                title="Clear all selections"
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            </>
          )}
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-xl max-h-60 overflow-hidden">
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
                {filteredOptions.length} result
                {filteredOptions.length !== 1 ? "s" : ""} found
              </div>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto">
            {/* Select All Option */}
            {filteredOptions.length > 0 &&
              (!maxSelections || value.length < maxSelections) && (
                <div
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-teal-50 border-b border-gray-200 bg-gray-50 flex items-center gap-3 font-medium"
                  onClick={() => {
                    let allValues = filteredOptions.map((opt) => opt.value);
                    if (maxSelections) {
                      const remainingSlots = maxSelections - value.length;
                      allValues = allValues.slice(0, remainingSlots);
                    }
                    onChange([...value, ...allValues]);
                    setSearchQuery("");
                  }}
                >
                  <div className="w-4 h-4 border border-gray-400 rounded bg-white flex items-center justify-center">
                    <Check className="w-3 h-3 text-teal-600" />
                  </div>
                  {maxSelections &&
                  value.length + filteredOptions.length > maxSelections
                    ? `Select Available (Max ${maxSelections})`
                    : "Select All Available"}
                </div>
              )}

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 text-center bg-gray-50">
                {searchQuery
                  ? `No results found for "${searchQuery}"`
                  : "No more options available"}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelectionLimitReached =
                  maxSelections && value.length >= maxSelections;
                return (
                  <div
                    key={option.value}
                    className={cn(
                      "px-3 py-2 text-sm cursor-pointer hover:bg-teal-50 border-l-2 border-transparent flex items-center gap-3",
                      index === highlightedIndex &&
                        "bg-teal-50 border-l-teal-500",
                      (option.disabled || isSelectionLimitReached) &&
                        "opacity-50 cursor-not-allowed bg-gray-50",
                    )}
                    onClick={() =>
                      !(option.disabled || isSelectionLimitReached) &&
                      handleSelect(option.value)
                    }
                  >
                    {/* Checkbox placeholder for visual consistency */}
                    <div className="w-4 h-4 border border-gray-300 rounded bg-white flex items-center justify-center">
                      <div className="w-2 h-2 bg-teal-500 rounded-sm opacity-0" />
                    </div>
                    {option.label}
                    {isSelectionLimitReached && (
                      <span className="ml-auto text-xs text-gray-500">
                        (Max reached)
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
