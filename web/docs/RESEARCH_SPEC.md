# Research Extension Specification

## 1. Purpose

This specification defines how the current web EMR should evolve from a feature-complete prototype into a reusable research platform.

The objective is not to add random product features. The objective is to make future clinical AI research work reproducible, comparable, and safe to run inside the existing application.

---

## 2. Research Goals

1. Enable rapid experimentation with new AI analyzers and prompts.
2. Preserve reproducibility across runs (same input, model version, prompt version, and code version).
3. Capture evaluation data for retrospective analysis.
4. Keep clinicians in the loop for all high-impact actions.
5. Avoid architecture rewrites for each new research idea.

---

## 3. Baseline (Current System)

Current AI-enabled capabilities:

- Smart Clinical Flag Suggestions (`/api/suggest-flags`)
- Acuity Scoring (`/api/acuity-score`)
- Census Insights (`/api/census-insights`)

Current web stack:

- Next.js App Router
- Tremor dashboard components
- TanStack Query
- Tailwind CSS
- json-server backend (dev/prototype)

This baseline should be treated as **Research Baseline v1**.

---

## 4. Extension Model

All future research work should plug into one of three extension surfaces.

### 4.1 Analyzer Extensions

Server-side AI modules that transform patient or cohort data into structured outputs.

Examples:

- Readmission risk scoring
- Deterioration early-warning flags
- Provider workload balancing recommendations

Design rule:

- Every analyzer must expose a clear input schema and output schema.

### 4.2 Data Adapter Extensions

Input layer modules that define what data is made available to an analyzer.

Examples:

- Demographics-only adapter
- Demographics + flags adapter
- Longitudinal timeline adapter

Design rule:

- Adapters must be explicit and versioned so experiments are comparable.

### 4.3 UI Module Extensions

Dashboard or workflow blocks that present analyzer outputs and collect human feedback.

Examples:

- New dashboard insight cards
- Experiment comparison panel
- Clinician feedback controls

Design rule:

- UI modules must not auto-write clinical state without explicit user action.

---

## 5. Experiment Metadata Standard

Each experiment run should persist this metadata:

| Field | Description |
|---|---|
| `experiment_id` | Stable identifier (e.g., `acuity-calibration-v2`) |
| `run_id` | Unique run instance ID |
| `timestamp_utc` | ISO timestamp |
| `analyzer_name` | Analyzer module name |
| `analyzer_version` | Semantic version of analyzer logic |
| `model` | LLM model used |
| `model_provider` | e.g. OpenAI |
| `prompt_version` | Version ID of prompt template |
| `input_adapter` | Adapter used to construct model input |
| `dataset_snapshot` | Reference to data snapshot used |
| `code_commit_sha` | Git commit for full reproducibility |
| `operator` | User or service that initiated run |

Minimum rule: no run is considered valid without these fields.

---

## 6. Evaluation Data Contract

For each AI output unit (suggestion, score, insight), capture:

| Field | Description |
|---|---|
| `experiment_id` | Experiment identifier |
| `run_id` | Run instance |
| `unit_id` | Stable per-output ID |
| `input_hash` | Hash of structured input payload |
| `output_payload` | Raw structured model output |
| `accepted` | Boolean acceptance by clinician |
| `feedback_label` | Optional quality label (useful, incorrect, unclear, etc.) |
| `feedback_note` | Optional free-text feedback |
| `action_time_ms` | Time from render to user action |

This creates a reliable dataset for offline analysis and publication.

---

## 7. Governance and Safety Guardrails

1. Human-in-the-loop mandatory: AI outputs are advisory only.
2. Output validation mandatory: server validates score ranges, required keys, and max lengths.
3. Data minimization mandatory: send only fields required for each analyzer.
4. Prompt/model versioning mandatory: no unversioned prompt in production runs.
5. Auditability mandatory: every accepted AI output must be attributable.

---

## 8. Proposed Repository Structure

```text
web/
  research/
    analyzers/
      acuity/
      census/
    adapters/
      demographics.ts
      demographics_flags.ts
    prompts/
      acuity/
        v1.txt
        v2.txt
      census/
        v1.txt
    schemas/
      analyzer-output.schema.json
      experiment-metadata.schema.json
    evaluations/
      README.md
      samples/
```

Note: this structure is a target for next implementation steps; it does not require immediate migration of existing routes.

---

## 9. Phased Plan

### Phase 1: Reproducibility Foundation

- Add experiment metadata object to all 3 AI routes
- Add prompt version constants in code
- Persist run records to a local log store or JSONL sink

### Phase 2: Evaluation Harness

- Add scripted replay runner for fixed synthetic cohorts
- Compute consistency, latency, and acceptance metrics
- Generate per-experiment summary output

### Phase 3: Extension Toolkit

- Introduce pluggable adapter/analyzer interfaces
- Move prompt templates to versioned files
- Add UI panel to compare analyzer variants

### Phase 4: Research Reporting

- Add report template for method, dataset snapshot, and results
- Add export path for anonymized evaluation datasets

---

## 10. Success Criteria

This platform is research-ready when:

1. Any experiment can be replayed using a recorded metadata bundle.
2. Two analyzer versions can be compared on the same dataset snapshot.
3. Acceptance and feedback metrics are queryable by experiment and prompt version.
4. No AI feature bypasses clinician decision points.

---

## 11. Immediate Next Actions

1. Mark current release as `baseline-v1` in docs and tags.
2. Add `experiment_id`, `run_id`, and `prompt_version` to all existing AI route responses.
3. Add a lightweight JSONL run log writer for all AI endpoints.
4. Add a short `Research Operations` section to deployment docs.
