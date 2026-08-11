/* 
    background.js || DimensionReset

    Handles notification creation and pushing. Previously
    loaded content scripts primarily.
*/

// ==== INITIALIZATIONS ==== 
const notifLinks = {};
const notifiedActivityIds = new Set();

let socket = null; // for discord RPC;
let socketNotifState = null; // for debug notifs RPC;

// setup alarms for fetching activities and sending periodic reminders safely without resetting timers on SW restart
chrome.alarms.get("activity_check", (alarm) => {
    if (!alarm) chrome.alarms.create("activity_check", { periodInMinutes: 30 });
});
chrome.alarms.get("send_reminder", (alarm) => {
    if (!alarm) chrome.alarms.create("send_reminder", { periodInMinutes: 120 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    switch (alarm.name) {
        case ("activity_check"): // pulls activities from orangeapps api
            fetchActivitiesFromBackground();
            break;

        case ("send_reminder"): // sends timed notification based on saved activities
            checkSavedActivities(true);
            break;

        default:
            break;
    }
});

// listens for other scripts to request chrome API stuff
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    switch (msg.type) {
        case "activity_notify":
            handleActivitiesNotification(msg.activities || []);
            break;

        case "fetch_api_activities":
            executeActivityFetch(msg.campusBase, msg.route, msg.timer, msg.basePath)
                .then(activities => sendResponse({ success: true, activities: activities }))
                .catch(err => sendResponse({ success: false, error: err.message }));

            return true;
    
        case "rpc_set_activity":
            sendToTrayApp(msg.payload);
            break;

        case "ping_tray_app":
            pingTrayApp((success) => sendResponse({ success }));
            return true;

        default:
            break;
    }
});

// when a notif is clicked, the tab for the corresponding link is opened
chrome.notifications.onClicked.addListener((notifId) => {
    const separatorIndex = notifId.indexOf("|");
    if (separatorIndex !== -1) {
        const link = notifId.substring(separatorIndex + 1);
        if (link) {
            chrome.tabs.create({ url: link });
            return;
        }
    }

    const link = notifLinks[notifId];
    if (link) {
        chrome.tabs.create({ url: link });
        delete notifLinks[notifId];
    }
});

// ==== HELPER FUNCTIONS ====
function connectToTrayApp() {
    chrome.storage.local.get(['discordRPC'], (data) => {
        if (data.discordRPC?.Value !== true) return;

        if (
            socket &&
            (socket.readyState === WebSocket.OPEN ||
                socket.readyState === WebSocket.CONNECTING)
        ) {
            if (socket.readyState === WebSocket.OPEN) {
                pingTrayApp();
            }
            return;
        }

        socket = new WebSocket("ws://localhost:8080");

        socket.onopen = () => {
            console.log("[background.js] Connected to Electron RPC Tray App, sending ping...");
            pingTrayApp();
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.ping && data.success) {
                    console.log("[background.js] Ping response received from tray app.");
                    if (socketNotifState !== "Connected") {
                        chrome.storage.local.get(['RPCNotifications'], (res) => { 
                            if (res.RPCNotifications?.Value === true) {
                                socketNotifState = "Connected";
                                createNotification("msg-" + Date.now(), "Discord RPC Connected", "Browser successfully bridged to app!");
                            }
                        });
                    }
                }
            } catch (err) {
                console.log("[background.js] Response from tray app:", event.data);
            }
        };

        socket.onclose = () => {
            if (socketNotifState !== "Disconnected") {
                chrome.storage.local.get(['RPCNotifications'], (res) => { 
                    if (res.RPCNotifications?.Value === true) {
                        socketNotifState = "Disconnected";
                        createNotification("msg-" + Date.now(), "Discord RPC Disconnected", "Bridge app has been shutdown.");
                    }
                });
            }
            socket = null;
            // check if user's rpc is enabled before auto retry
            chrome.storage.local.get(["discordRPC"], (res) => {
                if (res.discordRPC?.Value === true) {
                    setTimeout(connectToTrayApp, 3000);
                }
            });
        };

        socket.onerror = (err) => {
            if (socket) {
                if (socketNotifState !== "Disconnected") {
                    chrome.storage.local.get(['RPCNotifications'], (res) => { 
                        if (res.RPCNotifications?.Value === true) {
                            socketNotifState = "Disconnected";
                            createNotification("msg-" + Date.now(), "Discord RPC Disconnected", "Browser disconnected from bridge.");
                        }
                    });
                }
                socket.close();
            }
        };
    });
}

