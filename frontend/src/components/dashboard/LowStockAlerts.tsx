import React from 'react';
import { AlertCircle, Package } from 'lucide-react';
import { formatCurrency, formatNumber, getStockStatusColor } from '../../utils/dashboardHelpers';
import type { StockAlert } from '../../services/dashboardAPI';

interface LowStockAlertsProps {
    alerts: StockAlert[];
    isLoading?: boolean;
    limit?: number;
}

const LowStockAlerts: React.FC<LowStockAlertsProps> = ({
    alerts,
    isLoading = false,
    limit = 10,
}) => {
    if (isLoading) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="text-orange-600" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
                </div>
                <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="animate-pulse flex gap-4">
                            <div className="h-12 bg-gray-200 rounded flex-1"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!alerts || alerts.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="text-orange-600" size={20} />
                    <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
                </div>
                <div className="text-center py-8 text-gray-500">
                    <Package size={48} className="mx-auto mb-3 opacity-50" />
                    <p className="font-medium">All stock levels healthy!</p>
                    <p className="text-sm mt-1">No items below reorder point</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="text-orange-600" size={20} />
                        <h3 className="text-lg font-semibold text-gray-900">Low Stock Alerts</h3>
                    </div>
                    <span className="text-sm text-gray-600">
                        {alerts.length} item{alerts.length !== 1 ? 's' : ''} need attention
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Item
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Part Number
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Current Stock
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Reorder At
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Stock Value
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
                                Status
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {alerts.slice(0, limit).map((alert, index) => (
                            <tr
                                key={index}
                                className="hover:bg-gray-50 transition-colors"
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{alert.item_name}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-600">{alert.part_number}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div
                                        className={`text-sm font-semibold ${alert.current_stock <= 0 ? 'text-red-600' : 'text-yellow-600'
                                            }`}
                                    >
                                        {formatNumber(alert.current_stock, 2)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="text-sm text-gray-600">
                                        {formatNumber(alert.reorder_point, 2)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                    <div className="text-sm font-medium text-gray-900">
                                        {formatCurrency(alert.stock_value)}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                    <span
                                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStockStatusColor(
                                            alert.current_stock,
                                            alert.reorder_point
                                        )}`}
                                    >
                                        {alert.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {alerts.length > limit && (
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 text-center">
                    <p className="text-sm text-gray-600">
                        Showing {limit} of {alerts.length} alerts
                    </p>
                </div>
            )}
        </div>
    );
};

export default LowStockAlerts;
