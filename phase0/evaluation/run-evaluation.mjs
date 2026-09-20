import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const coreFields = ["event_name", "start_date", "venue", "format"];

function normalize(value) {
  if (value === null || value === undefined) return null;
  return String(value).trim().replace(/\s+/g, " ").toLowerCase();
}

export function validateOutput(result) {
  const errors = [];
  if (!result || typeof result !== "object" || Array.isArray(result)) return ["output_not_object"];
  if (result.schema_version !== "1.0.0") errors.push("schema_version");
  if (!result.source_post_id) errors.push("source_post_id");
  if (!["event", "non_event", "ambiguous"].includes(result.classification)) errors.push("classification");
  if (!Array.isArray(result.candidates)) errors.push("candidates");
  if (!Array.isArray(result.warnings)) errors.push("warnings");
  if (result.classification === "non_event" && result.candidates?.length !== 0) errors.push("non_event_candidates");
  for (const [index, candidate] of (result.candidates ?? []).entries()) {
    if (candidate.candidate_index !== index + 1) errors.push(`candidate_${index + 1}_index`);
    if (!candidate.event_name) errors.push(`candidate_${index + 1}_event_name`);
    if (!Array.isArray(candidate.evidence)) errors.push(`candidate_${index + 1}_evidence`);
    if (!["ready", "review_required", "insufficient_details"].includes(candidate.publication_readiness)) {
      errors.push(`candidate_${index + 1}_publication_readiness`);
    }
  }
  return errors;
}

export function evaluate(goldRows, predictionRows) {
  const predictions = new Map(predictionRows.map((row) => [row.result?.source_post_id, row.result]));
  const details = [];
  let parseSuccess = 0;
  let classificationCorrect = 0;
  let scorableFields = 0;
  let coveredFields = 0;
  let correctFields = 0;
  let multiEventGold = 0;
  let multiEventRecalled = 0;

  for (const gold of goldRows) {
    const prediction = predictions.get(gold.record_id);
    const validationErrors = validateOutput(prediction);
    const failureReasons = [];

    if (validationErrors.length === 0) parseSuccess += 1;
    else failureReasons.push(`schema: ${validationErrors.join(", ")}`);

    const predictedClassification = prediction?.classification ?? null;
    const classCorrect = predictedClassification === gold.classification;
    if (classCorrect) classificationCorrect += 1;
    else failureReasons.push("semantic: classification mismatch");

    const predictedCandidates = Array.isArray(prediction?.candidates) ? prediction.candidates : [];
    if (gold.candidates.length > 1) {
      multiEventGold += gold.candidates.length;
      multiEventRecalled += Math.min(gold.candidates.length, predictedCandidates.length);
    }
    if (predictedCandidates.length !== gold.candidates.length) {
      failureReasons.push(`semantic: expected ${gold.candidates.length} candidate(s), received ${predictedCandidates.length}`);
    }

    for (const [candidateIndex, goldCandidate] of gold.candidates.entries()) {
      const predictedCandidate = predictedCandidates[candidateIndex] ?? {};
      for (const field of coreFields) {
        const goldValue = normalize(goldCandidate[field]);
        if (goldValue === null || goldValue === "unknown") continue;
        scorableFields += 1;
        const predictedValue = normalize(predictedCandidate[field]);
        if (predictedValue !== null && predictedValue !== "unknown") coveredFields += 1;
        if (predictedValue === goldValue) correctFields += 1;
      }
    }

    details.push({
      record_id: gold.record_id,
      valid: validationErrors.length === 0,
      expected_classification: gold.classification,
      predicted_classification: predictedClassification,
      expected_candidate_count: gold.candidates.length,
      predicted_candidate_count: predictedCandidates.length,
      failure_reasons: failureReasons,
    });
  }

  const total = goldRows.length;
  return {
    generated_at: new Date().toISOString(),
    sample_only: true,
    metrics: {
      posts: total,
      schema_parse_rate: total ? parseSuccess / total : null,
      classification_accuracy: total ? classificationCorrect / total : null,
      core_field_coverage: scorableFields ? coveredFields / scorableFields : null,
      core_field_correctness: scorableFields ? correctFields / scorableFields : null,
      multi_event_recall: multiEventGold ? multiEventRecalled / multiEventGold : null,
    },
    details,
  };
}

function pct(value) {
  return value === null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

export function toMarkdown(report) {
  const rows = report.details.map((row) =>
    `| ${row.record_id} | ${row.valid ? "Valid" : "Invalid"} | ${row.expected_classification} | ${row.predicted_classification ?? "missing"} | ${row.expected_candidate_count} | ${row.predicted_candidate_count} | ${row.failure_reasons.join("; ") || "—"} |`
  ).join("\n");
  return `# Phase 0 extraction evaluation\n\n` +
    `**Status:** Runner self-test only; these fixture metrics are not live-model quality evidence.\n\n` +
    `| Metric | Result |\n|---|---:|\n` +
    `| Posts | ${report.metrics.posts} |\n` +
    `| Schema parse rate | ${pct(report.metrics.schema_parse_rate)} |\n` +
    `| Classification accuracy | ${pct(report.metrics.classification_accuracy)} |\n` +
    `| Core-field coverage | ${pct(report.metrics.core_field_coverage)} |\n` +
    `| Core-field correctness | ${pct(report.metrics.core_field_correctness)} |\n` +
    `| Multi-event recall | ${pct(report.metrics.multi_event_recall)} |\n\n` +
    `## Per-post results\n\n` +
    `| Record | Schema | Expected class | Predicted class | Expected events | Predicted events | Failures |\n` +
    `|---|---|---|---|---:|---:|---|\n${rows}\n\n` +
    `The live baseline must use the frozen 50-post corpus, human-validated gold labels, and actual multimodal model responses.\n`;
}

async function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(here, "../..");
  const goldPath = process.argv[2] ?? path.join(root, "phase0/fixtures/gold-evaluation-set.json");
  const predictionsPath = process.argv[3] ?? path.join(root, "phase0/fixtures/event-extraction-results.json");
  const outputDir = process.argv[4] ?? path.join(root, "phase0/artifacts/evaluation");
  const [goldRows, predictionRows] = await Promise.all([
    fs.readFile(goldPath, "utf8").then(JSON.parse),
    fs.readFile(predictionsPath, "utf8").then(JSON.parse),
  ]);
  const report = evaluate(goldRows, predictionRows);
  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(path.join(outputDir, "evaluation-report.json"), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(outputDir, "evaluation-report.md"), toMarkdown(report));
  console.log(JSON.stringify(report.metrics));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
