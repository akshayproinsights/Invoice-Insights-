import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, ShoppingCart, FileText, Loader2, AlertCircle } from 'lucide-react';
import { purchaseOrderAPI, type DraftPOItem as APIDraftPOItem, type ProceedToPORequest } from '../../services/purchaseOrderAPI';

export interface DraftPOItem {
    part_number: string;
    item_name: string;
    current_stock: number;
    reorder_point: number;
    reorder_qty: number;
    unit_value?: number;
    addedAt: number; // Timestamp for sorting by most recently added
}

interface DraftPOManagerProps {
    draftItems: Map<string, DraftPOItem>;
    onRemoveItem: (partNumber: string) => void;
    onUpdateQty: (partNumber: string, qty: number) => void;
    onDraftUpdated?: () => void; // Callback to refresh parent component
}

const DraftPOManager: React.FC<DraftPOManagerProps> = ({
    draftItems,
    onRemoveItem,
    onUpdateQty,
    onDraftUpdated
}) => {
    const [apiDraftItems, setApiDraftItems] = useState<APIDraftPOItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showProceedModal, setShowProceedModal] = useState(false);

    // Load draft items from API on component mount
    const loadDraftItems = useCallback(async () => {
        try {
            console.log('🔄 FRONTEND CHECKPOINT F1: Loading draft items from API...');
            setLoading(true);
            setError(null);
            const response = await purchaseOrderAPI.getDraftItems();
            console.log('🔄 FRONTEND CHECKPOINT F2: API response:', response);
            setApiDraftItems(response.items);
            console.log('🔄 FRONTEND CHECKPOINT F3: Set API draft items:', response.items.length, 'items');
        } catch (err) {
            console.error('❌ FRONTEND CHECKPOINT F4: Error loading draft items:', err);
            setError('Failed to load draft items');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadDraftItems();
    }, [loadDraftItems]);

    // Sync with local state changes (add items from parent)
    useEffect(() => {
        const localItems = Array.from(draftItems.values());
        if (localItems.length > 0) {
            // Sync local items to API
            syncLocalToAPI();
        }
    }, [draftItems]);

    const syncLocalToAPI = async () => {
        try {
            const localItems = Array.from(draftItems.values());

            for (const item of localItems) {
                // Check if item already exists in API
                const existsInAPI = apiDraftItems.some(apiItem => apiItem.part_number === item.part_number);

                if (!existsInAPI) {
                    await purchaseOrderAPI.addDraftItem({
                        part_number: item.part_number,
                        item_name: item.item_name,
                        current_stock: item.current_stock,
                        reorder_point: item.reorder_point,
                        reorder_qty: item.reorder_qty,
                        unit_value: item.unit_value,
                        priority: "P2"
                    });
                }
            }

            // Refresh API items
            await loadDraftItems();
        } catch (err) {
            console.error('Error syncing local to API:', err);
        }
    };

    // Use API items if available, otherwise fall back to local state
    const displayItems = apiDraftItems.length > 0 ? apiDraftItems : Array.from(draftItems.values());
    const draftItemsArray = displayItems.sort((a, b) => {
        const aAny = a as any;
        const bAny = b as any;
        const aTime = aAny.added_at ? new Date(aAny.added_at).getTime() : aAny.addedAt || 0;
        const bTime = bAny.added_at ? new Date(bAny.added_at).getTime() : bAny.addedAt || 0;
        return bTime - aTime;
    });


    // Calculate totals
    const totalItems = draftItemsArray.length;
    const totalEstimatedCost = draftItemsArray.reduce((sum, item) => {
        const cost = (item.unit_value || 0) * item.reorder_qty;
        return sum + cost;
    }, 0);

    // Format currency
    const formatCurrency = (value: number): string => {
        return `₹${Math.round(value).toLocaleString('en-IN')}`;
    };

    // Handle remove item with API sync
    const handleRemoveItem = async (partNumber: string) => {
        try {
            // Remove from API first
            await purchaseOrderAPI.removeDraftItem(partNumber);

            // Then remove from local state
            onRemoveItem(partNumber);

            // Refresh API items
            await loadDraftItems();
            onDraftUpdated?.();
        } catch (err) {
            console.error('Error removing item:', err);
            setError('Failed to remove item');
        }
    };

    // Handle quantity update with API sync
    const handleUpdateQty = async (partNumber: string, qty: number) => {
        if (qty <= 0) return;

        try {
            // Update in API first
            await purchaseOrderAPI.updateDraftQuantity(partNumber, qty);

            // Then update local state
            onUpdateQty(partNumber, qty);

            // Refresh API items
            await loadDraftItems();
            onDraftUpdated?.();
        } catch (err) {
            console.error('Error updating quantity:', err);
            setError('Failed to update quantity');
        }
    };

    // Handle proceed to PO
    const handleProceedToPO = async (supplierName?: string, notes?: string) => {
        if (draftItemsArray.length === 0) {
            setError('No items in draft to process');
            return;
        }

        try {
            setProcessing(true);
            setError(null);

            const request: ProceedToPORequest = {
                supplier_name: supplierName,
                notes: notes
            };

            const response = await purchaseOrderAPI.proceedToPO(request);

            if (response.success && response.pdf_blob) {
                // Download the PDF
                const url = window.URL.createObjectURL(response.pdf_blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `PO_${response.po_number}.pdf`;

                document.body.appendChild(link);
                link.click();

                // Cleanup
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);

                // Clear local state
                draftItems.clear();
                onDraftUpdated?.();

                // Refresh API items (should be empty now)
                await loadDraftItems();

                setShowProceedModal(false);

                // Show success message
                alert(`✅ Purchase Order ${response.po_number} created successfully!\n\n` +
                    `Items: ${response.total_items}\n` +
                    `Total: ₹${response.total_cost.toLocaleString('en-IN')}\n\n` +
                    `PDF has been downloaded.`);
            }

        } catch (err) {
            console.error('Error proceeding to PO:', err);
            setError('Failed to create purchase order');
        } finally {
            setProcessing(false);
        }
    };

    // Clear all items
    const handleClearAll = async () => {
        if (window.confirm('Are you sure you want to clear all items from the draft?')) {
            try {
                await purchaseOrderAPI.clearDraft();
                draftItems.clear();
                onDraftUpdated?.();
                await loadDraftItems();
            } catch (err) {
                console.error('Error clearing draft:', err);
                setError('Failed to clear draft');
            }
        }
    };

    return (
        <div className="lg:col-span-6 bg-white rounded-lg shadow-sm border border-gray-200 h-[500px] flex flex-col overflow-hidden">
            {/* Professional Header with Actions */}
            <div className="flex-none p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Draft Purchase Order</h3>
                    {draftItemsArray.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="text-xs text-gray-500 hover:text-red-600 transition-colors"
                            title="Clear all items"
                        >
                            Clear All
                        </button>
                    )}
                </div>
                {error && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
                        <AlertCircle size={14} />
                        {error}
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <Loader2 size={24} className="animate-spin mb-2" />
                    <p>Loading draft items...</p>
                </div>
            ) :


                draftItemsArray.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-500 px-6">
                        <div className="bg-gray-100 rounded-full p-4 mb-4">
                            <ShoppingCart size={32} className="text-gray-400" />
                        </div>
                        <p className="text-center text-gray-600 font-medium">No items in draft</p>
                        <p className="text-center text-sm text-gray-500 mt-1">Add items from Quick Reorder List above</p>
                    </div>
                ) : (
                    <>
                        {/* Table Container - Flush Design (Edge-to-Edge) with Custom Scrollbar */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
                            <table className="w-full table-fixed">
                                {/* Fixed Column Widths - No Horizontal Scroll */}
                                <colgroup>
                                    <col style={{ width: '42%' }} />
                                    <col style={{ width: '18%' }} />
                                    <col style={{ width: '14%' }} />
                                    <col style={{ width: '16%' }} />
                                    <col style={{ width: '10%' }} />
                                </colgroup>
                                {/* Sticky Header with Proper Alignment */}
                                <thead className="sticky top-0 z-10 bg-gray-50">
                                    <tr className="border-b border-gray-200">
                                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Item</th>
                                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Stock</th>
                                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Qty</th>
                                        <th className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Cost</th>
                                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {draftItemsArray.map((item) => {
                                        const estimatedCost = (item.unit_value || 0) * item.reorder_qty;

                                        return (
                                            <tr
                                                key={item.part_number}
                                                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                            >
                                                {/* Column 1: Item Details - 42% width */}
                                                <td className="px-3 py-2 max-w-0 min-w-0">
                                                    <div className="overflow-hidden">
                                                        <h4
                                                            className="font-semibold text-gray-900 text-sm leading-tight truncate cursor-help"
                                                            title={item.item_name}
                                                        >
                                                            {item.item_name}
                                                        </h4>
                                                        <p
                                                            className="text-xs text-gray-500 mt-1 font-mono truncate cursor-help"
                                                            title={item.part_number}
                                                        >
                                                            {item.part_number}
                                                        </p>
                                                    </div>
                                                </td>

                                                {/* Column 2: Stock - 18% width, centered */}
                                                <td className="px-2 py-2 text-center">
                                                    <div className="text-sm tabular-nums">
                                                        <span className={`font-bold ${item.current_stock < item.reorder_point ? 'text-red-600' : 'text-gray-900'
                                                            }`}>
                                                            {item.current_stock}
                                                        </span>
                                                        <span className="text-gray-400 mx-1">/</span>
                                                        <span className="text-xs text-gray-500">
                                                            {item.reorder_point}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Column 3: Qty - 14% width, centered */}
                                                <td className="px-2 py-2 text-center">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={item.reorder_qty}
                                                        onChange={(e) => {
                                                            const newQty = parseInt(e.target.value) || 1;
                                                            handleUpdateQty(item.part_number, newQty);
                                                        }}
                                                        className="w-16 h-8 px-2 py-1 text-sm text-center font-medium border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none tabular-nums transition-all hover:border-gray-400"
                                                        disabled={loading}
                                                    />
                                                </td>

                                                {/* Column 4: Cost - 16% width, right-aligned */}
                                                <td className="px-2 py-2 text-right">
                                                    <span className="text-sm font-bold text-gray-900 tabular-nums">
                                                        {item.unit_value !== null && item.unit_value !== undefined
                                                            ? formatCurrency(estimatedCost)
                                                            : <span className="text-gray-400">₹--</span>}
                                                    </span>
                                                </td>

                                                {/* Column 5: Action - 10% width, centered */}
                                                <td className="px-2 py-2 text-center">
                                                    <button
                                                        onClick={() => handleRemoveItem(item.part_number)}
                                                        className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-all duration-200 disabled:opacity-50"
                                                        title="Remove from draft"
                                                        disabled={loading}
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Professional Checkout Footer - Anchored to bottom */}
                        <div className="flex-none mt-auto">
                            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-gray-50 to-white border-t-2 border-gray-200 rounded-b-lg">
                                {/* Left: Total Price */}
                                <div className="flex items-baseline gap-3">
                                    <span className="text-2xl font-bold text-gray-900 tabular-nums">
                                        {formatCurrency(totalEstimatedCost)}
                                    </span>
                                    <span className="text-sm text-gray-500 font-medium">
                                        Total: {totalItems} {totalItems === 1 ? 'item' : 'items'}
                                    </span>
                                </div>
                                {/* Right: Proceed Button */}
                                <button
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 active:scale-95 disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    onClick={() => setShowProceedModal(true)}
                                    disabled={processing || loading || draftItemsArray.length === 0}
                                >
                                    {processing ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            <span>Processing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileText size={16} />
                                            <span>Proceed</span>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </>
                )
            }


            {/* Proceed Modal */}
            {showProceedModal && (
                <ProceedModal
                    totalItems={totalItems}
                    totalCost={totalEstimatedCost}
                    onConfirm={handleProceedToPO}
                    onCancel={() => setShowProceedModal(false)}
                    processing={processing}
                />
            )}
        </div>
    );
};

// Proceed Modal Component
interface ProceedModalProps {
    totalItems: number;
    totalCost: number;
    onConfirm: (supplierName?: string, notes?: string) => void;
    onCancel: () => void;
    processing: boolean;
}

const ProceedModal: React.FC<ProceedModalProps> = ({
    totalItems,
    totalCost,
    onConfirm,
    onCancel,
    processing
}) => {
    const [supplierName, setSupplierName] = useState('');
    const [notes, setNotes] = useState('');

    const formatCurrency = (value: number): string => {
        return `₹${Math.round(value).toLocaleString('en-IN')}`;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Create Purchase Order</h3>
                </div>

                {/* Body */}
                <div className="px-6 py-4 space-y-4">
                    {/* Summary */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Total Items:</span>
                            <span className="font-semibold">{totalItems}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Estimated Cost:</span>
                            <span className="font-bold text-lg text-indigo-600">{formatCurrency(totalCost)}</span>
                        </div>
                    </div>

                    {/* Supplier Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Supplier Name (Optional)
                        </label>
                        <input
                            type="text"
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            placeholder="Enter supplier name..."
                            disabled={processing}
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none"
                            placeholder="Enter any notes for the purchase order..."
                            disabled={processing}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded-md transition-colors disabled:opacity-50"
                        disabled={processing}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(supplierName || undefined, notes || undefined)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={processing}
                    >
                        {processing ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                <span>Creating PO...</span>
                            </>
                        ) : (
                            <>
                                <FileText size={16} />
                                <span>Create & Download PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DraftPOManager;
