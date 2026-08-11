/*
    fastload.js || DimensionReset

    This script makes the platform load faster.
    Who would've guessed???

    Uses speculationrules to prerender/prefetch pages
    and optionally removes the default nprogress animations.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "fastload";

    // ==== VERIFY CHECKS ====
    const flagKey = `__OB_${fileName.toUpperCase()}_LOADED__`;
    if (window.top !== window.self || window[flagKey]) return;

    window[flagKey] = true;
    console.log(`[${fileName}] Initialized`);

    // ==== HELPER FUNCTIONS ====
    function getSettingValue(setting) {
        return new Promise((resolve) => {
            chrome.storage.local.get([setting], (result) => {
                const data = result[setting];
                resolve(data && typeof data === 'object' ? data["Value"] : data ?? null);
            });
        });
    }

    function optimizeImage(img) {
        if (img.getAttribute("loading") !== "lazy") {
            const rect = img.getBoundingClientRect();
            const isOnScreen = (
                rect.bottom > 0 &&
                rect.right > 0 &&
                rect.top < (window.innerHeight || document.documentElement.clientHeight) &&
                rect.left < (window.innerWidth || document.documentElement.clientWidth)
            );

            if (!isOnScreen) {
                img.setAttribute("loading", "lazy");
                img.setAttribute("decoding", "async");
            }
        }
    }

    function setupLazyLoading(targetClass) {
        const existingImages = document.querySelectorAll(`.${targetClass}`);
        existingImages.forEach(img => optimizeImage(img));

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList.contains(targetClass)) {
                            optimizeImage(node);
                        }
                        const nestedImages = node.querySelectorAll(`.${targetClass}`);
                        nestedImages.forEach(img => optimizeImage(img));
                    }
                });
            }
        });

        const targetNode = document.body || document.documentElement;
        if (targetNode) {
            observer.observe(targetNode, {
                childList: true,
                subtree: true
            });
            console.log(`[${fileName}] Lazy loading and observer initialized for .${targetClass}`);
        }
    }

    // ==== INITIALIZATION ====
    async function init() {
        try {
            console.log(`[${fileName}] Starting init`);

            const isEnabled = await getSettingValue("fastLoad");
            const keepAnims = await getSettingValue("keepAnims");
            const smartImgs = await getSettingValue("smartImgs");
            const lowDataMode = await getSettingValue("lowDataMode");

            if (isEnabled) {
                document.documentElement.classList.add("optimize-anims", "optimize-imgs");

                // Speculation rules configuration
                const specRules = document.createElement("script");
                specRules.type = "speculationrules";
                specRules.textContent = JSON.stringify({
                    "prefetch": [
                        {
                            "source": "document",
                            "where": {
                                "and": [
                                    { "href_matches": "https://*.orangeapps.ph/oa_school/*" },
                                    { 
                                        "not": { 
                                            "href_matches": "https://*.orangeapps.ph/*/logoutThisUser" 
                                        } 
                                    }
                                ]
                            },
                            "eagerness": "eager"
                        }
                    ],

                    "prerender": [
                        {
                            "source": "document",
                            "where": { 
                                "or": [
                                    { "href_matches": "https://*.orangeapps.ph/oa_school/home*" },
                                    { "href_matches": "https://*.orangeapps.ph/oa_school/online_class*" },
                                    { "href_matches": "https://*.orangeapps.ph/oa_school/calendar*" },
                                    { "href_matches": "https://*.orangeapps.ph/oa_school/class_activity*" },
                                    { "href_matches": "https://*.orangeapps.ph/oa_school/document*" },
                                ]
                            },
                            "eagerness": "immediate" 
                        }
                    ]
                });

                if (!lowDataMode) (document.head || document.documentElement).appendChild(specRules);

                // animation performance tweak
                if (!keepAnims) {
                    if (window.NProgress) {
                        window.NProgress.configure({ minimum: 0.99, trickle: false, speed: 0 });
                    }

                    const animOptimize = document.createElement("style");
                    animOptimize.id = "optimize-anims";
                    animOptimize.textContent = `
                        .optimize-anims *,
                        .optimize-anims *::before,
                        .optimize-anims *::after {
                            transition-duration: 0s !important;
                            animation-duration: 0s !important;
                        }

                        #nprogress {
                            display: none !important;
                            pointer-events: none !important;
                        }
                    `;
                    (document.head || document.documentElement).appendChild(animOptimize);
                }

                // optimize image rendering
                if (smartImgs) {
                    const imgOptimize = document.createElement("style");
                    imgOptimize.id = "optimize-imgs";
                    imgOptimize.textContent = `
                        .-logo_nav, .-image_post, .-header_img {
                            contain: layout style paint !important;
                            will-change: transform !important;
                        }
                    `;
                    (document.head || document.documentElement).appendChild(imgOptimize);

                    if (document.readyState === "loading") {
                        document.addEventListener("DOMContentLoaded", () => {
                            setupLazyLoading("-logo_nav");
                            setupLazyLoading("-image_post");
                        });
                    } else {
                        setupLazyLoading("-logo_nav");
                        setupLazyLoading("-image_post");
                    }
                }

            } else {
                console.log(`[${fileName}] Setting is disabled or module missing`);
            }

        } catch (error) {
            console.error(`[${fileName}] Init failed:`, error);
        }
    }

    init();
})();