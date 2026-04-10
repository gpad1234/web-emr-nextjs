import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import type { Patient } from "@/types/patient";

export interface CensusInsight {
  severity: "critical" | "warning" | "info";
  headline: string;
  detail: string;
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function age(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY is not configured." }, { status: 503 });
  }

  let patients: Patient[];
  try {
    const body = await req.json();
    patients = body.patients;
    if (!Array.isArray(patients) || patients.length === 0) throw new Error();
  } catch {
    return NextResponse.json({ error: "Expected { patients: Patient[] }" }, { status: 400 });
  }

  const summary = patients.map((p) =>
    `${age(p.dob)}y ${p.sexAtBirth}, status:${p.status}, provider:${p.primaryProvider || "unassigned"}, flags:[${p.flags.join(", ") || "none"}]`
  ).join("\n");

  const prompt = `You are a clinical ward analyst. Review this census of ${patients.length} patients and identify up to 5 actionable insights a charge nurse or attending should act on today.

Focus on patterns, risks, and gaps — not individual patients. Examples: unassigned high-risk patients, clusters of similar flags, status distribution concerns, provider workload imbalance.

Each insight must have:
- severity: "critical" | "warning" | "info"
- headline: short action-oriented title (5–8 words)
- detail: one sentence explaining the finding and recommended action

Return ONLY valid JSON, no markdown:
{"insights":[{"severity":"...","headline":"...","detail":"..."}]}

Census:
${summary}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 768,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { insights?: CensusInsight[] };
    return NextResponse.json({ insights: (parsed.insights ?? []).slice(0, 5) });
  } catch (err) {
    console.error("[census-insights]", err);
    return NextResponse.json({ error: "Failed to generate insights." }, { status: 502 });
  }
}
