import { loadAll, CATEGORIES, ytId, ytThumb, addView, DEMO } from './data.js';
import { I } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = n => `<span class="ic">${I[n] || ''}</span>`;
const fillIcons = (root = document) => root.querySelectorAll('.ic[data-i]').forEach(el => { el.innerHTML = I[el.dataset.i] || ''; el.removeAttribute('data-i'); });

let S = null;           // البيانات
let tvTimer = null;

/* ---------------- المفضلة (على جهاز المشاهد) ---------------- */
const FAV_KEY = 'farjan_favs';
const getFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); } catch (e) { return []; } };
const isFav = id => getFavs().includes(id);
function toggleFav(id) {
  let f = getFavs();
  f = f.includes(id) ? f.filter(x => x !== id) : [...f, id];
  try { localStorage.setItem(FAV_KEY, JSON.stringify(f)); } catch (e) {}
  toast(f.includes(id) ? 'أضيف إلى مفضلتي' : 'أزيل من مفضلتي');
  document.querySelectorAll(`.fav[data-fav="${id}"]`).forEach(b => { b.classList.toggle('on', f.includes(id)); b.innerHTML = icon(f.includes(id) ? 'heartFill' : 'heart'); });
  return f.includes(id);
}

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------------- أدوات العرض ---------------- */
const seriesName = id => (S.series.find(s => s.id === id) || {}).name || '';
const catLabel = k => k === 'ramadan' ? S.site.ramadanLabel : (CATEGORIES.find(c => c.key === k) || {}).label;
const clipThumb = c => { const id = ytId(c.youtube); return c.thumb || (id ? ytThumb(id) : ''); };

function thumbHTML(src, ph) {
  return src ? `<img src="${esc(src)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'thumb-ph',textContent:${esc(JSON.stringify(ph))}}))">`
             : `<div class="thumb-ph">${esc(ph)}</div>`;
}

function clipCard(c) {
  const sn = seriesName(c.seriesId);
  return `<article class="card">
    <a href="#/clip/${c.id}" class="thumb" aria-label="${esc(c.title)}">
      ${thumbHTML(clipThumb(c), sn || c.title)}
      ${c.duration ? `<span class="dur">${esc(c.duration)}</span>` : ''}
      <span class="playc">${icon('play')}</span>
    </a>
    <div class="card-foot">
      <h3>${esc(c.title)}${sn && !c.title.includes(sn) ? `<small>${esc(sn)}</small>` : ''}</h3>
      <button class="fav ${isFav(c.id) ? 'on' : ''}" data-fav="${c.id}" aria-label="المفضلة">${icon(isFav(c.id) ? 'heartFill' : 'heart')}</button>
    </div>
  </article>`;
}

function seriesCard(s) {
  const n = S.clips.filter(c => c.seriesId === s.id).length;
  const first = S.clips.find(c => c.seriesId === s.id);
  const src = s.poster || (first ? clipThumb(first) : '');
  return `<a class="card scard" href="#/series/${s.id}">
    <div class="thumb">${thumbHTML(src, s.name)}<span class="count">${n} مقطع</span></div>
    <div class="card-foot"><h3>${esc(s.name)}${s.season ? `<small>${esc(s.season)}</small>` : ''}</h3></div>
  </a>`;
}

function liveCard(l) {
  const id = ytId(l.youtube);
  return `<article class="card">
    <a href="#/watch-live/${l.id}" class="thumb">${thumbHTML(l.poster || (id ? ytThumb(id) : ''), l.title)}
      ${l.isLive ? `<span class="live-badge"><span class="live-dot"></span>مباشر</span>` : ''}
      <span class="playc">${icon('play')}</span></a>
    <div class="card-foot"><h3>${esc(l.title)}${l.desc ? `<small>${esc(l.desc)}</small>` : ''}</h3></div>
  </article>`;
}

