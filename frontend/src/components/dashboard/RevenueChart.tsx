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
import { formatDateShort, formatChartCurrency, formatYAxisValue, chartColors } from '../../utils/dashboardHelpers';
import type { DailyRevenue } from '../../services/dashboardAPI';

interface RevenueChartProps {
    data: DailyRevenue[];
    isLoading?: boolean;
    showStacked?: boolean;
}

const RevenueChart: React.FC<RevenueChartProps> = ({
    data,
    isLoading = false,
    showStacked = true,
}) => {
    if (isLoading) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading revenue data...</p>
                </div>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">No revenue data</p>
                    <p className="text-sm mt-1">No sales found for the selected date range</p>
                </div>
            </div>
        );
    }

    // Custom tooltip with Service/Spares naming and integer formatting
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const totalRevenue = payload.reduce((sum: number, p: any) => sum + p.value, 0);
            const sparesRevenue = payload.find((p: any) => p.dataKey === 'part_amount')?.value || 0;
            const serviceRevenue = payload.find((p: any) => p.dataKey === 'labour_amount')?.value || 0;
            const invoiceCount = payload[0]?.payload?.invoice_count || 0;

            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
                    <p className="font-semibold text-gray-700 text-xs mb-2">{formatDateShort(label)}</p>
                    <p className="text-base font-bold text-gray-900 mb-1">
                        Total Revenue: {formatChartCurrency(totalRevenue)}
                    </p>
                    <p className="text-xs text-gray-500">
                        Spares: {formatChartCurrency(sparesRevenue)} | Service: {formatChartCurrency(serviceRevenue)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                        📝 {invoiceCount} {invoiceCount === 1 ? 'Invoice' : 'Invoices'}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full">
            <ResponsiveContainer width="100%" height={400}>
                <BarChart
                    data={data}
                    margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                    barCategoryGap="20%"
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis
                        dataKey="date"
                        tickFormatter={formatDateShort}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                        padding={{ left: 10, right: 10 }}
                    />
                    <YAxis
                        tickFormatter={(value) => formatYAxisValue(value)}
                        tick={{ fill: '#6b7280', fontSize: 12 }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="rect"
                        formatter={(value) => (
                            <span className="text-sm font-medium text-gray-700">{value}</span>
                        )}
                    />
                    {showStacked ? (
                        <>
                            <Bar
                                dataKey="part_amount"
                                name="Spares Revenue"
                                fill={chartColors.part}
                                stackId="revenue"
                                radius={[0, 0, 0, 0]}
                            />
                            <Bar
                                dataKey="labour_amount"
                                name="Service Revenue"
                                fill={chartColors.labour}
                                stackId="revenue"
                                radius={[4, 4, 0, 0]}
                            />
                        </>
                    ) : (
                        <Bar
                            dataKey="total_amount"
                            name="Total Revenue"
                            fill={chartColors.primary}
                            radius={[4, 4, 0, 0]}
                        />
                    )}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default RevenueChart;
