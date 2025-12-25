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
const https = require('https');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);

// Helper: Download file from URL
async function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, response => {
            if (response.statusCode === 404) {
                reject(new Error(`File not found (404): The file does not exist in Supabase Storage. URL: ${url}`));
                return;
            }
            if (response.statusCode === 400) {
                reject(new Error(`Bad request (400): The file may not have been uploaded successfully. URL: ${url}`));
                return;
            }
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download file: HTTP ${response.statusCode}. URL: ${url}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
            file.on('error', err => {
                fs.unlink(dest, () => { }); // Delete failed file
                reject(err);
            });
        }).on('error', err => {
            fs.unlink(dest, () => { });
            reject(err);
        });
    });
}

// Support both standard and VITE_ prefixed environment variables for flexibility
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;

if (!supabaseUrl || !supabaseKey) {
    console.warn('CRITICAL WARNING: Missing Supabase Environment Variables');
    console.warn('Server starting in RESTRICTED MODE. Database operations will fail.');
} else {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
    } catch (err) {
        console.error('Failed to initialize Supabase client:', err.message);
    }
}

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3002;

// Middleware (MUST be before routes)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id']
}));
app.options('*', cors()); // Enable pre-flight for all routes
app.use(express.json());

// In-memory job status storage
const jobStatus = {};

// Basic Health Check (Root)
app.get('/', (req, res) => {
    res.send('Grappl Backend is Running!');
});

// Verify Deployment Endpoint
app.get('/version', (req, res) => {
    res.json({
        version: '1.6.0',
        note: 'Fixed environment variable names to match Render config (SUPABASE_SERVICE_ROLE_KEY)',
        supabaseConnected: !!supabase,
        isServiceRole: !!(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY),
        envCheck: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey,
            urlValue: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'MISSING',
            keySource: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' :
                process.env.SUPABASE_SERVICE_KEY ? 'SUPABASE_SERVICE_KEY' :
                    process.env.VITE_SUPABASE_ANON_KEY ? 'VITE_SUPABASE_ANON_KEY' : 'NONE'
        },
        vimeoCheck: {
            hasClientId: !!process.env.VITE_VIMEO_CLIENT_ID,
            hasSecret: !!process.env.VITE_VIMEO_CLIENT_SECRET,
            hasToken: !!process.env.VITE_VIMEO_ACCESS_TOKEN
        }
    });
});

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

// Helper: Log to Database
async function logToDB(processId, level, message, details = {}) {
    if (!supabase) return;
    try {
        // Fire and forget - don't await to avoid slowing down processing
        supabase.from('system_logs').insert({
            process_id: processId,
            level,
            message,
            details
        }).then(({ error }) => {
            if (error) console.error('Log DB Error:', error);
        });
    } catch (e) {
        console.error('Log DB Exception:', e);
    }
}

