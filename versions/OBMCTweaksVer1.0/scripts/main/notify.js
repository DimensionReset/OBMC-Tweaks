/* 

	notify.js || DimensionReset

	This script manages (some of) the behavior of the "notifToggle" 
	setting in "default-settings.js". It reads the activities of the
	user every time they access the O.B Digital Platform and saves it
	to a key. When the user reboots chrome, it reminds them of their
	due work.

	Additionally, this script may handle sending a notification
	whenever the "cheating_count" variable is detectedly incremented
	by the "activity.js" script. I lowk forgot what that did so idk :sob:

*/

(async function() {
	if (window.top !== window.self || window.__OB_NOTIFY_LOADED__) return;
	window.__OB_NOTIFY_LOADED__ = true;
	console.log("[notify.js] Initialized");

	async function waitForSelector(selector, timeout = 10000) {
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
			}, 100);
		});
	}

	async function waitForActivities(timeout = 10000) {
		return new Promise(resolve => {
			const start = Date.now();
			const interval = setInterval(() => {
				const elements = document.querySelectorAll(".-view_btn div");
				if (elements.length > 0) {
					clearInterval(interval);
					resolve(elements);
				} else if (Date.now() - start > timeout) {
					clearInterval(interval);
					resolve([]);
				}
			}, 100);
		});
	}

	async function initNotify() {
		const { getAllSettings } = await import(
			chrome.runtime.getURL("scripts/helper/storage-handler.js")
		);
		const { fromRoman } = await import(
			chrome.runtime.getURL("scripts/helper/roman-numeral.js")
		);
		const settings = await getAllSettings();

		// anticheat check on activity taking pages
		if (location.href.includes("/oa_school/activity_taking/")) {
			if (!settings.anticheatToggle.Value) return;

			console.log("[notify.js] On activity_taking page, monitoring completion...");

			const finishedElement = await waitForSelector(".activity-status.finished, .finished-message", 10000);
			if (finishedElement) {
				chrome.storage.local.get({ cheating_count: 0 }, ({ cheating_count }) => {
					const newCount = cheating_count + 1;
					chrome.storage.local.set({ cheating_count: newCount }, () => {
						console.log("[notify.js] Cheating count incremented:", newCount);
						chrome.runtime.sendMessage({
							type: "cheat_notify",
							count: newCount
						});
					});
				});
			}
			return;
		}

		if (!location.href.includes("/oa_school/home")) {
			console.log("[notify.js] Not on home page. Current URL:", location.href);
			return;
		}

		if (!settings.notifToggle.Value) {
			console.log("[notify.js] Notification toggle is OFF. Exiting.");
			return;
		}

		console.log("[notify.js] Waiting for activities...");
		const activityElements = await waitForActivities();

		const activities = Array.from(activityElements).map(activity => {
			const pid = activity.parentElement.dataset.pid;

			// get title
			let title = activity.querySelector("span")?.textContent || "Activity";

			// convert any roman numerals back to numbers
			title = title.replace(/\b[MCDXLIV]+\b/gi, match => fromRoman(match));

			// check if the activity element itself contains "Submission" (case-insensitive)
			const isSubmission = activity.textContent.toLowerCase().includes("submission");

			// choose link depending on the check
			const link = pid
				? isSubmission
					? `https://obmontessorilaspinas.orangeapps.ph/oa_school/classfeed/${pid}`
					: `https://obmontessorilaspinas.orangeapps.ph/oa_school/activity_taking/${pid}`
				: "https://obmontessorilaspinas.orangeapps.ph/oa_school/home";

			return {
				id: activity.parentElement.dataset.cid,
				title,
				link,
				status: activity.querySelector("strong")?.textContent.trim() || "UNKNOWN"
			};
		});

		console.log("[notify.js] Found", activities.length, "activities");

		chrome.storage.local.get({ savedActivities: [] }, (data) => {
			const ongoingActivities = activities.filter(a => a.status === "ONGOING");

			// always send request_notify, background will handle 0 / 1 / multiple
			chrome.runtime.sendMessage({
				type: "request_notify",
				activities: ongoingActivities
			});
			console.log("[notify.js] Sent request_notify with", ongoingActivities.length, "ongoing activities");

			chrome.storage.local.set({ savedActivities: ongoingActivities }, () => {
				console.log("[notify.js] Updated savedActivities. Total now:", ongoingActivities.length);
			});
		});
	}

	if (document.readyState === 'complete') {
		console.log("[notify.js] Page already loaded, running init");
		initNotify();
	} else {
		console.log("[notify.js] Waiting for page load");
		window.addEventListener('load', initNotify);
	}
})();