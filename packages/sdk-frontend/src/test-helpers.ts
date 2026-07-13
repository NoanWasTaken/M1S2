export function clearLocalStorage(): void {
    if (typeof localStorage?.clear === 'function') {
        localStorage.clear();
        return;
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key) localStorage.removeItem(key);
    }
}
