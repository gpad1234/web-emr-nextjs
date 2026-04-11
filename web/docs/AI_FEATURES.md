# AI Features

## Overview

The AI layer in this EMR provides clinical decision support at registration, triage, and ward-level review. It is intentionally narrow in scope — it surfaces suggestions, never takes autonomous action. Every AI output requires a clinician to explicitly accept it before it is written to the record.

| Feature | Where | Trigger |
|---|---|---|
| **Smart Clinical Flag Suggestions** | Add Patient form | "Suggest with AI" button in Flags card |
| **Acuity Scoring** | Patient List | "Score Acuity" button in page header |
| **Census Insights** | Dashboard | "Analyse Census" button in AI Insights card |

---

## Feature: Smart Clinical Flag Suggestions

### Purpose

When registering a new patient, a clinician can request AI-generated clinical flag suggestions based on the patient's demographics and admission status. Flags are short, actionable labels that appear on the patient chart (e.g. _Fall Risk_, _DNR_, _Allergy: Penicillin_, _Contact Isolation_).

The goal is lightweight triage at intake — reducing the chance that a relevant flag is missed during a busy admission workflow.

### How to Use

1. Navigate to **Patients → Add Patient** (`/patients/new`)
2. Fill in at least: First Name, Last Name, Date of Birth, and Status
3. Scroll to the **Clinical Flags** card at the bottom of the form
4. Click **Suggest with AI** (violet button, top-right of the card)
5. The AI returns up to 5 flag suggestions, shown as chips
6. Hover a chip to read the AI's one-sentence clinical reasoning
7. Click **+** to accept a suggestion (adds it to the flags list)
8. Click **×** to dismiss a suggestion (removes it from the list)

Accepted suggestions become ordinary flags — they are saved with the patient record on form submission, indistinguishable from manually typed flags.

### What the AI Receives

The following fields from the form are sent server-side to OpenAI:

| Field | Purpose |
|---|---|
| `firstName`, `lastName` | Patient identity |
| `dob` | Computed → patient age in years |
| `sexAtBirth` | Clinical context |
| `status` | Admission state (e.g. Admitted, Outpatient, ED) |
| `primaryProvider` | Assigned provider (or "unassigned") |
| `existingFlags` | Prevents duplicate suggestions |

No other data is sent. The patient record has not been saved at this point — the AI operates only on what is currently in the form.

### What the AI Returns

```json
{
  "suggestions": [
    { "flag": "Fall Risk",        "reason": "Age 84 with no mobility aids documented." },
    { "flag": "Allergy Review",   "reason": "No allergy information captured at intake." },
    { "flag": "Contact Isolation","reason": "ED admission status warrants infection precaution screen." }
  ]
}
```

Up to 5 suggestions are returned. Any that duplicate `existingFlags` are filtered out client-side before display.

### Model & Parameters

| Setting | Value |
|---|---|
| Model | `gpt-4o-mini` |
| Temperature | `0.3` (low — consistent, conservative output) |
| Max tokens | `512` |
| Response format | `json_object` (structured, no free-text wrapper) |

`gpt-4o-mini` was chosen for low latency and cost. The conservative temperature reduces hallucinated or speculative flags.

---

## Feature: Acuity Scoring

### Purpose

Scores every patient on the patient list using the ESI triage scale (1–5) based on age, sex, admission status, and flags. Lets charge nurses and attendings instantly identify who needs priority attention without manually reviewing each chart.

| Score | Level | Colour |
|---|---|---|
| 1 | Immediate | Red |
| 2 | Emergent | Orange |
| 3 | Urgent | Yellow |
| 4 | Less Urgent | Blue |
| 5 | Non-Urgent | Grey |

### How to Use

1. Navigate to **Patients** (`/patients`)
2. Click **Score Acuity** (violet button, top-right of the page header)
3. A coloured numbered badge appears in a new **Acuity** column for each patient
4. Hover a badge to read the AI's one-line clinical rationale
5. Scores are session-only — click again to refresh after patient status changes

### What the AI Receives

Up to 20 patients are sent per request (batched to keep prompt size manageable):

| Field | Purpose |
|---|---|
| `id` | To map results back to table rows |
| `dob` | Computed → age in years |
| `sexAtBirth` | Clinical context |
| `status` | Admission state |
| `flags` | Active clinical flags |

### What the AI Returns

```json
{
  "results": [
    { "patientId": "abc123", "score": 2, "rationale": "Critical status with fall risk flag warrants emergent review." }
  ]
}
```

### Model & Parameters

| Setting | Value |
|---|---|
| Model | `gpt-4o-mini` |
| Temperature | `0.2` (lower than flags — acuity scoring requires more consistency) |
| Max tokens | `1024` |
| Response format | `json_object` |

---

