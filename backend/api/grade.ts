import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { frontImageBase64, backImageBase64, mimeType = 'image/jpeg' } = req.body ?? {};
  if (!frontImageBase64) return res.status(400).json({ error: 'frontImageBase64 is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const imageContent: unknown[] = [
    { type: 'image', source: { type: 'base64', media_type: mimeType, data: frontImageBase64 } }
  ];

  if (backImageBase64) {
    imageContent.push({ type: 'image', source: { type: 'base64', media_type: mimeType, data: backImageBase64 } });
  }

  imageContent.push({
    type: 'text',
    text: `You are a strict professional trading card grader with the eye of a PSA/BGS expert. Analyze this card image${backImageBase64 ? ' (front and back)' : ''} and grade each category.

CORNERS: Look at all 4 corners. Any fuzzing, nicking, or rounding?
- 10: Perfect sharp points. 9.5: Near perfect under magnification only. 9: Minor issue under magnification. 8.5: Very light wear visible. 8: Light wear visible.

EDGES: Examine all 4 edges. Any chips, fraying, whitening?
- 10: Perfectly smooth clean cut. 9.5: Nearly perfect. 9: Minor issue under magnification. 8.5: Very slight wear visible. 8: Light wear visible.

SURFACE: Look at the card face. Any scratches, print lines, cloudiness, scuffs?
- 10: Flawless, perfect gloss, zero marks. 9.5: Only detectable under specific lighting. 9: Minor imperfection. 8.5: Very light surface wear. 8: Light wear visible.

Respond with ONLY a valid JSON object:
{
  "corners": { "grade": 9.5, "issues": [], "details": "one sentence" },
  "edges": { "grade": 9.0, "issues": [], "details": "one sentence" },
  "surface": { "grade": 8.5, "issues": [], "details": "one sentence" },
  "overallNotes": "Brief expert summary"
}

Use grades in 0.5 increments only. Be honest and strict.`
  });

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
        max_tokens: 600,
        messages: [{ role: 'user', content: imageContent }],
      }),
    });

    const data = await response.json() as { content?: Array<{ text: string }>; error?: unknown };
    if (!response.ok) return res.status(502).json({ error: 'Upstream error', detail: data });

    let text = (data.content?.[0]?.text ?? '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return res.status(200).json(JSON.parse(text));
  } catch {
    return res.status(200).json({
      corners: { grade: 8.5, issues: [], details: 'Unable to analyze' },
      edges: { grade: 8.5, issues: [], details: 'Unable to analyze' },
      surface: { grade: 8.5, issues: [], details: 'Unable to analyze' },
      overallNotes: 'Analysis unavailable'
    });
  }
}
