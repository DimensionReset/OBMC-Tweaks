/*
    dynamic-iframe.js || DimensionReset

    Creates resizable, floating miniplayer iframes.
*/

// creates proportionally resizable iframes
export function makeIframeResizableTopRight(iframe, width = 300, height = 240, iframeId = "default") {
    const aspectRatio = width / height;

    const wrapper = document.createElement("div");
    Object.assign(wrapper.style, {
        position: "fixed",
        bottom: "20px",
        left: "20px",
        width: width + "px",
        height: height + "px",
        userSelect: "none",
        border: "1px solid #ccc",
        borderRadius: "12px",
        zIndex: "999999",
        overflow: "hidden",
        backgroundColor: "#000",
    });

    const handle = document.createElement("div");
    handle.id = "tweaks-miniplayer-handle";
    Object.assign(handle.style, {
        position: "absolute",
        top: "0",
        right: "0",
        width: "16px",
        userSelect: "none",
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
        isDragging = false; // tell the mousemove event listener to stop scaling the window
    });

    // internal helper function to handle sizing
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

    // when the window is rescaled, maintain relative size
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

    // load iframeSize here if there's data for it
    chrome.storage.local.get([`iframeSize_${iframeId}`], result => {
        if (result[`iframeSize_${iframeId}`]) {
            const { width, height } = result[`iframeSize_${iframeId}`];
            resizeIframe(width);
        }
    });
}