import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export const activePlaceId = writable<number | null>(null);

// --- جديد: متجر لحفظ থيم الوضع الليلي ---
const storedTheme = browser ? localStorage.getItem('theme') : 'light';
export const theme = writable(storedTheme);

// عند تغيير الثيم، قم بحفظه في الـ localStorage
if (browser) {
    theme.subscribe(value => {
        localStorage.setItem('theme', value || 'light');
    });
}

