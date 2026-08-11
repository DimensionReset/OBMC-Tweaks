/* 
    anonymizer.js || DimensionReset

    This module handles image replacement and text obfuscation 
    to protect user privacy on screenshots.
*/

const anonImage = chrome.runtime.getURL("images/anon-pfp.jpg");

const IMAGE_SELECTOR = `
    .-profile_image,
    .-birthday_img,
    .-user_chatbox_image,
    .-user_chat_image,
    .-img_profile,
    img.-submission_stud_img,
    figure.-post_image_container > img
`;

const NAME_SELECTORS = [
    ".nav .dropdown-toggle.-s",
    ".-profile_heading",
    ".-lbl_username",
    ".-title.-s",
    ".-student_list p",
    ".-post_name"
].join(", ");

const realNames = new Set();
const SKIP_TAGS = ["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"];

// INJECT STYLES
(function injectAnonymizerStyles() {
    if (document.getElementById("ob-anon-styles")) return;
    const style = document.createElement("style");
    style.id = "ob-anon-styles";
    style.textContent = `
        [data-ob-text-mask] {
            font-size: 0 !important;
            display: inline-block !important;
            vertical-align: middle !important;
        }

        [data-ob-text-mask]::before {
            content: attr(data-ob-text-mask) !important;
            font-size: initial !important;
            visibility: visible !important;
            display: inline !important;
            font-family: inherit !important;
            font-weight: inherit !important;
            line-height: inherit !important;
            letter-spacing: inherit !important;
            color: inherit !important;
        }
    `;
    (document.head || document.documentElement).appendChild(style);
})();

// IMAGE ANONYMIZATION
export function anonymizeImage(img) {
    if (img.dataset.obAnonLocked) return;
    img.dataset.obAnonLocked = "1";

    const forceAnon = () => {
        if (img.src !== anonImage) {
            img.src = anonImage;
            img.srcset = anonImage;
        }
    };

    forceAnon();

    const imgObserver = new MutationObserver(forceAnon);
    imgObserver.observe(img, {
        attributes: true,
        attributeFilter: ["src", "srcset"]
    });
}

export function anonymizeImages(root = document) {
    if (root.matches && root.matches(IMAGE_SELECTOR)) {
        anonymizeImage(root);
    }

    const targets = root.querySelectorAll ? root.querySelectorAll(IMAGE_SELECTOR) : [];
    targets.forEach(anonymizeImage);
}

// TEXT OBFUSCATION LOGIC
export function collectRealNames(root = document) {
    const targets = root.querySelectorAll ? root.querySelectorAll(NAME_SELECTORS) : [];

    if (root.matches && root.matches(NAME_SELECTORS)) {
        targets.push(root);
    }

    targets.forEach(element => {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null
        );

        let tn;
        while ((tn = walker.nextNode())) {
            const t = tn.nodeValue.trim();
            if (t && t !== "Anonymous") {
                realNames.add(t);
                
                const parent = tn.parentElement;
                if (parent && !parent.hasAttribute("data-ob-text-mask")) {
                    if (parent === element && element.childNodes.length > 1) {
                        const maskSpan = document.createElement("span");
                        maskSpan.setAttribute("data-ob-text-mask", "Anonymous");
                        tn.nodeValue = "";
                        maskSpan.textContent = t;
                        parent.insertBefore(maskSpan, tn);
                    } else {
                        parent.setAttribute("data-ob-text-mask", "Anonymous");
                    }
                }
            }
        }
    });
}

export function obfuscateText(text) {
    if (window.location.pathname.includes('/oa_school/activity_taking/')) return text;
    if (!text) return text;

    // replace digits w "?"
    text = text.replace(/\d/g, "?");

    // replace names w "Anonymous"
    realNames.forEach(name => {
        if (!name || !name.trim()) return;
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        text = text.replace(new RegExp(escaped, "gi"), "Anonymous");
    });

    return text;
}

export function processTextNode(node) {
    if (window.location.pathname.includes('/oa_school/activity_taking/')) return;

    const parent = node.parentElement;
    if (!parent || parent.hasAttribute("data-ob-text-mask")) return;
    if (SKIP_TAGS.includes(parent.tagName)) return;

    if (typeof parent.checkVisibility === "function" && !parent.checkVisibility()) return;
    
    const val = node.nodeValue?.trim();
    if (!val) return;

    if (val.includes("callback =") || val.includes("function(") || val.startsWith("{") || val.startsWith("[")) {
        return;
    }

    // check if text has digits or name
    const obfuscated = obfuscateText(val);
    if (obfuscated !== val) {
        if (parent.childNodes.length === 1) {
            parent.setAttribute("data-ob-text-mask", obfuscated);
        } else {
            const maskSpan = document.createElement("span");
            maskSpan.setAttribute("data-ob-text-mask", obfuscated);
            maskSpan.textContent = val;
            parent.insertBefore(maskSpan, node);
            node.nodeValue = "";
        }
    }
}

// DOM WALKING
export function walkAndAnonymize(root = document) {
    collectRealNames(root);

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                const p = node.parentNode;
                if (!p || SKIP_TAGS.includes(p.tagName)) return NodeFilter.FILTER_REJECT;
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let node;
    
    while ((node = walker.nextNode())) {
        processTextNode(node);
    }
}

// MUTATION OBSERVER
export function observeAnonymization(target = document.body) {
    const observer = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    processTextNode(node);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    if (node.matches && node.matches(IMAGE_SELECTOR)) {
                        anonymizeImage(node);
                    }
                    anonymizeImages(node);

                    collectRealNames(node);

                    const walker = document.createTreeWalker(
                        node,
                        NodeFilter.SHOW_TEXT,
                        {
                            acceptNode(tn) {
                                const p = tn.parentNode;
                                if (!p || SKIP_TAGS.includes(p.tagName)) return NodeFilter.FILTER_REJECT;
                                return NodeFilter.FILTER_ACCEPT;
                            }
                        }
                    );

                    let tn;
                    while ((tn = walker.nextNode())) {
                        processTextNode(tn);
                    }
                }
            }
        }
    });

    observer.observe(target, {
        childList: true,
        subtree: true,
        characterData: true
    });

    return observer;
}