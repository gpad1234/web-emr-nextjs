import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";

export interface SuggestFlagsRequest {
  firstName: string;
  lastName: string;
  dob: string;
  sexAtBirth: string;
  status: string;
  primaryProvider: string;
  existingFlags: string[];
}

export interface FlagSuggestion {
  flag: string;
  reason: string;
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function age(dob: string): number {
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured." },
      { status: 503 }
    );
  }

  let body: SuggestFlagsRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { firstName, lastName, dob, sexAtBirth, status, primaryProvider, existingFlags } = body;

  if (!firstName || !lastName || !dob || !status) {
    return NextResponse.json(
      { error: "firstName, lastName, dob and status are required." },
      { status: 400 }
    );
  }

  const patientAge = dob ? age(dob) : null;
  const alreadyFlagged = existingFlags.length > 0
    ? `Already flagged: ${existingFlags.join(", ")}.`
    : "No flags set yet.";

  const prompt = `You are a clinical decision support tool helping a clinician register a new patient in an EMR.
Based on the patient demographics and admission status below, suggest up to 5 relevant clinical flags.
Each flag should be a short, specific, actionable label (2–6 words) that would appear on a patient chart.
Do not duplicate the existing flags listed. Focus on flags that are genuinely warranted by the data.
Return ONLY valid JSON matching this exact schema — no markdown, no explanation outside JSON:
{"suggestions":[{"flag":"<label>","reason":"<one sentence why>"}]}

Patient:
- Name: ${firstName} ${lastName}
- Age: ${patientAge !== null ? `${patientAge} years` : "unknown"}
- Sex at birth: ${sexAtBirth}
- Admission status: ${status}
- Primary provider: ${primaryProvider || "unassigned"}
- ${alreadyFlagged}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 512,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { suggestions?: FlagSuggestion[] };
    const suggestions: FlagSuggestion[] = (parsed.suggestions ?? []).slice(0, 5);

    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("[suggest-flags]", err);
    return NextResponse.json(
      { error: "Failed to generate suggestions. Please try again." },
      { status: 502 }
    );
  }
}
