/**
 * Vimeo API 클라이언트 (보안 프록시용)
 * 모든 민감한 호출은 백엔드 서버를 거쳐 처리됩니다.
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (import.meta.env.DEV ? 'http://localhost:3003' : 'https://grapplay-backend.onrender.com');

/**
 * Vimeo API 설정 확인 (백엔드 URL 존재 여부 확인)
 */
export function isVimeoConfigured(): boolean {
    return !!BACKEND_URL;
}

/**
 * Vimeo 영상 정보 조회 (백엔드 프록시 사용)
 */
export async function getVimeoVideo(videoId: string) {
    const response = await fetch(`${BACKEND_URL}/api/vimeo/video/${videoId}`);

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to fetch Vimeo video: ${response.statusText}`);
    }

    return response.json();
}

/**
 * 업로드 링크 생성 (백엔드 프록시 사용)
 */
export async function createUploadLink(fileSize: number, name: string, description: string = '') {
    const response = await fetch(`${BACKEND_URL}/api/vimeo/upload-link`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            fileSize,
            name,
            description
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to create Vimeo upload link: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Vimeo 영상 삭제 (백엔드 프록시 사용)
 */
export async function deleteVimeoVideo(videoId: string) {
    const response = await fetch(`${BACKEND_URL}/api/vimeo/video/${videoId}`, {
        method: 'DELETE'
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to delete Vimeo video: ${response.statusText}`);
    }

    return true;
}
