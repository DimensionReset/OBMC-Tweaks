/*
    dark.js || DimensionReset

    Inverts all colors of all elements with some exceptions,
    creating an AMOLED look for the platform.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "dark";

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

            const isEnabled = ((await getSettingValue("darkToggle")) && (!location.href.includes(".pdf")));

            if (isEnabled) {
                document.documentElement.classList.add("dark-mode");

				const exceptions = [
					"img",
					"picture",
					"iframe",
					"video",
					"a .-icon_link",
					".-item_links .-tiny_btn img",
					"main.-page_wrapper::before",
					".ph-flag"
				];

				const style = document.createElement("style");

				style.textContent = `
					html.dark-mode { filter: invert(1) hue-rotate(180deg); }
					${exceptions.map(sel => `
						html.dark-mode ${sel}, html.dark-mode ${sel} * {
							filter: invert(1) hue-rotate(180deg) !important;
							background-color: inherit !important;
							color: inherit !important;
						}
					`).join("\n")}

					html.dark-mode .tooltip { background-color: rgba(0, 0, 0, 0) !important; }
					html.dark-mode .tooltip-arrow { background-color: rgba(0, 0, 0, 0) !important; border-bottom-color: white !important }
					html.dark-mode .tooltip-inner { background-color: rgba(0, 0, 0, 1) !important; }

					html.dark-mode .-icon_link .tooltip-inner { color: rgb(255,255,255) !important; filter: invert(1) hue-rotate(0deg) !important; }
					html.dark-mode .dropdown-toggle .tooltip-inner { color: rgb(255,255,255) !important; filter: invert(1) hue-rotate(0deg) !important; }

					html.dark-mode ul.-menu-container i.-w { background-color: rgba(0,0,0,0) !important; }
					html.dark-mode .-sidebar-menu {filter: invert(1) hue-rotate(180deg) !important; background-color: rgba(0,0,0,1) !important; color: inherit !important;}
					
					html.dark-mode .imgs-grid-modal .modal-inner .modal-image img { filter: invert(0) hue-rotate(0deg) !important; }
					html.dark-mode .modal-backdrop { filter: invert(1) hue-rotate(180deg) !important; }
					html.dark-mode .imgs-grid-modal { filter:    invert(1) hue-rotate(180deg) !important; }
				`;

                if (document.head) {
                    document.head.appendChild(style);
                } else {
                    document.documentElement.appendChild(style);
                }

                const vidObserver = new MutationObserver((mutations, obs) => {
                    const iconFixPath = chrome.runtime.getURL("images/video.jpg");
                    const vidIcon = document.querySelector(".-item_links .-tiny_btn img");
                    
                    if (vidIcon) {
                        if (vidIcon && vidIcon.src !== iconFixPath) {
                            vidIcon.src = iconFixPath;
                        }
                        obs.disconnect();
                    }
                });

                vidObserver.observe(document.documentElement, {
                    childList: true,
                    subtree: true
                });

            } else {
                console.log(`[${fileName}] Setting is disabled or module missing`);
            }

        } catch (error) {
            console.error(`[${fileName}] Init failed:`, error);
        }
    }

    init();
})();