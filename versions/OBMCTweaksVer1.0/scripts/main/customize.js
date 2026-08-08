/* 

	customize.js || DimensionReset

	This script handles almost all of the appearance settings
	in "default-settings.js". It primarily modifies the cosmetic
	appearance of windows. Additionally, it also creates mini-players.

*/

if (window.top !== window.self || window.__OB_TWEAKS_LOADED__) {
	console.warn("Skipping iframe or duplicate");
}

window.__OB_TWEAKS_LOADED__ = true;

if (!window.getAllSettings) window.getAllSettings = null;
if (!window.romanHelpers) window.romanHelpers = null;

let getAllSettings = window.getAllSettings;
let romanHelpers = window.romanHelpers;

// proprotionally resizable iframes
function makeIframeResizableTopRight(iframe, width = 300, height = 240, iframeId = "default") {
	const aspectRatio = width / height;

	const wrapper = document.createElement("div");
	Object.assign(wrapper.style, {
		position: "fixed",
		bottom: "20px",
		left: "20px",
		width: width + "px",
		height: height + "px",
		border: "1px solid #ccc",
		borderRadius: "12px",
		zIndex: "999999",
		overflow: "hidden",
		backgroundColor: "#000",
	});

	const handle = document.createElement("div");
	Object.assign(handle.style, {
		position: "absolute",
		top: "0",
		right: "0",
		width: "16px",
		height: "16px",
		cursor: "ne-resize",
		backgroundColor: "rgba(255,255,255,0.5)",
		zIndex: "1000000",
	});
	wrapper.appendChild(handle);

	iframe.style.width = "100%";
	iframe.style.height = "100%";
	iframe.style.border = "none";
	wrapper.appendChild(iframe);
	document.body.appendChild(wrapper);

	let isDragging = false; // bool to track whether to scale or not
	handle.addEventListener("mousedown", event => { // if mouse is down,
		isDragging = true; // begin scaling
		event.preventDefault();
		event.stopPropagation();
	});

	document.addEventListener("mousemove", event => {
		if (!isDragging) return; // stop scaling if mouse has stopped dragging
		resizeIframe(event.clientX - wrapper.getBoundingClientRect().left); // scaling in question
	});

	document.addEventListener("mouseup", () => {
		isDragging = false; // tell the other event listener to stop scaling the window
	});

	function resizeIframe(newWidth) {
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		const minWidth = Math.min(100, viewportWidth * 0.1);
		const minHeight = minWidth / aspectRatio;
		const maxWidth = Math.min(viewportWidth - 20, viewportHeight * aspectRatio);
		const maxHeight = Math.min(viewportHeight - 20, maxWidth / aspectRatio);

		newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
		let newHeight = newWidth / aspectRatio;
		newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

		wrapper.style.width = newWidth + "px";
		wrapper.style.height = newHeight + "px";

		chrome.storage.local.set({ [`iframeSize_${iframeId}`]: { width: newWidth, height: newHeight } });
	}

	window.addEventListener("resize", () => {
		const rect = wrapper.getBoundingClientRect();
		const viewportWidth = window.innerWidth;
		const viewportHeight = window.innerHeight;

		const maxWidth = Math.min(viewportWidth - 20, viewportHeight * aspectRatio);
		let newWidth = rect.width;
		if (rect.width > maxWidth) {
			newWidth = maxWidth;
		}
		resizeIframe(newWidth);
	});

	chrome.storage.local.get([`iframeSize_${iframeId}`], result => {
		if (result[`iframeSize_${iframeId}`]) {
			const { width, height } = result[`iframeSize_${iframeId}`];
			resizeIframe(width);
		}
	});
}

async function loadModules() {
	const storageModule = await import(chrome.runtime.getURL("scripts/helper/storage-handler.js")); // Extension storage helper functions
	getAllSettings = storageModule.getAllSettings;

	const romanModule = await import(chrome.runtime.getURL("scripts/helper/roman-numeral.js")); // Roman numeral conversion
	romanHelpers = romanModule;
}

