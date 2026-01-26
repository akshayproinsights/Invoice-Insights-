/**
 * Purchase Order API client
 * Handles draft PO management and PO generation with PDF export
 */
import apiClient from '../lib/api';

export interface DraftPOItem {
    id?: string;
    part_number: string;
    item_name: string;
    current_stock: number;
    reorder_point: number;
    reorder_qty: number;
    unit_value?: number;
    estimated_cost?: number;
    priority?: string;
    supplier_name?: string;
    notes?: string;
    added_at?: string;
    updated_at?: string;
}

export interface DraftPOSummary {
    total_items: number;
    total_estimated_cost: number;
}

export interface DraftPOResponse {
    success: boolean;
    items: DraftPOItem[];
    summary: DraftPOSummary;
}

export interface PurchaseOrder {
    id: string;
    po_number: string;
    po_date: string;
    supplier_name?: string;
    total_items: number;
    total_estimated_cost: number;
    status: string;
    notes?: string;
    pdf_file_path?: string;
    created_at: string;
    updated_at: string;
}

export interface ProceedToPORequest {
    supplier_name?: string;
    notes?: string;
    delivery_date?: string;
}

export interface ProceedToPOResponse {
    success: boolean;
    po_number: string;
    po_id: string;
    total_items: number;
    total_cost: number;
    pdf_blob: Blob;
}

export const purchaseOrderAPI = {
    /**
     * Get all draft PO items
     */
    getDraftItems: async (): Promise<DraftPOResponse> => {
        const response = await apiClient.get('/api/purchase-orders/draft/items');
        return response.data;
    },

    /**
     * Add item to draft PO
     */
    addDraftItem: async (item: Omit<DraftPOItem, 'id' | 'estimated_cost' | 'added_at' | 'updated_at'>): Promise<{
        success: boolean;
        item: DraftPOItem;
        message: string;
    }> => {
        const response = await apiClient.post('/api/purchase-orders/draft/items', item);
        return response.data;
    },

    /**
     * Quick add item from stock levels using part number
     */
    quickAddToDraft: async (partNumber: string): Promise<{
        success: boolean;
        item: DraftPOItem;
        message: string;
    }> => {
        const response = await apiClient.post(`/api/purchase-orders/quick-add/${partNumber}`);
        return response.data;
    },

    /**
     * Update quantity for draft PO item
     */
    updateDraftQuantity: async (partNumber: string, quantity: number): Promise<{
        success: boolean;
        item: DraftPOItem;
        message: string;
    }> => {
        const response = await apiClient.put(
            `/api/purchase-orders/draft/items/${partNumber}/quantity`,
            { reorder_qty: quantity }
        );
        return response.data;
    },

    /**
     * Remove item from draft PO
     */
    removeDraftItem: async (partNumber: string): Promise<{
        success: boolean;
        message: string;
    }> => {
        const response = await apiClient.delete(`/api/purchase-orders/draft/items/${partNumber}`);
        return response.data;
    },

    /**
     * Clear entire draft PO
     */
    clearDraft: async (): Promise<{
        success: boolean;
        message: string;
        deleted_count: number;
    }> => {
        const response = await apiClient.delete('/api/purchase-orders/draft/clear');
        return response.data;
    },

    /**
     * Proceed to create final PO with PDF generation
     */
    proceedToPO: async (request: ProceedToPORequest): Promise<{
        success: boolean;
        po_number: string;
        po_id: string;
        total_items: number;
        total_cost: number;
        pdf_blob: Blob;
    }> => {
        const response = await apiClient.post('/api/purchase-orders/draft/proceed', request, {
            responseType: 'blob' // Get PDF as blob directly
        });
        
        // Extract metadata from response headers
        const poNumber = response.headers['x-po-number'] || 'Unknown';
        const poId = response.headers['x-po-id'] || 'Unknown';
        const totalItems = parseInt(response.headers['x-total-items'] || '0');
        const totalCost = parseFloat(response.headers['x-total-cost'] || '0');
        
        return {
            success: true,
            po_number: poNumber,
            po_id: poId,
            total_items: totalItems,
            total_cost: totalCost,
            pdf_blob: response.data
        };
    },

    /**
     * Get purchase order history
     */
    getPurchaseOrders: async (
        limit: number = 50,
        offset: number = 0,
        statusFilter?: string
    ): Promise<{
        success: boolean;
        purchase_orders: PurchaseOrder[];
        count: number;
    }> => {
        const params = new URLSearchParams();
        params.append('limit', limit.toString());
        params.append('offset', offset.toString());
        if (statusFilter) params.append('status_filter', statusFilter);

        const response = await apiClient.get(`/api/purchase-orders/history?${params.toString()}`);
        return response.data;
    },

    /**
     * Download PDF for a specific purchase order
     */
    downloadPOPDF: async (poId: string): Promise<Blob> => {
        const response = await apiClient.get(`/api/purchase-orders/${poId}/pdf`, {
            responseType: 'blob'
        });
        return response.data;
    },

    /**
     * Download PDF and trigger browser download
     */
    downloadAndSavePDF: async (poId: string, filename?: string): Promise<void> => {
        try {
            const pdfBlob = await purchaseOrderAPI.downloadPOPDF(poId);
            
            // Create download link
            const url = window.URL.createObjectURL(pdfBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `PurchaseOrder_${poId}.pdf`;
            
            // Trigger download
            document.body.appendChild(link);
            link.click();
            
            // Cleanup
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading PDF:', error);
            throw new Error('Failed to download PDF');
        }
    },


};
