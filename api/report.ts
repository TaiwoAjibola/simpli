// Groq-powered progress report endpoint. The browser sends a compact snapshot
// compiled by src/utils/reportLogic.ts (client state is the source of truth);
// this route adds the GROQ_API_KEY server-side, prompts the model, and returns
// a Markdown report. The key NEVER reaches the client.
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { buildReportPrompt, ReportSnapshot } from '../src/utils/reportLogic';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GROQ_API_KEY not configured. Add it to Vercel env vars (never the client).'
    });
  }

  const snapshot = req.body?.snapshot as ReportSnapshot | undefined;
  if (!snapshot || !snapshot.scope) {
    return res.status(400).json({ error: 'A valid snapshot is required' });
  }

  const model = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const { system, user } = buildReportPrompt(snapshot);

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 1200,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: `Groq API error ${response.status}: ${text}` });
    }

    const data = await response.json();
    const report: string = data?.choices?.[0]?.message?.content || '';
    if (!report) {
      return res.status(500).json({ error: 'Groq returned an empty report' });
    }
    return res.status(200).json({ report, model });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}