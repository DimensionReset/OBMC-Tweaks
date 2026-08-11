/*
    soft-corner.js || DimensionReset

    Rounds the corners of all container elements on the
    platform.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "soft-corner";

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

            const isEnabled = await getSettingValue("softCorners");

            if (isEnabled) {
				const style = document.createElement("style");
                
				style.textContent = `
					.panel, .-panel, .-panel_default, .-list_notification div, .-header_title_cont, .-dv_username {
						border-radius: 12px !important;
						overflow: hidden !important;
					}

					.imgs-grid-image, .modal-image > img {
						border-radius: 15px !important;
						overflow: hidden !important;
					}
				`;

				document.head.appendChild(style);
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