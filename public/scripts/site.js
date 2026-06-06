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
	document.querySelector('[data-zen-toggle]')?.setAttribute('aria-pressed', String(active));
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
	if (!toggle) {
		root.classList.remove('zen-active');
		document.body.classList.remove('zen-active');
		return;
	}

	const active = localStorage.getItem('ts-zen') === 'true';
	setZen(active);
	toggle.addEventListener('click', () => setZen(!root.classList.contains('zen-active')), { signal });
}

function initReadingProgress(signal) {
	const widget = document.querySelector('[data-reading-widget]');
	const ring = document.querySelector('[data-progress-ring]');
	const label = document.querySelector('[data-time-remaining]');
	const speedPreset = document.querySelector('[data-speed-preset]');
	const readerContent = document.querySelector('[data-reader-content]');

	if (!widget || !ring || !label || !readerContent) return;

	const radius = Number(ring.getAttribute('r'));
	const circumference = 2 * Math.PI * radius;
	ring.style.strokeDasharray = `${circumference}`;
	ring.style.strokeDashoffset = `${circumference}`;

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

		ring.style.strokeDashoffset = `${circumference * (1 - progress)}`;
		widget.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
		widget.setAttribute('aria-valuemin', '0');
		widget.setAttribute('aria-valuemax', '100');
		widget.setAttribute('role', 'progressbar');
		label.textContent = progress >= 0.995 ? 'Done' : `${minutesLeft} min left`;
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
	const readerContent = document.querySelector('[data-reader-content]');
	const label = document.querySelector('[data-time-remaining]');
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

	document.querySelectorAll('[data-font-choice]').forEach((button) => {
		button.addEventListener(
			'click',
			() => {
				const serif = button.dataset.fontChoice === 'serif';
				root.style.setProperty('--reader-font', serif ? 'var(--font-serif)' : 'var(--font-sans)');
				document.querySelectorAll('[data-font-choice]').forEach((item) => {
					item.setAttribute('aria-pressed', String(item === button));
				});
				updateReadingProgress();
			},
			{ signal },
		);
	});

	if (!label || !readerContent) return;
}

function initContextPanel(signal) {
	const readerContent = document.querySelector('[data-reader-content]');
	const panel = document.querySelector('[data-context-panel]');
	const panelContent = document.querySelector('[data-context-content]');

	function openContext(html, label) {
		if (!panel || !panelContent) return;
		panelContent.innerHTML = `<h2 class="text-lg font-medium text-neutral-950 dark:text-white">${label}</h2><div class="mt-4">${html}</div>`;
		panel.dataset.open = 'true';
	}

	document.querySelector('[data-context-close]')?.addEventListener(
		'click',
		() => {
			if (panel) panel.dataset.open = 'false';
		},
		{ signal },
	);

	if (!readerContent) return;

	readerContent.querySelectorAll('a[href^="#"]').forEach((link) => {
		link.addEventListener(
			'click',
			(event) => {
				const target = document.querySelector(link.getAttribute('href'));
				if (!target) return;
				event.preventDefault();
				const label =
					link.closest('[id^="fnref"]') || link.getAttribute('href').startsWith('#fn')
						? 'Footnote'
						: 'Internal Reference';
				openContext(target.outerHTML, label);
			},
			{ signal },
		);
	});
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
	initContextPanel(signal);
}

document.addEventListener('astro:page-load', initPage);
document.addEventListener('DOMContentLoaded', initPage, { once: true });
