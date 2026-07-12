#!/usr/bin/env node
/**
 * Static-site generator for the Free Widgets For Elementor demo library.
 *
 * Reads free-widgets-for-elementor/demo-library.json (the single source of
 * truth) and generates:
 *   free-widgets-for-elementor/index.html        → a browsable demo gallery
 *   free-widgets-for-elementor/{id}/index.html   → a page per demo (own URL)
 *   free-widgets-for-elementor/site.css          → shared styles
 *
 * This script only touches the free-widgets-for-elementor/ folder.
 * Re-run after adding or changing a demo:  node build-free-widgets-for-elementor.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'free-widgets-for-elementor');
const BASE = 'https://devmonowar.github.io/wp-plugin-demo-library/free-widgets-for-elementor/';
const PLUGIN_WPORG = 'https://wordpress.org/plugins/free-widgets-for-elementor/';
const GITHUB = 'https://github.com/devmonowar/free-widgets-for-elementor';

const esc = (s) =>
	String(s == null ? '' : s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

const rel = (url) => String(url || '').replace(BASE, '');

function readJSON(p) {
	return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Friendly label for a widget slug (icon-box → Icon Box, cta → Call To Action).
const WIDGET_LABELS = {
	'icon-box': 'Icon Box',
	'pricing-table': 'Pricing Table',
	'logo-carousel': 'Logo Carousel',
	cta: 'Call To Action',
};
const widgetLabel = (slug) =>
	WIDGET_LABELS[slug] ||
	String(slug)
		.split('-')
		.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
		.join(' ');

const manifest = readJSON(path.join(ROOT, 'demo-library.json'));
const demos = manifest.demos || [];

function head(title, description, cssHref, canonical) {
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="${esc(cssHref)}">
</head>
<body>`;
}

function badges(d) {
	let out = '';
	if (d.featured) out += '<span class="badge badge--featured">Featured</span>';
	if (d.is_new || d.new) out += '<span class="badge badge--new">New</span>';
	return out;
}

/* ---------- Gallery index ---------- */
function buildIndex() {
	const cards = demos
		.map((d) => {
			const preview = rel(d.preview);
			return `<a class="card" href="${esc(d.id)}/">
	<div class="card__media"><img src="${esc(preview)}" alt="${esc(d.name)} preview" loading="lazy" width="1200" height="675"></div>
	<div class="card__body">
		<div class="card__badges">${badges(d)}${d.category ? `<span class="chip">${esc(d.category)}</span>` : ''}</div>
		<h2 class="card__title">${esc(d.name)}</h2>
		<p class="card__desc">${esc(d.description)}</p>
	</div>
</a>`;
		})
		.join('\n');

	const html = `${head(
		'Free Widgets For Elementor — Demo Library',
		'Browse ready-made Elementor sections built with the free Free Widgets For Elementor plugin: pricing, features, stats, team, testimonials, hero and more. Import any section in one click.',
		'site.css',
		BASE
	)}
<header class="site-header">
	<div class="wrap">
		<p class="eyebrow">WordPress plugin</p>
		<h1>Free Widgets For Elementor — Demo Library</h1>
		<p class="lead">Ready-made Elementor sections you can import in one click from your WordPress dashboard — each built entirely with the free <a href="${PLUGIN_WPORG}">Free Widgets For Elementor</a> plugin.</p>
		<p class="links"><a class="btn" href="${PLUGIN_WPORG}">Get the plugin</a> <a class="btn btn--ghost" href="${GITHUB}">GitHub</a></p>
	</div>
</header>
<main class="wrap">
	<div class="grid">
${cards}
	</div>
</main>
<footer class="site-footer"><div class="wrap"><p>Free Widgets For Elementor demo library · <a href="${PLUGIN_WPORG}">WordPress.org</a> · <a href="${GITHUB}">GitHub</a></p></div></footer>
</body></html>`;

	fs.writeFileSync(path.join(ROOT, 'index.html'), html);
}

