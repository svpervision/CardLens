import * as FileSystem from 'expo-file-system';
import { IDENTIFY_ENDPOINT } from './apiConfig';

export interface CardIdentification {
  cardName: string;
  setName: string;
  cardNumber: string;
  gameType: string;
  rarity: string;
  isHolo: boolean;
  confidence: number;
}

export async function identifyCard(imageUri: string): Promise<CardIdentification> {
  const base64 = await FileSystem.readAsStringAsync(imageUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch(IDENTIFY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Identify API error ${response.status}: ${errText}`);
  }

  return response.json() as Promise<CardIdentification>;
}
