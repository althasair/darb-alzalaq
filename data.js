// طبقة البيانات: Firebase عند ضبط الإعدادات، وإلا وضع تجربة محفوظ في المتصفح
import { firebaseConfig, ADMIN_EMAILS } from './firebase-config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
export const DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith('PASTE');
export const COLLECTIONS = ['slides', 'series', 'clips', 'live'];

let app, db, fs, authMod, auth;

export async function init() {
  if (DEMO || db) return;
  const { initializeApp } = await import(FB + 'firebase-app.js');
  fs = await import(FB + 'firebase-firestore.js');
  app = initializeApp(firebaseConfig);
  db = fs.getFirestore(app);
}

/* ---------------- الفئات الثابتة ---------------- */
export const CATEGORIES = [
  { key: 'family',  label: 'العائلة',            tone: 'lav',   icon: 'family' },
  { key: 'comedy',  label: 'الكوميديا',          tone: 'blue',  icon: 'masks' },
  { key: 'ramadan', label: 'مقاطع رمضان',        tone: 'mint',  icon: 'moon' },
  { key: 'gulf',    label: 'مسلسلات خليجية',     tone: 'peach', icon: 'tv' },
  { key: 'top',     label: 'المقاطع الأكثر مشاهدة', tone: 'rose', icon: 'clapper' }
];

/* ---------------- يوتيوب ---------------- */
export function ytId(input) {
  if (!input) return '';
  const s = String(input).trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|v=|\/shorts\/|\/live\/|\/embed\/)([\w-]{11})/);
  return m ? m[1] : '';
}
export const ytThumb = (id, q = 'hqdefault') => id ? `https://i.ytimg.com/vi/${id}/${q}.jpg` : '';

