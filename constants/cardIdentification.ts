import { File } from 'expo-file-system';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

export interface CardIdentificationResult {
  cardName: string;
  setName: string;
  cardNumber: string;
  gameType: 'pokemon' | 'magic' | 'onepiece' | 'sports' | 'other' | 'unknown';
  rarity: string;
  isHolo: boolean;
  confidence: 'high' | 'medium' | 'low';
  rawResponse: string;
}

const PROMPT = `Identify this trading card. Respond with ONLY a JSON object, no other text:
{
  "cardName": "exact card name",
  "setName": "set or series name",
  "cardNumber": "collector number if visible, else empty string",
  "gameType": "pokemon|magic|onepiece|sports|other|unknown",
  "rarity": "Common|Uncommon|Rare|Holo Rare|Ultra Rare|Secret Rare|etc",
  "isHolo": true/false,
  "confidence": "high|medium|low"
}
If you cannot identify the card, return unknown for gameType and low for confidence.`;

function fallback(): CardIdentificationResult {
  return {
    cardName: '',
    setName: '',
    cardNumber: '',
    gameType: 'unknown',
    rarity: '',
    isHolo: false,
    confidence: 'low',
    rawResponse: '',
  };
}

export async function identifyCard(
  imageUri: string,
  apiKey: string,
): Promise<CardIdentificationResult> {
  try {
    const base64 = await new File(imageUri).base64();

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: base64,
                },
              },
              { type: 'text', text: PROMPT },
            ],
          },
        ],
      }),
    });

    if (!response.ok) return fallback();

    const data = await response.json() as {
      content?: { type: string; text: string }[];
    };
    const text = data.content?.[0]?.text ?? '';

    // Strip markdown code fences if model wraps the JSON
    const jsonText = text.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(jsonText) as Partial<CardIdentificationResult>;

    return {
      cardName: parsed.cardName ?? '',
      setName: parsed.setName ?? '',
      cardNumber: parsed.cardNumber ?? '',
      gameType: parsed.gameType ?? 'unknown',
      rarity: parsed.rarity ?? '',
      isHolo: Boolean(parsed.isHolo),
      confidence: parsed.confidence ?? 'low',
      rawResponse: text,
    };
  } catch {
    return fallback();
  }
}
