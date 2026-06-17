/**
 * EAS-7 Election Assurance Standard — readiness quiz.
 *
 * Each question maps to one of the seven EAS-7 control areas. Every option carries
 * a point value from 0 (failing) to 3 (fully meeting the control). The final score
 * is the percentage of points earned across all questions, with a per-area breakdown.
 *
 * This module has no external dependencies and mounts itself onto an element with
 * id "eas7-quiz". It fails loudly (throws) if its data or mount point is malformed.
 */
(function () {
  "use strict";

  var MAX_POINTS_PER_QUESTION = 3;

  /**
   * The seven EAS-7 control areas, in order.
   * @type {{id: string, number: number, name: string}[]}
   */
  var CONTROL_AREAS = [
    { id: "eligibility", number: 1, name: "Eligibility Assurance" },
    { id: "secrecy", number: 2, name: "Ballot Secrecy" },
    { id: "duplicate", number: 3, name: "Duplicate Prevention" },
    { id: "audit", number: 4, name: "Audit Trail" },
    { id: "turnout", number: 5, name: "Turnout Visibility" },
    { id: "proxy", number: 6, name: "Proxy & Submission Control" },
    { id: "defensibility", number: 7, name: "Result Defensibility" },
  ];

  /**
   * Quiz questions. Two per control area. Options are graded 0..3.
   * @type {{id: string, area: string, prompt: string, options: {label: string, points: number}[]}[]}
   */
  var QUESTIONS = [
    {
      id: "eligibility-1",
      area: "eligibility",
      prompt: "How is your list of eligible voters determined?",
      options: [
        { label: "We email whoever is on the community contact or resident list.", points: 0 },
        { label: "We let people confirm they are an owner when they open the ballot.", points: 0 },
        { label: "We export current residents from our management portal as-is.", points: 1 },
        { label: "We build a roster from ownership records tied to a fixed record date, applying delinquency and one-vote-per-unit rules from our bylaws.", points: 3 },
      ],
    },
    {
      id: "eligibility-2",
      area: "eligibility",
      prompt: "How does an eligible voter actually get to their ballot?",
      options: [
        { label: "One shared link or code posted in the newsletter or portal.", points: 0 },
        { label: "A link anyone can use to vote once per device.", points: 0 },
        { label: "A link emailed to our address list that can be forwarded.", points: 1 },
        { label: "A unique credential bound to each voter on the eligible roster.", points: 3 },
      ],
    },
    {
      id: "secrecy-1",
      area: "secrecy",
      prompt: "Can anyone running the election see how a specific owner voted?",
      options: [
        { label: "Yes — results are a spreadsheet of names next to their choices.", points: 0 },
        { label: "Yes, but only the election committee can look.", points: 0 },
        { label: "We are honestly not sure.", points: 1 },
        { label: "No — voter identity and ballot selections are stored separately and cannot be re-joined by anyone, including admins.", points: 3 },
      ],
    },
    {
      id: "secrecy-2",
      area: "secrecy",
      prompt: "How do you confirm that a specific owner participated?",
      options: [
        { label: "By finding their ballot and looking at what they chose.", points: 0 },
        { label: "We ask them whether they voted.", points: 0 },
        { label: "We cannot confirm individual participation at all.", points: 1 },
        { label: "A participation record shows they voted, with no link to their selections.", points: 3 },
      ],
    },
    {
      id: "duplicate-1",
      area: "duplicate",
      prompt: "A voter submits online and also mails in a paper ballot. What happens?",
      options: [
        { label: "Both get counted.", points: 0 },
        { label: "We catch it at the end and pick one by hand.", points: 1 },
        { label: "We only offer one channel, so it cannot happen.", points: 2 },
        { label: "Channels reconcile to one voter identity and a stated rule decides which counts, enforced before the tally.", points: 3 },
      ],
    },
    {
      id: "duplicate-2",
      area: "duplicate",
      prompt: "What stops a single voter from casting two ballots online?",
      options: [
        { label: "Nothing — we trust people not to.", points: 0 },
        { label: "We try to de-duplicate by name afterward.", points: 1 },
        { label: "We limit submissions by IP address or device.", points: 1 },
        { label: "The system locks the voter after one valid ballot, or supersedes earlier ones per a defined rule.", points: 3 },
      ],
    },
    {
      id: "audit-1",
      area: "audit",
      prompt: "If the result is challenged, can you reconstruct setup, voter access, reminders, and changes?",
      options: [
        { label: "No — we keep the final count and trust it.", points: 0 },
        { label: "Only some emails scattered across inboxes.", points: 1 },
        { label: "We have the final results spreadsheet and our notes.", points: 1 },
        { label: "Yes — a timestamped, attributable, append-only log of the full lifecycle that we can export.", points: 3 },
      ],
    },
    {
      id: "audit-2",
      area: "audit",
      prompt: "Can an administrator change the election record after the fact?",
      options: [
        { label: "Yes, freely — it is just our working file.", points: 0 },
        { label: "Yes, but we would mention it somewhere.", points: 1 },
        { label: "We are not sure what is editable.", points: 1 },
        { label: "No — changes are logged as new entries, never overwriting history.", points: 3 },
      ],
    },
    {
      id: "turnout-1",
      area: "turnout",
      prompt: "How does the board watch turnout while voting is open?",
      options: [
        { label: "Someone peeks at incoming ballots, including the choices.", points: 0 },
        { label: "We estimate it from replies and word of mouth.", points: 0 },
        { label: "We do not track it until voting closes.", points: 1 },
        { label: "Live counts and percentages against the eligible roster, with all selections sealed.", points: 3 },
      ],
    },
    {
      id: "turnout-2",
      area: "turnout",
      prompt: "How do you know whether you will reach quorum before the deadline?",
      options: [
        { label: "We find out at the meeting.", points: 0 },
        { label: "We guess based on past years.", points: 0 },
        { label: "We just extend voting automatically to be safe.", points: 1 },
        { label: "Real-time participation against the quorum threshold is visible without exposing any votes.", points: 3 },
      ],
    },
    {
      id: "proxy-1",
      area: "proxy",
      prompt: "How are proxies handled (assuming your bylaws allow them)?",
      options: [
        { label: "Verbally or by text, not formally recorded.", points: 0 },
        { label: "Our bylaws allow them but we just ignore proxies.", points: 0 },
        { label: "On paper forms collected in a folder.", points: 1 },
        { label: "Captured with grantor, grantee, scope, and date — reviewable as a complete set.", points: 3 },
      ],
    },
    {
      id: "proxy-2",
      area: "proxy",
      prompt: "How are write-ins and challenged ballots handled?",
      options: [
        { label: "They are ignored or quietly discarded.", points: 0 },
        { label: "We don't allow write-ins, even where they apply.", points: 1 },
        { label: "Noted informally by whoever is running things.", points: 1 },
        { label: "Write-ins captured verbatim; challenged ballots flagged with reason and resolution, all reviewable.", points: 3 },
      ],
    },
    {
      id: "defensibility-1",
      area: "defensibility",
      prompt: "When an owner asks \"how do we know this result is right?\", what can you produce?",
      options: [
        { label: "Essentially \"the system said so.\"", points: 0 },
        { label: "We refer them to the board.", points: 0 },
        { label: "The final tally and nothing else.", points: 1 },
        { label: "A certification package: eligibility basis, turnout, tally method, edge-case handling, and a pointer to the audit trail.", points: 3 },
      ],
    },
    {
      id: "defensibility-2",
      area: "defensibility",
      prompt: "Is your counting method (plurality, cumulative, ranked, etc.) defined and matched to your bylaws before voting opens?",
      options: [
        { label: "We count in whatever way seems fair afterward.", points: 0 },
        { label: "We are not sure what our bylaws actually require.", points: 0 },
        { label: "We use whatever the tool defaults to.", points: 1 },
        { label: "The method is defined up front to match our governing documents and is documented in the result.", points: 3 },
      ],
    },
  ];

  var RESULT_TIERS = [
    {
      min: 85,
      label: "Election-ready",
      summary:
        "Your process is private, auditable, traceable, and defensible. You can answer all seven EAS-7 questions with evidence, not assurances. Lock in the controls you have and keep the audit trail intact through certification.",
    },
    {
      min: 65,
      label: "Mostly ready — close the gaps",
      summary:
        "The backbone is solid, but at least one control area has soft spots that a determined challenger could exploit. Fix the areas below before invitations go out, not after the result is disputed.",
    },
    {
      min: 40,
      label: "Significant risk",
      summary:
        "Several controls are missing or informal. As it stands, the result would be hard to defend at a contested annual meeting. Treat the low-scoring areas below as launch blockers.",
    },
    {
      min: 0,
      label: "Not ready — high dispute risk",
      summary:
        "The process does not yet meet the basics of a defensible election. Most of EAS-7 is unaddressed. Re-platform onto a purpose-built tool and rebuild the process around the seven controls before you collect a single ballot.",
    },
  ];

  function getControlArea(areaId) {
    for (var i = 0; i < CONTROL_AREAS.length; i++) {
      if (CONTROL_AREAS[i].id === areaId) return CONTROL_AREAS[i];
    }
    throw new Error('EAS-7 quiz: unknown control area "' + areaId + '"');
  }

  function validateData() {
    QUESTIONS.forEach(function (q) {
      getControlArea(q.area); // throws if area is unknown
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new Error('EAS-7 quiz: question "' + q.id + '" must have at least two options');
      }
      var hasFull = q.options.some(function (o) {
        return o.points === MAX_POINTS_PER_QUESTION;
      });
      if (!hasFull) {
        throw new Error('EAS-7 quiz: question "' + q.id + '" has no full-credit option');
      }
      q.options.forEach(function (o) {
        if (typeof o.points !== "number" || o.points < 0 || o.points > MAX_POINTS_PER_QUESTION) {
          throw new Error('EAS-7 quiz: invalid points on question "' + q.id + '"');
        }
      });
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderQuestion(question, index) {
    var area = getControlArea(question.area);
    var optionsHtml = question.options
      .map(function (option, optionIndex) {
        var inputId = question.id + "-opt-" + optionIndex;
        return (
          '<label class="eas7-option" for="' + inputId + '">' +
          '<input type="radio" id="' + inputId + '" name="' + question.id + '" value="' + optionIndex + '">' +
          '<span class="eas7-option-text">' + escapeHtml(option.label) + "</span>" +
          "</label>"
        );
      })
      .join("");

    return (
      '<fieldset class="eas7-question" data-question-id="' + question.id + '">' +
      '<legend class="eas7-question-legend">' +
      '<span class="eas7-question-index">Q' + (index + 1) + "</span>" +
      '<span class="eas7-question-area">' + area.number + ". " + escapeHtml(area.name) + "</span>" +
      "</legend>" +
      '<p class="eas7-question-prompt">' + escapeHtml(question.prompt) + "</p>" +
      '<div class="eas7-options">' + optionsHtml + "</div>" +
      "</fieldset>"
    );
  }

  function collectAnswers(form) {
    var answers = {};
    var unanswered = [];
    QUESTIONS.forEach(function (question) {
      var selected = form.querySelector('input[name="' + question.id + '"]:checked');
      if (!selected) {
        unanswered.push(question.id);
        return;
      }
      var optionIndex = Number(selected.value);
      var option = question.options[optionIndex];
      if (!option) {
        throw new Error('EAS-7 quiz: invalid selection for "' + question.id + '"');
      }
      answers[question.id] = { optionIndex: optionIndex, points: option.points };
    });
    return { answers: answers, unanswered: unanswered };
  }

  function score(answers) {
    var areaTotals = {};
    CONTROL_AREAS.forEach(function (area) {
      areaTotals[area.id] = { earned: 0, possible: 0 };
    });

    var earned = 0;
    var possible = 0;
    QUESTIONS.forEach(function (question) {
      possible += MAX_POINTS_PER_QUESTION;
      areaTotals[question.area].possible += MAX_POINTS_PER_QUESTION;
      var answer = answers[question.id];
      if (answer) {
        earned += answer.points;
        areaTotals[question.area].earned += answer.points;
      }
    });

    var percent = possible > 0 ? Math.round((earned / possible) * 100) : 0;
    var areas = CONTROL_AREAS.map(function (area) {
      var totals = areaTotals[area.id];
      var areaPercent = totals.possible > 0 ? Math.round((totals.earned / totals.possible) * 100) : 0;
      var status = areaPercent >= 80 ? "strong" : areaPercent >= 50 ? "partial" : "gap";
      return {
        id: area.id,
        number: area.number,
        name: area.name,
        earned: totals.earned,
        possible: totals.possible,
        percent: areaPercent,
        status: status,
      };
    });

    return { earned: earned, possible: possible, percent: percent, areas: areas };
  }

  function getTier(percent) {
    for (var i = 0; i < RESULT_TIERS.length; i++) {
      if (percent >= RESULT_TIERS[i].min) return RESULT_TIERS[i];
    }
    return RESULT_TIERS[RESULT_TIERS.length - 1];
  }

  var STATUS_LABEL = { strong: "Strong", partial: "Partial", gap: "Gap" };

  function renderResults(result) {
    var tier = getTier(result.percent);
    var areasHtml = result.areas
      .map(function (area) {
        return (
          '<li class="eas7-area eas7-area-' + area.status + '">' +
          '<div class="eas7-area-head">' +
          '<span class="eas7-area-name">' + area.number + ". " + escapeHtml(area.name) + "</span>" +
          '<span class="eas7-area-status">' + STATUS_LABEL[area.status] + " · " + area.percent + "%</span>" +
          "</div>" +
          '<div class="eas7-area-bar"><span style="width:' + area.percent + '%"></span></div>' +
          "</li>"
        );
      })
      .join("");

    return (
      '<div class="eas7-results" tabindex="-1">' +
      '<div class="eas7-score-card eas7-score-' + tier.label.toLowerCase().replace(/[^a-z]+/g, "-") + '">' +
      '<div class="eas7-score-number">' + result.percent + "%</div>" +
      '<div class="eas7-score-meta">' +
      '<h3 class="eas7-score-label">' + escapeHtml(tier.label) + "</h3>" +
      '<p class="eas7-score-points">' + result.earned + " of " + result.possible + " readiness points</p>" +
      "</div>" +
      "</div>" +
      '<p class="eas7-score-summary">' + escapeHtml(tier.summary) + "</p>" +
      '<h3 class="eas7-breakdown-title">Control-area breakdown</h3>' +
      '<ul class="eas7-areas">' + areasHtml + "</ul>" +
      '<div class="eas7-results-actions">' +
      '<button type="button" class="btn btn-ghost" data-eas7-retake>Retake the assessment</button>' +
      '<a class="btn btn-primary" href="https://lawpilot.cloud/voting?utm_source=passr&utm_medium=quiz" target="_blank" rel="noopener noreferrer">See a platform built for EAS-7</a>' +
      "</div>" +
      '<p class="eas7-results-footnote">EAS-7 is a readiness framework, not a certification. Re-run it during setup and again at certification, and keep the evidence behind each control. Read the full guide on <a href="/article/eas-7-election-assurance-standard">the Election Assurance Standard</a>.</p>' +
      "</div>"
    );
  }

  function mount() {
    var root = document.getElementById("eas7-quiz");
    if (!root) {
      throw new Error('EAS-7 quiz: mount element "#eas7-quiz" not found');
    }
    validateData();

    var questionsHtml = QUESTIONS.map(renderQuestion).join("");
    root.innerHTML =
      '<form class="eas7-form" novalidate>' +
      '<div class="eas7-progress" aria-hidden="true"><span class="eas7-progress-bar"></span></div>' +
      '<p class="eas7-intro">Answer all ' + QUESTIONS.length + " questions about how your next election is actually run. Your score is private — nothing is sent anywhere.</p>" +
      questionsHtml +
      '<p class="eas7-form-error" role="alert" hidden></p>' +
      '<div class="eas7-submit-row">' +
      '<button type="submit" class="btn btn-primary">Score my election</button>' +
      "</div>" +
      "</form>";

    var form = root.querySelector(".eas7-form");
    var errorEl = root.querySelector(".eas7-form-error");
    var progressBar = root.querySelector(".eas7-progress-bar");

    function updateProgress() {
      var answered = QUESTIONS.filter(function (q) {
        return form.querySelector('input[name="' + q.id + '"]:checked');
      }).length;
      var pct = Math.round((answered / QUESTIONS.length) * 100);
      progressBar.style.width = pct + "%";
    }

    form.addEventListener("change", function (event) {
      if (event.target && event.target.matches('input[type="radio"]')) {
        var fieldset = event.target.closest(".eas7-question");
        if (fieldset) fieldset.classList.remove("eas7-question-missing");
        updateProgress();
      }
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var collected = collectAnswers(form);

      if (collected.unanswered.length > 0) {
        QUESTIONS.forEach(function (q) {
          var fieldset = form.querySelector('[data-question-id="' + q.id + '"]');
          if (!fieldset) return;
          if (collected.unanswered.indexOf(q.id) !== -1) {
            fieldset.classList.add("eas7-question-missing");
          }
        });
        errorEl.textContent =
          "Please answer the remaining " +
          collected.unanswered.length +
          (collected.unanswered.length === 1 ? " question" : " questions") +
          " before scoring.";
        errorEl.hidden = false;
        var firstMissing = form.querySelector('[data-question-id="' + collected.unanswered[0] + '"]');
        if (firstMissing && typeof firstMissing.scrollIntoView === "function") {
          firstMissing.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      errorEl.hidden = true;
      var result = score(collected.answers);
      root.innerHTML = renderResults(result);

      var resultsEl = root.querySelector(".eas7-results");
      if (resultsEl) {
        resultsEl.focus();
        if (typeof resultsEl.scrollIntoView === "function") {
          resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }

      var retake = root.querySelector("[data-eas7-retake]");
      if (retake) {
        retake.addEventListener("click", function () {
          mount();
          if (typeof root.scrollIntoView === "function") {
            root.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }
    });

    updateProgress();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
