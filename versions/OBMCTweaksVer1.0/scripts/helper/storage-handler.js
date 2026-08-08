/* 

	storage-handler.js || DimensionReset

	This module script contains many helper functions
	for retrieving chrome extension storage data.

	In hindsight, it probably isn't necessary. But
	it's not like anyone else is gonna read this. Right..?

*/

export async function getSetting(key) {
	return new Promise(resolve => {
		chrome.storage.local.get([key], result => {
			resolve(result[key] ?? null);
		});
	});
}

export async function setSetting(key, value) {
	return new Promise(resolve => {
		chrome.storage.local.set({ [key]: value }, () => {
			resolve();
		});
	});
}

export async function getAllSettings() {
	return new Promise(resolve => {
		chrome.storage.local.get(null, result => {
			resolve(result);
		});
	});
}

export async function setAllSettings(settings) {
	return new Promise(resolve => {
		chrome.storage.local.set(settings, () => resolve());
	});
}