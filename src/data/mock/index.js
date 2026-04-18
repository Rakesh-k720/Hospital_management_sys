export const stats = {
    admin: [
        { label: 'Total Patients', value: '12,543', trend: '+12%', color: 'primary' },
        { label: 'Total Doctors', value: '142', trend: '+4', color: 'success' },
        { label: 'Today Appointments', value: '48', trend: '-2', color: 'warning' },
        { label: 'Total Revenue', value: '$45,210', trend: '+18%', color: 'primary' },
        { label: 'Available Beds', value: '24 / 120', trend: 'Critical', color: 'danger' },
        { label: 'Waiting Patients', value: '18', trend: 'Live', color: 'info' },
    ],
    doctor: [
        { label: "Today's Appointments", value: '12', trend: '3 completed', color: 'primary' },
        { label: 'Waiting Patients', value: '5', trend: 'Next: Jane Doe', color: 'warning' },
        { label: 'Total Patients', value: '1,240', trend: '+15 this month', color: 'success' },
        { label: 'Pending Reports', value: '8', trend: 'Action required', color: 'danger' },
    ],
    patient: [
        { label: 'Upcoming Appointments', value: '1', trend: 'Tomorrow, 10:00 AM', color: 'primary' },
        { label: 'OPD Token Status', value: '#A-102', trend: '3 people ahead', color: 'warning' },
        { label: 'Pending Bills', value: '$120.00', trend: 'Due in 2 days', color: 'danger' },
        { label: 'Test Reports', value: '2 New', trend: 'Available to download', color: 'success' },
    ]
};

export const recentActivity = [
    { id: 1, type: 'appointment', patient: 'Alice Johnson', doctor: 'Dr. Smith', status: 'Confirmed', time: '10:30 AM' },
    { id: 2, type: 'admission', patient: 'Bob Wilson', room: 'ICU-102', status: 'Admitted', time: '09:15 AM' },
    { id: 3, type: 'billing', patient: 'Charlie Brown', amount: '$450.00', status: 'Paid', time: '08:45 AM' },
    { id: 4, type: 'lab', patient: 'Diana Ross', test: 'Blood Test', status: 'Pending', time: 'Yesterday' },
    { id: 5, type: 'discharge', patient: 'Edward Norton', room: 'Ward-B', status: 'Discharged', time: 'Yesterday' },
];

export const doctors = [
    { id: 1, name: 'Dr. Sarah Connor', specialization: 'Cardiology', contact: '+1 234 567 890', status: 'Active' },
    { id: 2, name: 'Dr. James Smith', specialization: 'Neurology', contact: '+1 234 567 891', status: 'Active' },
    { id: 3, name: 'Dr. Emily Blunt', specialization: 'Pediatrics', contact: '+1 234 567 892', status: 'Inactive' },
    { id: 4, name: 'Dr. Robert Fox', specialization: 'Orthopedics', contact: '+1 234 567 893', status: 'Active' },
];

export const opdQueue = [
    { token: 'T-101', patient: 'John Doe', doctor: 'Dr. Sarah', status: 'In Consultation', priority: 'Normal' },
    { token: 'T-102', patient: 'Jane Smith', doctor: 'Dr. James', status: 'Waiting', priority: 'Emergency' },
    { token: 'T-103', patient: 'Mike Ross', doctor: 'Dr. Sarah', status: 'Waiting', priority: 'Normal' },
    { token: 'T-104', patient: 'Rachel Zane', doctor: 'Dr. Emily', status: 'Done', priority: 'Normal' },
];
