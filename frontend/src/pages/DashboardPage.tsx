import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    AlertTriangle,
    ClipboardList,
    RefreshCw,
    ChevronDown,
    X,
} from 'lucide-react';
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { format, subDays, startOfMonth } from 'date-fns';
import { dashboardAPI } from '../services/dashboardAPI';
import AutocompleteInput from '../components/dashboard/AutocompleteInput';
import InventoryCommandCenter from '../components/dashboard/InventoryCommandCenter';

const DashboardPage: React.FC = () => {
    const { user } = useAuth();

    // State for filters
    const [dateRange, setDateRange] = useState<{ start: string; end: string }>(() => {
        const now = new Date();
        const start = subDays(now, 90); // Last 90 days by default
        return {
            start: format(start, 'yyyy-MM-dd'),
            end: format(now, 'yyyy-MM-dd'),
        };
    });
    const [selectedPreset, setSelectedPreset] = useState<string>('quarter');

    // Advanced filter state
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [customerFilter, setCustomerFilter] = useState('');
    const [vehicleFilter, setVehicleFilter] = useState('');
    const [partNumberFilter, setPartNumberFilter] = useState('');

    // Fetch KPIs
    const { data: kpis, refetch: refetchKPIs } = useQuery({
        queryKey: ['dashboardKPIs', dateRange, customerFilter, vehicleFilter, partNumberFilter],
        queryFn: () =>
            dashboardAPI.getKPIs(
                dateRange.start,
                dateRange.end,
                customerFilter || undefined,
                vehicleFilter || undefined,
                partNumberFilter || undefined
            ),
        staleTime: 30000,
    });

    // Fetch daily sales volume
    const { data: dailySales, isLoading: salesLoading } = useQuery({
        queryKey: ['dailySalesVolume', dateRange, customerFilter, vehicleFilter, partNumberFilter],
        queryFn: () =>
            dashboardAPI.getDailySalesVolume(
                dateRange.start,
                dateRange.end,
                customerFilter || undefined,
                vehicleFilter || undefined,
                partNumberFilter || undefined
            ),
        staleTime: 30000,
    });

    // Fetch revenue summary for pie chart
    const { data: revenueSummary } = useQuery({
        queryKey: ['revenueSummary', dateRange],
        queryFn: () => dashboardAPI.getRevenueSummary(dateRange.start, dateRange.end),
        staleTime: 30000,
    });

    // Handle refresh
    const handleRefresh = () => {
        refetchKPIs();
    };

    // Handle date range presets
    const setDatePreset = (preset: 'today' | 'week' | 'month' | 'quarter' | 'all') => {
        const now = new Date();
        let start: Date;

        switch (preset) {
            case 'today':
                start = now;
                break;
            case 'week':
                start = subDays(now, 7);
                break;
            case 'month':
                start = startOfMonth(now);
                break;
            case 'quarter':
                start = subDays(now, 90);
                break;
            case 'all':
                // Set a very old start date to get all data
                start = new Date('2000-01-01');
                break;
        }

        setDateRange({
            start: format(start, 'yyyy-MM-dd'),
            end: format(now, 'yyyy-MM-dd'),
        });
        setSelectedPreset(preset);
    };

    // Clear all advanced filters
    const clearAllFilters = () => {
        setCustomerFilter('');
        setVehicleFilter('');
        setPartNumberFilter('');
    };

    // Check if any filters are active
    const hasActiveFilters = customerFilter || vehicleFilter || partNumberFilter;

    // Format currency with k/L notation
    const formatCurrency = (value: number) =>
        `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    const formatCurrencyCompact = (value: number): string => {
        if (value >= 10000000) {
            // 1 Crore+
            return `₹${(value / 10000000).toFixed(2)}Cr`;
        } else if (value >= 100000) {
            // 1 Lakh+
            return `₹${(value / 100000).toFixed(2)}L`;
        } else if (value >= 1000) {
            // 1 Thousand+
            return `₹${(value / 1000).toFixed(1)}k`;
        }
        return formatCurrency(value);
    };

    // Format number
    const formatNumber = (value: number) => Math.round(value).toLocaleString('en-IN');

    // KPI Card Component - Premium Design
    const KPICard: React.FC<{
        title: string;
        value: string;
        change: number;
        icon: React.ElementType;
        bgColor: string;
        iconColor: string;
    }> = ({ title, value, change, icon: Icon, bgColor, iconColor }) => {
        const isPositive = change >= 0;

        return (
            <div className={`${bgColor} rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 relative overflow-hidden group`}>
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent pointer-events-none"></div>

                <div className="relative z-10">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${iconColor} shadow-md group-hover:scale-110 transition-transform duration-300`}>
                            <Icon size={24} className="text-white" />
                        </div>
                        <div className={`flex items-center gap-1 text-sm font-semibold px-2.5 py-1 rounded-full ${isPositive ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                            {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            {Math.abs(change).toFixed(1)}%
                        </div>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</h3>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        );
    };

    // Prepare pie chart data with external labels
    const pieData = useMemo(() => {
        if (!revenueSummary) return [];
        return [
            { name: 'Parts Sales', value: revenueSummary.part_revenue, color: '#6366F1' },
            { name: 'Service/Labour', value: revenueSummary.labour_revenue, color: '#F59E0B' },
        ].filter((item) => item.value > 0);
    }, [revenueSummary]);

    // Custom label for pie chart (external) with percentages
    const renderLabel = (entry: any) => {
        const total = pieData.reduce((sum, item) => sum + item.value, 0);
        const percentage = total > 0 ? ((entry.value / total) * 100).toFixed(1) : '0';
        return `${entry.name}: ${formatCurrencyCompact(entry.value)} (${percentage}%)`;
    };



    // Calculate pending actions count
    const pendingActions = 0; // You can replace this with actual logic

    // Calculate inventory alerts (placeholder for now)
    const inventoryAlerts = 0;

    return (
        <div className="space-y-6 pb-8">

            {/* Filter Controls */}
            <div className="space-y-4">
                {/* Date Filter Buttons & Advanced Filters */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Date Range Buttons */}
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                        <button
                            onClick={() => setDatePreset('today')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${selectedPreset === 'today'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            Today
                        </button>
                        <button
                            onClick={() => setDatePreset('week')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${selectedPreset === 'week'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            This Week
                        </button>
                        <button
                            onClick={() => setDatePreset('month')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${selectedPreset === 'month'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setDatePreset('quarter')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${selectedPreset === 'quarter'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            Last 90 Days
                        </button>
                        <button
                            onClick={() => setDatePreset('all')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition ${selectedPreset === 'all'
                                ? 'bg-indigo-600 text-white'
                                : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            ALL
                        </button>
                    </div>

                    {/* Advanced Filters Toggle */}
                    <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition"
                    >
                        <span className="text-sm font-medium">Advanced Filters</span>
                        <ChevronDown
                            size={18}
                            className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
                        />
                        {hasActiveFilters && (
                            <span className="ml-1 bg-indigo-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                                {[customerFilter, vehicleFilter, partNumberFilter].filter(Boolean).length}
                            </span>
                        )}
                    </button>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition ml-auto"
                    >
                        <RefreshCw size={18} />
                        <span className="text-sm font-medium">Refresh</span>
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                {showAdvancedFilters && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <AutocompleteInput
                                value={customerFilter}
                                onChange={setCustomerFilter}
                                placeholder="Search customer..."
                                label="Customer Name"
                                getSuggestions={dashboardAPI.getCustomerSuggestions}
                            />
                            <AutocompleteInput
                                value={vehicleFilter}
                                onChange={setVehicleFilter}
                                placeholder="Search vehicle..."
                                label="Vehicle Number"
                                getSuggestions={dashboardAPI.getVehicleSuggestions}
                            />
                            <AutocompleteInput
                                value={partNumberFilter}
                                onChange={setPartNumberFilter}
                                placeholder="Search customer item..."
                                label="Customer Item"
                                getSuggestions={dashboardAPI.getPartSuggestions}
                            />
                        </div>

                        {/* Clear Filters Button */}
                        {hasActiveFilters && (
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={clearAllFilters}
                                    className="text-sm text-gray-600 hover:text-gray-800 font-medium"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Active Filter Badges */}
                {hasActiveFilters && (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Active Filters:</span>
                        {customerFilter && (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full">
                                Customer: {customerFilter}
                                <button
                                    onClick={() => setCustomerFilter('')}
                                    className="hover:bg-indigo-200 rounded-full p-0.5"
                                >
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                        {vehicleFilter && (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full">
                                Vehicle: {vehicleFilter}
                                <button
                                    onClick={() => setVehicleFilter('')}
                                    className="hover:bg-indigo-200 rounded-full p-0.5"
                                >
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                        {partNumberFilter && (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 text-sm px-3 py-1 rounded-full">
                                Customer Item: {partNumberFilter}
                                <button
                                    onClick={() => setPartNumberFilter('')}
                                    className="hover:bg-indigo-200 rounded-full p-0.5"
                                >
                                    <X size={14} />
                                </button>
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* TOP ROW: KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Revenue"
                    value={kpis ? formatCurrency((kpis as any).total_revenue?.current_value || 0) : formatCurrency(0)}
                    change={(kpis as any)?.total_revenue?.change_percent || 0}
                    icon={DollarSign}
                    bgColor="bg-white"
                    iconColor="bg-indigo-600"
                />
                <KPICard
                    title="Avg Job Value"
                    value={kpis ? formatCurrency((kpis as any).avg_job_value?.current_value || 0) : formatCurrency(0)}
                    change={(kpis as any)?.avg_job_value?.change_percent || 0}
                    icon={TrendingUp}
                    bgColor="bg-white"
                    iconColor="bg-emerald-600"
                />
                <KPICard
                    title="Inventory Alerts"
                    value={inventoryAlerts.toString()}
                    change={0}
                    icon={AlertTriangle}
                    bgColor="bg-orange-50"
                    iconColor="bg-orange-500"
                />
                <KPICard
                    title="Pending Actions"
                    value={pendingActions.toString()}
                    change={0}
                    icon={ClipboardList}
                    bgColor="bg-red-50"
                    iconColor="bg-red-500"
                />
            </div>

            {/* MIDDLE ROW: Inventory Command Center */}
            <InventoryCommandCenter />

            {/* BOTTOM ROW: Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
                {/* Sales Trend Chart - Wider (takes 4/7 of space) */}
                <div className="lg:col-span-4 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
                    {salesLoading ? (
                        <div className="flex items-center justify-center h-80">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <ComposedChart data={dailySales || []}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                                />
                                <YAxis
                                    yAxisId="left"
                                    tick={{ fontSize: 12 }}
                                    tickFormatter={(value) => formatCurrencyCompact(value)}
                                />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    formatter={(value: any, name?: string) => {
                                        if (name === 'Revenue') return [formatCurrency(value), name];
                                        return [value, name || ''];
                                    }}
                                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                                />
                                <Legend />
                                <Bar yAxisId="left" dataKey="revenue" fill="#6366F1" name="Revenue" radius={[4, 4, 0, 0]} />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="volume"
                                    stroke="#F59E0B"
                                    strokeWidth={2}
                                    name="Invoice Count"
                                    dot={{ r: 4 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Revenue Mix Chart - Narrower (takes 3/7 of space) */}
                <div className="lg:col-span-3 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Mix</h3>
                    {pieData.length === 0 ? (
                        <div className="flex items-center justify-center h-80 text-gray-500">
                            <p>No revenue data for selected period</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={320}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine
                                    label={renderLabel}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: any) => formatCurrency(value)} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
