const caterpillar = document.getElementById("caterpillar");

if (caterpillar) {
	caterpillar.addEventListener("mouseenter", () => {
		if (!CATERPILLAR_DIALOG || CATERPILLAR_DIALOG.length === 0) return;

		// pick a random message (can contain HTML)
		const message = CATERPILLAR_DIALOG[Math.floor(Math.random() * CATERPILLAR_DIALOG.length)];

		// update both title and Bootstrap's original title
		caterpillar.title = message;
		caterpillar.setAttribute("data-bs-original-title", message);

		// get or create tooltip instance with html enabled
		let tooltipInstance = bootstrap.Tooltip.getInstance(caterpillar);
		if (!tooltipInstance) {
			tooltipInstance = new bootstrap.Tooltip(caterpillar, { html: true });
		} else {
			// re-enable html option if needed
			tooltipInstance._config.html = true;
		}

		tooltipInstance.show();
	});

	caterpillar.addEventListener("mouseleave", () => {
		const tooltipInstance = bootstrap.Tooltip.getInstance(caterpillar);
		if (tooltipInstance) tooltipInstance.hide();
	});
}