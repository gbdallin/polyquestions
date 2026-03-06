/**
 * Optional remote storage (Supabase). Lets Partner A create a shared link;
 * Partner B opens the link, fills their side, and saves to the same session.
 * No manual file sharing. Enable by creating config.js from config.example.js.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

var url = typeof window !== 'undefined' && window.POLYCULE_SUPABASE_URL;
var key = typeof window !== 'undefined' && window.POLYCULE_SUPABASE_ANON_KEY;
if (!url || !key) {
  // Cloud disabled; config.js not set up. Hide cloud UI.
  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.getElementById('cloud-bar');
    if (bar) bar.style.display = 'none';
  });
} else {
var supabase = createClient(url, key);

  var STORAGE_ANSWERS_A = 'polycule_answers_a';
  var STORAGE_ANSWERS_B = 'polycule_answers_b';
  var STORAGE_NAMES = 'polycule_names';
  var STORAGE_CONTRACT = 'polycule_contract';

  function getShareId() {
    var params = new URLSearchParams(window.location.search);
    return params.get('s') || params.get('session') || '';
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

  function createShareLink() {
    var payload = buildSessionPayload();
    if (!payload || !payload.answers_a || Object.keys(payload.answers_a).length === 0) {
      alert('Fill out Partner A\'s questionnaire first, then click Save this partner\'s answers.');
      return;
    }
    var id = crypto.randomUUID && crypto.randomUUID() || generateSimpleId();
    var row = {
      id: id,
      partner_names: payload.partner_names,
      answers_a: payload.answers_a,
      answers_b: payload.answers_b,
      contract: payload.contract,
    };
    supabase.from('sessions').insert(row).then(function (result) {
      if (result.error) {
        alert('Could not save to cloud: ' + (result.error.message || 'Check console.'));
        return;
      }
      var link = window.location.origin + (window.location.pathname || '') + '?s=' + id;
      var input = document.createElement('input');
      input.value = link;
      input.readOnly = true;
      input.style.width = '100%';
      input.style.marginTop = '0.5rem';
      var wrap = document.getElementById('cloud-link-wrap');
      if (wrap) {
        wrap.innerHTML = '';
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
    var id = getShareId();
    if (!id) return;
    supabase.from('sessions').select('*').eq('id', id).single().then(function (result) {
      if (result.error || !result.data) {
        showSharedBanner('<p class="shared-err">This shared link is invalid or expired.</p>');
        return;
      }
      var row = result.data;
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
          savePartnerBToCloud(id);
        };
        document.getElementById('btn-load-anyway').onclick = function () {
          loadIntoAppAndClose(sessionToLoadPayload(row));
        };
      } else {
        showSharedBanner('<p class="shared-err">This session has no data yet.</p>');
      }
    });
  }

  function initCloudBar() {
    var bar = document.getElementById('cloud-bar');
    if (!bar) return;
    var btn = document.getElementById('btn-save-to-cloud');
    if (btn) btn.onclick = createShareLink;
    showCloudBar();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initFromUrl();
      initCloudBar();
    });
  } else {
    initFromUrl();
    initCloudBar();
  }
}
