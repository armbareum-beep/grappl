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

// Supabase Setup
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY; // Prefer Service Key for backend
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.BACKEND_PORT || 3002;

// In-memory job status storage
const jobStatus = {};

// Verify Deployment Endpoint
app.get('/version', (req, res) => {
    res.json({
        version: '1.2.0',
        deployedAt: new Date().toISOString(),
        note: 'Smart Download Logic Enabled'
    });
});

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
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 * 1024 } // 2GB Limit
});

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

// 2. Generate Preview (Async)
app.post('/preview', async (req, res) => {
    const { videoId, filename } = req.body;
    if (!videoId || !filename) {
        return res.status(400).json({ error: 'Missing videoId or filename' });
    }

    const inputPath = path.join(UPLOADS_DIR, filename);
    const outputPath = path.join(PROCESSED_DIR, `${videoId}_preview.mp4`);
    const jobId = uuidv4();

    if (!fs.existsSync(inputPath)) {
        return res.status(404).json({ error: 'Original file not found' });
    }

    // If preview already exists, return immediate success
    if (fs.existsSync(outputPath)) {
        return res.json({
            success: true,
            jobId: 'existing',
            status: 'completed',
            previewUrl: `/temp/processed/${videoId}_preview.mp4`
        });
    }

    // Initialize Job
    jobStatus[jobId] = {
        status: 'processing',
        submittedAt: new Date(),
        type: 'preview',
        videoId
    };

    console.log(`Starting background preview generation for ${videoId} (Job: ${jobId})`);

    // Start FFmpeg in background (do not await)
    ffmpeg(inputPath)
        .size('?x480') // Resize to 480p height, auto width
        .outputOptions('-preset ultrafast') // Optimize for speed
        .outputOptions('-pix_fmt yuv420p') // Ensure compatibility
        .outputOptions('-movflags +faststart') // Enable streaming
        .videoBitrate('800k')
        .output(outputPath)
        .on('end', () => {
            console.log(`Preview generated: ${outputPath}`);
            jobStatus[jobId] = {
                status: 'completed',
                completedAt: new Date(),
                previewUrl: `/temp/processed/${videoId}_preview.mp4`
            };
        })
        .on('error', (err) => {
            console.error('FFmpeg error:', err);
            jobStatus[jobId] = {
                status: 'error',
                error: err.message
            };
        })
        .run();

    // Return Job ID immediately
    res.status(202).json({
        success: true,
        message: 'Preview generation started',
        jobId
    });
});

// Check Job Status
app.get('/status/:jobId', (req, res) => {
    const { jobId } = req.params;

    if (jobId === 'existing') {
        return res.json({ status: 'completed' });
    }

    const job = jobStatus[jobId];

    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
});

// Serve static files from temp/processed for preview playback
app.use('/temp/processed', express.static(PROCESSED_DIR));

