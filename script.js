/* Assignment Feedback Assistant - RULE-BASED DEMO.
   No AI is used. For each rubric criterion the code counts how many of its
   keywords appear in the student answer, then suggests marks from that count.
   Every mark is a suggestion for the teacher to review. */

// =====================================================================
// PART 1: PURE LOGIC (no page elements, easy to test)
// =====================================================================

const MAX_CRITERIA = 8;

function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// Warns about text that looks like personal information.
function findPersonalInfo(text) {
  const found = [];
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)) found.push("an email address");
  if (/(\+?\d[\s().-]?){10,}/.test(text)) found.push("a phone or ID-like number");
  if (/\b(student\s*(id|number|no)|roll\s*(no|number)|my name is|name\s*:)/i.test(text)) found.push("a name or student ID label");
  return found;
}

// Turns rubric text into criteria. Returns { criteria, errors }.
function parseRubric(text, maxScore) {
  const errors = [];
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return { criteria: [], errors: ["Please enter at least one rubric criterion."] };
  if (lines.length > MAX_CRITERIA) errors.push(`Please use no more than ${MAX_CRITERIA} criteria.`);

  const criteria = lines.slice(0, MAX_CRITERIA).map((line, i) => {
    const parts = line.split("|").map((p) => p.trim());
    const c = { name: parts[0], points: null, keywords: [], keywordsFromName: false };
    let rest = parts.slice(1);
    if (rest.length && /^\d+(\.\d+)?$/.test(rest[0])) c.points = parseFloat(rest.shift());
    if (rest.length) c.keywords = rest.join(",").split(",").map((k) => k.trim().toLowerCase()).filter(Boolean);
    if (!c.name) errors.push(`Line ${i + 1}: the criterion needs a name.`);
    if (c.points !== null && c.points <= 0) errors.push(`Line ${i + 1}: points must be more than 0.`);
    if (c.keywords.length === 0) {
      c.keywords = (c.name || "").toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
      c.keywordsFromName = true;
      if (c.keywords.length === 0) errors.push(`Line ${i + 1}: add keywords after a second "|".`);
    }
    return c;
  });

  const given = criteria.filter((c) => c.points !== null).length;
  if (given > 0 && given < criteria.length) {
    errors.push("Give points for every criterion, or for none.");
  } else if (given === criteria.length && maxScore > 0) {
    const sum = criteria.reduce((a, c) => a + c.points, 0);
    if (Math.abs(sum - maxScore) > 0.01) errors.push(`Rubric points add up to ${sum}, but the maximum score is ${maxScore}.`);
  } else if (given === 0 && maxScore > 0) {
    criteria.forEach((c) => (c.points = Math.round((maxScore / criteria.length) * 100) / 100));
  }
  return { criteria, errors };
}

function splitSentences(text) {
  return text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
}

// Does the keyword appear as the start of a word? ("plant" matches "plants")
function hasKeyword(text, kw) {
  return new RegExp("(^|[^a-z0-9])" + escapeRegExp(kw), "i").test(text);
}

const roundHalf = (n) => Math.round(n * 2) / 2;

function levelFor(coverage) {
  if (coverage >= 0.75) return "Strong keyword evidence";
  if (coverage >= 0.4) return "Partial keyword evidence";
  if (coverage > 0) return "Limited keyword evidence";
  return "No keyword evidence found";
}

