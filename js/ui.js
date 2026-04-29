/* ================================================
   ui.js  —  rendering, modals, toast, filter chips
   Keeps DOM concerns isolated from state/data.
   ================================================ */

const UI = (() => {
  const { $, $$, escapeHtml, timeAgo, padNum, catClass, sanitizeUrl } = Utils;

  /* ── ICONS (single source of truth) ───────────── */
  const icons = {
    arrow:  `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    chat:   `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/></svg>`,
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
          <span class="card-link">View details ${icons.arrow}</span>
          <button class="card-comments" data-action="open-detail" data-resource-id="${escapeHtml(r.id)}">
            ${icons.chat} <strong>${commentCount}</strong> ${commentCount === 1 ? 'comment' : 'comments'}
          </button>
        </footer>
      </article>`;
  };

  const renderGrid = (resources, getCommentCount) => {
    const grid  = $('#grid');
    const count = $('#resultsCount');
    if (!grid) return;

    if (!resources.length) {
      if (count) count.textContent = '0 results';
      grid.innerHTML = `
        <div class="state-block">
          ${icons.empty}
          <h3>Nothing matches</h3>
          <p>Try a different keyword or filter — or be the first to add a resource here.</p>
        </div>`;
      return;
    }

    if (count) count.textContent = `${resources.length} ${resources.length === 1 ? 'entry' : 'entries'}`;
    grid.innerHTML = resources.map((r, i) => cardHTML(r, i, getCommentCount(r.id))).join('');
  };

  /* ── FEATURED (landing page) ───────────────────── */
  const renderFeatured = (resources, getCommentCount, max = 6) => {
    const grid = $('#featured-grid');
    if (!grid) return;

    if (!resources.length) {
      grid.innerHTML = `
        <div class="state-block">
          ${icons.empty}
          <h3>The archive is empty</h3>
          <p>No resources yet — be the first to contribute one in the Library.</p>
        </div>`;
      return;
    }

    /* Most recent first when timestamps exist; otherwise preserve order. */
    const sorted = [...resources].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime() || 0;
      const tb = new Date(b.timestamp).getTime() || 0;
      return tb - ta;
    }).slice(0, max);

    grid.innerHTML = sorted.map((r, i) => cardHTML(r, i, getCommentCount(r.id))).join('');
  };

  const renderError = () => {
    const count = $('#resultsCount');
    const grid  = $('#grid');
    const featured = $('#featured-grid');
    const errBlock = `
      <div class="state-block">
        ${icons.err}
        <h3>Could not load resources</h3>
        <p>Check the Apps Script deployment — make sure access is set to <em>Anyone</em>.</p>
      </div>`;
    if (count) count.textContent = 'Failed to load';
    if (grid)  grid.innerHTML  = errBlock;
    if (featured) featured.innerHTML = errBlock;
  };

  const renderLoading = () => {
    const grid = $('#grid');
    if (!grid) return;
    grid.innerHTML = `
      <div class="state-block">
        <span class="spinner"></span>
        <span style="font-size:13px; letter-spacing:0.02em;">Fetching the archive…</span>
      </div>`;
  };

  /* ── STATS ─────────────────────────────────────── */
  const renderStats = ({ total, comments, categories }) => {
    const t = $('#stat-total');
    const c = $('#stat-comments');
    const k = $('#stat-cats');
    if (t) t.textContent = total;
    if (c) c.textContent = comments;
    if (k) k.textContent = categories;
  };

  /* ── RESOURCE DETAIL ───────────────────────────── */
  const renderResourceDetail = (resource, index, comments) => {
    const cat   = resource.category || 'Other';
    const modal = $('#detailOverlay .modal');

    /* Reset prior category classes, then apply current one
       — drives the colored top bar via --cat-color */
    modal.className = `modal modal-lg ${catClass(cat)}`;

    $('#dNum').textContent   = `№ ${padNum(index + 1)}`;
    $('#dCat').textContent   = cat;
    $('#detailTitle').textContent = resource.title || 'Untitled';

    const metaParts = [];
    if (resource.submittedBy) metaParts.push(`<span class="author">${escapeHtml(resource.submittedBy)}</span>`);
    if (resource.timestamp)   metaParts.push(`<span>${timeAgo(resource.timestamp)}</span>`);
    $('#dMeta').innerHTML = metaParts.join('<span class="sep"></span>') || '';

    const desc = $('#dDesc');
    if (resource.description) {
      desc.textContent = resource.description;
      desc.style.display = '';
    } else {
      desc.textContent = '';
      desc.style.display = 'none';
    }

    const openLink = $('#dOpen');
    const safeUrl = sanitizeUrl(resource.url);
    if (safeUrl) {
      openLink.href = safeUrl;
      openLink.style.display = '';
    } else {
      openLink.style.display = 'none';
    }

    renderComments(comments);
    $('#dNoteCount').textContent = comments.length;
  };

  /* ── COMMENTS ─────────────────────────────────── */
  const renderComments = (comments) => {
    const list = $('#commentsList');
    if (!comments.length) {
      list.innerHTML = `<div class="no-comments">— no comments yet, be the first —</div>`;
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

  const updateNoteCount = (n) => { $('#dNoteCount').textContent = n; };

  /* ── MODALS ────────────────────────────────────── */
  const openModal = (id) => {
    $(`#${id}`).classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = (id) => {
    $(`#${id}`).classList.remove('open');
    if (!$$('.overlay.open').length) document.body.style.overflow = '';
  };

  const closeAllModals = () => {
    $$('.overlay').forEach(o => o.classList.remove('open'));
    document.body.style.overflow = '';
  };

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
    renderGrid, renderFeatured, renderError, renderLoading, renderStats,
    renderResourceDetail, renderComments, updateNoteCount,
    openModal, closeModal, closeAllModals,
    readAddForm, clearAddForm,
    readCommentForm, clearCommentForm,
    setBusy, toast, setActiveChip,
  };
})();
