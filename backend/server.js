const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');
require('dotenv').config({ path: '../.env' }); // Load from root .env

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
const PORT = process.env.BACKEND_PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// Ensure temp directories exist
const TEMP_DIR = path.join(__dirname, 'temp');
const UPLOADS_DIR = path.join(TEMP_DIR, 'uploads');
const PROCESSED_DIR = path.join(TEMP_DIR, 'processed');

[TEMP_DIR, UPLOADS_DIR, PROCESSED_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Multer setup for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = multer({ storage });

// Routes

// 1. Upload Raw Video
app.post('/upload', upload.single('video'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
    }

    const videoPath = req.file.path;
    const videoId = path.parse(req.file.filename).name; // UUID without extension

    res.json({
        success: true,
        videoId,
        originalPath: videoPath,
        filename: req.file.filename
    });
});

// 2. Generate Preview (480p)
app.post('/preview', async (req, res) => {
    const { videoId, filename } = req.body;
    if (!videoId || !filename) {
        return res.status(400).json({ error: 'Missing videoId or filename' });
    }

    const inputPath = path.join(UPLOADS_DIR, filename);
    const outputPath = path.join(PROCESSED_DIR, `${videoId}_preview.mp4`);

    if (!fs.existsSync(inputPath)) {
        return res.status(404).json({ error: 'Original file not found' });
    }

    // If preview already exists, return it
    if (fs.existsSync(outputPath)) {
        return res.json({
            success: true,
            previewUrl: `/temp/processed/${videoId}_preview.mp4`
        });
    }

    console.log(`Generating preview for ${videoId}...`);

    ffmpeg(inputPath)
        .size('?x480') // Resize to 480p height, auto width
        .videoBitrate('800k')
        .output(outputPath)
        .on('end', () => {
            console.log(`Preview generated: ${outputPath}`);
            res.json({
                success: true,
                previewUrl: `/temp/processed/${videoId}_preview.mp4`
            });
        })
        .on('error', (err) => {
            console.error('FFmpeg error:', err);
            res.status(500).json({ error: 'Preview generation failed' });
        })
        .run();
});

// Serve static files from temp/processed for preview playback
app.use('/temp/processed', express.static(PROCESSED_DIR));

// 3. Process & Upload (Cut, Concat, Vimeo)
app.post('/process', async (req, res) => {
    const { videoId, filename, cuts, title, description } = req.body;

    if (!videoId || !filename || !cuts || !Array.isArray(cuts) || cuts.length === 0) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    const inputPath = path.join(UPLOADS_DIR, filename);
    if (!fs.existsSync(inputPath)) {
        return res.status(404).json({ error: 'Original file not found' });
    }

    const processId = uuidv4();
    const processDir = path.join(TEMP_DIR, 'processing', processId);
    if (!fs.existsSync(processDir)) {
        fs.mkdirSync(processDir, { recursive: true });
    }

    try {
        console.log(`Starting processing for ${videoId} (Process ID: ${processId})`);

        // Step 1: Create segments
        const segmentPaths = [];
        for (let i = 0; i < cuts.length; i++) {
            const cut = cuts[i];
            const segmentPath = path.join(processDir, `part_${i}.mp4`);

            await new Promise((resolve, reject) => {
                ffmpeg(inputPath)
                    .setStartTime(cut.start)
                    .setDuration(cut.end - cut.start)
                    .outputOptions(['-c copy', '-avoid_negative_ts 1'])
                    .output(segmentPath)
                    .on('end', resolve)
                    .on('error', reject)
                    .run();
            });
            segmentPaths.push(segmentPath);
        }

        // Step 2: Create concat list
        const concatListPath = path.join(processDir, 'concat_list.txt');
        const concatFileContent = segmentPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
        fs.writeFileSync(concatListPath, concatFileContent);

        // Step 3: Concat segments
        const finalPath = path.join(processDir, 'final.mp4');
        await new Promise((resolve, reject) => {
            ffmpeg()
                .input(concatListPath)
                .inputOptions(['-f concat', '-safe 0'])
                .outputOptions(['-c copy'])
                .output(finalPath)
                .on('end', resolve)
                .on('error', reject)
                .run();
        });

        console.log(`Video processing complete: ${finalPath}`);

        // Step 4: Upload to Vimeo
        const Vimeo = require('vimeo').Vimeo;
        const client = new Vimeo(
            process.env.VITE_VIMEO_CLIENT_ID,
            process.env.VITE_VIMEO_CLIENT_SECRET,
            process.env.VITE_VIMEO_ACCESS_TOKEN
        );

        console.log('Uploading to Vimeo...');

        client.upload(
            finalPath,
            {
                'name': title || 'Edited Video',
                'description': description || 'Edited with Grappl Editor',
                'privacy': {
                    'view': 'anybody',
                    'embed': 'public'
                }
            },
            function (uri) {
                console.log('Vimeo Upload URI:', uri);
                const vimeoId = uri.split('/').pop();

                // Return immediate response with vumbnail URL
                res.json({
                    success: true,
                    videoId: vimeoId,
                    uri: uri,
                    vimeoUrl: `https://vimeo.com/${vimeoId}`,
                    thumbnailUrl: `https://vumbnail.com/${vimeoId}.jpg`
                });
            },
            function (bytes_uploaded, bytes_total) {
                const percentage = (bytes_uploaded / bytes_total * 100).toFixed(2);
                console.log(`Upload progress: ${percentage}%`);
            },
            function (error) {
                console.error('Vimeo Upload Error:', error);
                res.status(500).json({ error: 'Vimeo upload failed: ' + error });
            }
        );

    } catch (error) {
        console.error('Processing failed:', error);
        res.status(500).json({ error: 'Processing failed: ' + error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
