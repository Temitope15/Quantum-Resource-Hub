/* ================================================
   app.js  —  state, init, event wiring (the glue)

   Page-aware: the same script powers both index.html
   (landing) and library.html (full archive). Each
   render/wire step no-ops when its target element
   isn't on the current page.
   ================================================ */

(() => {
  const { $, debounce, catKey } = Utils;

  const page = document.body.dataset.page || 'library';
  const isLanding = page === 'landing';

  const state = {
    resources: [],
    comments:  [],
    filter:    'All',
    query:     '',
    activeResourceId: null,
  };

  /* ── DERIVED ───────────────────────────────────── */
  const commentCountFor = (id) => state.comments.filter(c => c.resourceId === id).length;
  const commentsFor     = (id) => state.comments.filter(c => c.resourceId === id);
  const findResource    = (id) => state.resources.find(r => r.id === id);
  const indexOfResource = (id) => state.resources.findIndex(r => r.id === id);

  const visibleResources = () => {
    const q = state.query.toLowerCase();
    const f = state.filter.toLowerCase();
    return state.resources.filter(r => {
      const matchCat = f === 'all' || catKey(r.category) === f;
      if (!matchCat) return false;
      if (!q) return true;
      return [r.title, r.description, r.submittedBy]
        .some(v => (v || '').toLowerCase().includes(q));
    });
  };

  const computeStats = () => ({
    total:      state.resources.length,
    comments:   state.comments.length,
    categories: new Set(state.resources.map(r => r.category).filter(Boolean)).size,
  });

  /* ── RENDER PIPELINE ───────────────────────────── */
  const refreshGrid = () => {
    if (isLanding) UI.renderFeatured(state.resources, commentCountFor);
    else           UI.renderGrid(visibleResources(), commentCountFor);
  };
  const refreshAll  = () => { UI.renderStats(computeStats()); refreshGrid(); };

  /* ── HANDLERS ──────────────────────────────────── */
  const handleSearch = debounce((e) => {
    state.query = e.target.value;
    refreshGrid();
  }, 120);

  const handleFilterClick = (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    state.filter = chip.dataset.filter;
    UI.setActiveChip(chip);
    refreshGrid();
  };

  /* On the library page, opening a card opens the detail modal.
     On the landing page, no modal exists — deep-link to library.html. */
  const handleCardClick = (e) => {
    if (e.target.closest('[data-stop]')) return;
    const card = e.target.closest('.card[data-resource-id]');
    if (!card) return;
    const id = card.dataset.resourceId;
    if (!id) return;

    if (isLanding) {
      window.location.href = `library.html?open=${encodeURIComponent(id)}`;
      return;
    }
    openDetail(id);
  };

  const openDetail = (id) => {
    const r = findResource(id);
    if (!r) return;
    state.activeResourceId = id;
    /* Open first, render second — a render error must never block the modal */
    UI.openModal('detailOverlay');
    try {
      UI.renderResourceDetail(r, indexOfResource(id), commentsFor(id));
    } catch (err) {
      console.error('renderResourceDetail failed:', err);
    }
  };

  const handleAddSubmit = async () => {
    const data = UI.readAddForm();
    if (!data.title || !data.url || !data.category) {
      UI.toast('Title, URL and Category are required.', false);
      return;
    }

    UI.setBusy('addSubmitBtn', true);
    try {
      const res = await API.addResource(data);
      if (res.success || res.id || res.error === undefined) {
        UI.toast('Resource added — refreshing the archive…', true);
        UI.closeModal('addOverlay');
        UI.clearAddForm();
        state.resources = await API.fetchResources();
        refreshAll();
      } else {
        UI.toast(res.error || 'Could not add resource.', false);
      }
    } catch {
      UI.toast('Network error. Check connection.', false);
    } finally {
      UI.setBusy('addSubmitBtn', false, 'Submit Resource');
    }
  };

  const handleCommentSubmit = async () => {
    const { commenterName, comment } = UI.readCommentForm();
    if (!comment) { UI.toast('Write something first.', false); return; }

    UI.setBusy('commentSubmitBtn', true);
    try {
      const res = await API.addComment({ resourceId: state.activeResourceId, comment, commenterName });
      if (res.success || res.id) {
        state.comments.push({
          commentId:    res.id || `C${Date.now()}`,
          resourceId:   state.activeResourceId,
          comment,
          commenterName,
          timestamp:    new Date().toISOString(),
        });
        UI.clearCommentForm();
        const list = commentsFor(state.activeResourceId);
        UI.renderComments(list);
        UI.updateNoteCount(list.length);
        refreshAll();
        UI.toast('Comment posted.', true);
      } else {
        UI.toast(res.error || 'Could not post comment.', false);
      }
    } catch {
      UI.toast('Network error. Check connection.', false);
    } finally {
      UI.setBusy('commentSubmitBtn', false, 'Post Comment');
    }
  };

  /* ── INIT ──────────────────────────────────────── */
  const on = (sel, evt, fn) => {
    const el = $(sel);
    if (el) el.addEventListener(evt, fn);
  };

  const wireEvents = () => {
    on('#searchInput', 'input', handleSearch);
    on('#filterChips', 'click', handleFilterClick);
    on('#grid',          'click', handleCardClick);
    on('#featured-grid', 'click', handleCardClick);

    on('#openAddBtn', 'click', () => UI.openModal('addOverlay'));
    on('#refreshBtn', 'click', () => location.reload());

    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('[data-close]');
      if (closeBtn) UI.closeModal(closeBtn.dataset.close);

      const overlay = e.target.classList.contains('overlay') ? e.target : null;
      if (overlay) UI.closeModal(overlay.id);
    });

    on('#addSubmitBtn',     'click', handleAddSubmit);
    on('#commentSubmitBtn', 'click', handleCommentSubmit);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') UI.closeAllModals();
    });
  };

  /* If we landed here from a featured-card click on the landing page,
     auto-open that resource's detail modal. */
  const maybeAutoOpenFromQuery = () => {
    if (isLanding) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get('open');
    if (id && findResource(id)) openDetail(id);
  };

  const init = async () => {
    wireEvents();
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    UI.renderLoading();
    try {
      const [resources, comments] = await Promise.all([
        API.fetchResources(),
        API.fetchComments(),
      ]);
      state.resources = resources || [];
      state.comments  = comments  || [];
      refreshAll();
      maybeAutoOpenFromQuery();
    } catch (err) {
      console.error(err);
      UI.renderError();
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
