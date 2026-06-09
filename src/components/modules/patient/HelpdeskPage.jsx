import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../ui/Card';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Badge from '../../ui/Badge';
import API from '../../../services/api';
import { showToast } from '../../../utils/toast';
import {
    MessageSquare, Send, HelpCircle, AlertTriangle, CheckCircle,
    Clock, Bot, User, RefreshCw, FileText, CreditCard, Calendar, ShieldAlert
} from 'lucide-react';

const HelpdeskPage = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('billing');
    const [priority, setPriority] = useState('medium');
    const [description, setDescription] = useState('');

    // Chatbot state
    const [chatMessages, setChatMessages] = useState([
        {
            sender: 'bot',
            text: 'Hello! I am your LifeLine Health Assistant. How can I help you resolve your query today?',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
    ]);
    const [chatInput, setChatInput] = useState('');
    const [botData, setBotData] = useState({ appointments: [], bills: [], reports: [] });
    const chatEndRef = useRef(null);

    // Fetch tickets and patient info for chatbot queries
    const fetchData = async () => {
        try {
            setLoading(true);
            const [ticketsRes, apptsRes, billsRes, reportsRes] = await Promise.all([
                API.get('/patient/tickets'),
                API.get('/patient/appointments'),
                API.get('/patient/bills'),
                API.get('/lab/my-reports')
            ]);
            setTickets(ticketsRes.data.data || []);
            setBotData({
                appointments: apptsRes.data.data || [],
                bills: billsRes.data.data || [],
                reports: reportsRes.data.data || []
            });
        } catch (err) {
            console.error('Error fetching helpdesk data:', err);
            showToast('Failed to load support page data', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Scroll to bottom of chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Handle ticket submission
    const handleSubmitTicket = async (e) => {
        e.preventDefault();
        if (!title.trim() || !description.trim()) {
            showToast('Please fill out all fields', 'warning');
            return;
        }

        setSubmitting(true);
        try {
            await API.post('/patient/tickets', {
                title,
                category,
                priority,
                description
            });
            showToast('Support ticket raised successfully!');
            setTitle('');
            setDescription('');
            // Reload tickets list
            fetchData();
        } catch (err) {
            console.error('Failed to submit ticket:', err);
            showToast('Failed to raise support ticket', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    // Close/Resolve ticket
    const handleResolveTicket = async (id) => {
        try {
            await API.patch(`/patient/tickets/${id}/resolve`);
            showToast('Ticket marked as resolved');
            fetchData();
        } catch (err) {
            console.error('Failed to resolve ticket:', err);
            showToast('Failed to update ticket status', 'error');
        }
    };

    // Care Bot Chat logic
    const handleSendMessage = (text) => {
        const queryText = text || chatInput;
        if (!queryText.trim()) return;

        const userMsg = {
            sender: 'user',
            text: queryText,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setChatMessages(prev => [...prev, userMsg]);
        setChatInput('');

        // Simulate typing delay
        setTimeout(() => {
            let botReplyText = "";
            const lowerQuery = queryText.toLowerCase();

            if (lowerQuery.includes('appointment') || lowerQuery.includes('doctor') || lowerQuery.includes('scheduled')) {
                const upcoming = botData.appointments.filter(a => a.status === 'pending' || a.status === 'confirmed');
                if (upcoming.length > 0) {
                    botReplyText = `I found an upcoming appointment for you:\n\n🧑‍⚕️ Doctor: ${upcoming[0].doctor_name} (${upcoming[0].specialization})\n📅 Date: ${new Date(upcoming[0].appointment_date).toLocaleDateString()}\n⏰ Time: ${upcoming[0].appointment_time}\nStatus: ${upcoming[0].status.toUpperCase()}.\n\nThe doctor is currently on schedule. If you face any delay at the clinic, please raise a ticket under the 'OPD Token' category.`;
                } else {
                    botReplyText = "You don't have any upcoming appointments. If you wish to book one, please go to the 'Book Appointment' page in the sidebar.";
                }
            } else if (lowerQuery.includes('bill') || lowerQuery.includes('payment') || lowerQuery.includes('charge') || lowerQuery.includes('fee')) {
                const pending = botData.bills.filter(b => b.payment_status !== 'paid');
                const totalPending = pending.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
                if (pending.length > 0) {
                    botReplyText = `You have ${pending.length} unpaid bill(s) totaling ₹${totalPending.toFixed(2)}.\n\nMost recent outstanding invoice:\n💰 Amount: ₹${Number(pending[0].total_amount).toFixed(2)}\n📅 Date: ${new Date(pending[0].bill_date).toLocaleDateString()}\n\nYou can pay directly online by visiting the 'Bills' page. If you were double charged or have an insurance dispute, please raise a support ticket under the 'Billing' category.`;
                } else {
                    botReplyText = "Great news! You have no pending bills. All your transactions are settled. If you need a printed ledger receipt, you can download it from the 'Bills' tab.";
                }
            } else if (lowerQuery.includes('report') || lowerQuery.includes('lab') || lowerQuery.includes('test')) {
                if (botData.reports.length > 0) {
                    const completed = botData.reports.filter(r => r.status === 'completed');
                    const pending = botData.reports.filter(r => r.status === 'pending');
                    botReplyText = `Here is your lab status:\n\n✅ Completed reports: ${completed.length}\n⏳ Pending tests: ${pending.length}\n\n${pending.length > 0 ? `Currently, the test "${pending[0].test_name}" is in progress in the lab. ` : ''}Completed reports are available for download in 'My Reports'. If you cannot find a report or have a question about results, submit a support ticket under 'Lab Reports'.`;
                } else {
                    botReplyText = "You have no lab tests recorded in our database. If you recently gave samples, it might take up to 2 hours for details to appear. Please check back later or log a ticket.";
                }
            } else if (lowerQuery.includes('emergency') || lowerQuery.includes('sos') || lowerQuery.includes('accident') || lowerQuery.includes('pain')) {
                botReplyText = "🚨 If you are experiencing a medical emergency, please click the red 'SOS Emergency Assistance' button on the Dashboard Home or dial our direct helpline immediately: +1 (800) 999 000. Do not wait for a support ticket.";
            } else {
                botReplyText = "I understand you have a query. For detailed account or billing corrections, please submit a ticket using the 'Raise Support Ticket' form on the right. Our support desk will review and update you shortly.";
            }

            const botMsg = {
                sender: 'bot',
                text: botReplyText,
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setChatMessages(prev => [...prev, botMsg]);
        }, 800);
    };

    const getStatusBadgeVariant = (status) => {
        switch (status) {
            case 'open': return 'primary';
            case 'in_progress': return 'warning';
            case 'resolved': return 'success';
            case 'closed': return 'secondary';
            default: return 'secondary';
        }
    };

    const getPriorityBadgeVariant = (priority) => {
        switch (priority) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'info';
            default: return 'secondary';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold font-['Outfit'] text-secondary-900">Helpdesk & Support Portal</h2>
                    <p className="text-sm text-secondary-500">Report problems, ask queries, and track resolutions</p>
                </div>
                <Button variant="outline" onClick={fetchData} className="flex items-center gap-2" disabled={loading}>
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    Refresh
                </Button>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column: Live Chat Assistant (5 cols) */}
                <div className="lg:col-span-5 flex flex-col h-[600px]">
                    <Card className="border-none shadow-premium flex flex-col h-full overflow-hidden">
                        <CardHeader className="bg-primary-600 text-white flex flex-row items-center gap-3 py-4">
                            <div className="p-2 bg-white/20 rounded-xl text-white">
                                <Bot size={22} />
                            </div>
                            <div>
                                <CardTitle className="text-base text-white">Care Assistant Bot</CardTitle>
                                <p className="text-[10px] text-primary-100 font-semibold">Active | Instantly Answers Vitals, Bills, Appointments</p>
                            </div>
                        </CardHeader>
                        
                        {/* Messages Box */}
                        <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-4">
                            {chatMessages.map((msg, i) => (
                                <div
                                    key={i}
                                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div
                                        className={`flex items-start gap-2.5 max-w-[85%] ${
                                            msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                                        }`}
                                    >
                                        <div className={`p-2 rounded-full shrink-0 ${
                                            msg.sender === 'user' ? 'bg-primary-100 text-primary-700' : 'bg-white text-slate-500 border border-slate-100 shadow-sm'
                                        }`}>
                                            {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
                                        </div>
                                        <div className={`p-3 rounded-2xl shadow-soft text-xs whitespace-pre-line leading-relaxed ${
                                            msg.sender === 'user'
                                                ? 'bg-primary-600 text-white rounded-tr-none'
                                                : 'bg-white text-secondary-800 border border-slate-100 rounded-tl-none'
                                        }`}>
                                            <p>{msg.text}</p>
                                            <span className={`block text-[9px] mt-1 text-right ${
                                                msg.sender === 'user' ? 'text-primary-200' : 'text-secondary-400'
                                            }`}>
                                                {msg.time}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Quick Prompts */}
                        <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex flex-wrap gap-1.5">
                            {[
                                { label: '📅 Appointment Status', val: 'appointment' },
                                { label: '💰 Pending Bills', val: 'bill' },
                                { label: '🔬 Lab Reports', val: 'report' },
                                { label: '🚨 Emergency SOS', val: 'emergency' }
                            ].map((btn) => (
                                <button
                                    key={btn.val}
                                    onClick={() => handleSendMessage(btn.label)}
                                    className="text-[10px] font-bold bg-white text-secondary-700 border border-slate-200 hover:border-primary-400 px-2.5 py-1.5 rounded-full transition-colors shadow-sm"
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>

                        {/* Chat input footer */}
                        <div className="p-3 border-t border-slate-100 flex gap-2 bg-white">
                            <Input
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                placeholder="Type a message or click a prompt..."
                                className="flex-1 h-9 min-h-[36px]"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSendMessage();
                                }}
                            />
                            <Button onClick={() => handleSendMessage()} size="sm" className="h-9 shrink-0">
                                <Send size={14} />
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Right Column: Support Tickets & Creation Form (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                    
                    {/* Raise Ticket Form */}
                    <Card className="border-none shadow-premium">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <HelpCircle size={18} className="text-primary-600" />
                                Raise a Support Ticket / Report Problem
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmitTicket} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="md:col-span-2">
                                        <Input
                                            label="Issue Title"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="Briefly state the issue (e.g. Double Payment)"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-secondary-600 mb-1 block">Category</label>
                                        <select
                                            className="w-full border border-slate-200 rounded-lg h-10 px-3 text-sm focus:border-primary-500 focus:outline-none bg-white"
                                            value={category}
                                            onChange={(e) => setCategory(e.target.value)}
                                        >
                                            <option value="billing">Billing & Ledger</option>
                                            <option value="appointment">OPD Appointment</option>
                                            <option value="opd_token">OPD Token / Queue</option>
                                            <option value="lab">Lab Reports</option>
                                            <option value="pharmacy">Pharmacy / Medicine</option>
                                            <option value="technical">Technical Glitch</option>
                                            <option value="other">General Feedback</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs font-semibold text-secondary-600 mb-1 block">Priority</label>
                                        <div className="flex gap-2 mt-1">
                                            {['low', 'medium', 'high'].map((p) => (
                                                <button
                                                    type="button"
                                                    key={p}
                                                    onClick={() => setPriority(p)}
                                                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold capitalize border transition-all ${
                                                        priority === p
                                                            ? p === 'high'
                                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                                : p === 'medium'
                                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                                : 'bg-blue-50 text-blue-700 border-blue-200'
                                                            : 'bg-white text-secondary-600 border-slate-200 hover:bg-slate-50'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs font-semibold text-secondary-600 mb-1 block">Description of Problem</label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows="2"
                                            className="w-full border border-slate-200 rounded-lg p-2.5 text-xs focus:border-primary-500 focus:outline-none"
                                            placeholder="Describe details of the issue to help our staff resolve it..."
                                            required
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <Button type="submit" disabled={submitting} className="flex items-center gap-2 shadow-soft">
                                        {submitting ? 'Submitting...' : 'File Ticket Request'}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Ticket History */}
                    <Card className="border-none shadow-premium">
                        <CardHeader>
                            <CardTitle className="text-base">Your Active & Past Support Tickets</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                                {tickets.length === 0 ? (
                                    <div className="p-6 text-center text-sm text-secondary-400">
                                        No tickets raised yet. Your filed issues will appear here.
                                    </div>
                                ) : (
                                    tickets.map((tkt) => (
                                        <div key={tkt.id} className="p-4 hover:bg-slate-50 transition-colors">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="text-xs font-bold text-secondary-900 font-['Outfit']">#TK-{1000 + tkt.id}</span>
                                                    <span className="text-sm font-bold text-secondary-800">{tkt.title}</span>
                                                    <Badge variant="secondary" className="text-[9px] font-bold uppercase">{tkt.category}</Badge>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Badge variant={getPriorityBadgeVariant(tkt.priority)} className="text-[9px] font-bold uppercase">{tkt.priority}</Badge>
                                                    <Badge variant={getStatusBadgeVariant(tkt.status)} className="text-[9px] font-bold uppercase">{(tkt.status).replace('_', ' ')}</Badge>
                                                </div>
                                            </div>
                                            <p className="text-xs text-secondary-600 mt-2 bg-slate-50/50 p-2 border border-slate-100 rounded-lg">{tkt.description}</p>
                                            
                                            {/* Staff Reply */}
                                            {tkt.reply && (
                                                <div className="mt-3 p-3 bg-primary-50/50 border border-primary-100 rounded-xl flex items-start gap-2.5">
                                                    <Bot size={16} className="text-primary-600 mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] font-bold text-primary-700">Staff Response:</p>
                                                        <p className="text-xs text-secondary-700 mt-0.5 italic">"{tkt.reply}"</p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex justify-between items-center mt-3">
                                                <span className="text-[9px] text-secondary-400 font-bold">
                                                    Logged: {new Date(tkt.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                                {tkt.status !== 'resolved' && tkt.status !== 'closed' && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleResolveTicket(tkt.id)}
                                                        className="text-[10px] font-bold h-7 py-0 border-green-200 text-green-700 bg-green-50/30 hover:bg-green-50"
                                                    >
                                                        <CheckCircle size={10} className="mr-1" />
                                                        Mark as Resolved
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default HelpdeskPage;
