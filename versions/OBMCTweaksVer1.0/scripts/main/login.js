/* 

	login.js || DimensionReset

	This script manages the behavior of the "autoLogin" setting
	in "default-settings.js". It reads the log-in credentials
	of the user upon the first use of the log-in page with the
	extension install. It uses that info later to auto submit
	the form.

*/

(function() {
	if (window.top !== window.self || window.__OB_LOGIN_LOADED__) return;
	window.__OB_LOGIN_LOADED__ = true;
	console.log("[login.js] Initialized");

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

	// capture user login and save credentials
	async function captureLogin() {
		const form = await waitForSelector('#login_form');
		if (!form) return console.log("[login.js] No login form, skipping capture");

		console.log("[login.js] Attaching login capture");

		form.addEventListener('submit', () => {
			const username = form.querySelector('[name="username"]')?.value;
			const password = form.querySelector('[name="password"]')?.value;

			if (username && password) {
				chrome.storage.local.get(['autoLogin'], ({ autoLogin }) => {
					chrome.storage.local.set({
						savedUsername: username,
						savedPassword: password,
						autoLogin // preserve the existing object
					}, () => {
						console.log("[login.js] Credentials saved:", { username, password });
						console.log("[login.js] autoLogin currently:", autoLogin);
					});
				});
			}
		});
	}

	// attempt auto-login if enabled
	async function triggerAutoLogin() {
		console.log("[login.js] Checking autoLogin setting...");

		chrome.storage.local.get(
			['savedUsername', 'savedPassword', 'autoLogin'],
			async ({ savedUsername, savedPassword, autoLogin }) => {

				const isAutoLoginEnabled = autoLogin?.Value === true;
				console.log("[login.js] Storage retrieved:", {
					savedUsername,
					savedPassword,
					autoLogin,
					isAutoLoginEnabled
				});

				if (!isAutoLoginEnabled) {
					console.log("[login.js] Auto-login disabled. Stopping.");
					return;
				}

				if (!savedUsername || !savedPassword) {
					console.log("[login.js] Missing credentials. Stopping.");
					return;
				}

				const form = await waitForSelector('#login_form', 10000);
				if (!form) {
					console.log("[login.js] Login form not found.");
					return;
				}

				const usernameInput = form.querySelector('[name="username"]');
				const passwordInput = form.querySelector('[name="password"]');
				const loginButton = form.querySelector('[name="login_btn"], button[type="submit"]');

				if (!usernameInput || !passwordInput || !loginButton) {
					console.log("[login.js] Required elements missing.");
					return;
				}

				console.log("[login.js] Auto-login triggered");

				usernameInput.value = savedUsername;
				passwordInput.value = savedPassword;

				loginButton.click();
				console.log("[login.js] Login button clicked");
			}
		);
	}

	// initialize login logic
	function initLogin() {
		console.log("[login.js] Starting init");

		captureLogin();       // attach the form listener
		triggerAutoLogin();   // attempt auto-login if enabled

		console.log("[login.js] Init finished");
	}

	// run init after page is loaded
	if (document.readyState === 'complete') {
		console.log("[login.js] Page already loaded, running init");
		initLogin();
	} else {
		console.log("[login.js] Waiting for page load");
		window.addEventListener('load', initLogin);
	}
})();