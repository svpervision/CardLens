import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts, gradeColor } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const CARD_IMG_W = SCREEN_W * 0.62;
const CARD_IMG_H = CARD_IMG_W * 1.396;

type CornerColor = 'green' | 'yellow' | 'red';

const DOT_COLORS: Record<CornerColor, string> = {
  green:  Colors.green,
  yellow: Colors.yellow,
  red:    Colors.red,
};

function cornerColorForGrade(g: number): CornerColor {
  if (g >= 8.5) return 'green';
  if (g >= 7) return 'yellow';
  return 'red';
}

function computeProbabilities(grade: number): { grade: number; pct: number }[] {
  const g = Math.round(grade);
  const hi = Math.min(10, g + 1);
  const lo = Math.max(1, g - 1);
  if (hi === g) return [{ grade: g, pct: 85 }, { grade: lo, pct: 15 }];
  if (lo === g) return [{ grade: hi, pct: 15 }, { grade: g, pct: 85 }];
  return [
    { grade: hi, pct: 15 },
    { grade: g,  pct: 70 },
    { grade: lo, pct: 15 },
  ];
}

export default function AnalysisScreen() {
  const {
    imageUri,
    psaGrade,
    centering,
    corners,
    edges,
    surface,
    centeringRatioLR,
    centeringRatioTB,
    overallNotes,
    cardName,
    setName,
    cardNumber,
    gameType,
    rarity,
  } = useLocalSearchParams<Record<string, string>>();

  const [fullscreen, setFullscreen] = useState(false);

  const grade      = parseFloat(psaGrade   || '7');
  const cGrade     = parseFloat(centering  || '7');
  const coGrade    = parseFloat(corners    || '7');
  const eGrade     = parseFloat(edges      || '7');
  const sGrade     = parseFloat(surface    || '7');

  const hasIdent = !!(cardName && cardName.length > 0);
  const probabilities = useMemo(() => computeProbabilities(grade), [grade]);

  const cornerColors: [CornerColor, CornerColor, CornerColor, CornerColor] = [
    cornerColorForGrade(coGrade),
    cornerColorForGrade(coGrade),
    cornerColorForGrade(coGrade),
    cornerColorForGrade(coGrade),
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Grade Analysis</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Card identification banner ── */}
        {hasIdent ? (
          <IdentBanner
            cardName={cardName!}
            setName={setName || ''}
            gameType={gameType || ''}
            rarity={rarity || ''}
            cardNumber={cardNumber || ''}
          />
        ) : (
          <View style={styles.notIdentBanner}>
            <Text style={styles.notIdentText}>Card not identified — </Text>
            <Pressable>
              <Text style={styles.addManuallyText}>Add manually</Text>
            </Pressable>
          </View>
        )}

        {/* ── Card image with corner dots ── */}
        <View style={styles.imageSection}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setFullscreen(true)}>
            <View style={styles.cardImageWrap}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Text style={styles.cardImagePlaceholderText}>?</Text>
                  <Text style={styles.cardImagePlaceholderSub}>No image captured</Text>
                </View>
              )}

              <CornerDot position="topLeft"     color={cornerColors[0]} />
              <CornerDot position="topRight"    color={cornerColors[1]} />
              <CornerDot position="bottomLeft"  color={cornerColors[2]} />
              <CornerDot position="bottomRight" color={cornerColors[3]} />

              {imageUri && (
                <View style={styles.tapHint}>
                  <Text style={styles.tapHintText}>⤢ Tap to expand</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <GradeHero
            grade={grade}
            cardName={cardName || 'Card not identified'}
            cardSet={setName || ''}
          />
        </View>

        {/* ── Subgrades ── */}
        <Section title="Subgrades">
          <SubGradeRow label="Centering" value={cGrade}  index={0} />
          <SubGradeRow label="Corners"   value={coGrade} index={1} />
          <SubGradeRow label="Edges"     value={eGrade}  index={2} />
          <SubGradeRow label="Surface"   value={sGrade}  index={3} />
        </Section>

        {/* ── Centering detail ── */}
        <Section title="Centering Detail">
          <CenteringDetail lrRatio={centeringRatioLR || ''} tbRatio={centeringRatioTB || ''} />
        </Section>

        {/* ── Probability ── */}
        <Section title="Grade Probability">
          <ProbabilityBar probs={probabilities} />
        </Section>

        {/* ── Expert assessment ── */}
        {overallNotes ? (
          <Section title="Expert Assessment">
            <Text style={styles.expertNotes}>{overallNotes}</Text>
          </Section>
        ) : null}

        {/* ── Market values (placeholder) ── */}
        <Section title="Market Values">
          <View style={styles.marketGrid}>
            <MarketCard label="PSA 10" value="—" isRoi={false} />
            <MarketCard label="PSA 9"  value="—" isRoi={false} />
            <MarketCard label="Raw"    value="—" isRoi={false} />
            <MarketCard label="Expected ROI" value="—" isRoi={true} />
          </View>
        </Section>

        {/* ── CTA ── */}
        <Pressable style={styles.ctaBtn}>
          <Text style={styles.ctaText}>Submit to PSA →</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          * Market values are estimates. Grades are AI predictions — not official PSA grades.
        </Text>
      </ScrollView>

      {/* ── Full-screen image modal ── */}
      <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setFullscreen(false)}>
          <View style={styles.modalContent}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.modalImage} resizeMode="contain" />
            ) : (
              <View style={[styles.modalImage, styles.cardImagePlaceholder]}>
                <Text style={styles.cardImagePlaceholderText}>?</Text>
              </View>
            )}
            <CornerDot position="topLeft"     color={cornerColors[0]} size={14} />
            <CornerDot position="topRight"    color={cornerColors[1]} size={14} />
            <CornerDot position="bottomLeft"  color={cornerColors[2]} size={14} />
            <CornerDot position="bottomRight" color={cornerColors[3]} size={14} />
          </View>
          <Text style={styles.modalClose}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Identification banner ────────────────────────────────────────────────────

