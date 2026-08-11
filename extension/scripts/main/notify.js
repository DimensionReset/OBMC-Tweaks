/*
    notify.js || DimensionReset

    Reads the user's activities from the O.B Digital Platform API,
    saves them to local storage, and dispatches notification updates 
    to the extension background process.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "notify";

    // DO NOT TOUCH ANYTHING BELOW IF YOU DO NOT KNOW WHAT YOU'RE DOING

    // ==== VERIFY CHECKS ====
    const flagKey = `__OB_${fileName.toUpperCase()}_LOADED__`;
    if (window.top !== window.self || window[flagKey]) return;

    window[flagKey] = true;
    console.log(`[${fileName}] Initialized`);

    let helpers = {};

    // ==== HELPER FUNCTIONS ====
    function cleanText(str) {
        if (!str) return "";
        const doc = new DOMParser().parseFromString(str, "text/html");
        const text = doc.body.textContent || "";
        return text.replace(/\s+/g, " ").trim();
    }

    function getSettingValue(setting) {
        return new Promise((resolve) => {
            chrome.storage.local.get([setting], (result) => {
                resolve(result[setting]?.["Value"] ?? null);
            });
        });
    }

    async function loadHelper(helperName) {
        const urlString = (helperName.includes("/") ? helperName : `scripts/helper/${String(helperName)}.js`);
        const url = chrome.runtime.getURL(urlString);

        const retrievedModule = await import(url);

        const baseName = helperName.split('/').pop();
        const cleanKey = baseName.lastIndexOf('.') !== -1 ? baseName.slice(0, baseName.lastIndexOf('.')) : baseName;

        helpers[cleanKey] = retrievedModule;

        console.log(`[${fileName}] Module ${cleanKey} loaded successfully`);
    }

    async function loadPrereq(prereqList) {
        try {
            if (Array.isArray(prereqList)) {
                await Promise.all(prereqList.map(name => loadHelper(name)));
            } else {
                await loadHelper(prereqList);
            }
        } catch (error) {
            console.error(`[${fileName}] Module load failed:`, error);
        }
    }

    function fetchUpcomingActivitiesViaBackground(campusBase) {
        return new Promise((resolve) => {
            const currentRoute = typeof window.route !== 'undefined' ? window.route : '';
            const timer = typeof localStorage.getItem('timer') === 'string' ? localStorage.getItem('timer') : '';
            const basePath = window.location.pathname.replace(/\/home\/?$/i, '').replace(/\/$/, '');

            chrome.runtime.sendMessage({
                type: "fetch_api_activities",
                campusBase: campusBase,
                route: currentRoute,
                timer: timer,
                basePath: basePath
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error(`[${fileName}] Extension messaging error:`, chrome.runtime.lastError);
                    resolve([]);
                } else if (response && response.success && Array.isArray(response.activities)) {
                    resolve(response.activities);
                } else {
                    console.error(`[${fileName}] Background fetch returned error:`, response?.error);
                    resolve([]);
                }
            });
        });
    }

    // ==== INITIALIZATION ====
    async function init() {
        try {
            console.log(`[${fileName}] Starting init`);

            const hostname = window.location.hostname;
            const campusMatch = hostname.match(/^obmontessori[^.]*\.orangeapps\.ph$/i);
            if (!campusMatch) return;

            const campusDomain = campusMatch[0];
            const campusBase = `https://${campusDomain}`;
			const currentRoute = typeof window.route !== 'undefined' ? window.route : '';
			const timer = typeof localStorage.getItem('timer') === 'string' ? localStorage.getItem('timer') : '';

			chrome.storage.local.set({ 
				campusDomain: campusDomain,
				savedRoute: currentRoute,
				savedTimer: timer
			});

            // Load prerequisites
            await loadPrereq("romanizer");

            const notifEnabled = await getSettingValue("notifToggle");

            if (notifEnabled) {
                console.log(`[${fileName}] Fetching activities via Background Worker...`);
                const rawActivities = await fetchUpcomingActivitiesViaBackground(campusBase);

                const fromRoman = helpers["romanizer"]?.fromRoman || (str => str);

                const activities = rawActivities.map(act => {
                    let title = cleanText(act.title || "Activity");
                    let className = cleanText(act.class_name || "");

                    title = title.replace(/\b[MCDXLIV]+\b/gi, match => fromRoman(match));

                    const fullTitle = className ? `${className} - ${title}` : title;
                    const isSubmission = act.act_type === "Submission" || act.act_type === "Homework";

                    return {
                        id: String(act.id),
                        title: fullTitle,
                        act_type: act.act_type,
                        act_time: act.act_time,
                        isSubmission: isSubmission,
                        status: "ONGOING",
                        campus: campusDomain,
                        directLink: act.link ? `${campusBase}/${act.link.replace(/^\//, '')}` : null
                    };
                });

                console.log(`[${fileName}] Processed ${activities.length} activities from API`);

                chrome.storage.local.get({ savedActivities: [] }, () => {
                    const ongoingActivities = activities.filter(a => a.status === "ONGOING");

                    chrome.runtime.sendMessage({
                        type: "activity_notify",
                        activities: ongoingActivities
                    });

                    console.log(`[${fileName}] Sent activity_notify with ${ongoingActivities.length} ongoing activities`);

                    chrome.storage.local.set({ savedActivities: ongoingActivities }, () => {
                        console.log(`[${fileName}] Updated savedActivities. Total: ${ongoingActivities.length}`);
                    });
                });

                console.log(`[${fileName}] Conversion active`);
            } else {
                console.log(`[${fileName}] Setting is disabled or module missing`);
            }

        } catch (error) {
            console.error(`[${fileName}] Init failed:`, error);
        }
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();