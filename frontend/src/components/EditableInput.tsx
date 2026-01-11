import React, { useState, useRef, useEffect } from 'react';
import { Save } from 'lucide-react';

interface EditableInputProps {
    value: string;
    cellId: string;
    isEditing: boolean;
    isSaving: boolean;
    isSaved: boolean;
    error: string | null;
    onEdit: () => void;
    onSave: (value: string) => void;
    onCancel: () => void;
    type?: 'text' | 'date' | 'number';
    className?: string;
    placeholder?: string;
}

const EditableInput: React.FC<EditableInputProps> = ({
    value,
    cellId,
    isEditing,
    isSaving,
    isSaved,
    error,
    onEdit,
    onSave,
    onCancel,
    type = 'text',
    className = '',
    placeholder = ''
}) => {
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<number | null>(null);

    // Update local value when prop value changes
    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    // Focus input when editing starts
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isEditing]);

    const handleClick = () => {
        if (!isEditing) {
            onEdit();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Set new timeout for 3-second debounce
        saveTimeoutRef.current = setTimeout(() => {
            onSave(e.target.value);
        }, 3000);
    };

    const handleBlur = () => {
        // Clear timeout if it exists
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Trigger save on blur
        if (isEditing && localValue !== value) {
            onSave(localValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            onSave(localValue);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setLocalValue(value);
            onCancel();
        }
    };

    const handleManualSave = () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        onSave(localValue);
    };

    // Determine border class based on state
    const getBorderClass = () => {
        if (error) return 'border-2 border-red-500 focus:border-red-600 focus:ring-2 focus:ring-red-200';
        if (isSaved) return 'border-2 border-green-500 focus:border-green-600 focus:ring-2 focus:ring-green-200';
        if (isSaving) return 'border-2 border-blue-500 focus:border-blue-600 focus:ring-2 focus:ring-blue-200';
        if (isEditing) return 'border-2 border-yellow-400 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200';
        return 'border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
    };

    // Determine status badge
    const getStatusBadge = () => {
        if (error) return <span className="text-xs font-medium text-red-600">❌ Error</span>;
        if (isSaved) return <span className="text-xs font-medium text-green-600">✓ Saved</span>;
        if (isSaving) return <span className="text-xs font-medium text-blue-600">💾 Saving...</span>;
        if (isEditing && localValue !== value) return <span className="text-xs font-medium text-yellow-600">✏️ Editing...</span>;
        return null;
    };

    return (
        <div className="relative">
            <div className="flex items-center gap-2">
                <input
                    ref={inputRef}
                    id={cellId}
                    type={type}
                    value={localValue}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    onFocus={handleClick}
                    onKeyDown={handleKeyDown}
                    className={`rounded px-3 py-2 transition-all ${getBorderClass()} ${className}`}
                    placeholder={placeholder}
                    disabled={isSaving}
                />
                {getStatusBadge()}
                {isEditing && !isSaving && !isSaved && (
                    <button
                        onClick={handleManualSave}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors shrink-0"
                        title="Save (or wait 3s, or click away)"
                    >
                        <Save size={16} />
                    </button>
                )}
            </div>
            {error && (
                <div className="absolute left-0 top-full mt-1 text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded border border-red-200">
                    {error}
                </div>
            )}
        </div>
    );
};

export default EditableInput;
