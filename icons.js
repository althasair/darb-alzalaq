// أيقونات SVG مشتركة
const s = (p, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${p}</svg>`;
export const I = {
  home: s('<path d="M3 11.2 12 4l9 7.2V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" fill="currentColor"/>'),
  moon: s('<path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5 8.5 8.5 0 1 0 20.5 14.6z" fill="currentColor"/>'),
  tv: s('<rect x="2.5" y="6.5" width="19" height="13.5" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m8 2.5 4 4 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="18" cy="11" r="1.2" fill="currentColor"/><circle cx="18" cy="15" r="1.2" fill="currentColor"/>'),
  clapper: s('<path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor"/><path d="m3.3 8.2-.6-2.4a1.5 1.5 0 0 1 1.1-1.8L17 .9a1.5 1.5 0 0 1 1.8 1.1l.6 2.4z" fill="currentColor" opacity=".75"/>'),
  masks: s('<path d="M3 4.5c3 1.4 6 1.4 9 0v6.2c0 3.3-2 5.6-4.5 5.6S3 14 3 10.7z" fill="currentColor" opacity=".55"/><path d="M12 8.5c3 1.4 6 1.4 9 0v6.2c0 3.3-2 5.6-4.5 5.6S12 18 12 14.7z" fill="currentColor"/><path d="M14.5 16.2c1.2.9 2.8.9 4 0" stroke="#fff" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="14.6" cy="12.6" r=".9" fill="#fff"/><circle cx="18.4" cy="12.6" r=".9" fill="#fff"/>'),
  family: s('<circle cx="12" cy="6.5" r="3" fill="currentColor"/><circle cx="5.5" cy="8.5" r="2.3" fill="currentColor" opacity=".8"/><circle cx="18.5" cy="8.5" r="2.3" fill="currentColor" opacity=".8"/><path d="M6.5 20v-3.5a5.5 5.5 0 0 1 11 0V20z" fill="currentColor"/><path d="M1.5 19v-2.6a4 4 0 0 1 5.6-3.7A7.4 7.4 0 0 0 5 16.5V19zM22.5 19v-2.6a4 4 0 0 0-5.6-3.7 7.4 7.4 0 0 1 2.1 3.8V19z" fill="currentColor" opacity=".8"/>'),
  search: s('<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  heart: s('<path d="M12 20.3s-7.8-4.6-7.8-10.3A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 7.8 2.5c0 5.7-7.8 10.3-7.8 10.3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
  heartFill: s('<path d="M12 20.3s-7.8-4.6-7.8-10.3A4.3 4.3 0 0 1 12 7.5a4.3 4.3 0 0 1 7.8 2.5c0 5.7-7.8 10.3-7.8 10.3z" fill="currentColor"/>'),
  user: s('<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="9.5" r="3.4" fill="currentColor"/><path d="M5.6 18.4a7.5 7.5 0 0 1 12.8 0" fill="currentColor"/>'),
  play: s('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'),
  left: s('<path d="m14.5 5-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  right: s('<path d="m9.5 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  close: s('<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  share: s('<circle cx="18" cy="5.5" r="2.6" fill="currentColor"/><circle cx="6" cy="12" r="2.6" fill="currentColor"/><circle cx="18" cy="18.5" r="2.6" fill="currentColor"/><path d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4" stroke="currentColor" stroke-width="1.8"/>'),
  live: s('<circle cx="12" cy="12" r="3.2" fill="currentColor"/><path d="M7.1 7.1a7 7 0 0 0 0 9.8M16.9 7.1a7 7 0 0 1 0 9.8M4.2 4.2a11 11 0 0 0 0 15.6M19.8 4.2a11 11 0 0 1 0 15.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>'),
  grid: s('<rect x="3" y="3" width="7.5" height="7.5" rx="2" fill="currentColor"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2" fill="currentColor"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2" fill="currentColor"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" fill="currentColor"/>'),
  edit: s('<path d="M4 20h4L19 9l-4-4L4 16z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
  trash: s('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'),
  plus: s('<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  eye: s('<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/>')
};