async function init() {
	if (window.top !== window.self) return;

	await loadModules();

	const saved = typeof getAllSettings === "function" ? await getAllSettings() : null;
	if (!saved) return;

	// FONT HANDLING
	if (saved.selectedFont?.Value) {
		const style = document.createElement("style");
		style.textContent = `* { font-family: ${saved.selectedFont.Value} !important; }`;
		document.head.appendChild(style);
	}

	// LOFI / LOWFI MODES
	if (saved.lofiToggle?.Value) {
		const iframe = document.createElement("iframe");
		iframe.src = "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1";
		iframe.allow = "autoplay";

		// LOFI is resizable
		makeIframeResizableTopRight(iframe, 300, 240, "lofi");

	} else if (saved.lowfiToggle?.Value) {
		const iframe = document.createElement("iframe");
		iframe.src = "https://samirpaulb.github.io/music/embed";

		// LOWFI is fixed size, not resizable
		Object.assign(iframe.style, {
			position: "fixed",
			bottom: "20px",
			left: "20px",
			width: "300px",
			height: "215px",
			border: "none",
			borderRadius: "12px",
			zIndex: "999999",
		});
		document.body.appendChild(iframe);
	}

	// ROMAN NUMERAL HANDLING
	if (saved.romanToggle?.Value && !saved.anonMode?.Value) {
		romanHelpers.walkAndConvert(document.body);
		romanHelpers.observeMutations(document.body);
	}

	// FORCE RMB
	if (saved.rmbToggle?.Value) {
		const style = document.createElement("style");
		style.textContent = `
			* {
				-webkit-user-select: text !important;
				-moz-user-select: text !important;
				-ms-user-select: text !important;
				user-select: text !important;
				pointer-events: auto !important;
			}
		`;
		document.head.appendChild(style);
		document.querySelectorAll("*[oncontextmenu]").forEach(el => el.removeAttribute("oncontextmenu"));
		document.addEventListener("contextmenu", event => event.stopPropagation(), true);
	}

	// ANON MODE
	if (saved.anonMode?.Value) {
		const anonImage = chrome.runtime.getURL("images/anon-pfp.jpg");
		document.querySelectorAll(
			".-profile_image, .-birthday_img, .-user_chatbox_image, .-user_chat_image, .-img_profile"
		).forEach(img => img.src = anonImage);

		const realNames = new Set();
		document.querySelectorAll(".nav .dropdown-toggle.-s, .-profile_heading, .-lbl_username, .-title.-s").forEach(el => {
			const text = el.textContent.trim();
			if (text) realNames.add(text);
			el.textContent = "Anonymous";
		});

		function obfuscateText(text) {
			if (!text) return text;
			text = text.replace(/\d/g, "?");
			realNames.forEach(name => {
				const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
				text = text.replace(new RegExp(escaped, "gi"), "Anonymous");
			});
			return text;
		}

		function processTextNode(node) {
			if (node.nodeValue?.trim()) node.nodeValue = obfuscateText(node.nodeValue);
		}

		function walk(root) {
			const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
				acceptNode(node) {
					const p = node.parentNode;
					if (!p) return NodeFilter.FILTER_REJECT;
					if (["SCRIPT","STYLE","TEXTAREA","CODE","PRE"].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
					return NodeFilter.FILTER_ACCEPT;
				}
			});

			let node;
			const batch = [];
			while (node = walker.nextNode()) {
				batch.push(node);
				if (batch.length >= 50) {
					batch.forEach(processTextNode);
					batch.length = 0;
				}
			}
			batch.forEach(processTextNode);
		}

		walk(document.body);

		const observer = new MutationObserver(mutations => {
			const batch = [];
			for (const mutation of mutations) {
				for (const node of mutation.addedNodes) {
					if (node.nodeType === Node.TEXT_NODE) {
						batch.push(node);
					} else if (node.nodeType === Node.ELEMENT_NODE) {
						const walker = document.createTreeWalker(
							node,
							NodeFilter.SHOW_TEXT,
							{
								acceptNode(n) {
									const p = n.parentNode;
									if (!p) return NodeFilter.FILTER_REJECT;
									if (["SCRIPT","STYLE","TEXTAREA","CODE","PRE"].includes(p.tagName)) return NodeFilter.FILTER_REJECT;
									return NodeFilter.FILTER_ACCEPT;
								}
							}
						);
						let tn;
						while (tn = walker.nextNode()) batch.push(tn);
					}
				}
			}
			for (let i = 0; i < batch.length; i += 50) {
				batch.slice(i, i+50).forEach(processTextNode);
			}
		});

		observer.observe(document.body, { childList: true, subtree: true });
	}

	// DARK MODE
	if (saved.darkToggle?.Value) {
		document.documentElement.classList.add("dark-mode");

		const exceptions = [
			"img","picture","iframe","video",
			".-sidebar-menu",".-item_links .-tiny_btn img",".tooltip"
		];

		const style = document.createElement("style");
		style.textContent = `
			html.dark-mode { filter: invert(1) hue-rotate(180deg); }
			${exceptions.map(sel => `
				html.dark-mode ${sel}, html.dark-mode ${sel} * {
					filter: invert(1) hue-rotate(180deg) !important;
					background-color: inherit !important;
					color: inherit !important;
				}
			`).join("\n")}
			html.dark-mode .tooltip { background-color: rgba(0,0,0,0.3) !important; }
			html.dark-mode ul.-menu-container i.-w { background-color: rgba(0,0,0,0) !important; }
		`;
		document.head.appendChild(style);

		const vidIcon = document.querySelector(".-item_links .-tiny_btn img");
		if (vidIcon) vidIcon.src = chrome.runtime.getURL("images/video.jpg");
	}

	document.querySelectorAll("img.-img_activity").forEach(img => {
		const parent = img.closest("figure");
		if (parent) parent.style.filter = "blur(60px)";
	});

	console.log("%cOB Tweaks Enabled","color: green; font-family: sans-serif; font-size: 2.5em; font-weight: bolder; text-shadow: #000 1px 1px;");
}

init();