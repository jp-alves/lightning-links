// lib/i18n.js - Translations. English is the source text in the code and markup, so English users
// load nothing extra; any other language loads only its own locales/<code>.js (see init.js).
(function (root) {
    'use strict';

    // English first, then the others in the order of their native names
    const LANGUAGES = [
        ['en', 'English'],
        ['de', 'Deutsch'],
        ['es-MX', 'Español (México)'],
        ['fr', 'Français'],
        ['it', 'Italiano'],
        ['pl', 'Polski'],
        ['pt-BR', 'Português (Brasil)'],
        ['ro', 'Română'],
        ['tr', 'Türkçe'],
        ['ru', 'Русский'],
        ['ar', 'العربية'],
        ['ja', '日本語'],
        ['zh-CN', '简体中文']
    ];

    let strings = {};

    // Settings can come from an imported file: only known codes ever reach a script path
    function resolve(code) {
        return LANGUAGES.some(([c]) => c === code) ? code : 'en';
    }

    // pt-PT gets Português (Brasil), es-ES gets Español (México): closest language, else English
    function fromBrowser(tag) {
        const base = String(tag).split('-')[0].toLowerCase();
        const match = LANGUAGES.find(([code]) => code.split('-')[0].toLowerCase() === base);
        return match ? match[0] : 'en';
    }

    // A language's flag, from one image (icons/flags.webp) holding them in LANGUAGES order.
    // An image because Windows has no flag emoji: it would show letters instead.
    function flag(code) {
        const node = document.createElement('span');
        node.className = 'flag';
        node.setAttribute('aria-hidden', 'true');
        node.style.setProperty('--flag', LANGUAGES.findIndex(([c]) => c === code));
        return node;
    }

    function setStrings(table) {
        strings = table;
    }

    // t('Its {n} links', { n: 3 }): the English text is the key, and the fallback
    function t(key, params) {
        const text = strings[key] ?? key;
        return params ? text.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match) : text;
    }

    // Translates the page's static text. Runs before any user data is rendered.
    function translate(body) {
        if (!Object.keys(strings).length) return;
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            const node = walker.currentNode;
            const key = node.nodeValue.trim();
            if (key && strings[key]) node.nodeValue = node.nodeValue.replace(key, () => strings[key]);
        }
        ['title', 'aria-label', 'placeholder'].forEach(attr => {
            body.querySelectorAll(`[${attr}]`).forEach(el => {
                const value = strings[el.getAttribute(attr)];
                if (value) el.setAttribute(attr, value);
            });
        });
    }

    const api = { LANGUAGES, resolve, fromBrowser, flag, setStrings, t, translate };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).i18n = api;
})(typeof self !== 'undefined' ? self : this);
