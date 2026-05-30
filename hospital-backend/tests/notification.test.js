describe('Notification phone formatting', () => {
    const formatPhone = (phone) => {
        const digits = String(phone || '').replace(/\D/g, '');
        if (digits.length === 10) return `+91${digits}`;
        if (digits.startsWith('91') && digits.length === 12) return `+${digits}`;
        return phone;
    };

    it('formats 10-digit Indian mobile', () => {
        expect(formatPhone('9876543210')).toBe('+919876543210');
    });

    it('keeps +91 prefix', () => {
        expect(formatPhone('919876543210')).toBe('+919876543210');
    });
});
