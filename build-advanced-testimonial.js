#!/usr/bin/env node
/**
 * Static-site generator for the Advanced Testimonial demo library.
 *
 * Reads advanced-testimonial/demo-library.json (+ each demos/{id}.json) — the
 * single source of truth — and generates:
 *   advanced-testimonial/index.html          → a browsable demo gallery
 *   advanced-testimonial/{id}/index.html     → a documentation page per demo (own URL)
 *   advanced-testimonial/site.css            → shared styles
 *
 * Re-run after adding or changing a demo:  node build-advanced-testimonial.js
 * (Mirrors build-general-slider.js — this script only touches the
 * advanced-testimonial/ folder.)
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, 'advanced-testimonial');
const BASE = 'https://devmonowar.github.io/wp-plugin-demo-library/advanced-testimonial/';
const PLUGIN_WPORG = 'https://wordpress.org/plugins/advanced-testimonial/';
const GITHUB = 'https://github.com/devmonowar/advanced-testimonial';
const ROOT_URL = 'https://devmonowar.github.io/wp-plugin-demo-library/';

const esc = (s) =>
	String(s == null ? '' : s)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

// Turn an absolute library URL into a plugin-relative path (e.g. "previews/x.jpg").
const rel = (url) => String(url || '').replace(BASE, '');

function readJSON(p) {
	return JSON.parse(fs.readFileSync(p, 'utf8'));
}

// Filled/half/empty star glyphs for a 0-5 rating.
function stars(r) {
	const val = parseFloat(r) || 0;
	const full = Math.floor(val);
	const half = val - full >= 0.5;
	return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(Math.max(0, 5 - full - (half ? 1 : 0)));
}

// "2026-06-27" -> "Jun 2026".
function monthYear(s) {
	const m = String(s || '').match(/^(\d{4})-(\d{2})/);
	if (!m) {
		return '';
	}
	const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return names[parseInt(m[2], 10) - 1] + ' ' + m[1];
}

// BreadcrumbList JSON-LD for richer search results.
function breadcrumbLd(items) {
	const list = items.map((it, i) => {
		const node = { '@type': 'ListItem', position: i + 1, name: it.name };
		if (it.url) {
			node.item = it.url;
		}
		return node;
	});
	return '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: list }) + '</script>';
}

const manifest = readJSON(path.join(ROOT, 'demo-library.json'));
const demos = manifest.demos || [];

// Merge each manifest entry with its full demo file (testimonials + groups).
const full = demos.map((d) => {
	let detail = {};
	try {
		detail = readJSON(path.join(ROOT, 'demos', path.basename(rel(d.file))));
	} catch (e) {
		/* keep going with manifest-only data */
	}
	return { ...d, testimonials: detail.testimonials || [], groups: detail.groups || [] };
});

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
	if (d.is_new || d.new) out += '<span class="badge badge--new">New</span>';
	if (d.featured) out += '<span class="badge badge--featured">Featured</span>';
	return out;
}

