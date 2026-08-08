/* 

	tooltip-handler.js || DimensionReset

	This script aims to init bootstrap tooltips in a way
	that appears stable across all viewport sizes.

*/

document.addEventListener("DOMContentLoaded", () => {
	const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
	
	// store instances so they can be updated later
	window.bsTooltips = [];

	tooltipTriggerList.forEach(element => {
		const tooltip = new bootstrap.Tooltip(element, {
			container: document.body,
			boundary: 'viewport',
			placement: 'top',
			offset: [0, 6],
			fallbackPlacements: []
		});
		window.bsTooltips.push({ element, instance: tooltip });
	});
});