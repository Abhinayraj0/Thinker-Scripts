const root = document.documentElement;

let pageController;

function setTheme(theme) {
	root.dataset.theme = theme;
	root.style.colorScheme = theme;
	localStorage.setItem('ts-theme', theme);
	document.querySelector('[data-theme-toggle]')?.setAttribute('aria-pressed', String(theme === 'dark'));
}

function setZen(active) {
	root.classList.toggle('zen-active', active);
	document.body.classList.toggle('zen-active', active);
	localStorage.setItem('ts-zen', String(active));
	document.querySelectorAll('[data-zen-toggle]').forEach((toggle) => {
		toggle.setAttribute('aria-pressed', String(active));
	});
}

function initTheme(signal) {
	document.querySelector('[data-theme-toggle]')?.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
	document.querySelector('[data-theme-toggle]')?.addEventListener(
		'click',
		() => {
			setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
		},
		{ signal },
	);
}

function initZen(signal) {
	const toggle = document.querySelector('[data-zen-toggle]');
	const exit = document.querySelector('[data-zen-exit]');
	if (!toggle) {
		root.classList.remove('zen-active');
		document.body.classList.remove('zen-active');
		return;
	}

	const active = localStorage.getItem('ts-zen') === 'true';
	setZen(active);
	toggle.addEventListener('click', () => setZen(!root.classList.contains('zen-active')), { signal });
	exit?.addEventListener('click', () => setZen(false), { signal });
	document.addEventListener(
		'keydown',
		(event) => {
			if (event.key === 'Escape' && root.classList.contains('zen-active')) {
				setZen(false);
			}
		},
		{ signal },
	);
}

function initReadingProgress(signal) {
	const widget = document.querySelector('[data-reading-widget]');
	const meter = document.querySelector('[data-progress-meter]');
	const bar = document.querySelector('[data-progress-bar]');
	const percent = document.querySelector('[data-progress-percent]');
	const zenRing = document.querySelector('[data-zen-progress-ring]');
	const label = document.querySelector('[data-time-remaining]');
	const speedPreset = document.querySelector('[data-speed-preset]');
	const readerContent = document.querySelector('[data-reader-content]');

	if (!widget || !meter || !bar || !label || !readerContent) return;

	function update() {
		const words = Number(label.dataset.wordCount || 0);
		const speed = Number(speedPreset?.value || 230);
		const rect = readerContent.getBoundingClientRect();
		const articleTop = window.scrollY + rect.top;
		const articleBottom = articleTop + rect.height;
		const readingPoint = window.scrollY + window.innerHeight * 0.38;
		const rawProgress = (readingPoint - articleTop) / Math.max(1, articleBottom - articleTop);
		const progress = Math.min(1, Math.max(0, rawProgress));
		const remainingWords = Math.max(0, Math.round(words * (1 - progress)));
		const minutesLeft = Math.max(1, Math.ceil(remainingWords / speed));
		const progressPercent = Math.round(progress * 100);

		bar.style.transform = `scaleX(${progress})`;
		if (zenRing) zenRing.style.strokeDashoffset = String(100 - progressPercent);
		meter.setAttribute('aria-valuenow', String(progressPercent));
		meter.setAttribute('aria-valuemin', '0');
		meter.setAttribute('aria-valuemax', '100');
		meter.setAttribute('role', 'progressbar');
		label.textContent = progress >= 0.995 ? 'Done' : `${minutesLeft} min left`;
		if (percent) percent.textContent = `${progressPercent}%`;
	}

	speedPreset?.addEventListener('change', update, { signal });
	window.addEventListener('scroll', update, { passive: true, signal });
	window.addEventListener('resize', update, { signal });
	update();
}

