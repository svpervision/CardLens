import * as FileSystem from 'expo-file-system';
import { FourCorners } from './cardData';
import { GRADE_ENDPOINT } from './apiConfig';

export interface CardGradingResult {
  corners: number;
  edges: number;
  surface: number;
  cornerColors: FourCorners;
  overallNotes: string;
}

function cornerColor(grade: number): 'green' | 'yellow' | 'red' {
  if (grade >= 9.0) return 'green';
  if (grade >= 7.0) return 'yellow';
  return 'red';
}

function fallback(): CardGradingResult {
  return { corners: 0, edges: 0, surface: 0, cornerColors: ['green', 'green', 'green', 'green'], overallNotes: '' };
}

export async function gradeCard(
  frontImageUri: string,
  backImageUri: string | null,
): Promise<CardGradingResult> {
  try {
    const frontImageBase64 = await FileSystem.readAsStringAsync(frontImageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const backImageBase64 = backImageUri
      ? await FileSystem.readAsStringAsync(backImageUri, { encoding: FileSystem.EncodingType.Base64 })
      : undefined;

    const response = await fetch(GRADE_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        frontImageBase64,
        ...(backImageBase64 ? { backImageBase64 } : {}),
        mimeType: 'image/jpeg',
      }),
    });

    if (!response.ok) return fallback();

    const data = await response.json() as {
      corners?: { grade: number };
      edges?: { grade: number };
      surface?: { grade: number };
      overallNotes?: string;
    };

    const corners = data.corners?.grade ?? 0;
    const edges = data.edges?.grade ?? 0;
    const surface = data.surface?.grade ?? 0;
    const cc = cornerColor(corners);

    return {
      corners,
      edges,
      surface,
      cornerColors: [cc, cc, cc, cc],
      overallNotes: data.overallNotes ?? '',
    };
  } catch {
    return fallback();
  }
}
