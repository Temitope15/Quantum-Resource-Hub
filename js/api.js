/* ================================================
   api.js  —  Google Apps Script bridge
   Normalizes incoming records so the UI is
   indifferent to header casing in the sheet.
   ================================================ */

const API = (() => {
  const URL = "https://script.google.com/macros/s/AKfycbyAPLSC9s8d4_Ahefs67y7NRoR9S1MCitn58hc3k7pvDE74WyphN8n7vXKRKaXd4xDv/exec";

  /* Strip casing/spaces/underscores so 'Submitted By', 'submitted_by'
     and 'submittedBy' all collapse to the same key. */
  const flatten = (obj) => {
    const out = {};
    Object.entries(obj || {}).forEach(([k, v]) => {
      out[String(k).toLowerCase().replace(/[\s_\-]+/g, '')] = v;
    });
    return out;
  };

  const pick = (obj, ...candidates) => {
    for (const c of candidates) {
      const v = obj[c];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return '';
  };

  const normalizeResource = (r) => {
    const n = flatten(r);
    return {
      id:          pick(n, 'id', 'resourceid', 'rowid'),
      title:       pick(n, 'title', 'resourcetitle', 'name'),
      url:         pick(n, 'url', 'link', 'href'),
      category:    pick(n, 'category', 'type', 'kind'),
      submittedBy: pick(n, 'submittedby', 'submitter', 'submittername', 'author', 'yourname'),
      description: pick(n, 'description', 'desc', 'summary', 'about'),
      timestamp:   pick(n, 'timestamp', 'date', 'createdat', 'created', 'submittedat'),
    };
  };

  const normalizeComment = (c) => {
    const n = flatten(c);
    return {
      commentId:     pick(n, 'commentid', 'id'),
      resourceId:    pick(n, 'resourceid', 'parentid', 'rid'),
      comment:       pick(n, 'comment', 'note', 'text', 'content', 'message'),
      commenterName: pick(n, 'commentername', 'commenter', 'author', 'name', 'yourname'),
      timestamp:     pick(n, 'timestamp', 'date', 'createdat', 'created', 'postedat'),
    };
  };

  const get = async (action) => {
    const res = await fetch(`${URL}?action=${action}`);
    if (!res.ok) throw new Error(`GET ${action} failed: ${res.status}`);
    return res.json();
  };

  const post = async (payload) => {
    const res = await fetch(URL, { method: 'POST', body: JSON.stringify(payload) });
    if (!res.ok) throw new Error(`POST ${payload.action} failed: ${res.status}`);
    return res.json();
  };

  return {
    fetchResources: async () => (await get('getResources') || []).map(normalizeResource),
    fetchComments:  async () => (await get('getComments')  || []).map(normalizeComment),
    addResource:    (data) => post({ action: 'addResource', ...data }),
    addComment:     (data) => post({ action: 'addComment',  ...data }),
  };
})();
