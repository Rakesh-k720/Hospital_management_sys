import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { FileText, Download, Eye, Calendar, ShieldAlert } from 'lucide-react';
import API from '../../../services/api';
import { resolveReportUrl } from '../../../utils/fileUrl';

const PatientReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await API.get('/lab/my-reports');
                setReports(response.data.data || []);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching reports:', err);
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const handleViewReport = (filePath) => {
        if (!filePath) {
            alert("No report file uploaded yet.");
            return;
        }
        // Base URL of our backend uploads
        window.open(resolveReportUrl(filePath), '_blank');
    };

    const handleDownloadReport = (filePath, testName) => {
        if (!filePath) {
            alert("No report file available for download.");
            return;
        }
        const link = document.createElement('a');
        link.href = resolveReportUrl(filePath);
        link.setAttribute('download', `${testName.replace(/\s+/g, '_')}_Report.pdf`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">My Lab Reports</h2>
                <p className="text-sm text-secondary-500">View and download your digital clinical diagnostic test results</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="p-8 text-secondary-400 font-medium text-xs">Loading clinical report cards...</p>
                ) : reports.length === 0 ? (
                    <Card className="col-span-full p-12 text-center text-secondary-400 border-none shadow-premium bg-white">
                        <FileText size={48} className="mx-auto mb-4 opacity-20 text-secondary-300" />
                        <p className="text-xs font-bold uppercase tracking-wider text-secondary-400">No laboratory reports registered</p>
                    </Card>
                ) : reports.map((report) => (
                    <Card key={report.id} className="hover:shadow-soft transition-all duration-200 border-none shadow-premium bg-white overflow-hidden">
                        <CardHeader className="pb-2 border-b border-slate-50 bg-slate-50/20">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base font-bold text-secondary-900">{report.test_name}</CardTitle>
                                <Badge variant={report.status === 'completed' ? 'success' : 'warning'}>
                                    {report.status.toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex items-center gap-2 text-xs text-secondary-500 font-medium">
                                <Calendar size={14} />
                                Uploaded: {new Date(report.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-secondary-600 font-medium">
                                <span className="font-bold text-secondary-800">Requested by:</span> {report.doctor_name || 'Assigned Physician'}
                            </div>
                            
                            {report.status === 'completed' ? (
                                <div className="flex gap-2 pt-2">
                                    <Button 
                                        onClick={() => handleDownloadReport(report.file_path, report.test_name)}
                                        className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white"
                                    >
                                        <Download size={14} />
                                        Download PDF
                                    </Button>
                                    <Button 
                                        onClick={() => handleViewReport(report.file_path)}
                                        variant="outline" 
                                        size="icon"
                                        className="border-slate-200 text-secondary-600 hover:bg-slate-50"
                                    >
                                        <Eye size={14} />
                                    </Button>
                                </div>
                            ) : (
                                <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-2 mt-2">
                                    <ShieldAlert className="text-amber-600 shrink-0 mt-0.5" size={14} />
                                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                                        Your specimen is currently being processed. Results will populate automatically.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default PatientReports;
