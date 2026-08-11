/* 

	auto-login.js || DimensionReset

	This script manages the behavior of the "autoLogin" setting
	in "default-settings.js". It reads the log-in credentials
	of the user upon the first use of the log-in page with the
	extension install. It uses that info later to auto submit
	the form.

*/

(function() {
	// ==== CONFIG ====
	const fileName = "auto-login";

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

	// wait for a selector to appear on the page
	function waitForSelector(selector, timeout = 5000) {
		return new Promise(resolve => {
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

    // ==== INITIALIZATION ====
    async function init() {
        try {
			// attempt init
			const isEnabled = await getSettingValue("autoLogin");
			console.log(`[${fileName}] Storage retrieved successfully.`);

			if (!isEnabled) {
				console.log(`[${fileName}] Automatic login disabled. Stopping.`);
				return;
			}

			const form = await waitForSelector('#login_form');
			if (!form) return console.log(`[${fileName}] No login form, returning.`);

			await loadPrereq("web-crypto");
			const cryptoKey = await helpers["web-crypto"].getOrCreateKey();

			// CAPTURE USER LOGIN
			console.log(`[${fileName}] Attaching login capture`);

			form.addEventListener('submit', async () => {
				const username = form.querySelector('[name="username"]')?.value;
				const password = form.querySelector('[name="password"]')?.value;

				if (username && password) {
					const encryptedUsername = await helpers["web-crypto"].encryptData(username, cryptoKey);
                    const encryptedPassword = await helpers["web-crypto"].encryptData(password, cryptoKey);

					chrome.storage.local.get(['autoLogin'], ({ autoLogin }) => {
						chrome.storage.local.set({
							savedUsername: encryptedUsername,
							savedPassword: encryptedPassword,
							autoLogin // preserve the existing object
						}, () => {
							console.log(`[${fileName}] Encrypted credentials saved successfully`);
						});
					});
				}
			});

			// LOAD AND FILL LOGIN

			// get login deets
			const storage = await chrome.storage.local.get(["savedUsername", "savedPassword"]);

			// extract the deets from the resulting object
			const savedUsername = await helpers["web-crypto"].decryptData(storage.savedUsername, cryptoKey);
			const savedPassword = await helpers["web-crypto"].decryptData(storage.savedPassword, cryptoKey);

			if (!savedUsername || !savedPassword) {
				console.log(`[${fileName}] Missing credentials. Stopping.`);
				return;
			}

			const usernameInput = form.querySelector('[name="username"]');
			const passwordInput = form.querySelector('[name="password"]');
			const loginButton = form.querySelector('[name="login_btn"], button[type="submit"]');

			if (!usernameInput || !passwordInput || !loginButton) {
				console.log(`[${fileName}] Required elements missing.`);
				return;
			}

			console.log(`[${fileName}] Auto-login triggered`);

			usernameInput.value = savedUsername;
			passwordInput.value = savedPassword;

			loginButton.click(); // attempt auto-login if enabled
			console.log(`[${fileName}] Login button clicked`);

			console.log(`[${fileName}] Starting init`);

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