/* ---------- Gallery index ---------- */
function buildIndex() {
	const cards = full
		.map((d) => {
			const link = `${d.id}/`;
			const preview = rel(d.preview);
			return `<a class="card" href="${esc(link)}">
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
		'Advanced Testimonial — Demo Library',
		'Browse ready-made Advanced Testimonial demos for WordPress: agency, business, SaaS and WooCommerce review sets. Import any demo in one click.',
		'site.css',
		BASE
	)}
<header class="site-header">
	<div class="wrap">
		<nav class="crumbs" aria-label="Breadcrumb"><a href="../">All Plugins</a> › <span>Advanced Testimonial</span></nav>
		${breadcrumbLd([{ name: 'All Plugins', url: ROOT_URL }, { name: 'Advanced Testimonial', url: BASE }])}
		<p class="eyebrow">WordPress plugin</p>
		<h1>Advanced Testimonial — Demo Library</h1>
		<p class="lead">${esc(full.length)} ready-made testimonial sets you can import in one click from your WordPress dashboard — each built with the free <a href="${PLUGIN_WPORG}">Advanced Testimonial</a> plugin.</p>
		<p class="links"><a class="btn" href="${PLUGIN_WPORG}">Get the plugin</a> <a class="btn btn--ghost" href="${GITHUB}">GitHub</a></p>
	</div>
</header>
<main class="wrap">
	<div class="grid">
${cards}
	</div>
</main>
<footer class="site-footer"><div class="wrap"><p>Advanced Testimonial demo library · <a href="${PLUGIN_WPORG}">WordPress.org</a> · <a href="${GITHUB}">GitHub</a></p></div></footer>
</body></html>`;

	fs.writeFileSync(path.join(ROOT, 'index.html'), html);
}

/* ---------- Per-demo documentation page ---------- */
function buildDemo(d) {
	const dir = path.join(ROOT, d.id);
	fs.mkdirSync(dir, { recursive: true });

	const preview = '../' + rel(d.preview);
	const groupNames = (d.groups || []).map((g) => g.name).filter(Boolean).join(', ');
	const metaRows = [
		['Requires', d.requires ? `Advanced Testimonial ${esc(d.requires)}+` : '—'],
		['Version', esc(d.version || '1.0')],
		['Updated', esc(d.updated || '—')],
		['Category', esc(d.category || '—')],
		['Groups', groupNames ? esc(groupNames) : '—'],
		['Testimonials', esc((d.testimonials || []).length)],
	]
		.map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`)
		.join('');

	const tags = (d.tags || []).map((t) => `<span class="chip">${esc(t)}</span>`).join(' ');

	const list = (d.testimonials || [])
		.map((t) => {
			const m = t.meta || {};
			const img = t.image ? '../' + rel(t.image) : '';
			const role = [m.designation, m.company].filter(Boolean).join(', ');
			const loc = m.location ? ` · ${esc(m.location)}` : '';
			const verified =
				'1' === m.verified || 1 === m.verified || true === m.verified
					? '<span class="tstml__verified">✓ Verified</span>'
					: '';
			return `<li class="tstml">
	<div class="tstml__top">
		${img ? `<img class="tstml__avatar" src="${esc(img)}" alt="${esc(t.title)}" loading="lazy" width="44" height="44">` : ''}
		<div class="tstml__who">
			<p class="tstml__name">${esc(t.title)}${verified}</p>
			<p class="tstml__role">${esc(role)}${loc}</p>
		</div>
		<span class="tstml__stars" aria-label="Rated ${esc(m.rating || '0')} out of 5">${stars(m.rating)}</span>
	</div>
	${m.headline ? `<p class="tstml__headline">${esc(m.headline)}</p>` : ''}
	<p class="tstml__quote">${esc(t.content)}</p>
</li>`;
		})
		.join('\n');

	const html = `${head(`${d.name} — Advanced Testimonial demo`, d.description, '../site.css', `${BASE}${d.id}/`)}
<header class="site-header site-header--sub">
	<div class="wrap">
		<nav class="crumbs" aria-label="Breadcrumb"><a href="../../">All Plugins</a> › <a href="../">Advanced Testimonial</a> › <span>${esc(d.name)}</span></nav>
		${breadcrumbLd([{ name: 'All Plugins', url: ROOT_URL }, { name: 'Advanced Testimonial', url: BASE }, { name: d.name, url: `${BASE}${d.id}/` }])}
		<div class="card__badges">${badges(d)}${d.category ? `<span class="chip">${esc(d.category)}</span>` : ''}</div>
		<h1>${esc(d.name)}</h1>
		<p class="lead">${esc(d.description)}</p>
		<div class="compat">
			${d.requires ? `<span class="compat__item compat__item--ok">✓ Advanced Testimonial ${esc(d.requires)}+</span>` : ''}
			<span class="compat__item">Stable demo</span>
			${monthYear(d.updated) ? `<span class="compat__item">Updated ${esc(monthYear(d.updated))}</span>` : ''}
		</div>
		<p class="links"><a class="btn" href="${PLUGIN_WPORG}">Get the plugin &amp; import this demo →</a> <a class="btn btn--ghost" href="../">All demos</a></p>
	</div>
</header>
<main class="wrap demo">
	<div class="demo__preview"><img src="${esc(preview)}" alt="${esc(d.name)} preview" width="1200" height="675"></div>

	<section class="panel">
		<h2>How to import</h2>
		<ol class="steps">
			<li>Install and activate <a href="${PLUGIN_WPORG}">Advanced Testimonial</a> on your WordPress site.</li>
			<li>Go to <strong>Testimonials → Demo Library</strong> in wp-admin.</li>
			<li>Find <strong>${esc(d.name)}</strong> and click <strong>Import Demo</strong> — the testimonials and images are added automatically.</li>
		</ol>
	</section>

	<section class="panel">
		<h2>Details</h2>
		<table class="meta"><tbody>${metaRows}</tbody></table>
		${tags ? `<p class="tags">${tags}</p>` : ''}
	</section>

	<section class="panel">
		<h2>Testimonials in this demo</h2>
		<ul class="tstml-list">
${list}
		</ul>
	</section>

	<p class="links"><a class="btn" href="${PLUGIN_WPORG}">Get Advanced Testimonial</a> <a class="btn btn--ghost" href="../">Browse more demos</a></p>
</main>
<footer class="site-footer"><div class="wrap"><p>Advanced Testimonial demo library · <a href="${PLUGIN_WPORG}">WordPress.org</a> · <a href="${GITHUB}">GitHub</a></p></div></footer>
</body></html>`;

	fs.writeFileSync(path.join(dir, 'index.html'), html);
}

/* ---------- Shared CSS (on-brand: plugin blue + amber stars) ---------- */
const CSS = `:root{--accent:#2563eb;--star:#f59e0b;--ink:#1f2937;--muted:#6b7280;--line:#e5e7eb;--bg:#fff;--soft:#f8fafc}
*{box-sizing:border-box}
body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg)}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
.wrap{max-width:1080px;margin:0 auto;padding:0 20px}
.site-header{background:linear-gradient(180deg,var(--soft),#fff);border-bottom:1px solid var(--line);padding:56px 0 40px}
.site-header--sub{padding:36px 0 26px}
.eyebrow{margin:0 0 6px;text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:700;color:var(--accent)}
.site-header h1{margin:0 0 10px;font-size:34px;line-height:1.15}
.lead{margin:0;color:var(--muted);max-width:640px;font-size:18px}
.crumb{margin:0 0 14px;font-size:14px}
.crumbs{margin:0 0 14px;font-size:13px;color:var(--muted)}
.crumbs a{color:var(--muted)}.crumbs a:hover{color:var(--accent)}
.compat{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 0}
.compat__item{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--ink);background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:6px 14px}
.compat__item--ok{color:#0f766e;background:#f0fdfa;border-color:#99f6e4}
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
.badge--new{background:#16a34a}.badge--featured{background:#f59e0b}
.chip{display:inline-block;font-size:12px;padding:3px 10px;border-radius:999px;background:var(--soft);border:1px solid var(--line);color:var(--muted)}
.demo{padding-bottom:60px}
.demo__preview{border:1px solid var(--line);border-radius:14px;overflow:hidden;margin:28px 0}
.demo__preview img{width:100%;height:auto;display:block}
.panel{border:1px solid var(--line);border-radius:14px;padding:22px 24px;margin:0 0 22px;background:#fff}
.panel h2{margin:0 0 14px;font-size:20px}
.steps{margin:0;padding-left:20px}.steps li{margin:0 0 8px}
.meta{border-collapse:collapse;width:100%;max-width:520px}
.meta th,.meta td{text-align:left;padding:8px 12px;border-bottom:1px solid var(--line);font-size:15px;vertical-align:top}
.meta th{color:var(--muted);font-weight:600;width:140px}
.tags{margin:14px 0 0;display:flex;gap:6px;flex-wrap:wrap}
.tstml-list{list-style:none;margin:0;padding:0;display:grid;gap:16px}
.tstml{border:1px solid var(--line);border-radius:12px;padding:16px 18px;background:var(--soft)}
.tstml__top{display:flex;align-items:center;gap:12px;margin:0 0 10px}
.tstml__avatar{width:44px;height:44px;border-radius:50%;object-fit:cover;flex:0 0 44px}
.tstml__who{min-width:0}
.tstml__name{margin:0;font-size:15px;font-weight:700}
.tstml__role{margin:0;font-size:13px;color:var(--muted)}
.tstml__verified{margin-left:6px;font-size:11px;color:#16a34a;font-weight:700}
.tstml__stars{margin-left:auto;flex:0 0 auto;color:var(--star);font-size:15px;letter-spacing:1px;white-space:nowrap}
.tstml__headline{margin:0 0 4px;font-size:15px;font-weight:700;color:var(--ink)}
.tstml__quote{margin:0;color:var(--ink);font-size:14px;line-height:1.6}
.site-footer{border-top:1px solid var(--line);padding:26px 0;color:var(--muted);font-size:14px}
.site-footer a{color:var(--muted)}
@media(max-width:560px){.tstml__stars{margin-left:0}.tstml__top{flex-wrap:wrap}.site-header h1{font-size:27px}}
`;

/* ---------- Run ---------- */
fs.writeFileSync(path.join(ROOT, 'site.css'), CSS);
buildIndex();
full.forEach(buildDemo);
console.log(`Generated: index.html + site.css + ${full.length} demo pages`);
full.forEach((d) => console.log(`  advanced-testimonial/${d.id}/`));
