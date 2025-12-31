/**
 * Column Mapping Utility
 * 
 * Transforms data between Supabase format (snake_case) and Frontend format (Title Case)
 * This allows the backend to use clean database column names while keeping frontend code readable
 */

/**
 * Mapping from Supabase snake_case columns to Frontend Title Case columns
 */
export const COLUMN_MAP: Record<string, string> = {
    // Common fields
    row_id: 'Row_Id',
    receipt_number: 'Receipt Number',
    date: 'Date',
    customer_name: 'Customer Name',
    mobile_number: 'Mobile Number',

    // Automobile industry fields
    car_number: 'Car Number',

    // Medical industry fields  
    patient_name: 'Patient Name',

    // Item details
    odometer: 'Odometer',
    description: 'Description',
    type: 'Type',
    quantity: 'Quantity',
    rate: 'Rate',
    amount: 'Amount',
    total_bill_amount: 'Total Bill Amount',

    // System fields
    receipt_link: 'Receipt Link',
    upload_date: 'Upload Date',
    review_status: 'Review Status',
    calculated_amount: 'Calculated Amount',
    amount_mismatch: 'Amount Mismatch',
    confidence: 'Confidence',
    image_hash: 'Image Hash',

    // Verification fields
    verification_status: 'Verification Status',
    audit_findings: 'Audit Findings',

    // Metadata
    username: 'Username',
    created_at: 'Created At',
    updated_at: 'Updated At'
};

/**
 * Reverse mapping from Title Case to snake_case
 */
export const REVERSE_COLUMN_MAP: Record<string, string> = Object.entries(COLUMN_MAP).reduce(
    (acc, [key, value]) => {
        acc[value] = key;
        return acc;
    },
    {} as Record<string, string>
);

/**
 * Transform a single object from snake_case to Title Case
 * 
 * @param obj - Object with snake_case keys
 * @returns Object with Title Case keys
 */
export function mapToFrontend(obj: Record<string, any>): Record<string, any> {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        // Use mapping if available, otherwise keep original key
        const mappedKey = COLUMN_MAP[key] || key;
        result[mappedKey] = value;
    }

    return result;
}

/**
 * Transform an array of objects from snake_case to Title Case
 * 
 * @param data - Array of objects with snake_case keys
 * @returns Array of objects with Title Case keys
 */
export function mapArrayToFrontend(data: Record<string, any>[]): Record<string, any>[] {
    if (!Array.isArray(data)) {
        return data;
    }

    return data.map(mapToFrontend);
}

/**
 * Transform a single object from Title Case to snake_case
 * 
 * @param obj - Object with Title Case keys
 * @returns Object with snake_case keys
 */
export function mapToBackend(obj: Record<string, any>): Record<string, any> {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
        // Use reverse mapping if available, otherwise keep original key
        const mappedKey = REVERSE_COLUMN_MAP[key] || key;
        result[mappedKey] = value;
    }

    return result;
}

/**
 * Transform an array of objects from Title Case to snake_case
 * 
 * @param data - Array of objects with Title Case keys
 * @returns Array of objects with snake_case keys
 */
export function mapArrayToBackend(data: Record<string, any>[]): Record<string, any>[] {
    if (!Array.isArray(data)) {
        return data;
    }

    return data.map(mapToBackend);
}

/**
 * Helper to add custom column mappings at runtime
 * Useful for industry-specific columns loaded from config
 * 
 * @param snakeCase - Column name in snake_case
 * @param titleCase - Column name in Title Case
 */
export function addColumnMapping(snakeCase: string, titleCase: string) {
    COLUMN_MAP[snakeCase] = titleCase;
    REVERSE_COLUMN_MAP[titleCase] = snakeCase;
}

/**
 * Batch add column mappings from config
 * 
 * @param mappings - Object with snake_case keys and Title Case values
 */
export function addColumnMappings(mappings: Record<string, string>) {
    Object.entries(mappings).forEach(([snakeCase, titleCase]) => {
        addColumnMapping(snakeCase, titleCase);
    });
}
