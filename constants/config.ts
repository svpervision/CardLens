import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_STORAGE_KEY = 'cardlens_anthropic_key';

export async function getApiKey(): Promise<string | null> {
  return AsyncStorage.getItem(API_KEY_STORAGE_KEY);
}

export async function saveApiKey(key: string): Promise<void> {
  return AsyncStorage.setItem(API_KEY_STORAGE_KEY, key);
}
