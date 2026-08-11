/*
    miniplayer.js || DimensionReset

    Creates resizeable miniplayers from the (user's
    selected option) using the "dynamic-iframe.js"
    helper.
*/

(function() {
    // ==== CONFIG ====
    const fileName = "miniplayer";

    // ==== VERIFY CHECKS ====
    const flagKey = `__OB_${fileName.toUpperCase()}_LOADED__`;
    if (window.top !== window.self || window[flagKey]) return;

    window[flagKey] = true;
    console.log(`[${fileName}] Initialized`);

    let helpers = {};
    let postObserver = null;

    // ==== MINIPLAYER DEFINITIONS ====
    const PLAYER_CONFIGS = {
        lofi: {
            src: "https://www.youtube.com/embed/X4VbdwhkE10?autoplay=1",
            width: 300,
            height: 240,
            setup: (iframe) => {
                iframe.allow = "autoplay";
            }
        },
        lowfi: {
            src: "https://samirpaulb.github.io/music/embed",
            width: 300,
            height: 215,
            floatingStyle: {
                position: "fixed",
                bottom: "20px",
                left: "20px",
                width: "300px",
                height: "215px",
                border: "none",
                borderRadius: "12px",
                zIndex: "999999",
            },
            setup: (iframe) => {
                iframe.style.borderRadius = "12px";
            }
        },
        galaxyBlast: {
            src: "https://superduperstarboy221.github.io/Galaxy-Blast-OBMC-Edition-FINAL-/",
            width: 300,
            height: 240
        },
        eaglercraft: {
            src: "https://dimensionreset.github.io/OBMC-Tweaks/online_assets/pages/Eaglercraft.html",
            width: 300,
            height: 168.75,
            disguisedHeight: "250px",
            setup: (iframe) => {
                iframe.id = "tweaks-mc";
                const focusIframe = () => {
                    iframe.contentWindow?.focus();
                    console.log(`[${fileName}] Eaglercraft focused.`);
                };
                iframe.addEventListener('load', focusIframe);
                iframe.addEventListener('pointerdown', focusIframe);
            }
        }
    };

    // ==== HELPER FUNCTIONS ====
    function getSettingValue(setting) {
        return new Promise((resolve) => {
            chrome.storage.local.get([setting], (result) => {
                resolve(result[setting]?.["Value"] ?? null);
            });
        });
    }

    async function loadHelper(helperName) {
        const urlString = (helperName.includes("/") ? helperName : `scripts/helper/${String(helperName)}.js`);
        const url = chrome.runtime.getURL(urlString);

        const retrievedModule = await import(url);
        const baseName = helperName.split('/').pop();
        const cleanKey = baseName.lastIndexOf('.') !== -1 ? baseName.slice(0, baseName.lastIndexOf('.')) : baseName;

        helpers[cleanKey] = retrievedModule;
        console.log(`[${fileName}] Module ${cleanKey} loaded successfully`);
    }

    async function loadPrereq(prereqList) {
        try {
            const list = Array.isArray(prereqList) ? prereqList : [prereqList];
            await Promise.all(list.map(name => loadHelper(name)));
        } catch (error) {
            console.error(`[${fileName}] Module load failed:`, error);
        }
    }

    // function to create either disguised or dynamic iframe
    function createMiniplayerIframe(miniplayerType, isDisguised = false) {
        const config = PLAYER_CONFIGS[miniplayerType];
        if (!config) return null;

        const iframe = document.createElement("iframe");
        iframe.src = config.src;
        iframe.style.border = "none";
        iframe.style.width = "100%";
        iframe.id = "tweaks-miniplayer";

        // height based on mode
        const heightVal = (isDisguised && config.disguisedHeight) ? config.disguisedHeight : `${config.height}px`;
        iframe.style.height = heightVal;

        // run specific setups for each miniplayer option
        if (typeof config.setup === "function") {
            config.setup(iframe);
        }

        return iframe;
    }

    function attachButtonToPost(post, miniplayerType) {
        // get action buttons in post
        const actionContainer = post.querySelector(".-posts_action .-flex");
        if (!actionContainer) return; // in case no actions

        // in case button already exists
        if (post.querySelector(".add-miniplayer-btn")) return;

        const buttonSpan = document.createElement("span");
        buttonSpan.className = "col-xs-4 col-sm-4 col-md-4 col-lg-4 miniplayer-btn-wrapper";

        const button = document.createElement("button");
        button.className = "-post_comment_action -w_bg -g add-miniplayer-btn";
        button.type = "button";
        button.innerHTML = `<i class="-ic oa_fl_plus -icon_like_action" aria-hidden="true"></i> <span>Player</span>`;
        button.style.cursor = "pointer";

        button.addEventListener("click", () => {
            // clone og post
            const clonedPost = post.cloneNode(true);

            // remove player buttons from clone
            const clonedBtnWrapper = clonedPost.querySelector(".miniplayer-btn-wrapper");
            if (clonedBtnWrapper) {
                clonedBtnWrapper.remove();
            }

            // find desc and clear
            const targetLocation = clonedPost.querySelector("article.-post_description") || clonedPost;
            targetLocation.innerHTML = "";

            // create and append iframe
            const playerContainer = document.createElement("div");
            playerContainer.className = "disguised-miniplayer-container";
            playerContainer.style.marginTop = "10px";
            playerContainer.style.padding = "5px";

            const iframe = createMiniplayerIframe(miniplayerType, true);
            if (!iframe) return;

            playerContainer.appendChild(iframe);
            targetLocation.appendChild(playerContainer);

            // insert above og post
            post.parentNode.insertBefore(clonedPost, post);

            // remove existing buttons
            document.querySelectorAll(".miniplayer-btn-wrapper, .add-miniplayer-btn").forEach((btn) => {
                btn.remove();
            });

            // disconnect new post observer
            if (postObserver) {
                postObserver.disconnect();
                postObserver = null;
            }
        });

        buttonSpan.appendChild(button);
        actionContainer.appendChild(buttonSpan);
    }

    // post button embedder
    function disguiseMiniplayerInPosts(miniplayerType) {
        const postSelector = "section.panel, .panel-md-post";

        // process current posts
        const posts = document.querySelectorAll(postSelector);
        posts.forEach(post => attachButtonToPost(post, miniplayerType));

        // check newly added posts
        postObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType !== Node.ELEMENT_NODE) continue;

                    if (node.matches && node.matches(postSelector)) {
                        attachButtonToPost(node, miniplayerType);
                    }

                    if (node.querySelectorAll) {
                        const childPosts = node.querySelectorAll(postSelector);
                        childPosts.forEach(post => attachButtonToPost(post, miniplayerType));
                    }
                }
            }
        });

        postObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // ==== INITIALIZATION ====
    async function init() {
        try {
            if (window.location.pathname.includes('/oa_school/activity_taking/')) return;

            console.log(`[${fileName}] Starting init`);

            await loadPrereq("dynamic-iframe");
            const miniplayer = await getSettingValue("defaultMiniplayer");
            const shouldDisguise = await getSettingValue("disguiseMiniplayer");

            const config = PLAYER_CONFIGS[miniplayer];

            if (config) {
                if (shouldDisguise) {
                    // post miniplayer handling
                    disguiseMiniplayerInPosts(miniplayer);
                } else {
                    // default overlay
                    if (miniplayer === "lowfi" && config.floatingStyle) {
                        const iframe = createMiniplayerIframe(miniplayer);
                        Object.assign(iframe.style, config.floatingStyle);
                        document.body.appendChild(iframe);
                    } else {
                        const iframe = createMiniplayerIframe(miniplayer);
                        helpers["dynamic-iframe"].makeIframeResizableTopRight(
                            iframe, 
                            config.width, 
                            config.height, 
                            miniplayer
                        );
                    }
                }

                console.log(`[${fileName}] Conversion active`);
            } else {
                console.log(`[${fileName}] Setting is disabled or module missing`);
            }

        } catch (error) {
            console.error(`[${fileName}] Init failed:`, error);
        }
    }

    if (document.readyState === 'complete') {
        init();
    } else {
        window.addEventListener('load', init);
    }
})();