/*
    accent.js || DimensionReset

    Colors all defaulty accented elements to the value
    chosen by the user.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "accent";

    // DO NOT TOUCH ANYTHING BELOW IF YOU DO NOT KNOW WHAT YOU'RE DOING

    // ==== VERIFY CHECKS ====
    const flagKey = `__OB_${fileName.toUpperCase()}_LOADED__`;
    if (window.top !== window.self || window[flagKey]) return;

    window[flagKey] = true;
    console.log(`[${fileName}] Initialized`);

    let helpers = {};

    // ==== HELPER FUNCTIONS ====
    async function loadHelper(helperName) {
        const urlString = (helperName.includes("/") ? helperName : `scripts/helper/${String(helperName)}.js`);
        const url = chrome.runtime.getURL(urlString);

        const retrievedModule = await import(url);

        // "example.js"
        const baseName = helperName.split('/').pop();

        // "example"
        const cleanKey = baseName.lastIndexOf('.') !== -1 ? baseName.slice(0, baseName.lastIndexOf('.')) : baseName;    

        // Assign to helpers using the clean key
        helpers[cleanKey] = retrievedModule;

        console.log(`[${fileName}] Module ${cleanKey} loaded successfully`);
    }

    async function loadPrereq(prereqList) {
        try {
            if (Array.isArray(prereqList)) {
                await Promise.all(prereqList.map(name => loadHelper(name)));
            } else {
                await loadHelper(prereqList);
            }
        } catch (error) {
            console.error(`[${fileName}] Module load failed:`, error);
        }
    }

    // ==== INITIALIZATION ====
    async function init() {
        try {
            console.log(`[${fileName}] Starting init`);
            
            await loadPrereq("color-convert");

            const DEFAULT_SETTINGS = await (await fetch(chrome.runtime.getURL("scripts/lists/default-settings.json"))).json();
            const settings = await new Promise(r => chrome.storage.local.get(["accentColor", "darkToggle", "accentLink"], r));

            const colorValue = settings.accentColor?.Value ?? null;
            const isDark = settings.darkToggle?.Value ?? null;
            const shouldAccentLink = settings.accentLink?.Value ?? null;

            const isEnabled = (colorValue && (colorValue != DEFAULT_SETTINGS.accentColor.Value));

            if (isEnabled) {
                const style = document.createElement("style");

                const newRGB = helpers["color-convert"].hexToRgb(colorValue);

                const originalHsl = helpers["color-convert"].rgbToHsl(newRGB.r, newRGB.g, newRGB.b);
                const originalAccent = `hsl(${originalHsl.h} ${originalHsl.s}% ${originalHsl.l}%)`;

                let r = newRGB.r;
                let g = newRGB.g;
                let b = newRGB.b;

				let rawHsl, newFinal, brightFinal, transparentFinal;

				if (isDark) {
					const rotated = helpers["color-convert"].hueRotateRGB({r,g,b}, -180);

					r = 255 - rotated.r;
					g = 255 - rotated.g;
					b = 255 - rotated.b;
				}

				rawHsl = helpers["color-convert"].rgbToHsl(r,g,b);

				newFinal = `hsl(${rawHsl.h} ${rawHsl.s}% ${rawHsl.l}%)`;
				brightFinal = `hsl(${rawHsl.h} ${rawHsl.s}% ${Math.min(rawHsl.l + 50, 100)}%)`;
				transparentFinal = `hsl(${rawHsl.h} ${rawHsl.s}% ${rawHsl.l}% / 0.5)`;
				
                // selector config
                const accentBackgroundElements = `
                .-event_bg, button.-primary_btn, a.-primary_btn, .-primary_btn, .-primary_btn.-sm, 
                .-primary_btn.-tiny, .-event_bg, .-light_p_bg, .page-item.active > .page-link,
                .-tab_card .nav-tabs > li.active > a::after, .-tab_card .nav-tabs > li > a::after,
                .nav-pills li a:not(a[style="opacity: 0.75;"]), #nprogress .bar
                `;

                const accentBorderElements = `
                .-event_bg, button.-primary_btn, a.-primary_btn, .-primary_btn, .-primary_btn.-sm, 
                .-primary_btn.-tiny, .-event_bg, .-light_p_bg, .page-item.active > .page-link, 
                .dropdown-toggle:has(.oa_fl_ellipses)
                `;

                let hoverElements = `button.-primary_btn, a.-primary_btn, .-primary_btn, .-primary_btn.-sm, .-primary_btn.-tiny`;
                let textElements = `.-show_pass, .-light_p, .page-item:not(.disabled) .page-link, .dropdown-toggle > .oa_fl_ellipses, ul.nav.nav-tabs > li.active > a, .li_breadcrumb`;
                let hoverTextElements = `.-show_pass, .-light_p, .dropdown-toggle > .oa_fl_ellipses`;

                // main accent styling
                style.textContent = `

                    #nprogress .spinner .spinner-icon {
                        border-top-color: ${newFinal} !important; border-left-color: ${newFinal} !important;
                    }

                    #nprogress .peg {
                        box-shadow: 0 0 10px ${newFinal}, 0 0 5px ${newFinal} !important;
                        color: ${newFinal} !important;
                    }

                    input[type="text"]:focus, input[type="number"]:focus, textarea:focus {
                        box-shadow: 0 0 0 2px ${newFinal} !important;
                        outline: none !important;
                        border: none !important;
                    }

                    input[type="text"]:not(:focus), input[type="number"]:not(:focus), textarea:not(:focus) {
                        outline: none !important;
                        border: none !important;
                    }

                    .-sidebar-menu .-menu-container li a:hover {
                        background-color: ${transparentFinal} !important;
                        box-shadow: inset 4px 0 0 0 ${newFinal} !important;
                    }

                    .-menu-container>li.active>a:active,
                    .-menu-container>li.active>a:not(:active) {
                        background-color: ${transparentFinal} !important;
                        box-shadow: inset 4px 0 0 0 ${newFinal} !important;
                    }

                    ${accentBackgroundElements} {
                        background-color: ${newFinal} !important;
                    }

                    ${accentBorderElements} {
                        border-color: ${newFinal} !important;
                    }

                    ${hoverElements}:hover,
                    ${hoverElements}:focus {
                        color: ${brightFinal} !important;
                        border-color: ${newFinal} !important;
                    }
                `;

                if (shouldAccentLink) {
                    if (!textElements || textElements.endsWith(",")) {
                        textElements += " .-lnk, a:has(.-link), .-link, .-chat_link, .-info";
                    } else {
                        textElements += ", .-lnk, a:has(.-link), .-link, .-chat_link, .-info";
                    }

                    if (!hoverTextElements || hoverTextElements.endsWith(",")) {
                        hoverTextElements += " .-lnk, a .-event_view_more, a:has(.-link), .-link, .-chat_link, .-info";
                    } else {
                        hoverTextElements += ", .-lnk, a .-event_view_more, a:has(.-link), .-link, .-chat_link, .-info";
                    }
                }

                style.textContent += `
                    ${textElements} {
                        color: ${originalAccent} !important;
                    }

                    ${hoverTextElements}:hover {
                        color: ${originalAccent} !important;
                    }

                    .nav-tabs li a {
                        color: ${newFinal} !important;
                    }

                    .nav-tabs li a:hover {
                        color: ${brightFinal} !important;
                    }
                `;

                function applyContractIcon() {
                    const contractIcon = document.querySelector("a.-icon_link i img");
                    if (!contractIcon) return false;

                    const baseHue = 35;
                    const rotate = rawHsl.h - baseHue;

                    contractIcon.style.setProperty(
                        "filter",
                        `
                        invert(1)
                        sepia(1)
                        saturate(6000%)
                        hue-rotate(${rotate}deg)
                        brightness(95%)
                        `,
                        "important"
                    );

                    return true;
                }

                if (!applyContractIcon()) {
                    const observer = new MutationObserver(() => {
                        if (applyContractIcon()) observer.disconnect();
                    }); 
                    observer.observe(document.documentElement, { childList: true, subtree: true });
                }

                if (document.head) {
                    document.head.appendChild(style);
                } else {
                    document.documentElement.appendChild(style);
                }
            } else {
                console.log(`[${fileName}] Setting is disabled or module missing`);
            }

        } catch (error) {
            console.error(`[${fileName}] Init failed:`, error);
        }
    }

    init();
})();