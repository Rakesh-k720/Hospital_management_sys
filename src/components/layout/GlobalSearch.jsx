import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const GlobalSearch = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [q, setQ] = useState('');
    const [results, setResults] = useState(null);
    const [open, setOpen] = useState(false);

    const search = async (value) => {
        setQ(value);
        if (value.length < 2) {
            setResults(null);
            return;
        }
        try {
            const res = await API.get('/search', { params: { q: value } });
            setResults(res.data.data);
            setOpen(true);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="relative hidden md:block w-64 lg:w-96">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary-400" />
            <input
                type="text"
                value={q}
                onChange={(e) => search(e.target.value)}
                onFocus={() => q.length >= 2 && setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 200)}
                placeholder={t('common.search')}
                className="w-full bg-slate-100 rounded-full pl-10 pr-4 py-2 text-sm border-none focus:ring-2 focus:ring-primary-500"
            />
            {open && results && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-xl shadow-premium border border-slate-100 max-h-80 overflow-y-auto z-50 p-2 text-sm">
                    {results.patients?.map((p) => (
                        <button key={`p-${p.id}`} type="button" className="w-full text-left p-2 hover:bg-slate-50 rounded-lg" onClick={() => navigate('/admin/patients')}>
                            <span className="font-bold">{p.name}</span> <span className="text-secondary-400">Patient</span>
                        </button>
                    ))}
                    {results.doctors?.map((d) => (
                        <button key={`d-${d.id}`} type="button" className="w-full text-left p-2 hover:bg-slate-50 rounded-lg" onClick={() => navigate('/admin/doctors')}>
                            <span className="font-bold">{d.name}</span> <span className="text-secondary-400">{d.specialization}</span>
                        </button>
                    ))}
                    {results.tokens?.map((t, i) => (
                        <div key={i} className="p-2 text-secondary-600">{t.token_number} — {t.patient_name}</div>
                    ))}
                    {!results.patients?.length && !results.doctors?.length && !results.tokens?.length && (
                        <p className="p-2 text-secondary-400">No results</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
