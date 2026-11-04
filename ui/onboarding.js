// ui/onboarding.js - First-run welcome: pick a language, then pick sites. Loaded only until it is finished.
(function (root) {
    'use strict';

    // [name, host, icon domain if the host has no icon of its own], most popular first
    const SITES = [
        ['Google', 'www.google.com'], ['YouTube', 'www.youtube.com'], ['Facebook', 'www.facebook.com'],
        ['Instagram', 'www.instagram.com'], ['ChatGPT', 'chatgpt.com'], ['WhatsApp', 'web.whatsapp.com', 'whatsapp.com'],
        ['Wikipedia', 'www.wikipedia.org'], ['X', 'x.com'], ['Reddit', 'www.reddit.com'],
        ['Amazon', 'www.amazon.com'], ['TikTok', 'www.tiktok.com'], ['Gmail', 'mail.google.com'],
        ['Netflix', 'www.netflix.com'], ['LinkedIn', 'www.linkedin.com'], ['Outlook', 'outlook.live.com'],
        ['Bing', 'www.bing.com'], ['Yahoo', 'www.yahoo.com'], ['Google Maps', 'maps.google.com'],
        ['Google Drive', 'drive.google.com'], ['Google Docs', 'docs.google.com'], ['Google Calendar', 'calendar.google.com'],
        ['Google Translate', 'translate.google.com'], ['Google Meet', 'meet.google.com'], ['Gemini', 'gemini.google.com'],
        ['Claude', 'claude.ai'], ['Copilot', 'copilot.microsoft.com', 'copilot.com'], ['Perplexity', 'www.perplexity.ai'],
        ['Telegram', 'web.telegram.org'], ['Discord', 'discord.com'], ['Pinterest', 'www.pinterest.com'],
        ['Threads', 'www.threads.com'], ['Snapchat', 'www.snapchat.com'], ['Quora', 'www.quora.com'],
        ['Tumblr', 'www.tumblr.com'], ['Twitch', 'www.twitch.tv'], ['Spotify', 'open.spotify.com'],
        ['Prime Video', 'www.primevideo.com'], ['Disney+', 'www.disneyplus.com'], ['HBO Max', 'www.hbomax.com'],
        ['Apple Music', 'music.apple.com'], ['SoundCloud', 'soundcloud.com'], ['Deezer', 'www.deezer.com'],
        ['Crunchyroll', 'www.crunchyroll.com'], ['Vimeo', 'vimeo.com'], ['IMDb', 'www.imdb.com'],
        ['eBay', 'www.ebay.com'], ['AliExpress', 'www.aliexpress.com'], ['Walmart', 'www.walmart.com'],
        ['Etsy', 'www.etsy.com'], ['Shein', 'www.shein.com'], ['Temu', 'www.temu.com'],
        ['IKEA', 'www.ikea.com'], ['Best Buy', 'www.bestbuy.com'], ['Target', 'www.target.com'],
        ['CNN', 'www.cnn.com'], ['BBC', 'www.bbc.com'], ['The New York Times', 'www.nytimes.com'],
        ['The Guardian', 'www.theguardian.com'], ['Reuters', 'www.reuters.com'], ['Bloomberg', 'www.bloomberg.com'],
        ['Forbes', 'www.forbes.com'], ['ESPN', 'www.espn.com'], ['The Weather Channel', 'weather.com'],
        ['Microsoft 365', 'www.microsoft365.com'], ['OneDrive', 'onedrive.live.com'], ['Dropbox', 'www.dropbox.com'],
        ['Notion', 'www.notion.so'], ['Slack', 'slack.com'], ['Zoom', 'zoom.us'],
        ['Trello', 'trello.com'], ['Canva', 'www.canva.com'], ['Figma', 'www.figma.com'],
        ['GitHub', 'github.com'], ['Stack Overflow', 'stackoverflow.com'], ['Medium', 'medium.com'],
        ['Duolingo', 'www.duolingo.com'], ['Coursera', 'www.coursera.org'], ['Udemy', 'www.udemy.com'],
        ['Khan Academy', 'www.khanacademy.org'], ['Booking.com', 'www.booking.com'], ['Airbnb', 'www.airbnb.com'],
        ['Tripadvisor', 'www.tripadvisor.com'], ['Expedia', 'www.expedia.com'], ['Uber', 'www.uber.com'],
        ['PayPal', 'www.paypal.com'], ['Steam', 'store.steampowered.com'], ['Epic Games', 'store.epicgames.com'],
        ['Roblox', 'www.roblox.com'], ['PlayStation', 'www.playstation.com', 'playstation.com'], ['Xbox', 'www.xbox.com'],
        ['Apple', 'www.apple.com'], ['Microsoft', 'www.microsoft.com'], ['DuckDuckGo', 'duckduckgo.com']
    ];

    // Shown first for each language: what is popular there but missing from the global list
    const LOCAL_SITES = {
        'de': [['Spiegel', 'www.spiegel.de'], ['Bild', 'www.bild.de'], ['Otto', 'www.otto.de'], ['GMX', 'www.gmx.net'], ['WEB.DE', 'web.de']],
        'es-MX': [['Mercado Libre', 'www.mercadolibre.com.mx'], ['El Universal', 'www.eluniversal.com.mx'], ['Liverpool', 'www.liverpool.com.mx'], ['Coppel', 'www.coppel.com']],
        'fr': [['Le Monde', 'www.lemonde.fr'], ['Leboncoin', 'www.leboncoin.fr'], ['Orange', 'www.orange.fr'], ['Cdiscount', 'www.cdiscount.com']],
        'it': [['Corriere della Sera', 'www.corriere.it'], ['la Repubblica', 'www.repubblica.it'], ['Subito', 'www.subito.it'], ['Libero', 'www.libero.it']],
        'pl': [['Allegro', 'allegro.pl'], ['Onet', 'www.onet.pl'], ['WP', 'www.wp.pl', 'wp.pl'], ['OLX', 'www.olx.pl']],
        'pt-BR': [['Mercado Livre', 'www.mercadolivre.com.br'], ['UOL', 'www.uol.com.br'], ['Globo', 'www.globo.com'], ['Shopee', 'shopee.com.br']],
        'ro': [['eMAG', 'www.emag.ro'], ['OLX', 'www.olx.ro'], ['Digi24', 'www.digi24.ro'], ['HotNews', 'hotnews.ro']],
        'tr': [['Trendyol', 'www.trendyol.com'], ['Hepsiburada', 'www.hepsiburada.com'], ['Sahibinden', 'www.sahibinden.com'], ['Hürriyet', 'www.hurriyet.com.tr']],
        'ru': [['Яндекс', 'ya.ru'], ['ВКонтакте', 'vk.com'], ['Mail.ru', 'mail.ru'], ['Ozon', 'www.ozon.ru'], ['Wildberries', 'www.wildberries.ru']],
        'ar': [['الجزيرة', 'www.aljazeera.net'], ['Noon', 'www.noon.com'], ['Anghami', 'www.anghami.com']],
        'ja': [['Yahoo! JAPAN', 'www.yahoo.co.jp'], ['楽天市場', 'www.rakuten.co.jp'], ['LINE', 'line.me'], ['Amazon.co.jp', 'www.amazon.co.jp']],
        'zh-CN': [['百度', 'www.baidu.com'], ['哔哩哔哩', 'www.bilibili.com'], ['淘宝', 'www.taobao.com'], ['微博', 'weibo.com'], ['知乎', 'www.zhihu.com'], ['京东', 'www.jd.com']]
    };

    const BRAND = 'Lightning Links';

    function sitesFor(language) {
        return (LOCAL_SITES[language] || []).concat(SITES);
    }

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function button(label, className, onClick) {
        const node = el('button', className, label);
        node.type = 'button';
        node.onclick = onClick;
        return node;
    }

    // opts: { language, onLanguage(code), onDone(sites) } — sites: [[name, host, icon]], empty when skipped
    function open({ language, onLanguage, onDone }) {
        const t = LL.i18n.t;
        const modal = el('div', 'modal');
        const sheet = el('div', 'modal-content sheet onboarding-sheet');
        sheet.setAttribute('role', 'dialog');
        sheet.setAttribute('aria-modal', 'true');
        sheet.setAttribute('aria-labelledby', 'onboarding-title');
        modal.style.display = 'flex';
        modal.appendChild(sheet);

        const chosen = new Set(); // in click order: that becomes their order on the grid. Kept when going back.

        const finish = (sites) => {
            modal.remove();
            onDone(sites);
        };

        // The app's icon and name, kept together on one line
        function brand() {
            const node = el('span', 'onboarding-brand');
            const logo = el('img');
            logo.src = 'icons/icon48.png';
            logo.alt = '';
            node.append(logo, BRAND);
            return node;
        }

        // title: what goes in the heading (text and nodes)
        function show(title, lead, body, footer, above = []) {
            const h2 = el('h2');
            h2.append(...title);
            h2.id = 'onboarding-title';
            const buttons = el('div', 'modal-buttons');
            buttons.append(...footer);
            sheet.replaceChildren(...above, h2, el('p', 'onboarding-lead', lead), body, buttons);
        }

        function showLanguages() {
            const list = el('div', 'onboarding-languages');
            LL.i18n.LANGUAGES.forEach(([code, name]) => {
                const choice = button(name, 'onboarding-choice', () => {
                    // The page reloads in the new language and comes back to this step
                    if (code !== language) onLanguage(code);
                });
                choice.lang = code;
                choice.prepend(LL.i18n.flag(code));
                choice.setAttribute('aria-pressed', String(code === language));
                list.appendChild(choice);
            });
            // The name sits at a different place in each language's sentence
            const [before, after] = t('Welcome to Lightning Links').split(BRAND);
            show([before, brand(), after], t('Choose your language.'), list, [
                button(t('Skip'), 'btn', () => finish([])),
                button(t('Next'), 'btn btn-primary', showSites)
            ]);
        }

        function showSites() {
            const count = el('span', 'onboarding-count');
            const updateCount = () => { count.textContent = t('{n} selected', { n: chosen.size }); };
            const list = el('div', 'onboarding-sites');
            sitesFor(language).forEach(site => {
                const [name, host, icon = host] = site;
                const choice = button('', 'onboarding-choice', () => {
                    const on = !chosen.has(site);
                    if (on) chosen.add(site);
                    else chosen.delete(site);
                    choice.setAttribute('aria-pressed', String(on));
                    updateCount();
                });
                choice.setAttribute('aria-pressed', String(chosen.has(site)));
                const img = el('img');
                img.src = `https://www.google.com/s2/favicons?domain=${icon}&sz=64`;
                img.alt = '';
                img.loading = 'lazy';
                img.decoding = 'async';
                img.onerror = () => { img.onerror = null; img.src = 'icons/icon48.png'; };
                const label = el('span', '', name);
                label.dir = 'auto'; // a Latin name inside Arabic still shortens at its end
                choice.append(img, label);
                list.appendChild(choice);
            });
            updateCount();
            const done = button(t('Finish'), 'btn btn-primary', () => finish([...chosen]));
            const back = button(t('Back'), 'btn', () => {
                showLanguages();
                sheet.querySelector('.btn-primary').focus();
            });
            show([t('Pick your favorite sites')], t('Click the ones you use. They become your first lightnings, and you can change them any time.'), list, [
                back,
                count,
                button(t('Skip'), 'btn', () => finish([])),
                done
            ], [brand()]);
            done.focus();
        }

        showLanguages();
        document.body.appendChild(modal);
        sheet.querySelector('.btn-primary').focus();
    }

    const api = { open, sitesFor, LOCAL_SITES };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else (root.LL = root.LL || {}).onboarding = api;
})(typeof self !== 'undefined' ? self : this);
