/*
    sidebar-collapse.js || DimensionReset

    Handles sidebar collapsing logic (THANK GOD FOR .checkVisibility() YES).
*/

(function() {
    // ==== CONFIG ====
    const fileName = "sidebar-collapse";

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

            const isEnabled = (await getSettingValue("sidebarToggle"));
            const sidebar = document.querySelector(".-sidebar-menu");

            if (isEnabled && sidebar && sidebar.checkVisibility()) {
                // style for turning off sidebar
                const upperNavbars = Array.from(document.getElementsByClassName("navbar-default"));
				const hideStyle = document.createElement("style");

				hideStyle.textContent = `
                    html {
                        scrollbar-color: rgba(255,255,255,0.5) rgba(0,0,0,1) !important;
                        scrollbar-width: auto !important;
                    }
                    .-page_wrapper {all: unset !important}
                    .-menu-container {display: none !important}
                    .-sidebar-menu {display: none !important}
				`;

                const collapseBtn = document.createElement("button");
                collapseBtn.type = "button";
                collapseBtn.id = "sidebarToggle";

                Object.assign(collapseBtn.style, {
                    position: "fixed",
                    top: "50%",
                    transform: "translateY(-50%)",
                    left: "75px",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    backgroundColor: "#ffffff",
                    border: "1px solid #d1d5db",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    "justify-content": "center",
                    zIndex: "1000",
                    outline: "none",
                    padding: "0"
                });

                const arrowSpan = document.createElement("span");
                arrowSpan.id = "sidebarArrow";
                arrowSpan.innerHTML = "&#10094;"; // left arrow (‹)
                arrowSpan.ariaHidden = true;
                arrowSpan.setAttribute("data-toggle", "tooltip");
                arrowSpan.setAttribute("data-original-title", "Toggle Sidebar");
                
                Object.assign(arrowSpan.style, {
                    fontSize: "13px",
                    lineHeight: "1",
                    color: "#333333",
                    userSelect: "none",
                    display: "inline-block",
                    transition: "transform 0.3s ease"
                });

                collapseBtn.appendChild(arrowSpan);

				// find sidebar container and append button
                let isCollapsed = false;
                sidebar.parentElement.appendChild(collapseBtn);

                // toggle event
                collapseBtn.addEventListener("click", () => {

                    // arrow flip
                    if (!isCollapsed) {
                        isCollapsed = true;
                        document.head.appendChild(hideStyle);
                        arrowSpan.style.transform = "rotate(180deg)";
                        collapseBtn.style.left = "25px";

                        for (const navbar of upperNavbars) {
                            navbar.classList.remove("navbar-default");
                        }
                    } else {
                        isCollapsed = false;
                        document.head.removeChild(hideStyle);
                        arrowSpan.style.transform = "rotate(0deg)";
                        collapseBtn.style.left = "75px";

                        for (const navbar of upperNavbars) {
                            navbar.classList.add("navbar-default");
                        }
                    }
                });
                
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