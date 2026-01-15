/**
 * Dashboard helper utilities
 */
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

export interface DateRange {
    startDate: string; // YYYY-MM-DD format
    endDate: string;
    label: string;
}

/**
 * Format currency amount with ₹ symbol
 */
export function formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

/**
 * Format number with Indian locale
 */
export function formatNumber(num: number, decimals: number = 0): string {
    return num.toLocaleString('en-IN', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Get preset date ranges for filtering
 */
export function getDateRangePresets(): DateRange[] {
    const today = new Date();

    return [
        {
            startDate: format(subDays(today, 7), 'yyyy-MM-dd'),
            endDate: format(today, 'yyyy-MM-dd'),
            label: 'Last 7 Days',
        },
        {
            startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
            endDate: format(today, 'yyyy-MM-dd'),
            label: 'Last 30 Days',
        },
        {
            startDate: format(subDays(today, 90), 'yyyy-MM-dd'),
            endDate: format(today, 'yyyy-MM-dd'),
            label: 'Last 90 Days',
        },
        {
            startDate: format(startOfDay(today), 'yyyy-MM-dd'),
            endDate: format(endOfDay(today), 'yyyy-MM-dd'),
            label: 'Today',
        },
    ];
}

/**
 * Format date for display (e.g., Jan 15)
 */
export function formatDateShort(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        return format(date, 'MMM dd');
    } catch {
        return dateStr;
    }
}

/**
 * Format date for display (e.g., Jan 15, 2026)
 */
export function formatDateLong(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        return format(date, 'MMM dd, yyyy');
    } catch {
        return dateStr;
    }
}

/**
 * Check if visual should be shown based on config
 */
export function shouldShowVisual(
    visualConfig: any,
    currentUsername: string
): boolean {
    if (!visualConfig || !visualConfig.enabled) {
        return false;
    }

    // Check visible_to list
    if (visualConfig.visible_to && Array.isArray(visualConfig.visible_to)) {
        return visualConfig.visible_to.includes(currentUsername);
    }

    // If no visibility restrictions, show to all
    return true;
}

/**
 * Get status color for stock items
 */
export function getStockStatusColor(stock: number, reorder: number): string {
    if (stock <= 0) {
        return 'bg-red-100 text-red-700 border-red-300';
    } else if (stock < reorder) {
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    } else {
        return 'bg-green-100 text-green-700 border-green-300';
    }
}

/**
 * Get chart colors for consistent theming
 */
export const chartColors = {
    primary: '#4F46E5', // Indigo-600
    secondary: '#10B981', // Green-500
    warning: '#F59E0B', // Amber-500
    danger: '#EF4444', // Red-500
    info: '#3B82F6', // Blue-500
    part: '#8B5CF6', // Purple-500
    labour: '#14B8A6', // Teal-500
};
