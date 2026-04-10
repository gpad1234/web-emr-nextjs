import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import type { Patient } from "@/types/patient";

export interface AcuityResult {
  patientId: string;
  score: 1 | 2 | 3 | 4 | 5;
  rationale: string;
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

  // Cap at 20 to keep prompt size manageable
  const batch = patients.slice(0, 20);

  const patientLines = batch.map((p) =>
    `- id:${p.id} | ${age(p.dob)}y ${p.sexAtBirth} | status:${p.status} | flags:[${p.flags.join(", ") || "none"}]`
  ).join("\n");

  const prompt = `You are a clinical triage tool. Score each patient below on the ESI acuity scale 1–5:
1=Immediate, 2=Emergent, 3=Urgent, 4=Less Urgent, 5=Non-Urgent.

Use only the data provided (age, sex, admission status, flags). Be conservative — err toward higher acuity when uncertain.
Return ONLY valid JSON, no markdown:
{"results":[{"patientId":"<id>","score":<1-5>,"rationale":"<one brief sentence>"}]}

Patients:
${patientLines}`;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 1024,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { results?: AcuityResult[] };
    return NextResponse.json({ results: parsed.results ?? [] });
  } catch (err) {
    console.error("[acuity-score]", err);
    return NextResponse.json({ error: "Failed to score patients." }, { status: 502 });
  }
}