/* ---------- Per-demo page ---------- */
function buildDemo(d) {
	const dir = path.join(ROOT, d.id);
	fs.mkdirSync(dir, { recursive: true });

	const preview = '../' + rel(d.preview);
	const metaRows = [
		['Requires', d.requires ? `Free Widgets For Elementor ${esc(d.requires)}+` : '—'],
		['Version', esc(d.version || '1.0')],
		['Category', esc(d.category || '—')],
		['Type', 'Elementor saved template (section)'],
	]
		.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
		.join('');

	const tags = (d.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join(' ');
	const widgetChips = (d.widgets || [])
		.map((w) => `<span class="chip chip--widget">${esc(widgetLabel(w))}</span>`)
		.join(' ');

	const html = `${head(
		`${d.name} — Free Widgets For Elementor demo`,
		d.description,
		'../site.css',
		`${BASE}${d.id}/`
	)}
<header class="site-header site-header--sub">
	<div class="wrap">
		<p class="crumb"><a href="../">← All demos</a></p>
		<div class="card__badges">${badges(d)}${d.category ? `<span class="chip">${esc(d.category)}</span>` : ''}</div>
		<h1>${esc(d.name)}</h1>
		<p class="lead">${esc(d.description)}</p>
	</div>
</header>
<main class="wrap demo">
	<div class="demo__preview"><img src="${esc(preview)}" alt="${esc(d.name)} preview" width="1200" height="675"></div>

	<section class="panel">
		<h2>How to import</h2>
		<ol class="steps">
			<li>Install and activate <a href="${PLUGIN_WPORG}">Free Widgets For Elementor</a> (and Elementor) on your site.</li>
			<li>Go to <strong>Free Widgets → Demo Library</strong> in wp-admin.</li>
			<li>Find <strong>${esc(d.name)}</strong> and click <strong>Import</strong> — the section is added to <strong>Templates → Saved Templates</strong> and its images to your Media Library.</li>
			<li>Edit any page with Elementor and insert the saved template wherever you like.</li>
		</ol>
	</section>

	<section class="panel">
		<h2>Widgets used</h2>
		<p class="tags">${widgetChips || '—'}</p>
	</section>

	<section class="panel">
		<h2>Details</h2>
		<table class="meta"><tbody>${metaRows}</tbody></table>
		${tags ? `<p class="tags">${tags}</p>` : ''}
	</section>

	<p class="links"><a class="btn" href="${PLUGIN_WPORG}">Get the plugin</a> <a class="btn btn--ghost" href="../">Browse more demos</a></p>
</main>
<footer class="site-footer"><div class="wrap"><p>Free Widgets For Elementor demo library · <a href="${PLUGIN_WPORG}">WordPress.org</a> · <a href="${GITHUB}">GitHub</a></p></div></footer>
</body></html>`;

	fs.writeFileSync(path.join(dir, 'index.html'), html);
}

/* ---------- Shared CSS ---------- */
const CSS = `:root{--accent:#6366f1;--accent-d:#4f46e5;--ink:#1f2937;--muted:#6b7280;--line:#e5e7eb;--bg:#fff;--soft:#f8fafc}
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg)}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
.site-header{background:linear-gradient(180deg,var(--soft),#fff);border-bottom:1px solid var(--line);padding:56px 0 40px}
.site-header--sub{padding:36px 0 26px}
.eyebrow{margin:0 0 6px;text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700;color:var(--accent)}
.site-header h1{margin:0 0 10px;font-size:34px;line-height:1.15}
.lead{margin:0;color:var(--muted);max-width:660px;font-size:18px}
.crumb{margin:0 0 14px;font-size:14px}
.links{margin:22px 0 0}
.btn{display:inline-block;background:var(--accent);color:#fff;padding:10px 20px;border-radius:8px;font-weight:600}
.btn:hover{opacity:.9;text-decoration:none}
.btn--ghost{background:#fff;color:var(--ink);border:1px solid var(--line)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px;margin:34px 0 60px}
.card{display:block;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;transition:box-shadow .2s,transform .2s;color:inherit}
.card:hover{box-shadow:0 12px 30px rgba(0,0,0,.08);transform:translateY(-2px);text-decoration:none}
.card__media{aspect-ratio:16/9;background:var(--soft)}
.card__media img{width:100%;height:100%;object-fit:cover;display:block}
.card__body{padding:16px 18px 20px}
.card__badges{display:flex;gap:6px;flex-wrap:wrap;margin:0 0 8px;min-height:22px}
.card__title{margin:0 0 6px;font-size:20px}
.card__desc{margin:0;color:var(--muted);font-size:15px}
.badge{display:inline-block;font-size:11px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;padding:3px 9px;border-radius:999px;color:#fff}
.badge--new{background:#16a34a}.badge--featured{background:var(--accent)}
.chip{display:inline-block;font-size:12px;padding:3px 10px;border-radius:999px;background:var(--soft);border:1px solid var(--line);color:var(--muted)}
.chip--widget{background:#eef2ff;border-color:#e0e7ff;color:var(--accent-d);font-weight:600}
.demo{padding-bottom:60px}
.demo__preview{border:1px solid var(--line);border-radius:14px;overflow:hidden;margin:28px 0}
.demo__preview img{width:100%;height:auto;display:block}
.panel{border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin:0 0 22px;background:#fff}
.panel h2{margin:0 0 14px;font-size:20px}
.steps{margin:0;padding-left:20px}.steps li{margin:0 0 8px}
.meta{border-collapse:collapse;width:100%;max-width:560px}
.meta th,.meta td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);font-size:15px;vertical-align:top}
.meta th{color:var(--muted);font-weight:600;width:160px}
.tags{margin:0;display:flex;gap:6px;flex-wrap:wrap}
.site-footer{border-top:1px solid var(--line);padding:26px 0;color:var(--muted);font-size:14px}
.site-footer a{color:var(--muted)}
@media(max-width:560px){.site-header h1{font-size:27px}}
`;

/* ---------- Run ---------- */
fs.writeFileSync(path.join(ROOT, 'site.css'), CSS);
buildIndex();
demos.forEach(buildDemo);
console.log(`Generated: index.html + site.css + ${demos.length} demo pages`);
demos.forEach((d) => console.log(`  free-widgets-for-elementor/${d.id}/`));
