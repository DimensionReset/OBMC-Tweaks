/* 

	activity.js || DimensionReset

	This script manages the behavior of the "anticheatToggle" setting
	in "default-settings.js". It hooks itself onto the built-in
	anticheat function on the O.B. Digital platform, and monitors
	any changes in value writing.

*/

(function() {
	if (window.top !== window.self || window.__OB_ACTIVITY_LOADED__) return;
	window.__OB_ACTIVITY_LOADED__ = true;
	console.log("[activity.js] Initialized");

	async function initActivity() {
		const { getSetting } = await import(
			chrome.runtime.getURL("scripts/helper/storage-handler.js")
		);

		const anticheatOn = (await getSetting('anticheatToggle'))?.Value === true;
		if (!anticheatOn) return;

		if (typeof window.cheating_count === 'undefined') window.cheating_count = 0;

		let _cheating_count = window.cheating_count;
		Object.defineProperty(window, 'cheating_count', {
			get() { return _cheating_count; },
			set(value) {
				if (value > _cheating_count) {
					chrome.runtime.sendMessage({
						type: "cheat_notify",
						count: value,
						title: "Uh Oh!",
						message: `You've been detected cheating. Current count: ${value}`
					});
				}
				_cheating_count = value;
			},
			configurable: true
		});

		console.log("[activity.js] Cheat detection hook initialized");
	}

	if (document.readyState === 'complete') {
		console.log("[activity.js] Page already loaded, running init");
		initActivity();
	} else {
		console.log("[activity.js] Waiting for page load");
		window.addEventListener('load', initActivity);
	}
})();