export const Colors = {
  background: '#0a0a0a',
  surface: '#1a1a1a',
  border: '#2a2a2a',
  gold: '#FFD700',
  goldDim: '#B8970A',
  text: '#FFFFFF',
  textSecondary: '#888888',
  green: '#4CAF50',
  yellow: '#FFC107',
  red: '#F44336',
  tabBar: '#111111',
  overlay: 'rgba(0,0,0,0.7)',
} as const;

export const Fonts = {
  regular: 'Inter_400Regular',
  semiBold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

export const gradeColor = (grade: number): string => {
  if (grade >= 9) return Colors.green;
  if (grade >= 7) return Colors.yellow;
  return Colors.red;
};