// The whole analysis. Every rule used is visible here.
function analyse(answer, criteria) {
  const sentences = splitSentences(answer);
  const words = answer.trim().split(/\s+/).length;

  const results = criteria.map((c) => {
    const found = c.keywords.filter((k) => hasKeyword(answer, k));
    const missing = c.keywords.filter((k) => !found.includes(k));
    const coverage = found.length / c.keywords.length;
    const evidence = [];
    found.forEach((k) => {
      const s = sentences.find((x) => hasKeyword(x, k));
      if (s && !evidence.includes(s) && evidence.length < 3) evidence.push(s.length > 180 ? s.slice(0, 177) + "..." : s);
    });
    const marks = Math.min(c.points, roundHalf(c.points * coverage));
    return { ...c, found, missing, coverage, evidence, marks, level: levelFor(coverage) };
  });

  const checks = {
    words,
    short: words < 30,
    hasExample: /\b(for example|for instance|such as|e\.g\.)/i.test(answer),
    hasReasoning: /\b(because|therefore|as a result|so that|since|this means|which means|due to)\b/i.test(answer)
  };

  const total = results.reduce((a, r) => a + r.marks, 0);

  const strengths = results.filter((r) => r.coverage >= 0.75).map((r) => `"${r.name}": most expected keywords were found (${r.found.length} of ${r.keywords.length}).`);
  if (checks.hasExample) strengths.push("The answer includes an example or illustration phrase (such as \"for example\").");
  if (checks.hasReasoning) strengths.push("The answer uses reasoning words (such as \"because\"), which can signal explanation.");

  const improvements = results.filter((r) => r.coverage < 0.75).map((r) =>
    r.coverage === 0
      ? `"${r.name}": none of the expected keywords were found.`
      : `"${r.name}": these expected keywords were not found: ${r.missing.join(", ")}.`);
  if (checks.short) improvements.push(`The answer is short (${words} words), so there may be little detail.`);
  if (!checks.hasExample) improvements.push("No example or illustration phrase was detected.");
  if (!checks.hasReasoning) improvements.push("No reasoning words (such as \"because\") were detected.");

  const revisions = results.filter((r) => r.coverage < 0.75).map((r) =>
    `Revisit "${r.name}": check whether the answer covers ${r.missing.map((m) => `"${m}"`).join(", ")} (or equivalent ideas in other words).`);
  if (!checks.hasReasoning) revisions.push("Explain why, not just what, for example by linking ideas with \"because\" or \"this means\".");
  if (!checks.hasExample) revisions.push("Add a specific example to support the main points.");
  if (checks.short) revisions.push("Expand the answer with more detail for each rubric criterion.");

  return { results, checks, total, strengths, improvements, revisions };
}