function IdentBanner({ cardName, setName, gameType, rarity, cardNumber }: {
  cardName: string; setName: string; gameType: string; rarity: string; cardNumber: string;
}) {
  const badge = gameType ? gameType.toUpperCase() : 'CARD';
  const details = [rarity, setName, cardNumber].filter(Boolean).join(' • ');
  return (
    <View style={styles.identBanner}>
      <View style={styles.identBadge}>
        <Text style={styles.identBadgeText}>{badge}</Text>
      </View>
      <View style={styles.identInfo}>
        <Text style={styles.identCardName} numberOfLines={1}>{cardName}</Text>
        {details ? <Text style={styles.identDetails} numberOfLines={1}>{details}</Text> : null}
      </View>
    </View>
  );
}

// ─── Corner dot overlay ──────────────────────────────────────────────────────

function CornerDot({
  position,
  color,
  size = 11,
}: {
  position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';
  color: CornerColor;
  size?: number;
}) {
  const isTop  = position.startsWith('top');
  const isLeft = position.endsWith('Left');
  const bg     = DOT_COLORS[color];
  const inset  = size * 0.7;

  return (
    <View
      style={[
        styles.cornerDot,
        { width: size * 2, height: size * 2, borderRadius: size },
        { backgroundColor: bg, shadowColor: bg },
        isTop  ? { top: inset }    : { bottom: inset },
        isLeft ? { left: inset }   : { right: inset },
      ]}
    />
  );
}

// ─── Grade hero ──────────────────────────────────────────────────────────────

function GradeHero({ grade, cardName, cardSet }: {
  grade: number; cardName: string; cardSet: string;
}) {
  const opacity = useSharedValue(0);
  const scale   = useSharedValue(0.75);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    scale.value   = withTiming(1, { duration: 400 });
  }, []);

  const anim = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.hero, anim]}>
      <Text style={styles.cardName}>{cardName}</Text>
      {cardSet ? <Text style={styles.cardSet}>{cardSet}</Text> : null}
      <View style={styles.gradeCircle}>
        <Text style={styles.gradeLabel}>PSA</Text>
        <Text style={styles.gradeNumber}>{grade}</Text>
      </View>
    </Animated.View>
  );
}