function disconnectFromTrayApp() {
    if (socket) {
        if (socketNotifState !== "Disconnected") {
            chrome.storage.local.get(['RPCNotifications'], (res) => { 
                if (res.RPCNotifications?.Value === true) {
                    socketNotifState = "Disconnected";
                    createNotification("msg-" + Date.now(), "Discord RPC Disconnected", "Browser disconnected from bridge.");
                }
            });
        }

        socket.onclose = null; // prevent retry loop
        socket.close();
        socket = null;
        
        console.log("[background.js] Disconnected from Electron RPC Tray App");
    }
}

function sendToTrayApp(data) {
    chrome.storage.local.get(['discordRPC'], (res) => {
        if (res.discordRPC?.Value !== true) return;

        // if worker woke up and socket is ready, send immediately
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify(data));
            return;
        }

        // if worker woke up and socket is closed/null, reconnect and transmit when ready
        connectToTrayApp();

        if (!socket) return;

        const handleOpen = () => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(data));
            }
        };

        if (socket.readyState === WebSocket.OPEN) {
            handleOpen();
        } else {
            socket.addEventListener("open", handleOpen, { once: true });
        }
    });
}

function pingTrayApp(callback) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
        if (callback) callback(false);
        return;
    }

    try {
        socket.send(JSON.stringify({ ping: true }));
        if (callback) callback(true);
    } catch (err) {
        if (callback) callback(false);
    }
}

// changes the interval between each timed reminder
function updateReminderInterval(minutes) { // update
    chrome.alarms.clear("send_reminder", () => {
        if (minutes > 0) {
            console.log("[background.js] setting reminder interval to: ", minutes);
            chrome.alarms.create("send_reminder", { periodInMinutes: minutes });
        }
    });
}

