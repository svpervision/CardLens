import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardAnalysis } from '../constants/cardData';

const STORAGE_KEY = 'cardlens_collection';

export async function loadCollection(): Promise<CardAnalysis[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCard(card: CardAnalysis): Promise<void> {
  const existing = await loadCollection();
  const updated = [card, ...existing.filter((c) => c.id !== card.id)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export async function deleteCard(id: string): Promise<void> {
  const existing = await loadCollection();
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(existing.filter((c) => c.id !== id))
  );
}
