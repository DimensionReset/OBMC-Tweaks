/* 
    class-favs.js || DimensionReset

    This script handles the class pinning feature
    on the class list page. This includes the creation
    of the icons and reorganization of the list.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "class-favs";

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

    function setPinnedClasses(pinned) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ pinnedClasses: pinned }, resolve);
        });
    }

    function getPinnedClasses() {
        return new Promise((resolve) => {
            chrome.storage.local.get(["pinnedClasses"], (result) => {
                resolve(result.pinnedClasses ?? []);
            });
        });
    }

    function waitForSelector(selector, timeout = 10000) {
        return new Promise((resolve) => {
            const start = Date.now();
            const interval = setInterval(() => {
                const element = document.querySelector(selector);
                if (element) {
                    clearInterval(interval);
                    resolve(element);
                } else if (Date.now() - start > timeout) {
                    clearInterval(interval);
                    resolve(null);
                }
            }, 50);
        });
    }

    async function waitForClassItems() {
        const container = await waitForSelector("#class_div", 10000);
        if (!container) return null;

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                const items = container.querySelectorAll(".-class_item");
                if (items.length) {
                    clearInterval(interval);
                    resolve(Array.from(items));
                }
            }, 50);

            setTimeout(() => resolve([]), 10000); // fallback
        });
    }

    async function injectFavButtons() {
        const classItems = await waitForClassItems();
        if (!classItems || !classItems.length) return;

        const pinned = await getPinnedClasses();

        classItems.forEach((item) => {
            const classId = item.getAttribute("data-id");
            let btn = item.querySelector(".-fav_btn");

            if (!btn) {
                btn = document.createElement("button");
                btn.className = "-fav_btn";
                btn.style =
                    "position:absolute; bottom:5px; right:5px; cursor:pointer; background:none; border:none; font-size:1.7em; color:#000000;";
                item.style.position = "relative";
                item.appendChild(btn);

                btn.addEventListener("click", async (e) => {
                    e.stopPropagation();
                    let pinnedList = await getPinnedClasses();
                    if (pinnedList.includes(classId))
                        pinnedList = pinnedList.filter((id) => id !== classId);
                    else pinnedList.push(classId);
                    await setPinnedClasses(pinnedList);

                    btn.innerHTML = pinnedList.includes(classId) ? "★" : "☆";
                    await reorderClasses(); // reorder after click
                });
            }

            btn.innerHTML = pinned.includes(classId) ? "★" : "☆";
        });
    }

    async function reorderClasses() {
        const classItems = await waitForClassItems();
        if (!classItems) return;

        const container = document.querySelector("#class_div");
        if (!container) return;

        const pinned = await getPinnedClasses();
        const pinnedItems = [];
        const unpinnedItems = [];

        classItems.forEach((item) => {
            const classId = item.getAttribute("data-id");
            if (pinned.includes(classId)) pinnedItems.push(item);
            else unpinnedItems.push(item);
        });

        // Remove all items and re-append in order
        classItems.forEach((item) => container.removeChild(item));
        pinnedItems.forEach((item) => container.appendChild(item));
        unpinnedItems.forEach((item) => container.appendChild(item));
    }

    function observeClassContainer() {
        const container = document.querySelector("#class_div");
        if (!container) return;

        const observer = new MutationObserver(() => injectFavButtons());
        observer.observe(container, { childList: true });
    }

    // ==== INITIALIZATION ====
    async function init() {
        try {
            console.log(`[${fileName}] Starting init`);

            const url = window.location.pathname;
            const isEnabled = (await getSettingValue("classFavorites")) === true;

            if (isEnabled && url.includes("/oa_school/online_class")) {
                await injectFavButtons();
                await reorderClasses(); // ensures sorting on page load
                observeClassContainer();
            } else {
                console.log(`[${fileName}] Setting is disabled or not on target URL`);
            }

        } catch (error) {
            console.error(`[${fileName}] Init failed:`, error);
        }
    }

    if (document.readyState === "complete") {
        init();
    } else {
        window.addEventListener("load", init);
    }
})();