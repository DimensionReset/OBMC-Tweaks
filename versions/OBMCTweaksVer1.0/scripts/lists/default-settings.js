/* A list of default settings that "settings-handler.js" uses */

const DEFAULT_SETTINGS = {
	// Toggles

	autoLogin: {
		Value: false,
		Name: "Auto Log-In",
		Category: "Utility",
		Description: "Disables the user's log-in timeout.<br><span class='small text-secondary'>(Does not require any details.)</span>"
	},

	anonMode: {
		Value: false,
		Name: "Anonymous Mode",
		Category: "Cosmetic",
		Description: "Hides or obfuscates any profile related items.<br><span class='small text-secondary'>(Does not require any details.)</span>"
	},

	notifToggle: {
		Value: false,
		Name: "Assessment Reminders",
		Category: "Utility",
		Description: "Reminds you of your pending activities upon opening the browser."
	},

	darkToggle: {
		Value: false,
		Name: "Enable Dark Mode",
		Category: "Cosmetic",
		Description: "Toggles a custom dark mode theme.<br><span class='small text-secondary'>(May look wrong in some places.)</span>"
	},

	rmbToggle: {
		Value: false,
		Name: "Force Right Click",
		Category: "Utility",
		Description: "Force the platform to allow the right-click menu."
	},

	anticheatToggle: {
		Value: false,
		Name: "Detect Cheat Detection",
		Category: "Utility",
		Description: 'Notifies you whenever you\'ve been counted as "cheating".<br><span class="small text-danger">(MAY BE VERY UNSTABLE)</span>'
	},

	lofiToggle: {
		Value: false,
		Name: "Enable Lofi Option",
		Category: "Cosmetic",
		Description: "Creates a mini-player of <a href='https://www.youtube.com/c/LofiGirl'>Lofi Girl</a> in the bottom right corner."
	},

	lowfiToggle: {
		Value: false,
		Name: "Enable HORRENDOUS Lofi Option",
		Category: "Cosmetic",
		Description: "Creates a mini-player of <a href='https://samir.pages.dev/posts/embed-music/'>Samir Paul's Lofi</a> in the bottom left corner."
	},

	romanToggle: {
		Value: false,
		Name: "Numbers To Roman Numerals",
		Category: "Cosmetic",
		Description: "Converts all numbers on screen to Roman Numerals.<br><span class='small text-secondary'>(Ex: 5 -> V)"
	},

	// Dropdowns
	selectedFont: {
		Value: "Arial, sans-serif",
		Name: "Font Select",
		Category: "Cosmetic",
		Options: [
			{ label: "DEFAULT (Source Sans Pro)", value: "Source Sans Pro, sans-serif" },
			{ label: "Arial", value: "Arial, sans-serif" },
			{ label: "Arial Black", value: "Arial Black, sans-serif" },
			{ label: "Calibri", value: "Calibri, sans-serif" },
			{ label: "Cambria", value: "Cambria, serif" },
			{ label: "Candara", value: "Candara, sans-serif" },
			{ label: "Century Gothic", value: "Century Gothic, sans-serif" },
			{ label: "Comic Sans MS", value: "Comic Sans MS, cursive" },
			{ label: "Consolas", value: "Consolas, monospace" },
			{ label: "Courier New", value: "Courier New, monospace" },
			{ label: "Franklin Gothic Medium", value: "Franklin Gothic Medium, sans-serif" },
			{ label: "Garamond", value: "Garamond, serif" },
			{ label: "Georgia", value: "Georgia, serif" },
			{ label: "Helvetica", value: "Helvetica, sans-serif" },
			{ label: "Impact", value: "Impact, sans-serif" },
			{ label: "Lucida Console", value: "Lucida Console, monospace" },
			{ label: "Lucida Sans Unicode", value: "Lucida Sans Unicode, sans-serif" },
			{ label: "Palatino Linotype", value: "Palatino Linotype, serif" },
			{ label: "Segoe UI", value: "Segoe UI, sans-serif" },
			{ label: "Tahoma", value: "Tahoma, sans-serif" },
			{ label: "Times New Roman", value: "Times New Roman, serif" },
			{ label: "Trebuchet MS", value: "Trebuchet MS, sans-serif" },
			{ label: "Verdana", value: "Verdana, sans-serif" },

			// generic families
			{ label: "Cursive (Generic)", value: "cursive" },
			{ label: "Fantasy (Generic)", value: "fantasy" },
			{ label: "Monospace (Generic)", value: "monospace" },
			{ label: "Sans-serif (Generic)", value: "sans-serif" },
			{ label: "Serif (Generic)", value: "serif" }
		],
		Description: "Changes the font of the platform to the selected."
	}
};