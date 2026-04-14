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
6. Protected-attribute controls mandatory: ethnicity, ancestry, language, and related demographic variables may be used only in explicitly approved research protocols and must never be used for silent automated decisioning.

---

## 8. Priority Research Track: South Asian Early Diabetes Risk

One strong early research extension is a subgroup-sensitive diabetes risk workflow focused on South Asian populations.

### 8.1 Why this is a strong research target

The literature consistently reports that South Asian populations have:

- Higher type 2 diabetes prevalence
- Earlier disease onset
- Higher insulin resistance at lower BMI
- Greater visceral adiposity and central obesity despite lower overall BMI
- Faster progression from prediabetes to diabetes in some cohorts

This makes the problem well-suited for a research analyzer that tests whether standard screening thresholds underperform for this subgroup.

### 8.2 Regional burden context

The South-East Asia regional burden reinforces why this track is worth prioritizing.

Key IDF Atlas figures for the South-East Asia region:

- 106.9 million adults aged 20–79 were estimated to be living with diabetes in 2024
- 184.5 million adults are projected by 2050, a 73% increase
- Regional diabetes prevalence is projected to reach 13.2% by 2050
- 42.7% of diabetes cases are undiagnosed, one of the highest proportions globally
- 27.8% of pregnancies are affected by hyperglycaemia, the highest proportion among IDF regions
- The region accounts for 18.2% of people with diabetes worldwide but only 1% of global diabetes-related health expenditure

Research implication:

- earlier identification matters
- underdiagnosis is itself a research target
- subgroup-sensitive screening may have more value in low-detection settings than in already well-screened populations
- pregnancy-related and intergenerational risk should remain in scope for future extension work

### 8.3 Research question

Can the platform support a subgroup-aware screening analyzer that identifies elevated diabetes risk in South Asian patients earlier than standard age and BMI thresholds, while preserving fairness, auditability, and clinician oversight?

### 8.4 Candidate hypotheses

1. A South Asian-specific analyzer will flag elevated diabetes risk earlier than a generic rule-based screening baseline.
2. Waist-centric and metabolic-risk features may be more informative than BMI alone for this subgroup.
3. A tailored analyzer may improve clinician acceptance if outputs are concise, transparent, and framed as screening prompts rather than diagnoses.
4. Measures related to beta-cell dysfunction, glycemia, liver fat, and central adiposity may outperform BMI-only screening logic in this subgroup.

### 8.5 Candidate analyzer outputs

Example structured outputs for this track:

| Output | Description |
|---|---|
| `screening_prompt` | Suggest HbA1c / fasting glucose screening earlier than default threshold |
| `risk_rationale` | Explain the subgroup-specific pattern in one sentence |
| `risk_band` | Low / Moderate / High research risk tier |
| `follow_up_recommendation` | Suggest follow-up screening interval or counseling prompt |

### 8.6 Candidate input adapters

This track should not start with ethnicity alone. It should use explicit, versioned adapters such as:

| Adapter | Included fields |
|---|---|
| `demographics_bmi_v1` | age, sex, BMI, ancestry/ethnicity, family history |
| `central_adiposity_v1` | waist circumference, waist-height ratio, BMI, age |
| `metabolic_screen_v1` | HbA1c, fasting glucose, triglycerides, HDL, blood pressure |
| `lifestyle_context_v1` | physical activity, diet pattern, sleep, smoking |
| `body_composition_v1` | liver fat proxy, lean mass proxy, visceral adiposity proxy, BMI |
| `social_context_v1` | household structure, family support, exercise partner context, acculturation profile |

### 8.7 Research constraints

- This must be a screening-support workflow, not a diagnostic workflow.
- Any ethnicity-aware logic must remain visible to the clinician and explicitly documented in the rationale.
- Outputs must be benchmarked against a non-ethnicity-aware baseline.
- Model performance must be evaluated separately for false positives, false negatives, and clinician acceptance.
- Regional burden statistics should justify study prioritization, not override patient-level evidence.
- Broad labels such as "Asian" must not be used as a substitute for subgroup-specific data; South Asian subgroup disaggregation is part of the research requirement.

### 8.8 Suggested first experiment

`experiment_id`: `south-asian-diabetes-screening-v1`

First pass:

1. Use synthetic or de-identified cohort samples.
2. Compare generic screening prompts vs subgroup-aware prompts.
3. Capture whether clinicians judge the subgroup-aware prompts as earlier, clearer, or more useful.
4. Log prompt version, model version, and dataset snapshot for every run.

### 8.9 MASALA-informed feature priorities

The MASALA literature suggests this track should go beyond a simple ethnicity-plus-BMI heuristic.

Priority feature families:

- glycemia across the spectrum, not only diagnosed diabetes
- beta-cell dysfunction proxies where available
- central adiposity and liver fat proxies rather than BMI alone
- severe hyperglycemia subtype indicators
- cardiometabolic comorbidity context, especially ASCVD risk
- modifiable behavior context such as diet quality, sedentary time, and physical activity
- interpersonal context such as family/social network support for behavior change

This also supports a broader design principle for the platform: research analyzers should be able to combine biologic, behavioral, and social-context variables rather than only static demographics.

