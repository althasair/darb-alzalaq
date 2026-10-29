import { DEMO, CATEGORIES, ytId, ytThumb, mergeChannels, isDefaultChannel, CHANNEL_ICONS, list, getSetting, save, saveSetting, remove, authWatch, login, logout, resetPassword, resetDemo, init } from './data.js';
import { I, CH } from './icons.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const icon = n => `<span class="ic">${I[n] || ''}</span>`;
const fillIcons = (root = document) => root.querySelectorAll('.ic[data-i]').forEach(el => { el.innerHTML = I[el.dataset.i] || ''; el.removeAttribute('data-i'); });

function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.classList.toggle('err', !!err); t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}
const fail = e => { console.error(e); toast(e?.code === 'permission-denied' ? 'لا توجد صلاحية للحفظ — راجعي قواعد Firestore' : 'تعذّر الحفظ: ' + (e?.message || e), true); };

/* ---------------- ضغط الصور (تُحفظ داخل Firestore بلا حاجة لخدمة تخزين) ---------------- */
// ratio: إن وُجد تُقص الصورة من المنتصف لتطابق نسبة شاشة التلفزيون فتظهر كل الصور بالحجم نفسه
const TV_RATIO = 1.45;
function compress(file, maxW, keepAlpha, ratio) {
  return new Promise((res, rej) => {
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (ratio) {
        if (sw / sh > ratio) { const w = sh * ratio; sx = (sw - w) / 2; sw = w; }
        else { const h = sw / ratio; sy = (sh - h) * 0.3; sh = h; }   // نميل للأعلى قليلاً للحفاظ على الوجوه
      }
      const sc = Math.min(1, maxW / sw);
      const cv = document.createElement('canvas'); cv.width = Math.round(sw * sc); cv.height = Math.round(sh * sc);
      cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url);
      if (keepAlpha) { const d = cv.toDataURL('image/png'); if (d.length < 800e3) return res(d); return res(cv.toDataURL('image/webp', .9)); }
      let q = .85, d = cv.toDataURL('image/jpeg', q);
      while (d.length > 750e3 && q > .4) { q -= .1; d = cv.toDataURL('image/jpeg', q); }
      res(d);
    };
    img.onerror = () => rej(new Error('الملف ليس صورة صالحة'));
    img.src = url;
  });
}

