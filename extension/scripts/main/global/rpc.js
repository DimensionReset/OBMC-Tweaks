/* 
    rpc.js || DimensionReset

    This script handles changing Discord Rich Presence
    data.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "rpc";

    // DO NOT TOUCH ANYTHING BELOW IF YOU DO NOT KNOW WHAT YOU'RE DOING

    // ==== VERIFY CHECKS ====
    const flagKey = `__OB_${fileName.toUpperCase()}_LOADED__`;
    if (window.top !== window.self || window[flagKey]) return;

    window[flagKey] = true;
    console.log(`[${fileName}] Initialized`);

    // ==== HELPER FUNCTIONS ====
    function getSettingValue(setting) {
        return new Promise((resolve) => {
            chrome.storage.local.get([setting], (result) => {
                resolve(result[setting]?.["Value"] ?? null);
            });
        });
    }

    function getSessionTimestamp() {
        const key = `__OB_${fileName.toUpperCase()}_START_TIME__`;
        let startTime = sessionStorage.getItem(key);
        if (!startTime) {
            startTime = Date.now();
            sessionStorage.setItem(key, startTime);
        } else {
            startTime = Number(startTime);
        }
        return startTime;
    }

    function getPageTitle(url = window.location.href) {
        const match = url.match(/\/oa_school\/([^\/?#]+)/);
        if (!match) return '';

        return "Page - " + match[1]
            .split('_')
            .filter(Boolean)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }

    async function getSelectedLogo() {
        const useTweaks = await getSettingValue("RPCTweaksLogo");
        return useTweaks ? "tweaks-logo" : "obmc-logo";
    }

    // helper to wait for element content and avoid placeholders
    function waitForElement(selector, timeout = 5000) {
        return new Promise((resolve) => {
            const placeholders = ["???[...]", "???", "Loading...", "Loading", "Activity Title"];
            
            const isValid = (el) => {
                if (!el) return false;
                const text = el.textContent.trim();
                return text && !placeholders.includes(text);
            };

            const element = document.querySelector(selector);
            if (isValid(element)) {
                return resolve(element);
            }

            const observer = new MutationObserver((mutations, obs) => {
                const newElement = document.querySelector(selector);
                if (isValid(newElement)) {
                    obs.disconnect();
                    resolve(newElement);
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });

            // timeout to prevent infinite hang
            setTimeout(() => {
                observer.disconnect();
                resolve(document.querySelector(selector));
            }, timeout);
        });
    }

    async function updateDiscordPresence(sentPayload) {
        let payload = sentPayload;
        let currentPage = getPageTitle();

        if (!payload) {
            if (currentPage === '') {
                payload = {
                    details: "Logging In",
                    state: "Page - Login",
                    startTimestamp: getSessionTimestamp(),
                    largeImageKey: await getSelectedLogo(),
                    largeImageText: "O.B. Digital Platform"
                };
            } else if (currentPage === "Page - Index.php") {
                payload = {
                    details: "Logging Out",
                    state: "Page - None",
                    startTimestamp: getSessionTimestamp(),
                    largeImageKey: await getSelectedLogo(),
                    largeImageText: "O.B. Digital Platform"
                };
            } else {
                payload = {
                    details: "Viewing pages",
                    state: currentPage,
                    startTimestamp: getSessionTimestamp(),
                    largeImageKey: await getSelectedLogo(),
                    largeImageText: "O.B. Digital Platform"
                };
            }
        }

        chrome.runtime.sendMessage({
            type: 'rpc_set_activity',
            payload: payload
        });

        console.log(`[${fileName}] Sending new RPC change request`);
    }

    // ==== INITIALIZATION ====
    async function init() {
        try {
            const isEnabled = await getSettingValue("discordRPC");
            const shouldShowActName = await getSettingValue("RPCShowActivity");
            const shouldShowClassName = await getSettingValue("RPCShowClassfeed");

            if (isEnabled) {
                if (window.location.pathname.includes('/oa_school/activity_taking/')) {
                    const nameElement = await waitForElement("#activity_title");
                    const actName = nameElement ? String(nameElement.textContent).trim() : "???";

                    await updateDiscordPresence({
                        details: "Taking an activity",
                        state: shouldShowActName ? (actName || getPageTitle()) : getPageTitle(),
                        startTimestamp: getSessionTimestamp(),
                        largeImageKey: await getSelectedLogo(),
                        largeImageText: "O.B. Digital Platform"
                    });
                } else if (window.location.pathname.includes('/oa_school/classfeed') || window.location.pathname.includes('/oa_school/home')) {
                    const nameElement = await waitForElement(".-classname_title");
                    const className = nameElement ? String(nameElement.textContent).trim() : "???";

                    await updateDiscordPresence({
                        details: "Reading through posts",
                        state: (window.location.pathname.includes('/oa_school/home')) ? getPageTitle() : (shouldShowClassName ? (className || getPageTitle()) : getPageTitle()),
                        startTimestamp: getSessionTimestamp(),
                        largeImageKey: await getSelectedLogo(),
                        largeImageText: "O.B. Digital Platform"
                    });
                } else if (window.location.pathname.includes('/oa_school/dashboard')) {
                    await updateDiscordPresence({
                        details: "Checking personal tasks",
                        state: getPageTitle(),
                        startTimestamp: getSessionTimestamp(),
                        largeImageKey: await getSelectedLogo(),
                        largeImageText: "O.B. Digital Platform"
                    });
                } else {
                    await updateDiscordPresence();
                }
            }

            console.log(`[${fileName}] Init finished`);

        } catch (error) {
            console.error(`[${fileName}] Init failed:`, error);
        }
    }

    // ==== TIMER ACCURACY HANDLING ====
    let hiddenTimestamp = null;
    const sessionKey = `__OB_${fileName.toUpperCase()}_START_TIME__`;

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            hiddenTimestamp = Date.now();
        } else {
            if (hiddenTimestamp) {
                const awayDuration = Date.now() - hiddenTimestamp;
                let currentStart = Number(sessionStorage.getItem(sessionKey));
                if (currentStart) {
                    currentStart += awayDuration;
                    sessionStorage.setItem(sessionKey, currentStart);
                }
                hiddenTimestamp = null;
            }
            init();
        }
    });

    if (document.prerendering) {
        document.addEventListener('prerenderingchange', () => { init(); }, { once: true });
    } else {
        if (document.readyState === 'complete') {
            init();
        } else {
            window.addEventListener('load', init);
        }
    }
})();