// 3. Process & Upload (Cut, Concat, Vimeo)
app.post('/process', async (req, res) => {
    const { videoId, filename, cuts, title, description, drillId, lessonId, videoType, sparringId } = req.body;

    // Validate: exactly one of drillId, lessonId, or sparringId must be present
    const idCount = [drillId, lessonId, sparringId].filter(id => !!id).length;
    if (idCount === 0) {
        return res.status(400).json({ error: 'One of drillId, lessonId, or sparringId is required' });
    }
    if (idCount > 1) {
        return res.status(400).json({ error: 'Cannot specify multiple content IDs (drill, lesson, sparring)' });
    }

    if (!videoId || !filename || !cuts) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    const isLesson = !!lessonId;
    const isSparring = !!sparringId;
    const contentId = isLesson ? lessonId : (isSparring ? sparringId : drillId);
    const tableName = isLesson ? 'lessons' : (isSparring ? 'sparring_videos' : 'drills');
    const processId = uuidv4();

    // Immediate response
    res.status(202).json({
        success: true,
        message: 'Video processing started in background',
        processId
    });

    console.log(`Starting background processing for ${videoId} (Process ID: ${processId}, ${tableName}: ${contentId})`);
    logToDB(processId, 'info', 'Job Received', { videoId, filename, cutsCount: cuts.length, contentId, tableName });

    // Run in background
    (async () => {
        if (!supabase) {
            console.error('CRITICAL: Supabase client is not initialized');
            return;
        }

        const processDir = path.join(TEMP_DIR, 'processing', processId);
        if (!fs.existsSync(processDir)) {
            fs.mkdirSync(processDir, { recursive: true });
        }

        try {
            console.log('[DEBUG] Step 1: Downloading File');
            logToDB(processId, 'info', 'Step 1: Downloading File');

            // Step 0: Download from Supabase Storage
            const isRemote = filename.includes('raw_videos/') || filename.includes('raw_videos_v2/') || filename.includes('raw_videos');
            console.log('[DEBUG] filename:', filename);
            console.log('[DEBUG] isRemote:', isRemote);

            // Extract bucket name and file key
            let bucketName = 'raw_videos_v2';
            let fileKey = filename;

            if (filename.includes('raw_videos_v2/')) {
                bucketName = 'raw_videos_v2';
                fileKey = filename.replace('raw_videos_v2/', '');
            } else if (filename.includes('raw_videos/')) {
                bucketName = 'raw_videos';
                fileKey = filename.replace('raw_videos/', '');
            }

            // Use fileKey for local path to avoid creating subdirectories
            let localInputPath = path.join(UPLOADS_DIR, fileKey);
            console.log('[DEBUG] localInputPath:', localInputPath);
            console.log('[DEBUG] fs.existsSync(localInputPath):', fs.existsSync(localInputPath));

            if (isRemote || !fs.existsSync(localInputPath)) {
                console.log('[DEBUG] Entering download block');
                console.log('[DEBUG] bucketName:', bucketName, 'fileKey:', fileKey);
                logToDB(processId, 'info', `Downloading from ${bucketName}`, { fileKey });

                // Use public URL since bucket is now public
                console.log('[DEBUG] Getting public URL...');
                const { data: publicUrlData } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(fileKey);

                console.log('[DEBUG] publicUrlData:', publicUrlData);
                if (!publicUrlData || !publicUrlData.publicUrl) {
                    throw new Error(`Failed to get public URL for ${fileKey}`);
                }

                console.log('[DEBUG] Using public URL:', publicUrlData.publicUrl);
                logToDB(processId, 'info', 'Using public URL', { url: publicUrlData.publicUrl });
                await downloadFile(publicUrlData.publicUrl, localInputPath);
                console.log('[DEBUG] Download Complete');
                logToDB(processId, 'info', 'Download Complete');
            } else {
                console.log('[DEBUG] Using Local File');
                logToDB(processId, 'info', 'Using Local File');
            }

            // Step 1: Create segments
            logToDB(processId, 'info', 'Step 2: Cutting Video', { cuts });
            const segmentPaths = [];
            const inputPath = localInputPath;

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
            logToDB(processId, 'info', 'Cuts Created');

            // Step 2: Create concat list
            const concatListPath = path.join(processDir, 'concat_list.txt');
            const concatFileContent = segmentPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n');
            fs.writeFileSync(concatListPath, concatFileContent);

            // Step 3: Concat segments
            logToDB(processId, 'info', 'Step 3: Concatenating');
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
            logToDB(processId, 'info', 'Concatenation Complete', { finalPath });


            // Step 4: Upload to Vimeo with Timeout and Retry
            logToDB(processId, 'info', 'Step 4: Uploading to Vimeo');

            // Validate Vimeo credentials
            const vimeoClientId = process.env.VITE_VIMEO_CLIENT_ID;
            const vimeoSecret = process.env.VITE_VIMEO_CLIENT_SECRET;
            const vimeoToken = process.env.VITE_VIMEO_ACCESS_TOKEN;

            if (!vimeoClientId || !vimeoSecret || !vimeoToken) {
                throw new Error('Missing Vimeo API credentials. Check environment variables.');
            }

            logToDB(processId, 'info', 'Vimeo credentials validated');

            const Vimeo = require('vimeo').Vimeo;
            const client = new Vimeo(vimeoClientId, vimeoSecret, vimeoToken);

            // Helper function to upload to Vimeo with timeout
            const uploadToVimeoWithTimeout = (filePath, metadata, timeoutMs = 600000) => {
                return new Promise((resolve, reject) => {
                    let uploadCompleted = false;
                    let lastProgress = 0;

                    // Set timeout (default 10 minutes)
                    const timeoutId = setTimeout(() => {
                        if (!uploadCompleted) {
                            const errorMsg = `Vimeo upload timed out after ${timeoutMs / 1000}s (last progress: ${lastProgress}%)`;
                            logToDB(processId, 'error', errorMsg);
                            reject(new Error(errorMsg));
                        }
                    }, timeoutMs);

                    client.upload(
                        filePath,
                        metadata,
                        function (uri) {
                            uploadCompleted = true;
                            clearTimeout(timeoutId);
                            resolve(uri);
                        },
                        function (bytes_uploaded, bytes_total) {
                            const percentage = (bytes_uploaded / bytes_total * 100).toFixed(2);
                            lastProgress = parseFloat(percentage);

                            // Log every 20% to track progress
                            if (Math.floor(percentage) % 20 === 0 && Math.floor(percentage) !== 0) {
                                logToDB(processId, 'info', `Vimeo upload progress: ${percentage}%`, {
                                    bytes_uploaded,
                                    bytes_total
                                });
                            }
                        },
                        function (error) {
                            uploadCompleted = true;
                            clearTimeout(timeoutId);
                            reject(error);
                        }
                    );
                });
            };

            // Retry logic for Vimeo upload
            let uploadSuccess = false;
            let lastError = null;
            const maxRetries = 2;

            for (let attempt = 1; attempt <= maxRetries && !uploadSuccess; attempt++) {
                try {
                    logToDB(processId, 'info', `Vimeo upload attempt ${attempt}/${maxRetries}`, {
                        fileSize: fs.statSync(finalPath).size,
                        title: title
                    });

                    const uri = await uploadToVimeoWithTimeout(
                        finalPath,
                        {
                            'name': title || 'Edited Video',
                            'description': description || 'Edited with Grappl Editor',
                            'privacy': { 'view': 'anybody', 'embed': 'public' }
                        },
                        600000 // 10 minute timeout
                    );

                    // Success!
                    uploadSuccess = true;
                    logToDB(processId, 'info', 'Vimeo Upload Success', { uri, attempt });

                    const vimeoId = uri.split('/').pop();
                    const thumbnailUrl = `https://vumbnail.com/${vimeoId}.jpg`;

                    // Update the correct table based on content type
                    if (isLesson) {
                        // Update lessons table
                        const { error: updateError } = await supabase.from('lessons')
                            .update({
                                vimeo_url: vimeoId,
                                thumbnail_url: thumbnailUrl
                            })
                            .eq('id', lessonId);

                        if (updateError) {
                            console.error('Supabase Update Error:', updateError);
                            logToDB(processId, 'error', 'DB Update Failed', { error: updateError.message });
                        } else {
                            console.log(`Supabase updated for lesson ${lessonId}`);
                            logToDB(processId, 'info', 'Job Fully Complete', {
                                lessonId,
                                vimeoId,
                                videoType
                            });
                        }
                    } else if (isSparring) {
                        // Update sparring_videos table
                        const { error: updateError } = await supabase.from('sparring_videos')
                            .update({
                                video_url: vimeoId, // Note: using video_url specifically for sparring
                                thumbnail_url: thumbnailUrl
                            })
                            .eq('id', sparringId);

                        if (updateError) {
                            console.error('Supabase Update Error:', updateError);
                            logToDB(processId, 'error', 'DB Update Failed', { error: updateError.message });
                        } else {
                            console.log(`Supabase updated for sparring ${sparringId}`);
                            logToDB(processId, 'info', 'Job Fully Complete', {
                                sparringId,
                                vimeoId,
                                videoType
                            });
                        }
                    } else {
                        // Update drills table
                        const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
                        const { error: updateError } = await supabase.from('drills')
                            .update({
                                [columnToUpdate]: vimeoId,
                                ...(videoType === 'action' ? { thumbnail_url: thumbnailUrl } : {})
                            })
                            .eq('id', drillId);

                        if (updateError) {
                            console.error('Supabase Update Error:', updateError);
                            logToDB(processId, 'error', 'DB Update Failed', { error: updateError.message });
                        } else {
                            console.log(`Supabase updated for drill ${drillId}`);
                            logToDB(processId, 'info', 'Job Fully Complete', {
                                drillId,
                                vimeoId,
                                videoType
                            });
                        }
                    }

                } catch (err) {
                    lastError = err;
                    logToDB(processId, 'warn', `Vimeo upload attempt ${attempt} failed`, {
                        error: err.message,
                        willRetry: attempt < maxRetries
                    });

                    if (attempt < maxRetries) {
                        // Wait before retry (exponential backoff)
                        const waitTime = Math.min(5000 * Math.pow(2, attempt - 1), 30000);
                        logToDB(processId, 'info', `Waiting ${waitTime}ms before retry`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            }

            // If all retries failed
            if (!uploadSuccess) {
                logToDB(processId, 'error', 'Vimeo Upload Failed After All Retries', {
                    error: lastError?.message,
                    attempts: maxRetries
                });

                if (isLesson) {
                    await supabase.from('lessons')
                        .update({
                            vimeo_url: 'error',
                            thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Upload+Error'
                        })
                        .eq('id', lessonId);
                } else if (isSparring) {
                    await supabase.from('sparring_videos')
                        .update({
                            video_url: 'error',
                            thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Upload+Error'
                        })
                        .eq('id', sparringId);
                } else {
                    const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
                    await supabase.from('drills')
                        .update({
                            [columnToUpdate]: 'error',
                            ...(videoType === 'action' ? {
                                thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Upload+Error'
                            } : {})
                        })
                        .eq('id', drillId);
                }

                throw lastError || new Error('Vimeo upload failed');
            }


        } catch (error) {
            console.error('Processing failed:', error);
            logToDB(processId, 'error', 'Processing Crash', { message: error.message, stack: error.stack });

            try {
                if (isLesson) {
                    await supabase.from('lessons')
                        .update({
                            vimeo_url: `ERROR: ${error.message}`.substring(0, 100),
                            thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Error'
                        })
                        .eq('id', lessonId);
                } else if (isSparring) {
                    await supabase.from('sparring_videos')
                        .update({
                            video_url: `ERROR: ${error.message}`.substring(0, 100),
                            thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Error'
                        })
                        .eq('id', sparringId);
                } else {
                    const columnToUpdate = videoType === 'action' ? 'vimeo_url' : 'description_video_url';
                    await supabase.from('drills')
                        .update({
                            [columnToUpdate]: `ERROR: ${error.message}`.substring(0, 100),
                            ...(videoType === 'action' ? { thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Error' } : {})
                        })
                        .eq('id', drillId);
                }
            } catch (dbErr) {
                console.error('Failed to update DB with error:', dbErr);
            }
        }
    })();
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
