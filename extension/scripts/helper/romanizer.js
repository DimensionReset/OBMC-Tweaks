/* 

	romanizer.js || DimensionReset

	This module script allows you to convert numbers to
    roman numerals and vice-versa.

*/

const romans = [
	["M", 1000], ["CM", 900], ["D", 500], ["CD", 400],
	["C", 100], ["XC", 90], ["L", 50], ["XL", 40],
	["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]
];

export function toRoman(num) {
	if (num <= 0 || num > 3999) return num;
	let result = "";
	for (const [letter, value] of romans) {
		while (num >= value) {
			result += letter;
			num -= value;
		}
	}
	return result;
}

export function fromRoman(str) {
	if (!str) return str;
	let num = 0;
	let s = str.toUpperCase();
	for (const [letter, value] of romans) {
		while (s.startsWith(letter)) {
			num += value;
			s = s.slice(letter.length);
		}
	}
	
	return s.length === 0 ? num : str;
}

export function convertTextNode(node) {
	if (window.location.pathname.includes('/oa_school/activity_taking/')) return node;

	node.nodeValue = node.nodeValue.replace(/\b\d+\b/g, match => {
		const n = parseInt(match, 10);
		return n > 0 && n <= 3999 ? toRoman(n) : match;
	});
}

export function convertTextNodeToNumber(node) {
	if (window.location.pathname.includes('/oa_school/activity_taking/')) return node;
	
	node.nodeValue = node.nodeValue.replace(/\b[MCDXLIV]+\b/gi, match => fromRoman(match));
}

export function walkAndConvert(root) {
	const walker = document.createTreeWalker(
		root,
		NodeFilter.SHOW_TEXT,
		{
			acceptNode(node) {
				if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
				const p = node.parentNode;
				if (!p) return NodeFilter.FILTER_REJECT;
				const skip = ["SCRIPT","STYLE","TEXTAREA","CODE","PRE"];
				if (skip.includes(p.tagName)) return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			}
		},
		false
	);

	let node;
	const batch = [];
	while (node = walker.nextNode()) {
		batch.push(node);
		if (batch.length >= 50) {
			batch.forEach(convertTextNode);
			batch.length = 0;
		}
	}
	batch.forEach(convertTextNode);
}

export function walkAndConvertToNumber(root) {
	const walker = document.createTreeWalker(
		root,
		NodeFilter.SHOW_TEXT,
		{
			acceptNode(node) {
				if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
				const p = node.parentNode;
				if (!p) return NodeFilter.FILTER_REJECT;
				const skip = ["SCRIPT","STYLE","TEXTAREA","CODE","PRE"];
				if (skip.includes(p.tagName)) return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			}
		},
		false
	);

	let node;
	const batch = [];
	while (node = walker.nextNode()) {
		batch.push(node);
		if (batch.length >= 50) {
			batch.forEach(convertTextNodeToNumber);
			batch.length = 0;
		}
	}
	batch.forEach(convertTextNodeToNumber);
}

export function observeMutations(target) {
	const observer = new MutationObserver(mutations => {
		for (const mutation of mutations) {
			for (const node of mutation.addedNodes) {
				if (node.nodeType === Node.TEXT_NODE) {
					convertTextNode(node);
				} else if (node.nodeType === Node.ELEMENT_NODE) {
					if (["TABLE","PRE","CODE"].includes(node.tagName)) continue;
					walkAndConvert(node);
				}
			}
		}
	});

	observer.observe(target, { childList: true, subtree: true });
	return observer;
}