/* ---------------- وضع التجربة ---------------- */
const DEMO_KEY = 'farjan_demo_db_v1';
function seed() {
  const now = Date.now();
  const series = [
    { id: 's1', name: 'درب الزلق', season: 'كلاسيكيات', desc: 'مسلسل تجريبي — استبدليه من لوحة التحكم', order: 1 },
    { id: 's2', name: 'طاش ما طاش', season: 'رمضان 2027', desc: '', order: 2 },
    { id: 's3', name: 'فنون الخليج', season: 'رمضان 2027', desc: '', order: 3 },
    { id: 's4', name: 'بو طارش', season: 'كلاسيكيات', desc: '', order: 4 },
    { id: 's5', name: 'مسلسلات زمان', season: 'كلاسيكيات', desc: '', order: 5 }
  ];
  const t = ['مشهد البداية', 'لقطة لا تنسى', 'الموقف الطريف', 'حوار المجلس', 'النهاية السعيدة', 'أجمل لحظة', 'ضحكة العيد', 'سهرة رمضان'];
  const cats = [['comedy', 'gulf'], ['family', 'ramadan'], ['comedy'], ['gulf', 'family'], ['ramadan', 'comedy']];
  const durs = ['03:25', '04:10', '05:12', '02:48', '06:30', '03:05', '04:44', '02:19'];
  const clips = [];
  let n = 0;
  series.forEach((s, i) => {
    for (let k = 0; k < 2; k++) {
      clips.push({ id: 'c' + (++n), title: s.name + ' — ' + t[(i * 2 + k) % t.length], seriesId: s.id, youtube: '',
        cats: cats[(i + k) % cats.length], duration: durs[n % durs.length], views: (n * 37) % 200, createdAt: now - n * 3600e3 });
    }
  });
  const slides = series.slice(0, 4).map((s, i) => ({ id: 'sl' + (i + 1), title: s.name, image: '', clipId: 'c' + (i * 2 + 1), order: i + 1, active: true }));
  const live = [{ id: 'l1', title: 'بث مباشر تجريبي', desc: 'أضيفي رابط البث من لوحة التحكم', youtube: '', isLive: true, order: 1 }];
  return {
    settings: {
      site: { siteName: 'درب الزلق', heroTitle: 'أجمل المسلسلات .. في مكان واحد', heroSubtitle: 'مقاطع مختارة .. لحظات لا تُنسى من مسلسلات رمضان 2027', seasonsLabel: 'مواسم رمضان', ramadanLabel: 'مقاطع رمضان 2027', tvSeconds: 7 },
      logo: { data: '' }, hero: { data: '' }
    },
    series, clips, slides, live
  };
}
function demoDB() {
  try { const raw = localStorage.getItem(DEMO_KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  const d = seed(); demoSave(d); return d;
}
function demoSave(d) { try { localStorage.setItem(DEMO_KEY, JSON.stringify(d)); } catch (e) { alert('مساحة وضع التجربة ممتلئة — الصور الكبيرة تحتاج Firebase'); } }
export function resetDemo() { try { localStorage.removeItem(DEMO_KEY); } catch (e) {} }

const sortFn = (a, b) => (a.order ?? 999) - (b.order ?? 999) || (b.createdAt || 0) - (a.createdAt || 0);

/* ---------------- القراءة ---------------- */
export async function list(col) {
  if (DEMO) return [...(demoDB()[col] || [])].sort(sortFn);
  await init();
  const snap = await fs.getDocs(fs.collection(db, col));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort(sortFn);
}
export async function getSetting(id) {
  if (DEMO) return demoDB().settings[id] || {};
  await init();
  const s = await fs.getDoc(fs.doc(db, 'settings', id));
  return s.exists() ? s.data() : {};
}
/* ---------------- القنوات ----------------
   القنوات الافتراضية تظهر فوراً بلا إعداد؛ أي تعديل من لوحة التحكم يُحفظ بنفس المعرّف ويغطي الافتراضي */
export const CHANNEL_ICONS = {
  tv: 'تلفزيون', plus: 'إضافة', music: 'موسيقى', monitor: 'شاشة', moonstar: 'هلال', shapes: 'أشكال',
  globe: 'كرة أرضية', news: 'صحيفة', trophy: 'كأس', book: 'كتاب', people: 'أشخاص', film: 'فيلم',
  clap: 'كلاكيت', masks: 'أقنعة المسرح', smile: 'وجه مبتسم'
};
export const DEFAULT_CHANNELS = [
  ['ch-main', 'الوطن', 'القناة العامة', '#7e2233', 'tv'],
  ['ch-plus', 'الوطن بلس +', 'إعادات ومحتوى إضافي', '#a8894e', 'plus'],
  ['ch-music', 'الوطن غناوي', 'الأغاني والطرب', '#7a52a8', 'music'],
  ['ch-hd', 'الوطن HD', 'نسخة البث عالي الدقة', '#3d6ea3', 'monitor'],
  ['ch-classic', 'الوطن كلاسيك', 'أعمال الزمن الجميل', '#7d6a55', 'monitor'],
  ['ch-ramadan', 'الوطن رمضان', 'المسلسلات والبرامج الرمضانية', '#3f7f78', 'moonstar'],
  ['ch-kids', 'الوطن أطفال', 'الكرتون والبرامج العائلية', '#5585cc', 'shapes'],
  ['ch-docs', 'الوطن وثائقية', 'التاريخ والعلوم والوثائقيات', '#677b57', 'globe'],
  ['ch-news', 'الوطن الإخبارية', 'الأخبار والتقارير', '#9a3540', 'news'],
  ['ch-sports', 'الوطن الرياضية', 'المباريات والتحليل الرياضي', '#3a7a62', 'trophy'],
  ['ch-culture', 'الوطن الثقافية', 'التراث والأدب والفنون', '#8a68a8', 'book'],
  ['ch-social', 'الوطن الاجتماعية', 'الأسرة والمجتمع', '#b56f85', 'people'],
  ['ch-films', 'الوطن أفلام', 'الأفلام العربية والخليجية', '#343b55', 'film'],
  ['ch-series', 'الوطن مسلسلات', 'الدراما الخليجية والعربية', '#a96c42', 'clap'],
  ['ch-theater', 'الوطن مسرحيات', 'المسرح الكويتي والخليجي', '#7d4f9f', 'masks'],
  ['ch-comedy', 'الوطن كوميديا', 'المشاهد والمقاطع المضحكة', '#cca447', 'smile']
].map(([id, name, desc, color, icon], i) => ({ id, name, desc, color, icon, youtube: '', isLive: false, order: i + 1, isDefault: true }));
export const isDefaultChannel = id => DEFAULT_CHANNELS.some(c => c.id === id);
export function mergeChannels(docs) {
  const map = new Map(DEFAULT_CHANNELS.map(c => [c.id, { ...c }]));
  (docs || []).forEach(d => map.set(d.id, { ...(map.get(d.id) || {}), ...d }));
  return [...map.values()].filter(c => !c.deleted).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
}

export async function loadAll() {
  const [site, logo, hero, slides, series, clips, live, channels] = await Promise.all([
    getSetting('site'), getSetting('logo'), getSetting('hero'),
    list('slides'), list('series'), list('clips'), list('live'), list('channels')
  ]);
  return { site: { ...seed().settings.site, ...site }, logo: logo.data || '', hero: hero.data || '', slides, series, clips, live, channels: mergeChannels(channels) };
}

/* ---------------- الكتابة (لوحة التحكم) ---------------- */
export async function save(col, id, data) {
  if (DEMO) {
    const d = demoDB(); d[col] = d[col] || [];
    if (!id) { id = col[0] + Date.now().toString(36); d[col].push({ id, createdAt: Date.now(), ...data }); }
    else { const i = d[col].findIndex(x => x.id === id); if (i >= 0) d[col][i] = { ...d[col][i], ...data }; else d[col].push({ id, ...data }); }
    demoSave(d); return id;
  }
  await init();
  if (!id) { const ref = await fs.addDoc(fs.collection(db, col), { createdAt: Date.now(), ...data }); return ref.id; }
  await fs.setDoc(fs.doc(db, col, id), data, { merge: true }); return id;
}
export async function saveSetting(id, data) {
  if (DEMO) { const d = demoDB(); d.settings[id] = { ...(d.settings[id] || {}), ...data }; demoSave(d); return; }
  await init();
  await fs.setDoc(fs.doc(db, 'settings', id), data, { merge: true });
}
export async function remove(col, id) {
  if (DEMO) { const d = demoDB(); d[col] = (d[col] || []).filter(x => x.id !== id); demoSave(d); return; }
  await init();
  await fs.deleteDoc(fs.doc(db, col, id));
}
export async function addView(id) {
  try {
    if (DEMO) { const d = demoDB(); const c = d.clips.find(x => x.id === id); if (c) { c.views = (c.views || 0) + 1; demoSave(d); } return; }
    await init();
    await fs.updateDoc(fs.doc(db, 'clips', id), { views: fs.increment(1) });
  } catch (e) { /* لا يوقف التشغيل */ }
}

/* ---------------- الدخول ---------------- */
export async function authWatch(cb) {
  if (DEMO) { cb(sessionStorage.getItem('farjan_demo_admin') ? { email: 'وضع التجربة' } : null); return; }
  await init();
  authMod = await import(FB + 'firebase-auth.js');
  auth = authMod.getAuth(app);
  authMod.onAuthStateChanged(auth, u => cb(u && (!ADMIN_EMAILS.length || ADMIN_EMAILS.includes((u.email || '').toLowerCase())) ? u : (u ? 'denied' : null)));
}
export async function login(email, pass) {
  if (DEMO) { sessionStorage.setItem('farjan_demo_admin', '1'); location.reload(); return; }
  await authMod.signInWithEmailAndPassword(auth, email.trim(), pass);
}
export async function resetPassword(email) {
  if (DEMO) return;
  await authMod.sendPasswordResetEmail(auth, email.trim());
}
export async function logout() {
  if (DEMO) { sessionStorage.removeItem('farjan_demo_admin'); location.reload(); return; }
  await authMod.signOut(auth);
}
