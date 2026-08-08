/* 

	settings-handler.js || DimensionReset

	This script mainly handles rendering the default settings in the main html file.
	It converts the dictionary into:

	A. Switches
	B. Dropdowns

	Switches and dropdowns are also categorized by their "Category" key in their
	respective dictionaries. Alphanumerical priority.

*/

import { getAllSettings, setAllSettings } from "../helper/storage-handler.js";

document.addEventListener("DOMContentLoaded", async () => {
	let stored = await getAllSettings();
	let settings = structuredClone(DEFAULT_SETTINGS);

	if (stored && Object.keys(stored).length > 0) {
		Object.keys(DEFAULT_SETTINGS).forEach(key => {
			if (stored[key] && typeof stored[key].Value !== "undefined") {
				settings[key].Value = stored[key].Value;
			}
		});
	}

	await setAllSettings(settings);

	const container = document.querySelector("h1.fs-4").parentElement;
	container.querySelectorAll(".generated-setting").forEach(element => element.remove());

	const grouped = {};

	Object.keys(settings).forEach(key => {
		const data = settings[key];
		const category = data.Category || "General";

		if (!grouped[category]) grouped[category] = [];
		grouped[category].push({ key, data });
	});

	const sortedCategories = Object.keys(grouped).sort((a, b) =>
		a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
	);

	sortedCategories.forEach(category => {
		const categoryHeader = document.createElement("h1");
		categoryHeader.textContent = category;
		categoryHeader.classList.add(
			"text-muted",
			"fst-italic",
			"fs-5",
			"text-center",
			"container",
			"mx-auto",
			"my-3",
			"generated-setting"
		);

		container.appendChild(categoryHeader);

		// by category, alphabetical sorting
		grouped[category].sort((a, b) => {
			const aIsSwitch = typeof a.data.Value === "boolean";
			const bIsSwitch = typeof b.data.Value === "boolean";

			if (aIsSwitch !== bIsSwitch) {
				return aIsSwitch ? -1 : 1;
			}

			return a.data.Name.localeCompare(b.data.Name, undefined, {
				numeric: true,
				sensitivity: "base"
			});
		});

		grouped[category].forEach(({ key, data }) => {

			// toggles
			if (typeof data.Value === "boolean") {
				const wrapper = document.createElement("div");
				wrapper.classList.add("form-check", "form-switch", "mt-3", "w-75", "mx-auto", "my-2", "generated-setting");

				const input = document.createElement("input");
				input.classList.add("form-check-input");
				input.type = "checkbox";
				input.role = "switch";
				input.id = key;
				input.checked = data.Value;
				input.style.cursor = "pointer";

				input.setAttribute("data-bs-html", "true");
				input.setAttribute("data-bs-toggle", "tooltip");

				if (data.Description) {
					input.setAttribute("data-bs-title", data.Description);
					input.setAttribute("title", data.Description);
				}

				const label = document.createElement("label");
				label.classList.add("form-check-label");
				label.setAttribute("for", key);
				label.textContent = data.Name;

				input.addEventListener("change", async () => {
					settings[key].Value = input.checked;
					await setAllSettings(settings);
				});

				wrapper.appendChild(input);
				wrapper.appendChild(label);
				container.appendChild(wrapper);

			// dropdowns
			} else if (typeof data.Value === "string") {
				const wrapper = document.createElement("div");
				wrapper.classList.add("generated-setting", "w-75", "mx-auto", "my-3", "text-center");

				const label = document.createElement("label");
				label.classList.add("form-label");
				label.textContent = data.Name;

				const select = document.createElement("select");
				select.classList.add("form-select", "w-100", "mx-auto");
				select.style.cursor = "pointer";

				select.setAttribute("data-bs-html", "true");
				select.setAttribute("data-bs-toggle", "tooltip");

				if (data.Description) {
					select.setAttribute("data-bs-title", data.Description);
					select.setAttribute("title", data.Description);
				}

				data.Options.forEach(optionData => {
					const option = document.createElement("option");
					option.value = optionData.value;
					option.textContent = optionData.label;
					option.style.fontFamily = optionData.value;

					if (optionData.value === data.Value) option.selected = true;

					select.appendChild(option);
				});

				select.addEventListener("change", async () => {
					settings[key].Value = select.value;
					await setAllSettings(settings);
				});

				wrapper.appendChild(label);
				wrapper.appendChild(select);
				container.appendChild(wrapper);
			}
		});

		const hr = document.createElement("hr");
		hr.classList.add("w-50", "mx-auto");
		container.appendChild(hr);
	});

	// initialize tooltips
	const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
	tooltipTriggerList.forEach(element => {
		new bootstrap.Tooltip(element);
	});

	// dynamically update version number from manifest
	const versionElements = document.querySelectorAll(".extension-version");
	const manifest = chrome.runtime.getManifest();
	versionElements.forEach(el => {
		el.textContent = `Ver ${manifest.version}`;
	});

	await setAllSettings(settings);
});