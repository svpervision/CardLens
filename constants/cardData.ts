export type CornerColor = 'green' | 'yellow' | 'red';
// Order: [topLeft, topRight, bottomLeft, bottomRight]
export type FourCorners = [CornerColor, CornerColor, CornerColor, CornerColor];

export interface SubGrades {
  centering: number;
  corners: number;
  edges: number;
  surface: number;
}

export interface CenteringMeasurement {
  leftRight: [number, number];
  topBottom: [number, number];
}

export interface CardAnalysis {
  id: string;
  name: string;
  set: string;
  frontUri: string | null;
  backUri: string | null;
  psaGrade: number;
  confidence: number;
  subGrades: SubGrades;
  centering: CenteringMeasurement;
  cornerColors?: FourCorners;
  probabilities: { grade: number; pct: number }[];
  marketValues: { label: string; value: string }[];
  timestamp: number;
}

export const PLACEHOLDER_ANALYSIS: CardAnalysis = {
  id: 'demo-001',
  name: 'Charizard VMAX',
  set: 'Darkness Ablaze',
  frontUri: null,
  backUri: null,
  psaGrade: 9,
  confidence: 87,
  subGrades: {
    centering: 8.5,
    corners: 9.5,
    edges: 9.0,
    surface: 8.5,
  },
  centering: {
    leftRight: [54, 46],
    topBottom: [58, 42],
  },
  cornerColors: ['green', 'green', 'yellow', 'green'],
  probabilities: [
    { grade: 10, pct: 19 },
    { grade: 9, pct: 74 },
    { grade: 8, pct: 7 },
  ],
  marketValues: [
    { label: 'PSA 10', value: '$2,400' },
    { label: 'PSA 9', value: '$680' },
    { label: 'Raw', value: '$180' },
    { label: 'Expected ROI', value: '+$320' },
  ],
  timestamp: Date.now(),
};

export const PSA_CENTERING_STANDARDS = [
  { grade: 10, ratio: '55/45' },
  { grade: 9, ratio: '60/40' },
  { grade: 8, ratio: '65/35' },
];
