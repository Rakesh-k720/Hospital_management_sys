/**
 * Generic CSV download utility
 * @param {string[]} headers - Array of column header strings
 * @param {Array<Array<string|number>>} rows - Array of row arrays
 * @param {string} filename - Name for the downloaded file (without .csv)
 */
export const downloadCSV = (headers, rows, filename) => {
    // Escape CSV values (handle commas, quotes, newlines)
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const csvContent = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
    ].join('\n');

    // Add BOM for proper UTF-8 encoding in Excel
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Export table data to CSV from objects
 * @param {Object[]} data - Array of objects
 * @param {string[]} columns - Keys to include (optional, defaults to all keys)
 * @param {string} filename - Name for the downloaded file
 */
export const exportObjectsToCSV = (data, columns = null, filename = 'export') => {
    if (!data || data.length === 0) return;

    const keys = columns || Object.keys(data[0]);
    const headers = keys.map(k => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    const rows = data.map(item => keys.map(k => item[k]));

    downloadCSV(headers, rows, filename);
};

/**
 * Export for specific HMS modules
 */
export const exportMedicinesToCSV = (medicines) => {
    exportObjectsToCSV(
        medicines,
        ['name', 'category', 'manufacturer', 'stock_quantity', 'unit_price', 'expiry_date', 'status'],
        'medicines-list'
    );
};

export const exportStaffToCSV = (staff) => {
    exportObjectsToCSV(
        staff,
        ['name', 'email', 'phone', 'role', 'department', 'status', 'created_at'],
        'staff-list'
    );
};

export const exportClaimsToCSV = (claims) => {
    exportObjectsToCSV(
        claims,
        ['id', 'patient_name', 'provider_name', 'policy_number', 'claim_amount', 'approved_amount', 'status', 'created_at'],
        'insurance-claims'
    );
};

export const exportPatientsToCSV = (patients) => {
    exportObjectsToCSV(
        patients,
        ['id', 'name', 'age', 'gender', 'phone', 'email', 'blood_group', 'created_at'],
        'patients-list'
    );
};

export const exportAppointmentsToCSV = (appointments) => {
    exportObjectsToCSV(
        appointments,
        ['id', 'patient_name', 'doctor_name', 'department', 'appointment_date', 'appointment_time', 'status'],
        'appointments'
    );
};

export const exportBillsToCSV = (bills) => {
    exportObjectsToCSV(
        bills,
        ['id', 'patient_name', 'total_amount', 'payment_status', 'payment_method', 'bill_date'],
        'billing-records'
    );
};
