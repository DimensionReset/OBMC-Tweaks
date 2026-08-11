/*
    miniplayer.js || DimensionReset

    Plays the national anthem with a flag overlay.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "patriot";

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

            const isEnabled = await getSettingValue("patriotToggle");
            let started;

            if (isEnabled) {
                
                const anthem = document.createElement("audio");
				anthem.src = chrome.runtime.getURL("audio/ph-anthem.mp3");
				anthem.loop = true;
				anthem.volume = 0.5;
				anthem.preload = "auto";

                function startPatriotMode() {
                    if (started) return;
                    started = true;  
                    
                    // start anthem
                    anthem.play().catch(() => {
                        setTimeout(() => anthem.play().catch(() => {}), 200);
                    });

                    // render flag
                    setTimeout(() => { // delay so audio leads
                        const overlay = document.createElement("div");
                        Object.assign(overlay.style, {
                            position: "fixed",
                            top: "0",
                            left: "0",
                            width: "100%",
                            height: "100%",
                            backgroundImage: `url(${chrome.runtime.getURL("images/ph-flag.gif")})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                            zIndex: "999998",
                            opacity: "0", // start transparent
                            transition: "opacity 0.5s ease" // fade over 0.5s
                        });

                        // this is handled in separate line due to priority value being needed
                        // lets page be scrollable while flag is on-screen
                        overlay.style.setProperty("pointer-events", "none", "important");

                        overlay.classList.add("ph-flag");
                        document.body.appendChild(overlay);

                        // trigger fade in
                        requestAnimationFrame(() => {
                            overlay.style.opacity = "0.15";
                        });

                        document.documentElement.style.overflow = "auto";
                        document.body.style.overflow = "auto";

                    }, 250);
                }

				window.addEventListener("pointerdown", startPatriotMode, { once: true });
				window.addEventListener("keydown", startPatriotMode, { once: true });
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