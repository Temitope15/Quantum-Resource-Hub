/* ================================================
   utils.js  —  pure helpers, no DOM side-effects
   ================================================ */

const Utils = (() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const escapeHtml = (str) => {
    if (str == null) return '';
    return String(str)
      .replace(/&/g,  '&amp;')
      .replace(/</g,  '&lt;')
      .replace(/>/g,  '&gt;')
      .replace(/"/g,  '&quot;')
      .replace(/'/g, '&#39;');
  };

  const timeAgo = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    if (isNaN(d)) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)   return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days === 1) return 'yesterday';
    if (days < 30)  return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  const padNum = (n, width = 3) => String(n).padStart(width, '0');

  const debounce = (fn, ms = 200) => {
    let id;
    return (...args) => {
      clearTimeout(id);
      id = setTimeout(() => fn(...args), ms);
    };
  };

  const catKey = (cat) => (cat || 'other').toLowerCase();
  const catClass = (cat) => `cat-${catKey(cat)}`;

  /* Coerce a freeform input into a usable absolute URL,
     or return '' when the value clearly isn't a URL. */
  const sanitizeUrl = (raw) => {
    if (!raw) return '';
    const s = String(raw).trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (/\s/.test(s)) return '';        // whitespace → not a URL
    if (!/\./.test(s)) return '';       // no domain dot → not a URL
    return `https://${s}`;
  };

  return { $, $$, escapeHtml, timeAgo, padNum, debounce, catKey, catClass, sanitizeUrl };
})();
