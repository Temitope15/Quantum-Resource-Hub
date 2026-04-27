/* ================================================
   ui.js  —  rendering, modals, toast, filter chips
   Keeps DOM concerns isolated from state/data.
   ================================================ */

const UI = (() => {
  const { $, $$, escapeHtml, timeAgo, padNum, catClass } = Utils;

  /* ── ICONS (single source of truth) ───────────── */
  const icons = {
    arrow:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    chat:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></svg>`,
    search: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
    empty:  `<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
    err:    `<svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>`,
  };

  /* ── CARD MARKUP ───────────────────────────────── */
  const cardHTML = (r, idx, commentCount) => {
    const num   = padNum(idx + 1);
    const cat   = r.category || 'Other';
    const delay = Math.min(idx * 0.04, 0.4);
    const meta  = [
      r.submittedBy ? `by ${escapeHtml(r.submittedBy)}` : '',
      r.timestamp   ? timeAgo(r.timestamp) : '',
    ].filter(Boolean);

    return `
      <article class="card ${catClass(cat)}" style="animation-delay:${delay}s" data-resource-id="${escapeHtml(r.id)}">
        <header class="card-head">
          <span class="card-num">№ ${num}</span>
          <span class="card-cat">${escapeHtml(cat)}</span>
        </header>
        <h3 class="card-title">${escapeHtml(r.title || 'Untitled')}</h3>
        ${r.description ? `<p class="card-desc">${escapeHtml(r.description)}</p>` : ''}
        ${meta.length ? `
          <div class="card-meta">
            ${meta.map((m, i) => i === 0 ? `<span>${m}</span>` : `<span class="sep"></span><span>${m}</span>`).join('')}
          </div>` : ''}
        <footer class="card-foot">
          <a class="card-link" href="${escapeHtml(r.url || '#')}" target="_blank" rel="noopener" data-stop>
            Open ${icons.arrow}
          </a>
          <button class="card-comments" data-action="comments" data-resource-id="${escapeHtml(r.id)}">
            ${icons.chat} <strong>${commentCount}</strong> ${commentCount === 1 ? 'note' : 'notes'}
          </button>
        </footer>
      </article>`;
  };

  const renderGrid = (resources, getCommentCount) => {
    const grid  = $('#grid');
    const count = $('#resultsCount');

    if (!resources.length) {
      count.textContent = '0 results';
      grid.innerHTML = `
        <div class="state-block">
          ${icons.empty}
          <h3>Nothing matches</h3>
          <p>Try a different keyword or filter — or be the first to add a resource here.</p>
        </div>`;
      return;
    }

    count.textContent = `${resources.length} ${resources.length === 1 ? 'entry' : 'entries'}`;
    grid.innerHTML = resources.map((r, i) => cardHTML(r, i, getCommentCount(r.id))).join('');
  };

  const renderError = () => {
    $('#resultsCount').textContent = 'Failed to load';
    $('#grid').innerHTML = `
      <div class="state-block">
        ${icons.err}
        <h3>Could not load resources</h3>
        <p>Check the Apps Script deployment — make sure access is set to <em>Anyone</em>.</p>
      </div>`;
  };

  const renderLoading = () => {
    $('#grid').innerHTML = `
      <div class="state-block">
        <span class="spinner"></span>
        <span style="font-family:var(--mono); font-size:12px; letter-spacing:0.05em;">Fetching the archive…</span>
      </div>`;
  };

  /* ── STATS ─────────────────────────────────────── */
  const renderStats = ({ total, comments, categories }) => {
    $('#stat-total').textContent    = total;
    $('#stat-comments').textContent = comments;
    $('#stat-cats').textContent     = categories;
  };

  /* ── COMMENTS ─────────────────────────────────── */
  const renderComments = (comments) => {
    const list = $('#commentsList');
    if (!comments.length) {
      list.innerHTML = `<div class="no-comments">— no notes yet, be the first —</div>`;
      return;
    }
    list.innerHTML = comments.map(c => `
      <div class="comment">
        <div class="comment-head">
          <span class="comment-author">${escapeHtml(c.commenterName || 'Anonymous')}</span>
          <span class="comment-time">${timeAgo(c.timestamp)}</span>
        </div>
        <div class="comment-text">${escapeHtml(c.comment)}</div>
      </div>`).join('');
  };

  const setCommentResource = (resource) => {
    $('#cPreviewTitle').textContent = resource.title || 'Untitled';
    $('#cPreviewUrl').textContent   = resource.url   || '';
  };

  /* ── MODALS ────────────────────────────────────── */
  const openModal = (id) => {
    $(`#${id}`).classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = (id) => {
    $(`#${id}`).classList.remove('open');
    if (!$$('.overlay.open').length) document.body.style.overflow = '';
  };

  const closeAllModals = () => $$('.overlay').forEach(o => o.classList.remove('open'));

  /* ── FORMS ─────────────────────────────────────── */
  const readAddForm = () => ({
    title:       $('#f-title').value.trim(),
    url:         $('#f-url').value.trim(),
    category:    $('#f-cat').value,
    submittedBy: $('#f-name').value.trim() || 'Anonymous',
    description: $('#f-desc').value.trim(),
  });

  const clearAddForm = () => {
    ['f-title', 'f-url', 'f-name', 'f-desc', 'f-cat'].forEach(id => { $(`#${id}`).value = ''; });
  };

  const readCommentForm = () => ({
    commenterName: $('#c-name').value.trim() || 'Anonymous',
    comment:       $('#c-text').value.trim(),
  });

  const clearCommentForm = () => {
    $('#c-name').value = '';
    $('#c-text').value = '';
  };

  const setBusy = (btnId, busy, restore) => {
    const btn = $(`#${btnId}`);
    btn.disabled = busy;
    btn.innerHTML = busy ? `<span class="spinner" style="width:14px;height:14px;border-width:1.5px;margin:0;"></span> Working…` : restore;
  };

  /* ── TOAST ─────────────────────────────────────── */
  let toastTimer;
  const toast = (msg, ok = true) => {
    const el  = $('#toast');
    const ico = $('#toastIcon');
    el.className = `toast ${ok ? 'success' : 'error'} show`;
    ico.textContent = ok ? '✓' : '✕';
    $('#toastMsg').textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3500);
  };

  /* ── FILTER CHIPS ──────────────────────────────── */
  const setActiveChip = (target) => {
    $$('.chip').forEach(c => c.classList.remove('active'));
    target.classList.add('active');
  };

  return {
    renderGrid, renderError, renderLoading, renderStats,
    renderComments, setCommentResource,
    openModal, closeModal, closeAllModals,
    readAddForm, clearAddForm,
    readCommentForm, clearCommentForm,
    setBusy, toast, setActiveChip,
  };
})();