/* ---------------- الحالة ---------------- */
const D = { series: [], clips: [], slides: [], live: [], channels: [] };
let tab = ['settings', 'slides', 'series', 'clips', 'channels', 'live'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'settings';
async function reload(col) { D[col] = col === 'channels' ? mergeChannels(await list(col)) : await list(col); }
const chOpts = () => [['', '— بدون قناة —'], ...D.channels.map(c => [c.id, c.name])];

/* ---------------- تعريف النماذج ---------------- */
const SCHEMAS = {
  slides: {
    title: 'شريحة', fields: () => [
      { k: 'title', label: 'العنوان الظاهر على الشاشة', type: 'text', ph: 'مثال: درب الزلق' },
      { k: 'image', label: 'صورة الشريحة', type: 'image', maxW: 1400, ratio: TV_RATIO, hint: 'تُقص تلقائياً لتطابق مقاس شاشة التلفزيون. إن تُركت فارغة تُستخدم صورة المقطع المرتبط.' },
      { k: 'clipId', label: 'المقطع الذي يفتح عند الضغط على الشاشة', type: 'select', opts: () => [['', '— بدون —'], ...D.clips.map(c => [c.id, c.title])] },
      { k: 'active', label: 'تظهر في شاشة التلفزيون', type: 'switch', def: true }
    ]
  },
  series: {
    title: 'مسلسل', fields: () => [
      { k: 'name', label: 'اسم المسلسل', type: 'text', req: true },
      { k: 'season', label: 'الموسم', type: 'text', ph: 'مثال: رمضان 2027 أو كلاسيكيات', list: [...new Set(D.series.map(s => s.season).filter(Boolean))] },
      { k: 'channelId', label: 'القناة', type: 'select', opts: chOpts },
      { k: 'desc', label: 'نبذة قصيرة', type: 'textarea' },
      { k: 'poster', label: 'صورة المسلسل (طولية)', type: 'image', maxW: 700, hint: 'اختيارية — إن تُركت فارغة تُستخدم صورة أول مقطع.' }
    ]
  },
  clips: {
    title: 'مقطع', fields: () => [
      { k: 'youtube', label: 'رابط المقطع من يوتيوب', type: 'youtube', req: true },
      { k: 'title', label: 'عنوان المقطع', type: 'text', req: true },
      { k: 'seriesId', label: 'المسلسل', type: 'select', opts: () => [['', '— اختاري —'], ...D.series.map(s => [s.id, s.name])] },
      { k: 'channelId', label: 'القناة', type: 'select', opts: chOpts, hint: 'إن تُركت فارغة يظهر المقطع في قناة مسلسله.' },
      { k: 'cats', label: 'التصنيفات', type: 'checks', opts: () => CATEGORIES.filter(c => c.key !== 'top').map(c => [c.key, c.key === 'ramadan' ? (window.__site?.ramadanLabel || c.label) : c.label]) },
      { k: 'duration', label: 'المدة', type: 'text', ph: '03:25', ltr: true }
    ]
  },
  channels: {
    title: 'قناة', fields: () => [
      { k: 'name', label: 'اسم القناة', type: 'text', req: true },
      { k: 'desc', label: 'الوصف القصير', type: 'text' },
      { k: 'color', label: 'لون القناة', type: 'color', def: '#7e2233' },
      { k: 'icon', label: 'الأيقونة', type: 'select', opts: () => Object.entries(CHANNEL_ICONS) },
      { k: 'youtube', label: 'رابط البث المباشر من يوتيوب', type: 'youtube', hint: 'رابط بث القناة (youtube.com/live/…). يظهر داخل صفحة القناة.' },
      { k: 'isLive', label: 'مباشر الآن (تظهر نقطة حمراء بجانب القناة)', type: 'switch', def: false }
    ]
  },
  live: {
    title: 'بث مباشر', fields: () => [
      { k: 'title', label: 'عنوان البث', type: 'text', req: true },
      { k: 'youtube', label: 'رابط البث من يوتيوب', type: 'youtube', hint: 'رابط البث المباشر (youtube.com/live/…) أو رابط فيديو عادي' },
      { k: 'desc', label: 'وصف قصير', type: 'text' },
      { k: 'poster', label: 'صورة الغلاف', type: 'image', maxW: 1400, hint: 'اختيارية — تُستخدم صورة يوتيوب تلقائياً.' },
      { k: 'isLive', label: 'مباشر الآن (تظهر شارة «مباشر» في الموقع)', type: 'switch', def: true }
    ]
  }
};

/* ---------------- بناء الحقول ---------------- */
function fieldHTML(f, v) {
  const id = 'f_' + f.k;
  const hint = f.hint ? `<span class="hint">${esc(f.hint)}</span>` : '';
  switch (f.type) {
    case 'color': return `<label>${f.label}<input type="color" name="${f.k}" value="${esc(v || f.def)}" style="height:48px;padding:4px;cursor:pointer">${hint}</label>`;
    case 'textarea': return `<label>${f.label}<textarea id="${id}" name="${f.k}">${esc(v)}</textarea>${hint}</label>`;
    case 'select': return `<label>${f.label}<select id="${id}" name="${f.k}">${f.opts().map(([val, t]) => `<option value="${esc(val)}" ${val === (v || '') ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>${hint}</label>`;
    case 'checks': return `<div><label>${f.label}</label><div class="checks">${f.opts().map(([val, t]) => `<label><input type="checkbox" name="${f.k}" value="${val}" ${(v || []).includes(val) ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div></div>`;
    case 'switch': return `<label class="switch"><input type="checkbox" name="${f.k}" ${(v ?? f.def) ? 'checked' : ''}>${f.label}</label>`;
    case 'image': return `<div><label>${f.label}</label><div class="imgfield" data-img="${f.k}">
        <div class="imgprev ${f.logo ? 'logo' : ''}" style="${v ? `background-image:url('${v}')` : ''}">${v ? '' : 'لا توجد صورة'}</div>
        <div class="btns"><label class="btn ghost">اختيار صورة<input type="file" accept="image/*" hidden></label><button type="button" class="btn ghost" data-clear>إزالة</button></div>
        <input type="hidden" name="${f.k}" value="${esc(v)}"></div>${hint}</div>`;
    case 'youtube': {
      const yid = ytId(v);
      return `<label>${f.label}<input id="${id}" name="${f.k}" value="${esc(v)}" dir="ltr" placeholder="https://www.youtube.com/watch?v=..." ${f.req ? 'required' : ''}>${hint}
        <div class="ytprev" data-yt>${yid ? `<img src="${ytThumb(yid)}" alt=""><span class="tag">✓ تم التعرف على المقطع</span>` : ''}</div></label>`;
    }
    default: return `<label>${f.label}<input id="${id}" name="${f.k}" value="${esc(v)}" ${f.ph ? `placeholder="${esc(f.ph)}"` : ''} ${f.ltr ? 'dir="ltr"' : ''} ${f.req ? 'required' : ''} ${f.list ? `list="${id}_l"` : ''}>${f.list ? `<datalist id="${id}_l">${f.list.map(x => `<option value="${esc(x)}">`).join('')}</datalist>` : ''}${hint}</label>`;
  }
}

function bindFields(root, fields) {
  root.querySelectorAll('[data-img]').forEach(box => {
    const f = fields.find(x => x.k === box.dataset.img);
    const hidden = box.querySelector('input[type=hidden]'), prev = box.querySelector('.imgprev');
    box.querySelector('input[type=file]').onchange = async e => {
      const file = e.target.files[0]; if (!file) return;
      prev.textContent = 'جارٍ التجهيز…';
      try { const d = await compress(file, f.maxW || 1400, f.logo, f.ratio); hidden.value = d; prev.style.backgroundImage = `url('${d}')`; prev.textContent = ''; }
      catch (err) { prev.textContent = err.message; }
    };
    box.querySelector('[data-clear]').onclick = () => { hidden.value = ''; prev.style.backgroundImage = ''; prev.textContent = 'لا توجد صورة'; };
  });
  root.querySelectorAll('[data-yt]').forEach(p => {
    const inp = p.parentElement.querySelector('input');
    inp.addEventListener('input', async () => {
      const id = ytId(inp.value);
      p.innerHTML = id ? `<img src="${ytThumb(id)}" alt=""><span class="tag">✓ تم التعرف على المقطع</span>` : (inp.value ? '<span class="tag warn">الرابط غير صحيح</span>' : '');
      const t = root.querySelector('[name=title]');
      if (id && t && !t.value) {   // جلب العنوان تلقائياً إن أمكن
        try { const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent('https://www.youtube.com/watch?v=' + id)}`); if (r.ok) { const j = await r.json(); if (!t.value) t.value = j.title || ''; } } catch (e) {}
      }
    });
  });
}

function readFields(root, fields) {
  const o = {};
  for (const f of fields) {
    if (f.type === 'checks') o[f.k] = [...root.querySelectorAll(`[name="${f.k}"]:checked`)].map(x => x.value);
    else if (f.type === 'switch') o[f.k] = root.querySelector(`[name="${f.k}"]`).checked;
    else if (f.type === 'youtube') o[f.k] = ytId(root.querySelector(`[name="${f.k}"]`).value) ? root.querySelector(`[name="${f.k}"]`).value.trim() : '';
    else o[f.k] = root.querySelector(`[name="${f.k}"]`).value.trim();
  }
  return o;
}

/* ---------------- نافذة الإضافة / التعديل ---------------- */
function openForm(col, item) {
  const sc = SCHEMAS[col]; const fields = sc.fields(); const dlg = $('#dlg');
  $('#dlgTitle').textContent = (item ? 'تعديل ' : 'إضافة ') + sc.title;
  $('#dlgBody').innerHTML = fields.map(f => fieldHTML(f, item ? item[f.k] : (f.def ?? ''))).join('');
  fillIcons(dlg); bindFields($('#dlgBody'), fields);
  dlg.showModal();
  $('#dlgSave').onclick = async e => {
    e.preventDefault();
    const data = readFields($('#dlgBody'), fields);
    const miss = fields.find(f => f.req && (f.type === 'youtube' ? !data[f.k] : !data[f.k]));
    if (miss) { toast(miss.type === 'youtube' ? 'رابط يوتيوب غير صحيح' : `الحقل «${miss.label}» مطلوب`, true); return; }
    if (!item) data.order = (Math.max(0, ...D[col].map(x => x.order || 0)) + 1);
    if (col === 'clips' && !item) data.views = 0;
    $('#dlgSave').disabled = true;
    try { await save(col, item?.id, data); await reload(col); dlg.close(); toast('تم الحفظ'); renderTab(); }
    catch (err) { fail(err); }
    finally { $('#dlgSave').disabled = false; }
  };
}

/* ---------------- القوائم ---------------- */
const seriesName = id => (D.series.find(s => s.id === id) || {}).name || '';
function itemRow(col, x) {
  let pic = '', title = '', meta = [];
  if (col === 'slides') {
    const c = D.clips.find(c => c.id === x.clipId);
    pic = x.image || (c && ytId(c.youtube) ? ytThumb(ytId(c.youtube)) : '');
    title = x.title || (c ? c.title : 'بدون عنوان');
    meta = [x.active === false ? '<span class="tag off">مخفية</span>' : '<span class="tag">ظاهرة</span>', c ? `<span class="tag">يفتح: ${esc(c.title)}</span>` : ''];
  } else if (col === 'series') {
    const n = D.clips.filter(c => c.seriesId === x.id); const first = n.find(c => ytId(c.youtube));
    pic = x.poster || (first ? ytThumb(ytId(first.youtube)) : ''); title = x.name;
    meta = [x.season ? `<span class="tag">${esc(x.season)}</span>` : '', `<span class="tag">${n.length} مقطع</span>`];
  } else if (col === 'clips') {
    pic = ytId(x.youtube) ? ytThumb(ytId(x.youtube)) : ''; title = x.title;
    meta = [seriesName(x.seriesId) ? `<span class="tag">${esc(seriesName(x.seriesId))}</span>` : '<span class="tag warn">بلا مسلسل</span>',
      ...(x.cats || []).map(k => `<span class="tag">${esc((CATEGORIES.find(c => c.key === k) || {}).label || k)}</span>`),
      x.duration ? `<span class="tag" dir="ltr">${esc(x.duration)}</span>` : '', `<span class="tag">${x.views || 0} مشاهدة</span>`,
      ytId(x.youtube) ? '' : '<span class="tag warn">بلا رابط</span>'];
  } else if (col === 'channels') {
    title = x.name;
    const n = D.clips.filter(c => c.channelId === x.id).length + D.series.filter(c => c.channelId === x.id).length;
    meta = [x.desc ? `<span class="tag">${esc(x.desc)}</span>` : '', x.isLive && ytId(x.youtube) ? '<span class="tag live">● مباشر الآن</span>' : (ytId(x.youtube) ? '<span class="tag">رابط البث مضاف</span>' : '<span class="tag off">بلا بث</span>'), `<span class="tag">${n} عنصر</span>`];
  } else if (col === 'live') {
    pic = x.poster || (ytId(x.youtube) ? ytThumb(ytId(x.youtube)) : ''); title = x.title;
    meta = [x.isLive ? '<span class="tag live">● مباشر الآن</span>' : '<span class="tag off">متوقف</span>', x.desc ? `<span class="tag">${esc(x.desc)}</span>` : ''];
  }
  return `<div class="item" data-id="${x.id}">
    <div class="ord"><button class="up" data-move="-1" aria-label="أعلى">${icon('left')}</button><button class="down" data-move="1" aria-label="أسفل">${icon('left')}</button></div>
    <div class="pic" ${col === 'channels' ? `style="background:${esc(x.color || '#7e2233')};color:#fff"` : ''}>${col === 'channels' ? `<span style="width:34px;height:34px;display:block">${CH[x.icon] || CH.tv}</span>` : (pic ? `<img src="${esc(pic)}" alt="" loading="lazy">` : esc(title))}</div>
    <div><h3>${esc(title)}</h3><div class="meta">${meta.join('')}</div></div>
    <div class="acts">${col === 'live' || col === 'channels' ? `<button data-toggle-live title="تشغيل/إيقاف المباشر">${icon('live')}</button>` : ''}<button data-edit aria-label="تعديل">${icon('edit')}</button><button class="del" data-del aria-label="حذف">${icon('trash')}</button></div>
  </div>`;
}

const TAB_INFO = {
  slides: ['شاشة التلفزيون', 'الصور التي تتقلب داخل شاشة التلفزيون في الصفحة الرئيسية', 'إضافة شريحة'],
  series: ['المسلسلات', 'أضيفي المسلسلات أولاً ثم اربطي بها المقاطع', 'إضافة مسلسل'],
  clips: ['المقاطع', 'الصقي رابط يوتيوب وتُجلب الصورة تلقائياً', 'إضافة مقطع'],
  channels: ['القنوات', 'القنوات الظاهرة على يمين الموقع — لكل قناة رابط بث مباشر ومحتوى خاص بها', 'إضافة قناة'],
  live: ['المباشر', 'روابط البث المباشر — فعّلي «مباشر الآن» ليظهر في أعلى الصفحة الرئيسية', 'إضافة بث']
};
let filterSeries = '', filterText = '';

function renderList(col) {
  const [h, p, add] = TAB_INFO[col];
  let items = D[col];
  if (col === 'clips') {
    items = [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (filterSeries) items = items.filter(c => c.seriesId === filterSeries);
    if (filterText) items = items.filter(c => c.title.includes(filterText));
  }
  $('#main').innerHTML = `
    <div class="head"><div><h1>${h}</h1><p>${p}</p></div><div class="toolbar" style="margin:0">${col === 'slides' ? `<label class="secs">تتغير الصورة كل<select id="tvSecs">${[3,4,5,6,7,8,9,10,12,15,20,30].map(n => `<option value="${n}" ${n === (+window.__site?.tvSeconds || 7) ? 'selected' : ''}>${n}</option>`).join('')}</select>ثوانٍ</label><label class="btn" id="bulkBtn">${icon('plus')}رفع عدة صور دفعة واحدة<input type="file" accept="image/*" multiple hidden id="bulkInput"></label>` : ''}<button class="btn dark" id="addBtn">${icon('plus')}${add}</button></div></div>
    ${col === 'clips' ? `<div class="toolbar"><input type="search" id="fText" placeholder="بحث في المقاطع…" value="${esc(filterText)}">
      <select id="fSeries"><option value="">كل المسلسلات</option>${D.series.map(s => `<option value="${s.id}" ${s.id === filterSeries ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>` : ''}
    ${items.length ? `<div class="items">${items.map(x => itemRow(col, x)).join('')}</div>` : `<div class="empty">لا توجد عناصر بعد — اضغطي «${add}»</div>`}`;
  $('#addBtn').onclick = () => openForm(col);
  if (col === 'slides') $('#tvSecs').onchange = async e => {
    const n = +e.target.value;
    try { await saveSetting('site', { tvSeconds: n }); window.__site = { ...(window.__site || {}), tvSeconds: n }; toast(`صارت الصورة تتغير كل ${n} ثوانٍ`); } catch (err) { fail(err); }
  };
  if (col === 'slides') $('#bulkInput').onchange = async e => {
    const files = [...e.target.files]; if (!files.length) return;
    let order = Math.max(0, ...D.slides.map(x => x.order || 0)), done = 0;
    for (const f of files) {
      toast(`جارٍ رفع الصور… ${done + 1} من ${files.length}`);
      try { const d = await compress(f, 1400, false, TV_RATIO); await save('slides', null, { title: '', image: d, clipId: '', active: true, order: ++order }); done++; }
      catch (err) { fail(err); break; }
    }
    await reload('slides'); renderTab(); toast(`تمت إضافة ${done} صورة إلى شاشة التلفزيون`);
    if (done && confirm(`تمت إضافة ${done} صورة. هل تريدين الرجوع للصفحة الرئيسية لمشاهدتها؟`)) location.href = 'index.html';
  };
  if (col === 'clips') {
    $('#fSeries').onchange = e => { filterSeries = e.target.value; renderList(col); };
    $('#fText').oninput = e => { filterText = e.target.value.trim(); clearTimeout(renderList._t); renderList._t = setTimeout(() => { renderList(col); const f = $('#fText'); f.focus(); f.setSelectionRange(f.value.length, f.value.length); }, 300); };
    $('.items')?.querySelectorAll('[data-move]').forEach(b => b.closest('.ord').style.visibility = 'hidden');
  }
  $('#main').querySelectorAll('.item').forEach(row => {
    const id = row.dataset.id; const x = D[col].find(i => i.id === id);
    row.querySelector('[data-edit]').onclick = () => openForm(col, x);
    row.querySelector('[data-del]').onclick = async () => {
      if (!confirm(`حذف «${x.title || x.name}»؟ لا يمكن التراجع.`)) return;
      try { if (col === 'channels' && isDefaultChannel(id)) await save(col, id, { deleted: true }); else await remove(col, id); await reload(col); toast('تم الحذف'); renderTab(); } catch (e) { fail(e); }
    };
    const tl = row.querySelector('[data-toggle-live]');
    if (tl) tl.onclick = async () => { try { await save(col, id, { isLive: !x.isLive }); await reload(col); toast(!x.isLive ? 'البث ظاهر الآن كمباشر' : 'تم إيقاف شارة المباشر'); renderTab(); } catch (e) { fail(e); } };
    row.querySelectorAll('[data-move]').forEach(b => b.onclick = async () => {
      const arr = D[col]; const i = arr.findIndex(a => a.id === id); const j = i + +b.dataset.move;
      if (j < 0 || j >= arr.length) return;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      try { await Promise.all(arr.map((a, k) => a.order === k + 1 ? null : save(col, a.id, { order: k + 1 }))); await reload(col); renderTab(); } catch (e) { fail(e); }
    });
  });
}

/* ---------------- الإعدادات العامة ---------------- */
async function renderSettings() {
  const [site, logo, hero] = await Promise.all([getSetting('site'), getSetting('logo'), getSetting('hero')]);
  const s = { siteName: 'درب الزلق', heroTitle: 'أجمل المسلسلات .. في مكان واحد', heroSubtitle: 'مقاطع مختارة .. لحظات لا تُنسى من مسلسلات رمضان 2027', seasonsLabel: 'مواسم رمضان', ramadanLabel: 'مقاطع رمضان 2027', tvSeconds: 7, ...site };
  window.__site = s;
  const textF = [
    { k: 'siteName', label: 'اسم المنصة', type: 'text' },
    { k: 'tvSeconds', label: 'مدة كل صورة في شاشة التلفزيون (بالثواني)', type: 'text', ltr: true },
    { k: 'heroTitle', label: 'العنوان الرئيسي', type: 'text', full: true },
    { k: 'heroSubtitle', label: 'النص تحت العنوان', type: 'textarea', full: true },
    { k: 'seasonsLabel', label: 'اسم قسم المواسم في القائمة', type: 'text' },
    { k: 'ramadanLabel', label: 'اسم تصنيف رمضان', type: 'text' }
  ];
  const logoF = [{ k: 'data', label: 'الشعار', type: 'image', maxW: 700, logo: true, hint: 'PNG بخلفية شفافة للحصول على أفضل نتيجة' }];
  const heroF = [{ k: 'data', label: 'خلفية الواجهة', type: 'image', maxW: 1800, hint: 'صورة عريضة — إن تُركت فارغة تظهر خلفية دافئة داكنة' }];
  $('#main').innerHTML = `
    <div class="head"><div><h1>الإعدادات العامة</h1><p>النصوص والشعار وخلفية الصفحة الرئيسية</p></div></div>
    <div class="panel"><h2>النصوص</h2><div class="form-grid" id="pText">${textF.map(f => `<div class="${f.full ? 'full' : ''}">${fieldHTML(f, s[f.k])}</div>`).join('')}</div>
      <div style="margin-top:16px"><button class="btn dark" id="saveText">حفظ النصوص</button></div></div>
    <div class="panel"><h2>الشعار</h2><div id="pLogo">${fieldHTML(logoF[0], logo.data || '')}</div><div style="margin-top:14px"><button class="btn dark" id="saveLogo">حفظ الشعار</button></div></div>
    <div class="panel"><h2>خلفية الواجهة</h2><div id="pHero">${fieldHTML(heroF[0], hero.data || '')}</div><div style="margin-top:14px"><button class="btn dark" id="saveHero">حفظ الخلفية</button></div></div>`;
  bindFields($('#pLogo'), logoF); bindFields($('#pHero'), heroF);
  $('#saveText').onclick = async () => { const d = readFields($('#pText'), textF); d.tvSeconds = Math.max(2, parseInt(d.tvSeconds) || 7); try { await saveSetting('site', d); window.__site = { ...s, ...d }; toast('تم حفظ النصوص'); } catch (e) { fail(e); } };
  $('#saveLogo').onclick = async () => { try { await saveSetting('logo', readFields($('#pLogo'), logoF)); toast('تم حفظ الشعار'); paintLogo(); } catch (e) { fail(e); } };
  $('#saveHero').onclick = async () => { try { await saveSetting('hero', readFields($('#pHero'), heroF)); toast('تم حفظ الخلفية'); } catch (e) { fail(e); } };
}
async function paintLogo() { try { const l = await getSetting('logo'); if (l.data) { $('#sideLogo').src = l.data; $('#loginLogo').src = l.data; } } catch (e) {} }

function renderTab() {
  document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  if (tab === 'settings') renderSettings().catch(fail); else renderList(tab);
}

/* ---------------- التشغيل ---------------- */
fillIcons();
if (DEMO) { $('#demoBar').hidden = false; $('#resetDemo').onclick = () => { if (confirm('إعادة البيانات التجريبية؟')) { resetDemo(); location.reload(); } }; }
document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { tab = b.dataset.tab; renderTab(); window.scrollTo(0, 0); });
$('#logout').onclick = () => logout();
$('#loginForm').onsubmit = async e => {
  e.preventDefault(); const f = e.target;
  $('#loginMsg').textContent = 'جارٍ الدخول…';
  try { await login(f.email.value, f.pass.value); }
  catch (err) { $('#loginMsg').textContent = 'البريد أو كلمة المرور غير صحيحة'; $('#loginMsg').style.color = 'var(--red)'; }
};
$('#forgot').onclick = async () => {
  const em = $('#loginForm').email.value; if (!em) { $('#loginMsg').textContent = 'اكتبي بريدك أولاً ثم اضغطي «نسيت كلمة المرور»'; return; }
  try { await resetPassword(em); $('#loginMsg').textContent = 'أُرسل رابط إعادة التعيين إلى بريدك'; } catch (e) { $('#loginMsg').textContent = 'تعذّر الإرسال — تأكدي من البريد'; }
};
if (DEMO) $('#loginForm').querySelectorAll('input').forEach(i => i.required = false);

paintLogo();
authWatch(async u => {
  if (u === 'denied') { $('#loginView').hidden = false; $('#appView').hidden = true; $('#loginMsg').textContent = 'هذا الحساب ليس له صلاحية الإدارة'; $('#loginMsg').style.color = 'var(--red)'; await logout(); return; }
  $('#loginView').hidden = !!u; $('#appView').hidden = !u;
  if (!u) return;
  try { await Promise.all(['series', 'clips', 'slides', 'live', 'channels'].map(reload)); window.__site = { tvSeconds: 7, ...(await getSetting('site')) }; } catch (e) { fail(e); }
  renderTab();
}).catch(fail);
