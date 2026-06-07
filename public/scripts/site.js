const root = document.documentElement;

let pageController;

function trackEvent(name, params = {}) {
	if (typeof window.gtag !== 'function') return;
	window.gtag('event', name, {
		site_area: 'thinker_scripts',
		...params,
	});
}

const postTypes = ['Thought', 'Deep-Dive', 'Brief Notes', 'Review'];
const postCategories = ['History', 'Thought', 'Personal', 'Fiction', 'Technology', 'Systems'];
const localStoreKey = 'ts-control-center';

function escapeHtml(value = '') {
	return String(value).replace(/[&<>"']/g, (character) => {
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

function slugify(value = '') {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function readStaticPosts() {
	try {
		return JSON.parse(document.getElementById('ts-static-posts')?.textContent || '[]').map((post) => ({
			...post,
			source: 'static',
			deleted: false,
		}));
	} catch {
		return [];
	}
}

function readControlState() {
	try {
		const parsed = JSON.parse(localStorage.getItem(localStoreKey) || '{}');
		return {
			posts: Array.isArray(parsed.posts) ? parsed.posts : [],
			settings: parsed.settings || {},
		};
	} catch {
		return { posts: [], settings: {} };
	}
}

function writeControlState(state) {
	localStorage.setItem(localStoreKey, JSON.stringify(state));
}

function normalizePost(post) {
	const title = post.title?.trim() || 'Untitled Post';
	const id = slugify(post.id || post.slug || title) || `post-${Date.now()}`;
	const categories = Array.isArray(post.categories)
		? post.categories
		: String(post.categories || '')
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);
	const validCategories = categories.filter((category) => postCategories.includes(category));
	const tags = Array.isArray(post.tags)
		? post.tags
		: String(post.tags || '')
			.split(',')
			.map((value) => value.trim())
			.filter(Boolean);

	return {
		id,
		title,
		description: post.description?.trim() || 'No description provided.',
		publishedAt: post.publishedAt || new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		type: postTypes.includes(post.type) ? post.type : 'Thought',
		categories: validCategories.length ? validCategories : ['Thought'],
		tags,
		readingMinutes: Math.max(1, Number.parseInt(post.readingMinutes, 10) || estimateReadingMinutes(post.body || '')),
		draft: Boolean(post.draft),
		deleted: Boolean(post.deleted),
		body: post.body?.trim() || '## Draft\n\nStart writing here.',
		source: post.source || 'local',
	};
}

function estimateReadingMinutes(markdown = '') {
	const words = markdown.trim().split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.ceil(words / 230));
}

function getManagedPosts({ includeDrafts = false } = {}) {
	const staticPosts = readStaticPosts();
	const { posts: localPosts } = readControlState();
	const byId = new Map(staticPosts.map((post) => [post.id, normalizePost(post)]));
	localPosts.map(normalizePost).forEach((post) => byId.set(post.id, post));
	return [...byId.values()]
		.filter((post) => !post.deleted && (includeDrafts || !post.draft))
		.sort((a, b) => new Date(b.publishedAt).valueOf() - new Date(a.publishedAt).valueOf());
}

function getDeletedPostIds() {
	const { posts } = readControlState();
	return new Set(posts.map(normalizePost).filter((post) => post.deleted).map((post) => post.id));
}

function saveManagedPost(post) {
	const state = readControlState();
	const normalized = normalizePost(post);
	const localPosts = state.posts.filter((item) => normalizePost(item).id !== normalized.id);
	localPosts.push({ ...normalized, source: 'local' });
	writeControlState({ ...state, posts: localPosts });
	return normalized;
}

function markPostDeleted(id) {
	const state = readControlState();
	const normalizedId = slugify(id);
	const localPosts = state.posts.filter((item) => normalizePost(item).id !== normalizedId);
	localPosts.push({
		id: normalizedId,
		title: normalizedId,
		description: '',
		publishedAt: new Date().toISOString(),
		type: 'Thought',
		categories: ['Thought'],
		tags: [],
		readingMinutes: 1,
		draft: true,
		deleted: true,
		body: '',
		source: 'local',
	});
	writeControlState({ ...state, posts: localPosts });
}

function formatDate(value, style = 'short') {
	const date = new Date(value);
	if (Number.isNaN(date.valueOf())) return '';
	return new Intl.DateTimeFormat('en', {
		month: style === 'long' ? 'long' : 'short',
		day: 'numeric',
		year: 'numeric',
	}).format(date);
}

function renderMarkdown(markdown = '') {
	const lines = markdown.replace(/\r\n/g, '\n').split('\n');
	const html = [];
	let paragraph = [];
	let list = [];

	function flushParagraph() {
		if (!paragraph.length) return;
		html.push(`<p>${escapeHtml(paragraph.join(' '))}</p>`);
		paragraph = [];
	}

	function flushList() {
		if (!list.length) return;
		html.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`);
		list = [];
	}

	lines.forEach((line) => {
		const trimmed = line.trim();
		if (!trimmed) {
			flushParagraph();
			flushList();
			return;
		}
		const heading = trimmed.match(/^(#{2,4})\s+(.+)$/);
		const listItem = trimmed.match(/^[-*]\s+(.+)$/);
		if (heading) {
			flushParagraph();
			flushList();
			const level = heading[1].length;
			const text = escapeHtml(heading[2]);
			html.push(`<h${level}>${text}</h${level}>`);
			return;
		}
		if (listItem) {
			flushParagraph();
			list.push(listItem[1]);
			return;
		}
		flushList();
		paragraph.push(trimmed);
	});
	flushParagraph();
	flushList();
	return html.join('\n');
}

function postHref(post) {
	return post.source === 'static' ? `/posts/${post.id}/` : `/posts/?id=${encodeURIComponent(post.id)}`;
}

function renderPostCard(post) {
	const categories = post.categories.map((category) => `<span class="border border-neutral-200 px-2 py-1 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">${escapeHtml(category)}</span>`).join('');
	return `
		<article class="post-card border border-neutral-200 bg-white p-5 transition-colors duration-150 hover:border-neutral-950 dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-white" data-post-card data-local-managed="true" data-type="${escapeHtml(post.type)}" data-categories="${escapeHtml(post.categories.join('|'))}" data-reading-minutes="${post.readingMinutes}">
			<a class="group grid gap-5 md:grid-cols-[1fr_180px]" href="${postHref(post)}">
				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-2 font-mono text-xs text-neutral-500 dark:text-neutral-400">
						<span>${escapeHtml(post.type)}</span><span aria-hidden="true">/</span><span>${formatDate(post.publishedAt)}</span><span aria-hidden="true">/</span><span>${post.readingMinutes} Min</span>
					</div>
					<h3 class="mt-3 text-2xl font-semibold leading-tight text-pretty text-neutral-950 group-hover:underline group-hover:underline-offset-4 dark:text-white">${escapeHtml(post.title)}</h3>
					<p class="mt-3 max-w-3xl text-sm leading-6 text-neutral-600 dark:text-neutral-300">${escapeHtml(post.description)}</p>
					<div class="mt-4 flex flex-wrap gap-2">${categories}</div>
				</div>
				<div class="hidden border border-neutral-200 bg-neutral-50 p-5 md:grid dark:border-neutral-800 dark:bg-neutral-900">
					<div class="grid h-full min-h-36 place-items-center border border-neutral-200 text-center font-mono text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">${escapeHtml(post.type)}</div>
				</div>
			</a>
		</article>
	`;
}

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
			const nextTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
			setTheme(nextTheme);
			trackEvent('theme_changed', { theme: nextTheme });
		},
		{ signal },
	);
}

function initZen(signal) {
	const toggles = [...document.querySelectorAll('[data-zen-toggle]')];
	const exit = document.querySelector('[data-zen-exit]');
	if (!toggles.length && !exit) {
		root.classList.remove('zen-active');
		document.body.classList.remove('zen-active');
		return;
	}

	const active = localStorage.getItem('ts-zen') === 'true';
	setZen(active);
	toggles.forEach((toggle) => {
		toggle.addEventListener('click', () => {
			const nextState = !root.classList.contains('zen-active');
			setZen(nextState);
			trackEvent('zen_mode_toggled', { active: nextState });
		}, { signal });
	});
	exit?.addEventListener('click', () => {
		setZen(false);
		trackEvent('zen_mode_toggled', { active: false, source: 'exit_button' });
	}, { signal });
	document.addEventListener(
		'keydown',
		(event) => {
			if (event.key === 'Escape' && root.classList.contains('zen-active')) {
				setZen(false);
				trackEvent('zen_mode_toggled', { active: false, source: 'escape_key' });
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

	const cards = [...library.querySelectorAll('[data-post-card]')].filter((card) => card.dataset.localSuppressed !== 'true');
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
				trackEvent('library_filter_changed', {
					filter_type: chip.dataset.filter,
					filter_value: chip.dataset.value,
					active: next.includes(chip.dataset.value),
				});
			},
			{ signal },
		);
	});

	library.querySelector('[data-clear-filters]')?.addEventListener(
		'click',
		() => {
			['type', 'category', 'time'].forEach((key) => state.delete(key));
			renderFilters();
			trackEvent('library_filters_cleared');
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
			trackEvent('reader_setting_changed', { setting: 'font_scale' });
		},
		{ signal },
	);

	document.querySelector('[data-line-height]')?.addEventListener(
		'input',
		(event) => {
			root.style.setProperty('--reader-leading', event.target.value);
			updateReadingProgress();
			trackEvent('reader_setting_changed', { setting: 'line_height' });
		},
		{ signal },
	);

	document.querySelector('[data-letter-spacing]')?.addEventListener(
		'input',
		(event) => {
			root.style.setProperty('--reader-tracking', `${event.target.value}em`);
			updateReadingProgress();
			trackEvent('reader_setting_changed', { setting: 'letter_spacing' });
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
				trackEvent('reader_setting_changed', { setting: 'font_choice', value: button.dataset.fontChoice });
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
				trackEvent('reader_setting_changed', { setting: 'reader_width', value: button.dataset.readerWidth });
			},
			{ signal },
		);
	});

	document.querySelector('[data-progress-toggle]')?.addEventListener(
		'change',
		(event) => {
			document.querySelector('[data-reading-widget]')?.classList.toggle('hidden', !event.target.checked);
			trackEvent('reader_setting_changed', { setting: 'progress_widget', active: event.target.checked });
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
		if (query) trackEvent('reader_search_used', { result_count: matches.length });
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
			trackEvent('reader_dock_tab_opened', { tab: button.dataset.readerTab });
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
			trackEvent('back_to_top_clicked');
		},
		{ signal },
	);
	window.addEventListener('scroll', update, { passive: true, signal });
	window.addEventListener('resize', update, { signal });
	update();
}

function initLocalSettings() {
	const { settings } = readControlState();
	if (settings.theme && settings.theme !== 'system') setTheme(settings.theme);
	root.dataset.accent = settings.accent || 'forest';
	if (settings.readerScale) root.style.setProperty('--reader-scale', settings.readerScale);
	if (settings.readerLeading) root.style.setProperty('--reader-leading', settings.readerLeading);
	if (settings.zenDefault && (document.querySelector('[data-zen-toggle]') || document.querySelector('[data-zen-exit]'))) setZen(true);
	const speedPreset = document.querySelector('[data-speed-preset]');
	if (speedPreset && settings.readerSpeed) speedPreset.value = String(settings.readerSpeed);
	if (settings.progressDefault === false) {
		document.querySelector('[data-reading-widget]')?.classList.add('hidden');
		const progressToggle = document.querySelector('[data-progress-toggle]');
		if (progressToggle) progressToggle.checked = false;
	}
}

function initLocalContent(signal) {
	const posts = getManagedPosts();
	const deletedIds = getDeletedPostIds();
	const library = document.querySelector('[data-library]');
	const list = library?.querySelector('[data-post-list]');
	if (list) {
		list.querySelectorAll('[data-local-managed]').forEach((node) => node.remove());
		const staticCards = [...list.querySelectorAll('[data-post-card]:not([data-local-managed])')];
		staticCards.forEach((card) => {
			const slug = card.querySelector('a[href^="/posts/"]')?.getAttribute('href')?.split('/').filter(Boolean).at(-1);
			const override = posts.find((post) => post.id === slug && post.source !== 'static');
			if (override || deletedIds.has(slug)) {
				card.hidden = true;
				card.dataset.localSuppressed = 'true';
			}
		});
		posts
			.filter((post) => post.source !== 'static')
			.forEach((post) => {
				list.insertAdjacentHTML('beforeend', renderPostCard(post));
			});
	}

	const homeFeatured = document.querySelector('[data-home-featured-posts]');
	const homeRecent = document.querySelector('[data-home-recent-posts]');
	if (homeFeatured && !library && location.pathname === '/') {
		const latestLocal = posts.find((post) => post.source !== 'static');
		if (latestLocal) homeFeatured.innerHTML = renderPostCard(latestLocal);
	}
	if (homeRecent && !library && location.pathname === '/') {
		const localPosts = posts.filter((post) => post.source !== 'static').slice(1, 3);
		localPosts.forEach((post) => homeRecent.insertAdjacentHTML('afterbegin', renderPostCard(post)));
	}

	const localContent = document.querySelector('[data-local-post-content]');
	if (localContent) {
		const id = new URLSearchParams(location.search).get('id');
		const post = posts.find((item) => item.id === id);
		if (post) renderArticleFromPost(post);
	}

	const staticArticle = document.querySelector('[data-reader-content]:not([data-local-post-content])');
	if (staticArticle && location.pathname.startsWith('/posts/')) {
		const slug = location.pathname.split('/').filter(Boolean).at(-1);
		const post = posts.find((item) => item.id === slug && item.source !== 'static');
		if (post) renderArticleFromPost(post);
	}

	window.addEventListener(
		'storage',
		(event) => {
			if (event.key === localStoreKey) location.reload();
		},
		{ signal },
	);
}

function renderArticleFromPost(post) {
	document.querySelector('[data-local-post-title], [data-post-hero] h1')?.replaceChildren(document.createTextNode(post.title));
	document.querySelector('[data-local-post-description], [data-post-hero] p:last-child')?.replaceChildren(document.createTextNode(post.description));
	document.querySelector('[data-local-post-meta], [data-post-hero] .font-mono')?.replaceChildren(
		document.createTextNode(`${post.type} / ${formatDate(post.publishedAt, 'long')} / ${post.readingMinutes} Min`),
	);
	const content = document.querySelector('[data-reader-content]');
	if (content) content.innerHTML = renderMarkdown(post.body);
	const wordCount = document.querySelector('[data-time-remaining]');
	if (wordCount) wordCount.dataset.wordCount = String(post.body.split(/\s+/).filter(Boolean).length);
	document.title = `${post.title} | Thinker Scripts`;
}

function initAnalytics(signal) {
	document.addEventListener(
		'click',
		(event) => {
			const link = event.target.closest('a[href]');
			if (!link) return;
			const href = link.getAttribute('href') || '';
			if (href.startsWith('mailto:')) {
				trackEvent('contact_link_clicked', { contact_type: 'email' });
				return;
			}
			try {
				const url = new URL(href, window.location.href);
				if (url.origin !== window.location.origin) {
					trackEvent('outbound_link_clicked', { outbound_host: url.hostname });
				}
			} catch {
				// Ignore malformed author-provided URLs.
			}
		},
		{ signal },
	);

	window.addEventListener(
		'load',
		() => {
			window.setTimeout(() => {
				const navigation = performance.getEntriesByType('navigation')[0];
				if (!navigation) return;
				trackEvent('site_performance', {
					load_time_ms: Math.round(navigation.loadEventEnd),
					dom_ready_ms: Math.round(navigation.domContentLoadedEventEnd),
				});
			}, 0);
		},
		{ once: true, signal },
	);
}

function initPage() {
	pageController?.abort();
	pageController = new AbortController();
	const { signal } = pageController;

	initAnalytics(signal);
	initTheme(signal);
	initZen(signal);
	initLocalSettings();
	initLocalContent(signal);
	initReadingProgress(signal);
	initLibrary(signal);
	initReaderControls(signal);
	initReaderDock(signal);
	initBackToTop(signal);
}

document.addEventListener('astro:page-load', initPage);
document.addEventListener('DOMContentLoaded', initPage, { once: true });
