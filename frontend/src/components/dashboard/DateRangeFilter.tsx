import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { getDateRangePresets } from '../../utils/dashboardHelpers';
import type { DateRange as DateRangeType } from '../../utils/dashboardHelpers';

interface DateRangeFilterProps {
    onFilterChange: (startDate: string, endDate: string) => void;
    defaultDays?: number;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
    onFilterChange,
    defaultDays = 30,
}) => {
    const presets = getDateRangePresets();
    const defaultPreset = presets.find((p) => p.label === 'Last 30 Days') || presets[1];

    const [selectedPreset, setSelectedPreset] = useState<DateRangeType | null>(defaultPreset);
    const [customStart, setCustomStart] = useState<string>('');
    const [customEnd, setCustomEnd] = useState<string>('');
    const [isCustom, setIsCustom] = useState(false);

    // Initialize with default range
    React.useEffect(() => {
        if (defaultPreset) {
            onFilterChange(defaultPreset.startDate, defaultPreset.endDate);
        }
    }, []); // Run once on mount

    const handlePresetClick = (preset: DateRangeType) => {
        setSelectedPreset(preset);
        setIsCustom(false);
        onFilterChange(preset.startDate, preset.endDate);
    };

    const handleCustomApply = () => {
        if (customStart && customEnd) {
            setSelectedPreset(null);
            setIsCustom(true);
            onFilterChange(customStart, customEnd);
        }
    };

    const handleReset = () => {
        setSelectedPreset(defaultPreset);
        setIsCustom(false);
        setCustomStart('');
        setCustomEnd('');
        if (defaultPreset) {
            onFilterChange(defaultPreset.startDate, defaultPreset.endDate);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Calendar size={18} />
                    <span>Date Range:</span>
                </div>

                {/* Preset buttons */}
                <div className="flex gap-2 flex-wrap">
                    {presets.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => handlePresetClick(preset)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${selectedPreset?.label === preset.label && !isCustom
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                </div>

                {/* Custom date inputs */}
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Start Date"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="End Date"
                    />
                    <button
                        onClick={handleCustomApply}
                        disabled={!customStart || !customEnd}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                        Apply
                    </button>
                    {isCustom && (
                        <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition"
                        >
                            Reset
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DateRangeFilter;
