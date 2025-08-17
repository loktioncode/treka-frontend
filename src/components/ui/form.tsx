'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

// Form context
interface FormContextType {
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
}

const FormContext = React.createContext<FormContextType | undefined>(undefined);

// Form provider
interface FormProviderProps {
  children: React.ReactNode;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
  isSubmitting?: boolean;
}

export function FormProvider({ children, errors = {}, touched = {}, isSubmitting = false }: FormProviderProps) {
  return (
    <FormContext.Provider value={{ errors, touched, isSubmitting }}>
      {children}
    </FormContext.Provider>
  );
}

// Form hook
export function useFormContext() {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormProvider');
  }
  return context;
}

// Form root
interface FormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode;
  errors?: Record<string, string>;
  touched?: Record<string, boolean>;
  isSubmitting?: boolean;
}

export function Form({ children, errors, touched, isSubmitting, className, ...props }: FormProps) {
  return (
    <FormProvider errors={errors} touched={touched} isSubmitting={isSubmitting}>
      <form className={cn("space-y-6", className)} {...props}>
        {children}
      </form>
    </FormProvider>
  );
}

// Form field
interface FormFieldProps {
  children: React.ReactNode;
  name: string;
  className?: string;
}

export function FormField({ children, name, className }: FormFieldProps) {
  const { errors, touched } = useFormContext();
  const hasError = touched[name] && errors[name];

  return (
    <div className={cn("space-y-2", className)}>
      {children}
      {hasError && (
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          {errors[name]}
        </div>
      )}
    </div>
  );
}

// Form label
interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function FormLabel({ children, required, className, ...props }: FormLabelProps) {
  return (
    <label
      className={cn("text-sm font-medium text-gray-700", className)}
      {...props}
    >
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

// Form description
interface FormDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export function FormDescription({ children, className, ...props }: FormDescriptionProps) {
  return (
    <p className={cn("text-sm text-gray-500", className)} {...props}>
      {children}
    </p>
  );
}

// Form section
interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="pb-2 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        {description && (
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// Form grid
interface FormGridProps {
  children: React.ReactNode;
  cols?: 1 | 2 | 3;
  className?: string;
}

export function FormGrid({ children, cols = 2, className }: FormGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  };

  return (
    <div className={cn("grid gap-4", gridCols[cols], className)}>
      {children}
    </div>
  );
}

// Form actions
interface FormActionsProps {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export function FormActions({ children, align = 'right', className }: FormActionsProps) {
  const alignClass = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  return (
    <div className={cn("flex items-center gap-3 pt-4 border-t border-gray-200", alignClass[align], className)}>
      {children}
    </div>
  );
}

// Select field
interface SelectOption {
  key?: string;
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options?: SelectOption[];
  placeholder?: string;
}

export function Select({ options = [], placeholder, className, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options?.map((option) => (
        <option key={option.key || option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      )) || []}
    </select>
  );
}

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string;
}

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

// Checkbox
interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function Checkbox({ label, className, id, ...props }: CheckboxProps) {
  const inputId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="flex items-center space-x-2">
      <input
        type="checkbox"
        id={inputId}
        className={cn(
          "h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500",
          className
        )}
        {...props}
      />
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        {label}
      </label>
    </div>
  );
}

// File input
interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  accept?: string;
  multiple?: boolean;
  onFilesChange?: (files: FileList | null) => void;
}

export function FileInput({ onFilesChange, className, ...props }: FileInputProps) {
  return (
    <input
      type="file"
      className={cn(
        "block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100",
        className
      )}
      onChange={(e) => onFilesChange?.(e.target.files)}
      {...props}
    />
  );
}
