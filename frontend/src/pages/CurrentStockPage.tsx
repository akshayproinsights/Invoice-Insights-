import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search, TrendingUp, AlertTriangle, XCircle, RefreshCw, Plus, ExternalLink, X, Package, ChevronDown, FileDown, Upload, Edit } from 'lucide-react';
import {
    getStockLevels,
    getStockSummary,
    updateStockLevel,
    adjustStock,
    calculateStockLevels,
    getStockHistory,
    type StockLevel,
    type StockSummary,
    type StockTransaction,
} from '../services/stockApi';
import { mappingSheetAPI } from '../services/api';
import apiClient from '../lib/api';

interface VendorItem {
    id: number;
    description: string;
    part_number: string;
    qty?: number;
    rate?: number;
    match_score?: number;
}

const CurrentStockPage: React.FC = () => {
    // Get context from Layout to set header actions
    const { setHeaderActions } = useOutletContext<{ setHeaderActions: (actions: React.ReactNode) => void }>();

    const [stockItems, setStockItems] = useState<StockLevel[]>([]);
    const [summary, setSummary] = useState<StockSummary>({
        total_stock_value: 0,
        low_stock_items: 0,
        out_of_stock: 0,
        total_items: 0,
    });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [selectedPartHistory, setSelectedPartHistory] = useState<{ partNumber: string; itemName: string } | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // Edit mode state
    const [editingStockId, setEditingStockId] = useState<number | null>(null);

    // Mapping sheet upload state
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // Mapping-related state
    const [openDropdowns, setOpenDropdowns] = useState<{ [key: number]: boolean }>({});
    const [searchQueries, setSearchQueries] = useState<{ [key: number]: string }>({});
    const [suggestions, setSuggestions] = useState<{ [key: number]: VendorItem[] }>({});
    const [searchResults, setSearchResults] = useState<{ [key: number]: VendorItem[] }>({});
    const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});
    const [flashGreen, setFlashGreen] = useState<{ [key: number]: boolean }>({});
    const [localCustomerItems, setLocalCustomerItems] = useState<{ [key: number]: string }>({});

    const searchTimeoutRef = useRef<{ [key: number]: number }>({});
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setOpenDropdowns({});
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Set header actions (Upload and Export buttons)
    useEffect(() => {
        setHeaderActions(
            <div className="flex gap-2">
                {/* Upload Mapping Sheet Button */}
                <label
                    htmlFor="mapping-sheet-upload"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${isUploading
                        ? 'bg-blue-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                        } text-white`}
                >
                    <Upload size={16} className={isUploading ? 'animate-spin' : ''} />
                    {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload Mapping Sheet'}
                </label>
                <input
                    id="mapping-sheet-upload"
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleUploadMappingSheet}
                    disabled={isUploading}
                    className="hidden"
                />

                <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                    <FileDown size={16} />
                    Export Unmapped PDF
                </button>
            </div>
        );

        return () => setHeaderActions(null);
    }, [isUploading, uploadProgress, setHeaderActions]);

    // Load data
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [itemsData, summaryData] = await Promise.all([
                getStockLevels({ search: searchQuery, status_filter: statusFilter }),
                getStockSummary(),
            ]);

            // Sort items: Added (with customer_items) first, then Skipped/unmapped at bottom
            const sortedItems = [...itemsData.items].sort((a, b) => {
                const aHasCustomer = !!a.customer_items;
                const bHasCustomer = !!b.customer_items;

                if (aHasCustomer && !bHasCustomer) return -1;
                if (!aHasCustomer && bHasCustomer) return 1;

                // Within same group, sort alphabetically by customer item or internal name
                const aName = a.customer_items || a.internal_item_name || '';
                const bName = b.customer_items || b.internal_item_name || '';
                return aName.localeCompare(bName);
            });

            // Set default reorder_point to 2 if not set
            sortedItems.forEach(item => {
                if (item.reorder_point === 0 || item.reorder_point === null) {
                    item.reorder_point = 2;
                }
            });

            setStockItems(sortedItems);
            setSummary(summaryData);

            // Initialize local customer items state
            const localItems: { [key: number]: string } = {};
            sortedItems.forEach(item => {
                if (item.customer_items) {
                    localItems[item.id] = item.customer_items;
                }
            });
            setLocalCustomerItems(localItems);
        } catch (error) {
            console.error('Error loading stock data:', error);
        } finally {
            setLoading(false);
        }
    }, [searchQuery, statusFilter]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Auto-recalculate stock when page loads
    useEffect(() => {
        const autoRecalculate = async () => {
            try {
                await calculateStockLevels();
                // Silently recalculate - no need to alert user
                await loadData();
            } catch (error) {
                console.error('Auto-recalculation failed:', error);
            }
        };

        autoRecalculate();
    }, []); // Run only once on mount

    // Trigger stock calculation
    const handleCalculateStock = async () => {
        if (!confirm('Recalculate all stock levels from existing data? This may take a moment.')) {
            return;
        }

        try {
            setIsCalculating(true);
            await calculateStockLevels();
            await loadData();
            alert('Stock levels recalculated successfully!');
        } catch (error) {
            console.error('Error calculating stock:', error);
            alert('Failed to calculate stock levels');
        } finally {
            setIsCalculating(false);
        }
    };

    // === Simple Edit Pattern - Always Editable with Cell Locking ===
    const [savingFields, setSavingFields] = useState<{ [key: string]: boolean }>({});

    const handleFieldUpdate = async (id: number, field: 'reorder_point' | 'old_stock', value: number) => {
        const fieldKey = `${id}-${field}`;

        // Update local state immediately
        setStockItems(prev => prev.map(item =>
            item.id === id ? { ...item, [field]: value } : item
        ));

        // Lock the cell
        setSavingFields(prev => ({ ...prev, [fieldKey]: true }));

        try {
            const updates = { [field]: value };
            await updateStockLevel(id, updates);
        } catch (error) {
            console.error('Error updating stock level:', error);
            alert('Failed to save');
            // Revert on error
            await loadData();
        } finally {
            // Unlock the cell
            setSavingFields(prev => ({ ...prev, [fieldKey]: false }));
        }
    };

    // Load unique customer items for dropdown
    const loadSuggestions = async (itemId: number) => {
        if (suggestions[itemId] || loadingSuggestions[itemId]) return;

        setLoadingSuggestions(prev => ({ ...prev, [itemId]: true }));
        try {
            // Fetch unique customer items from verified invoices
            const response = await apiClient.get('/api/verified/unique-customer-items');
            const data = response.data;

            // Convert to VendorItem format for compatibility
            const customerItems = (data.customer_items || []).map((item: string, index: number) => ({
                id: index,
                description: item,
                part_number: '',
                match_score: 100
            }));

            setSuggestions(prev => ({
                ...prev,
                [itemId]: customerItems
            }));
        } catch (err) {
            console.error('Error loading customer items:', err);
        } finally {
            setLoadingSuggestions(prev => ({ ...prev, [itemId]: false }));
        }
    };

    // Handle search change with debounce - search customer items
    const handleSearchChange = (itemId: number, query: string) => {
        setSearchQueries(prev => ({ ...prev, [itemId]: query }));

        // Clear existing timeout
        if (searchTimeoutRef.current[itemId]) {
            clearTimeout(searchTimeoutRef.current[itemId]);
        }

        // Debounce search (150ms for faster response)
        searchTimeoutRef.current[itemId] = setTimeout(async () => {
            if (query.trim().length > 0) {
                try {
                    const response = await apiClient.get(`/api/verified/unique-customer-items?search=${encodeURIComponent(query)}`);
                    const data = response.data;

                    // Convert to VendorItem format
                    const customerItems = (data.customer_items || []).map((item: string, index: number) => ({
                        id: index,
                        description: item,
                        part_number: '',
                        match_score: 100
                    }));

                    setSearchResults(prev => ({ ...prev, [itemId]: customerItems }));
                } catch (err) {
                    console.error('Error searching customer items:', err);
                }
            } else {
                setSearchResults(prev => ({ ...prev, [itemId]: [] }));
            }
        }, 150);
    };

    // Handle selecting a vendor item
    const handleSelectVendorItem = async (item: StockLevel, vendorItem: VendorItem) => {
        try {
            // Create vendor mapping entry using bulk-save endpoint
            const response = await apiClient.post('/api/vendor-mapping/entries/bulk-save', {
                entries: [{
                    row_number: 1,
                    vendor_description: item.internal_item_name,
                    part_number: item.part_number,
                    customer_item_name: vendorItem.description,
                    status: 'Added'
                }]
            });

            if (response.status === 200) {
                // Close dropdown and clear search FIRST
                setOpenDropdowns(prev => ({ ...prev, [item.id]: false }));
                setSearchQueries(prev => ({ ...prev, [item.id]: '' }));
                setSearchResults(prev => ({ ...prev, [item.id]: [] }));

                // Then update local state
                setLocalCustomerItems(prev => ({
                    ...prev,
                    [item.id]: vendorItem.description
                }));

                // Flash green for 3 seconds
                setFlashGreen(prev => ({ ...prev, [item.id]: true }));
                setTimeout(() => {
                    setFlashGreen(prev => ({ ...prev, [item.id]: false }));
                }, 3000);

                // Reload data after a short delay to reflect changes
                setTimeout(() => loadData(), 500);
            } else {
                throw new Error('Failed to create mapping');
            }
        } catch (error) {
            console.error('Error creating vendor mapping:', error);
            alert('Failed to link customer item');
        }
    };

    // Handle clearing a customer item mapping
    const handleClearCustomerItem = async (item: StockLevel) => {
        if (!confirm('Clear this customer item mapping?')) {
            return;
        }

        try {
            // Delete from backend database FIRST
            await apiClient.delete(`/api/vendor-mapping/entries/by-part/${encodeURIComponent(item.part_number)}`);

            // Clear from local state immediately
            setLocalCustomerItems(prev => {
                const updated = { ...prev };
                delete updated[item.id];
                return updated;
            });

            // DON'T reload - keep item in place so user can immediately add new mapping
            // setTimeout(() => loadData(), 300);
        } catch (error) {
            console.error('Error clearing customer item:', error);
            alert('Failed to clear customer item');
        }
    };

    // Get dropdown options (suggestions or search results)
    const getDropdownOptions = (itemId: number): VendorItem[] => {
        const query = searchQueries[itemId] || '';
        if (query.trim().length > 0) {
            return searchResults[itemId] || [];
        }
        return suggestions[itemId]?.slice(0, 7) || [];
    };

    // Upload mapping sheet handler
    const handleUploadMappingSheet = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.includes('pdf') && !file.type.includes('image')) {
            alert('Please upload a PDF or image file');
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Simulate progress
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => Math.min(prev + 10, 90));
            }, 200);

            const response = await mappingSheetAPI.upload(file);

            clearInterval(progressInterval);
            setUploadProgress(100);

            // Show success message
            alert(
                `✅ ${response.message}\n\n` +
                `Extracted ${response.extracted_rows} rows\n` +
                `Status: ${response.status}`
            );

            // Refresh stock data to show merged items
            await loadData();

        } catch (error: any) {
            console.error('Upload error:', error);
            alert(
                `Failed to upload mapping sheet:\n${error.response?.data?.detail || error.message}`
            );
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            // Reset file input
            event.target.value = '';
        }
    };

    // Handle Export PDF (unmapped items only)
    const handleExportPDF = async () => {
        try {
            const response = await apiClient.get('/api/stock/export-unmapped-pdf', {
                params: {
                    search: searchQuery || undefined,
                    status_filter: statusFilter !== 'all' ? statusFilter : undefined,
                },
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `unmapped_stock_items_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF');
        }
    };

    // Status badge
    const getStatusBadge = (status: string) => {
        const colors = {
            'In Stock': 'bg-green-100 text-green-800',
            'Low Stock': 'bg-orange-100 text-orange-800',
            'Out of Stock': 'bg-red-100 text-red-800',
        };

        return (
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Stock Value</p>
                            <p className="text-3xl font-bold text-gray-900 mt-2">
                                ₹{summary.total_stock_value.toLocaleString('en-IN')}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <TrendingUp className="text-blue-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total Stock Items</p>
                            <p className="text-3xl font-bold text-blue-900 mt-2">
                                {stockItems.length}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <Package className="text-green-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Low Stock Items</p>
                            <p className="text-3xl font-bold text-orange-600 mt-2">
                                {summary.low_stock_items}
                            </p>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-lg">
                            <AlertTriangle className="text-orange-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Out of Stock</p>
                            <p className="text-3xl font-bold text-red-600 mt-2">
                                {summary.out_of_stock}
                            </p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                            <XCircle className="text-red-600" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search Item Name/Part #"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="all">Filter by Status (All)</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>

                    {/* Manual Adjustment Button */}
                    <button
                        onClick={() => setShowAdjustmentModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
                    >
                        <Plus size={16} />
                        Manual Stock Adjustment
                    </button>
                </div>
            </div>

            {/* Stock Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden" ref={dropdownRef}>
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading stock levels...</div>
                ) : stockItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No stock items found. Upload vendor invoices to populate stock levels.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase w-12">
                                        Edit
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                        Internal Item Name
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                        Part Number
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                        Customer Item
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                        Reorder Point
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                        Old Stock
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                        Stock On Hand
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                        Vendor Rate (IN)
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                        Total Value
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {stockItems.map((item) => {
                                    const hasCustomerItem = !!localCustomerItems[item.id];
                                    const isFlashing = flashGreen[item.id];
                                    const hasUploadedData = item.has_uploaded_data === true;

                                    const bgColor = isFlashing
                                        ? 'bg-green-50'
                                        : hasUploadedData
                                            ? 'bg-yellow-50 border-l-4 border-l-blue-500'
                                            : hasCustomerItem
                                                ? 'bg-green-50'
                                                : 'bg-white';

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`hover:bg-gray-50 ${bgColor} transition-colors`}
                                        >
                                            {/* Edit Icon Column */}
                                            <td className="px-4 py-2 text-sm text-center">
                                                <button
                                                    onClick={() => setEditingStockId(item.id)}
                                                    className="text-blue-600 hover:text-blue-800 transition cursor-pointer"
                                                    title="Click to edit"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                {item.internal_item_name}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                                                {item.part_number}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="relative flex-1">
                                                        <input
                                                            type="text"
                                                            value={localCustomerItems[item.id] || ''}
                                                            onFocus={() => {
                                                                setOpenDropdowns(prev => ({ ...prev, [item.id]: true }));
                                                                loadSuggestions(item.id);
                                                            }}
                                                            onChange={(e) => {
                                                                const value = e.target.value;
                                                                setLocalCustomerItems(prev => ({
                                                                    ...prev,
                                                                    [item.id]: value
                                                                }));
                                                                handleSearchChange(item.id, value);
                                                            }}
                                                            placeholder="Select or type customer item"
                                                            className={`w-full min-w-[220px] px-2 py-1 border rounded text-sm font-medium transition-colors ${bgColor} ${hasCustomerItem
                                                                ? 'border-green-300 text-green-700 pr-14'
                                                                : 'border-gray-300 text-gray-600 pr-7'  // Gray border for unmapped
                                                                }`}
                                                        />
                                                        {/* Clear button (X) for mapped items */}
                                                        {hasCustomerItem && (
                                                            <button
                                                                onClick={() => handleClearCustomerItem(item)}
                                                                className="absolute right-7 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 transition-colors"
                                                                type="button"
                                                                title="Clear customer item mapping"
                                                            >
                                                                <X size={16} className="stroke-[2.5]" />
                                                            </button>
                                                        )}
                                                        {/* Dropdown toggle */}
                                                        <button
                                                            onClick={() => setOpenDropdowns(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                                            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                            type="button"
                                                        >
                                                            <ChevronDown size={14} className={`transition-transform ${openDropdowns[item.id] ? 'rotate-180' : ''}`} />
                                                        </button>

                                                        {/* Dropdown */}
                                                        {openDropdowns[item.id] && (
                                                            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                                                                {loadingSuggestions[item.id] ? (
                                                                    <div className="p-4 text-center text-gray-500 text-sm">
                                                                        Loading suggestions...
                                                                    </div>
                                                                ) : getDropdownOptions(item.id).length === 0 ? (
                                                                    <div className="p-4 text-center text-gray-500 text-sm">
                                                                        No matches found. Type to search...
                                                                    </div>
                                                                ) : (
                                                                    getDropdownOptions(item.id).map((vendorItem) => (
                                                                        <button
                                                                            key={vendorItem.id}
                                                                            onClick={() => handleSelectVendorItem(item, vendorItem)}
                                                                            className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b last:border-b-0 transition"
                                                                        >
                                                                            <div className="flex justify-between items-start">
                                                                                <div className="flex-1">
                                                                                    <p className="font-medium text-gray-900 text-sm">{vendorItem.description}</p>
                                                                                    {vendorItem.part_number && (
                                                                                        <p className="text-xs text-gray-500 mt-1">Part: {vendorItem.part_number}</p>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </button>
                                                                    ))
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm min-w-[140px]">
                                                {getStatusBadge(item.status || 'In Stock')}
                                            </td>
                                            <td className="px-4 py-2 text-sm">
                                                {editingStockId === item.id ? (
                                                    <input
                                                        type="number"
                                                        value={item.reorder_point}
                                                        onChange={(e) =>
                                                            handleFieldUpdate(item.id, 'reorder_point', parseInt(e.target.value, 10) || 0)
                                                        }
                                                        disabled={savingFields[`${item.id}-reorder_point`]}
                                                        className="w-16 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-wait"
                                                        min="0"
                                                        step="1"
                                                    />
                                                ) : (
                                                    <span className="text-gray-900">{item.reorder_point}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-sm">
                                                {editingStockId === item.id ? (
                                                    <input
                                                        type="number"
                                                        value={item.old_stock ?? ''}
                                                        onChange={(e) =>
                                                            handleFieldUpdate(item.id, 'old_stock', e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0)
                                                        }
                                                        disabled={savingFields[`${item.id}-old_stock`]}
                                                        className="w-16 px-2 py-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-wait"
                                                        min="0"
                                                        step="1"
                                                    />
                                                ) : (
                                                    <span className="text-gray-900">{item.old_stock || 0}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-900">
                                                        {((item.current_stock || 0) + (item.old_stock || 0)).toFixed(2)}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {item.total_in.toFixed(2)} in | {item.total_out.toFixed(2)} out
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                ₹{item.vendor_rate?.toFixed(2) || '0.00'}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                ₹{item.total_value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-2 text-sm">
                                                <button
                                                    className="text-blue-600 hover:text-blue-800 hover:underline"
                                                    onClick={() => {
                                                        setSelectedPartHistory({
                                                            partNumber: item.part_number,
                                                            itemName: item.internal_item_name
                                                        });
                                                        setShowHistoryModal(true);
                                                    }}
                                                >
                                                    View History
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Manual Adjustment Modal */}
            {showAdjustmentModal && (
                <ManualAdjustmentModal
                    stockItems={stockItems}
                    onClose={() => setShowAdjustmentModal(false)}
                    onSuccess={() => {
                        setShowAdjustmentModal(false);
                        loadData();
                    }}
                />
            )}

            {/* Transaction History Modal */}
            {showHistoryModal && selectedPartHistory && (
                <TransactionHistoryModal
                    partNumber={selectedPartHistory.partNumber}
                    itemName={selectedPartHistory.itemName}
                    onClose={() => {
                        setShowHistoryModal(false);
                        setSelectedPartHistory(null);
                    }}
                />
            )}

            {/* Floating Recalculate Button - Bottom Right */}
            <button
                onClick={handleCalculateStock}
                disabled={isCalculating}
                className="fixed bottom-6 right-6 flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group z-40"
                title="Recalculate all stock levels from verified invoices"
            >
                <RefreshCw
                    size={24}
                    className={`${isCalculating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}
                />
                <div className="flex flex-col items-start">
                    <span className="font-semibold text-sm">
                        {isCalculating ? 'Recalculating...' : 'Recalculate Stock'}
                    </span>
                    <span className="text-xs text-blue-100">
                        {isCalculating ? 'Please wait' : 'Click to refresh'}
                    </span>
                </div>
            </button>
        </div>
    );
};

// Manual Adjustment Modal Component
interface ManualAdjustmentModalProps {
    stockItems: StockLevel[];
    onClose: () => void;
    onSuccess: () => void;
}

const ManualAdjustmentModal: React.FC<ManualAdjustmentModalProps> = ({ stockItems, onClose, onSuccess }) => {
    const [selectedPart, setSelectedPart] = useState('');
    const [adjustmentType, setAdjustmentType] = useState<'add' | 'subtract' | 'set_absolute'>('add');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedPart || !quantity) {
            alert('Please fill in all required fields');
            return;
        }

        const qty = parseFloat(quantity);
        if (isNaN(qty) || qty < 0) {
            alert('Quantity must be a positive number');
            return;
        }

        try {
            setLoading(true);
            const result = await adjustStock({
                part_number: selectedPart,
                adjustment_type: adjustmentType,
                quantity: qty,
                reason: reason || undefined,
            });

            alert(
                `Stock adjusted successfully!\n` +
                `Previous: ${result.previous_stock}\n` +
                `New: ${result.new_stock}`
            );
            onSuccess();
        } catch (error: any) {
            console.error('Error adjusting stock:', error);
            alert(error.response?.data?.detail || 'Failed to adjust stock');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Manual Stock Adjustment</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Part Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Select Part <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={selectedPart}
                            onChange={(e) => setSelectedPart(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            <option value="">-- Select Part --</option>
                            {stockItems.map((item) => (
                                <option key={item.id} value={item.part_number}>
                                    {item.part_number} - {item.internal_item_name} (Stock: {item.current_stock})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Adjustment Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Adjustment Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={adjustmentType}
                            onChange={(e) => setAdjustmentType(e.target.value as any)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="add">Add to Stock</option>
                            <option value="subtract">Subtract from Stock</option>
                            <option value="set_absolute">Set Absolute Value</option>
                        </select>
                    </div>

                    {/* Quantity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    {/* Reason */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Reason (Optional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={3}
                            placeholder="e.g., Physical count correction, Damage, Return"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            disabled={loading}
                        >
                            {loading ? 'Adjusting...' : 'Confirm Adjustment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// Transaction History Modal Component
interface TransactionHistoryModalProps {
    partNumber: string;
    itemName: string;
    onClose: () => void;
}

const TransactionHistoryModal: React.FC<TransactionHistoryModalProps> = ({ partNumber, itemName, onClose }) => {
    const [transactions, setTransactions] = useState<StockTransaction[]>([]);
    const [summary, setSummary] = useState({ total_in: 0, total_out: 0, transaction_count: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHistory = async () => {
            try {
                setLoading(true);
                const data = await getStockHistory(partNumber);
                setTransactions(data.transactions);
                setSummary(data.summary);
            } catch (error) {
                console.error('Error loading transaction history:', error);
                alert('Failed to load transaction history');
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
    }, [partNumber]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Transaction History</h2>
                        <p className="text-gray-600 mt-1">
                            {itemName} <span className="text-gray-400">({partNumber})</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-gray-500" />
                    </button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4 p-6 border-b border-gray-200 bg-gray-50">
                    <div className="text-center">
                        <p className="text-sm text-gray-600">Total IN</p>
                        <p className="text-2xl font-bold text-green-600">{summary.total_in.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600">Total OUT</p>
                        <p className="text-2xl font-bold text-red-600">{summary.total_out.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-600">Transactions</p>
                        <p className="text-2xl font-bold text-gray-900">{summary.transaction_count}</p>
                    </div>
                </div>

                {/* Transactions Table */}
                <div className="flex-1 overflow-auto p-6">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading transaction history...</div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">No transactions found</div>
                    ) : (
                        <table className="w-full">
                            <thead className="bg-gray-50 border-y border-gray-200 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Invoice #</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">Description</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Qty</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Rate</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase">Amount</th>
                                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-600 uppercase">Receipt</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {transactions.map((txn, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${txn.type === 'IN'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-red-100 text-red-800'
                                                }`}>
                                                {txn.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700">
                                            {txn.date || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                                            {txn.invoice_number || 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">
                                            {txn.description}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                            {txn.quantity.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-700">
                                            {txn.rate ? `₹${txn.rate.toFixed(2)}` : 'N/A'}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                            ₹{txn.amount.toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-center">
                                            {txn.receipt_link ? (
                                                <a
                                                    href={txn.receipt_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline"
                                                >
                                                    View
                                                    <ExternalLink size={14} />
                                                </a>
                                            ) : (
                                                <span className="text-gray-400">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CurrentStockPage;
