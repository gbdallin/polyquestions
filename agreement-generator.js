/**
 * Recommendation and prose generation for the relationship agreement.
 * Uses both partners' answers (including plain text) to recommend agreement type
 * and to generate the full written agreement.
 */

var AgreementGenerator = (function () {

  // Pairs of options we treat as opposing (suggest "discuss" or "elsewhere")
  var OPPOSITES = [
    ['Yes', 'No'],
    ['Full time', 'Not at all'],
    ['Not at all', 'Full time'],
    ['Yes, always', 'No'],
    ['Yes, before it happens', 'No'],
    ['Yes, ideally', 'Prefer not to'],
    ['Prefer not to', 'Yes, ideally'],
    ['Very; I want kitchen table poly', 'Not necessary; parallel is fine'],
    ['Not necessary; parallel is fine', 'Very; I want kitchen table poly'],
    ['Yes, written', 'Prefer to keep things flexible'],
    ['Prefer to keep things flexible', 'Yes, written'],
    ['Yes', 'No one'],
    ['No one', 'Yes'],
  ];

  function normalize(val) {
    if (val == null) return '';
    if (typeof val === 'object') {
      if (val.value === 'Other' && val.otherText) return ('Other: ' + String(val.otherText)).trim();
      return String(val.value != null ? val.value : '').trim();
    }
    return String(val).trim();
  }

  function areOpposite(a, b) {
    var x = normalize(a), y = normalize(b);
    if (!x || !y) return false;
    return OPPOSITES.some(function (pair) {
      return (pair[0] === x && pair[1] === y) || (pair[1] === x && pair[0] === y);
    });
  }

  function areSame(a, b) {
    return normalize(a) === normalize(b);
  }

  function getAnswerKey(q) {
    var id = q.id;
    return typeof id === 'number' ? 'q' + id : 'q_' + String(id);
  }

  /**
   * Recommend agreement type for a section from both partners' answers.
   * @param {Object} answersA - map of q1, q2, ... to { value, notes }
   * @param {Object} answersB - same
   * @param {Array} questions - QUESTIONS in this section
   * @returns {'together'|'elsewhere'|'discuss'}
   */
  function recommendForSection(answersA, answersB, questions) {
    var sameCount = 0, oppositeCount = 0, total = 0;
    questions.forEach(function (q) {
      var name = getAnswerKey(q);
      var a = answersA[name];
      var b = answersB[name];
      var va = a && (a.value !== undefined ? a.value : a);
      var vb = b && (b.value !== undefined ? b.value : b);
      if (va === '' && vb === '') return;
      total++;
      if (areSame(va, vb)) sameCount++;
      else if (areOpposite(va, vb)) oppositeCount++;
    });
    if (total === 0) return 'discuss';
    if (oppositeCount > 0) return 'discuss';
    if (sameCount === total) return 'together';
    if (sameCount >= total / 2) return 'together';
    return 'discuss';
  }

  /**
   * Get recommended agreement type for every section.
   * @returns {Object} sectionId -> 'together'|'elsewhere'|'discuss'
   */
  function getRecommendations(answersA, answersB) {
    var bySection = {};
    QUESTIONS.forEach(function (q) {
      if (!bySection[q.section]) bySection[q.section] = [];
      bySection[q.section].push(q);
    });
    var rec = {};
    SECTIONS.forEach(function (sec) {
      var questions = bySection[sec.id] || [];
      if (questions.length) rec[sec.id] = recommendForSection(answersA, answersB, questions);
    });
    return rec;
  }

  function formatAnswer(val) {
    var v = normalize(val);
    if (!v) return null;
    if (v.length > 120) return v.slice(0, 117) + '...';
    return v;
  }

  function summaryForPartner(answers, questions) {
    var parts = [];
    questions.forEach(function (q) {
      var name = getAnswerKey(q);
      var v = formatAnswer(answers[name]);
      if (v) parts.push(v);
    });
    return parts.length ? parts.join('. ') : null;
  }

  function agreementSentence(type, sectionLabel) {
    if (type === 'together') {
      return 'We intend to meet these needs and expectations together within this relationship.';
    }
    if (type === 'elsewhere') {
      return 'We acknowledge these needs; we are open to some of them being met in other relationships and will support each other in that.';
    }
    return 'We agree to keep this area under ongoing conversation and to revisit our expectations as needed.';
  }

  /**
   * Generate longform recommendation text for a section (for the contract builder UI).
   * Aligned with relationship-negotiator rule: in-depth, kind, normalizing differences,
   * guiding toward conversation and realistic expectations.
   */
  function getRecommendationLongform(sectionLabel, questions, answersA, answersB, agreementType, labelA, labelB) {
    var sameCount = 0, oppositeCount = 0, total = 0;
    questions.forEach(function (q) {
      var name = getAnswerKey(q);
      var va = answersA[name] && (answersA[name].value !== undefined ? answersA[name].value : answersA[name]);
      var vb = answersB[name] && (answersB[name].value !== undefined ? answersB[name].value : answersB[name]);
      if (normalize(va) === '' && normalize(vb) === '') return;
      total++;
      if (areSame(va, vb)) sameCount++;
      else if (areOpposite(va, vb)) oppositeCount++;
    });

    var intro = '';
    if (total === 0) {
      intro = 'Neither of you has answered the questions in this section yet. When you do, this section will suggest how to turn your answers into a shared expectation. There’s no rush—the point is to have a real conversation, not to check every box.';
    } else if (oppositeCount > 0) {
      intro = 'Your answers in ' + sectionLabel.toLowerCase() + ' show some clear differences. That’s normal and workable. Differences are a starting point for conversation, not a failure. The goal is to hear each other and decide what you can realistically expect from this relationship—and what might be met elsewhere or revisited later.';
    } else if (sameCount === total) {
      intro = 'You and ' + labelB + ' are aligned here: you both indicated similar expectations. That’s a strong base. You can still use the notes below to add any specifics or caveats so the agreement feels accurate to you both.';
    } else {
      intro = 'Your answers in ' + sectionLabel.toLowerCase() + ' are partly aligned. Some overlap, some don’t. That’s common. The next step is to name what you each need, listen to what’s underneath the preferences, and decide what you can expect from each other in this relationship.';
    }

    var recommendation = '';
    if (agreementType === 'together') {
      recommendation = 'We recommend stating that you intend to meet these ' + sectionLabel.toLowerCase() + ' needs and expectations together within this relationship. Use the notes below to add any specifics or limits so the draft reflects what you’ve actually agreed.';
    } else if (agreementType === 'elsewhere') {
      recommendation = 'We recommend acknowledging these needs and stating that you’re open to some of them being met in other relationships, with your support for each other. No one partner has to meet every need—that’s part of polyamory. Use the notes below to add any boundaries or specifics you’ve discussed.';
    } else {
      recommendation = 'We recommend keeping this area under ongoing conversation. That doesn’t mean you’ve failed; it means you’re being honest. Try to talk about what’s underneath your answers—what you’re hoping for, what you’re afraid of, what “good” would look like for each of you. You don’t have to agree on everything. Decide one small thing you can expect from each other for now, or agree to revisit in a few weeks or months. Use the notes below to record what you’ve already discussed or decided.';
    }

    return intro + ' ' + recommendation;
  }

  /**
   * Generate prose for one section.
   * Produces contract-ready, narrative text instead of re-listing every answer.
   * notes / discussionOutcome: optional notes or decisions for this section (included in agreement).
   */
  function generateSectionProse(sec, labelA, labelB, answersA, answersB, agreementType, notes, questions, discussionOutcome) {
    var total = 0;
    var aligned = [];
    var complementary = [];
    var opposed = [];

    questions.forEach(function (q) {
      var name = getAnswerKey(q);
      var a = answersA[name];
      var b = answersB[name];
      var va = a && (a.value !== undefined ? a.value : a);
      var vb = b && (b.value !== undefined ? b.value : b);
      var na = normalize(va);
      var nb = normalize(vb);
      if (!na && !nb) return;
      total++;
      if (areSame(va, vb)) {
        aligned.push({ question: q, valueA: na, valueB: nb });
      } else if (areOpposite(va, vb)) {
        opposed.push({ question: q, valueA: na, valueB: nb });
      } else if (na && nb) {
        complementary.push({ question: q, valueA: na, valueB: nb });
      }
    });

    var lines = [];
    lines.push(sec.label + '.');

    if (total === 0) {
      lines.push('At the time of writing, we have not yet defined specific expectations in this area. We agree that this topic matters and will return to it in future conversations as our relationship and needs evolve.');
    } else {
      if (aligned.length) {
        var alignedSentences = aligned.map(function (item) {
          var desc = item.question.text;
          var v = item.valueA || item.valueB;
          return 'on “‘' + desc + '” we are on the same page (for example: “‘' + v + '”').replace(/\s+/g, ' ').trim() + ').';
        });
        lines.push('In this area, we are clearly aligned on several points: ' + alignedSentences.join(' '));
      } else {
        lines.push('In this area, we do not see many perfectly matching answers, which is still workable—our answers are information about what matters to each of us.');
      }

      if (complementary.length) {
        var compSentences = complementary.map(function (item) {
          return 'on “‘' + item.question.text + '” ' + labelA + ' leans toward “‘' + item.valueA + '” while ' + labelB + ' leans toward “‘' + item.valueB + '”; we treat this as a place to experiment and adjust over time.';
        });
        lines.push('We also notice areas where our preferences could complement each other rather than clash: ' + compSentences.join(' '));
      }

      if (opposed.length) {
        var oppSentences = opposed.map(function (item) {
          return 'on “‘' + item.question.text + '” ' + labelA + ' chose “‘' + item.valueA + '” and ' + labelB + ' chose “‘' + item.valueB + '”, which we treat as a real tension rather than something to paper over.';
        });
        lines.push('There are a few places where our answers pull in opposite directions. ' + oppSentences.join(' ') + ' We agree that not every need here has to be met inside this relationship; some may be better supported by other relationships, community, or individual work, while we stay in conversation about what feels safe and sustainable for both of us.');
      }

      if (!aligned.length && !complementary.length && !opposed.length) {
        lines.push('In this area, our answers are mixed. We have taken time to hear the needs and hopes underneath our preferences and to name what feels essential versus what could be flexible for each of us.');
      }
    }

    // State the high-level commitment for this section based on the chosen agreement type.
    lines.push(agreementSentence(agreementType, sec.label));

    // Include any concrete decisions, boundaries, or examples the partners recorded.
    var sectionNote = (notes || '').trim() || (discussionOutcome || '').trim();
    if (sectionNote) {
      lines.push('For this section, we further agree that: ' + sectionNote);
    }

    return lines.join(' ');
  }

  /**
   * Generate the full written agreement (all sections + intro + commitment definitions).
   */
  function generateFullAgreement(names, answers, contract) {
    var labelA = names.A || 'Partner A';
    var labelB = names.B || 'Partner B';
    var bySection = {};
    QUESTIONS.forEach(function (q) {
      if (!bySection[q.section]) bySection[q.section] = [];
      bySection[q.section].push(q);
    });

    var lines = [];
    lines.push('RELATIONSHIP AGREEMENT (DRAFT)');
    lines.push('');
    lines.push('This agreement is between ' + labelA + ' and ' + labelB + '. It reflects our stated needs from the expectations questionnaire and our intentions for how we will meet them. We don’t expect one partner to meet every need—some we’ll fulfill together, some may be met elsewhere, and some we’ll keep talking about. We may update this document by mutual conversation.');
    lines.push('');

    // Values / commitment (Q50) – pull out for a definitions-style paragraph if both answered
    var commitmentA = normalize(answers.A && answers.A.q50);
    var commitmentB = normalize(answers.B && answers.B.q50);
    if (commitmentA || commitmentB) {
      lines.push('Definitions.');
      if (commitmentA) lines.push('For ' + labelA + ', "commitment" in a polyamorous context means: ' + commitmentA);
      if (commitmentB) lines.push('For ' + labelB + ', "commitment" means: ' + commitmentB);
      lines.push('');
    }

    SECTIONS.forEach(function (sec) {
      var questions = bySection[sec.id] || [];
      if (!questions.length) return;
      // Don't repeat Q50 (commitment) in Values section; it's in Definitions above
      if (sec.id === 'values') questions = questions.filter(function (q) { return q.id !== 50; });
      if (!questions.length) return;
      if (!summaryForPartner(answers.A, questions) && !summaryForPartner(answers.B, questions)) return;
      var c = contract[sec.id] || {};
      var agreementType = c.agreement || 'discuss';
      var notes = c.notes || '';
      var discussionOutcome = (c.discussionOutcome || '').trim();
      var prose = generateSectionProse(sec, labelA, labelB, answers.A, answers.B, agreementType, notes, questions, discussionOutcome);
      lines.push(prose);
      lines.push('');
    });

    lines.push('— End of draft. Revise together as needed.');
    return lines.join('\n');
  }

  return {
    getRecommendations: getRecommendations,
    recommendForSection: recommendForSection,
    getRecommendationLongform: getRecommendationLongform,
    generateFullAgreement: generateFullAgreement,
    agreementSentence: agreementSentence,
  };
})();
