import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

interface AutocompleteInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    label: string;
    getSuggestions: (query: string) => Promise<string[]>;
    debounceMs?: number;
    minChars?: number;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
    value,
    onChange,
    placeholder,
    label,
    getSuggestions,
    debounceMs = 300,
    minChars = 2,
}) => {
    const [suggestions, setSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceTimer = useRef<number | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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

        if (value.length >= minChars) {
            debounceTimer.current = setTimeout(async () => {
                setIsLoading(true);
                try {
                    const results = await getSuggestions(value);
                    setSuggestions(results);
                    // Only open if we found results and input is focused
                    if (document.activeElement === inputRef.current) {
                        setShowDropdown(true);
                    }
                    setHighlightedIndex(-1);
                } catch (error) {
                    console.error('Error fetching suggestions:', error);
                    setSuggestions([]);
                } finally {
                    setIsLoading(false);
                }
            }, debounceMs);
        } else {
            // Only clear/close if we are below minChars and not manually toggled
            // But usually for autocomplete, if you backspace below minChars, it should close/clear.
            // We'll keep this simple: clear if below threshold.
            setSuggestions([]);
            setShowDropdown(false);
        }

        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [value, getSuggestions, debounceMs, minChars]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown) {
            if (e.key === 'ArrowDown') {
                // Open on down arrow
                handleToggleDropdown();
                e.preventDefault();
            }
            return;
        }

        if (suggestions.length === 0) return;

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
        // Keep focus on input
        inputRef.current?.focus();
        // Optionally keep dropdown open or close it? usually close or show all
        // If minChars=0, clearing might trigger 'show all' via useEffect
    };

    const handleToggleDropdown = async () => {
        if (showDropdown) {
            setShowDropdown(false);
        } else {
            // Manual open - fetch immediately
            inputRef.current?.focus();
            setIsLoading(true);
            try {
                const results = await getSuggestions(value);
                setSuggestions(results);
                setShowDropdown(true);
                setHighlightedIndex(-1);
            } catch (error) {
                console.error('Error toggling suggestions:', error);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => {
                        // Optional: Open on focus if value matches minChars?
                        if (value.length >= minChars && suggestions.length > 0) {
                            setShowDropdown(true);
                        }
                    }}
                    placeholder={placeholder}
                    className="block w-full pl-10 pr-16 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />

                {/* Right Actions Container */}
                <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
                    {value && (
                        <button
                            onClick={handleClear}
                            className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                            title="Clear"
                        >
                            <X size={14} />
                        </button>
                    )}

                    {/* Divider if both X and Chevron are present? Nah, just space them */}

                    <button
                        onClick={handleToggleDropdown}
                        className={`p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors transform ${showDropdown ? 'rotate-180' : ''}`}
                        title="Toggle list"
                    >
                        <ChevronDown size={16} />
                    </button>

                    {isLoading && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 ml-1"></div>
                    )}
                </div>
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
