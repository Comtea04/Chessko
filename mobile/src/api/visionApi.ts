export interface EnrollResponse {
  themeId: string;
  squaresEnrolled: number;
}

export interface ScanResponse {
  fen: string;
  activeColor: 'w' | 'b';
  lowConfidenceSquares: string[];
}

/** A screenshot picked via expo-image-picker, normalized for upload on web and native. */
export interface PickedImage {
  uri: string;
  name: string;
  mimeType: string;
  /** Present on web only (see expo-image-picker's `ImagePickerAsset.file`). */
  file?: File;
}

// Override via mobile/.env.local when running on a device/emulator instead of Expo web.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:8080';

export class VisionApiError extends Error {}

function buildFormData(image: PickedImage): FormData {
  const formData = new FormData();
  if (image.file) {
    formData.append('image', image.file, image.name);
  } else {
    // React Native's FormData accepts this { uri, name, type } shape for native file parts;
    // it isn't a real Blob, hence the cast.
    formData.append('image', { uri: image.uri, name: image.name, type: image.mimeType } as unknown as Blob);
  }
  return formData;
}

async function parseErrorMessage(response: Response, fallback: string): Promise<string> {
  const body: { message?: string } | null = await response.json().catch(() => null);
  return body?.message ?? fallback;
}

export async function enrollTheme(themeId: string, image: PickedImage): Promise<EnrollResponse> {
  let response: Response;
  try {
    response = await fetch(
      `${API_BASE_URL}/api/v1/vision/themes/${encodeURIComponent(themeId)}/enroll`,
      { method: 'POST', body: buildFormData(image) }
    );
  } catch {
    throw new VisionApiError('이미지 인식 서버에 연결할 수 없습니다.');
  }

  if (!response.ok) {
    throw new VisionApiError(await parseErrorMessage(response, '테마 등록에 실패했습니다.'));
  }
  return response.json();
}

export async function scanScreenshot(
  themeId: string,
  activeColor: 'w' | 'b',
  image: PickedImage
): Promise<ScanResponse> {
  const params = new URLSearchParams({ themeId, activeColor });
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/vision/scan?${params.toString()}`, {
      method: 'POST',
      body: buildFormData(image),
    });
  } catch {
    throw new VisionApiError('이미지 인식 서버에 연결할 수 없습니다.');
  }

  if (!response.ok) {
    throw new VisionApiError(await parseErrorMessage(response, '스크린샷 분석에 실패했습니다.'));
  }
  return response.json();
}
