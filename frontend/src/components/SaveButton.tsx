import React from 'react';
import { Check, Loader2, X } from 'lucide-react';

interface SaveButtonProps {
    cellId: string;
    onSave: () => void;
    onCancel?: () => void;
    isSaving: boolean;
    isSaved: boolean;
    error: string | null;
}

const SaveButton: React.FC<SaveButtonProps> = ({ cellId, onSave, onCancel, isSaving, isSaved, error }) => {
    if (isSaved) {
        return (
            <div className="flex items-center gap-1 ml-2 text-green-600 animate-fade-in">
                <Check size={16} />
                <span className="text-xs">Saved</span>
            </div>
        );
    }

    if (isSaving) {
        return (
            <div className="flex items-center gap-1 ml-2 text-blue-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-xs">Saving...</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-1 ml-2">
            <button
                onClick={onSave}
                className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                title="Save changes"
            >
                Save
            </button>
            {onCancel && (
                <button
                    onClick={onCancel}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 transition-colors"
                    title="Cancel"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );
};

export default SaveButton;
