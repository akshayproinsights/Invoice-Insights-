import React from 'react';
import { Package, AlertTriangle, XCircle, TrendingDown } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/dashboardHelpers';
import type { StockSummary } from '../../services/dashboardAPI';

interface StockValueMetricsProps {
    summary: StockSummary | null;
    isLoading?: boolean;
}

const StockValueMetrics: React.FC<StockValueMetricsProps> = ({ summary, isLoading = false }) => {
    const metrics = [
        {
            label: 'Total Stock Value',
            value: summary ? formatCurrency(summary.total_stock_value) : '—',
            icon: Package,
            color: 'bg-blue-50 text-blue-600',
            iconBg: 'bg-blue-100',
        },
        {
            label: 'Low Stock Items',
            value: summary ? formatNumber(summary.low_stock_count) : '—',
            icon: AlertTriangle,
            color: 'bg-yellow-50 text-yellow-600',
            iconBg: 'bg-yellow-100',
        },
        {
            label: 'Out of Stock',
            value: summary ? formatNumber(summary.out_of_stock_count) : '—',
            icon: XCircle,
            color: 'bg-red-50 text-red-600',
            iconBg: 'bg-red-100',
        },
        {
            label: 'Below Reorder',
            value: summary ? formatNumber(summary.below_reorder_count) : '—',
            icon: TrendingDown,
            color: 'bg-orange-50 text-orange-600',
            iconBg: 'bg-orange-100',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.map((metric, index) => {
                const Icon = metric.icon;
                return (
                    <div
                        key={index}
                        className={`${metric.color} rounded-xl border shadow-sm p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium opacity-80">{metric.label}</p>
                                <p
                                    className={`text-3xl font-bold mt-2 ${isLoading ? 'animate-pulse opacity-50' : ''
                                        }`}
                                >
                                    {metric.value}
                                </p>
                                {summary && metric.label === 'Total Stock Value' && (
                                    <p className="text-xs opacity-70 mt-1">
                                        {summary.total_items} total items
                                    </p>
                                )}
                            </div>
                            <div className={`${metric.iconBg} p-3 rounded-lg`}>
                                <Icon size={24} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default StockValueMetrics;
