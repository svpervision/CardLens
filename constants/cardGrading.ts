import * as FileSystem from 'expo-file-system';
import { GRADE_ENDPOINT } from './apiConfig';

export interface SubGrade {
  grade: number;
  issues: string[];
  details: string;
}

export interface CenteringSubGrade extends SubGrade {
  leftRightRatio: string;
  topBottomRatio: string;
}

export interface GradingResult {
  centering: CenteringSubGrade;
  corners: SubGrade;
  edges: SubGrade;
  surface: SubGrade;
  overallNotes: string;
}

export async function gradeCard(frontUri: string, backUri?: string): Promise<GradingResult> {
  const frontImage = await FileSystem.readAsStringAsync(frontUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  let backImage: string | undefined;
  if (backUri) {
    backImage = await FileSystem.readAsStringAsync(backUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  const response = await fetch(GRADE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frontImage, backImage }),
  });
  if (!response.ok) {
    const txt = await response.text();
    throw new Error(`Grade ${response.status}: ${txt}`);
  }
  return response.json();
}