function row(title, items, more, cardFn = clipCard) {
  if (!items.length) return '';
  return `<section class="sec">
    <div class="sec-head"><h2>${esc(title)}</h2>${more ? `<a href="${more}">عرض الكل ${icon('left')}</a>` : ''}</div>
    <div class="row">
      <button class="row-btn r" data-dir="1" aria-label="السابق">${icon('right')}</button>
      <div class="track ${cardFn === seriesCard ? 'track-s' : ''}">${items.map(cardFn).join('')}</div>
      <button class="row-btn l" data-dir="-1" aria-label="التالي">${icon('left')}</button>
    </div></section>`;
}

function clipsOf(key) {
  if (key === 'top') return [...S.clips].sort((a, b) => (b.views || 0) - (a.views || 0));
  return S.clips.filter(c => (c.cats || []).includes(key));
}
const latest = () => [...S.clips].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

/* ---------------- الصفحة الرئيسية ---------------- */
function viewHome() {
  const slides = S.slides.filter(s => s.active !== false);
  const liveNow = S.live.filter(l => l.isLive);
  const lv = liveNow[0];
  const catsHTML = CATEGORIES.map(c => `<a class="cat t-${c.tone}" href="#/cat/${c.key}">
      <span class="big ic">${I[c.icon]}</span><b>${esc(catLabel(c.key))}</b><span class="chev">${icon('left')}</span></a>`).join('');

  return `
  <section class="hero ${S.hero ? 'has-bg' : ''}" ${S.hero ? `style="background-image:url('${S.hero}')"` : ''}>
    <div class="hero-inner">
      <div class="hero-text">
        <h1>${esc(S.site.heroTitle)}</h1>
        <p>${esc(S.site.heroSubtitle)}</p>
      </div>
      <div class="tv-wrap">
        <div class="tv-glow"></div>
        <div class="tv">
          <div class="tv-screen-bezel"><div class="tv-screen" id="tvScreen">
            ${slides.length ? slides.map((s, i) => slideHTML(s, i)).join('') : `<div class="slide on"><div class="slide-ph">${esc(S.site.siteName)}</div></div>`}
            ${slides.length > 1 ? `<div class="tv-dots">${slides.map((_, i) => `<button data-dot="${i}" class="${i ? '' : 'on'}" aria-label="شريحة ${i + 1}"></button>`).join('')}</div>` : ''}
          </div></div>
          <div class="tv-panel"><span class="knob"></span><span class="knob"></span><span class="grille"></span></div>
        </div>
        <div class="tv-legs"><i></i><i></i></div>
        ${slides.length > 1 ? `<button class="tv-arrow prev" data-tv="1" aria-label="التالي">${icon('left')}</button>
        <button class="tv-arrow next" data-tv="-1" aria-label="السابق">${icon('right')}</button>` : ''}
      </div>
    </div>
    <form class="searchbar" id="heroSearch" role="search">
      <input type="search" name="q" placeholder="ابحث عن مسلسل أو مقطع ..." aria-label="بحث">
      <button aria-label="بحث">${icon('search')}</button>
    </form>
  </section>
  <div class="sheet"><div class="wrap">
    <div class="cats">${catsHTML}</div>
    ${lv ? `<section class="liveband">
        <a class="lb-media" href="#/watch-live/${lv.id}">${thumbHTML(lv.poster || (ytId(lv.youtube) ? ytThumb(ytId(lv.youtube), 'maxresdefault') : ''), '')}<span class="playc">${icon('play')}</span></a>
        <div class="lb-text"><span class="pill-live"><span class="live-dot"></span>مباشر الآن</span>
          <h2>${esc(lv.title)}</h2>${lv.desc ? `<p>${esc(lv.desc)}</p>` : ''}
          <a class="btn" href="#/watch-live/${lv.id}">${icon('play')} شاهدي البث</a></div></section>` : ''}
    ${row('أحدث المقاطع', latest().slice(0, 12), '#/clips')}
    ${row('المسلسلات', S.series.slice(0, 12), '#/series', seriesCard)}
    ${row('الأكثر مشاهدة', clipsOf('top').slice(0, 12), '#/cat/top')}
    ${row(S.site.ramadanLabel, clipsOf('ramadan').slice(0, 12), '#/cat/ramadan')}
    ${row('الكوميديا', clipsOf('comedy').slice(0, 12), '#/cat/comedy')}
  </div></div>`;
}

