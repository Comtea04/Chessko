import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { enrollTheme, scanScreenshot, VisionApiError, type PickedImage } from '../api/visionApi';

interface VisionImportPanelProps {
  onFenScanned: (fen: string) => void;
}

async function pickScreenshot(): Promise<PickedImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new VisionApiError('사진 보관함 접근 권한이 필요합니다.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    name: asset.fileName ?? 'screenshot.png',
    mimeType: asset.mimeType ?? 'image/png',
    file: asset.file,
  };
}

/**
 * Lets the user teach the service a site/skin's piece appearance once (`enroll`, from a
 * screenshot of the standard starting position) and then import any other screenshot from
 * that same theme as a FEN. See vision/README.md for why this only supports screenshots of
 * digital chess UIs, not photos of a physical board.
 */
export function VisionImportPanel({ onFenScanned }: VisionImportPanelProps) {
  const [themeId, setThemeId] = useState('default');
  const [activeColor, setActiveColor] = useState<'w' | 'b'>('w');
  const [busy, setBusy] = useState<'enroll' | 'scan' | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEnroll = async () => {
    setError(null);
    setMessage(null);
    try {
      const image = await pickScreenshot();
      if (!image) return;
      setBusy('enroll');
      const result = await enrollTheme(themeId.trim(), image);
      setMessage(`"${result.themeId}" 테마 등록 완료 (기물 ${result.squaresEnrolled}개 인식)`);
    } catch (err) {
      setError(err instanceof VisionApiError ? err.message : '테마 등록 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setBusy(null);
    }
  };

  const handleScan = async () => {
    setError(null);
    setMessage(null);
    try {
      const image = await pickScreenshot();
      if (!image) return;
      setBusy('scan');
      const result = await scanScreenshot(themeId.trim(), activeColor, image);
      onFenScanned(result.fen);
      setMessage(
        result.lowConfidenceSquares.length > 0
          ? `불러왔어요. 다만 일부 칸은 확실하지 않아요: ${result.lowConfidenceSquares.join(', ')}`
          : '스크린샷에서 포지션을 불러왔어요.'
      );
    } catch (err) {
      setError(err instanceof VisionApiError ? err.message : '스크린샷 분석 중 알 수 없는 오류가 발생했습니다.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>스크린샷으로 포지션 가져오기</Text>
      <Text style={styles.hint}>
        chess.com/lichess 같은 앱의 체스판 화면을 캡쳐해서 올려주세요. 실제 보드를 입력하고 싶다면 그런 앱에 기물을
        배치한 뒤 캡쳐하면 돼요.
      </Text>

      <TextInput
        style={styles.input}
        value={themeId}
        onChangeText={setThemeId}
        placeholder="테마 이름 (예: chesscom-green)"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.colorRow}>
        <Text style={styles.colorLabel}>지금 누구 차례인가요?</Text>
        <Pressable
          style={[styles.colorButton, activeColor === 'w' && styles.colorButtonSelected]}
          onPress={() => setActiveColor('w')}
        >
          <Text style={activeColor === 'w' ? styles.colorTextSelected : styles.colorText}>백</Text>
        </Pressable>
        <Pressable
          style={[styles.colorButton, activeColor === 'b' && styles.colorButtonSelected]}
          onPress={() => setActiveColor('b')}
        >
          <Text style={activeColor === 'b' ? styles.colorTextSelected : styles.colorText}>흑</Text>
        </Pressable>
      </View>

      <Pressable style={styles.secondaryButton} onPress={handleEnroll} disabled={busy !== null}>
        {busy === 'enroll' ? (
          <ActivityIndicator color="#274b8f" />
        ) : (
          <Text style={styles.secondaryButtonText}>테마 처음 등록하기 (시작 위치 스크린샷)</Text>
        )}
      </Pressable>

      <Pressable style={styles.button} onPress={handleScan} disabled={busy !== null}>
        {busy === 'scan' ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>스크린샷 불러오기</Text>}
      </Pressable>

      {message && <Text style={styles.message}>{message}</Text>}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 360,
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: '#555',
  },
  hint: {
    fontSize: 11,
    color: '#888',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorLabel: {
    fontSize: 12,
    color: '#555',
    flex: 1,
  },
  colorButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  colorButtonSelected: {
    backgroundColor: '#274b8f',
    borderColor: '#274b8f',
  },
  colorText: {
    color: '#555',
  },
  colorTextSelected: {
    color: 'white',
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#274b8f',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#274b8f',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#274b8f',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '700',
  },
  message: {
    color: '#3d5a29',
    fontSize: 12,
  },
  error: {
    color: '#b3261e',
    fontSize: 12,
  },
});
