import { NextRequest, NextResponse } from 'next/server';
import pdf from 'pdf-parse';
import { PayloadSchema } from '@/lib/zodSchemas';
import { syllabusJsonPrompt } from '@/lib/llmPrompt';

export const runtime = 'nodejs';

async function callOpenAI(prompt: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error('Missing OPENAI_API_KEY');
  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`OpenAI HTTP ${r.status}: ${text.slice(0, 500)}`);
  let data: any;
  try { data = JSON.parse(text); } catch { throw new Error('OpenAI returned non-JSON body'); }
  return data.choices?.[0]?.message?.content ?? '';
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const classId = String(form.get('classId') || 'default-class');
    const tz = String(form.get('tz') || 'America/Chicago');
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });

    // Read file -> Buffer (pdf-parse wants a Buffer)
    const buf = Buffer.from(await file.arrayBuffer());

    // --- PDF -> text (pdf-parse) ---
    let text = '';
    try {
      const out = await pdf(buf);
      text = (out.text || '').slice(0, 120_000);
    } catch (e: any) {
      console.error('pdf-parse failed:', e);
      return NextResponse.json(
        { error: 'Failed to read PDF: ' + (e?.message || String(e)) },
        { status: 422 }
      );
    }
    if (!text.trim()) {
      return NextResponse.json(
        { error: 'No text found in PDF (encrypted or image-only?)' },
        { status: 422 }
      );
    }

    // --- LLM -> strict JSON ---
    const prompt = syllabusJsonPrompt(text, classId, tz);
    const raw = (await callOpenAI(prompt)).trim();
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

    let parsedJson: unknown;
    try { parsedJson = JSON.parse(jsonStr); }
    catch {
      return NextResponse.json(
        { error: 'LLM did not return valid JSON', sample: raw.slice(0, 800) },
        { status: 422 }
      );
    }

    const result = PayloadSchema.safeParse(parsedJson);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Schema validation failed', issues: result.error.flatten(), sample: raw.slice(0, 800) },
        { status: 422 }
      );
    }

    // De-dupe by (classId|date|title)
    const seen = new Set<string>();
    const tasks = result.data.tasks.filter(t => {
      const k = `${t.classId}|${t.date}|${t.title.toLowerCase()}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (err: any) {
    console.error('Parse route fatal error:', err);
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
