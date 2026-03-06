/**
 * Optional remote storage (Supabase). Lets Partner A create a shared link;
 * Partner B opens the link, fills their side, and saves to the same session.
 * No manual file sharing. Enable by creating config.js from config.example.js.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

var url = typeof window !== 'undefined' && window.POLYCULE_SUPABASE_URL;
var key = typeof window !== 'undefined' && window.POLYCULE_SUPABASE_ANON_KEY;
if (!url || !key) {
  // Cloud disabled; config.js not set up. Hide cloud UI and code bar.
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.getElementById('cloud-bar');
    if (bar) bar.style.display = 'none';
    var codeBar = document.getElementById('code-bar');
    if (codeBar) codeBar.style.display = 'none';
  });
} else {
var supabase = createClient(url, key);

  var STORAGE_ANSWERS_A = 'polycule_answers_a';
  var STORAGE_ANSWERS_B = 'polycule_answers_b';
  var STORAGE_NAMES = 'polycule_names';
  var STORAGE_CONTRACT = 'polycule_contract';
  var SESSION_ID_KEY = 'polycule_cloud_session_id';
  var SESSION_CODE_KEY = 'polycule_cloud_session_code';

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

  function getNamesFromDom() {
    var a = document.getElementById('name-a');
    var b = document.getElementById('name-b');
    return { A: a ? a.value.trim() : '', B: b ? b.value.trim() : '' };
  }

  function buildSessionPayload() {
    var names = getNamesFromDom();
    try {
      var a = localStorage.getItem(STORAGE_ANSWERS_A);
      var b = localStorage.getItem(STORAGE_ANSWERS_B);
      var c = localStorage.getItem(STORAGE_CONTRACT);
      return {
        partner_names: names,
        answers_a: a ? JSON.parse(a) : {},
        answers_b: b ? JSON.parse(b) : null,
        contract: c ? JSON.parse(c) : {},
      };
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
    return {
      version: 1,
      partnerNames: row.partner_names || { A: '', B: '' },
      answersA: row.answers_a || {},
      answersB: row.answers_b || {},
      contract: row.contract || {},
    };
  }

  function loadIntoAppAndClose(payload) {
    if (typeof window.polyculeLoadSessionFromData === 'function') {
      window.polyculeLoadSessionFromData(payload);
    }
    hideSharedBanner();
    var bar = document.getElementById('cloud-bar');
    if (bar) bar.style.display = 'none';
    window.history.replaceState({}, document.title, window.location.pathname || window.location.href.split('?')[0]);
    window.location.reload();
  }

  function switchFormToPartnerB() {
    setTimeout(function () {
      var r = document.querySelector('input[name="who"][value="B"]');
      if (r) {
        r.checked = true;
        r.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 150);
  }

  function startNewSession() {
    var id = crypto.randomUUID && crypto.randomUUID() || generateSimpleId();
    var code = generateCode();
    var row = {
      id: id,
      code: code,
      partner_names: {},
      answers_a: {},
      answers_b: null,
      contract: {},
    };
    supabase.from('sessions').insert(row).then(function (result) {
      if (result.error) {
        alert('Could not start session: ' + (result.error.message || 'Check console.'));
        return;
      }
      setCurrentSession(id, code);
      showCodeInUI(code);
      showCloudBar();
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
    var hasA = row.answers_a && Object.keys(row.answers_a).length > 0;
    var hasB = row.answers_b && Object.keys(row.answers_b).length > 0;
    if (hasA && hasB) {
      showSharedBanner(
        '<p class="shared-msg">Both partners have completed this session.</p>' +
        '<button type="button" id="btn-load-shared" class="shared-btn">Load into app</button>'
      );
      document.getElementById('btn-load-shared').onclick = function () {
        loadIntoAppAndClose(sessionToLoadPayload(row));
      };
    } else if (hasA) {
      if (typeof window.polyculeLoadSessionFromData === 'function') {
        window.polyculeLoadSessionFromData(sessionToLoadPayload(row));
      }
      switchFormToPartnerB();
      showSharedBanner(
        '<p class="shared-msg">Partner A shared this. You\'re filling as Partner B.</p>' +
        '<p class="shared-hint">Fill the questionnaire as Partner B, click Save this partner\'s answers, then click below.</p>' +
        '<button type="button" id="btn-submit-partner-b" class="shared-btn">Save my answers to session</button> ' +
        '<button type="button" id="btn-load-anyway" class="shared-btn secondary">Load into app (Partner A only)</button>'
      );
      document.getElementById('btn-submit-partner-b').onclick = function () {
        savePartnerBToCloud(row.id);
      };
      document.getElementById('btn-load-anyway').onclick = function () {
        loadIntoAppAndClose(sessionToLoadPayload(row));
      };
    } else {
      setCurrentSession(row.id, row.code);
      if (row.code) showCodeInUI(row.code);
      showSharedBanner('<p class="shared-msg">Session opened. You\'re Partner A. Fill your side and save—your answers will sync to this code.</p>');
    }
  }

  function createShareLink() {
    var payload = buildSessionPayload();
    if (!payload) payload = { partner_names: {}, answers_a: {}, answers_b: null, contract: {} };
    var id = crypto.randomUUID && crypto.randomUUID() || generateSimpleId();
    var code = generateCode();
    var row = {
      id: id,
      code: code,
      partner_names: payload.partner_names || {},
      answers_a: payload.answers_a || {},
      answers_b: payload.answers_b || null,
      contract: payload.contract || {},
    };
    supabase.from('sessions').insert(row).then(function (result) {
      if (result.error) {
        alert('Could not save to cloud: ' + (result.error.message || 'Check console.'));
        return;
      }
      setCurrentSession(id, code);
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
    var names = getNamesFromDom();
    var answersB = null;
    try {
      var b = localStorage.getItem(STORAGE_ANSWERS_B);
      answersB = b ? JSON.parse(b) : {};
    } catch (_) {}
    if (!answersB || Object.keys(answersB).length === 0) {
      alert('Fill out the questionnaire as Partner B and click Save this partner\'s answers first.');
      return;
    }
    supabase.from('sessions').update({
      partner_names: names,
      answers_b: answersB,
      updated_at: new Date().toISOString(),
    }).eq('id', sessionId).then(function (result) {
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
      partner_names: payload.partner_names,
      answers_a: payload.answers_a,
      answers_b: payload.answers_b,
      contract: payload.contract,
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

  function initCodeBar() {
    var codeBar = document.getElementById('code-bar');
    if (codeBar) codeBar.style.display = 'flex';
    var startBtn = document.getElementById('btn-start-new');
    if (startBtn) startBtn.onclick = startNewSession;
    var codeInput = document.getElementById('code-input');
    var codeGoBtn = document.getElementById('btn-code-go');
    if (codeGoBtn && codeInput) {
      codeGoBtn.onclick = function () { fetchByCode(codeInput.value); };
      codeInput.onkeydown = function (e) { if (e.key === 'Enter') fetchByCode(codeInput.value); };
    }
    var code = getCurrentSessionCode();
    if (code) showCodeInUI(code);
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
      initCloudBar();
    });
  } else {
    initFromUrl();
    initCodeBar();
    initCloudBar();
  }
}
