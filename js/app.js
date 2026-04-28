/* ================================================
   app.js  —  state, init, event wiring (the glue)
   ================================================ */

(() => {
  const { $, debounce, catKey } = Utils;

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
  const refreshGrid = () => UI.renderGrid(visibleResources(), commentCountFor);
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

  const handleGridClick = (e) => {
    if (e.target.closest('[data-stop]')) return;
    const card = e.target.closest('.card[data-resource-id]');
    if (!card) return;
    const id = card.dataset.resourceId;
    if (id) openDetail(id);
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
        UI.toast('Note posted.', true);
      } else {
        UI.toast(res.error || 'Could not post comment.', false);
      }
    } catch {
      UI.toast('Network error. Check connection.', false);
    } finally {
      UI.setBusy('commentSubmitBtn', false, 'Post Note');
    }
  };

  /* ── INIT ──────────────────────────────────────── */
  const wireEvents = () => {
    $('#searchInput').addEventListener('input', handleSearch);
    $('#filterChips').addEventListener('click', handleFilterClick);
    $('#grid').addEventListener('click', handleGridClick);

    $('#openAddBtn').addEventListener('click', () => UI.openModal('addOverlay'));
    $('#refreshBtn').addEventListener('click', () => location.reload());

    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('[data-close]');
      if (closeBtn) UI.closeModal(closeBtn.dataset.close);

      const overlay = e.target.classList.contains('overlay') ? e.target : null;
      if (overlay) UI.closeModal(overlay.id);
    });

    $('#addSubmitBtn').addEventListener('click', handleAddSubmit);
    $('#commentSubmitBtn').addEventListener('click', handleCommentSubmit);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') UI.closeAllModals();
    });
  };

  const init = async () => {
    wireEvents();
    $('#year').textContent = new Date().getFullYear();
    UI.renderLoading();
    try {
      const [resources, comments] = await Promise.all([
        API.fetchResources(),
        API.fetchComments(),
      ]);
      state.resources = resources || [];
      state.comments  = comments  || [];
      refreshAll();
    } catch (err) {
      console.error(err);
      UI.renderError();
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
