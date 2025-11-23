import { Vimeo } from '@vimeo/vimeo';

// Vimeo 클라이언트 초기화
const vimeoClient = new Vimeo(
    import.meta.env.VITE_VIMEO_CLIENT_ID || '',
    import.meta.env.VITE_VIMEO_CLIENT_SECRET || '',
    import.meta.env.VITE_VIMEO_ACCESS_TOKEN || ''
);

export default vimeoClient;

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
 * Vimeo 영상 정보 조회
 */
export async function getVimeoVideo(videoId: string) {
    return new Promise((resolve, reject) => {
        vimeoClient.request(
            {
                method: 'GET',
                path: `/videos/${videoId}`
            },
            (error, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            }
        );
    });
}

/**
 * Vimeo 영상 삭제
 */
export async function deleteVimeoVideo(videoId: string) {
    return new Promise((resolve, reject) => {
        vimeoClient.request(
            {
                method: 'DELETE',
                path: `/videos/${videoId}`
            },
            (error, body) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(body);
                }
            }
        );
    });
}
