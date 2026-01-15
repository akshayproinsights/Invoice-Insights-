import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { formatCurrency, chartColors } from '../../utils/dashboardHelpers';

interface PartLabourBreakdownProps {
    partRevenue: number;
    labourRevenue: number;
    isLoading?: boolean;
}

const PartLabourBreakdown: React.FC<PartLabourBreakdownProps> = ({
    partRevenue,
    labourRevenue,
    isLoading = false,
}) => {
    if (isLoading) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    const total = partRevenue + labourRevenue;

    if (total === 0) {
        return (
            <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">No data available</p>
                    <p className="text-sm mt-1">No part or labour revenue found</p>
                </div>
            </div>
        );
    }

    const data = [
        { name: 'Part Revenue', value: partRevenue, color: chartColors.part },
        { name: 'Labour Revenue', value: labourRevenue, color: chartColors.labour },
    ].filter((item) => item.value > 0); // Only show non-zero values

    const partPercentage = ((partRevenue / total) * 100).toFixed(1);
    const labourPercentage = ((labourRevenue / total) * 100).toFixed(1);

    // Custom label for pie slices
    const renderLabel = (entry: any) => {
        const percent = ((entry.value / total) * 100).toFixed(0);
        return `${percent}%`;
    };

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const percent = ((data.value / total) * 100).toFixed(1);
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                    <p className="font-semibold text-gray-900">{data.name}</p>
                    <p className="text-sm text-gray-700 mt-1">
                        Amount: {formatCurrency(data.value)}
                    </p>
                    <p className="text-sm text-gray-600">Percentage: {percent}%</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="w-full">
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.part }}></div>
                        <p className="text-sm font-medium text-gray-700">Part Revenue</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(partRevenue)}</p>
                    <p className="text-sm text-gray-600 mt-1">{partPercentage}% of total</p>
                </div>

                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: chartColors.labour }}></div>
                        <p className="text-sm font-medium text-gray-700">Labour Revenue</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(labourRevenue)}</p>
                    <p className="text-sm text-gray-600 mt-1">{labourPercentage}% of total</p>
                </div>
            </div>

            {/* Pie chart */}
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderLabel}
                        outerRadius={100}
                        innerRadius={60}
                        dataKey="value"
                        paddingAngle={2}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        formatter={(value) => (
                            <span className="text-sm font-medium text-gray-700">{value}</span>
                        )}
                    />
                </PieChart>
            </ResponsiveContainer>

            {/* Total in center (for mobile/fallback) */}
            <div className="text-center mt-4">
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
            </div>
        </div>
    );
};

export default PartLabourBreakdown;
