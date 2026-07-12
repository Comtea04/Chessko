import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface FenInputProps {
  currentFen: string;
  onLoad: (fen: string) => boolean;
}

export function FenInput({ currentFen, onLoad }: FenInputProps) {
  const [draft, setDraft] = useState(currentFen);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleLoad = () => {
    const ok = onLoad(draft.trim());
    setFeedback(ok ? null : '유효하지 않은 FEN입니다.');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>FEN 직접 입력</Text>
      <TextInput
        style={styles.input}
        value={draft}
        onChangeText={setDraft}
        placeholder="FEN 문자열을 붙여넣으세요"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Pressable style={styles.button} onPress={handleLoad}>
        <Text style={styles.buttonText}>포지션 불러오기</Text>
      </Pressable>
      {feedback && <Text style={styles.error}>{feedback}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    gap: 6,
  },
  label: {
    fontSize: 12,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  button: {
    backgroundColor: '#3d5a29',
    borderRadius: 6,
    paddingVertical: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  error: {
    color: '#b3261e',
    fontSize: 12,
  },
});
