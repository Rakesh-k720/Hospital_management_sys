import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSwitcher = ({ className = '' }) => {
    const { i18n, t } = useTranslation();
    const current = i18n.language?.startsWith('hi') ? 'hi' : 'en';

    const toggle = () => {
        const next = current === 'en' ? 'hi' : 'en';
        i18n.changeLanguage(next);
    };

    return (
        <button
            type="button"
            onClick={toggle}
            title={t('common.language')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-secondary-700 hover:bg-primary-50 hover:text-primary-700 transition-colors ${className}`}
        >
            <Languages size={14} />
            {current === 'en' ? 'हिं' : 'EN'}
        </button>
    );
};

export default LanguageSwitcher;