## Feature: Census Insights

### Purpose

Analyses the entire patient census and surfaces up to 5 ward-level patterns and risks that a charge nurse or attending should act on. Turns the patient list from a directory into an actionable clinical overview.

### How to Use

1. Navigate to the **Dashboard** (`/`)
2. Scroll to the **AI Census Insights** card
3. Click **Analyse Census**
4. Up to 5 insights appear, each tagged `critical`, `warning`, or `info`
5. Each insight has a short headline and a one-sentence recommended action

Typical examples:
- _"3 critical patients unassigned to provider — assign immediately"_
- _"High fall-risk cluster in admitted cohort — review mobility protocols"_
- _"Provider workload imbalance — Dr. Smith has 12 patients, others have 2–3"_

### What the AI Receives

All patients currently loaded in the dashboard:

| Field | Purpose |
|---|---|
| `dob` | Computed → age in years |
| `sexAtBirth` | Demographic context |
| `status` | Admission state distribution |
| `primaryProvider` | Provider assignment / gaps |
| `flags` | Flag pattern analysis |

No names or MRNs are sent — only clinical and demographic attributes.

### What the AI Returns

```json
{
  "insights": [
    {
      "severity": "critical",
      "headline": "Unassigned critical patients need provider",
      "detail": "2 patients in critical status have no primary provider assigned — assign immediately to ensure continuity of care."
    }
  ]
}
```

### Model & Parameters

| Setting | Value |
|---|---|
| Model | `gpt-4o-mini` |
| Temperature | `0.3` |
| Max tokens | `768` |
| Response format | `json_object` |

---

## Architecture

```
Browser
  │  POST /api/suggest-flags   { name, dob, sex, status, provider, existingFlags }
  │  POST /api/acuity-score     { patients: [...] }   (up to 20)
  │  POST /api/census-insights  { patients: [...] }   (all loaded)
  ▼
Next.js API Routes (server-side)    ← OPENAI_API_KEY lives here only
  web/app/api/suggest-flags/route.ts
  web/app/api/acuity-score/route.ts
  web/app/api/census-insights/route.ts
  │
  │  OpenAI chat.completions.create
  │  model: gpt-4o-mini, response_format: json_object
  ▼
OpenAI API
  │
  ▼
Next.js API Routes (response)
  │  { suggestions }  /  { results }  /  { insights }
  ▼
Browser (UI updated — no record written until clinician acts)
```

**The API key is never sent to the browser.** It is consumed exclusively in the Next.js server-side API route. Requests from the browser to `/api/suggest-flags` go to the same Next.js server process — the key is never exposed in network traffic or client bundles.

---

## Error Handling

All three routes share the same error contract:

| Condition | HTTP Status | UI Behaviour |
|---|---|---|
| `OPENAI_API_KEY` not set | 503 | Error message shown near button |
| Invalid / missing request body | 400 | Error message shown near button |
| OpenAI API error / timeout | 502 | Error message shown near button |

All AI features degrade gracefully — the underlying pages remain fully functional if any AI call fails.

---

## Configuration

### Local development

Create `web/.env.local` (gitignored):

```env
OPENAI_API_KEY=sk-...your-key-here
```

See `web/.env.example` for the full template.

### Production server

The key is stored at `/home/sam/emr-app/web/.env.local` on the server (mode `600`, owned by `sam`). It is **not** in the git repository. To update it:

```bash
ssh root@209.38.70.215
echo "OPENAI_API_KEY=sk-..." > /home/sam/emr-app/web/.env.local
chown sam:sam /home/sam/emr-app/web/.env.local
chmod 600 /home/sam/emr-app/web/.env.local
# No rebuild needed — the key is read at runtime by the API route
```

---

## Extending the AI Layer

Three features are live. Natural next steps:

| Feature | Description |
|---|---|
| **SOAP Note Starter** | Clinician types rough intake notes; AI reformats into structured SOAP format |
| **Escalation alerts** | Real-time flag watching — alert when a combination warrants immediate action |
| **Care pathway suggestions** | Recommend initial orders or care pathways based on accepted flags |
| **Discharge risk** | Predict readmission risk from demographics + flags at or after discharge |

Any new AI route should follow the same pattern: server-side Next.js API route, `OPENAI_API_KEY` from environment, `json_object` response format, and explicit clinician confirmation before anything is written to the record.

---

## Security Notes

- The OpenAI API key is server-side only — never in client code or environment variables prefixed `NEXT_PUBLIC_`
- Patient data sent to OpenAI is limited to the minimum necessary for each feature
- Census Insights strips names and MRNs — only clinical/demographic attributes are transmitted
- All AI outputs are advisory — none can modify a record without a deliberate clinician action
- All three routes are routed through nginx with specific `location` blocks before the json-server `/api/` block
