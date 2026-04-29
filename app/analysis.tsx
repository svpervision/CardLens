import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { CardIdentificationResult } from '../constants/cardIdentification';
import { Colors, Fonts, gradeColor } from '../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');

const CARD_IMG_W = SCREEN_W * 0.62;
const CARD_IMG_H = CARD_IMG_W * 1.396;

const GAME_LABELS: Record<CardIdentificationResult['gameType'], string> = {
  pokemon:  'POKÉMON',
  magic:    'MAGIC',
  onepiece: 'ONE PIECE',
  sports:   'SPORTS',
  other:    'TRADING CARD',
  unknown:  'CARD',
};

export default function AnalysisScreen() {
  const {
    imageUri, psaGrade,
    centering, corners, edges, surface,
    centeringDetails, centeringRatioLR, centeringRatioTB,
    cornersDetails, cornersIssues,
    edgesDetails, edgesIssues,
    surfaceDetails, surfaceIssues,
    overallNotes, cardName, setName, cardNumber, gameType,
  } = useLocalSearchParams<Record<string, string>>();

  const [fullscreen, setFullscreen] = useState(false);

  const cornersIssuesList: string[] = JSON.parse(cornersIssues || '[]');
  const edgesIssuesList: string[]   = JSON.parse(edgesIssues   || '[]');
  const surfaceIssuesList: string[] = JSON.parse(surfaceIssues  || '[]');

  const psaGradeNum  = psaGrade ? parseFloat(psaGrade) : 0;
  const displayImage = imageUri ?? null;
  const showIdent    = !!cardName && cardName !== 'Unknown Card';

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
        {showIdent ? (
          <View style={styles.identBanner}>
            {gameType ? (
              <View style={styles.identBadge}>
                <Text style={styles.identBadgeText}>
                  {GAME_LABELS[gameType as CardIdentificationResult['gameType']] ?? 'CARD'}
                </Text>
              </View>
            ) : null}
            <View style={styles.identInfo}>
              <Text style={styles.identCardName} numberOfLines={1}>{cardName}</Text>
              {(setName || cardNumber) ? (
                <Text style={styles.identDetails} numberOfLines={1}>
                  {[setName, cardNumber].filter(Boolean).join(' • ')}
                </Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={styles.notIdentBanner}>
            <Text style={styles.notIdentText}>Card not identified — </Text>
            <Pressable>
              <Text style={styles.addManuallyText}>Add manually</Text>
            </Pressable>
          </View>
        )}

        {/* ── Card image + grade hero ── */}
        <View style={styles.imageSection}>
          <TouchableOpacity activeOpacity={0.9} onPress={() => setFullscreen(true)}>
            <View style={styles.cardImageWrap}>
              {displayImage ? (
                <Image source={{ uri: displayImage }} style={styles.cardImage} resizeMode="cover" />
              ) : (
                <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                  <Text style={styles.cardImagePlaceholderText}>?</Text>
                  <Text style={styles.cardImagePlaceholderSub}>No image captured</Text>
                </View>
              )}
              {displayImage && (
                <View style={styles.tapHint}>
                  <Text style={styles.tapHintText}>⤢ Tap to expand</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          <GradeHero grade={psaGradeNum} cardName={cardName ?? 'Unknown Card'} cardSet={setName ?? ''} />
        </View>

        {/* ── Subgrades ── */}
        <Section title="Subgrades">
          <SubGradeRow
            label="Centering"
            value={centering ? parseFloat(centering) : 0}
            index={0}
            details={centeringDetails}
            issues={[]}
          />
          <SubGradeRow
            label="Corners"
            value={corners ? parseFloat(corners) : 0}
            index={1}
            details={cornersDetails}
            issues={cornersIssuesList}
          />
          <SubGradeRow
            label="Edges"
            value={edges ? parseFloat(edges) : 0}
            index={2}
            details={edgesDetails}
            issues={edgesIssuesList}
          />
          <SubGradeRow
            label="Surface"
            value={surface ? parseFloat(surface) : 0}
            index={3}
            details={surfaceDetails}
            issues={surfaceIssuesList}
            last
          />
        </Section>

        {/* ── Centering detail ── */}
        {(centeringRatioLR || centeringRatioTB) ? (
          <Section title="Centering Detail">
            <CenteringDetail lr={centeringRatioLR ?? ''} tb={centeringRatioTB ?? ''} />
          </Section>
        ) : null}

        {/* ── Expert assessment ── */}
        {overallNotes ? (
          <Section title="Expert Assessment">
            <Text style={styles.overallNotes}>{overallNotes}</Text>
          </Section>
        ) : null}

        {/* ── CTA ── */}
        <Pressable style={styles.ctaBtn}>
          <Text style={styles.ctaText}>Submit to PSA →</Text>
        </Pressable>

        <Text style={styles.disclaimer}>
          * Grades are AI predictions — not official PSA grades.
        </Text>
      </ScrollView>

      {/* ── Full-screen image modal ── */}
      <Modal visible={fullscreen} transparent animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <Pressable style={styles.modalBg} onPress={() => setFullscreen(false)}>
          <View style={styles.modalContent}>
            {displayImage ? (
              <Image
                source={{ uri: displayImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            ) : (
              <View style={[styles.modalImage, styles.cardImagePlaceholder]}>
                <Text style={styles.cardImagePlaceholderText}>?</Text>
              </View>
            )}
          </View>
          <Text style={styles.modalClose}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </SafeAreaView>
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

  const color = gradeColor(grade);

  return (
    <Animated.View style={[styles.hero, anim]}>
      <Text style={styles.cardName}>{cardName}</Text>
      {cardSet ? <Text style={styles.cardSet}>{cardSet}</Text> : null}
      <View style={[styles.gradeCircle, { borderColor: color }]}>
        <Text style={styles.gradeLabel}>PSA</Text>
        <Text style={[styles.gradeNumber, { color }]}>{grade}</Text>
      </View>
      <Text style={styles.gradeSubLabel}>AI Estimate</Text>
    </Animated.View>
  );
}

// ─── Subgrade row ─────────────────────────────────────────────────────────────

function SubGradeRow({ label, value, index, details, issues, last }: {
  label: string; value: number; index: number;
  details?: string; issues: string[]; last?: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(index * 100, withTiming(value / 10, { duration: 600 }));
  }, [value]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%` as any,
  }));

  const color = gradeColor(value);

  return (
    <View style={[styles.subGradeBlock, last && styles.subGradeBlockLast]}>
      <View style={styles.subGradeRow}>
        <Text style={styles.subGradeLabel}>{label}</Text>
        <View style={styles.subGradeBarBg}>
          <Animated.View style={[styles.subGradeBar, barStyle, { backgroundColor: color }]} />
        </View>
        <Text style={[styles.subGradeValue, { color }]}>{value.toFixed(1)}</Text>
      </View>
      {details ? <Text style={styles.subGradeDetails}>{details}</Text> : null}
      {issues.length > 0 && (
        <View style={styles.issuesList}>
          {issues.map((issue, i) => (
            <View key={i} style={styles.issueTag}>
              <Text style={styles.issueText}>{issue}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Centering detail ─────────────────────────────────────────────────────────

function CenteringDetail({ lr, tb }: { lr: string; tb: string }) {
  return (
    <View>
      {lr ? (
        <View style={styles.centeringRow}>
          <Text style={styles.centeringLabel}>Left / Right</Text>
          <Text style={[styles.centeringValue, { color: Colors.gold }]}>{lr}</Text>
        </View>
      ) : null}
      {tb ? (
        <View style={[styles.centeringRow, styles.centeringRowLast]}>
          <Text style={styles.centeringLabel}>Top / Bottom</Text>
          <Text style={[styles.centeringValue, { color: Colors.gold }]}>{tb}</Text>
        </View>
      ) : null}
      <View style={styles.psaStds}>
        <Text style={styles.psaStdTitle}>PSA Standards</Text>
        <Text style={styles.psaStd}>10 = 55/45  ·  9 = 60/40  ·  8 = 65/35</Text>
      </View>
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

  // ── Grade hero ──
  hero: { flex: 1, alignItems: 'center', paddingTop: 8 },
  cardName:     { color: Colors.text, fontFamily: Fonts.bold, fontSize: 15, textAlign: 'center', marginBottom: 4 },
  cardSet:      { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 12, textAlign: 'center', marginBottom: 14 },
  gradeCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.surface,
    borderWidth: 2.5, borderColor: Colors.gold,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  gradeLabel:    { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: 10 },
  gradeNumber:   { color: Colors.gold, fontFamily: Fonts.bold, fontSize: 28, lineHeight: 32 },
  gradeSubLabel: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 12 },

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
  subGradeBlock:     { paddingBottom: 14, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  subGradeBlockLast: { paddingBottom: 0, marginBottom: 0, borderBottomWidth: 0 },
  subGradeRow:       { flexDirection: 'row', alignItems: 'center' },
  subGradeLabel:     { color: Colors.text, fontFamily: Fonts.regular, fontSize: 14, width: 90 },
  subGradeBarBg:     { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden', marginHorizontal: 12 },
  subGradeBar:       { height: '100%', borderRadius: 3 },
  subGradeValue:     { fontFamily: Fonts.bold, fontSize: 14, width: 36, textAlign: 'right' },
  subGradeDetails:   { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 13, marginTop: 6, lineHeight: 18 },
  issuesList:        { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  issueTag:          { backgroundColor: '#2a1a1a', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#3a2a2a' },
  issueText:         { color: '#ff9999', fontFamily: Fonts.regular, fontSize: 11 },

  // ── Centering detail ──
  centeringRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  centeringRowLast: { borderBottomWidth: 0 },
  centeringLabel:   { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 14 },
  centeringValue:   { fontFamily: Fonts.bold, fontSize: 18 },
  psaStds:          { marginTop: 12 },
  psaStdTitle:      { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: 12, marginBottom: 4 },
  psaStd:           { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 12, lineHeight: 18 },

  // ── Expert notes ──
  overallNotes: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 14, lineHeight: 20 },

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
