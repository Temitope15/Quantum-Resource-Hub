/* ================================================
   api.js  —  Google Apps Script bridge
   ================================================ */

const API = (() => {
  const URL = "https://script.google.com/macros/s/AKfycbyAPLSC9s8d4_Ahefs67y7NRoR9S1MCitn58hc3k7pvDE74WyphN8n7vXKRKaXd4xDv/exec";

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
    fetchResources: () => get('getResources'),
    fetchComments:  () => get('getComments'),
    addResource:    (data) => post({ action: 'addResource',  ...data }),
    addComment:     (data) => post({ action: 'addComment',   ...data }),
  };
})();
