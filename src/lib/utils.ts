import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function capitalizeFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function formatDateForInput(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export function formatCurrency(amount: number, currency: string = 'ZAR'): string {
  try {
    // Special case for 0 to ensure consistent formatting
    if (amount === 0) {
      const currencySymbols: Record<string, string> = {
        'ZAR': 'R',
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'KES': 'KSh',
        'NGN': '₦',
        'GHS': 'GH₵'
      };
      const symbol = currencySymbols[currency] || 'R';
      return `${symbol} 0.00`;
    }
    
    // Map currency codes to locale strings for proper formatting
    const currencyMap: Record<string, string> = {
      'ZAR': 'en-ZA',
      'USD': 'en-US',
      'EUR': 'de-DE',
      'GBP': 'en-GB',
      'KES': 'en-KE',
      'NGN': 'en-NG',
      'GHS': 'en-GH'
    };
    
    const locale = currencyMap[currency] || 'en-ZA';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback formatting if Intl fails
    return `${currency} ${amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

export function getCurrencySymbol(currency: string = 'ZAR'): string {
  const currencySymbols: Record<string, string> = {
    'ZAR': 'R',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'KES': 'KSh',
    'NGN': '₦',
    'GHS': 'GH₵'
  };
  
  return currencySymbols[currency] || 'R';
}
