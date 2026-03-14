(function () {
  const MAX_PARTNERS = 5;
  const PARTNER_IDS = ['A', 'B', 'C', 'D', 'E'];
  const STORAGE_ANSWERS_A = 'polycule_answers_a';
  const STORAGE_ANSWERS_B = 'polycule_answers_b';
  const STORAGE_ANSWERS_C = 'polycule_answers_c';
  const STORAGE_ANSWERS_D = 'polycule_answers_d';
  const STORAGE_ANSWERS_E = 'polycule_answers_e';
  const STORAGE_NAMES = 'polycule_names';
  const STORAGE_CONTRACT = 'polycule_contract';
  const STORAGE_VALUES_A = 'polycule_values_a';
  const STORAGE_VALUES_B = 'polycule_values_b';
  const STORAGE_VALUES_C = 'polycule_values_c';
  const STORAGE_VALUES_D = 'polycule_values_d';
  const STORAGE_VALUES_E = 'polycule_values_e';
  const STORAGE_VALUES_RELATIONSHIPS = 'polycule_values_relationships';
  const EXPORT_VERSION = 2;
  const VALUES_COUNT = 5;
  const MY_PARTNER_KEY = 'polycule_my_partner';
  const PARTNER_COUNT_KEY = 'polycule_partner_count';

  var ANSWERS_KEYS = { A: 'polycule_answers_a', B: 'polycule_answers_b', C: 'polycule_answers_c', D: 'polycule_answers_d', E: 'polycule_answers_e' };
  var VALUES_KEYS = { A: 'polycule_values_a', B: 'polycule_values_b', C: 'polycule_values_c', D: 'polycule_values_d', E: 'polycule_values_e' };

  let currentPartner = 'A';

  function getPartnerCount() {
    try {
      var n = parseInt(sessionStorage.getItem(PARTNER_COUNT_KEY), 10);
      return (n >= 2 && n <= MAX_PARTNERS) ? n : 2;
    } catch (_) { return 2; }
  }

  function setPartnerCount(n) {
    try {
      sessionStorage.setItem(PARTNER_COUNT_KEY, String(Math.max(2, Math.min(MAX_PARTNERS, n))));
    } catch (_) {}
  }

  function getPartnerIds() {
    return PARTNER_IDS.slice(0, getPartnerCount());
  }

  function getMyPartner() {
    try {
      var p = sessionStorage.getItem(MY_PARTNER_KEY);
      return (PARTNER_IDS.indexOf(p) >= 0) ? p : 'A';
    } catch (_) { return 'A'; }
  }
  let formData = {};

  function buildExportData() {
    const names = getNames();
    const answers = getAnswers();
    const contract = getContract();
    const agreementText = (function () {
      if (typeof AgreementGenerator !== 'undefined' && AgreementGenerator.generateFullAgreement) {
        return AgreementGenerator.generateFullAgreement(names, answers, contract);
      }
      return '';
    })();
    var vals = getValues();
    var ids = getPartnerIds();
    var answersByPartner = {};
    var valuesByPartner = {};
    ids.forEach(function (id) { answersByPartner[id] = answers[id] || {}; valuesByPartner[id] = vals[id] || []; });
    return {
      version: EXPORT_VERSION,
      questionnaireVersion: typeof QUESTIONNAIRE_VERSION !== 'undefined' ? QUESTIONNAIRE_VERSION : 1,
      savedAt: new Date().toISOString(),
      partnerCount: getPartnerCount(),
      partnerNames: names,
      answersByPartner: answersByPartner,
      answersA: answers.A,
      answersB: answers.B,
      contract: contract,
      valuesByPartner: valuesByPartner,
      valuesA: vals.A,
      valuesB: vals.B,
      valuesRelationships: getValuesRelationships(),
      agreementText: agreementText,
    };
  }

  function safeFilenamePart(s) {
    if (!s || typeof s !== 'string') return 'session';
    return s.replace(/[^a-zA-Z0-9\-_\s]/g, '').replace(/\s+/g, '-').slice(0, 30) || 'session';
  }

  function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function saveSessionToFile() {
    const data = buildExportData();
    var ids = getPartnerIds();
    var nameParts = ids.map(function (id) { return safeFilenamePart(data.partnerNames[id]); }).filter(Boolean);
    const date = new Date().toISOString().slice(0, 10);
    const base = nameParts.length ? 'polycule-' + nameParts.join('-') + '-' + date : 'polycule-session-' + date;
    const filename = base + '.polycule';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
  }

  var SESSION_QUESTIONNAIRE_VERSION_KEY = 'polycule_session_questionnaire_version';
  var SAVED_QUESTIONNAIRE_VERSION_KEY = 'polycule_questionnaire_version';

  function applySessionData(data) {
    if (data.version == null || data.partnerNames == null) return false;
    var names = data.partnerNames || {};
    var count = (data.partnerCount >= 2 && data.partnerCount <= MAX_PARTNERS) ? data.partnerCount : 2;
    setPartnerCount(count);
    var ids = PARTNER_IDS.slice(0, count);
    ids.forEach(function (id) { if (!names[id]) names[id] = ''; });
    localStorage.setItem(STORAGE_NAMES, JSON.stringify(names));
    var byPartner = data.answersByPartner || {};
    if (!Object.keys(byPartner).length) {
      PARTNER_IDS.forEach(function (id) {
        var key = 'answers' + id;
        if (data[key] != null) byPartner[id] = data[key];
      });
      if (!Object.keys(byPartner).length && (data.answersA != null || data.answersB != null)) {
        byPartner.A = data.answersA || {};
        byPartner.B = data.answersB || {};
      }
    }
    ids.forEach(function (id) {
      var ans = byPartner[id] || {};
      var key = ANSWERS_KEYS[id];
      if (key) localStorage.setItem(key, JSON.stringify(ans));
    });
    localStorage.setItem(STORAGE_CONTRACT, JSON.stringify(data.contract || {}));
    var valsByPartner = data.valuesByPartner || {};
    if (!Object.keys(valsByPartner).length) {
      PARTNER_IDS.forEach(function (id) {
        var key = 'values' + id;
        if (data[key] != null) valsByPartner[id] = Array.isArray(data[key]) ? data[key] : [];
      });
      if (!Object.keys(valsByPartner).length && (data.valuesA != null || data.valuesB != null)) {
        valsByPartner.A = Array.isArray(data.valuesA) ? data.valuesA : [];
        valsByPartner.B = Array.isArray(data.valuesB) ? data.valuesB : [];
      }
    }
    ids.forEach(function (id) {
      var arr = Array.isArray(valsByPartner[id]) ? valsByPartner[id] : [];
      var key = VALUES_KEYS[id];
      if (key) localStorage.setItem(key, JSON.stringify(arr));
    });
    if (Array.isArray(data.valuesRelationships)) localStorage.setItem(STORAGE_VALUES_RELATIONSHIPS, JSON.stringify(data.valuesRelationships));
    if (data.questionnaireVersion != null) {
      try { sessionStorage.setItem(SESSION_QUESTIONNAIRE_VERSION_KEY, String(data.questionnaireVersion)); } catch (_) {}
    }
    formData = {};
    ids.forEach(function (id) { formData[id] = byPartner[id] || {}; });
    currentPartner = getMyPartner();
    var myNameEl = document.getElementById('my-name');
    if (myNameEl) myNameEl.value = (names[currentPartner]) || '';
    renderForm();
    renderCompare();
    renderContract();
    renderValues();
    renderValuesEvaluation();
    updateContractDoc();
    return true;
  }

  function loadSessionFromFile(file) {
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const data = JSON.parse(reader.result);
        if (!applySessionData(data)) alert('Not a valid polycule session file.');
      } catch (e) {
        alert('Could not read file. It may be corrupted or not a polycule session file.');
      }
    };
    reader.readAsText(file);
  }

  window.polyculeLoadSessionFromData = function (data) {
    if (!data || !applySessionData(data)) return;
  };

  function hasCurrentData() {
    var names = getNames();
    var answers = getAnswers();
    var ids = getPartnerIds();
    for (var i = 0; i < ids.length; i++) {
      if (names[ids[i]]) return true;
      if (Object.keys(answers[ids[i]] || {}).length > 0) return true;
    }
    return false;
  }

  function exportAgreementAsFile() {
    const docEl = document.getElementById('contract-doc');
    const text = docEl ? (docEl.textContent || docEl.innerText) : '';
    if (!text || text.indexOf('Select agreement types') !== -1) {
      alert('Fill out the questionnaire for both partners, then open Relationship contract. You can use "Apply recommendations" or choose per section.');
      return;
    }
    const names = getNames();
    const nameA = safeFilenamePart(names.A);
    const nameB = safeFilenamePart(names.B);
    const date = new Date().toISOString().slice(0, 10);
    const filename = (nameA && nameB ? 'agreement-' + nameA + '-' + nameB + '-' + date : 'agreement-' + date) + '.txt';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    downloadBlob(blob, filename);
  }

  function getNames() {
    try {
      var j = localStorage.getItem(STORAGE_NAMES);
      var o = j ? JSON.parse(j) : {};
      var ids = getPartnerIds();
      ids.forEach(function (id) { if (o[id] === undefined) o[id] = ''; });
      return o;
    } catch (_) { var o = {}; getPartnerIds().forEach(function (id) { o[id] = ''; }); return o; }
  }

  function getAnswers() {
    try {
      var out = {};
      getPartnerIds().forEach(function (id) {
        var key = ANSWERS_KEYS[id];
        if (!key) return;
        var raw = localStorage.getItem(key);
        out[id] = raw ? JSON.parse(raw) : {};
      });
      return out;
    } catch (_) { var o = {}; getPartnerIds().forEach(function (id) { o[id] = {}; }); return o; }
  }

  function getContract() {
    try {
      const j = localStorage.getItem(STORAGE_CONTRACT);
      return j ? JSON.parse(j) : {};
    } catch (_) { return {}; }
  }

  function getValues() {
    try {
      var out = {};
      getPartnerIds().forEach(function (id) {
        var key = VALUES_KEYS[id];
        if (!key) return;
        var raw = localStorage.getItem(key);
        var arr = raw ? JSON.parse(raw) : null;
        out[id] = Array.isArray(arr) ? arr : [];
      });
      return out;
    } catch (_) { var o = {}; getPartnerIds().forEach(function (id) { o[id] = []; }); return o; }
  }

  function saveValues(partner, list) {
    var arr = Array.isArray(list) ? list.slice(0, VALUES_COUNT) : [];
    var key = VALUES_KEYS[partner];
    if (key) localStorage.setItem(key, JSON.stringify(arr));
  }

  function getValuesRelationships() {
    try {
      const j = localStorage.getItem(STORAGE_VALUES_RELATIONSHIPS);
      var arr = j ? JSON.parse(j) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (_) { return []; }
  }

  function saveValuesRelationships(rels) {
    localStorage.setItem(STORAGE_VALUES_RELATIONSHIPS, JSON.stringify(Array.isArray(rels) ? rels : []));
  }

  function saveAnswers(partner, data) {
    var key = ANSWERS_KEYS[partner];
    if (key) localStorage.setItem(key, JSON.stringify(data));
    formData[partner] = data;
  }

  function saveNames() {
    var names = getNames();
    var myNameEl = document.getElementById('my-name');
    if (myNameEl) names[currentPartner] = myNameEl.value.trim();
    localStorage.setItem(STORAGE_NAMES, JSON.stringify(names));
  }

  function saveContractSection(sectionId, agreement, notes, discussionOutcome) {
    const c = getContract();
    const existing = c[sectionId] || {};
    c[sectionId] = {
      agreement: agreement !== undefined ? agreement : existing.agreement,
      notes: notes !== undefined ? notes : existing.notes,
      discussionOutcome: discussionOutcome !== undefined ? discussionOutcome : existing.discussionOutcome,
    };
    localStorage.setItem(STORAGE_CONTRACT, JSON.stringify(c));
  }

  function renderForm() {
    var container = document.getElementById('form-content');
    currentPartner = getMyPartner();
    var names = getNames();
    var myNameEl = document.getElementById('my-name');
    if (myNameEl) myNameEl.value = names[currentPartner] || '';
    var partnerLabel = document.getElementById('partner-label');
    if (partnerLabel) partnerLabel.textContent = "You're answering as Partner " + currentPartner + ".";

    var sectionLabels = {};
    SECTIONS.forEach(function (sec) { sectionLabels[sec.id] = sec.label; });
    var sorted = QUESTIONS.slice().sort(function (a, b) { return (typeof a.id === 'number' && typeof b.id === 'number') ? a.id - b.id : String(a.id).localeCompare(String(b.id), undefined, { numeric: true }); });
    var sectionOrder = [];
    sorted.forEach(function (q) {
      if (sectionOrder.indexOf(q.section) === -1) sectionOrder.push(q.section);
    });
    var navEl = document.getElementById('form-section-nav');
    if (navEl) {
      navEl.innerHTML = sectionOrder.map(function (secId) {
        return '<a href="#section-' + escapeHtml(secId) + '">' + escapeHtml(sectionLabels[secId] || secId) + '</a>';
      }).join('');
    }
    var lastSection = null;
    var html = '';
    sorted.forEach(function (q) {
      if (q.section !== lastSection) {
        if (lastSection) html += '</div>';
        lastSection = q.section;
        html += '<div class="section-block" id="section-' + escapeHtml(lastSection) + '" data-section="' + escapeHtml(lastSection) + '"><h2>' + escapeHtml(sectionLabels[lastSection] || lastSection) + '</h2>';
      }
      var name = getAnswerKey(q);
      var existing = formData[currentPartner][name];
      if (q.type === 'text') {
        html += '<div class="q-block"><label class="q-text">' + q.id + '. ' + escapeHtml(q.text) + '</label><textarea name="' + name + '" data-qid="' + q.id + '" placeholder="' + escapeHtml(q.placeholder || '') + '">' + escapeHtml(existing && existing.value ? existing.value : '') + '</textarea><div class="notes"><input type="text" name="' + name + '_notes" placeholder="Optional: add context or nuance" value="' + escapeHtml(existing && existing.notes ? existing.notes : '') + '" /></div></div>';
      } else {
        var hasOther = q.options.indexOf('Other') >= 0;
        html += '<div class="q-block"><label class="q-text">' + q.id + '. ' + escapeHtml(q.text) + '</label><p class="q-hint choice-hint">Select one option; add optional detail below.</p><div class="options">';
        q.options.forEach(function (opt) {
          var checked = existing && existing.value === opt ? ' checked' : '';
          html += '<label><input type="radio" name="' + name + '" value="' + escapeHtml(opt) + '"' + checked + ' /> ' + escapeHtml(opt) + '</label>';
          if (opt === 'Other') {
            html += ' <input type="text" name="' + name + '_other" class="other-specify" placeholder="Please specify" value="' + escapeHtml(existing && existing.otherText ? existing.otherText : '') + '" />';
          }
        });
        html += '</div><div class="notes"><input type="text" name="' + name + '_notes" placeholder="Optional: add context or nuance to your answer" value="' + escapeHtml(existing && existing.notes ? existing.notes : '') + '" /></div></div>';
      }
    });
    if (lastSection) html += '</div>';
    container.innerHTML = html;
  }

  function collectFormData() {
    const data = {};
    const container = document.getElementById('form-content');
    QUESTIONS.forEach((q) => {
      const name = getAnswerKey(q);
      if (q.type === 'text') {
        const el = container.querySelector(`textarea[name="${name}"]`);
        const notesEl = container.querySelector(`input[name="${name}_notes"]`);
        if (el) data[name] = { value: el.value.trim(), notes: notesEl ? notesEl.value.trim() : '' };
      } else {
        const radio = container.querySelector(`input[name="${name}"]:checked`);
        const notesEl = container.querySelector(`input[name="${name}_notes"]`);
        const otherEl = container.querySelector(`input[name="${name}_other"]`);
        data[name] = {
          value: radio ? radio.value : '',
          notes: notesEl ? notesEl.value.trim() : '',
          otherText: (radio && radio.value === 'Other' && otherEl) ? otherEl.value.trim() : ''
        };
      }
    });
    return data;
  }

  function renderCompare() {
    var container = document.getElementById('compare-content');
    var names = getNames();
    var answers = getAnswers();
    var ids = getPartnerIds();
    var hasAny = ids.some(function (id) { return Object.keys(answers[id] || {}).length > 0; });
    if (!hasAny) {
      container.innerHTML = '<p class="compare-empty">No answers saved yet. Fill out the questionnaire for each partner first.</p>';
      return;
    }
    var sectionLabels = {};
    SECTIONS.forEach(function (sec) { sectionLabels[sec.id] = sec.label; });
    var sorted = QUESTIONS.slice().sort(function (a, b) { return (typeof a.id === 'number' && typeof b.id === 'number') ? a.id - b.id : String(a.id).localeCompare(String(b.id), undefined, { numeric: true }); });
    var lastSection = null;
    var headerCells = '<th>Question</th>' + ids.map(function (id) { return '<th class="partner-col">' + escapeHtml(names[id] || 'Partner ' + id) + '</th>'; }).join('');
    var html = '<table class="compare-table"><thead><tr>' + headerCells + '</tr></thead><tbody>';
    var colCount = ids.length + 1;
    sorted.forEach(function (q) {
      if (q.section !== lastSection) {
        lastSection = q.section;
        html += '<tr class="section-row"><td colspan="' + colCount + '">' + escapeHtml(sectionLabels[lastSection] || lastSection) + '</td></tr>';
      }
      var name = getAnswerKey(q);
      var cells = ids.map(function (id) {
        var val = answers[id][name];
        var v = val && val.value !== undefined ? val.value : val;
        var display = typeof v === 'object' ? (v && v.value || '—') : (v || '—');
        if (val && typeof val === 'object' && val.value === 'Other' && val.otherText) display = 'Other: ' + val.otherText;
        return '<td class="answer">' + escapeHtml(String(display)) + '</td>';
      }).join('');
      html += '<tr><th>' + escapeHtml(q.text) + '</th>' + cells + '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function renderValues() {
    var listEl = document.getElementById('values-rank-list');
    if (!listEl) return;
    var partner = getMyPartner();
    var vals = getValues()[partner] || [];
    while (vals.length < VALUES_COUNT) vals.push('');
    vals = vals.slice(0, VALUES_COUNT);
    listEl.innerHTML = vals.map(function (v, i) {
      return '<li data-index="' + i + '"><button type="button" class="rank-btn" data-move="up" aria-label="Move up">↑</button><button type="button" class="rank-btn" data-move="down" aria-label="Move down">↓</button><input type="text" maxlength="40" placeholder="One word" value="' + escapeHtml(String(v || '')) + '" data-value-index="' + i + '" />';
    }).join('');
    listEl.querySelectorAll('input[data-value-index]').forEach(function (input) {
      input.addEventListener('input', function () {
        var idx = parseInt(input.dataset.valueIndex, 10);
        var li = input.closest('li');
        if (li) li.dataset.index = idx;
      });
    });
    listEl.querySelectorAll('.rank-btn[data-move="up"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var li = btn.closest('li');
        var prev = li && li.previousElementSibling;
        if (prev) swapValuesListItems(listEl, prev, li);
      });
    });
    listEl.querySelectorAll('.rank-btn[data-move="down"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var li = btn.closest('li');
        var next = li && li.nextElementSibling;
        if (next) swapValuesListItems(listEl, li, next);
      });
    });
  }

  function swapValuesListItems(listEl, li1, li2) {
    var inputs = [li1, li2].map(function (li) { return li.querySelector('input'); }).filter(Boolean);
    var v0 = inputs[0] ? inputs[0].value.trim() : '';
    var v1 = inputs[1] ? inputs[1].value.trim() : '';
    if (inputs[0]) inputs[0].value = v1;
    if (inputs[1]) inputs[1].value = v0;
  }

  function collectValuesFromList() {
    var listEl = document.getElementById('values-rank-list');
    if (!listEl) return [];
    var inputs = listEl.querySelectorAll('input[data-value-index]');
    var arr = [];
    for (var i = 0; i < inputs.length; i++) arr.push(inputs[i].value.trim());
    while (arr.length < VALUES_COUNT) arr.push('');
    return arr.slice(0, VALUES_COUNT);
  }

  function renderValuesEvaluation() {
    var evalBlock = document.getElementById('values-evaluation');
    var listA = document.getElementById('values-eval-list-a');
    var listB = document.getElementById('values-eval-list-b');
    var selectA = document.getElementById('values-eval-select-a');
    var selectB = document.getElementById('values-eval-select-b');
    var addBtn = document.getElementById('values-eval-add-btn');
    var relList = document.getElementById('values-eval-relationships');
    var names = getNames();
    var labelA = names.A || 'Partner A';
    var labelB = names.B || 'Partner B';
    var vals = getValues();
    var arrA = Array.isArray(vals.A) ? vals.A : [];
    var arrB = Array.isArray(vals.B) ? vals.B : [];
    var hasBoth = arrA.length >= VALUES_COUNT && arrB.length >= VALUES_COUNT;
    if (!evalBlock) return;
    evalBlock.style.display = hasBoth ? 'block' : 'none';
    if (!hasBoth) return;
    if (listA) {
      listA.innerHTML = arrA.filter(Boolean).map(function (v) { return '<li>' + escapeHtml(v) + '</li>'; }).join('');
    }
    if (listB) {
      listB.innerHTML = arrB.filter(Boolean).map(function (v) { return '<li>' + escapeHtml(v) + '</li>'; }).join('');
    }
    document.getElementById('values-eval-label-a').textContent = labelA;
    document.getElementById('values-eval-label-b').textContent = labelB;
    if (selectA) {
      selectA.innerHTML = arrA.filter(Boolean).map(function (v) { return '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>'; }).join('');
    }
    if (selectB) {
      selectB.innerHTML = arrB.filter(Boolean).map(function (v) { return '<option value="' + escapeHtml(v) + '">' + escapeHtml(v) + '</option>'; }).join('');
    }
    var rels = getValuesRelationships();
    var typeLabel = function (t) {
      if (t === 'same') return 'Same in practice';
      if (t === 'complement') return 'Complements';
      if (t === 'opposition') return 'In opposition';
      return t;
    };
    if (relList) {
      relList.innerHTML = rels.map(function (r, i) {
        return '<li><span>' + escapeHtml(r.a) + ' ↔ ' + escapeHtml(r.b) + ': ' + escapeHtml(typeLabel(r.type)) + '</span> <button type="button" class="remove-rel" data-rel-index="' + i + '">Remove</button></li>';
      }).join('');
      relList.querySelectorAll('.remove-rel').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var idx = parseInt(btn.dataset.relIndex, 10);
          var next = getValuesRelationships().slice();
          next.splice(idx, 1);
          saveValuesRelationships(next);
          renderValuesEvaluation();
        });
      });
    }
    if (addBtn) {
      addBtn.onclick = function () {
        var aVal = selectA && selectA.value;
        var bVal = selectB && selectB.value;
        var typeEl = document.getElementById('values-eval-type');
        var type = typeEl ? typeEl.value : 'same';
        if (!aVal || !bVal) return;
        var next = getValuesRelationships().slice();
        next.push({ a: aVal, b: bVal, type: type });
        saveValuesRelationships(next);
        renderValuesEvaluation();
      };
    }
  }

  function getRecommendationLabel(value) {
    if (value === 'together') return 'Fulfill together';
    if (value === 'elsewhere') return 'Some may be met in other relationships';
    return 'Needs more discussion';
  }

  /** Fallback synopsis when agreement-generator.js is not available (e.g. script load error). */
  function fallbackRecommendationLongform(sectionLabel, questions, answersA, answersB, agreementType, labelA, labelB) {
    var OPPOSITES = [['Yes', 'No'], ['Full time', 'Not at all'], ['Not at all', 'Full time'], ['Yes, always', 'No'], ['Yes, before it happens', 'No'], ['Yes, ideally', 'Prefer not to'], ['Prefer not to', 'Yes, ideally'], ['Very; I want kitchen table poly', 'Not necessary; parallel is fine'], ['Not necessary; parallel is fine', 'Very; I want kitchen table poly'], ['Yes, written', 'Prefer to keep things flexible'], ['Prefer to keep things flexible', 'Yes, written'], ['Yes', 'No one'], ['No one', 'Yes']];
    function norm(v) {
      if (v == null) return '';
      if (typeof v === 'object') {
        if (v.value === 'Other' && v.otherText) return ('Other: ' + String(v.otherText)).trim();
        return String(v.value != null ? v.value : '').trim();
      }
      return String(v).trim();
    }
    function same(a, b) { return norm(a) === norm(b); }
    function opp(a, b) {
      var x = norm(a), y = norm(b);
      if (!x || !y) return false;
      return OPPOSITES.some(function (p) { return (p[0] === x && p[1] === y) || (p[1] === x && p[0] === y); });
    }
    var sameCount = 0, oppositeCount = 0, total = 0;
    questions.forEach(function (q) {
      var name = getAnswerKey(q);
      var va = answersA[name] && (answersA[name].value !== undefined ? answersA[name].value : answersA[name]);
      var vb = answersB[name] && (answersB[name].value !== undefined ? answersB[name].value : answersB[name]);
      if (norm(va) === '' && norm(vb) === '') return;
      total++;
      if (same(va, vb)) sameCount++;
      else if (opp(va, vb)) oppositeCount++;
    });
    var intro = '';
    if (total === 0) intro = 'Neither of you has answered the questions in this section yet. When you do, this section will suggest how to turn your answers into a shared expectation. There\'s no rush—the point is to have a real conversation, not to check every box.';
    else if (oppositeCount > 0) intro = 'Your answers in ' + sectionLabel.toLowerCase() + ' show some clear differences. That\'s normal and workable. Differences are a starting point for conversation, not a failure. The goal is to hear each other and decide what you can realistically expect from this relationship—and what might be met elsewhere or revisited later.';
    else if (sameCount === total) intro = 'You and ' + labelB + ' are aligned here: you both indicated similar expectations. That\'s a strong base. You can still use the notes below to add any specifics or caveats so the agreement feels accurate to you both.';
    else intro = 'Your answers in ' + sectionLabel.toLowerCase() + ' are partly aligned. Some overlap, some don\'t. That\'s common. The next step is to name what you each need, listen to what\'s underneath the preferences, and decide what you can expect from each other in this relationship.';
    var recommendation = '';
    if (agreementType === 'together') recommendation = 'We recommend stating that you intend to meet these ' + sectionLabel.toLowerCase() + ' needs and expectations together within this relationship. Use the notes below to add any specifics or limits so the draft reflects what you\'ve actually agreed.';
    else if (agreementType === 'elsewhere') recommendation = 'We recommend acknowledging these needs and stating that you\'re open to some of them being met in other relationships, with your support for each other. No one partner has to meet every need—that\'s part of polyamory. Use the notes below to add any boundaries or specifics you\'ve discussed.';
    else recommendation = 'We recommend keeping this area under ongoing conversation. That doesn\'t mean you\'ve failed; it means you\'re being honest. Try to talk about what\'s underneath your answers—what you\'re hoping for, what you\'re afraid of, what "good" would look like for each of you. You don\'t have to agree on everything. Decide one small thing you can expect from each other for now, or agree to revisit in a few weeks or months. Use the notes below to record what you\'ve already discussed or decided.';
    return intro + ' ' + recommendation;
  }

  function renderContract() {
    var container = document.getElementById('contract-content');
    var names = getNames();
    var answers = getAnswers();
    var ids = getPartnerIds();
    var contract = getContract();

    function sectionHasAnyAnswer(questions, answersByPartner) {
      for (var i = 0; i < questions.length; i++) {
        var name = getAnswerKey(questions[i]);
        for (var k = 0; k < ids.length; k++) {
          var ans = answersByPartner[ids[k]] || {};
          var v = ans[name] && (ans[name].value !== undefined ? ans[name].value : ans[name]);
          if (v != null && (typeof v !== 'string' || v.trim() !== '')) return true;
        }
      }
      return false;
    }

    var recommendations = {};
    if (ids.length === 2 && typeof AgreementGenerator !== 'undefined' && AgreementGenerator.getRecommendations) {
      recommendations = AgreementGenerator.getRecommendations(answers.A || {}, answers.B || {});
    }
    var getLongform = (typeof AgreementGenerator !== 'undefined' && AgreementGenerator.getRecommendationLongform)
      ? AgreementGenerator.getRecommendationLongform
      : fallbackRecommendationLongform;

    var sectionLabels = {};
    SECTIONS.forEach(function (sec) { sectionLabels[sec.id] = sec.label; });
    var sorted = QUESTIONS.slice().sort(function (a, b) { return (typeof a.id === 'number' && typeof b.id === 'number') ? a.id - b.id : String(a.id).localeCompare(String(b.id), undefined, { numeric: true }); });
    var sectionOrder = [];
    sorted.forEach(function (q) {
      if (sectionOrder.indexOf(q.section) === -1) sectionOrder.push(q.section);
    });

    var hasIncompleteSection = false;
    sectionOrder.forEach(function (secId) {
      var questions = sorted.filter(function (q) { return q.section === secId; });
      if (questions.length && !sectionHasAnyAnswer(questions, answers)) hasIncompleteSection = true;
    });

    for (var secId in recommendations) {
      var questionsForSec = sorted.filter(function (q) { return q.section === secId; });
      if (!sectionHasAnyAnswer(questionsForSec, answers)) continue;
      var c = contract[secId] || {};
      if (!c.agreement) {
        saveContractSection(secId, recommendations[secId], c.notes || '', c.discussionOutcome || '');
      }
    }
    contract = getContract();

    var html = '';
    if (hasIncompleteSection) {
      html += '<p class="contract-incomplete-banner">Some questions are still unanswered. Sections with no answers yet are marked below; you can still view and edit the rest of the contract.</p>';
    }
    var labelA = names.A || 'Partner A';
    var labelB = names.B || 'Partner B';
    sectionOrder.forEach(function (secId) {
      var questions = sorted.filter(function (q) { return q.section === secId; });
      if (!questions.length) return;
      var sectionLabel = sectionLabels[secId] || secId;
      if (!sectionHasAnyAnswer(questions, answers)) {
        html += '<div class="contract-section contract-section-incomplete" data-section="' + secId + '"><h3>' + escapeHtml(sectionLabel) + '</h3><p class="contract-section-placeholder">This section still needs all partners to complete their answers in the Questionnaire tab.</p></div>';
        return;
      }
      var secContract = contract[secId] || {};
      var recommended = recommendations[secId] || 'discuss';
      var agree = secContract.agreement || recommended;
      var longform = (ids.length === 2)
        ? getLongform(sectionLabel, questions, answers.A || {}, answers.B || {}, agree, labelA, labelB)
        : 'Review each partner\'s answers below and discuss how you want to frame this section together. Use the notes to record decisions.';

      var qaRows = '';
      questions.forEach(function (q) {
        var name = getAnswerKey(q);
        var partnerCells = ids.map(function (id) {
          var raw = answers[id] && answers[id][name];
          var v = raw && raw.value !== undefined ? raw.value : raw;
          var ans = typeof v === 'object' ? (v && v.value) : v;
          if (raw && raw.value === 'Other' && raw.otherText) ans = 'Other: ' + raw.otherText;
          else if (ans === 'Other' && raw && raw.otherText) ans = 'Other: ' + raw.otherText;
          if (!ans) ans = '—';
          var label = names[id] || 'Partner ' + id;
          return '<span class="contract-qa-partner"><span class="qa-label">' + escapeHtml(label) + '</span>' + escapeHtml(String(ans)) + '</span>';
        }).join('');
        qaRows += '<div class="contract-qa-row"><span class="contract-qa-q"><span class="q-num">' + q.id + '.</span> ' + escapeHtml(q.text) + '</span>' + partnerCells + '</div>';
      });
      var notes = secContract.notes || '';
      var discussionOutcome = secContract.discussionOutcome || '';
      var sectionNotes = notes || (discussionOutcome ? discussionOutcome : '');

      html += '<div class="contract-section" data-section="' + secId + '"><h3>' + escapeHtml(sectionLabel) + '</h3><div class="contract-qa-list">' + qaRows + '</div><div class="contract-recommendation-tile"><p class="contract-recommendation-text">' + escapeHtml(longform) + '</p><details class="contract-framing-override"><summary>Choose different framing</summary><div class="agreement-row"><label><input type="radio" name="contract_' + secId + '" value="together" ' + (agree === 'together' ? 'checked' : '') + ' /> Fulfill together</label><label><input type="radio" name="contract_' + secId + '" value="elsewhere" ' + (agree === 'elsewhere' ? 'checked' : '') + ' /> Some may be met elsewhere</label><label><input type="radio" name="contract_' + secId + '" value="discuss" ' + (agree === 'discuss' ? 'checked' : '') + ' /> Needs more discussion</label></div></details></div><div class="agreement-notes"><label class="agreement-notes-label">Notes or decisions for this section (added to the agreement):</label><textarea placeholder="e.g. We agreed to X. We will revisit in 6 months." data-notes="' + secId + '">' + escapeHtml(sectionNotes) + '</textarea></div></div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.contract-section').forEach(function (block) {
      var sectionId = block.dataset.section;
      if (block.classList.contains('contract-section-incomplete')) return;
      var radios = block.querySelectorAll('input[name="contract_' + sectionId + '"]');
      var notesEl = block.querySelector('textarea[data-notes]');
      function saveSection() {
        var checked = block.querySelector('input[name="contract_' + sectionId + '"]:checked');
        saveContractSection(sectionId, checked ? checked.value : '', notesEl ? notesEl.value.trim() : '', '');
        updateContractDoc();
      }
      function onFramingChange() {
        saveSection();
        renderContract();
      }
      if (radios && radios.length) {
        for (var i = 0; i < radios.length; i++) {
          radios[i].addEventListener('change', onFramingChange);
        }
      }
      if (notesEl) notesEl.addEventListener('input', saveSection);
    });
    updateContractDoc();
  }

  function updateContractDoc() {
    var docEl = document.getElementById('contract-doc');
    var names = getNames();
    var answers = getAnswers();
    var contract = getContract();
    var ids = getPartnerIds();
    var hasAny = ids.some(function (id) { return Object.keys(answers[id] || {}).length > 0; });
    if (!docEl) return;
    if (!hasAny) {
      docEl.style.display = 'none';
      return;
    }
    var fullText = (ids.length === 2 && typeof AgreementGenerator !== 'undefined' && AgreementGenerator.generateFullAgreement)
      ? AgreementGenerator.generateFullAgreement(names, answers, contract)
      : buildLegacyContractText(names, contract);
    docEl.textContent = fullText;
    docEl.style.display = 'block';
  }

  function buildLegacyContractText(names, contract) {
    var ids = getPartnerIds();
    var labels = ids.map(function (id) { return names[id] || 'Partner ' + id; }).filter(Boolean);
    var lines = [];
    lines.push('RELATIONSHIP CONTRACT (DRAFT)');
    lines.push(labels.length ? labels.join(', ') : 'Partners');
    lines.push('');
    SECTIONS.forEach((sec) => {
      const c = contract[sec.id];
      if (!c || !c.agreement) return;
      const agreementLabel =
        c.agreement === 'together' ? 'We expect to fulfill these together.'
        : c.agreement === 'elsewhere' ? 'We acknowledge these needs; some may be met in other relationships.'
        : c.agreement === 'discuss' ? 'Needs more discussion.'
        : '';
      if (agreementLabel) {
        lines.push(sec.label.toUpperCase());
        lines.push(agreementLabel);
        if (c.notes) lines.push('Notes: ' + c.notes);
        lines.push('');
      }
    });
    return lines.join('\n') || 'Select agreement types above and the draft will appear here.';
  }

  function escapeHtml(s) {
    if (s == null) return '';
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  /** Storage key for a question: numeric id -> q1, q2; string id -> q_section_name (see FUTURE-PROOFING.md). */
  function getAnswerKey(q) {
    var id = q.id;
    return typeof id === 'number' ? 'q' + id : 'q_' + String(id);
  }

  function showView(viewId) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.querySelectorAll('nav button').forEach((b) => b.classList.remove('active'));
    const v = document.getElementById('view-' + viewId);
    const btn = document.querySelector(`nav button[data-view="${viewId}"]`);
    if (v) v.classList.add('active');
    if (btn) btn.classList.add('active');
    if (viewId === 'compare') renderCompare();
    if (viewId === 'contract') renderContract();
    if (viewId === 'values') {
      renderValues();
      renderValuesEvaluation();
    }
  }

  var SESSION_ID_KEY = 'polycule_cloud_session_id';
  var SESSION_CODE_KEY = 'polycule_cloud_session_code';

  function showSetupPage() {
    var setup = document.getElementById('page-setup');
    var app = document.getElementById('page-app');
    if (setup) setup.classList.add('active');
    if (app) app.classList.remove('active');
  }

  var NEW_QUESTIONS_BANNER_DISMISSED_KEY = 'polycule_new_questions_banner_dismissed';

  function updateNewQuestionsBanner() {
    var banner = document.getElementById('new-questions-banner');
    if (!banner) return;
    var currentVersion = typeof QUESTIONNAIRE_VERSION !== 'undefined' ? QUESTIONNAIRE_VERSION : 1;
    var storedVersion = null;
    try {
      var v = sessionStorage.getItem(SESSION_QUESTIONNAIRE_VERSION_KEY);
      if (v != null) storedVersion = parseInt(v, 10);
      if (storedVersion == null) {
        v = localStorage.getItem(SAVED_QUESTIONNAIRE_VERSION_KEY);
        if (v != null) storedVersion = parseInt(v, 10);
      }
      if (storedVersion == null || isNaN(storedVersion)) storedVersion = 1;
    } catch (_) { storedVersion = 1; }
    var dismissed = null;
    try { dismissed = sessionStorage.getItem(NEW_QUESTIONS_BANNER_DISMISSED_KEY); } catch (_) {}
    if (storedVersion < currentVersion && dismissed !== String(currentVersion)) {
      banner.style.display = 'flex';
    } else {
      banner.style.display = 'none';
    }
  }

  function showAppPage() {
    var setup = document.getElementById('page-setup');
    var app = document.getElementById('page-app');
    if (setup) setup.classList.remove('active');
    if (app) app.classList.add('active');
    updateSessionStrip();
    updateNewQuestionsBanner();
  }

  function updateSessionStrip() {
    var codeEl = document.getElementById('session-strip-code');
    if (!codeEl) return;
    try {
      var code = sessionStorage.getItem(SESSION_CODE_KEY);
      if (code) {
        codeEl.style.display = '';
        codeEl.innerHTML = 'Session: <strong>' + escapeHtml(code) + '</strong> ';
        var copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.textContent = 'Copy code';
        copyBtn.addEventListener('click', function () {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(function () { copyBtn.textContent = 'Copied'; });
          }
        });
        codeEl.appendChild(copyBtn);
      } else {
        codeEl.style.display = 'none';
        codeEl.innerHTML = '';
      }
    } catch (_) {
      codeEl.style.display = 'none';
    }
  }

  window.polyculeShowSetupPage = showSetupPage;
  window.polyculeShowAppPage = showAppPage;
  window.polyculeUpdateSessionStrip = updateSessionStrip;

  function startOver() {
    try {
      sessionStorage.removeItem(SESSION_ID_KEY);
      sessionStorage.removeItem(SESSION_CODE_KEY);
      sessionStorage.removeItem(SESSION_QUESTIONNAIRE_VERSION_KEY);
      sessionStorage.removeItem(PARTNER_COUNT_KEY);
    } catch (_) {}
    PARTNER_IDS.forEach(function (id) {
      var ak = ANSWERS_KEYS[id];
      var vk = VALUES_KEYS[id];
      if (ak) localStorage.removeItem(ak);
      if (vk) localStorage.removeItem(vk);
    });
    localStorage.removeItem(STORAGE_NAMES);
    localStorage.removeItem(STORAGE_CONTRACT);
    localStorage.removeItem(STORAGE_VALUES_RELATIONSHIPS);
    try { sessionStorage.removeItem(MY_PARTNER_KEY); } catch (_) {}
    formData = {};
    currentPartner = 'A';
    if (window.polyculeShowSetupPage) window.polyculeShowSetupPage();
  }

  function clearQuestion10ForV2Upgrade() {
    var currentVersion = typeof QUESTIONNAIRE_VERSION !== 'undefined' ? QUESTIONNAIRE_VERSION : 1;
    var storedVersion = null;
    try {
      var v = sessionStorage.getItem(SESSION_QUESTIONNAIRE_VERSION_KEY);
      if (v != null) storedVersion = parseInt(v, 10);
      if (storedVersion == null) {
        v = localStorage.getItem(SAVED_QUESTIONNAIRE_VERSION_KEY);
        if (v != null) storedVersion = parseInt(v, 10);
      }
      if (storedVersion == null || isNaN(storedVersion)) storedVersion = 1;
    } catch (_) { storedVersion = 1; }
    if (currentVersion < 2 || storedVersion >= 2) return;
    var ids = getPartnerIds();
    ids.forEach(function (id) {
      var key = ANSWERS_KEYS[id];
      if (!key) return;
      try {
        var raw = localStorage.getItem(key);
        var data = raw ? JSON.parse(raw) : {};
        if (data.q10 != null) {
          delete data.q10;
          localStorage.setItem(key, JSON.stringify(data));
        }
      } catch (_) {}
    });
  }

  function init() {
    clearQuestion10ForV2Upgrade();
    formData = getAnswers();
    currentPartner = getMyPartner();
    renderForm();

    var startOverBtn = document.getElementById('btn-start-over');
    if (startOverBtn) startOverBtn.addEventListener('click', startOver);

    var dismissBtn = document.getElementById('new-questions-banner-dismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function () {
        try {
          var qv = typeof QUESTIONNAIRE_VERSION !== 'undefined' ? QUESTIONNAIRE_VERSION : 1;
          sessionStorage.setItem(NEW_QUESTIONS_BANNER_DISMISSED_KEY, String(qv));
        } catch (_) {}
        updateNewQuestionsBanner();
      });
    }

    try {
      if (sessionStorage.getItem(SESSION_ID_KEY)) {
        if (window.polyculeShowAppPage) window.polyculeShowAppPage();
      } else {
        if (window.polyculeShowSetupPage) window.polyculeShowSetupPage();
      }
    } catch (_) {
      if (window.polyculeShowSetupPage) window.polyculeShowSetupPage();
    }

    var btnUseLocal = document.getElementById('btn-use-local');
    if (btnUseLocal) {
      btnUseLocal.addEventListener('click', function () {
        try {
          sessionStorage.setItem(SESSION_ID_KEY, 'local');
          sessionStorage.setItem(PARTNER_COUNT_KEY, '2');
          sessionStorage.setItem(MY_PARTNER_KEY, 'A');
        } catch (_) {}
        window.location.reload();
      });
    }

    var partnerCountBtns = document.querySelectorAll('.partner-count-btn');
    if (partnerCountBtns.length) {
      var currentCount = getPartnerCount();
      partnerCountBtns.forEach(function (btn) {
        var val = parseInt(btn.getAttribute('data-value'), 10);
        btn.classList.toggle('selected', val === currentCount);
        btn.setAttribute('aria-pressed', val === currentCount ? 'true' : 'false');
        btn.addEventListener('click', function () {
          var n = parseInt(btn.getAttribute('data-value'), 10);
          setPartnerCount(n);
          partnerCountBtns.forEach(function (b) {
            var v = parseInt(b.getAttribute('data-value'), 10);
            b.classList.toggle('selected', v === n);
            b.setAttribute('aria-pressed', v === n ? 'true' : 'false');
          });
        });
      });
    }

    var myNameEl = document.getElementById('my-name');
    if (myNameEl) myNameEl.addEventListener('change', saveNames);
    if (myNameEl) myNameEl.addEventListener('blur', saveNames);

    document.getElementById('btn-save').addEventListener('click', function () {
      saveNames();
      var data = collectFormData();
      saveAnswers(currentPartner, data);
      try {
        var qv = typeof QUESTIONNAIRE_VERSION !== 'undefined' ? QUESTIONNAIRE_VERSION : 1;
        localStorage.setItem(SAVED_QUESTIONNAIRE_VERSION_KEY, String(qv));
        sessionStorage.setItem(SESSION_QUESTIONNAIRE_VERSION_KEY, String(qv));
      } catch (_) {}
      var unanswered = 0;
      QUESTIONS.forEach(function (q) {
        var name = getAnswerKey(q);
        var v = data[name];
        var val = v && (v.value !== undefined ? v.value : v);
        if (val == null || (typeof val === 'string' && val.trim() === '')) unanswered++;
      });
      var status = document.getElementById('save-status');
      if (status) {
        status.style.display = 'inline';
        status.textContent = 'Saved.' + (unanswered > 0 ? ' ' + unanswered + ' question(s) still unanswered—you can complete them later.' : '');
        setTimeout(function () { status.style.display = 'none'; }, unanswered > 0 ? 5000 : 2000);
      }
      if (window.polyculeSaveToCloudIfSession) window.polyculeSaveToCloudIfSession();
    });

    var btnSaveValues = document.getElementById('btn-save-values');
    if (btnSaveValues) {
      btnSaveValues.addEventListener('click', function () {
        var arr = collectValuesFromList();
        saveValues(getMyPartner(), arr);
        var status = document.getElementById('values-save-status');
        if (status) {
          status.style.display = 'inline';
          status.textContent = 'Saved.';
          setTimeout(function () { status.style.display = 'none'; }, 2000);
        }
        renderValuesEvaluation();
        if (window.polyculeSaveToCloudIfSession) window.polyculeSaveToCloudIfSession();
      });
    }

    document.querySelectorAll('nav button[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.view) showView(btn.dataset.view);
      });
    });

    document.getElementById('btn-export-txt').addEventListener('click', () => {
      const docEl = document.getElementById('contract-doc');
      const text = docEl ? (docEl.textContent || docEl.innerText) : '';
      if (!text || text.indexOf('Select agreement types') !== -1) {
        alert('Fill out the questionnaire for both partners, then open Relationship contract. You can use "Apply recommendations" or choose per section.');
        return;
      }
      navigator.clipboard.writeText(text).then(() => alert('Contract copied to clipboard.')).catch(() => alert('Could not copy. Try Print instead.'));
    });
    document.getElementById('btn-export-file').addEventListener('click', exportAgreementAsFile);

    document.getElementById('btn-print').addEventListener('click', () => {
      const docEl = document.getElementById('contract-doc');
      const text = docEl ? (docEl.textContent || docEl.innerText) : '';
      if (!text || text.indexOf('Select agreement types') !== -1) {
        alert('Fill out the questionnaire for both partners, then open Relationship contract. You can use "Apply recommendations" or choose per section.');
        return;
      }
      const w = window.open('', '_blank');
      w.document.write('<pre style="font-family:Georgia,serif; padding: 2rem; white-space: pre-wrap;">' + escapeHtml(text) + '</pre>');
      w.document.close();
      w.print();
      w.close();
    });
  }

  init();
})();
