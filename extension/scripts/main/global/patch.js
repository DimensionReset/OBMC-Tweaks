/* 
	patch.js || DimensionReset

	This script patches most underlying, insignificant
	problems in the O.B. Digi.
*/

(function() {
	// ==== CONFIG ====
	const fileName = "patch";

	// DO NOT TOUCH ANYTHING BELOW IF YOU DO NOT KNOW WHAT YOU'RE DOING

    // ==== VERIFY CHECKS ====
    const flagKey = `__OB_${fileName.toUpperCase()}_LOADED__`;
    if (window.top !== window.self || window[flagKey]) return;

    window[flagKey] = true;
    console.log(`[${fileName}] Initialized`);

	let helpers = {}

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
			// ASSESSMENT BLUR PATCH
			if (await getSettingValue("darkToggle") && window.location.pathname.includes('/oa_school/activity_taking/')) {
				console.log(`[${fileName}] Dark mode enabled, fixing assessment background blur artifact`);

				const blurFix = document.createElement("style");

				blurFix.textContent = ".-fig:has(img.-img_activity) {filter: blur(62.5px) !important}";
				
				document.head.appendChild(blurFix);
			} else {
				console.log(`[${fileName}] Dark mode blur patch skipped`)
			}

			console.log(`[${fileName}] Init finished`);

		} catch (error) {
			console.error(`[${fileName}]  Init failed:`, error);
		}
	}

	init();
})();