### 8.10 Literature direction captured for this spec

The initial rationale for this track is based on repeated findings that South Asian populations may develop type 2 diabetes at younger ages and lower BMI, with higher insulin resistance, central adiposity, and beta-cell dysfunction relative to many comparator groups. This should be treated as a research hypothesis driver for analyzer design and evaluation, not as a shortcut for automated patient-level conclusions.

The regional burden framing in this spec also incorporates IDF South-East Asia Atlas data showing rapid growth, high underdiagnosis, and substantial mismatch between disease burden and expenditure. That context supports the importance of earlier, more tailored screening research while still requiring strict validation at the patient level.

Recent longitudinal MASALA findings further strengthen this track by showing higher diabetes prevalence and incidence, lower insulin secretion, greater insulin resistance, more adverse body composition, and a higher proportion of severe hyperglycemia subtype among South Asians than comparator U.S. groups. The paper also points toward multilevel modifiable factors including diet quality, exercise, sedentary behavior, social networks, acculturation, neighborhood context, and environmental exposures. Those findings support a research design that is explicitly multilevel rather than purely phenotype-based.

---

## 9. Proposed Repository Structure

```text
web/
  research/
    analyzers/
      acuity/
      census/
      diabetes-risk/
    adapters/
      demographics.ts
      demographics_flags.ts
      metabolic_screen.ts
    prompts/
      acuity/
        v1.txt
        v2.txt
      census/
        v1.txt
      diabetes-risk/
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

## 10. Phased Plan

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

## 11. Success Criteria

This platform is research-ready when:

1. Any experiment can be replayed using a recorded metadata bundle.
2. Two analyzer versions can be compared on the same dataset snapshot.
3. Acceptance and feedback metrics are queryable by experiment and prompt version.
4. No AI feature bypasses clinician decision points.

---

## 12. Immediate Next Actions

1. Mark current release as `baseline-v1` in docs and tags.
2. Add `experiment_id`, `run_id`, and `prompt_version` to all existing AI route responses.
3. Add a lightweight JSONL run log writer for all AI endpoints.
4. Add a short `Research Operations` section to deployment docs.
5. Define a first synthetic cohort for `south-asian-diabetes-screening-v1`.

---

## 13. Source Notes

- IDF Diabetes Atlas, South-East Asia regional page: burden, projected growth, underdiagnosis, and pregnancy hyperglycaemia context.
- Kanaya AM. Diabetes in South Asians: Uncovering Novel Risk Factors With Longitudinal Epidemiologic Data. Diabetes Care 2024;47(1):7-16. DOI: 10.2337/dci23-0068.

---

## 14. Proposal: Small-Step Research Extension Plan

This proposal defines how to advance the application in tightly scoped, research-oriented increments.

### 14.1 Proposal objective

Transform the current AI-enabled EMR into a reproducible clinical research platform without major product rewrites.

### 14.2 Scope boundaries

- In scope: reproducibility infrastructure, experiment governance, evaluation workflows, and subgroup-sensitive screening research support.
- Out of scope: autonomous diagnosis, treatment recommendation automation, and unreviewed direct write-back of AI outputs.

### 14.3 Operating principle

Each cycle changes one variable only (prompt, adapter, threshold, or analyzer logic), then compares outcomes against a fixed baseline.

### 14.4 Workstreams

1. Reproducibility foundation
- Add run metadata envelope to all AI endpoints.
- Version prompts and analyzers.
- Tie every run to commit SHA and dataset snapshot.

2. Evaluation pipeline
- Maintain fixed synthetic/de-identified cohorts.
- Run baseline vs variant A/B experiments.
- Generate compact metric summaries (consistency, latency, clinician acceptance proxy).

3. Governance and safety
- Keep human-in-the-loop constraints enforced.
- Validate all AI response schemas server-side.
- Enforce protected-attribute controls and subgroup disaggregation policy.

4. Priority pilot track
- Execute `south-asian-diabetes-screening-v1` as first pilot.
- Compare generic screening prompts vs subgroup-aware prompts.
- Capture acceptance and rationale quality feedback.

### 14.5 Deliverables by small step

1. Baseline lock package
- Baseline tag, baseline metrics, and run protocol.

2. Metadata plumbing
- `experiment_id`, `run_id`, `prompt_version`, `dataset_snapshot`, and `code_commit_sha` returned and logged for all AI routes.

3. Cohort and prompt assets
- Synthetic cohort v1 and versioned prompt files under the research folder structure.

4. A/B harness
- Repeatable script/report comparing baseline and one variant.

5. Human feedback capture
- Simple accepted/rejected plus optional reason for each output unit.

6. Weekly decision note
- Keep/modify/retire decision with evidence links.

### 14.6 Success criteria for proposal execution

- Reproducible: any run is replayable from metadata.
- Comparable: each experiment changes one variable.
- Auditable: all outputs are attributable and logged.
- Safe: clinician approval remains mandatory.

### 14.7 Suggested 4-week cadence

- Week 1: baseline lock and metadata envelope.
- Week 2: synthetic cohort and prompt A/B harness.
- Week 3: feedback capture and first clinician review cycle.
- Week 4: pilot evaluation report and next-track decision.
