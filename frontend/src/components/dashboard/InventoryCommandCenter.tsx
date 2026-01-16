import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Search } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { dashboardAPI } from '../../services/dashboardAPI';

interface InventoryItem {
    part_number: string;
    item_name: string;
    current_stock: number;
    reorder_point: number;
    stock_value: number;
    priority?: string;
}

type PriorityTab = 'All Items' | 'P0 - High' | 'P1 - Medium' | 'P2 - Low' | 'P3 - Least';
type PriorityValue = '' | 'P0' | 'P1' | 'P2' | 'P3';

const InventoryCommandCenter: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<PriorityTab>('All Items');
    const [searchQuery, setSearchQuery] = useState('');

    // Map display tab names to API priority values
    const tabToPriority = (tab: PriorityTab): PriorityValue => {
        switch (tab) {
            case 'All Items': return '';
            case 'P0 - High': return 'P0';
            case 'P1 - Medium': return 'P1';
            case 'P2 - Low': return 'P2';
            case 'P3 - Least': return 'P3';
        }
    };

    // Fetch inventory data with React Query -AUTO-REFRESH enabled
    const { data: inventoryData, isLoading } = useQuery({
        queryKey: ['inventoryByPriority', tabToPriority(activeTab)],
        queryFn: () => dashboardAPI.getInventoryByPriority(tabToPriority(activeTab) || undefined),
        // AUTO-REFRESH CONFIGURATION:
        refetchOnWindowFocus: true,        // Refetch when user returns to the tab
        staleTime: 1000 * 60 * 5,          // Data is fresh for 5 minutes
        refetchInterval: 1000 * 60,        // Poll every 1 minute automatically
    });

    // Fetch search results when query is present
    const { data: searchData, isLoading: searchLoading } = useQuery({
        queryKey: ['inventorySearch', searchQuery],
        queryFn: () => dashboardAPI.searchInventory(searchQuery, 100),
        enabled: searchQuery.trim().length > 0, // Only run when there's a search query
        staleTime: 1000 * 30, // 30 seconds
    });

    const handleTabChange = (tab: PriorityTab) => {
        setActiveTab(tab);
        setSearchQuery(''); // Clear search when changing tabs
    };

    // Use search results if searching, otherwise use priority-filtered items
    const criticalItems: InventoryItem[] = useMemo(() => {
        if (searchQuery.trim() && searchData?.items) {
            return searchData.items.map(item => ({
                part_number: item.part_number,
                item_name: item.item_name,
                current_stock: item.current_stock,
                reorder_point: item.reorder_point,
                stock_value: item.current_stock * 100,
                priority: item.priority,
            }));
        }

        return inventoryData?.critical_items?.map(item => ({
            part_number: item.part_number,
            item_name: item.item_name,
            current_stock: item.current_stock,
            reorder_point: item.reorder_point,
            stock_value: item.current_stock * 100,
            priority: item.priority,
        })) || [];
    }, [searchQuery, searchData, inventoryData]);

    // Calculate stock health for donut chart
    // Stock Health Data for Donut Chart - 4 Categories
    const stockHealthData = [
        {
            name: 'Missing Purchase Entry',
            value: inventoryData?.summary?.missing_purchase_items || 0,
            color: '#8b5cf6', // purple/indigo
        },
        {
            name: 'Out of Stock',
            value: inventoryData?.summary?.critical_items || 0,
            color: '#ef4444', // red
        },
        {
            name: 'Low Stock',
            value: inventoryData?.summary?.low_items || 0,
            color: '#f59e0b', // orange
        },
        {
            name: 'Healthy',
            value: inventoryData?.summary?.healthy_items || 0,
            color: '#10b981', // green
        },
    ].filter(item => item.value > 0); // Only show segments with data

    const totalItems = inventoryData?.summary?.total_items || 0;

    const getStockStatus = (item: InventoryItem): { label: string; color: string } => {
        const stock = item.current_stock;
        if (stock < 0) return { label: 'Missing Purchase Entry', color: 'bg-purple-100 text-purple-800' };
        if (stock === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
        if (stock < item.reorder_point) return { label: 'Low Stock', color: 'bg-orange-100 text-orange-800' };
        return { label: 'Healthy', color: 'bg-green-100 text-green-800' };
    };

    const getStockPercentage = (item: InventoryItem): number => {
        if (item.current_stock < 0) return 0;
        if (item.reorder_point === 0) return 100;

        // Calculate percentage relative to reorder point
        // If stock is at or above reorder point, show 70-100%
        // If stock is below reorder point, show 0-70%
        const percentage = (item.current_stock / item.reorder_point) * 70;
        return Math.min(Math.max(percentage, 0), 100);
    };

    const tabs: PriorityTab[] = ['All Items', 'P0 - High', 'P1 - Medium', 'P2 - Low', 'P3 - Least'];

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header with Tabs */}
            <div className="border-b border-gray-200">
                <div className="px-6 pt-4">
                    <h2 className="text-lg font-semibold text-gray-900 mb-3">Inventory Command Center</h2>
                    <div className="flex gap-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => handleTabChange(tab)}
                                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition ${activeTab === tab
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 pt-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by item name or part number..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                    />
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                {(isLoading || searchLoading) ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Left Side: Items List */}
                        <div className="lg:col-span-3">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">
                                {searchQuery.trim()
                                    ? `Search Results for '${searchQuery}' (${searchData?.total_matches || 0} matches)`
                                    : `Top 20 ${activeTab} Items (Out of Stock & Low Stock)`
                                }
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                {criticalItems.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <AlertTriangle className="mx-auto mb-2" size={32} />
                                        <p>{searchQuery.trim() ? 'No items found matching your search.' : 'All items are in stock!'}</p>
                                    </div>
                                ) : (
                                    criticalItems.map((item, index) => {
                                        const status = getStockStatus(item);
                                        const stockPercent = getStockPercentage(item);

                                        return (
                                            <div
                                                key={index}
                                                className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    {/* Left: Item Info */}
                                                    <div className="flex-shrink-0" style={{ minWidth: '200px' }}>
                                                        <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                                                            {item.item_name}
                                                        </h4>
                                                        <p className="text-xs text-gray-500 mt-0.5">
                                                            Part#: {item.part_number}
                                                        </p>
                                                    </div>

                                                    {/* Middle: Stock Info + Progress Bar */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                                            <span>
                                                                Stock: {item.current_stock < 0 ? (
                                                                    <span className="text-red-600 font-semibold">
                                                                        {item.current_stock} units
                                                                    </span>
                                                                ) : (
                                                                    `${item.current_stock} units`
                                                                )}
                                                            </span>
                                                            <span className="text-gray-500">
                                                                Reorder: {item.reorder_point} units
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className={`h-2 rounded-full transition-all ${stockPercent < 30
                                                                    ? 'bg-red-500'
                                                                    : stockPercent < 70
                                                                        ? 'bg-orange-500'
                                                                        : 'bg-green-500'
                                                                    }`}
                                                                style={{ width: `${stockPercent}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>

                                                    {/* Right: Status Badge */}
                                                    <span
                                                        className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${status.color}`}
                                                    >
                                                        {status.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>

                        {/* Right Side: Stock Health Donut */}
                        <div className="lg:col-span-2 flex flex-col items-center justify-center">
                            <h3 className="text-sm font-semibold text-gray-700 mb-4">Stock Health Overview</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={stockHealthData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={95}
                                        fill="#8884d8"
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {stockHealthData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Legend
                                        verticalAlign="bottom"
                                        height={36}
                                        formatter={(value, entry: any) => (
                                            <span className="text-xs text-gray-700">
                                                {value}: {entry.payload.value}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="text-center mt-4">
                                <p className="text-2xl font-bold text-gray-900">
                                    {totalItems}
                                </p>
                                <p className="text-xs text-gray-600">Total Items</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer: Action Button */}
            <div className="border-t border-gray-200 px-6 py-4">
                <button
                    onClick={() => {
                        const priority = tabToPriority(activeTab);
                        navigate(priority ? `/inventory/stock?priority=${priority}` : '/inventory/stock');
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition font-medium"
                >
                    <span>
                        Go to Stock Register
                    </span>
                    <ChevronRight size={20} />
                </button>
            </div>
        </div>
    );
};

export default InventoryCommandCenter;
