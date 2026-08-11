/* 
    settings-handler.js || DimensionReset

    This script mainly handles rendering the default-settings.js values in the main html
    file. It converts the dictionary into the specified input type.

    Inputs are categorized by their "Category" key in their respective dictionaries with
    alphanumerical priority. Dependencies can be applied.
*/

import { getAllSettings, setAllSettings } from "../helper/storage-handler.js";

document.addEventListener("DOMContentLoaded", async () => {
    const response = await fetch(chrome.runtime.getURL("scripts/lists/default-settings.json"));
    const DEFAULT_SETTINGS = await response.json();

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

    // DEPENDENCY SYSTEM
    const dependencyTable = DEFAULT_SETTINGS.dependencyTable || {};
    const settingElements = {};
    const dependencyContainers = {};

    Object.keys(settings).forEach(key => {
        const data = settings[key];
        if (key === "dependencyTable") return;

        const category = data.Category || "General";
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push({ key, data });
    });

    const sortedCategories = Object.keys(grouped).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

    // helper function for creating descriptions
    function createDescription(labelElement, descText, triggerElement, key) {
        const description = document.createElement("div");
        description.classList.add("custom-tooltip-description", "text-secondary", "fs-7", "mt-1", "ms-4", "me-4");

        // Prevent overflow from overlapping lower click targets when collapsed
        description.style.maxHeight = "0";
        description.style.opacity = "0";
        description.style.overflow = "hidden";
        description.style.transition = "max-height 0.25s ease, opacity 0.25s ease";

        description.innerHTML = descText || "";

        if (dependencyTable[key]) {
            const parents = Object.keys(dependencyTable[key]);
            if (parents.length) {
                const names = parents.map(parent => settings[parent]?.Name || parent).join(", ");
                description.innerHTML += `<br><span class="small text-warning fst-italic">(Dependencies: ${names})</span>`;
            }
        }

        let isHovering = false;
        let hideTimeout = null;

        function show() {
            if (hideTimeout) clearTimeout(hideTimeout);
            if (!isHovering) {
                description.style.maxHeight = description.scrollHeight + "px";
                description.style.opacity = "1";
                description.style.cursor = "text";
            }
        }

        function hide() {
            if (!isHovering) {
                hideTimeout = setTimeout(() => {
                    description.style.maxHeight = "0";
                    description.style.opacity = "0";
                    description.style.cursor = "default";
                }, 200);
            }
        }

        triggerElement.addEventListener("mouseenter", show);
        triggerElement.addEventListener("mouseleave", hide);
        triggerElement.style.cursor = "pointer";

        labelElement.addEventListener("click", () => { isHovering = false; show(); });
        labelElement.addEventListener("mouseenter", () => { isHovering = true; show(); });
        labelElement.addEventListener("mouseleave", () => { isHovering = false; hide(); });
        labelElement.style.userSelect = "none";
        labelElement.style.cursor = "help";

        description.addEventListener("mouseenter", () => { isHovering = true; show(); });
        description.addEventListener("mouseleave", () => { isHovering = false; hide(); });

        return description;
    }

    // helper function for calculating dependency tree depth
    function getDependencyDepth(key) {
        let depth = 0;
        let current = key;

        while (dependencyTable[current]) {
            const parents = Object.keys(dependencyTable[current]);
            if (!parents.length) break;

            depth++;
            current = parents[0];
        }

        return depth;
    }

    // helper function for asterisk indicators for dependent options
    function markAsDependent(wrapper, childKey) {
        const depth = getDependencyDepth(childKey);
        if (!depth) return;

        const label = wrapper.querySelector("label");

        if (label) {
            const indicator = document.createElement("span");
            indicator.textContent = " " + "*".repeat(depth);
            indicator.style.color = "#6c757d";
            indicator.style.marginLeft = "4px";

            label.appendChild(indicator);
        }
    }

    // helper function to build a structured DOM tree matching the prerequisite depths
    function wrapDependencies() {
        Object.keys(dependencyTable).forEach(childKey => {
            const childWrapper = settingElements[childKey];
            const parents = Object.keys(dependencyTable[childKey]);
            if (!childWrapper || !parents.length) return;

            const parentKey = parents[0];
            let parentWrapper = settingElements[parentKey];
            if (!parentWrapper) return;

            let depContainer = dependencyContainers[parentKey];
            if (!depContainer) {
                depContainer = document.createElement("div");
                depContainer.className = "generated-setting-dependencies w-100";
                parentWrapper.after(depContainer);
                dependencyContainers[parentKey] = depContainer;
            }

            const depth = getDependencyDepth(childKey);

            childWrapper.style.paddingLeft = `${depth * 1.5}rem`;

            depContainer.appendChild(childWrapper);
        });
    }

    // helper to show/hide dependent options
    function resolveDependencies() {
        Object.keys(dependencyTable).forEach(child => {
            const conditions = dependencyTable[child];
            const element = settingElements[child];
            if (!element) return;

            let visible = true;

            Object.keys(conditions).forEach(parent => {
                const expected = conditions[parent];
                const value = settings[parent]?.Value;

                if (expected === true) {
                    if (!value || value === "") visible = false;
                } else if (typeof expected === "string" && expected.startsWith("!")) {
                    const negatedValue = expected.slice(1);
                    if (value === negatedValue) {
                        visible = false;
                    }
                } else if (value !== expected) {
                    visible = false;
                }
            });

            element.style.display = visible ? "" : "none";
        });
    }

    // MAIN UI RENDERING
    sortedCategories.forEach(category => {
        const header = document.createElement("h1");
        header.textContent = category;
        header.className = "text-muted fst-italic fs-5 text-center container mx-auto my-3 generated-setting";
        container.appendChild(header);

        grouped[category].forEach(({ key, data }) => {

            // TOGGLES
            if (typeof data.Value === "boolean") {
                const wrapper = document.createElement("div");
                wrapper.className = "generated-setting w-75 mx-auto my-2";

                const checkContainer = document.createElement("div");
                checkContainer.className = "form-check form-switch";

                const input = document.createElement("input");
                input.type = "checkbox";
                input.className = "form-check-input";
                input.checked = data.Value;

                const label = document.createElement("label");
                label.className = "form-check-label";
                label.textContent = data.Name;

                input.addEventListener("change", async () => {
                    settings[key].Value = input.checked;
                    await setAllSettings(settings);
                    resolveDependencies();
                });

                checkContainer.append(input, label);
                wrapper.appendChild(checkContainer);

                if (data.Description) {
                    wrapper.append(createDescription(label, data.Description, input, key));
                }

                container.appendChild(wrapper);
                settingElements[key] = wrapper;
            }

            // COLOR PICKER
            else if (data.Type === "color") {
                const wrapper = document.createElement("div");
                wrapper.className = "generated-setting w-75 mx-auto my-3 text-center";

                const label = document.createElement("label");
                label.textContent = data.Name;

                const input = document.createElement("input");
                input.type = "color";
                input.value = data.Value;
                input.classList.add("form-control", "form-control-color", "w-50", "mx-auto");

                const reset = document.createElement("button");
                reset.textContent = "Reset";
                reset.className = "btn btn-sm btn-outline-secondary mt-2";
                reset.style.display = data.Value ? "inline-block" : "none";

                input.oninput = async () => {
                    settings[key].Value = input.value;
                    await setAllSettings(settings);
                    resolveDependencies();
                };

                reset.onclick = async () => {
                    settings[key].Value = DEFAULT_SETTINGS[key].Value;
                    await setAllSettings(settings);
                    input.value = DEFAULT_SETTINGS[key].Value;
                    resolveDependencies();
                };

                wrapper.append(label, input, reset);

                if (data.Description) {
                    wrapper.append(createDescription(label, data.Description, input, key));
                }

                container.appendChild(wrapper);
                settingElements[key] = wrapper;
            }

            // FILE UPLOAD
            else if (data.Type === "file") {
                const wrapper = document.createElement("div");
                wrapper.className = "generated-setting w-75 mx-auto my-3 text-center";

                const label = document.createElement("label");
                label.textContent = data.Name;

                const input = document.createElement("input");
                input.type = "file";
                input.accept = data.Accept || "*/*";
                input.classList.add("form-control", "w-50", "mx-auto");

                const preview = document.createElement("img");
                preview.classList.add("mx-auto", "mt-3", "w-25", "img", "img-thumbnail");
                preview.src = data.Value;
                preview.style.display = data.Value ? "block" : "none";

                const reset = document.createElement("button");
                reset.textContent = "Reset";
                reset.className = "btn btn-sm btn-outline-secondary mt-2";
                reset.style.display = data.Value ? "inline-block" : "none";

                function handleFile(file) {
                    const reader = new FileReader();

                    reader.onload = async element => {
                        settings[key].Value = element.target.result;
                        await setAllSettings(settings);

                        preview.src = element.target.result;
                        preview.style.display = "block";
                        reset.style.display = "inline-block";
                        input.value = "";

                        resolveDependencies();
                    };

                    reader.readAsDataURL(file);
                }

                input.onchange = element => {
                    const file = element.target.files[0];
                    if (file) handleFile(file);
                };

                reset.onclick = async () => {
                    settings[key].Value = "";
                    await setAllSettings(settings);

                    input.value = "";
                    preview.src = "";
                    preview.style.display = "none";
                    reset.style.display = "none";

                    resolveDependencies();
                };

                wrapper.ondragover = element => element.preventDefault();
                wrapper.ondrop = element => {
                    element.preventDefault();
                    if (element.dataTransfer.files[0]) {
                        handleFile(element.dataTransfer.files[0]);
                    }
                };

                wrapper.append(label, input, preview, reset);

                if (data.Description) {
                    wrapper.append(createDescription(label, data.Description, input, key));
                }

                container.appendChild(wrapper);
                settingElements[key] = wrapper;
            }

            // DROPDOWNS
            else if (typeof data.Value === "string" && data.Options) {
                const wrapper = document.createElement("div");
                wrapper.className = "generated-setting w-75 mx-auto my-3 text-center";

                const label = document.createElement("label");
                label.textContent = data.Name;

                const select = document.createElement("select");
                select.className = "form-select";

                data.Options.forEach(opt => {
                    const option = document.createElement("option");
                    option.value = opt.value;
                    option.textContent = opt.label;

                    if (opt.value === data.Value) option.selected = true;

                    if (typeof opt.value === "string") {
                        try {
                            const fontName = opt.value.split(",")[0].replace(/['"]/g, "").trim();

                            const prollyFont =
                                opt.value.includes(",") ||
                                opt.value.includes("'") ||
                                opt.value.includes('"') ||
                                fontName.includes(" ");

                            if (prollyFont && document.fonts && document.fonts.check(`16px "${fontName}"`)) {
                                option.style.fontFamily = opt.value;
                            }
                        } catch {}
                    }

                    select.appendChild(option);
                });

                select.onchange = async () => {
                    settings[key].Value = select.value;
                    await setAllSettings(settings);
                    resolveDependencies();
                };

                wrapper.append(label, select);

                if (data.Description) {
                    wrapper.append(createDescription(label, data.Description, select, key));
                }

                container.appendChild(wrapper);
                settingElements[key] = wrapper;
            }

            // SLIDER
            else if (data.Type === "slider") {
                const wrapper = document.createElement("div");
                wrapper.className = "generated-setting w-75 mx-auto my-3 text-center";

                const label = document.createElement("label");
                label.textContent = `${data.Name}: ${data.Value}${data.Unit || ""}`;

                const input = document.createElement("input");
                input.type = "range";
                input.min = data.Min || 0;
                input.max = data.Max || 100;
                input.value = data.Value;
                input.className = "form-range";

                input.oninput = async () => {
                    settings[key].Value = parseInt(input.value);
                    label.textContent = `${data.Name}: ${input.value}${data.Unit || ""}`;
                    await setAllSettings(settings);
                    resolveDependencies();
                };

                wrapper.append(label, input);

                if (data.Description) {
                    wrapper.append(createDescription(label, data.Description, input, key));
                }

                container.appendChild(wrapper);
                settingElements[key] = wrapper;
            }
        });

        // apply dependencies and asterisks globally once elements for the current category are built
        grouped[category].forEach(({ key }) => {
            markAsDependent(settingElements[key], key);
        });

        const hr = document.createElement("hr");
        hr.className = "w-50 mx-auto";
        container.appendChild(hr);
    });

    // restructure the flat html lists into nested structures according to prerequisites
    wrapDependencies();
    resolveDependencies();

    const versionElements = document.querySelectorAll(".extension-version");
    const manifest = chrome.runtime.getManifest();

    versionElements.forEach(element => {
        element.textContent = `Ver ${manifest.version}`;
    });

    await setAllSettings(settings);
});