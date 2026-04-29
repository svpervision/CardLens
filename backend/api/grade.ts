import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { frontImage, backImage } = req.body;
  if (!frontImage) return res.status(400).json({ error: 'frontImage required' });

  const imageContent: any[] = [
    { type: 'text', text: 'Front of card:' },
    { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: frontImage } },
  ];
  if (backImage) {
    imageContent.push({ type: 'text', text: 'Back of card:' });
    imageContent.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: backImage } });
  }
  imageContent.push({
    type: 'text',
    text: `You are a professional trading card grader with PSA/BGS expertise. Analyze this card image and grade it strictly.

Return ONLY valid JSON with this exact structure:
{
  "centering": {
    "grade": <number 1-10, use 0.5 increments>,
    "leftRightRatio": "<e.g. 55/45>",
    "topBottomRatio": "<e.g. 50/50>",
    "issues": [<list of centering issues, empty array if none>],
    "details": "<one sentence explanation of centering assessment>"
  },
  "corners": {
    "grade": <number 1-10, use 0.5 increments>,
    "issues": [<list of corner issues observed>],
    "details": "<one sentence describing corner condition>"
  },
  "edges": {
    "grade": <number 1-10, use 0.5 increments>,
    "issues": [<list of edge issues observed>],
    "details": "<one sentence describing edge condition>"
  },
  "surface": {
    "grade": <number 1-10, use 0.5 increments>,
    "issues": [<list of surface issues: scratches, print lines, haze, etc>],
    "details": "<one sentence describing surface condition>"
  },
  "overallNotes": "<2-3 sentence expert assessment of the card overall>"
}

Grading scale:
- 10: Perfect/Gem Mint. Centering 50/50 to 55/45. Corners sharp under magnification. Edges clean. Surface pristine.
- 9: Mint. Centering up to 60/40. One minor flaw allowed.
- 8: Near Mint-Mint. Centering up to 65/35. Minor flaws.
- 7: Near Mint. Centering up to 70/30. Light wear.
- 6: Excellent-Mint. Centering up to 75/25. Moderate wear.
- 5 and below: Heavily played, creased, or damaged.

Be strict and realistic. Most cards grade 7-9. Only perfect cards get 10.`,
  });

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: imageContent }],
    });

    const text = (message.content[0] as any).text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Grade error:', err);
    return res.status(500).json({ error: err.message });
  }
}
