import { File } from 'expo-file-system';

const IDENTIFY_ENDPOINT = 'https://cardlens.vercel.app/api/identify';

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

export async function identifyCard(imageUri: string): Promise<CardIdentificationResult> {
  try {
    const imageBase64 = await new File(imageUri).base64();

    const response = await fetch(IDENTIFY_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType: 'image/jpeg' }),
    });

    if (!response.ok) return fallback();

    const parsed = await response.json() as Partial<CardIdentificationResult>;

    return {
      cardName: parsed.cardName ?? '',
      setName: parsed.setName ?? '',
      cardNumber: parsed.cardNumber ?? '',
      gameType: parsed.gameType ?? 'unknown',
      rarity: parsed.rarity ?? '',
      isHolo: Boolean(parsed.isHolo),
      confidence: parsed.confidence ?? 'low',
      rawResponse: JSON.stringify(parsed),
    };
  } catch {
    return fallback();
  }
}
