import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface AutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    getSuggestions: (query: string) => Promise<string[]>;
    debounceMs?: number;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
    value,
    onChange,
    placeholder,
    label,
    getSuggestions,
    debounceMs = 300,
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<number | null>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch suggestions when value changes
    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        if (value.length >= 2) {
            debounceTimer.current = setTimeout(async () => {
                setIsLoading(true);
                try {
                    const results = await getSuggestions(value);
                    setSuggestions(results);
                    setShowDropdown(true);
                    setHighlightedIndex(-1);
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                    setSuggestions([]);
                } finally {
                    setIsLoading(false);
                }
            }, debounceMs);
        } else {
            setSuggestions([]);
            setShowDropdown(false);
        }

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [value, getSuggestions, debounceMs]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown || suggestions.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex((prev) =>
                    prev < suggestions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0) {
                    onChange(suggestions[highlightedIndex]);
                    setShowDropdown(false);
                }
                break;
            case 'Escape':
                setShowDropdown(false);
                break;
        }
    };

    const handleSelect = (suggestion: string) => {
        onChange(suggestion);
        setShowDropdown(false);
    };

    const handleClear = () => {
        onChange('');
        setSuggestions([]);
        setShowDropdown(false);
    };

    return (
        <div ref={wrapperRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                </div>
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => value.length >= 2 && setSuggestions.length > 0 && setShowDropdown(true)}
                    placeholder={placeholder}
                    className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                {value && (
                    <button
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-700 text-gray-400"
                    >
                        <X size={16} />
                    </button>
                )}
                {isLoading && (
                    <div className="absolute inset-y-0 right-0 pr-10 flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    </div>
                )}
            </div>

            {/* Dropdown */}
            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {suggestions.map((suggestion, index) => (
                        <button
                            key={index}
                            onClick={() => handleSelect(suggestion)}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 transition ${index === highlightedIndex ? 'bg-indigo-50' : ''
                                }`}
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AutocompleteInput;