// =====================================================================
// PART 2: PAGE (form, validation, report display)
// =====================================================================
// -- DOM --
if (typeof document !== "undefined") {
  const $ = (id) => document.getElementById(id);
  const FIELDS = ["question", "rubric", "maxscore", "answer", "confirm"];
  const form = $("feedback-form"), report = $("report"), printBtn = $("print-btn");

  function h(tag, text, cls) {
    const e = document.createElement(tag);
    if (text) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  function list(items) {
    const ul = h("ul");
    items.forEach((i) => ul.appendChild(h("li", i)));
    return ul;
  }
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  function showErrors(errors) {
    FIELDS.forEach((f) => {
      const msg = $(f + "-error"), input = $(f);
      if (errors[f]) {
        msg.textContent = errors[f]; msg.hidden = false;
        input.setAttribute("aria-invalid", "true");
      } else {
        msg.hidden = true; msg.textContent = "";
        input.removeAttribute("aria-invalid");
      }
    });
  }

  function validate() {
    const errors = {};
    const question = $("question").value.trim();
    const rubric = $("rubric").value;
    const maxScore = parseFloat($("maxscore").value);
    const answer = $("answer").value.trim();

    if (question.length < 5) errors.question = "Please enter the assignment question (at least 5 characters).";
    if (!(maxScore >= 1 && maxScore <= 1000)) errors.maxscore = "Please enter a maximum score between 1 and 1000.";
    if (answer.split(/\s+/).filter(Boolean).length < 5) errors.answer = "Please enter a sample answer of at least 5 words.";

    const parsed = parseRubric(rubric, maxScore >= 1 ? maxScore : 0);
    if (parsed.errors.length) errors.rubric = parsed.errors.join(" ");

    const pii = findPersonalInfo([question, rubric, answer].join("\n"));
    if (pii.length) errors.answer = (errors.answer ? errors.answer + " " : "") + `Possible personal information detected (${pii.join(", ")}). Please remove it.`;
    if (!$("confirm").checked) errors.confirm = "Please confirm that no identifiable student information is included.";

    return { errors, parsed, maxScore, question, answer };
  }

  function criterionCard(r) {
    const card = h("article", null, "crit");
    const top = h("div", null, "crit-top");
    top.appendChild(h("h4", r.name));
    top.appendChild(h("span", `Suggested: ${fmt(r.marks)} / ${fmt(r.points)}`, "marks"));
    card.appendChild(top);
    card.appendChild(h("p", r.level + (r.keywordsFromName ? " (keywords taken from the criterion name)" : ""), "level"));
    card.appendChild(h("p", `Keywords found: ${r.found.length ? r.found.join(", ") : "none"}`, "small"));
    if (r.missing.length) card.appendChild(h("p", `Keywords not found: ${r.missing.join(", ")}`, "small"));
    card.appendChild(h("p", "Evidence found in the answer:", "small strong"));
    card.appendChild(r.evidence.length ? list(r.evidence) : h("p", "No matching sentences.", "small"));
    return card;
  }

  function section(title, node) {
    const s = h("section", null, "block");
    s.appendChild(h("h3", title));
    s.appendChild(node);
    return s;
  }

  function render(data, a) {
    report.innerHTML = "";
    report.appendChild(h("h2", "Feedback report"));
    report.appendChild(h("p", "All marks below are suggestions generated by simple keyword rules and require teacher review before use. This report may contain student work: store and share it securely.", "banner demo"));
    report.appendChild(h("p", `Question: ${data.question}`, "meta"));

    const total = h("p", `Suggested total: ${fmt(a.total)} / ${fmt(data.maxScore)} (suggestion only, requires teacher review)`, "total");
    report.appendChild(total);

    const wrap = h("div");
    a.results.forEach((r) => wrap.appendChild(criterionCard(r)));
    report.appendChild(section("Rubric criteria, evidence and suggested marks", wrap));

    report.appendChild(section("Strengths", a.strengths.length ? list(a.strengths) : h("p", "No strengths were detected by the keyword rules. Review the answer yourself.")));
    report.appendChild(section("Areas for improvement", a.improvements.length ? list(a.improvements) : h("p", "No gaps were detected by the keyword rules.")));
    report.appendChild(section("Suggestions for revision", a.revisions.length ? list(a.revisions) : h("p", "No revision prompts were generated. Review the answer yourself.")));

    const how = h("div");
    how.appendChild(list([
      "For each criterion, the tool checks which of its keywords appear in the answer (matching the start of words, ignoring capitals).",
      "Suggested marks = criterion points x (keywords found / keywords listed), rounded to the nearest 0.5.",
      "Evidence is the first sentence that contains each found keyword.",
      "General checks (length, example phrases, reasoning words) only affect the comments, not the marks.",
      `The answer has ${a.checks.words} words.`,
      "Limits: it cannot tell whether a statement is correct, understand synonyms, or spot copied or keyword-stuffed text. A high or low suggestion can be wrong."
    ]));
    report.appendChild(section("How these suggestions were produced", how));

    report.hidden = false;
    printBtn.disabled = false;
    report.focus();
    report.scrollIntoView({ behavior: "smooth" });
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const data = validate();
    showErrors(data.errors);
    const bad = FIELDS.find((f) => data.errors[f]);
    if (bad) { $(bad).focus(); return; }
    render(data, analyse(data.answer, data.parsed.criteria));
  });

  printBtn.addEventListener("click", () => window.print());

  $("reset-btn").addEventListener("click", () => {
    form.reset();
    showErrors({});
    report.innerHTML = "";
    report.hidden = true;
    printBtn.disabled = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
    $("question").focus();
  });

  $("example-btn").addEventListener("click", () => {
    $("question").value = "Explain how machine learning differs from traditional programming.";
    $("rubric").value = [
      "Defines machine learning | 3 | learn, data, patterns",
      "Compares with traditional programming | 3 | rules, programmer, explicit",
      "Gives an example | 2 | example, spam, recommendation",
      "Explains clearly | 2 | because, whereas, therefore"
    ].join("\n");
    $("maxscore").value = "10";
    $("answer").value = "Machine learning lets a computer learn from data instead of following fixed steps. In traditional programming, a programmer writes explicit rules. For example, a spam filter can learn patterns from many emails.";
    $("confirm").checked = true;
    showErrors({});
  });
}
