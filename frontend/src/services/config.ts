/**
 * User Configuration Service
 * Fetches and manages user-specific configuration from backend
 */

import apiClient from '../lib/api';
import { addColumnMappings } from '../utils/columnMapping';

export interface UserConfig {
    username: string;
    industry: string;
    r2_bucket: string;
    dashboard_url?: string;
    columns: {
        upload?: any[];
        verify_dates?: any[];
        verify_amounts?: any[];
        verified?: any[];
    };
    gemini_config_loaded?: boolean;
}

// In-memory cache for config
let cachedConfig: UserConfig | null = null;

/**
 * Fetch user configuration from backend
 * Automatically caches the result
 */
export async function fetchUserConfig(): Promise<UserConfig> {
    try {
        const response = await apiClient.get('/api/config');
        const config: UserConfig = response.data;

        // Cache the config
        cachedConfig = config;

        // Store in localStorage for persistence
        localStorage.setItem('user_config', JSON.stringify(config));

        // If config has custom column mappings, add them to the mapping utility
        // This ensures dynamic columns from different industries are properly mapped
        if (config.columns) {
            const customMappings: Record<string, string> = {};

            // Extract column labels from config and create mappings
            // Example: if config has "patient_name" field, map it properly
            Object.values(config.columns).forEach((columnArray: any) => {
                if (Array.isArray(columnArray)) {
                    columnArray.forEach((col: any) => {
                        if (col.db_column && col.label) {
                            customMappings[col.db_column] = col.label;
                        }
                    });
                }
            });

            // Add to global mapping
            if (Object.keys(customMappings).length > 0) {
                addColumnMappings(customMappings);
            }
        }

        return config;
    } catch (error) {
        console.error('Failed to fetch user config:', error);

        // Try to load from localStorage as fallback
        const stored = localStorage.getItem('user_config');
        if (stored) {
            try {
                cachedConfig = JSON.parse(stored);
                return cachedConfig!;
            } catch (e) {
                console.error('Failed to parse stored config:', e);
            }
        }

        throw error;
    }
}

/**
 * Get cached user configuration
 * Returns null if not loaded yet
 */
export function getCachedConfig(): UserConfig | null {
    // Try memory cache first
    if (cachedConfig) {
        return cachedConfig;
    }

    // Try localStorage
    const stored = localStorage.getItem('user_config');
    if (stored) {
        try {
            cachedConfig = JSON.parse(stored);
            return cachedConfig;
        } catch (e) {
            console.error('Failed to parse stored config:', e);
        }
    }

    return null;
}

/**
 * Clear cached configuration
 * Useful on logout
 */
export function clearConfigCache(): void {
    cachedConfig = null;
    localStorage.removeItem('user_config');
}

/**
 * Get dashboard URL from config
 */
export function getDashboardUrl(): string | undefined {
    const config = getCachedConfig();
    return config?.dashboard_url;
}

/**
 * Get user's industry from config
 */
export function getUserIndustry(): string | undefined {
    const config = getCachedConfig();
    return config?.industry;
}

/**
 * Check if config is loaded
 */
export function isConfigLoaded(): boolean {
    return cachedConfig !== null;
}
