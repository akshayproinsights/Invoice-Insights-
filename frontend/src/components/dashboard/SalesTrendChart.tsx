import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';
import { formatChartCurrency, formatYAxisValue, chartColors } from '../../utils/dashboardHelpers';
import type { DailySalesVolume } from '../../services/dashboardAPI';

interface SalesTrendChartProps {
    data: DailySalesVolume[];
    isLoading?: boolean;
    dateRangeLabel?: string;
}

const SalesTrendChart: React.FC<SalesTrendChartProps> = ({
    data,
    isLoading = false,
    dateRangeLabel = 'This Period',
}) => {
    // Dynamic Bar Gap Logic
    const getBarCategoryGap = () => {
        if (!data || data.length === 0) return '20%';
        if (data.length <= 7) return '20%';  // Fat bars for "This Week"
        if (data.length <= 30) return '10%'; // Medium bars for "This Month"
        return '2%';                         // Thin bars for "90 Days" (Dense view)
    };

    // Smart X-Axis Interval Logic
    // If data > 30, show 1 label every 7 days (interval = 6 because 0-indexed)
    // Otherwise show all labels (interval = 0)
    const xAxisInterval = data && data.length > 30 ? 6 : 0;

    // Custom Tooltip
    const CustomSalesTrendTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload || payload.length === 0) return null;

        const date = format(new Date(label), 'EEE, MMM dd');
        const sparesRevenue = payload.find((p: any) => p.dataKey === 'parts_revenue')?.value || 0;
        const serviceRevenue = payload.find((p: any) => p.dataKey === 'labor_revenue')?.value || 0;
        const totalRevenue = sparesRevenue + serviceRevenue;
        const invoiceCount = payload[0]?.payload?.volume || 0;

        return (
            <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
                <p className="font-semibold text-gray-900 mb-2">{date}</p>
                <p className="font-bold text-lg text-gray-900">
                    Total Revenue: {formatChartCurrency(totalRevenue)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                    Spares: {formatChartCurrency(sparesRevenue)} | Service: {formatChartCurrency(serviceRevenue)}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                    📝 {invoiceCount} Invoice{invoiceCount !== 1 ? 's' : ''}
                </p>
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-[500px] flex flex-col justify-center">
            {/* Dynamic Header */}
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                    Revenue Overview
                    <span className="text-sm text-gray-500 font-normal ml-2">({dateRangeLabel})</span>
                </h3>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center flex-1 h-full">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : !data || data.length === 0 ? (
                <div className="flex items-center justify-center flex-1 h-full">
                    <p className="text-gray-500">No data available for this period</p>
                </div>
            ) : (
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            barCategoryGap={getBarCategoryGap()}
                            maxBarSize={50}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                            <XAxis
                                dataKey="date"
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickFormatter={(value) => format(new Date(value), 'EEE')}
                                padding={{ left: 20, right: 20 }}
                                axisLine={false}
                                tickLine={false}
                                interval={xAxisInterval}
                            />
                            <YAxis
                                tick={{ fontSize: 12, fill: '#6B7280' }}
                                tickFormatter={(value) => formatYAxisValue(value)}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomSalesTrendTooltip />} cursor={{ fill: '#F3F4F6' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Bar
                                dataKey="parts_revenue"
                                stackId="a"
                                fill={chartColors.part}
                                name="Spares"
                            />
                            <Bar
                                dataKey="labor_revenue"
                                stackId="a"
                                fill={chartColors.labour}
                                name="Service"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
};

export default SalesTrendChart;