// 3. Process & Upload (Cut, Concat, Vimeo)
app.post('/process', async (req, res) => {
    const { videoId, filename, cuts, title, description, drillId, videoType } = req.body;

    if (!videoId || !filename || !cuts || !drillId) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    const inputPath = path.join(UPLOADS_DIR, filename);
    // Explicitly check for both bucket names to satisfy old and new code
    const isRemote = filename.includes('raw_videos/') || filename.includes('raw_videos_v2/') || filename.includes('raw_videos');

    // DISABLE EARLY CHECK: We assume if it's not local, we try to download it remotely.
    // if (!isRemote && !fs.existsSync(inputPath)) {
    //    return res.status(404).json({ error: 'Original file not found' });
    // }

    // Return immediate response (Fire and Forget)
    const processId = uuidv4();
    res.status(202).json({
        success: true,
        message: 'Video processing started in background',
        processId
    });

    console.log(`Starting background processing for ${videoId} (Process ID: ${processId})`);

    // Run in background (do not await)
    (async () => {
        const processDir = path.join(TEMP_DIR, 'processing', processId);
        if (!fs.existsSync(processDir)) {
            fs.mkdirSync(processDir, { recursive: true });
        }

        try {
            // Step 0: Download from Supabase Storage (if needed)
            let localInputPath = path.join(UPLOADS_DIR, filename);

            // FORCE DOWNLOAD if remote OR if file is missing locally
            if (isRemote || !fs.existsSync(localInputPath)) {
                console.log(`Downloading from Supabase Storage: ${filename}`);

                // Determine bucket and file key
                let bucketName = 'raw_videos_v2'; // DEFAULT to V2 for safety
                let fileKey = filename;

                if (filename.includes('raw_videos_v2/')) {
                    bucketName = 'raw_videos_v2';
                    fileKey = filename.replace('raw_videos_v2/', '');
                } else if (filename.includes('raw_videos/')) {
                    bucketName = 'raw_videos';
                    fileKey = filename.replace('raw_videos/', '');
                }
                // Else: It's a naked filename, we use the default 'raw_videos_v2' set above

                console.log(`Attempting download from bucket: ${bucketName}, key: ${fileKey}`);

                let { data, error } = await supabase.storage
                    .from(bucketName)
                    .download(fileKey);

                // Fallback mechanism: If v2 fails, try v1 (only if we started with v2)
                if (error && bucketName === 'raw_videos_v2') {
                    console.warn(`Download failed from ${bucketName}, trying fallback to raw_videos...`);
                    const fallback = await supabase.storage.from('raw_videos').download(fileKey);

                    if (fallback.error) {
                        throw new Error(`Download failed from both buckets: ${error.message} / ${fallback.error.message}`);
                    }
                    data = fallback.data;
                    error = null;
                } else if (error) {
                    throw new Error(`Download failed from ${bucketName}: ${error.message}`);
                }

                // Save to local
                const arrayBuffer = await data.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Save flatly to UPLOADS_DIR using basename
                localInputPath = path.join(UPLOADS_DIR, path.basename(filename));
                fs.writeFileSync(localInputPath, buffer);
                console.log(`Downloaded to ${localInputPath}`);

            } else {
                console.log(`Local file found: ${localInputPath}`);
            }

            // Step 1: Create segments
            const segmentPaths = [];
            const inputPath = localInputPath; // Use the downloaded path
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

                    // Update Supabase
                    const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
                    const thumbnailUrl = `https://vumbnail.com/${vimeoId}.jpg`;

                    supabase.from('drills')
                        .update({
                            [columnToUpdate]: vimeoId,
                            ...(videoType === 'action' ? { thumbnail_url: thumbnailUrl } : {})
                        })
                        .eq('id', drillId)
                        .then(({ error }) => {
                            if (error) console.error('Supabase Update Error:', error);
                            else console.log(`Supabase updated for drill ${drillId} (${columnToUpdate})`);
                        });
                },
                function (bytes_uploaded, bytes_total) {
                    const percentage = (bytes_uploaded / bytes_total * 100).toFixed(2);
                    console.log(`Upload progress: ${percentage}%`);
                },
                function (error) {
                    console.error('Vimeo Upload Error:', error);
                    // Update Supabase with Error
                    const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
                    supabase.from('drills')
                        .update({
                            [columnToUpdate]: 'error', // Or keep empty but change thumbnail
                            ...(videoType === 'action' ? { thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Upload+Error' } : {})
                        })
                        .eq('id', drillId)
                        .then(() => console.log('Marked as error in DB'));
                }
            );

        } catch (error) {
            console.error('Processing failed:', error);
            // Catch-all Error Update
            const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
            try {
                await supabase.from('drills')
                    .update({
                        // We set a special flag or just a visual error thumbnail
                        ...(videoType === 'action' ? { thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Processing+Error' } : {})
                    })
                    .eq('id', drillId);
                console.log('Marked as critical error in DB');
            } catch (dbErr) {
                console.error('Failed to update DB with error:', dbErr);
            }
        }
    })();
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
