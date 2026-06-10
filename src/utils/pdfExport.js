import { jsPDF } from 'jspdf';

const hospitalName = () => import.meta.env.VITE_HOSPITAL_NAME || 'LifeLine Hospital';

export const downloadBillPdf = (bill, items = []) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(hospitalName(), 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Invoice INV-${bill.id}`, 20, 35);
    doc.text(`Date: ${new Date(bill.bill_date).toLocaleDateString()}`, 20, 42);
    doc.text(`Status: ${bill.payment_status}`, 20, 49);
    let y = 60;
    (items.length ? items : [{ item_name: 'Hospital Services', cost: bill.total_amount }]).forEach((item) => {
        doc.text(`${item.item_name} — ₹${item.cost}`, 20, y);
        y += 8;
    });
    doc.setFontSize(14);
    doc.text(`Total: ₹${bill.total_amount}`, 20, y + 10);
    doc.save(`invoice-${bill.id}.pdf`);
};

export const downloadPrescriptionPdf = (prescription) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(hospitalName(), 105, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Dr. ${prescription.doctor_name}`, 20, 30);
    doc.text(`Date: ${new Date(prescription.created_at).toLocaleDateString()}`, 20, 37);
    doc.text('Rx', 20, 48);
    let y = 55;
    (prescription.medicines || []).forEach((m, i) => {
        doc.text(`${i + 1}. ${m.medicine_name} — ${m.dosage} — ${m.duration}`, 20, y);
        y += 7;
        if (m.instructions) {
            doc.setFontSize(9);
            doc.text(`   ${m.instructions}`, 20, y);
            doc.setFontSize(11);
            y += 6;
        }
    });
    if (prescription.notes) {
        y += 5;
        doc.text(`Notes: ${prescription.notes}`, 20, y);
    }
    doc.save(`prescription-${prescription.id}.pdf`);
};

/** Print/save Rx draft before server save */
export const downloadRxDraftPdf = ({ doctorName, patient, diagnosis, observations, medicines, labNotes }) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(hospitalName(), 105, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text(`Dr. ${doctorName || 'Doctor'}`, 20, 28);
    doc.text(`Patient: ${patient?.patient_name || '-'}`, 20, 35);
    doc.text(`Token: ${patient?.token_number || '—'} | ${new Date().toLocaleDateString()}`, 20, 42);
    if (diagnosis) doc.text(`Diagnosis: ${diagnosis}`, 20, 52);
    if (observations) doc.text(`Observations: ${observations}`, 20, 59);
    doc.text('Rx', 20, 70);
    let y = 78;
    (medicines || []).filter((m) => m.name).forEach((m, i) => {
        doc.text(`${i + 1}. ${m.name} — ${m.dosage || ''} — ${m.duration || ''}`, 20, y);
        y += 7;
        if (m.instructions) {
            doc.setFontSize(9);
            doc.text(`   ${m.instructions}`, 20, y);
            doc.setFontSize(11);
            y += 6;
        }
    });
    if (labNotes) {
        y += 4;
        doc.text(`Lab: ${labNotes}`, 20, y);
    }
    doc.save(`rx-draft-${patient?.token_number || 'patient'}.pdf`);
};

