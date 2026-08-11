/*
    custom-bg.js || DimensionReset

    Updates the background of the site to the uploaded custom
    file.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "custom-bg";

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

            const backgroundValue = await getSettingValue("customBackground");
            const isEnabled = (backgroundValue != null);

            const isDark = await getSettingValue("darkToggle");
            const isBlur = await getSettingValue("blurBackground");
            const isGrayscale = await getSettingValue("grayscaleBackground");

            console.log(`[${fileName}] Changing BG`);

            if (isEnabled) {
                const style = document.createElement("style");

				style.textContent = `
					main.-page_wrapper::before {
						content: "";
						position: fixed;
						inset: 0;
						z-index: -1;
						background-image: url("${(!window.location.pathname.includes('/oa_school/activity_taking/') ? backgroundValue : "")}");
						background-size: cover;
						background-position: center;
						background-repeat: no-repeat;
						pointer-events: none;
						filter:
							blur(${isBlur || 0}px)
							${!isGrayscale && isDark ? "invert(1) hue-rotate(180deg)" : ""};
					}

					main.-page_wrapper {
						background-color: rgba(255, 255, 255, 0) !important;
						position: relative;
					}

					.-sidebar-menu {
						position: relative;
						z-index: 1;
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