function slideHTML(s, i) {
  const clip = S.clips.find(c => c.id === s.clipId);
  const src = s.image || (clip ? clipThumb(clip) : '');
  const label = s.title || (clip ? seriesName(clip.seriesId) || clip.title : '');
  return `<div class="slide ${i ? '' : 'on'}" data-slide="${i}" ${clip ? `data-clip="${clip.id}"` : ''}>
    ${src ? `<img src="${esc(src)}" alt="${esc(label)}" ${i ? 'loading="lazy"' : ''}>` : `<div class="slide-ph">${esc(label)}</div>`}
    ${label ? `<span class="slide-label">${esc(label)}<span class="pc">${icon('play')}</span></span>` : ''}
  </div>`;
}

function startTV() {
  clearInterval(tvTimer);
  const scr = $('#tvScreen'); if (!scr) return;
  const slides = [...scr.querySelectorAll('.slide')]; if (slides.length < 2) return;
  let cur = 0;
  const go = n => {
    cur = (n + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('on', i === cur));
    scr.querySelectorAll('[data-dot]').forEach((d, i) => d.classList.toggle('on', i === cur));
  };
  const ms = Math.max(2, +S.site.tvSeconds || 7) * 1000;
  const restart = () => { clearInterval(tvTimer); tvTimer = setInterval(() => go(cur + 1), ms); };
  document.querySelectorAll('[data-tv]').forEach(b => b.onclick = () => { go(cur + +b.dataset.tv); restart(); });
  scr.querySelectorAll('[data-dot]').forEach(b => b.onclick = e => { e.stopPropagation(); go(+b.dataset.dot); restart(); });
  slides.forEach(s => s.onclick = () => { if (s.dataset.clip) location.hash = '#/clip/' + s.dataset.clip; });
  // سحب باللمس
  let x0 = null;
  scr.addEventListener('touchstart', e => x0 = e.touches[0].clientX, { passive: true });
  scr.addEventListener('touchend', e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) { go(cur + (dx > 0 ? 1 : -1)); restart(); } x0 = null; });
  restart();
}
// شاشة التلفزيون الأولى قابلة للنقر حتى لو شريحة واحدة
function bindSingleSlide() { document.querySelectorAll('#tvScreen .slide[data-clip]').forEach(s => s.onclick = () => location.hash = '#/clip/' + s.dataset.clip); }

/* ---------------- الصفحات الأخرى ---------------- */
const pageHero = (t, p = '') => `<section class="page-hero"><h1>${esc(t)}</h1>${p ? `<p>${esc(p)}</p>` : ''}</section>`;
const sheet = inner => `<div class="sheet"><div class="wrap">${inner}</div></div>`;
const empty = (msg, ic = 'clapper') => `<div class="empty">${icon(ic)}<p>${esc(msg)}</p></div>`;
const grid = (items, fn = clipCard, cls = '') => items.length ? `<div class="grid ${cls}">${items.map(fn).join('')}</div>` : empty('لا توجد مقاطع هنا بعد');

