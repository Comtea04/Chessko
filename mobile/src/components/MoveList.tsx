import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

interface MoveListProps {
  moves: string[];
  viewIndex: number;
  onGoToIndex: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
}

export function MoveList({ moves, viewIndex, onGoToIndex, onPrevious, onNext }: MoveListProps) {
  const movePairs: { moveNumber: number; white?: string; black?: string; whiteIndex: number; blackIndex: number }[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    movePairs.push({
      moveNumber: i / 2 + 1,
      white: moves[i],
      black: moves[i + 1],
      whiteIndex: i,
      blackIndex: i + 1,
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        <Pressable onPress={() => onGoToIndex(-1)} style={styles.startRow}>
          <Text style={[styles.moveText, viewIndex === -1 && styles.activeMove]}>시작 포지션</Text>
        </Pressable>
        {movePairs.map((pair) => (
          <View key={pair.moveNumber} style={styles.pairRow}>
            <Text style={styles.moveNumber}>{pair.moveNumber}.</Text>
            <Pressable onPress={() => onGoToIndex(pair.whiteIndex)}>
              <Text style={[styles.moveText, viewIndex === pair.whiteIndex && styles.activeMove]}>{pair.white}</Text>
            </Pressable>
            {pair.black && (
              <Pressable onPress={() => onGoToIndex(pair.blackIndex)}>
                <Text style={[styles.moveText, viewIndex === pair.blackIndex && styles.activeMove]}>{pair.black}</Text>
              </Pressable>
            )}
          </View>
        ))}
      </ScrollView>
      <View style={styles.navRow}>
        <Pressable style={styles.navButton} onPress={onPrevious} disabled={viewIndex < 0}>
          <Text style={styles.navButtonText}>◀ 이전</Text>
        </Pressable>
        <Pressable style={styles.navButton} onPress={onNext} disabled={viewIndex >= moves.length - 1}>
          <Text style={styles.navButtonText}>다음 ▶</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    gap: 6,
  },
  list: {
    maxHeight: 140,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  listContent: {
    padding: 8,
  },
  startRow: {
    marginBottom: 4,
  },
  pairRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 2,
  },
  moveNumber: {
    color: '#888',
    width: 24,
  },
  moveText: {
    fontSize: 13,
  },
  activeMove: {
    fontWeight: '700',
    color: '#3d5a29',
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  navButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  navButtonText: {
    color: '#3d5a29',
    fontWeight: '600',
  },
});
