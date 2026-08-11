/* 

	caterpillar-handler.js || DimensionReset

	This script aims to init bootstrap tooltips but
	specifically for the home page caterpillar.

*/

const caterpillar = document.getElementById("caterpillar");

async function init() { // init wrapper to allow await via async
	
	if (caterpillar) {
		const response = await fetch(chrome.runtime.getURL("scripts/lists/caterpillar-dialog.json"));
		const CATERPILLAR_DIALOG = await response.json();

		caterpillar.addEventListener("mouseenter", () => {
			if (!CATERPILLAR_DIALOG || CATERPILLAR_DIALOG.length === 0) return;

			const message = CATERPILLAR_DIALOG[Math.floor(Math.random() * CATERPILLAR_DIALOG.length)];

			caterpillar.setAttribute("title", message);
			caterpillar.setAttribute("data-bs-original-title", message);

			let tooltipInstance = bootstrap.Tooltip.getInstance(caterpillar);
			if (tooltipInstance) {
				tooltipInstance.dispose(); // remove old instance
			}

			tooltipInstance = new bootstrap.Tooltip(caterpillar, { 
				html: true,
				placement: "right"
			});

			tooltipInstance.show();
		});

		caterpillar.addEventListener("mouseleave", () => {
			const tooltipInstance = bootstrap.Tooltip.getInstance(caterpillar);
			if (tooltipInstance) tooltipInstance.hide();
		});
	}	
}

init();