function cleanTextBg(str) {
    if (!str) return "";
    return str // thank GOD ai is a thing this would take forever normally
        .replace(/<[^>]*>/g, "")        // Strip HTML tags
        .replace(/&nbsp;/gi, " ")       // Non-breaking space
        .replace(/&amp;/g, "&")         // Ampersand
        .replace(/&lt;/g, "<")          // Less than
        .replace(/&gt;/g, ">")          // Greater than
        .replace(/&quot;/g, '"')        // Quotes
        .replace(/&#039;/g, "'")        // Apostrophe
        .replace(/&#39;/g, "'")         // Numeric apostrophe
        .replace(/&rsquo;/g, "'")       // Right single quote
        .replace(/&lsquo;/g, "'")       // Left single quote
        .replace(/&ndash;/g, "-")       // En-dash
        .replace(/&mdash;/g, "--")      // Em-dash
        .replace(/\s+/g, " ")           // Collapse multiple spaces
        .trim();
}

// helper to resolve an activity link without repeating logic
function getActivityLink(a, fallbackCampus = "") {
    if (a.directLink) return a.directLink;
    const campus = a.campus || fallbackCampus;
    if (!campus) return null;

    return a.isSubmission
        ? `https://${campus}/oa_school/classfeed/${a.id}`
        : `https://${campus}/oa_school/activity_taking/${a.id}`;
}

// for creating the notif displays using chrome API
function createNotification(id, title, message, link = null) {
    console.log("[background.js] attempting to create notification:", id, title);

    // Encode link directly into ID string to guarantee click handler access across SW restarts
    const fullId = link ? `${id}|${link}` : id;
    if (link) notifLinks[id] = link;

    chrome.notifications.create(
        fullId,
        {
            type: "basic",
            iconUrl: chrome.runtime.getURL("images/extension-logo.png"),
            title: title,
            message: message,
            priority: 2
        }
    );
}

// manages the data of activity and submission notifs
function handleActivitiesNotification(activities, isReminder = false) {
    chrome.storage.local.get(['notifToggle', 'notifiedIds'], ({ notifToggle, notifiedIds }) => {
        const enabled = notifToggle?.Value ?? false;
        if (!enabled) return;

        // restore notified ids from storage (handles MV3 service worker restarts)
        if (Array.isArray(notifiedIds)) {
            notifiedActivityIds.clear();
            notifiedIds.forEach(id => notifiedActivityIds.add(id));
        }

        // avoid repeated empty state notifs
        if (activities.length === 0 && !isReminder && notifiedActivityIds.has("none")) {
            return;
        }

        const targetActivities = isReminder 
            ? activities 
            : activities.filter(a => !notifiedActivityIds.has(a.id));

        // avoid duplicate notifs
        if (activities.length > 0 && targetActivities.length === 0 && !isReminder) {
            return;
        }

        if (!isReminder) {
            if (activities.length === 0) {
                notifiedActivityIds.add("none");
            } else {
                notifiedActivityIds.delete("none");
                targetActivities.forEach(a => notifiedActivityIds.add(a.id));
            }
            chrome.storage.local.set({ notifiedIds: Array.from(notifiedActivityIds) });
        }

        let title = "Hey! Here's your schoolwork...";
        let message = "";
        let link = null;

        if (targetActivities.length === 1) {
            const a = targetActivities[0];
            message = a.title;

            switch (a.status) {
                case "UPCOMING":
                    title = "Something's coming soon!";
                    break;

                case "ONGOING":
                    title = "You've got things to do!";
                    break;
            
                default:
                    title = "Hey! Here's your schoolwork...";
                    break;
            }

            link = getActivityLink(a);
        } else if (targetActivities.length === 0) {
            title = "All clear!";
            message = `Woohoo! You don't have anything due!`;
        } else {
            message = `You have ${targetActivities.length} activities due!`;
            const campus = targetActivities[0]?.campus;
            if (campus) {
                link = `https://${campus}/oa_school/home`;
            }
        }

        createNotification("msg-" + Date.now(), title, message, link);
    });
}

// checks the user's saved act data and runs the activity notification function
function checkSavedActivities(isReminder = false) {
    chrome.storage.local.get(['savedActivities', 'notifToggle'], (data) => {
        const enabled = data.notifToggle?.Value ?? false;
        if (!enabled) return; // don't run if user denied permission

        const activities = (data.savedActivities || []).filter(a => a.status === "ONGOING");
        handleActivitiesNotification(activities, isReminder);
    });
}

// handle API fetch requests from both background worker and content scripts
async function executeActivityFetch(campusBase, route = '', timer = '', basePath = '') {
    const payload = new URLSearchParams({
        f: 'getUpcomingActivities',
        route: route || '',
        all: 1,
        has_timer: timer || ''
    });

    const endpoints = [
        `${campusBase}/oa_school/Online_class/aMgt`,
        `${campusBase}/oa_school/elearning/Online_class/aMgt`,
        `${campusBase}/elearning/Online_class/aMgt`,
        basePath ? `${campusBase}${basePath}/Online_class/aMgt` : null,
        basePath ? `${campusBase}${basePath}/aMgt` : null,
        `${campusBase}/oa_school/aMgt`
    ].filter(Boolean);

    const uniqueEndpoints = [...new Set(endpoints)];

    for (const endpoint of uniqueEndpoints) {
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: payload,
                credentials: 'include'
            });

            if (!response.ok) continue;

            const text = await response.text();
            const trimmed = text.trim();

            if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) continue;

            const parsed = JSON.parse(trimmed);
            if (parsed && Array.isArray(parsed.activity)) {
                return parsed.activity;
            }
        } catch (err) {
            console.warn("[background.js] Background poll attempt failed:", err);
        }
    }
    throw new Error("All endpoints returned invalid responses or failed.");
}

