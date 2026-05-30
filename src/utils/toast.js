let listener = null;

export const subscribeToast = (fn) => {
    listener = fn;
    return () => { listener = null; };
};

export const showToast = (message, type = 'success') => {
    if (listener) listener({ message, type });
};
