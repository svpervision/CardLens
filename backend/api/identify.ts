import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image } = req.body || {};
  if (!image) return res.status(400).json({ error: 'image required' });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
          {
            type: 'text',
            text: `Identify this trading card precisely. Return ONLY a valid JSON object, no markdown, no explanation:
{
  "cardName": "<full card name>",
  "setName": "<set or expansion name>",
  "cardNumber": "<card number if visible, else empty string>",
  "gameType": "<Pokemon, Magic: The Gathering, One Piece, Sports, or Other>",
  "rarity": "<Common, Uncommon, Rare, Ultra Rare, Secret Rare, etc>",
  "isHolo": <true or false>,
  "confidence": <0.0 to 1.0>
}
If you cannot identify the card clearly, still do your best and set confidence low.`
          }
        ]
      }]
    });

    const text = (message.content[0] as any).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');
    return res.status(200).json(JSON.parse(jsonMatch[0]));
  } catch (err: any) {
    console.error('Identify error:', err);
    return res.status(500).json({ error: err.message });
  }
}
