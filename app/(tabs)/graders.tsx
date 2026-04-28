import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Fonts } from '../../constants/theme';

type GradeRow = {
  psa: string;
  bgs: string;
  cgc: string;
  desc: string;
};

const GRADE_DATA: GradeRow[] = [
  { psa: 'GEM MT 10', bgs: 'Pristine 10', cgc: 'Pristine 10', desc: 'Perfect card — virtually flawless' },
  { psa: 'GEM MT 10', bgs: 'Black Label 10', cgc: '—', desc: 'BGS perfect sub-grades (10/10/10/10)' },
  { psa: 'MINT 9',    bgs: 'Mint 9',         cgc: 'Mint 9',    desc: 'Nearly perfect, minimal imperfections' },
  { psa: 'NM-MT 8',  bgs: 'NM-MT 8',        cgc: 'NM-MT 8',   desc: 'Slight surface marks or centering off' },
  { psa: 'NM 7',     bgs: 'NM 7',           cgc: 'Near Mint 7', desc: 'Noticeable wear but still sharp corners' },
  { psa: 'EX-MT 6',  bgs: 'EX-MT 6',        cgc: 'Fine/VF 6',  desc: 'Minor creases or heavier wear' },
  { psa: 'EX 5',     bgs: 'EX 5',           cgc: 'Very Fine 5', desc: 'Visible surface marks on multiple sides' },
  { psa: 'VG-EX 4',  bgs: 'VG-EX 4',        cgc: 'Fine 4',     desc: 'Heavy wear, still presentable' },
  { psa: 'VG 3',     bgs: 'VG 3',           cgc: 'VG 3',       desc: 'Significant rounding, creases' },
  { psa: 'GD 2',     bgs: 'GD 2',           cgc: 'Good 2',     desc: 'Heavy play, scratches, soiling' },
  { psa: 'PR 1',     bgs: 'PR 1',           cgc: 'Poor 1',     desc: 'Heavily damaged, barely identifiable' },
];

const PSA_CENTERING = [
  { label: 'PSA 10', lr: '55/45', tb: '55/45' },
  { label: 'PSA 9',  lr: '60/40', tb: '60/40' },
  { label: 'PSA 8',  lr: '65/35', tb: '65/35' },
];

const GRADING_TIPS = [
  { title: 'Centering', body: 'Measure front and back independently. PSA uses the more off-centered side for grading.' },
  { title: 'Corners', body: 'Examined under magnification. Fraying, peeling, or rounding all deduct points.' },
  { title: 'Edges', body: 'Chips, nicks, and rough cuts lower the edge sub-grade significantly.' },
  { title: 'Surface', body: 'Scratches, print defects, stains, and creases affect surface grade.' },
];

export default function GradersScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Grader Reference</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Grade scale comparison table */}
        <Text style={styles.sectionTitle}>Grade Scale Comparison</Text>
        <View style={styles.tableCard}>
          {/* Table header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.colPSA, styles.th]}>PSA</Text>
            <Text style={[styles.colBGS, styles.th]}>BGS</Text>
            <Text style={[styles.colCGC, styles.th]}>CGC</Text>
          </View>
          {GRADE_DATA.map((row, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
              <View style={styles.colPSA}>
                <Text style={styles.cellPrimary}>{row.psa}</Text>
              </View>
              <View style={styles.colBGS}>
                <Text style={styles.cellSecondary}>{row.bgs}</Text>
              </View>
              <View style={styles.colCGC}>
                <Text style={styles.cellSecondary}>{row.cgc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Centering standards */}
        <Text style={styles.sectionTitle}>PSA Centering Standards</Text>
        <View style={styles.tableCard}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.colGrade, styles.th]}>Grade</Text>
            <Text style={[styles.colRatio, styles.th]}>L/R</Text>
            <Text style={[styles.colRatio, styles.th]}>T/B</Text>
          </View>
          {PSA_CENTERING.map((row, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}>
              <Text style={[styles.colGrade, styles.cellPrimary]}>{row.label}</Text>
              <Text style={[styles.colRatio, styles.ratioText]}>{row.lr}</Text>
              <Text style={[styles.colRatio, styles.ratioText]}>{row.tb}</Text>
            </View>
          ))}
        </View>

        {/* Grading tips */}
        <Text style={styles.sectionTitle}>What Graders Look For</Text>
        <View style={styles.tipsCard}>
          {GRADING_TIPS.map((tip, i) => (
            <View key={i} style={[styles.tipRow, i < GRADING_TIPS.length - 1 && styles.tipBorder]}>
              <View style={styles.tipDot} />
              <View style={styles.tipContent}>
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipBody}>{tip.body}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Company info */}
        <Text style={styles.sectionTitle}>Grading Companies</Text>
        <View style={styles.companiesCard}>
          {[
            { name: 'PSA', full: 'Professional Sports Authenticator', turnaround: '~20 days (regular)', cost: 'From $25/card' },
            { name: 'BGS', full: 'Beckett Grading Services', turnaround: '~15 days (regular)', cost: 'From $25/card' },
            { name: 'CGC', full: 'Certified Guaranty Company', turnaround: '~30 days (regular)', cost: 'From $25/card' },
          ].map((co, i) => (
            <View key={co.name} style={[styles.companyRow, i > 0 && styles.companyBorder]}>
              <View style={styles.companyBadge}>
                <Text style={styles.companyAbbr}>{co.name}</Text>
              </View>
              <View style={styles.companyInfo}>
                <Text style={styles.companyFull}>{co.full}</Text>
                <Text style={styles.companyMeta}>{co.turnaround}  ·  {co.cost}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontFamily: Fonts.bold, fontSize: 24 },
  scroll: { padding: 16 },

  sectionTitle: {
    color: Colors.textSecondary,
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginTop: 24,
  },

  tableCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tableHeader: {
    backgroundColor: Colors.border,
    paddingVertical: 8,
  },
  tableRowAlt: { backgroundColor: 'rgba(255,255,255,0.02)' },
  th: { color: Colors.textSecondary, fontFamily: Fonts.semiBold, fontSize: 11, textTransform: 'uppercase' },
  colPSA: { flex: 1.1 },
  colBGS: { flex: 1.1 },
  colCGC: { flex: 1 },
  colGrade: { flex: 1 },
  colRatio: { flex: 0.8, textAlign: 'center' },
  cellPrimary: { color: Colors.text, fontFamily: Fonts.semiBold, fontSize: 13 },
  cellSecondary: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 12 },
  ratioText: { color: Colors.gold, fontFamily: Fonts.semiBold, fontSize: 14 },

  tipsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  tipRow: { flexDirection: 'row', paddingBottom: 14, marginBottom: 14 },
  tipBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  tipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
    marginTop: 4,
    marginRight: 12,
    flexShrink: 0,
  },
  tipContent: { flex: 1 },
  tipTitle: { color: Colors.text, fontFamily: Fonts.semiBold, fontSize: 14, marginBottom: 4 },
  tipBody: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 13, lineHeight: 19 },

  companiesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  companyRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  companyBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  companyBadge: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  companyAbbr: { color: Colors.gold, fontFamily: Fonts.bold, fontSize: 14 },
  companyInfo: { flex: 1 },
  companyFull: { color: Colors.text, fontFamily: Fonts.semiBold, fontSize: 14, marginBottom: 3 },
  companyMeta: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 12 },
});
