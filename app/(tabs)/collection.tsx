import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CardAnalysis, PLACEHOLDER_ANALYSIS } from '../../constants/cardData';
import { loadCollection } from '../../store/collection';
import { Colors, Fonts, gradeColor } from '../../constants/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const COLS = 2;
const GAP = 12;
const PAD = 16;
const CELL_W = (SCREEN_W - PAD * 2 - GAP * (COLS - 1)) / COLS;
const CELL_H = CELL_W * 1.45;

export default function CollectionScreen() {
  const [cards, setCards] = useState<CardAnalysis[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadCollection().then(setCards);
    }, [])
  );

  function openCard(card: CardAnalysis) {
    router.push('/analysis');
  }

  const hasCards = cards.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Collection</Text>
        <Text style={styles.count}>{cards.length} card{cards.length !== 1 ? 's' : ''}</Text>
      </View>

      {!hasCards ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <View style={styles.emptyCard} />
          </View>
          <Text style={styles.emptyTitle}>No cards yet</Text>
          <Text style={styles.emptyBody}>
            Scan a card to add it to your collection.
          </Text>
          <Pressable
            style={styles.scanBtn}
            onPress={() => router.push('/')}
          >
            <Text style={styles.scanBtnText}>Scan a Card</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          numColumns={COLS}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.cell, pressed && { opacity: 0.75 }]}
              onPress={() => openCard(item)}
            >
              <CardCell card={item} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function CardCell({ card }: { card: CardAnalysis }) {
  const color = gradeColor(card.psaGrade);
  return (
    <View style={styles.cellInner}>
      {card.frontUri ? (
        <Image source={{ uri: card.frontUri }} style={styles.cellImage} resizeMode="cover" />
      ) : (
        <View style={[styles.cellImage, styles.cellImagePlaceholder]}>
          <Text style={styles.cellPlaceholderText}>{card.name.charAt(0)}</Text>
        </View>
      )}
      <View style={styles.cellFooter}>
        <Text style={styles.cellName} numberOfLines={1}>{card.name}</Text>
        <View style={[styles.gradeBadge, { borderColor: color }]}>
          <Text style={[styles.gradeText, { color }]}>{card.psaGrade}</Text>
        </View>
      </View>
      <Text style={styles.cellSet} numberOfLines={1}>{card.set}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: PAD,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: { color: Colors.text, fontFamily: Fonts.bold, fontSize: 24 },
  count: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 14 },
  grid: { padding: PAD, paddingTop: 16 },
  row: { gap: GAP, marginBottom: GAP },
  cell: { width: CELL_W },
  cellInner: {
    width: CELL_W,
    height: CELL_H,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cellImage: {
    width: '100%',
    height: CELL_H - 56,
    backgroundColor: Colors.border,
  },
  cellImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPlaceholderText: {
    color: Colors.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: 36,
  },
  cellFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 2,
  },
  cellName: { color: Colors.text, fontFamily: Fonts.semiBold, fontSize: 13, flex: 1, marginRight: 8 },
  gradeBadge: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  gradeText: { fontFamily: Fonts.bold, fontSize: 13 },
  cellSet: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 11, paddingHorizontal: 10 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: {
    width: 80,
    height: 80,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyCard: {
    width: 36,
    height: 50,
    backgroundColor: Colors.border,
    borderRadius: 4,
  },
  emptyTitle: { color: Colors.text, fontFamily: Fonts.bold, fontSize: 20, marginBottom: 8 },
  emptyBody: { color: Colors.textSecondary, fontFamily: Fonts.regular, fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 28 },
  scanBtn: {
    backgroundColor: Colors.gold,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 12,
  },
  scanBtnText: { color: '#000', fontFamily: Fonts.bold, fontSize: 15 },
});
