import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PieceSymbol } from 'chess.js';

const CHOICES: { symbol: PieceSymbol; glyph: string; label: string }[] = [
  { symbol: 'q', glyph: '♕', label: '퀸' },
  { symbol: 'r', glyph: '♖', label: '룩' },
  { symbol: 'b', glyph: '♗', label: '비숍' },
  { symbol: 'n', glyph: '♘', label: '나이트' },
];

interface PromotionPickerProps {
  onSelect: (piece: PieceSymbol) => void;
  onCancel: () => void;
}

export function PromotionPicker({ onSelect, onCancel }: PromotionPickerProps) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.overlay]}>
      <View style={styles.card}>
        <Text style={styles.title}>승진할 기물을 선택하세요</Text>
        <View style={styles.choices}>
          {CHOICES.map((choice) => (
            <Pressable key={choice.symbol} style={styles.choice} onPress={() => onSelect(choice.symbol)}>
              <Text style={styles.glyph}>{choice.glyph}</Text>
              <Text style={styles.label}>{choice.label}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={onCancel}>
          <Text style={styles.cancel}>취소</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
    marginBottom: 12,
  },
  choices: {
    flexDirection: 'row',
    gap: 12,
  },
  choice: {
    alignItems: 'center',
    padding: 8,
  },
  glyph: {
    fontSize: 32,
  },
  label: {
    fontSize: 12,
    color: '#555',
  },
  cancel: {
    marginTop: 12,
    color: '#888',
  },
});
