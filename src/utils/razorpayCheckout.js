const loadRazorpayScript = () =>
    new Promise((resolve, reject) => {
        if (window.Razorpay) {
            resolve(window.Razorpay);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => resolve(window.Razorpay);
        script.onerror = () => reject(new Error('Failed to load Razorpay'));
        document.body.appendChild(script);
    });

export const openRazorpayCheckout = async ({ keyId, orderId, amount, currency, name, description, prefill, onSuccess, onFailure }) => {
    const Razorpay = await loadRazorpayScript();

    return new Promise((resolve, reject) => {
        const options = {
            key: keyId,
            amount,
            currency: currency || 'INR',
            name: name || 'LifeLine Hospital',
            description: description || 'Hospital bill payment',
            order_id: orderId,
            prefill: prefill || {},
            theme: { color: '#2563eb' },
            handler: (response) => {
                onSuccess?.(response);
                resolve(response);
            },
            modal: {
                ondismiss: () => {
                    onFailure?.(new Error('Payment cancelled'));
                    reject(new Error('Payment cancelled'));
                }
            }
        };

        const rzp = new Razorpay(options);
        rzp.on('payment.failed', (response) => {
            onFailure?.(response.error);
            reject(response.error);
        });
        rzp.open();
    });
};
