import { useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Chess, type Square } from 'chess.js';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ChessBoard } from '../../components/ChessBoard';
import { searchByMoves, searchByText, type OpeningMatch } from '../../data/openingSearch';
import { colors, radius, spacing, typography } from '../../theme';
import type { OpeningStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<OpeningStackParamList, 'OpeningSearch'>;

const LINE_KIND_LABEL = { main: '메인', variation: '변형', punish: '응징' } as const;

export function OpeningSearchScreen({ navigation }: Props) {
  const [query, setQuery] = useState('');
  const [boardOpen, setBoardOpen] = useState(false);

  // A free-play board: chess.js is the source of truth, a counter forces re-render on each move.
  const chess = useRef(new Chess()).current;
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => n + 1);
  const [selected, setSelected] = useState<Square | null>(null);

  const openTo = (openingId: string) => navigation.navigate('OpeningDetail', { openingId });

  const textResults = useMemo(() => searchByText(query), [query]);
  // history() is the SAN sequence played so far — exactly what board search matches against.
  const playedSan = chess.history();
  const boardResults = searchByMoves(playedSan);

  const handleSquarePress = (square: Square) => {
    const piece = chess.get(square);
    if (!selected) {
      if (piece && piece.color === chess.turn()) setSelected(square);
      return;
    }
    if (square === selected) {
      setSelected(null);
      return;
    }
    if (piece && piece.color === chess.turn()) {
      setSelected(square);
      return;
    }
    try {
      // Openings never underpromote; auto-queen keeps the board a search tool, not a move editor.
      chess.move({ from: selected, to: square, promotion: 'q' });
      rerender();
    } catch {
      // Illegal — ignore, keep the selection so the user can pick a real target.
    }
    setSelected(null);
  };

  const undo = () => {
    chess.undo();
    setSelected(null);
    rerender();
  };
  const reset = () => {
    chess.reset();
    setSelected(null);
    rerender();
  };

  const legalTargets = selected
    ? chess.moves({ square: selected, verbose: true }).map((m) => m.to as Square)
    : [];
  const lastMove = chess.history({ verbose: true }).at(-1);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Mode 1: type the name. */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="오프닝 이름·ECO로 검색 (예: 이탈리안, C50)"
            placeholderTextColor={colors.textMuted}
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {query.length > 0 && (
          <ResultList
            results={textResults}
            emptyText="일치하는 오프닝이 없습니다. 이름 일부나 ECO 코드로 검색해 보세요."
            onPick={openTo}
          />
        )}

        {/* Mode 2: play the moves out and let the openings surface. */}
        <Pressable style={styles.boardToggle} onPress={() => setBoardOpen((v) => !v)}>
          <Ionicons name={boardOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.primary} />
          <Text style={styles.boardToggleText}>보드에 직접 둬서 찾기</Text>
        </Pressable>

        {boardOpen && (
          <View style={styles.boardSection}>
            <Text style={styles.hint}>이름을 몰라도, 아는 수순을 보드에 두면 해당하는 오프닝이 아래에 나옵니다.</Text>
            <ChessBoard
              board={chess.board()}
              selectedSquare={selected}
              legalTargets={legalTargets}
              lastMove={lastMove ? { from: lastMove.from as Square, to: lastMove.to as Square } : null}
              onSquarePress={handleSquarePress}
            />
            <View style={styles.boardControls}>
              <Text style={styles.playedMoves} numberOfLines={1}>
                {playedSan.length ? playedSan.join(' ') : '아직 둔 수가 없습니다'}
              </Text>
              <Pressable style={styles.controlButton} onPress={undo} disabled={playedSan.length === 0}>
                <Text style={[styles.controlText, playedSan.length === 0 && styles.controlDisabled]}>↶ 한 수 취소</Text>
              </Pressable>
              <Pressable style={styles.controlButton} onPress={reset} disabled={playedSan.length === 0}>
                <Text style={[styles.controlText, playedSan.length === 0 && styles.controlDisabled]}>처음부터</Text>
              </Pressable>
            </View>

            {playedSan.length > 0 && (
              <ResultList
                results={boardResults}
                emptyText="이 수순으로 시작하는 등록된 오프닝이 없습니다. 다른 수를 둬 보세요."
                showDepth
                onPick={openTo}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ResultList({
  results,
  emptyText,
  showDepth = false,
  onPick,
}: {
  results: OpeningMatch[];
  emptyText: string;
  showDepth?: boolean;
  onPick: (openingId: string) => void;
}) {
  if (results.length === 0) {
    return <Text style={styles.empty}>{emptyText}</Text>;
  }
  return (
    <View style={styles.results}>
      {results.map((match) => (
        <Pressable
          key={match.opening.id}
          style={({ pressed }) => [styles.resultCard, pressed && styles.resultPressed]}
          onPress={() => onPick(match.opening.id)}
        >
          <View style={styles.resultText}>
            <View style={styles.resultTop}>
              <Text style={styles.resultEco}>{match.opening.eco}</Text>
              <View style={[styles.sideDot, match.opening.sideToLearn === 'b' && styles.sideDotBlack]} />
              <Text style={styles.resultSide}>{match.opening.sideToLearn === 'w' ? '백' : '흑'}</Text>
            </View>
            <Text style={styles.resultName} numberOfLines={1}>{match.opening.name}</Text>
            {match.opening.nameEn && (
              <Text style={styles.resultNameEn} numberOfLines={1}>{match.opening.nameEn}</Text>
            )}
            <Text style={styles.resultMeta} numberOfLines={1}>
              {match.opening.category} · 라인 {match.opening.lines.length}개
              {showDepth && ` · ${LINE_KIND_LABEL[match.line.kind]} 라인으로 진행 중`}
            </Text>
          </View>
          <Text style={styles.resultGo}>바로가기 ›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    padding: 0,
  },
  boardToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  boardToggleText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
  },
  boardSection: {
    gap: spacing.md,
    alignItems: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
    width: '100%',
  },
  boardControls: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  playedMoves: {
    flex: 1,
    minWidth: 120,
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  controlButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  controlText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  controlDisabled: {
    color: colors.tabInactive,
  },
  results: {
    width: '100%',
    gap: spacing.sm,
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
    width: '100%',
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  resultPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  resultText: {
    flex: 1,
    gap: 2,
  },
  resultTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  resultEco: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  sideDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.text,
  },
  sideDotBlack: {
    backgroundColor: colors.text,
  },
  resultSide: {
    ...typography.caption,
    color: colors.textMuted,
  },
  resultName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
  },
  resultNameEn: {
    ...typography.caption,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  resultMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  resultGo: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
});