async function fetchActivitiesFromBackground() {
    chrome.storage.local.get(['campusDomain', 'notifToggle', 'savedRoute', 'savedTimer'], async (data) => {
        const enabled = data.notifToggle?.Value ?? false;
        const campusDomain = data.campusDomain;

        if (!enabled || !campusDomain) return;

        const campusBase = `https://${campusDomain}`;

        try {
            // pass saved route and timer if available
            const rawActivities = await executeActivityFetch(
                campusBase, 
                data.savedRoute || '', 
                data.savedTimer || ''
            );

            const activities = rawActivities.map(act => {
                let title = cleanTextBg(act.title || "Activity");
                let className = cleanTextBg(act.class_name || "");
                const fullTitle = className ? `${className} - ${title}` : title;
                const isSubmission = act.act_type === "Submission" || act.act_type === "Homework";

                return {
                    id: String(act.id),
                    title: fullTitle,
                    act_type: act.act_type,
                    act_time: act.act_time,
                    isSubmission: isSubmission,
                    status: "ONGOING",
                    campus: campusDomain,
                    directLink: act.link ? `${campusBase}/${act.link.replace(/^\//, '')}` : null
                };
            });

            const ongoing = activities.filter(a => a.status === "ONGOING");
            handleActivitiesNotification(ongoing);
            chrome.storage.local.set({ savedActivities: ongoing });
        } catch (err) {
            console.warn("[background.js] Background poll attempt failed:", err);
        }
    });
}
    
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (
        changeInfo.status === "complete" &&
        tab.url &&
        /^https:\/\/[^.]+\.orangeapps\.ph\//i.test(tab.url)
    ) {
        chrome.scripting.executeScript({
            target: { tabId },
            files: [
                "scripts/main/notify.js"
            ]
        });
    }
});

// when the extension logo is clicked, open the settings
chrome.action.onClicked.addListener(async () => {
    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL("menu.html") });
    if (tabs.length > 0) { // menu already open, do nothing
        chrome.tabs.update(tabs[0].id, {active: true}); 
        return;
    }

    chrome.tabs.create({
        url: chrome.runtime.getURL("menu.html")
    });
});

// when the browser starts, notify activities
chrome.runtime.onStartup.addListener(() => {
    checkSavedActivities();
    fetchActivitiesFromBackground();
    connectToTrayApp();
});

// when the extension is installed for the first time
chrome.runtime.onInstalled.addListener(async () => {
    checkSavedActivities();
    fetchActivitiesFromBackground();
    connectToTrayApp();

    const manifest = chrome.runtime.getManifest();
    const result = await chrome.storage.local.get("last-changelog");
    const lastViewedLog = result["last-changelog"];

    if (lastViewedLog === manifest.version) {
        return; // if user has seen changelog already dont do anything
    }

    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL("changelog.html") });

    if (tabs.length > 0) { // changelog already open, do nothing
        chrome.tabs.update(tabs[0].id, {active: true}); 
        return;
    }

    chrome.tabs.create({
        url: chrome.runtime.getURL("changelog.html")
    });
});

// check for changes and update stuff accordingly
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.timedReminder) {
    const { oldValue, newValue } = changes.timedReminder;

    updateReminderInterval(newValue.Value);
  }

  if (changes.discordRPC) {
    const { oldValue, newValue } = changes.discordRPC;

    if (newValue.Value === true) {
        // initiate connection
        connectToTrayApp();
    } else {
        disconnectFromTrayApp();
    }
  }
});

// top level call for service worker wakeups
connectToTrayApp();