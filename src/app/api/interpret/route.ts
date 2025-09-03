// app/api/interpret/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: 'Missing OPENAI_API_KEY' }, { status: 500 });
    }

    const { text, context, readingLevel = 'college' } = await req.json();
    if (!text || typeof text !== 'string') {
      return NextResponse.json({ ok: false, error: 'Bad request: "text" is required' }, { status: 400 });
    }

    const messages = [
      {
        role: 'system',
        content:
          'You are a concise tutor for law/CS students. Explain short snippets clearly and return STRICT JSON only.',
      },
      {
        role: 'user',
        content: `
Explain the excerpt in simple language for a ${readingLevel} student.

Return JSON with:
{
  "summary": "2-4 sentences",
  "key_terms": [{"term": "...", "meaning": "..."}],  // up to 5
  "analogy": "1-2 sentences (optional)",
  "confidence": 0..1
}

Context (optional): ${context || 'N/A'}
Excerpt: """${text}"""
`.trim(),
      },
    ];

    const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    const bodyText = await aiRes.text();
    if (!aiRes.ok) {
      return NextResponse.json(
        { ok: false, error: `OpenAI ${aiRes.status}: ${bodyText}` },
        { status: 500 }
      );
    }

    // bodyText is the full API JSON (choices[0].message.content is the JSON string we asked for)
    let content = '';
    try {
      const parsed = JSON.parse(bodyText);
      content = parsed?.choices?.[0]?.message?.content || '';
    } catch {
      content = bodyText; // fallback
    }

    let data;
    try {
      data = JSON.parse(content);
    } catch {
      // Last-resort fallback if model ignored JSON mode
      data = { summary: content.trim(), key_terms: [], analogy: null, confidence: 0.5 };
    }

    return NextResponse.json({ ok: true, data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