function initLibrary(signal) {
	const library = document.querySelector('[data-library]');
	if (!library) return;

	const cards = [...library.querySelectorAll('[data-post-card]')];
	const chips = [...library.querySelectorAll('[data-filter]')];
	const count = library.querySelector('[data-result-count]');
	const empty = library.querySelector('[data-empty-state]');
	const state = new URLSearchParams(window.location.search);

	function activeValues(name) {
		return state.getAll(name);
	}

	function renderFilters() {
		let visible = 0;
		chips.forEach((chip) => {
			const isPressed = activeValues(chip.dataset.filter).includes(chip.dataset.value);
			chip.setAttribute('aria-pressed', String(isPressed));
		});

		cards.forEach((card) => {
			const typeMatch = !activeValues('type').length || activeValues('type').includes(card.dataset.type);
			const categoryMatch =
				!activeValues('category').length ||
				activeValues('category').some((category) => card.dataset.categories.split('|').includes(category));
			const timeFilters = activeValues('time');
			const minutes = Number(card.dataset.readingMinutes);
			const timeMatch =
				!timeFilters.length ||
				timeFilters.some((value) => {
					const chip = chips.find((item) => item.dataset.filter === 'time' && item.dataset.value === value);
					return chip && minutes >= Number(chip.dataset.min) && minutes < Number(chip.dataset.max);
				});
			const show = typeMatch && categoryMatch && timeMatch;
			card.hidden = !show;
			if (show) visible += 1;
		});

		if (count) count.textContent = String(visible);
		if (empty) empty.classList.toggle('hidden', visible !== 0);
		const query = state.toString();
		history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
	}

	chips.forEach((chip) => {
		chip.addEventListener(
			'click',
			() => {
				const values = activeValues(chip.dataset.filter);
				state.delete(chip.dataset.filter);
				const next = values.includes(chip.dataset.value)
					? values.filter((value) => value !== chip.dataset.value)
					: [...values, chip.dataset.value];
				next.forEach((value) => state.append(chip.dataset.filter, value));
				renderFilters();
			},
			{ signal },
		);
	});

	library.querySelector('[data-clear-filters]')?.addEventListener(
		'click',
		() => {
			['type', 'category', 'time'].forEach((key) => state.delete(key));
			renderFilters();
		},
		{ signal },
	);

	renderFilters();
}

function initReaderControls(signal) {
	const readerArticle = document.querySelector('[data-reading-article]');
	const updateReadingProgress = () => window.dispatchEvent(new Event('resize'));

	document.querySelector('[data-font-scale]')?.addEventListener(
		'input',
		(event) => {
			root.style.setProperty('--reader-scale', event.target.value);
			updateReadingProgress();
		},
		{ signal },
	);

	document.querySelector('[data-line-height]')?.addEventListener(
		'input',
		(event) => {
			root.style.setProperty('--reader-leading', event.target.value);
			updateReadingProgress();
		},
		{ signal },
	);

	document.querySelector('[data-letter-spacing]')?.addEventListener(
		'input',
		(event) => {
			root.style.setProperty('--reader-tracking', `${event.target.value}em`);
			updateReadingProgress();
		},
		{ signal },
	);

	document.querySelectorAll('[data-font-choice]').forEach((button) => {
		button.addEventListener(
			'click',
			() => {
				const fonts = {
					inter: 'var(--font-sans)',
					charter: 'var(--font-serif)',
					mono: 'var(--font-mono)',
				};
				root.style.setProperty('--reader-font', fonts[button.dataset.fontChoice] || fonts.inter);
				document.querySelectorAll('[data-font-choice]').forEach((item) => {
					item.setAttribute('aria-pressed', String(item === button));
				});
				updateReadingProgress();
			},
			{ signal },
		);
	});

	document.querySelectorAll('[data-reader-width]').forEach((button) => {
		button.addEventListener(
			'click',
			() => {
				const wide = button.dataset.readerWidth === '4xl';
				readerArticle?.classList.toggle('max-w-2xl', !wide);
				readerArticle?.classList.toggle('max-w-4xl', wide);
				document.querySelectorAll('[data-reader-width]').forEach((item) => {
					item.setAttribute('aria-pressed', String(item === button));
				});
				updateReadingProgress();
			},
			{ signal },
		);
	});

	document.querySelector('[data-progress-toggle]')?.addEventListener(
		'change',
		(event) => {
			document.querySelector('[data-reading-widget]')?.classList.toggle('hidden', !event.target.checked);
		},
		{ signal },
	);
}

