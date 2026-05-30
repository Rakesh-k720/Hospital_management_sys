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