function viewClips(filter) {
  const chips = [{ key: '', label: 'الكل' }, ...CATEGORIES.map(c => ({ key: c.key, label: catLabel(c.key) }))]
    .map(c => `<a class="chip ${c.key === (filter || '') ? 'on' : ''}" href="${c.key ? '#/cat/' + c.key : '#/clips'}">${esc(c.label)}</a>`).join('');
  const items = filter ? clipsOf(filter) : latest();
  return pageHero(filter ? catLabel(filter) : 'المقاطع', `${items.length} مقطع`) + sheet(`<div class="chips">${chips}</div>${grid(items)}`);
}
function viewSeriesList() { return pageHero('المسلسلات', `${S.series.length} مسلسل`) + sheet(grid(S.series, seriesCard, 'series')); }
function viewSeries(id) {
  const s = S.series.find(x => x.id === id);
  if (!s) return pageHero('غير موجود') + sheet(empty('هذا المسلسل غير موجود'));
  return pageHero(s.name, [s.season, s.desc].filter(Boolean).join(' — ')) + sheet(grid(S.clips.filter(c => c.seriesId === id)));
}
function viewSeasons() {
  const groups = {};
  S.series.forEach(s => (groups[s.season || 'أخرى'] = groups[s.season || 'أخرى'] || []).push(s));
  const keys = Object.keys(groups);
  return pageHero(S.site.seasonsLabel, 'المسلسلات مرتبة حسب الموسم') + sheet(keys.length ? keys.map(k => `<div class="season-block">${row(k, groups[k], '', seriesCard).replace('class="sec"', 'class="sec"')}</div>`).join('') : empty('لا توجد مواسم بعد', 'moon'));
}
function viewLive() {
  return pageHero('المباشر', S.live.some(l => l.isLive) ? 'بث مباشر الآن' : 'لا يوجد بث مباشر حالياً') + sheet(S.live.length ? grid(S.live, liveCard) : empty('لا يوجد بث مباشر حالياً', 'live'));
}
function viewFavs() {
  const f = getFavs(); const items = S.clips.filter(c => f.includes(c.id));
  return pageHero('مفضلتي', 'المقاطع المحفوظة على هذا الجهاز') + sheet(items.length ? grid(items) : empty('لم تضيفي أي مقطع للمفضلة بعد — اضغطي على القلب بجانب أي مقطع', 'heart'));
}
function viewSearch(q) {
  const n = q.trim();
  const items = n ? S.clips.filter(c => (c.title + ' ' + seriesName(c.seriesId)).includes(n)) : [];
  const ser = n ? S.series.filter(s => s.name.includes(n)) : [];
  return `<section class="page-hero"><h1>البحث</h1>
    <form class="searchbar" id="pageSearch" role="search" style="margin-top:20px"><input type="search" name="q" value="${esc(n)}" placeholder="ابحث عن مسلسل أو مقطع ..." aria-label="بحث"><button aria-label="بحث">${icon('search')}</button></form></section>`
    + sheet(n ? (ser.length ? row('مسلسلات', ser, '', seriesCard) : '') + (items.length ? `<div class="sec-head"><h2>مقاطع (${items.length})</h2></div>` + grid(items) : (ser.length ? '' : empty('لا توجد نتائج لـ «' + n + '»', 'search'))) : empty('اكتبي اسم مسلسل أو مقطع', 'search'));
}

/* ---------------- المشغل ---------------- */
function openPlayer({ title, meta, yt, clipId, live, more }) {
  const p = $('#player');
  const id = ytId(yt);
  $('#playerFrame').innerHTML = id
    ? `<iframe src="https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1" title="${esc(title)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`
    : `<div class="noyt">لم يُضف رابط يوتيوب لهذا ${live ? 'البث' : 'المقطع'} بعد.<br>يمكن إضافته من لوحة التحكم.</div>`;
  $('#playerTitle').textContent = title;
  $('#playerMeta').textContent = meta || '';
  const fb = $('#playerFav');
  if (clipId) {
    fb.hidden = false;
    const paint = () => { const on = isFav(clipId); fb.classList.toggle('on', on); fb.innerHTML = icon(on ? 'heartFill' : 'heart') + (on ? 'في مفضلتي' : 'أضيفي للمفضلة'); };
    paint(); fb.onclick = () => { toggleFav(clipId); paint(); };
  } else fb.hidden = true;
  $('#playerShare').onclick = async () => {
    const url = location.href;
    try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); toast('تم نسخ الرابط'); } } catch (e) {}
  };
  $('#playerMore').innerHTML = more && more.length ? `<h3>مقاطع أخرى</h3><div class="track">${more.map(clipCard).join('')}</div>` : '';
  p.hidden = false; document.body.style.overflow = 'hidden';
  if (clipId) addView(clipId);
  $('.player-close').focus();
}
function closePlayer(fromRoute) {
  const p = $('#player'); if (p.hidden) return;
  p.hidden = true; $('#playerFrame').innerHTML = ''; document.body.style.overflow = '';
  if (!fromRoute) { if (inApp) history.back(); else location.hash = '#' + (lastBase || '/'); }
}
let inApp = false;

