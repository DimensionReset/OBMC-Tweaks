/*
    force-rmb.js || DimensionReset

    Forces the right mouse button to display its context
    menu on all pages EXCEPT for assessments.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "force-rmb";

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
                resolve(result[setting]["Value"] ?? null);
            });
        });
    }

    // ==== INITIALIZATION ====
    async function init() {
        try {
            console.log(`[${fileName}] Starting init`);

            const isEnabled = ((await getSettingValue("rmbToggle")) && (!location.href.includes("/activity_taking")));

            if (isEnabled) {
                const style = document.createElement("style");

				style.textContent = `
					* {
						-webkit-user-select: text !important;
						-moz-user-select: text !important;
						-ms-user-select: text !important;
						user-select: text !important;
						pointer-events: auto !important;    
					}
				`;

				document.head.appendChild(style);
				document.querySelectorAll("*[oncontextmenu]").forEach(element => element.removeAttribute("oncontextmenu"));
				document.addEventListener("contextmenu", event => event.stopPropagation(), true);
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