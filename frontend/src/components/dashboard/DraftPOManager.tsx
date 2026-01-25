import React from 'react';
import { Trash2, ShoppingCart } from 'lucide-react';

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
}

const DraftPOManager: React.FC<DraftPOManagerProps> = ({
    draftItems,
    onRemoveItem,
    onUpdateQty,
}) => {
    // Convert Map to array for rendering and sort by most recently added (newest first)
    const draftItemsArray = Array.from(draftItems.values()).sort((a, b) => b.addedAt - a.addedAt);

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

    return (
        <div className="lg:col-span-6 bg-white rounded-lg shadow-sm border border-gray-200 h-[500px] flex flex-col overflow-hidden">
            {/* Professional Header - Static, Clean */}
            <div className="flex-none p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Draft Purchase Order</h3>
            </div>

            {draftItemsArray.length === 0 ? (
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
                        <style dangerouslySetInnerHTML={{
                            __html: `
                                .custom-scrollbar::-webkit-scrollbar {
                                    width: 4px;
                                }
                                .custom-scrollbar::-webkit-scrollbar-track {
                                    background: transparent;
                                }
                                .custom-scrollbar::-webkit-scrollbar-thumb {
                                    background: #d1d5db;
                                    border-radius: 9999px;
                                }
                                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                                    background: #9ca3af;
                                }
                            `
                        }} />
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
                                                        onUpdateQty(item.part_number, newQty);
                                                    }}
                                                    className="w-16 h-8 px-2 py-1 text-sm text-center font-medium border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none tabular-nums transition-all hover:border-gray-400"
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
                                                    onClick={() => onRemoveItem(item.part_number)}
                                                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-all duration-200"
                                                    title="Remove from draft"
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
                                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all duration-200 active:scale-95"
                                onClick={() => {
                                    // TODO: Implement proceed to PO creation
                                    alert('PO creation coming soon!');
                                }}
                            >
                                <span>Proceed</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default DraftPOManager;
