import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function gradeColor(g: number) {
  if (g >= 9) return '#00c853';
  if (g >= 7) return '#ffd600';
  return '#ff5252';
}

function GradeBar({ label, grade, details, issues, extra }: {
  label: string; grade: number; details: string; issues: string[]; extra?: string;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: grade / 10, duration: 900, useNativeDriver: false }).start();
  }, []);
  const color = gradeColor(grade);
  return (
    <View style={styles.gradeRow}>
      <View style={styles.gradeRowHeader}>
        <Text style={styles.gradeLabel}>{label}</Text>
        <Text style={[styles.gradeNum, { color }]}>{grade.toFixed(1)}</Text>
      </View>
      <View style={styles.barBg}>
        <Animated.View style={[styles.barFill, { backgroundColor: color, width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
      {extra ? <Text style={styles.gradeExtra}>{extra}</Text> : null}
      {details ? <Text style={styles.gradeDetails}>{details}</Text> : null}
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

export default function AnalysisScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Record<string, string>>();

  const psaGrade = parseFloat(params.psaGrade ?? '7');
  const centering = parseFloat(params.centering ?? '7');
  const corners = parseFloat(params.corners ?? '7');
  const edges = parseFloat(params.edges ?? '7');
  const surface = parseFloat(params.surface ?? '7');

  const cornersIssues: string[] = JSON.parse(params.cornersIssues || '[]');
  const edgesIssues: string[] = JSON.parse(params.edgesIssues || '[]');
  const surfaceIssues: string[] = JSON.parse(params.surfaceIssues || '[]');

  const gradeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(gradeAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }).start();
  }, []);

  const gradeCol = gradeColor(psaGrade);
  const cardLabel = params.cardName && params.cardName !== 'Unknown Card'
    ? params.cardName
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Card Analysis</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Hero: image + grade */}
      <View style={styles.heroRow}>
        {params.imageUri ? (
          <Image source={{ uri: params.imageUri }} style={styles.cardImage} resizeMode="contain" />
        ) : (
          <View style={[styles.cardImage, { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#444' }}>No image</Text>
          </View>
        )}
        <View style={styles.gradeCircleWrap}>
          <Animated.View style={[styles.gradeCircle, { borderColor: gradeCol, transform: [{ scale: gradeAnim }] }]}>
            <Text style={styles.gradeCircleLabel}>PSA</Text>
            <Text style={[styles.gradeCircleNum, { color: gradeCol }]}>{psaGrade}</Text>
            <Text style={styles.gradeCircleLabel}>GRADE</Text>
          </Animated.View>
        </View>
      </View>

      {/* Card ID banner */}
      {cardLabel && (
        <View style={styles.idBanner}>
          <Text style={styles.idName}>{cardLabel}</Text>
          {params.setName ? <Text style={styles.idSub}>{params.setName}{params.cardNumber ? ` · #${params.cardNumber}` : ''}</Text> : null}
          {params.gameType ? <Text style={styles.idGame}>{params.gameType}</Text> : null}
        </View>
      )}

      {/* Subgrades */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subgrades</Text>
        <GradeBar
          label="Centering"
          grade={centering}
          details={params.centeringDetails ?? ''}
          issues={[]}
          extra={params.centeringRatioLR && params.centeringRatioTB
            ? `${params.centeringRatioLR} L/R · ${params.centeringRatioTB} T/B`
            : undefined}
        />
        <GradeBar label="Corners" grade={corners} details={params.cornersDetails ?? ''} issues={cornersIssues} />
        <GradeBar label="Edges" grade={edges} details={params.edgesDetails ?? ''} issues={edgesIssues} />
        <GradeBar label="Surface" grade={surface} details={params.surfaceDetails ?? ''} issues={surfaceIssues} />
      </View>

      {/* Expert notes */}
      {params.overallNotes ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expert Assessment</Text>
          <View style={styles.notesCard}>
            <Text style={styles.notesText}>{params.overallNotes}</Text>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { padding: 8 },
  backText: { color: '#FFD700', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  heroRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 16, gap: 16,
  },
  cardImage: { width: 160, height: 224, borderRadius: 10 },
  gradeCircleWrap: { flex: 1, alignItems: 'center' },
  gradeCircle: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 4, backgroundColor: '#12122a',
    justifyContent: 'center', alignItems: 'center',
  },
  gradeCircleLabel: { color: '#888', fontSize: 10, fontWeight: '700', letterSpacing: 2 },
  gradeCircleNum: { fontSize: 40, fontWeight: '900', lineHeight: 44 },
  idBanner: {
    marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#12122a', borderRadius: 12, padding: 14,
  },
  idName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  idSub: { color: '#aaa', fontSize: 13, marginTop: 2 },
  idGame: {
    color: '#FFD700', fontSize: 11, fontWeight: '700',
    marginTop: 4, textTransform: 'uppercase', letterSpacing: 1,
  },
  section: { paddingHorizontal: 16, marginTop: 16 },
  sectionTitle: {
    color: '#888', fontSize: 11, fontWeight: '700',
    letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10,
  },
  gradeRow: {
    backgroundColor: '#12122a', borderRadius: 12,
    padding: 14, marginBottom: 10,
  },
  gradeRowHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  gradeLabel: { color: '#ccc', fontSize: 14, fontWeight: '600' },
  gradeNum: { fontSize: 18, fontWeight: '800' },
  barBg: { height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  barFill: { height: 6, borderRadius: 3 },
  gradeExtra: { color: '#888', fontSize: 12, marginTop: 2 },
  gradeDetails: { color: '#aaa', fontSize: 13, marginTop: 6, lineHeight: 18 },
  issuesList: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 4 },
  issueTag: { backgroundColor: '#2a1010', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  issueText: { color: '#ff9999', fontSize: 11 },
  notesCard: { backgroundColor: '#12122a', borderRadius: 12, padding: 14 },
  notesText: { color: '#ccc', fontSize: 14, lineHeight: 22 },
});
