/**
 * Optional remote storage (Supabase). Lets Partner A create a shared link;
 * Partner B opens the link, fills their side, and saves to the same session.
 * No manual file sharing. Enable by creating config.js from config.example.js.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

var url = typeof window !== 'undefined' && window.POLYCULE_SUPABASE_URL;
var key = typeof window !== 'undefined' && window.POLYCULE_SUPABASE_ANON_KEY;
if (!url || !key) {
  // Cloud disabled; config.js not set up. Show message (Use locally button is in HTML, wired in app.js).
  function showNoCloudMsg() {
    var codeBar = document.getElementById('code-bar');
    if (codeBar) codeBar.style.display = 'none';
    var msg = document.getElementById('setup-no-cloud-msg');
    if (msg) msg.style.display = 'block';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showNoCloudMsg);
  } else {
    showNoCloudMsg();
  }
} else {
var supabase = createClient(url, key);

  var STORAGE_ANSWERS_A = 'polycule_answers_a';
  var STORAGE_ANSWERS_B = 'polycule_answers_b';
  var STORAGE_ANSWERS_C = 'polycule_answers_c';
  var STORAGE_ANSWERS_D = 'polycule_answers_d';
  var STORAGE_ANSWERS_E = 'polycule_answers_e';
  var STORAGE_NAMES = 'polycule_names';
  var STORAGE_CONTRACT = 'polycule_contract';
  var STORAGE_VALUES_A = 'polycule_values_a';
  var STORAGE_VALUES_B = 'polycule_values_b';
  var STORAGE_VALUES_C = 'polycule_values_c';
  var STORAGE_VALUES_D = 'polycule_values_d';
  var STORAGE_VALUES_E = 'polycule_values_e';
  var STORAGE_VALUES_RELATIONSHIPS = 'polycule_values_relationships';
  var SESSION_ID_KEY = 'polycule_cloud_session_id';
  var SESSION_CODE_KEY = 'polycule_cloud_session_code';
  var MY_PARTNER_KEY = 'polycule_my_partner';
  var PARTNER_COUNT_KEY = 'polycule_partner_count';
  var ANSWER_KEYS = ['polycule_answers_a', 'polycule_answers_b', 'polycule_answers_c', 'polycule_answers_d', 'polycule_answers_e'];
  var VALUE_KEYS = ['polycule_values_a', 'polycule_values_b', 'polycule_values_c', 'polycule_values_d', 'polycule_values_e'];

  function setMyPartner(p) {
    try {
      var valid = ['A', 'B', 'C', 'D', 'E'];
      sessionStorage.setItem(MY_PARTNER_KEY, valid.indexOf(p) >= 0 ? p : 'A');
    } catch (_) {}
  }

  function getMyPartnerFromStorage() {
    try {
      var p = sessionStorage.getItem(MY_PARTNER_KEY);
      return ['A', 'B', 'C', 'D', 'E'].indexOf(p) >= 0 ? p : 'A';
    } catch (_) { return 'A'; }
  }

  function getNamesFromStorage() {
    try {
      var j = localStorage.getItem(STORAGE_NAMES);
      return j ? JSON.parse(j) : { A: '', B: '' };
    } catch (_) { return { A: '', B: '' }; }
  }

  // 6-character code: A-Z and 2-9 (no 0,O,1,I,L)
  var CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  function generateCode() {
    var out = '';
    var len = CODE_ALPHABET.length;
    for (var i = 0; i < 6; i++) {
      out += CODE_ALPHABET[Math.floor(Math.random() * len)];
    }
    return out;
  }

  function getShareId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('s') || params.get('session') || '';
  }

  function getShareCode() {
    var params = new URLSearchParams(window.location.search);
    return params.get('code') || '';
  }

  function setCurrentSession(id, code) {
    try {
      if (id) sessionStorage.setItem(SESSION_ID_KEY, id);
      else sessionStorage.removeItem(SESSION_ID_KEY);
      if (code) sessionStorage.setItem(SESSION_CODE_KEY, code);
      else sessionStorage.removeItem(SESSION_CODE_KEY);
    } catch (_) {}
  }

  function getCurrentSessionId() {
    try { return sessionStorage.getItem(SESSION_ID_KEY); } catch (_) { return null; }
  }

  function getCurrentSessionCode() {
    try { return sessionStorage.getItem(SESSION_CODE_KEY); } catch (_) { return null; }
  }

  function getPartnerCountFromStorage() {
    try {
      var n = parseInt(sessionStorage.getItem(PARTNER_COUNT_KEY), 10);
      return (n >= 2 && n <= 5) ? n : 2;
    } catch (_) { return 2; }
  }

  function buildSessionPayload() {
    var names = getNamesFromStorage();
    var count = getPartnerCountFromStorage();
    try {
      var payload = {
        partner_count: count,
        partner_names: names,
        contract: localStorage.getItem(STORAGE_CONTRACT) ? JSON.parse(localStorage.getItem(STORAGE_CONTRACT)) : {},
        values_relationships: localStorage.getItem(STORAGE_VALUES_RELATIONSHIPS) ? JSON.parse(localStorage.getItem(STORAGE_VALUES_RELATIONSHIPS)) : null,
      };
      var ids = ['a', 'b', 'c', 'd', 'e'];
      for (var i = 0; i < 5; i++) {
        var key = ANSWER_KEYS[i];
        var raw = localStorage.getItem(key);
        payload['answers_' + ids[i]] = raw ? JSON.parse(raw) : (i < 2 ? (i === 0 ? {} : null) : null);
      }
      for (var j = 0; j < 5; j++) {
        var vkey = VALUE_KEYS[j];
        var vraw = localStorage.getItem(vkey);
        payload['values_' + ids[j]] = vraw ? JSON.parse(vraw) : null;
      }
      return payload;
    } catch (_) { return null; }
  }

  function showCloudBar() {
    var bar = document.getElementById('cloud-bar');
    if (bar) bar.style.display = 'flex';
  }

  function showSharedBanner(html) {
    var el = document.getElementById('shared-session-banner');
    if (!el) return;
    el.innerHTML = html;
    el.style.display = 'block';
  }

  function hideSharedBanner() {
    var el = document.getElementById('shared-session-banner');
    if (el) el.style.display = 'none';
  }

  function sessionToLoadPayload(row) {
    var count = (row.partner_count >= 2 && row.partner_count <= 5) ? row.partner_count : 2;
    var ids = ['A', 'B', 'C', 'D', 'E'];
    var ansKeys = ['answers_a', 'answers_b', 'answers_c', 'answers_d', 'answers_e'];
    var valKeys = ['values_a', 'values_b', 'values_c', 'values_d', 'values_e'];
    var out = {
      version: 2,
      questionnaireVersion: row.questionnaire_version != null ? row.questionnaire_version : 1,
      partnerCount: count,
      partnerNames: row.partner_names || { A: '', B: '' },
      contract: row.contract || {},
      valuesRelationships: row.values_relationships || null,
    };
    for (var i = 0; i < 5; i++) {
      out['answers' + ids[i]] = row[ansKeys[i]] != null ? row[ansKeys[i]] : (i < 2 ? {} : null);
      out['values' + ids[i]] = row[valKeys[i]] != null ? row[valKeys[i]] : null;
    }
    return out;
  }

  function loadIntoAppAndClose(payload) {
    if (typeof window.polyculeLoadSessionFromData === 'function') {
      window.polyculeLoadSessionFromData(payload);
    }
    hideSharedBanner();
    window.history.replaceState({}, document.title, window.location.pathname || window.location.href.split('?')[0]);
    window.location.reload();
  }

  function getNextPartnerSlot(row) {
    var ids = ['A', 'B', 'C', 'D', 'E'];
    var keys = ['answers_a', 'answers_b', 'answers_c', 'answers_d', 'answers_e'];
    var count = (row.partner_count >= 2 && row.partner_count <= 5) ? row.partner_count : 2;
    for (var i = 1; i < count; i++) {
      var data = row[keys[i]];
      if (!data || Object.keys(data).length === 0) return ids[i];
    }
    return ids[count - 1];
  }

  function startNewSession() {
    var countEl = document.getElementById('partner-count');
    var count = (countEl && parseInt(countEl.value, 10)) || 2;
    count = Math.min(5, Math.max(2, count));
    try { sessionStorage.setItem(PARTNER_COUNT_KEY, String(count)); } catch (_) {}
    var id = crypto.randomUUID && crypto.randomUUID() || generateSimpleId();
    var code = generateCode();
    var qVersion = typeof QUESTIONNAIRE_VERSION !== 'undefined' ? QUESTIONNAIRE_VERSION : 1;
    var row = {
      id: id,
      code: code,
      partner_count: count,
      partner_names: {},
      answers_a: {},
      answers_b: null,
      answers_c: null,
      answers_d: null,
      answers_e: null,
      contract: {},
      values_a: null,
      values_b: null,
      values_c: null,
      values_d: null,
      values_e: null,
      values_relationships: null,
      questionnaire_version: qVersion,
    };
    supabase.from('sessions').insert(row).then(function (result) {
      if (result.error) {
        alert('Could not start session: ' + (result.error.message || 'Check console.'));
        return;
      }
      setCurrentSession(id, code);
      setMyPartner('A');
      if (window.polyculeShowAppPage) window.polyculeShowAppPage();
    });
  }

  function showCodeInUI(code) {
    var wrap = document.getElementById('code-display-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    wrap.style.display = 'block';
    var label = document.createElement('span');
    label.className = 'code-label';
    label.textContent = 'Your code: ';
    var codeSpan = document.createElement('strong');
    codeSpan.className = 'code-value';
    codeSpan.textContent = code;
    var copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.textContent = 'Copy code';
    copyBtn.className = 'code-copy-btn';
    copyBtn.onclick = function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(function () { copyBtn.textContent = 'Copied'; });
      } else {
        try { document.execCommand('copy'); copyBtn.textContent = 'Copied'; } catch (_) {}
      }
    };
    wrap.appendChild(label);
    wrap.appendChild(codeSpan);
    wrap.appendChild(copyBtn);
  }

  function fetchByCode(codeInput) {
    var code = (codeInput || '').trim().toUpperCase();
    if (!code || code.length !== 6) {
      alert('Enter the 6-character code your partner shared.');
      return;
    }
    supabase.from('sessions').select('*').eq('code', code).maybeSingle().then(function (result) {
      if (result.error) {
        alert('Could not look up session: ' + (result.error.message || ''));
        return;
      }
      if (!result.data) {
        alert('No session found for that code. Check the code and try again.');
        return;
      }
      var row = result.data;
      setCurrentSession(row.id, row.code);
      handleFetchedSession(row);
    });
  }

  function handleFetchedSession(row) {
    if (window.polyculeShowAppPage) window.polyculeShowAppPage();
    var count = (row.partner_count >= 2 && row.partner_count <= 5) ? row.partner_count : 2;
    var ids = ['A', 'B', 'C', 'D', 'E'];
    var keys = ['answers_a', 'answers_b', 'answers_c', 'answers_d', 'answers_e'];
    var hasAll = true;
    for (var i = 0; i < count; i++) {
      var d = row[keys[i]];
      if (!d || Object.keys(d).length === 0) { hasAll = false; break; }
    }
    if (hasAll) {
      setCurrentSession(row.id, row.code || null);
      var buttons = ids.slice(0, count).map(function (id) {
        return '<button type="button" id="btn-i-am-' + id.toLowerCase() + '" class="shared-btn">I\'m Partner ' + id + '</button>';
      }).join(' ');
      showSharedBanner(
        '<p class="shared-msg">Who is opening this session?</p>' +
        '<p class="shared-hint">Choose so we only show and save your answers.</p>' +
        buttons
      );
      ids.slice(0, count).forEach(function (id) {
        var el = document.getElementById('btn-i-am-' + id.toLowerCase());
        if (el) el.onclick = function () {
          setMyPartner(id);
          if (typeof window.polyculeLoadSessionFromData === 'function') {
            window.polyculeLoadSessionFromData(sessionToLoadPayload(row));
          }
          hideSharedBanner();
        };
      });
    } else {
      var nextSlot = getNextPartnerSlot(row);
      setCurrentSession(row.id, row.code || null);
      setMyPartner(nextSlot);
      if (typeof window.polyculeLoadSessionFromData === 'function') {
        window.polyculeLoadSessionFromData(sessionToLoadPayload(row));
      }
      var hasAny = keys.some(function (k, idx) { return idx < count && row[k] && Object.keys(row[k]).length > 0; });
      if (hasAny) {
        showSharedBanner(
          '<p class="shared-msg">You\'re filling as Partner ' + nextSlot + '.</p>' +
          '<p class="shared-hint">Fill the questionnaire, then click below to save your answers to the session.</p>' +
          '<button type="button" id="btn-submit-partner-b" class="shared-btn">Save my answers to session</button> ' +
          '<button type="button" id="btn-load-anyway" class="shared-btn secondary">I\'m Partner A (load only)</button>'
        );
        document.getElementById('btn-load-anyway').onclick = function () {
          setMyPartner('A');
          loadIntoAppAndClose(sessionToLoadPayload(row));
        };
      } else {
        showSharedBanner(
          '<p class="shared-msg">Your partner created this session. You\'re Partner ' + nextSlot + '.</p>' +
          '<p class="shared-hint">Fill the questionnaire, then click below to save your answers to the session.</p>' +
          '<button type="button" id="btn-submit-partner-b" class="shared-btn">Save my answers to session</button>'
        );
      }
      document.getElementById('btn-submit-partner-b').onclick = function () {
        savePartnerBToCloud(row.id);
      };
    }
  }

  function createShareLink() {
    var payload = buildSessionPayload();
    if (!payload) payload = buildSessionPayload() || { partner_count: 2, partner_names: {}, answers_a: {}, answers_b: null, answers_c: null, answers_d: null, answers_e: null, contract: {}, values_a: null, values_b: null, values_c: null, values_d: null, values_e: null, values_relationships: null };
    var id = crypto.randomUUID && crypto.randomUUID() || generateSimpleId();
    var code = generateCode();
    var qVersion = typeof QUESTIONNAIRE_VERSION !== 'undefined' ? QUESTIONNAIRE_VERSION : 1;
    var row = {
      id: id,
      code: code,
      partner_count: payload.partner_count || 2,
      partner_names: payload.partner_names || {},
      answers_a: payload.answers_a || {},
      answers_b: payload.answers_b != null ? payload.answers_b : null,
      answers_c: payload.answers_c != null ? payload.answers_c : null,
      answers_d: payload.answers_d != null ? payload.answers_d : null,
      answers_e: payload.answers_e != null ? payload.answers_e : null,
      contract: payload.contract || {},
      values_a: payload.values_a,
      values_b: payload.values_b,
      values_c: payload.values_c,
      values_d: payload.values_d,
      values_e: payload.values_e,
      values_relationships: payload.values_relationships || null,
      questionnaire_version: qVersion,
    };
    supabase.from('sessions').insert(row).then(function (result) {
      if (result.error) {
        alert('Could not save to cloud: ' + (result.error.message || 'Check console.'));
        return;
      }
      setCurrentSession(id, code);
      setMyPartner('A');
      showCodeInUI(code);
      var link = window.location.origin + (window.location.pathname || '') + '?s=' + id;
      var wrap = document.getElementById('cloud-link-wrap');
      if (wrap) {
        wrap.innerHTML = '';
        var linkLabel = document.createElement('span');
        linkLabel.textContent = 'Link: ';
        wrap.appendChild(linkLabel);
        var input = document.createElement('input');
        input.value = link;
        input.readOnly = true;
        input.style.width = '100%';
        input.style.marginTop = '0.5rem';
        wrap.appendChild(input);
        var copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy link';
        copyBtn.type = 'button';
        copyBtn.style.marginLeft = '0.5rem';
        copyBtn.onclick = function () {
          input.select();
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(link).then(function () { copyBtn.textContent = 'Copied'; });
          } else {
            try { document.execCommand('copy'); copyBtn.textContent = 'Copied'; } catch (_) {}
          }
        };
        wrap.appendChild(copyBtn);
      }
      showCloudBar();
    });
  }

  function generateSimpleId() {
    var s = 'abcdefghijklmnopqrstuvwxyz0123456789';
    var out = '';
    for (var i = 0; i < 32; i++) out += s[Math.floor(Math.random() * s.length)];
    return out;
  }

  function savePartnerBToCloud(sessionId) {
    var names = getNamesFromStorage();
    var me = getMyPartnerFromStorage();
    if (me === 'A') {
      alert('Partner A saves via the main session; use "Save to cloud" or the share link flow.');
      return;
    }
    var key = ANSWER_KEYS[['A', 'B', 'C', 'D', 'E'].indexOf(me)];
    var answersMe = null;
    try {
      var raw = localStorage.getItem(key);
      answersMe = raw ? JSON.parse(raw) : {};
    } catch (_) {}
    if (!answersMe || Object.keys(answersMe).length === 0) {
      alert('Fill out the questionnaire and click Save this partner\'s answers first.');
      return;
    }
    var update = { partner_names: names, updated_at: new Date().toISOString() };
    update['answers_' + me.toLowerCase()] = answersMe;
    supabase.from('sessions').update(update).eq('id', sessionId).then(function (result) {
      if (result.error) {
        alert('Could not save: ' + (result.error.message || ''));
        return;
      }
      alert('Your answers have been saved. You can send the link back to your partner or click "Load into app" to compare and build the contract.');
      window.location.reload();
    });
  }

  function updateCloudSession(sessionId) {
    var payload = buildSessionPayload();
    if (!payload) return;
    supabase.from('sessions').update({
      partner_count: payload.partner_count,
      partner_names: payload.partner_names,
      answers_a: payload.answers_a,
      answers_b: payload.answers_b,
      answers_c: payload.answers_c,
      answers_d: payload.answers_d,
      answers_e: payload.answers_e,
      contract: payload.contract,
      values_a: payload.values_a,
      values_b: payload.values_b,
      values_c: payload.values_c,
      values_d: payload.values_d,
      values_e: payload.values_e,
      values_relationships: payload.values_relationships,
      updated_at: new Date().toISOString(),
    }).eq('id', sessionId).then(function (result) {
      if (result.error) console.warn('Cloud update failed', result.error);
    });
  }

  function initFromUrl() {
    var codeParam = getShareCode();
    if (codeParam) {
      fetchByCode(codeParam);
      return;
    }
    var id = getShareId();
    if (!id) return;
    supabase.from('sessions').select('*').eq('id', id).single().then(function (result) {
      if (result.error || !result.data) {
        showSharedBanner('<p class="shared-err">This shared link is invalid or expired.</p>');
        return;
      }
      var row = result.data;
      setCurrentSession(row.id, row.code || null);
      handleFetchedSession(row);
    });
  }

  function initCloudBar() {
    var bar = document.getElementById('cloud-bar');
    if (!bar) return;
    var btn = document.getElementById('btn-save-to-cloud');
    if (btn) btn.onclick = createShareLink;
    showCloudBar();
  }

  function refreshSessionFromCloud() {
    var id = getCurrentSessionId();
    if (!id) {
      alert('Enter the session code first to join a session.');
      return;
    }
    supabase.from('sessions').select('*').eq('id', id).single().then(function (result) {
      if (result.error || !result.data) {
        alert('Could not load session. Try entering the code again.');
        return;
      }
      var row = result.data;
      var hasA = row.answers_a && Object.keys(row.answers_a).length > 0;
      var hasB = row.answers_b && Object.keys(row.answers_b).length > 0;
      if (hasA && hasB) {
        loadIntoAppAndClose(sessionToLoadPayload(row));
      } else {
        alert('Not ready yet. Partner A has ' + (hasA ? '' : 'not ') + 'saved. Partner B has ' + (hasB ? '' : 'not ') + 'saved. Try again in a moment.');
      }
    });
  }

  function initCodeBar() {
    var codeBar = document.getElementById('code-bar');
    if (codeBar) codeBar.style.display = 'flex';
    var setupLocal = document.querySelector('.setup-local');
    if (setupLocal) setupLocal.style.display = 'none';
    var startBtn = document.getElementById('btn-start-new');
    if (startBtn) startBtn.onclick = startNewSession;
    var codeInput = document.getElementById('code-input');
    var codeGoBtn = document.getElementById('btn-code-go');
    if (codeGoBtn && codeInput) {
      codeGoBtn.onclick = function () { fetchByCode(codeInput.value); };
      codeInput.onkeydown = function (e) { if (e.key === 'Enter') fetchByCode(codeInput.value); };
    }
    var code = getCurrentSessionCode();
    if (code) {
      showCodeInUI(code);
      showRefreshSessionButton();
    }
  }

  function showRefreshSessionButton() {
    var wrap = document.getElementById('code-display-wrap');
    if (!wrap) return;
    var existing = document.getElementById('btn-refresh-session');
    if (existing) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-refresh-session';
    btn.className = 'code-copy-btn';
    btn.textContent = 'Load session from cloud';
    btn.onclick = refreshSessionFromCloud;
    wrap.appendChild(btn);
  }

  window.polyculeSaveToCloudIfSession = function () {
    var id = getCurrentSessionId();
    if (id) updateCloudSession(id);
  };

  window.polyculeGetCurrentSessionId = getCurrentSessionId;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initFromUrl();
      initCodeBar();
    });
  } else {
    initFromUrl();
    initCodeBar();
  }
}
