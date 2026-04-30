import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { frontImage, backImage } = req.body || {};
  if (!frontImage) return res.status(400).json({ error: 'frontImage required' });

  const content: any[] = [
    { type: 'text', text: 'Front of card:' },
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frontImage } },
  ];
  if (backImage) {
    content.push({ type: 'text', text: 'Back of card:' });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: backImage } });
  }
  content.push({
    type: 'text',
    text: `You are a strict professional trading card grader (PSA/BGS standards). Grade this card carefully.

Return ONLY a valid JSON object, no markdown, no explanation:
{
  "centering": {
    "grade": <number 1-10, 0.5 steps>,
    "leftRightRatio": "<e.g. 55/45>",
    "topBottomRatio": "<e.g. 50/50>",
    "issues": [<strings listing any centering problems>],
    "details": "<one sentence assessment>"
  },
  "corners": {
    "grade": <number 1-10, 0.5 steps>,
    "issues": [<strings e.g. "slight wear top-left">],
    "details": "<one sentence assessment>"
  },
  "edges": {
    "grade": <number 1-10, 0.5 steps>,
    "issues": [<strings e.g. "minor chipping on right edge">],
    "details": "<one sentence assessment>"
  },
  "surface": {
    "grade": <number 1-10, 0.5 steps>,
    "issues": [<strings e.g. "light scratch near artwork">],
    "details": "<one sentence assessment>"
  },
  "overallNotes": "<2-3 sentence expert assessment>"
}

Grading: 10=Gem Mint, 9=Mint, 8=NM-MT, 7=NM, 6=EX-MT, 5=EX, below 5=heavily worn. Be strict and realistic.`
  });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    });
    const text = (message.content[0] as any).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err: any) {
    console.error('Grade error:', err);
    return res.status(500).json({ error: err.message });
  }
}
