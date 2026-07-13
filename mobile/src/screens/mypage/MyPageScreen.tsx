import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Card } from '../../components/Card';
import { ScreenHeader } from '../../components/ScreenHeader';
import {
  ChesscomApiError,
  getPlayerProfile,
  getRecentGames,
  type ChesscomGame,
  type ChesscomProfile,
} from '../../api/chesscomApi';
import { PUZZLES } from '../../data/puzzles';
import { useChesscomAccount } from '../../storage/useChesscomAccount';
import { usePuzzleProgress } from '../../storage/usePuzzleProgress';
import { useSavedOpenings } from '../../storage/useSavedOpenings';
import { useTrainerStats } from '../../storage/useTrainerStats';
import { colors, radius, spacing, typography } from '../../theme';
import type { MyPageStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<MyPageStackParamList, 'MyPage'>;

const RESULT_LABELS: Record<ChesscomGame['result'], string> = { win: '승', loss: '패', draw: '무' };
const TIME_CLASS_LABELS: Record<string, string> = {
  bullet: '불릿',
  blitz: '블리츠',
  rapid: '래피드',
  daily: '데일리',
};

function formatDate(epochSeconds: number): string {
  if (!epochSeconds) return '';
  const date = new Date(epochSeconds * 1000);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

export function MyPageScreen({ navigation }: Props) {
  const { username, setUsername, loaded } = useChesscomAccount();
  const { savedIds } = useSavedOpenings();
  const { solvedIds, bestStreak: puzzleBestStreak } = usePuzzleProgress();
  const { bestStreak: coordinateBestStreak, bestAccuracy } = useTrainerStats();

  const [input, setInput] = useState('');
  const [profile, setProfile] = useState<ChesscomProfile | null>(null);
  const [games, setGames] = useState<ChesscomGame[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (handle: string) => {
    setLoading(true);
    setError(null);
    try {
      const [nextProfile, nextGames] = await Promise.all([getPlayerProfile(handle), getRecentGames(handle)]);
      setProfile(nextProfile);
      setGames(nextGames);
      return true;
    } catch (err) {
      setError(err instanceof ChesscomApiError ? err.message : '알 수 없는 오류가 발생했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload the linked account's games whenever the screen is first shown with a saved username.
  useEffect(() => {
    if (loaded && username && !profile) void load(username);
  }, [loaded, username, profile, load]);

  const handleLink = useCallback(async () => {
    const handle = input.trim();
    if (!handle) return;
    if (await load(handle)) setUsername(handle.toLowerCase());
  }, [input, load, setUsername]);

  const handleUnlink = useCallback(() => {
    setUsername(null);
    setProfile(null);
    setGames([]);
    setError(null);
    setInput('');
  }, [setUsername]);

  const settingsButton = (
    <Pressable
      accessibilityLabel="설정"
      onPress={() => navigation.navigate('Settings')}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
    >
      <Ionicons name="settings-outline" size={22} color={colors.text} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenHeader title="마이페이지" subtitle="chess.com 계정과 학습 기록" right={settingsButton} />

      <ScrollView contentContainerStyle={styles.container}>
        {!username || !profile ? (
          <Card>
            <Text style={styles.cardTitle}>chess.com 연동</Text>
            <Text style={styles.cardDesc}>닉네임을 입력하면 최근 대국 기록을 불러옵니다. 비밀번호는 필요하지 않습니다.</Text>
            <View style={styles.linkRow}>
              <TextInput
                style={styles.input}
                value={input}
                onChangeText={setInput}
                placeholder="chess.com 닉네임"
                placeholderTextColor={colors.tabInactive}
                autoCapitalize="none"
                autoCorrect={false}
                onSubmitEditing={handleLink}
              />
              <Pressable
                style={[styles.primaryButton, (loading || !input.trim()) && styles.buttonDisabled]}
                onPress={handleLink}
                disabled={loading || !input.trim()}
              >
                {loading ? <ActivityIndicator color={colors.surface} /> : <Text style={styles.primaryButtonText}>연동</Text>}
              </Pressable>
            </View>
            {error && <Text style={styles.error}>{error}</Text>}
          </Card>
        ) : (
          <Card>
            <View style={styles.profileRow}>
              {profile.avatar ? (
                <Image source={{ uri: profile.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={24} color={colors.tabInactive} />
                </View>
              )}
              <View style={styles.profileText}>
                <Text style={styles.profileName}>
                  {profile.title ? `${profile.title} ` : ''}
                  {profile.username}
                </Text>
                {profile.name && <Text style={styles.cardDesc}>{profile.name}</Text>}
                <Text style={styles.cardDesc}>팔로워 {profile.followers.toLocaleString()}명</Text>
              </View>
              <Pressable onPress={handleUnlink} style={({ pressed }) => [styles.unlinkButton, pressed && styles.pressed]}>
                <Text style={styles.unlinkText}>연동 해제</Text>
              </Pressable>
            </View>
          </Card>
        )}

        {username && profile && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>최근 대국</Text>
            {loading && <ActivityIndicator color={colors.primary} />}
            {error && <Text style={styles.error}>{error}</Text>}
            {!loading && !error && games.length === 0 && (
              <Card>
                <Text style={styles.cardDesc}>최근 3개월 안에 둔 대국이 없습니다.</Text>
              </Card>
            )}
            {games.map((game) => (
              <Card key={game.url} style={styles.gameCard}>
                <View style={[styles.resultBadge, styles[`result_${game.result}`]]}>
                  <Text style={styles.resultText}>{RESULT_LABELS[game.result]}</Text>
                </View>
                <View style={styles.gameText}>
                  <Text style={styles.gameOpponent} numberOfLines={1}>
                    vs {game.opponent}
                    {game.opponentRating ? ` (${game.opponentRating})` : ''}
                  </Text>
                  <Text style={styles.gameMeta}>
                    {game.playerColor === 'white' ? '백' : '흑'} · {TIME_CLASS_LABELS[game.timeClass] ?? game.timeClass} ·{' '}
                    {game.endReason} · {formatDate(game.endTime)}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>학습 기록</Text>
          <Card>
            <View style={styles.statsGrid}>
              <Stat label="저장한 오프닝" value={`${savedIds.length}개`} />
              <Stat label="푼 퍼즐" value={`${solvedIds.length}/${PUZZLES.length}`} />
              <Stat label="퍼즐 최고 연속" value={`${puzzleBestStreak}`} />
              <Stat label="좌표 최고 스트릭" value={`${coordinateBestStreak}`} />
              <Stat label="좌표 최고 정확도" value={`${bestAccuracy}%`} />
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  iconButton: {
    padding: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  cardTitle: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  cardDesc: {
    ...typography.caption,
    color: colors.textMuted,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.text,
    backgroundColor: colors.background,
  },
  primaryButton: {
    minWidth: 72,
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: colors.surface,
    fontWeight: '700',
  },
  error: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    ...typography.heading,
  },
  unlinkButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  unlinkText: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '700',
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.heading,
  },
  gameCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  resultBadge: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  result_win: {
    backgroundColor: colors.accent,
  },
  result_loss: {
    backgroundColor: colors.danger,
  },
  result_draw: {
    backgroundColor: colors.tabInactive,
  },
  resultText: {
    color: colors.surface,
    fontWeight: '800',
  },
  gameText: {
    flex: 1,
    gap: 2,
  },
  gameOpponent: {
    ...typography.body,
    fontWeight: '700',
  },
  gameMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  stat: {
    minWidth: 84,
    gap: 2,
  },
  statValue: {
    ...typography.heading,
    color: colors.primaryDark,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
