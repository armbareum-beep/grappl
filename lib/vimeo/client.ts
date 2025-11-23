/**
 * Vimeo API 클라이언트 (브라우저용)
 * Note: @vimeo/vimeo는 Node.js 전용이므로 직접 REST API 호출
 */

const VIMEO_API_BASE = 'https://api.vimeo.com';

/**
 * Vimeo API 설정 확인
 */
export function isVimeoConfigured(): boolean {
    return !!(
        import.meta.env.VITE_VIMEO_CLIENT_ID &&
        import.meta.env.VITE_VIMEO_CLIENT_SECRET &&
        import.meta.env.VITE_VIMEO_ACCESS_TOKEN
    );
}

/**
 * Vimeo API 요청 헬퍼
 */
async function vimeoRequest(path: string, options: RequestInit = {}) {
    const token = import.meta.env.VITE_VIMEO_ACCESS_TOKEN;

    const response = await fetch(`${VIMEO_API_BASE}${path}`, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });

    if (!response.ok) {
        throw new Error(`Vimeo API error: ${response.statusText}`);
    }

    return response.json();
}

/**
 * 업로드 링크 생성
 */
export async function createUploadLink(fileSize: number, name: string, description: string = '') {
    return vimeoRequest('/me/videos', {
        method: 'POST',
        body: JSON.stringify({
            upload: {
                approach: 'tus',
                size: fileSize
            },
            name,
            description,
            privacy: {
                view: 'unlisted',
                embed: 'public'
            }
        })
    });
}

/**
 * Vimeo 영상 정보 조회
 */
export async function getVimeoVideo(videoId: string) {
    return vimeoRequest(`/videos/${videoId}`);
}

/**
 * Vimeo 영상 삭제
 */
export async function deleteVimeoVideo(videoId: string) {
    return vimeoRequest(`/videos/${videoId}`, {
        method: 'DELETE'
    });
}