// ─── Subgrade row ────────────────────────────────────────────────────────────

function SubGradeRow({ label, value, index }: { label: string; value: number; index: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(index * 100, withTiming(value / 10, { duration: 600 }));
  }, [value]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  const color = gradeColor(value);
  return (
    <View style={styles.subGradeRow}>
      <Text style={styles.subGradeLabel}>{label}</Text>
      <View style={styles.subGradeBarBg}>
        <Animated.View style={[styles.subGradeBar, barStyle, { backgroundColor: color }]} />
      </View>
      <Text style={[styles.subGradeValue, { color }]}>{value.toFixed(1)}</Text>
    </View>
  );
}

// ─── Centering detail ─────────────────────────────────────────────────────────

function CenteringDetail({ lrRatio, tbRatio }: { lrRatio: string; tbRatio: string }) {
  const [lr0, lr1] = lrRatio ? lrRatio.split('/') : ['—', '—'];
  const [tb0, tb1] = tbRatio ? tbRatio.split('/') : ['—', '—'];
  return (
    <View>
      <View style={styles.centeringRow}>
        <Text style={styles.centeringLabel}>Left / Right</Text>
        <Text style={styles.centeringValue}>
          <Text style={styles.centeringNum}>{lr0}</Text>
          <Text style={styles.centeringSlash}>/</Text>
          <Text style={styles.centeringNum}>{lr1}</Text>
        </Text>
      </View>
      <View style={styles.centeringRow}>
        <Text style={styles.centeringLabel}>Top / Bottom</Text>
        <Text style={styles.centeringValue}>
          <Text style={styles.centeringNum}>{tb0}</Text>
          <Text style={styles.centeringSlash}>/</Text>
          <Text style={styles.centeringNum}>{tb1}</Text>
        </Text>
      </View>
      <View style={styles.psaStds}>
        <Text style={styles.psaStdTitle}>PSA Standards</Text>
        <Text style={styles.psaStd}>10 = 55/45  ·  9 = 60/40  ·  8 = 65/35</Text>
      </View>
    </View>
  );
}

// ─── Probability bar ──────────────────────────────────────────────────────────