function initReaderDock(signal) {
	const readerContent = document.querySelector('[data-reader-content]');
	const dock = document.querySelector('[data-reader-dock]');
	const trigger = document.querySelector('[data-reader-dock-trigger]');
	const tabs = [...document.querySelectorAll('[data-reader-tab]')];
	const panes = [...document.querySelectorAll('[data-reader-pane]')];
	const toc = document.querySelector('[data-reader-toc]');
	const searchInput = document.querySelector('[data-reader-search]');
	const searchCount = document.querySelector('[data-search-count]');
	const searchNext = document.querySelector('[data-search-next]');
	const searchPrev = document.querySelector('[data-search-prev]');
	let matches = [];
	let activeMatch = -1;

	function escapeHtml(value) {
		return value.replace(/[&<>"']/g, (character) => {
			const entities = {
				'&': '&amp;',
				'<': '&lt;',
				'>': '&gt;',
				'"': '&quot;',
				"'": '&#39;',
			};
			return entities[character];
		});
	}

	function setMode(mode) {
		tabs.forEach((button) => {
			button.setAttribute('aria-pressed', String(button.dataset.readerTab === mode));
		});
		panes.forEach((pane) => {
			pane.hidden = pane.dataset.readerPane !== mode;
		});
	}

	function openDock() {
		if (!dock || !trigger) return;
		dock.dataset.open = 'true';
		trigger.setAttribute('aria-expanded', 'true');
	}

	function closeDock() {
		if (!dock || !trigger) return;
		dock.dataset.open = 'false';
		trigger.setAttribute('aria-expanded', 'false');
	}

	function renderToc() {
		if (!readerContent || !toc) return [];
		const headings = [...readerContent.querySelectorAll('h2, h3')];
		if (!headings.length) {
			toc.innerHTML = '<p>No structural headings found.</p>';
			return [];
		}
		toc.innerHTML = headings
			.map((heading, index) => {
				if (!heading.id) heading.id = `section-${index + 1}`;
				const depth = heading.tagName === 'H3' ? 'h3' : 'h2';
				return `<a class="reader-toc-link" data-heading-index="${index}" data-depth="${depth}" href="#${escapeHtml(heading.id)}"><span>${depth.toUpperCase()}</span><strong>${escapeHtml(heading.textContent?.trim() || heading.id)}</strong></a>`;
			})
			.join('');
		return headings;
	}

	function updateActiveHeading(headings) {
		const links = [...document.querySelectorAll('[data-heading-index]')];
		if (!headings.length || !links.length) return;
		let activeIndex = 0;
		let activeDistance = Infinity;
		const anchor = window.innerHeight * 0.28;
		headings.forEach((heading, index) => {
			const distance = Math.abs(heading.getBoundingClientRect().top - anchor);
			if (distance < activeDistance) {
				activeDistance = distance;
				activeIndex = index;
			}
		});
		links.forEach((link) => link.setAttribute('aria-current', String(Number(link.dataset.headingIndex) === activeIndex)));
	}

	function buildMatches(query) {
		matches = [];
		activeMatch = -1;
		if (!readerContent || !query) return;
		const walker = document.createTreeWalker(readerContent, NodeFilter.SHOW_TEXT, {
			acceptNode(node) {
				if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
				const parent = node.parentElement;
				if (!parent || parent.closest('script, style, code, pre')) return NodeFilter.FILTER_REJECT;
				return NodeFilter.FILTER_ACCEPT;
			},
		});
		const needle = query.toLowerCase();
		while (walker.nextNode()) {
			const node = walker.currentNode;
			const haystack = node.nodeValue.toLowerCase();
			let offset = haystack.indexOf(needle);
			while (offset !== -1) {
				const range = document.createRange();
				range.setStart(node, offset);
				range.setEnd(node, offset + query.length);
				matches.push(range);
				offset = haystack.indexOf(needle, offset + query.length);
			}
		}
	}

	function paintMatches() {
		if (!CSS.highlights) return;
		CSS.highlights.delete('reader-search');
		CSS.highlights.delete('reader-search-active');
		if (matches.length) CSS.highlights.set('reader-search', new Highlight(...matches));
		if (activeMatch >= 0) CSS.highlights.set('reader-search-active', new Highlight(matches[activeMatch]));
	}

	function jumpToMatch(direction) {
		if (!matches.length) return;
		activeMatch = (activeMatch + direction + matches.length) % matches.length;
		const rect = matches[activeMatch].getBoundingClientRect();
		const top = window.scrollY + rect.top - window.innerHeight * 0.32;
		window.scrollTo({ top, behavior: 'smooth' });
		if (searchCount) searchCount.textContent = `${activeMatch + 1} / ${matches.length}`;
		paintMatches();
	}

	function updateSearch() {
		const query = searchInput?.value.trim() || '';
		buildMatches(query);
		if (searchCount) searchCount.textContent = matches.length === 1 ? '1 match' : `${matches.length} matches`;
		if (matches.length) jumpToMatch(1);
		else paintMatches();
	}

	if (!dock || !trigger || !readerContent) return;
	const headings = renderToc();
	updateActiveHeading(headings);

	trigger.addEventListener('click', () => (dock.dataset.open === 'true' ? closeDock() : openDock()), { signal });
	tabs.forEach((button) => {
		button.addEventListener('click', () => {
			setMode(button.dataset.readerTab);
			openDock();
			if (button.dataset.readerTab === 'search') searchInput?.focus();
		}, { signal });
	});
	toc?.addEventListener('click', (event) => {
		const link = event.target.closest('a[href^="#"]');
		if (!link) return;
		closeDock();
	}, { signal });
	searchInput?.addEventListener('input', updateSearch, { signal });
	searchNext?.addEventListener('click', () => jumpToMatch(1), { signal });
	searchPrev?.addEventListener('click', () => jumpToMatch(-1), { signal });
	window.addEventListener('scroll', () => updateActiveHeading(headings), { passive: true, signal });
	window.addEventListener('resize', () => updateActiveHeading(headings), { signal });
	document.addEventListener(
		'pointerdown',
		(event) => {
			if (dock.dataset.open !== 'true' || dock.contains(event.target)) return;
			closeDock();
		},
		{ signal },
	);
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape') closeDock();
	}, { signal });
}

