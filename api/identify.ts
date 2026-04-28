import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { imageBase64, mimeType = 'image/jpeg' } = req.body ?? {};
  if (!imageBase64) return res.status(400).json({ error: 'imageBase64 is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
            { type: 'text', text: `Identify this trading card. Respond with ONLY a JSON object:\n{"cardName":"exact card name","setName":"set name","cardNumber":"number or empty","gameType":"pokemon|magic|onepiece|sports|other|unknown","rarity":"rarity string","isHolo":false,"confidence":"high|medium|low"}\nIf you cannot identify it, use gameType "unknown" and confidence "low".` }
          ]
        }]
      }),
    });

    const data = await response.json() as { content?: Array<{ text: string }>; error?: unknown };
    if (!response.ok) return res.status(502).json({ error: 'Upstream error', detail: data });

    let text = (data.content?.[0]?.text ?? '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return res.status(200).json(JSON.parse(text));
  } catch {
    return res.status(200).json({ cardName: '', setName: '', cardNumber: '', gameType: 'unknown', rarity: '', isHolo: false, confidence: 'low' });
  }
}