function ProbabilityBar({ probs }: { probs: { grade: number; pct: number }[] }) {
  return (
    <View>
      <View style={styles.probBar}>
        {probs.map((p) => (
          <View
            key={p.grade}
            style={[styles.probSegment, { width: `${p.pct}%` as any, backgroundColor: gradeColor(p.grade) }]}
          />
        ))}
      </View>
      <View style={styles.probLabels}>
        {probs.map((p) => (
          <View key={p.grade} style={styles.probLabelItem}>
            <View style={[styles.probDot, { backgroundColor: gradeColor(p.grade) }]} />
            <Text style={styles.probLabelText}>PSA {p.grade}</Text>
            <Text style={styles.probPct}>{p.pct}%</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Market card ──────────────────────────────────────────────────────────────

function MarketCard({ label, value, isRoi }: { label: string; value: string; isRoi: boolean }) {
  return (
    <View style={[styles.marketCard, isRoi && styles.marketCardRoi]}>
      <Text style={styles.marketLabel}>{label}</Text>
      <Text style={[styles.marketValue, isRoi && { color: Colors.green }]}>{value}</Text>
    </View>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn:     { width: 60 },
  backText:    { color: Colors.gold, fontFamily: Fonts.semiBold, fontSize: 15 },
  headerTitle: { color: Colors.text, fontFamily: Fonts.bold, fontSize: 17 },
  scroll:      { paddingHorizontal: 16, paddingBottom: 40 },

  // ── Identification banner ──
  identBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: 12,
    marginTop: 16,
    gap: 12,
  },
  identBadge: {
    backgroundColor: Colors.gold,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  identBadgeText: {
    color: '#000',
    fontFamily: Fonts.bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  identInfo: { flex: 1 },
  identCardName: {
    color: Colors.text,
    fontFamily: Fonts.bold,
    fontSize: 15,
  },
  identDetails: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 12,
    marginTop: 2,
  },
  notIdentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginTop: 16,
  },
  notIdentText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 14,
  },
  addManuallyText: {
    color: Colors.gold,
    fontFamily: Fonts.semiBold,
    fontSize: 14,
  },

  // ── Image section ──
  imageSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingTop: 20,
    paddingBottom: 4,
  },
  cardImageWrap: {
    width: CARD_IMG_W,
    height: CARD_IMG_H,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.surface,
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImagePlaceholderText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: 48,
  },
  cardImagePlaceholderSub: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 11,
    marginTop: 6,
  },
  tapHint: {
    position: 'absolute',
    bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  tapHintText: { color: '#fff', fontFamily: Fonts.regular, fontSize: 10 },

  cornerDot: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 5,
    elevation: 4,
  },

  // ── Grade hero ──
  hero: { flex: 1, alignItems: 'center', paddingTop: 8 },
  cardName:   { color: Colors.text,          fontFamily: Fonts.bold,    fontSize: 15, textAlign: 'center', marginBottom: 4 },
  cardSet:    { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 12, textAlign: 'center', marginBottom: 14 },
  gradeCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 2.5, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  gradeLabel:  { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: 10 },
  gradeNumber: { color: Colors.gold,          fontFamily: Fonts.bold,    fontSize: 28, lineHeight: 32 },

  // ── Sections ──
  section:      { marginTop: 22 },
  sectionTitle: {
    color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: 11,
    letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10,
  },
  sectionBody: {
    backgroundColor: Colors.surface, borderRadius: 12,
    borderWidth: 1, borderColor: Colors.border, padding: 16,
  },

  // ── Subgrades ──
  subGradeRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  subGradeLabel: { color: Colors.text, fontFamily: Fonts.regular, fontSize: 14, width: 90 },
  subGradeBarBg: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginHorizontal: 12 },
  subGradeBar:   { height: '100%', borderRadius: 3 },
  subGradeValue: { fontFamily: Fonts.bold, fontSize: 14, width: 36, textAlign: 'right' },

  // ── Centering ──
  centeringRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  centeringLabel: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 14 },
  centeringValue: { fontFamily: Fonts.bold, fontSize: 18 },
  centeringNum:   { color: Colors.gold },
  centeringSlash: { color: Colors.textSecondary },
  psaStds:        { marginTop: 12 },
  psaStdTitle:    { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: 12, marginBottom: 4 },
  psaStd:         { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 12, lineHeight: 18 },

  // ── Probability ──
  probBar:       { flexDirection: 'row', height: 24, borderRadius: 12, overflow: 'hidden', gap: 2 },
  probSegment:   { height: '100%' },
  probLabels:    { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  probLabelItem: { alignItems: 'center', gap: 4 },
  probDot:       { width: 10, height: 10, borderRadius: 5 },
  probLabelText: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 12 },
  probPct:       { color: Colors.text, fontFamily: Fonts.bold, fontSize: 15 },

  // ── Expert notes ──
  expertNotes: {
    color: Colors.text,
    fontFamily: Fonts.regular,
    fontSize: 14,
    lineHeight: 21,
  },

  // ── Market ──
  marketGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  marketCard: {
    flex: 1, minWidth: (SCREEN_W - 32 - 32 - 10) / 2,
    backgroundColor: Colors.background, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, padding: 14, alignItems: 'center',
  },
  marketCardRoi: { borderColor: Colors.gold },
  marketLabel:   { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 12, marginBottom: 6 },
  marketValue:   { color: Colors.text, fontFamily: Fonts.bold, fontSize: 20 },

  // ── CTA ──
  ctaBtn:     { marginTop: 28, backgroundColor: Colors.gold, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ctaText:    { color: '#000', fontFamily: Fonts.bold, fontSize: 17 },
  disclaimer: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 11, textAlign: 'center', marginTop: 16, lineHeight: 17, opacity: 0.7 },

  // ── Fullscreen modal ──
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    width: SCREEN_W * 0.88,
    height: SCREEN_W * 0.88 * 1.396,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: Colors.surface,
  },
  modalClose: {
    color: Colors.textSecondary,
    fontFamily: Fonts.regular,
    fontSize: 13,
    marginTop: 20,
    opacity: 0.6,
  },
});
