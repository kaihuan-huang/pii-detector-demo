import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.0";

env.allowLocalModels = false;

const MODEL_ID = "openai/privacy-filter";
const DTYPE = "q4f16";
let classifier = null;

// The pipeline returns words without reliable offsets, so find each word in order in the source text.
function withOffsets(text, raw) {
  const spans = [];
  let cursor = 0;
  for (const r of raw) {
    if (typeof r.start === "number" && typeof r.end === "number" && r.end > r.start) {
      spans.push({ start: r.start, end: r.end, cat: r.entity_group, score: r.score });
      cursor = r.end;
      continue;
    }
    const word = String(r.word || "").trim();
    const at = word ? text.indexOf(word, cursor) : -1;
    if (at < 0) continue;
    spans.push({ start: at, end: at + word.length, cat: r.entity_group, score: r.score });
    cursor = at + word.length;
  }
  return spans;
}

self.addEventListener("message", async ({ data }) => {
  try {
    if (data.type === "load") {
      const files = {};
      classifier = await pipeline("token-classification", MODEL_ID, {
        device: "webgpu",
        dtype: DTYPE,
        progress_callback: (p) => {
          if (p.status !== "progress" || !p.file || !p.total) return;
          files[p.file] = { loaded: p.loaded, total: p.total };
          const all = Object.values(files);
          self.postMessage({
            type: "progress",
            loaded: all.reduce((a, f) => a + f.loaded, 0),
            total: all.reduce((a, f) => a + f.total, 0),
          });
        },
      });
      self.postMessage({ type: "ready" });
    } else if (data.type === "run") {
      const requestsBefore = performance.getEntriesByType("resource").length;
      const t0 = performance.now();
      const raw = await classifier(data.text, { aggregation_strategy: "simple" });
      const ms = performance.now() - t0;
      const requests = performance.getEntriesByType("resource").length - requestsBefore;
      self.postMessage({ type: "result", id: data.id, spans: withOffsets(data.text, raw), ms, requests });
    }
  } catch (err) {
    self.postMessage({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
});
