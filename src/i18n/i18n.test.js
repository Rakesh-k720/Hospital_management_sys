import { describe, it, expect } from 'vitest';
import i18n from './index';

describe('i18n', () => {
    it('loads English translations', () => {
        expect(i18n.t('app.name', { lng: 'en' })).toBe('LifeLine Hospital');
    });

    it('loads Hindi translations', () => {
        expect(i18n.t('app.name', { lng: 'hi' })).toContain('लाइफलाइन');
    });

    it('has billing keys in both languages', () => {
        expect(i18n.t('billing.payNow', { lng: 'en' })).toBe('Pay Now');
        expect(i18n.t('billing.payNow', { lng: 'hi' })).toBe('अभी भुगतान करें');
    });
});
