/*
    class-optimize.js || DimensionReset

    Optimizes performance and layout structure for classroom grid images instantly.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "class-optimize";
    const targetClass = "-img_class";

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
                resolve(result[setting]?.["Value"] ?? result[setting] ?? null);
            });
        });
    }

    function optimizeImage(img) {
        if (img.getAttribute("loading") !== "lazy") {
            img.setAttribute("loading", "lazy");
            img.setAttribute("fetchpriority", "high");
            img.setAttribute("decoding", "async");
        }
    }

    function setupLazyLoading() {
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

        observer.observe(document.body || document.documentElement, {
            childList: true,
            subtree: true
        });

        console.log(`[${fileName}] Lazy loading and observer initialized for .${targetClass}`);
    }

    function scheduleLinkCleanup() {
        const removeLinks = () => {
            document.querySelectorAll("a.-icon_link i.oa_help").forEach(link => {
                const parentLi = link.closest("li");
                (parentLi || link).remove();
            });

            console.log(`[${fileName}] Help button RIGHTFULLY removed.`);
        };

        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", removeLinks, { once: true });
        } else {
            queueMicrotask(removeLinks);
        }
    }

    // ==== INITIALIZATION ====
    async function init() {
        try {
            console.log(`[${fileName}] Starting init`);

            const isEnabled = await getSettingValue("classListOptimizations");

            if (isEnabled) {
                console.log(`[${fileName}] Immediate image performance boosts active.`);

                const style = document.createElement("style");
                style.textContent = `
                    .-img_class {
                        aspect-ratio: 16 / 9 !important;
                        object-fit: cover !important;
                        width: 100% !important;
                        height: auto !important;

                        contain: layout style paint !important;
                        will-change: transform !important;
                    }
                `;

                if (document.head) {
                    document.head.appendChild(style);
                } else {
                    document.documentElement.appendChild(style);
                }

                scheduleLinkCleanup();
                setupLazyLoading();

            } else {
                console.log(`[${fileName}] Optimization disabled or setting structural wrapper missing.`);
            }

        } catch (error) {
            console.error(`[${fileName}] Init failed:`, error);
        }
    }

    init();
})();