export const downloadDischargeSummaryPdf = (admission, dischargeNotes = '') => {
    const doc = new jsPDF();
    const hospital = hospitalName();
    doc.setFontSize(18);
    doc.text(hospital, 105, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Discharge Summary', 105, 24, { align: 'center' });
    doc.setFontSize(10);
    let y = 38;
    const line = (label, value) => {
        doc.setFont(undefined, 'bold');
        doc.text(`${label}:`, 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(String(value || '—'), 55, y);
        y += 8;
    };
    line('Patient', admission.patient_name);
    line('Age/Gender', `${admission.age ?? '—'}Y / ${admission.gender || '—'}`);
    line('Blood group', admission.blood_group);
    line('Ward/Bed', `${admission.ward_name} — ${admission.bed_number}`);
    line('Doctor', admission.doctor_name);
    line('Admitted', admission.admission_date ? new Date(admission.admission_date).toLocaleString() : '—');
    if (admission.discharge_date) {
        line('Discharged', new Date(admission.discharge_date).toLocaleString());
    }
    y += 4;
    doc.setFont(undefined, 'bold');
    doc.text('Diagnosis & notes:', 20, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    const text = dischargeNotes || admission.diagnosis || '—';
    doc.splitTextToSize(text, 170).forEach((ln) => {
        doc.text(ln, 20, y);
        y += 6;
    });
    doc.save(`discharge-${admission.patient_name || 'patient'}-${admission.id}.pdf`);
};

export const downloadPatientHealthCard = ({ user, patient }) => {
    const doc = new jsPDF();
    const hospital = hospitalName();
    doc.setFillColor(14, 116, 144);
    doc.rect(0, 0, 210, 42, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(hospital, 105, 18, { align: 'center' });
    doc.setFontSize(11);
    doc.text('Patient Health ID Card', 105, 28, { align: 'center' });
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(14);
    let y = 55;
    doc.text(`Name: ${user?.name || '-'}`, 20, y);
    y += 10;
    doc.text(`Patient ID: P-${String(patient?.id || '').padStart(4, '0')}`, 20, y);
    y += 10;
    doc.text(`Blood Group: ${patient?.blood_group || 'N/A'}`, 20, y);
    y += 10;
    doc.text(`Age / Gender: ${patient?.age ?? '-'} / ${patient?.gender || '-'}`, 20, y);
    y += 10;
    doc.text(`Phone: ${user?.phone || '-'}`, 20, y);
    y += 10;
    doc.text(`Emergency: ${patient?.emergency_contact || 'Not set'}`, 20, y);
    y += 14;
    doc.setFontSize(10);
    doc.text(`Allergies: ${patient?.allergies || 'None recorded'}`, 20, y);
    y += 8;
    const notes = (patient?.medical_notes || 'None').slice(0, 120);
    doc.text(`Medical notes: ${notes}`, 20, y);
    y += 16;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Issued: ${new Date().toLocaleDateString()} | ${user?.email || ''}`, 20, y);
    doc.save(`health-card-P-${patient?.id || 'patient'}.pdf`);
};

export const downloadLabReportPdf = (report) => {
    const doc = new jsPDF();
    const hospital = hospitalName();

    // Header
    doc.setFillColor(14, 116, 144);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(hospital, 105, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text('Laboratory Report', 105, 25, { align: 'center' });

    // Report details
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    let y = 48;

    const addLine = (label, value) => {
        doc.setFont(undefined, 'bold');
        doc.text(`${label}:`, 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(String(value || '—'), 60, y);
        y += 8;
    };

    addLine('Patient', report.patient_name);
    addLine('Test', report.test_name);
    addLine('Date', report.test_date ? new Date(report.test_date).toLocaleDateString() : '—');
    addLine('Status', report.status || 'Pending');
    addLine('Doctor', report.doctor_name || '—');

    // Result section
    y += 6;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Test Results', 20, y);
    y += 4;
    doc.setDrawColor(14, 116, 144);
    doc.line(20, y, 190, y);
    y += 10;

    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);

    if (report.result) {
        const resultLines = doc.splitTextToSize(String(report.result), 170);
        resultLines.forEach(line => {
            doc.text(line, 20, y);
            y += 6;
        });
    } else {
        doc.text('Results pending...', 20, y);
        y += 6;
    }

    // Notes
    if (report.notes) {
        y += 6;
        doc.setFont(undefined, 'bold');
        doc.text('Notes:', 20, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        const noteLines = doc.splitTextToSize(report.notes, 170);
        noteLines.forEach(line => {
            doc.text(line, 20, y);
            y += 6;
        });
    }

    // Footer
    y = 270;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Report generated: ${new Date().toLocaleString()}`, 20, y);
    doc.text(`${hospital}`, 190, y, { align: 'right' });

    doc.save(`lab-report-${report.patient_name || 'patient'}-${report.id || Date.now()}.pdf`);
};

export const downloadPharmacyReceiptPdf = (order) => {
    const doc = new jsPDF();
    const hospital = hospitalName();

    // Header
    doc.setFillColor(14, 116, 144);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(hospital, 105, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text('Pharmacy Receipt', 105, 25, { align: 'center' });

    // Order details
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    let y = 48;

    doc.text(`Order #${order.id || '—'}`, 20, y);
    y += 7;
    doc.text(`Date: ${order.created_at ? new Date(order.created_at).toLocaleDateString() : '—'}`, 20, y);
    y += 7;
    doc.text(`Patient: ${order.patient_name || '—'}`, 20, y);
    y += 12;

    // Items table header
    doc.setFillColor(241, 245, 249);
    doc.rect(20, y - 5, 170, 10, 'F');
    doc.setFont(undefined, 'bold');
    doc.text('Medicine', 25, y + 1);
    doc.text('Qty', 120, y + 1);
    doc.text('Price', 150, y + 1);
    doc.setFont(undefined, 'normal');
    y += 12;

    // Items
    const items = order.items || [];
    let total = 0;
    items.forEach((item, i) => {
        const qty = item.quantity || 1;
        const price = item.price || 0;
        const subtotal = qty * price;
        total += subtotal;

        doc.text(`${i + 1}. ${item.medicine_name || item.name || '—'}`, 25, y);
        doc.text(String(qty), 120, y);
        doc.text(`Rs. ${subtotal.toFixed(2)}`, 150, y);
        y += 8;
    });

    // Total
    y += 4;
    doc.setDrawColor(14, 116, 144);
    doc.line(20, y, 190, y);
    y += 8;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text(`Total: Rs. ${(order.total_amount || total).toFixed(2)}`, 20, y);
    doc.setFont(undefined, 'normal');

    // Status
    y += 10;
    doc.setFontSize(10);
    doc.text(`Status: ${order.status || 'Dispensed'}`, 20, y);

    // Footer
    y = 270;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Thank you for choosing ${hospital}`, 105, y, { align: 'center' });

    doc.save(`pharmacy-receipt-${order.id || Date.now()}.pdf`);
};

export const downloadInsuranceClaimPdf = (claim) => {
    const doc = new jsPDF();
    const hospital = hospitalName();

    // Header
    doc.setFillColor(14, 116, 144);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(hospital, 105, 15, { align: 'center' });
    doc.setFontSize(11);
    doc.text('Insurance Claim Summary', 105, 25, { align: 'center' });

    // Claim details
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(11);
    let y = 48;

    const addLine = (label, value) => {
        doc.setFont(undefined, 'bold');
        doc.text(`${label}:`, 20, y);
        doc.setFont(undefined, 'normal');
        doc.text(String(value || '—'), 60, y);
        y += 8;
    };

    addLine('Claim ID', `CLM-${String(claim.id || '').padStart(6, '0')}`);
    addLine('Patient', claim.patient_name);
    addLine('Provider', claim.provider_name);
    addLine('Policy No.', claim.policy_number);
    addLine('Date Filed', claim.created_at ? new Date(claim.created_at).toLocaleDateString() : '—');
    addLine('Status', claim.status || 'Pending');

    y += 6;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(13);
    doc.text('Claim Amount', 20, y);
    doc.setTextColor(14, 116, 144);
    doc.text(`Rs. ${(claim.claim_amount || 0).toFixed(2)}`, 190, y, { align: 'right' });

    if (claim.approved_amount) {
        y += 8;
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(11);
        doc.text('Approved Amount', 20, y);
        doc.setTextColor(34, 197, 94);
        doc.text(`Rs. ${claim.approved_amount.toFixed(2)}`, 190, y, { align: 'right' });
    }

    // Notes
    if (claim.notes) {
        y += 16;
        doc.setTextColor(30, 41, 59);
        doc.setFont(undefined, 'bold');
        doc.text('Notes:', 20, y);
        y += 6;
        doc.setFont(undefined, 'normal');
        const noteLines = doc.splitTextToSize(claim.notes, 170);
        noteLines.forEach(line => {
            doc.text(line, 20, y);
            y += 6;
        });
    }

    // Footer
    y = 270;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 20, y);

    doc.save(`insurance-claim-${claim.id || Date.now()}.pdf`);
};