/* ---------------- الموجّه ---------------- */
let lastBase = null;
function route() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [, a = '', b = ''] = h.split('/');
  // روابط المشغل: تفتح فوق الصفحة الحالية
  if (a === 'clip' || a === 'watch-live') {
    if (lastBase === null) render('/');
    if (a === 'clip') {
      const c = S.clips.find(x => x.id === b);
      if (!c) return (location.hash = '#/');
      openPlayer({ title: c.title, meta: [seriesName(c.seriesId), c.duration].filter(Boolean).join(' • '), yt: c.youtube, clipId: c.id,
        more: S.clips.filter(x => x.seriesId === c.seriesId && x.id !== c.id).slice(0, 10) });
    } else {
      const l = S.live.find(x => x.id === b);
      if (!l) return (location.hash = '#/live');
      openPlayer({ title: l.title, meta: l.isLive ? '● مباشر الآن' : l.desc, yt: l.youtube, live: true });
    }
    return;
  }
  const wasOpen = !$('#player').hidden;
  closePlayer(true);
  if (wasOpen && h === lastBase) return;   // رجوع من المشغل: نحافظ على مكان التمرير
  render(h);
}
function render(h) {
  lastBase = h;
  const [, a = '', b = ''] = h.split('/');
  const q = decodeURIComponent((h.split('?q=')[1] || ''));
  let html, key = a || 'home';
  switch (a) {
    case '': html = viewHome(); break;
    case 'clips': html = viewClips(); break;
    case 'cat': html = viewClips(b); key = 'clips'; break;
    case 'series': html = b ? viewSeries(b) : viewSeriesList(); break;
    case 'seasons': html = viewSeasons(); break;
    case 'live': html = viewLive(); break;
    case 'favs': html = viewFavs(); break;
    default: html = a.startsWith('search') ? viewSearch(q) : viewHome(); key = a.startsWith('search') ? 'search' : 'home';
  }
  const v = $('#view'); v.innerHTML = html;
  document.querySelectorAll('[data-route]').forEach(el => el.classList.toggle('active', el.dataset.route === key));
  $('#topbar').classList.toggle('solid', false);
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
  startTV(); bindSingleSlide();
  const f = $('#heroSearch') || $('#pageSearch');
  if (f) f.onsubmit = e => { e.preventDefault(); const val = f.q.value.trim(); location.hash = '#/search?q=' + encodeURIComponent(val); };
  if (a.startsWith('search')) $('#pageSearch input').focus();
}

/* ---------------- أحداث عامة ---------------- */
document.addEventListener('click', e => {
  const fav = e.target.closest('.fav[data-fav]');
  if (fav) { e.preventDefault(); toggleFav(fav.dataset.fav); return; }
  const rb = e.target.closest('.row-btn');
  if (rb) { const tr = rb.parentElement.querySelector('.track'); tr.scrollBy({ left: +rb.dataset.dir * tr.clientWidth * 0.9, behavior: 'smooth' }); return; }
  if (e.target.closest('[data-close]')) closePlayer();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePlayer(); });
$('#btnSearch').onclick = () => { location.hash = '#/search'; };
window.addEventListener('hashchange', () => { inApp = true; route(); });

/* ---------------- التشغيل ---------------- */
(async function start() {
  fillIcons();
  $('#view').innerHTML = `<section class="hero"><div class="hero-inner"><div class="hero-text"><h1>…</h1></div></div></section>`;
  try { S = await loadAll(); }
  catch (e) {
    console.error(e);
    $('#view').innerHTML = pageHero('تعذّر تحميل المحتوى', 'تأكدي من اتصال الإنترنت ثم أعيدي تحميل الصفحة');
    return;
  }
  document.title = S.site.siteName;
  if (S.logo) { $('#logo').src = S.logo; $('#footLogo').src = S.logo; }
  document.querySelectorAll('.seasons-label').forEach(el => el.textContent = S.site.seasonsLabel);
  document.querySelectorAll('.live-dot').forEach(d => d.hidden = !S.live.some(l => l.isLive));
  route();
  if (DEMO) console.info('وضع التجربة: البيانات تجريبية ومحفوظة في هذا المتصفح فقط.');
})();

if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
