(function () {
  const STORAGE_ANSWERS_A = 'polycule_answers_a';
  const STORAGE_ANSWERS_B = 'polycule_answers_b';
  const STORAGE_NAMES = 'polycule_names';
  const STORAGE_CONTRACT = 'polycule_contract';
  const EXPORT_VERSION = 1;

  let currentPartner = 'A';
  let formData = { A: {}, B: {} };

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
    return {
      version: EXPORT_VERSION,
      savedAt: new Date().toISOString(),
      partnerNames: names,
      answersA: answers.A,
      answersB: answers.B,
      contract: contract,
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
    const nameA = safeFilenamePart(data.partnerNames.A);
    const nameB = safeFilenamePart(data.partnerNames.B);
    const date = new Date().toISOString().slice(0, 10);
    const base = nameA && nameB ? 'polycule-' + nameA + '-' + nameB + '-' + date : 'polycule-session-' + date;
    const filename = base + '.polycule';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(blob, filename);
  }

  function applySessionData(data) {
    if (data.version == null || data.partnerNames == null) return false;
    localStorage.setItem(STORAGE_NAMES, JSON.stringify(data.partnerNames || { A: '', B: '' }));
    localStorage.setItem(STORAGE_ANSWERS_A, JSON.stringify(data.answersA || {}));
    localStorage.setItem(STORAGE_ANSWERS_B, JSON.stringify(data.answersB || {}));
    localStorage.setItem(STORAGE_CONTRACT, JSON.stringify(data.contract || {}));
    formData = { A: data.answersA || {}, B: data.answersB || {} };
    var nameA = document.getElementById('name-a');
    var nameB = document.getElementById('name-b');
    if (nameA) nameA.value = (data.partnerNames && data.partnerNames.A) || '';
    if (nameB) nameB.value = (data.partnerNames && data.partnerNames.B) || '';
    currentPartner = 'A';
    renderForm();
    renderCompare();
    renderContract();
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
    const names = getNames();
    const answers = getAnswers();
    return (names.A || names.B) || Object.keys(answers.A).length > 0 || Object.keys(answers.B).length > 0;
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
      const j = localStorage.getItem(STORAGE_NAMES);
      return j ? JSON.parse(j) : { A: '', B: '' };
    } catch (_) { return { A: '', B: '' }; }
  }

  function getAnswers() {
    try {
      const a = localStorage.getItem(STORAGE_ANSWERS_A);
      const b = localStorage.getItem(STORAGE_ANSWERS_B);
      return {
        A: a ? JSON.parse(a) : {},
        B: b ? JSON.parse(b) : {},
      };
    } catch (_) { return { A: {}, B: {} }; }
  }

  function getContract() {
    try {
      const j = localStorage.getItem(STORAGE_CONTRACT);
      return j ? JSON.parse(j) : {};
    } catch (_) { return {}; }
  }

  function saveAnswers(partner, data) {
    const key = partner === 'A' ? STORAGE_ANSWERS_A : STORAGE_ANSWERS_B;
    localStorage.setItem(key, JSON.stringify(data));
    formData[partner] = data;
  }

  function saveNames() {
    const names = { A: document.getElementById('name-a').value.trim(), B: document.getElementById('name-b').value.trim() };
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
    const container = document.getElementById('form-content');
    const names = getNames();
    document.getElementById('name-a').value = names.A;
    document.getElementById('name-b').value = names.B;

    var sectionLabels = {};
    SECTIONS.forEach(function (sec) { sectionLabels[sec.id] = sec.label; });
    var sorted = QUESTIONS.slice().sort(function (a, b) { return a.id - b.id; });
    var lastSection = null;
    var html = '';
    sorted.forEach(function (q) {
      if (q.section !== lastSection) {
        if (lastSection) html += '</div>';
        lastSection = q.section;
        html += '<div class="section-block" data-section="' + escapeHtml(lastSection) + '"><h2>' + escapeHtml(sectionLabels[lastSection] || lastSection) + '</h2>';
      }
      var name = 'q' + q.id;
      var existing = formData[currentPartner][name];
      if (q.type === 'text') {
        html += '<div class="q-block"><label class="q-text">' + q.id + '. ' + escapeHtml(q.text) + '</label><textarea name="' + name + '" data-qid="' + q.id + '" placeholder="' + escapeHtml(q.placeholder || '') + '">' + escapeHtml(existing && existing.value ? existing.value : '') + '</textarea><div class="notes"><input type="text" name="' + name + '_notes" placeholder="Notes (optional)" value="' + escapeHtml(existing && existing.notes ? existing.notes : '') + '" /></div></div>';
      } else {
        html += '<div class="q-block"><label class="q-text">' + q.id + '. ' + escapeHtml(q.text) + '</label><div class="options">';
        q.options.forEach(function (opt) {
          var checked = existing && existing.value === opt ? ' checked' : '';
          html += '<label><input type="radio" name="' + name + '" value="' + escapeHtml(opt) + '"' + checked + ' /> ' + escapeHtml(opt) + '</label>';
        });
        html += '</div><div class="notes"><input type="text" name="' + name + '_notes" placeholder="Notes (optional)" value="' + escapeHtml(existing && existing.notes ? existing.notes : '') + '" /></div></div>';
      }
    });
    if (lastSection) html += '</div>';
    container.innerHTML = html;
  }

  function collectFormData() {
    const data = {};
    const container = document.getElementById('form-content');
    QUESTIONS.forEach((q) => {
      const name = `q${q.id}`;
      if (q.type === 'text') {
        const el = container.querySelector(`textarea[name="${name}"]`);
        const notesEl = container.querySelector(`input[name="${name}_notes"]`);
        if (el) data[name] = { value: el.value.trim(), notes: notesEl ? notesEl.value.trim() : '' };
      } else {
        const radio = container.querySelector(`input[name="${name}"]:checked`);
        const notesEl = container.querySelector(`input[name="${name}_notes"]`);
        data[name] = { value: radio ? radio.value : '', notes: notesEl ? notesEl.value.trim() : '' };
      }
    });
    return data;
  }

  function renderCompare() {
    const container = document.getElementById('compare-content');
    const names = getNames();
    const labelA = names.A || 'Partner A';
    const labelB = names.B || 'Partner B';
    const answers = getAnswers();

    if (!Object.keys(answers.A).length && !Object.keys(answers.B).length) {
      container.innerHTML = '<p class="compare-empty">No answers saved yet. Fill out the questionnaire for both partners first.</p>';
      return;
    }

    var sectionLabels = {};
    SECTIONS.forEach(function (sec) { sectionLabels[sec.id] = sec.label; });
    var sorted = QUESTIONS.slice().sort(function (a, b) { return a.id - b.id; });
    var lastSection = null;
    var html = '<table class="compare-table"><thead><tr><th>Question</th><th class="partner-a">' + escapeHtml(labelA) + '</th><th class="partner-b">' + escapeHtml(labelB) + '</th></tr></thead><tbody>';
    sorted.forEach(function (q) {
      if (q.section !== lastSection) {
        lastSection = q.section;
        html += '<tr class="section-row"><td colspan="3">' + escapeHtml(sectionLabels[lastSection] || lastSection) + '</td></tr>';
      }
      var name = 'q' + q.id;
      var aVal = answers.A[name] && answers.A[name].value !== undefined ? answers.A[name].value : answers.A[name];
      var aDisplay = typeof aVal === 'object' ? (aVal && aVal.value || '—') : (aVal || '—');
      var bVal = answers.B[name] && answers.B[name].value !== undefined ? answers.B[name].value : answers.B[name];
      var bDisplay = typeof bVal === 'object' ? (bVal && bVal.value || '—') : (bVal || '—');
      html += '<tr><th>' + escapeHtml(q.text) + '</th><td class="answer">' + escapeHtml(String(aDisplay)) + '</td><td class="answer">' + escapeHtml(String(bDisplay)) + '</td></tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  function getRecommendationLabel(value) {
    if (value === 'together') return 'Fulfill together';
    if (value === 'elsewhere') return 'Some may be met in other relationships';
    return 'Needs more discussion';
  }

  function renderContract() {
    const container = document.getElementById('contract-content');
    const recommendBar = document.getElementById('contract-recommend-bar');
    const names = getNames();
    const labelA = names.A || 'Partner A';
    const labelB = names.B || 'Partner B';
    const answers = getAnswers();
    const contract = getContract();

    if (!Object.keys(answers.A).length && !Object.keys(answers.B).length) {
      container.innerHTML = '<p class="contract-empty">Fill out the questionnaire for both partners and use Compare first, then build your contract here.</p>';
      if (recommendBar) recommendBar.style.display = 'none';
      document.getElementById('contract-doc').style.display = 'none';
      return;
    }

    const recommendations = typeof AgreementGenerator !== 'undefined' && AgreementGenerator.getRecommendations
      ? AgreementGenerator.getRecommendations(answers.A, answers.B)
      : {};
    if (recommendBar) recommendBar.style.display = 'flex';

    var sectionLabels = {};
    SECTIONS.forEach(function (sec) { sectionLabels[sec.id] = sec.label; });
    var sorted = QUESTIONS.slice().sort(function (a, b) { return a.id - b.id; });
    var sectionOrder = [];
    sorted.forEach(function (q) {
      if (sectionOrder.indexOf(q.section) === -1) sectionOrder.push(q.section);
    });

    var html = '';
    sectionOrder.forEach(function (secId) {
      var questions = sorted.filter(function (q) { return q.section === secId; });
      if (!questions.length) return;
      var secContract = contract[secId] || {};
      var recommended = recommendations[secId] || 'discuss';
      var summaryA = questions.map(function (q) {
        var name = 'q' + q.id;
        var v = answers.A[name] && answers.A[name].value !== undefined ? answers.A[name].value : answers.A[name];
        return typeof v === 'object' ? (v && v.value) : v;
      }).filter(Boolean).join(' · ') || '—';
      var summaryB = questions.map(function (q) {
        var name = 'q' + q.id;
        var v = answers.B[name] && answers.B[name].value !== undefined ? answers.B[name].value : answers.B[name];
        return typeof v === 'object' ? (v && v.value) : v;
      }).filter(Boolean).join(' · ') || '—';
      var agree = secContract.agreement || '';
      var notes = secContract.notes || '';
      var discussionOutcome = secContract.discussionOutcome || '';
      html += '<div class="contract-section" data-section="' + secId + '"><h3>' + escapeHtml(sectionLabels[secId] || secId) + '</h3><div class="recommended">Suggested from your answers: ' + escapeHtml(getRecommendationLabel(recommended)) + '</div><div class="answers-summary"><div class="col"><strong>' + escapeHtml(labelA) + '</strong> ' + escapeHtml(summaryA) + '</div><div class="col"><strong>' + escapeHtml(labelB) + '</strong> ' + escapeHtml(summaryB) + '</div></div><div class="agreement-row"><label><input type="radio" name="contract_' + secId + '" value="together" ' + (agree === 'together' ? 'checked' : '') + ' /> We expect to fulfill these together</label><label><input type="radio" name="contract_' + secId + '" value="elsewhere" ' + (agree === 'elsewhere' ? 'checked' : '') + ' /> We acknowledge these needs; some may be met in other relationships</label><label><input type="radio" name="contract_' + secId + '" value="discuss" ' + (agree === 'discuss' ? 'checked' : '') + ' /> Needs more discussion</label></div><div class="agreement-notes"><textarea placeholder="Agreement notes (optional)" data-notes="' + secId + '">' + escapeHtml(notes) + '</textarea></div><div class="discussion-outcome"><label class="outcome-label">Discussion outcome — record what you decided after talking (added to the agreement):</label><textarea placeholder="e.g. We will revisit in 6 months. We agreed to X." data-outcome="' + secId + '">' + escapeHtml(discussionOutcome) + '</textarea></div></div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.contract-section').forEach((block) => {
      const sectionId = block.dataset.section;
      const radios = block.querySelectorAll(`input[name="contract_${sectionId}"]`);
      const notesEl = block.querySelector('textarea[data-notes]');
      const outcomeEl = block.querySelector('textarea[data-outcome]');
      function saveSection() {
        const checked = block.querySelector(`input[name="contract_${sectionId}"]:checked`);
        saveContractSection(sectionId, checked ? checked.value : '', notesEl.value.trim(), outcomeEl ? outcomeEl.value.trim() : '');
        updateContractDoc();
      }
      radios.forEach((r) => {
        r.addEventListener('change', saveSection);
      });
      notesEl.addEventListener('input', saveSection);
      if (outcomeEl) outcomeEl.addEventListener('input', saveSection);
    });
    updateContractDoc();
  }

  function updateContractDoc() {
    const docEl = document.getElementById('contract-doc');
    const names = getNames();
    const answers = getAnswers();
    const contract = getContract();

    if (!docEl) return;
    if (!Object.keys(answers.A).length && !Object.keys(answers.B).length) {
      docEl.style.display = 'none';
      return;
    }

    const fullText = typeof AgreementGenerator !== 'undefined' && AgreementGenerator.generateFullAgreement
      ? AgreementGenerator.generateFullAgreement(names, answers, contract)
      : buildLegacyContractText(names, contract);
    docEl.textContent = fullText;
    docEl.style.display = 'block';
  }

  function buildLegacyContractText(names, contract) {
    const labelA = names.A || 'Partner A';
    const labelB = names.B || 'Partner B';
    const lines = [];
    lines.push('RELATIONSHIP CONTRACT (DRAFT)');
    lines.push(`${labelA} & ${labelB}`);
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

  function showView(viewId) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    document.querySelectorAll('nav button').forEach((b) => b.classList.remove('active'));
    const v = document.getElementById('view-' + viewId);
    const btn = document.querySelector(`nav button[data-view="${viewId}"]`);
    if (v) v.classList.add('active');
    if (btn) btn.classList.add('active');
    if (viewId === 'compare') renderCompare();
    if (viewId === 'contract') renderContract();
  }

  var SESSION_ID_KEY = 'polycule_cloud_session_id';
  var SESSION_CODE_KEY = 'polycule_cloud_session_code';

  function showSetupPage() {
    var setup = document.getElementById('page-setup');
    var app = document.getElementById('page-app');
    if (setup) setup.classList.add('active');
    if (app) app.classList.remove('active');
  }

  function showAppPage() {
    var setup = document.getElementById('page-setup');
    var app = document.getElementById('page-app');
    if (setup) setup.classList.remove('active');
    if (app) app.classList.add('active');
    updateSessionStrip();
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
    } catch (_) {}
    localStorage.removeItem(STORAGE_ANSWERS_A);
    localStorage.removeItem(STORAGE_ANSWERS_B);
    localStorage.removeItem(STORAGE_NAMES);
    localStorage.removeItem(STORAGE_CONTRACT);
    formData = { A: {}, B: {} };
    currentPartner = 'A';
    if (window.polyculeShowSetupPage) window.polyculeShowSetupPage();
  }

  function init() {
    formData = getAnswers();
    currentPartner = document.querySelector('input[name="who"]:checked')?.value || 'A';
    renderForm();

    var startOverBtn = document.getElementById('btn-start-over');
    if (startOverBtn) startOverBtn.addEventListener('click', startOver);

    try {
      if (sessionStorage.getItem(SESSION_ID_KEY)) {
        if (window.polyculeShowAppPage) window.polyculeShowAppPage();
      } else {
        if (window.polyculeShowSetupPage) window.polyculeShowSetupPage();
      }
    } catch (_) {
      if (window.polyculeShowSetupPage) window.polyculeShowSetupPage();
    }

    document.querySelectorAll('input[name="who"]').forEach((r) => {
      r.addEventListener('change', () => {
        saveNames();
        const prev = collectFormData();
        saveAnswers(currentPartner, prev);
        currentPartner = r.value;
        formData = getAnswers();
        renderForm();
      });
    });

    document.getElementById('name-a').addEventListener('change', saveNames);
    document.getElementById('name-b').addEventListener('change', saveNames);

    document.getElementById('btn-save').addEventListener('click', () => {
      saveNames();
      const data = collectFormData();
      saveAnswers(currentPartner, data);
      const status = document.getElementById('save-status');
      status.style.display = 'inline';
      status.textContent = 'Saved.';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
      if (window.polyculeSaveToCloudIfSession) window.polyculeSaveToCloudIfSession();
    });

    document.querySelectorAll('nav button[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.dataset.view) showView(btn.dataset.view);
      });
    });

    var applyRecBtn = document.getElementById('btn-apply-recommendations');
    if (applyRecBtn) {
      applyRecBtn.addEventListener('click', function () {
        var answers = getAnswers();
        if (!Object.keys(answers.A).length && !Object.keys(answers.B).length) return;
        var recommendations = typeof AgreementGenerator !== 'undefined' && AgreementGenerator.getRecommendations
          ? AgreementGenerator.getRecommendations(answers.A, answers.B)
          : {};
        var contract = getContract();
        Object.keys(recommendations).forEach(function (sectionId) {
          var existing = contract[sectionId] || {};
          saveContractSection(sectionId, recommendations[sectionId], existing.notes || '', existing.discussionOutcome || '');
        });
        renderContract();
        updateContractDoc();
      });
    }

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
