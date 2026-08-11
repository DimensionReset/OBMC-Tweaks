/*
    anon.js || DimensionReset

    Obfuscates user's personal details including 
    names, dates, and profile pictures.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "anon";
    
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
        const tempStyle = document.createElement("style");
        tempStyle.textContent = `
            .-profile_image,
            .-birthday_img, 
            .-user_chatbox_image, 
            .-user_chat_image, 
            .-img_profile, 
            img.-submission_stud_img,
            .nav .dropdown-toggle.-s,
            .-profile_heading,
            .-lbl_username,
            .-title.-s,
            .-student_list p {
                opacity: 0 !important;
            }
        `;
        (document.head || document.documentElement).appendChild(tempStyle);

        try {
            console.log(`[${fileName}] Starting init`);

            await loadPrereq("anonymizer");
            const isEnabled = await getSettingValue("anonMode");

            if (isEnabled && helpers["anonymizer"]) {
                helpers["anonymizer"].collectRealNames();
                
                helpers["anonymizer"].anonymizeImages(document.body);
                helpers["anonymizer"].walkAndAnonymize(document.body);

                await helpers["anonymizer"].observeAnonymization(document.body);
                
                console.log(`[${fileName}] Conversion active`);
            } else {
                console.log(`[${fileName}] Setting is disabled or module missing`);
            }

        } catch (error) {
            console.error(`[${fileName}] Init failed:`, error);
        }

        tempStyle.remove();
    }

    if (!window.location.pathname.includes('/oa_school/online_class')) {
        init();
    } else {
        if (document.readyState === 'complete') {
            init();
        } else {
            window.addEventListener('load', init);
        }
    }
})();