(function (root) {
  "use strict";

  const LABELS = { payment_card: "Card", email: "Email", phone: "Phone", secret: "API key" };

  function luhn(digits) {
    let sum = 0;
    [...digits].reverse().forEach((c, i) => {
      let n = Number(c);
      if (i % 2) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
    });
    return sum % 10 === 0;
  }

  // Boundary-safe edges: \b misfires next to non-Latin text, so only ASCII letters/digits count as neighbours.
  const L = "(?<![0-9A-Za-z])";
  const R = "(?![0-9A-Za-z])";

  const RULES = [
    ["payment_card", new RegExp(`${L}(?:\\d[ -]?){12,18}\\d${R}`, "g"),
      (m) => { const d = m.replace(/\D/g, ""); return d.length >= 13 && luhn(d); }],
    ["phone", new RegExp(`\\+\\d{1,3}[ -]\\d{3}[ -]\\d{3}[ -]\\d{4}${R}`, "g")],
    ["phone", new RegExp(`${L}\\(\\d{3}\\) ?\\d{3}-\\d{4}${R}`, "g")],
    ["email", new RegExp(`(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}`, "g")],
    ["secret", new RegExp(`${L}(?:sk|ghp|AKIA)[-_A-Za-z0-9]{16,}`, "g")],
  ];

  function detect(text) {
    const spans = [];
    for (const [cat, re, check] of RULES) {
      for (const m of text.matchAll(re)) {
        if (check && !check(m[0])) continue;
        spans.push({ start: m.index, end: m.index + m[0].length, cat, verified: Boolean(check) });
      }
    }
    // Check-digit-verified matches win any overlap.
    spans.sort((a, b) => (b.verified - a.verified) || (a.start - b.start));
    const kept = [];
    for (const s of spans) if (!kept.some((k) => s.start < k.end && k.start < s.end)) kept.push(s);
    return kept.sort((a, b) => a.start - b.start);
  }

  function mask(text, spans) {
    const seen = new Map();
    const counts = {};
    let out = "";
    let cursor = 0;
    for (const s of spans) {
      const value = text.slice(s.start, s.end);
      const key = `${s.cat}\u0000${value}`;
      if (!seen.has(key)) {
        counts[s.cat] = (counts[s.cat] || 0) + 1;
        seen.set(key, `[${LABELS[s.cat]} ${counts[s.cat]}]`);
      }
      out += text.slice(cursor, s.start) + seen.get(key);
      cursor = s.end;
    }
    return out + text.slice(cursor);
  }

  root.PiiDemo = { detect, mask, LABELS };
})(typeof window !== "undefined" ? window : globalThis);
