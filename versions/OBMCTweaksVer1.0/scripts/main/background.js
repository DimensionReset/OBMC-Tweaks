/* 

	background.js || DimensionReset

	Since content scripts cannot be loaded as modules and settings-handler
	is one, this script is primarily dedicated to initializing all
	psuedo-content scripts.

	It does have one alternative function, which is rendering notifications.

*/

const notifLinks = {}; // map to store notification IDs -> URLs

// keep track of activity IDs we have already notified
const notifiedActivityIds = new Set();

function createNotification(id, title, message, link = null) {
	console.log("[background.js] attempting to create notification:", id, title);

	if (link) notifLinks[id] = link;

	chrome.notifications.create(
		id,
		{
			type: "basic",
			iconUrl: chrome.runtime.getURL("images/extension-logo.png"),
			title: title,
			message: message,
			priority: 2
		},
		() => {
			if (chrome.runtime.lastError) {
				console.error("[background.js] notification error:", chrome.runtime.lastError.message);
			} else {
				console.log("[background.js] notification successfully created:", id);
			}
		}
	);
}

chrome.notifications.onClicked.addListener((notifId) => {
	const link = notifLinks[notifId];
	if (link) {
		chrome.tabs.create({ url: link });
		console.log("[background.js] Notification clicked, opening:", link);
		delete notifLinks[notifId];
	}
});

// helper function to handle notification creation for a list of activities
function handleActivitiesNotification(activities) {
	// filter out activities we have already notified
	const newActivities = activities.filter(a => !notifiedActivityIds.has(a.id));
	if (newActivities.length === 0) {
		console.log("[background.js] No new activities to notify.");
		return;
	}

	// mark them as notified
	newActivities.forEach(a => notifiedActivityIds.add(a.id));

	chrome.storage.local.get('notifToggle', ({ notifToggle }) => {
		const enabled = notifToggle?.Value ?? false;
		if (!enabled) {
			console.log("[background.js] notifToggle OFF, skipping notification");
			return;
		}

		let title = "Schoolwork Notice";
		let message = "";
		let link = null;

		if (newActivities.length === 0) {
			title = "Congratulations!";
			message = "You have no activities due as of the moment.";
		} else if (newActivities.length === 1) {
			message = newActivities[0].title;
			link = newActivities[0].link;
		} else {
			message = `You have ${newActivities.length} activities due!`;
			link = "https://obmontessorilaspinas.orangeapps.ph/oa_school/home";
		}

		createNotification("msg-" + Date.now(), title, message, link);
	});
}

// called at startup to check saved activities
function checkSavedActivities() {
	chrome.storage.local.get(['savedActivities', 'notifToggle'], (data) => {
		const enabled = data.notifToggle?.Value ?? false;
		if (!enabled) {
			console.log("[background.js] Startup: notifToggle OFF, skipping notifications");
			return;
		}

		const activities = (data.savedActivities || []).filter(a => a.status === "ONGOING");
		console.log("[background.js] Startup: found", activities.length, "ongoing activities");
		handleActivitiesNotification(activities);
	});
}

// listen for messages from content scripts
chrome.runtime.onMessage.addListener((msg) => {
	if (msg.type === "request_notify") {
		handleActivitiesNotification(msg.activities || []);
	}

	if (msg.type === "cheat_notify") {
		chrome.storage.local.get('notifToggle', ({ notifToggle }) => {
			const enabled = notifToggle?.Value ?? false;
			if (!enabled) return;

			createNotification(
				"cheat-" + Date.now(),
				"Uh Oh!",
				`You've been detected cheating. Current count: ${msg.count}`
			);
		});
	}
});

// inject scripts when tabs finish loading
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status === "complete" && tab.url && tab.url.includes("obmontessorilaspinas.orangeapps.ph")) {
		chrome.scripting.executeScript({
			target: { tabId },
			files: [
				"scripts/main/customize.js",
				"scripts/main/activity.js",
				"scripts/main/login.js",
				"scripts/main/notify.js"
			]
		});
	}
});

chrome.action.onClicked.addListener(() => {
	chrome.tabs.create({
		url: chrome.runtime.getURL("menu.html")
	});
});

// handle startup / reinstall
chrome.runtime.onStartup.addListener(() => {
	console.log("[background.js] onStartup triggered");
	checkSavedActivities();
});

chrome.runtime.onInstalled.addListener(() => {
	console.log("[background.js] onInstalled triggered");
	checkSavedActivities();
});