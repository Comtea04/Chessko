import { useMemo, useState } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { communityNotesFor, TOP_NOTES } from '../data/openingCommunityNotes';
import { lineKey, type Opening, type OpeningLine } from '../data/openings';
import { suggestionText, useMoveSuggestions } from '../storage/useMoveSuggestions';
import { colors, radius, spacing, typography } from '../theme';

/**
 * Where a suggestion is turned into a published explanation: the authoring tool's line editor
 * (`npm run author`). It runs on the developer's machine, so the address is overridable — pointing
 * `EXPO_PUBLIC_AUTHOR_URL` at a LAN IP is what makes the link work from a phone.
 */
const AUTHOR_URL = process.env.EXPO_PUBLIC_AUTHOR_URL ?? 'http://localhost:4599';

const MAX_TEXT = 400;

/**
 * The community half of a move's commentary: the explanations other users wrote for the move on the
 * board, and the way to add one of your own.
 *
 * Collapsed it is a single row under our own note — a count, nothing more, because most moves have
 * nothing here and the note above is what the screen is for. Opened it shows the three best-liked
 * explanations *that have been promoted* (see `openingCommunityNotes.ts`: the rest sit in the file
 * and are never rendered), then the suggestion box.
 */
export function CommunityNotes({
  opening,
  line,
  ply,
  san,
}: {
  opening: Opening;
  line: OpeningLine;
  ply: number;
  san: string;
}) {
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const { forMove, add, remove } = useMoveSuggestions();
  const key = lineKey(opening.id, line.id);

  const notes = useMemo(() => communityNotesFor(opening, line, ply), [opening, line, ply]);
  const top = notes.slice(0, TOP_NOTES);
  const mine = forMove(key, ply);

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    add({
      key,
      ply,
      san,
      author: author.trim() || '익명',
      text: trimmed.slice(0, MAX_TEXT),
      where: `${opening.name} › ${line.name}`,
    });
    setText('');
    setSent(true);
  };

  return (
    <View style={styles.card}>
      <Pressable style={styles.header} onPress={() => setOpen((prev) => !prev)} hitSlop={4}>
        <Text style={styles.headerTitle}>💬 유저 설명</Text>
        <Text style={styles.headerCount}>{notes.length}</Text>
        {mine.length > 0 && <Text style={styles.headerMine}>내 제안 {mine.length}</Text>}
        <View style={styles.headerSpacer} />
        <Text style={styles.chevron}>{open ? '▴' : '▾'}</Text>
      </Pressable>

      {open && (
        <View style={styles.body}>
          {top.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>
                좋아요 상위 {top.length}개 · {san} 에 대한 설명
              </Text>
              {top.map((note, index) => (
                <View key={note.id} style={styles.note}>
                  <View style={styles.noteHead}>
                    <Text style={styles.noteRank}>{index + 1}</Text>
                    <Text style={styles.noteAuthor} numberOfLines={1}>{note.author}</Text>
                    <Text style={styles.noteLikes}>♥ {note.likes}</Text>
                  </View>
                  <Text style={styles.noteText}>{note.text}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.empty}>아직 승인된 유저 설명이 없습니다. 첫 설명을 제안해 보세요.</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>이 수에 설명 제안하기</Text>
          <TextInput
            style={styles.input}
            value={author}
            onChangeText={setAuthor}
            placeholder="닉네임 (비우면 익명)"
            placeholderTextColor={colors.textMuted}
            maxLength={20}
          />
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={text}
            onChangeText={(next) => {
              setText(next);
              setSent(false);
            }}
            placeholder={`${san} 를 왜 두는지, 어떻게 이해했는지 적어 주세요.`}
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={MAX_TEXT}
          />
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, styles.buttonPrimary, !text.trim() && styles.buttonDisabled]}
              onPress={submit}
              disabled={!text.trim()}
            >
              <Text style={styles.buttonTextPrimary}>제안 등록</Text>
            </Pressable>
            <Pressable style={styles.button} onPress={() => Linking.openURL(AUTHOR_URL)}>
              <Text style={styles.buttonText}>라인 등록기 열기 ↗</Text>
            </Pressable>
          </View>
          {/* Said plainly, because the round trip is manual: the suggestion sits on this device until
              it is shared out and promoted in the authoring tool. */}
          <Text style={styles.hint}>
            {sent
              ? '등록됐습니다. 아래에서 ‘보내기’로 전달하면 검토 후 승인됩니다.'
              : '제안은 이 기기에 보관되고, 보내기로 전달한 뒤 검토를 거쳐 공개됩니다.'}
          </Text>

          {mine.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>내가 제안한 설명 · 검토 대기</Text>
              {mine.map((suggestion) => (
                <View key={suggestion.id} style={styles.note}>
                  <Text style={styles.noteText}>{suggestion.text}</Text>
                  <View style={styles.actions}>
                    <Pressable
                      style={styles.button}
                      // Dismissing the sheet rejects, and on web there may be no share support at
                      // all — neither is worth an unhandled rejection.
                      onPress={() => void Share.share({ message: suggestionText(suggestion) }).catch(() => {})}
                    >
                      <Text style={styles.buttonText}>보내기</Text>
                    </Pressable>
                    <Pressable style={[styles.button, styles.buttonDanger]} onPress={() => remove(suggestion.id)}>
                      <Text style={[styles.buttonText, styles.buttonTextDanger]}>삭제</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerTitle: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  headerCount: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
  },
  headerMine: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  headerSpacer: {
    flex: 1,
  },
  chevron: {
    ...typography.caption,
    color: colors.textMuted,
  },
  body: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  note: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  noteHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  noteRank: {
    ...typography.caption,
    color: colors.surface,
    backgroundColor: colors.primary,
    fontWeight: '800',
    width: 16,
    textAlign: 'center',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  noteAuthor: {
    ...typography.caption,
    flex: 1,
    color: colors.text,
    fontWeight: '700',
  },
  noteLikes: {
    ...typography.caption,
    color: colors.danger,
    fontWeight: '700',
  },
  noteText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  empty: {
    ...typography.caption,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  input: {
    ...typography.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  inputMultiline: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  button: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonDanger: {
    borderColor: colors.danger,
  },
  buttonText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  buttonTextPrimary: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '700',
  },
  buttonTextDanger: {
    color: colors.danger,
  },
  hint: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
