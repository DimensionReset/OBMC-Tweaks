/* 

	changelog-handler.js || DimensionReset

	This script updates the text content of changelog.html
    to include the corresponding version info.

*/

const manifest = chrome.runtime.getManifest();
const output = document.getElementById("changelog-content");

async function init() { // init wrapper to allow await via async

	if (output) {
		const response = await fetch(chrome.runtime.getURL("scripts/lists/changelog-content.json"));
		const CHANGELOG_CONTENT = await response.json();

		const content = CHANGELOG_CONTENT[manifest.version];

		if (content) {
			output.innerHTML = content;
		} else {
			output.innerHTML = "yo chat i think DimensionReset forgot to make the changelog 💔";
			console.warn("[changelog-handler.js] No changelog content found for", manifest.version);
		}

		for (const element of document.querySelectorAll(".extension-version")) {
			element.textContent = "Ver " + manifest.version;
		}

		for (const element of document.querySelectorAll(".extension-version-number")) {
			element.textContent = manifest.version;
		}

		// save last changelog viewed to stop changelog spam FINALLY!!!
        await chrome.storage.local.set({ "last-changelog": manifest.version });
	}	
}

init();