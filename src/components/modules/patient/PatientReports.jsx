import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import { FileText, Download, Eye, Calendar } from 'lucide-react';
import API from '../../../services/api';

const PatientReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await API.get('/lab/my-reports');
                setReports(response.data.data);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching reports:', err);
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">My Lab Reports</h2>
                <p className="text-sm text-secondary-500">View and download your diagnostic test results</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p>Loading reports...</p>
                ) : reports.length === 0 ? (
                    <Card className="col-span-full p-12 text-center text-secondary-400">
                        <FileText size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No reports found.</p>
                    </Card>
                ) : reports.map((report) => (
                    <Card key={report.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-lg">{report.test_name}</CardTitle>
                                <Badge variant={report.status === 'completed' ? 'success' : 'warning'}>
                                    {report.status.toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-secondary-600">
                                <Calendar size={14} />
                                {new Date(report.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-sm">
                                <span className="font-bold text-secondary-700">Requested by:</span> {report.doctor_name}
                            </div>
                            
                            {report.status === 'completed' ? (
                                <div className="flex gap-2 pt-2">
                                    <Button className="flex-1 flex items-center justify-center gap-2">
                                        <Download size={16} />
                                        Download PDF
                                    </Button>
                                    <Button variant="outline" size="icon">
                                        <Eye size={16} />
                                    </Button>
                                </div>
                            ) : (
                                <p className="text-xs text-amber-600 font-medium pt-2">
                                    Your results are being processed. Please check back later.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default PatientReports;
