import { useEffect } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChessBoard } from '../../components/ChessBoard';
import { MoveList } from '../../components/MoveList';
import { useChessGame } from '../../hooks/useChessGame';
import { getOpeningById } from '../../data/openings';
import { useSavedOpenings } from '../../storage/useSavedOpenings';
import { colors, radius, spacing, typography } from '../../theme';
import type { OpeningStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OpeningStackParamList, 'OpeningDetail'>;

export function OpeningDetailScreen({ route, navigation }: Props) {
  const opening = getOpeningById(route.params.openingId);
  const game = useChessGame();
  const { isSaved, toggleSaved } = useSavedOpenings();

  useEffect(() => {
    if (opening) {
      game.loadMoves(opening.moves);
    }
    // Only replay when the opening changes, not on every game state update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opening?.id]);

  if (!opening) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Text style={styles.notFound}>오프닝을 찾을 수 없습니다.</Text>
      </SafeAreaView>
    );
  }

  const saved = isSaved(opening.id);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={typography.title}>{opening.name}</Text>
            <Text style={styles.eco}>{opening.eco} · {opening.category}</Text>
          </View>
          <Pressable style={[styles.saveButton, saved && styles.saveButtonActive]} onPress={() => toggleSaved(opening.id)}>
            <Text style={[styles.saveButtonText, saved && styles.saveButtonTextActive]}>{saved ? '★ 저장됨' : '☆ 저장'}</Text>
          </Pressable>
        </View>

        <Text style={styles.description}>{opening.description}</Text>

        <ChessBoard
          board={game.board}
          selectedSquare={null}
          legalTargets={[]}
          lastMove={game.lastMove}
          onSquarePress={() => {}}
        />

        <MoveList
          moves={game.moves}
          viewIndex={game.viewIndex}
          onGoToIndex={game.goToIndex}
          onPrevious={game.goToPrevious}
          onNext={game.goToNext}
        />

        <Pressable style={styles.analyzeButton} onPress={() => navigation.navigate('Analysis', { initialFen: game.fen })}>
          <Text style={styles.analyzeButtonText}>이 포지션 분석하기</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  notFound: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  eco: {
    ...typography.caption,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    width: '100%',
  },
  saveButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  saveButtonActive: {
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    color: colors.primary,
    fontWeight: '700',
  },
  saveButtonTextActive: {
    color: colors.surface,
  },
  analyzeButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  analyzeButtonText: {
    color: colors.surface,
    fontWeight: '700',
  },
});
