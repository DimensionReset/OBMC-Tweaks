// === MODULES ===
const { app, Tray, Menu, nativeImage } = require("electron");
const { WebSocketServer } = require("ws");
const DiscordRPC = require("discord-rpc");
const path = require("path");
const fs = require("fs");

// discord activity id
const CLIENT_ID = "1535620300086055012";

let tray = null;
let rpcConnected = false;
let rpc = null;

// helper to update context menu based on connection status
function updateTrayMenu() {
  if (!tray) return;

  const isAutoLaunch = app.isPackaged
    ? app.getLoginItemSettings().openAtLogin
    : false;

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `Status: ${rpcConnected ? "Connected" : "Disconnected"}`,
      enabled: false,
    },
    { type: "separator" },
    {
      label: "Start on System Startup",
      type: "checkbox",
      checked: isAutoLaunch,
      click: (menuItem) => {
        if (app.isPackaged) {
          app.setLoginItemSettings({
            openAtLogin: menuItem.checked,
            path: app.getPath("exe"),
          });
        }
      },
    },
    { type: "separator" },
    {
      label: "Shutdown RPC",
      click: () => app.quit(),
    },
  ]);
  tray.setContextMenu(contextMenu);
}

// === INITIALIZATION ===
DiscordRPC.register(CLIENT_ID);

function initDiscordRPC() {
  if (rpc) {
    try {
      rpc.destroy();
    } catch (e) {}
  }

  rpc = new DiscordRPC.Client({ transport: "ipc" });

  rpc.on("ready", () => {
    console.log("Connected to Discord Client!");
    rpcConnected = true;
    updateTrayMenu();
  });

  rpc.on("disconnected", () => {
    console.warn("Disconnected from Discord client. Retrying in 10s...");
    rpcConnected = false;
    updateTrayMenu();

    // retry connection every 10 seconds if can't connect to discord
    setTimeout(initDiscordRPC, 10000);
  });

  rpc.login({ clientId: CLIENT_ID }).catch((err) => {
    console.error("Failed to connect to Discord client:", err.message);
    rpcConnected = false;
    updateTrayMenu();

    // retry connection every 10 seconds if can't connect to discord
    setTimeout(initDiscordRPC, 10000);
  });
}

initDiscordRPC();

// hide app from mac dock
if (app.dock) app.dock.hide();

app.whenReady().then(() => {
  // enable auto start on first launch
  if (app.isPackaged) {
    const flagPath = path.join(app.getPath("userData"), ".autolaunch_set");
    if (!fs.existsSync(flagPath)) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath("exe"),
      });
      try {
        fs.writeFileSync(flagPath, "true");
      } catch (e) {}
    }
  }

  // create system tray icon
  const iconPath = path.join(__dirname, "logo-32.png");
  const icon = nativeImage.createFromPath(iconPath);
  tray = new Tray(icon);

  tray.setToolTip("OBMC Tweaks - RPC Bridge");
  updateTrayMenu();

  // start websocketserver
  const wss = new WebSocketServer({
    port: 8080,
    host: "127.0.0.1",
    verifyClient: (info, done) => {
      const origin = info.origin || info.req.headers.origin || "";
      done(origin === "chrome-extension://deakjdfjninnhlalcfcndffhdipadani"); // change this for testing purposes
    }
  });

  wss.on("connection", (ws) => {
    console.log("Browser extension connected!");

    ws.on("message", (message) => {
      try {
        const payload = JSON.parse(message.toString());
        console.log("Received payload from browser extension:", payload);

        // forward payload
        const data = payload.payload || payload;

        // handle ping request from extension
        if (data.ping === true) {
          ws.send(JSON.stringify({ success: true, ping: true }));
          return;
        }

        if (!rpcConnected || !rpc) {
          console.warn(
            "Cannot set activity: Discord RPC client is NOT connected."
          );
          return;
        }

        // clear activity if requested by extension
        if (data.clear) {
          rpc.clearActivity().catch(() => {});
          return;
        }

        // safely extract keys without risking undefined object evaluation
        const largeImg = data.largeImageKey || (data.assets && data.assets.large_image);
        const largeTxt = data.largeImageText || (data.assets && data.assets.large_text);
        const smallImg = data.smallImageKey || (data.assets && data.assets.small_image);
        const smallTxt = data.smallImageText || (data.assets && data.assets.small_text);

        const activity = {
          details: data.details || "Browsing OBMC",
          instance: false,
        };

        // remove empty strings
        if (data.state && String(data.state).trim() !== "") {
          activity.state = String(data.state).trim();
        }

        if (largeImg && String(largeImg).trim() !== "") activity.largeImageKey = String(largeImg).trim();
        if (largeTxt && String(largeTxt).trim() !== "") activity.largeImageText = String(largeTxt).trim();
        if (smallImg && String(smallImg).trim() !== "") activity.smallImageKey = String(smallImg).trim();
        if (smallTxt && String(smallTxt).trim() !== "") activity.smallImageText = String(smallTxt).trim();

        // prevent resetting elapsed time
        if (data.startTimestamp) {
          const ts = Number(data.startTimestamp);
          if (!isNaN(ts)) activity.startTimestamp = ts;
        }

        // optional clickable buttons support
        if (Array.isArray(data.buttons) && data.buttons.length > 0) {
          const validButtons = data.buttons.filter(
            (btn) => btn && btn.label && btn.url && btn.url.startsWith("http")
          );
          if (validButtons.length > 0) {
            activity.buttons = validButtons;
          }
        }

        rpc.setActivity(activity)
          .then(() => console.log("Successfully updated Discord status!"))
          .catch((err) => console.error("Failed to set activity:", err));

      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    });

    ws.on("close", () => {
      console.log("Browser extension disconnected");
      // clear activity when browser disconnects
      if (rpcConnected && rpc) {
        rpc.clearActivity().catch(() => {});
      }
    });
  });

  console.log("Tray app running on ws://localhost:8080");
});

// keep alive when windows are all closed
app.on("window-all-closed", (e) => {
  e.preventDefault();
});
