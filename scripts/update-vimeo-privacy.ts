/**
 * 기존 Vimeo 영상들의 프라이버시 설정을 일괄 업데이트
 * 실행: npx ts-node scripts/update-vimeo-privacy.ts
 */

const VIMEO_TOKEN = process.env.VIMEO_ACCESS_TOKEN || '';

if (!VIMEO_TOKEN) {
    console.error('VIMEO_ACCESS_TOKEN 환경변수가 필요합니다.');
    process.exit(1);
}

const PRIVACY_SETTINGS = {
    privacy: {
        view: 'disable',
        embed: 'whitelist'
    },
    embed_domains: ['grapplay.com', 'www.grapplay.com', 'localhost']
};

async function getAllVideos(): Promise<any[]> {
    const videos: any[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
        const response = await fetch(
            `https://api.vimeo.com/me/videos?per_page=${perPage}&page=${page}`,
            {
                headers: {
                    'Authorization': `Bearer ${VIMEO_TOKEN}`,
                    'Accept': 'application/vnd.vimeo.*+json;version=3.4'
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to fetch videos: ${await response.text()}`);
        }

        const data = await response.json();
        videos.push(...data.data);

        console.log(`페이지 ${page} 로드 완료 (${data.data.length}개)`);

        if (data.data.length < perPage) break;
        page++;
    }

    return videos;
}

async function updateVideoPrivacy(videoId: string, videoName: string): Promise<boolean> {
    try {
        const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${VIMEO_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.vimeo.*+json;version=3.4'
            },
            body: JSON.stringify(PRIVACY_SETTINGS)
        });

        if (!response.ok) {
            const error = await response.text();
            console.error(`  ❌ ${videoName} (${videoId}): ${error}`);
            return false;
        }

        console.log(`  ✅ ${videoName} (${videoId})`);
        return true;
    } catch (error) {
        console.error(`  ❌ ${videoName} (${videoId}): ${error}`);
        return false;
    }
}

async function main() {
    console.log('🔍 Vimeo 영상 목록 가져오는 중...\n');

    const videos = await getAllVideos();
    console.log(`\n📹 총 ${videos.length}개 영상 발견\n`);

    if (videos.length === 0) {
        console.log('업데이트할 영상이 없습니다.');
        return;
    }

    console.log('🔒 프라이버시 설정 업데이트 중...\n');
    console.log('설정:', JSON.stringify(PRIVACY_SETTINGS, null, 2), '\n');

    let success = 0;
    let failed = 0;

    for (const video of videos) {
        const videoId = video.uri.split('/').pop();
        const result = await updateVideoPrivacy(videoId, video.name);

        if (result) success++;
        else failed++;

        // Rate limit 방지 (초당 1개)
        await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n========== 완료 ==========');
    console.log(`✅ 성공: ${success}개`);
    console.log(`❌ 실패: ${failed}개`);
    console.log(`📹 총: ${videos.length}개`);
}

main().catch(console.error);