function initBackToTop(signal) {
	const button = document.querySelector('[data-back-to-top]');
	const progressRing = document.querySelector('[data-back-to-top-progress]');
	if (!button || !progressRing) return;

	function update() {
		const scrollable = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
		const longPage = scrollable > 700;
		const progress = scrollable ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 0;
		const visible = longPage && window.scrollY > 200;

		progressRing.style.strokeDashoffset = String(100 - progress);
		button.classList.toggle('opacity-0', !visible);
		button.classList.toggle('pointer-events-none', !visible);
		button.classList.toggle('scale-95', !visible);
		button.classList.toggle('opacity-100', visible);
		button.classList.toggle('pointer-events-auto', visible);
		button.classList.toggle('scale-100', visible);
	}

	button.addEventListener(
		'click',
		() => {
			window.scrollTo({ top: 0, behavior: 'smooth' });
		},
		{ signal },
	);
	window.addEventListener('scroll', update, { passive: true, signal });
	window.addEventListener('resize', update, { signal });
	update();
}

function initPage() {
	pageController?.abort();
	pageController = new AbortController();
	const { signal } = pageController;

	initTheme(signal);
	initZen(signal);
	initReadingProgress(signal);
	initLibrary(signal);
	initReaderControls(signal);
	initReaderDock(signal);
	initBackToTop(signal);
}

document.addEventListener('astro:page-load', initPage);
document.addEventListener('DOMContentLoaded', initPage, { once: true });
