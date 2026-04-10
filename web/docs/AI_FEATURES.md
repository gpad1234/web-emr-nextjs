# AI Features

## Overview

The AI layer in this EMR provides clinical decision support at the point of patient registration. It is intentionally narrow in scope — it surfaces suggestions, never takes autonomous action. Every AI output requires a clinician to explicitly accept it before it is written to the record.

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

## Architecture

```
Browser (form state)
        │
        │  POST /api/suggest-flags
        │  { firstName, lastName, dob, sexAtBirth, status, primaryProvider, existingFlags }
        ▼
Next.js API Route (server-side)          ← OPENAI_API_KEY lives here only
web/app/api/suggest-flags/route.ts
        │
        │  OpenAI chat.completions.create
        │  model: gpt-4o-mini, json_object
        ▼
OpenAI API
        │
        ▼
Next.js API Route (response)
        │
        │  { suggestions: [{ flag, reason }] }
        ▼
Browser (suggestion chips rendered)
```

**The API key is never sent to the browser.** It is consumed exclusively in the Next.js server-side API route. Requests from the browser to `/api/suggest-flags` go to the same Next.js server process — the key is never exposed in network traffic or client bundles.

---

## Error Handling

| Condition | HTTP Status | UI Behaviour |
|---|---|---|
| `OPENAI_API_KEY` not set | 503 | Error message shown below button |
| Required fields missing (name / dob / status) | 400 | Error message shown below button |
| OpenAI API error / timeout | 502 | Error message shown below button |
| Invalid JSON from form | 400 | Error message shown below button |

The form remains fully functional regardless of AI availability — if the AI call fails, the clinician can enter flags manually as normal.

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

The current feature is deliberately minimal. Natural extensions:

| Feature | Description |
|---|---|
| **Acuity scoring** | Suggest ESI triage level (1–5) based on chief complaint |
| **Escalation alerts** | Flag clinical combinations that warrant immediate attention (e.g. age 80+ + fall risk + unassigned provider) |
| **Care pathway suggestions** | Recommend initial orders or care pathways based on accepted flags |
| **Discharge risk** | Predict readmission risk from demographics + flags at or after discharge |

Any new AI route should follow the same pattern: server-side Next.js API route, `OPENAI_API_KEY` from environment, `json_object` response format, and explicit clinician confirmation before anything is written to the record.

---

## Security Notes

- The OpenAI API key is server-side only — never in client code or environment variables prefixed `NEXT_PUBLIC_`
- Patient data sent to OpenAI is limited to what is strictly necessary for the suggestion
- No patient record IDs, contact details, or clinical history are transmitted
- All AI suggestions are advisory — they cannot modify the record without a deliberate clinician action
