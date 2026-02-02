const fs = require('fs');
const fetch = require('node-fetch');

const data = JSON.parse(fs.readFileSync('backend/prod_lessons_remaining.json', 'utf8'));

const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

async function run() {
    let sql = '';
    console.log(`Processing ${data.length} records...`);

    for (const record of data) {
        const vimeoVal = record.vimeo_url;
        if (!vimeoVal) continue;

        let vimeoId, vimeoHash;
        if (vimeoVal.includes(':')) {
            [vimeoId, vimeoHash] = vimeoVal.split(':');
        } else {
            vimeoId = vimeoVal;
        }

        const oembedUrl = `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${vimeoId}${vimeoHash ? `/${vimeoHash}` : ''}`;

        try {
            const res = await fetch(oembedUrl);
            if (res.ok) {
                const info = await res.json();
                const seconds = info.duration;
                const length = formatDuration(seconds);
                const duration_minutes = Math.floor(seconds / 60);

                sql += `UPDATE lessons SET length = '${length}', duration_minutes = ${duration_minutes} WHERE id = '${record.id}';\n`;
                console.log(`✅ ${record.title}: ${length}`);
            } else {
                console.warn(`❌ ${record.title} (${vimeoId}): ${res.status}`);
            }
        } catch (e) {
            console.error(`Error for ${record.title}:`, e.message);
        }
    }

    fs.writeFileSync('backend/update_durations_remaining.sql', sql);
    console.log('\nSQL generated in backend/update_durations_remaining.sql');
}

run();
