/*
    class-multiple.js || DimensionReset

    Allows multiple classes to be loaded simultaneously.
    Checks for inputs on classfeed pages and checks for
    the feed name to update and verify id checks.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "class-multiple";
    
    // DO NOT TOUCH ANYTHING BELOW IF YOU DO NOT KNOW WHAT YOU'RE DOING

    // ==== VERIFY CHECKS ====
    const flagKey = `__OB_${fileName.toUpperCase()}_LOADED__`;
    if (window.top !== window.self || window[flagKey]) return;

    window[flagKey] = true;
    console.log(`[${fileName}] Initialized`);

    let helpers = {};

    // ==== HELPER FUNCTIONS ====
    function getSettingValue(setting) {
        return new Promise((resolve) => {
            chrome.storage.local.get([setting], (result) => {
                resolve(result[setting]["Value"] ?? null);
            });
        });
    }

	async function loadHelper(helperName) {
		const urlString = (helperName.includes("/") ? helperName : `scripts/helper/${String(helperName)}.js`)
		const url = chrome.runtime.getURL(urlString);

		const retrievedModule = await import(url);

		// "example.js"
		const baseName = helperName.split('/').pop();

		// "example"
		const cleanKey = baseName.lastIndexOf('.') !== -1 ? baseName.slice(0, baseName.lastIndexOf('.')) : baseName;

		// Assign to helpers using the clean key
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

    // ==== INITIALIZATION ==== 
    async function init() { 
        try { 

            console.log(`[${fileName}] Starting init`); 
            await loadPrereq("class-data"); 

            const isEnabled = await getSettingValue("classMultiple"); 
            const syncFiles = await getSettingValue("syncFiles");
            
            if (isEnabled && helpers["class-data"]) { 
                const url = window.location.pathname; 
                let cid = null; 
                
                // for class list page (online_class) 
                if (url.includes("/oa_school/online_class") || url.includes("/oa_school/user_profile")) { 
                    document.addEventListener('click', (event) => { 
                        const btn = event.target.closest('.-class_btn'); 
                        if (btn) { 
                            event.preventDefault(); 
                            event.stopPropagation(); 
                            event.stopImmediatePropagation(); 
                            const classItem = btn.closest('div.-class_item'); 
                            if (classItem) { 
                                cid = classItem.getAttribute('data-id'); 
                                chrome.storage.local.set({ [`current_class`]: cid }, () => { 
                                    console.log(`[${fileName}] Saved new current_class cid: ${cid}`); 
                                    helpers["class-data"].updateCurrentClass(cid, true); 
                                }); 
                            } 
                        } 
                    }, true); // true triggers capture phase to intercept jquery 
                    
                // for classfeed, class_activity, or class_document 
                } else if (url.includes("/oa_school/classfeed") || url.includes("/oa_school/class_activity") || url.includes("/oa_school/class_document")) { 
                    const existingCid = document.documentElement.getAttribute("data-tweaks-cid");

                    if (existingCid) { 
                        cid = existingCid; 
                        console.log(`[${fileName}] Got data attribute cid: ${cid}`); 
                    } else { 
                        const { current_class } = await chrome.storage.local.get(["current_class"]); 
                        cid = current_class; 
                        document.documentElement.setAttribute("data-tweaks-cid", cid); 
                        console.log(`[${fileName}] No DOM cid found, updating attribute to stored: ${cid}`); 
                    } 
                    
                    helpers["class-data"].updateCurrentClass(cid); 
                    console.log(`[${fileName}] Current class updated`); 

                    // monitor class file changes
                    if (url.includes("/oa_school/class_document") && syncFiles) {
                            const syncTargetClass = () => {
                            const activeCid = document.documentElement.getAttribute("data-tweaks-cid") || cid;
                            console.log(`[${fileName}] Document container activity. Syncing class layout for cid: ${activeCid}`);
                            helpers["class-data"].updateCurrentClass(activeCid);
                        };

                        // check for user clicks
                        document.addEventListener('click', (event) => {
                            if (event.target.closest('.-ul_docs, .-file_grid')) {
                                syncTargetClass();
                            }
                        }, true);

                        // check for list updates
                        const docObserver = new MutationObserver((mutations) => {
                            if (mutations.length > 0) {
                                syncTargetClass();
                            }
                        });

                        // target whole body for updates
                        docObserver.observe(document.body, {
                            childList: true,
                            subtree: true
                        });   
                    }

                    // check for when scrolling to bottom onclassfeed
                    if (url.includes("/oa_school/classfeed")) {
                        let scrollTimeout = null;
                        document.addEventListener('scroll', (event) => {
                            clearTimeout(scrollTimeout);
                            scrollTimeout = setTimeout(() => {
                                // calculate dist to bottom
                                const target = event.target === document ? document.documentElement : event.target;
                                const scrollableHeight = target.scrollHeight;
                                const currentScroll = target.clientHeight + target.scrollTop;

                                // 500px threshold
                                if (scrollableHeight - currentScroll <= 500 && !document.hidden) {
                                    // get and current set cid
                                    const activeCid = document.documentElement.getAttribute("data-tweaks-cid") || cid;
                                    console.log(`[${fileName}] Near bottom of page. Forcing layout sync for cid: ${activeCid}`);
                                    helpers["class-data"].updateCurrentClass(activeCid);
                                }
                            }, 100);
                        }, true); // capture phase to account for sub-elements
                    }

                    window.addEventListener('beforeunload', () => {
                        const leaveCid = document.documentElement.getAttribute("data-tweaks-cid");
                        if (leaveCid) {
                            chrome.storage.local.set({ current_class: leaveCid });
                        }

                         console.log(`[${fileName}] Leaving page, updating stored Cid: ${cid}`); 
                    });
                } 
                console.log(`[${fileName}] Multiple class tweak active`); 
            } else { 
                console.log(`[${fileName}] Setting is disabled or module missing`); 
            } 
        } catch (error) { 
            console.error(`[${fileName}] Init failed:`, error); 
        } 
    } 

    init();
})();