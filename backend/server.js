const express = require('express');
const cors = require('cors');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const ffmpegPath = require('ffmpeg-static');
// Load environment variables - Priority: .env.local > .env.production > .env
// dotenv does not overwrite variables already set in process.env, 
// so the first one to set a variable "wins".
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env.production') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

console.log('[DEBUG] Env Loading Check:');
console.log('SUPABASE_SERVICE_ROLE_KEY present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('SUPABASE_SERVICE_KEY present:', !!process.env.SUPABASE_SERVICE_KEY);
console.log('VITE_SUPABASE_ANON_KEY present:', !!process.env.VITE_SUPABASE_ANON_KEY);
console.log('Selected supabaseKey length:', supabaseKey ? supabaseKey.length : 0);

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

// --- FILE LOGGER SETUP ---
const DEBUG_LOG_PATH = path.join(__dirname, 'server_debug.log');
function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    try { fs.appendFileSync(DEBUG_LOG_PATH, logLine); } catch (e) { }
}
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

function serializeArg(a) {
    if (a instanceof Error) {
        return `${a.name}: ${a.message}\n${a.stack}`;
    }
    return typeof a === 'object' ? JSON.stringify(a) : a;
}

console.log = function (...args) {
    originalConsoleLog.apply(console, args);
    logToFile(`INFO: ${args.map(serializeArg).join(' ')}`);
};
console.error = function (...args) {
    originalConsoleError.apply(console, args);
    logToFile(`ERROR: ${args.map(serializeArg).join(' ')}`);
};

console.log('[DEBUG] --- Backend Startup Check ---');
console.log('[DEBUG] Current Working Directory:', process.cwd());
console.log('[DEBUG] Supabase URL:', supabaseUrl);
console.log('[DEBUG] Loading Priority: .env.local -> .env.production -> .env');
// -------------------------

const PORT = process.env.PORT || process.env.BACKEND_PORT || 3003;

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

app.get('/debug-logs', (req, res) => {
    try {
        if (fs.existsSync(DEBUG_LOG_PATH)) {
            const logs = fs.readFileSync(DEBUG_LOG_PATH, 'utf8');
            res.set('Content-Type', 'text/plain');
            res.send(logs);
        } else {
            res.send('No logs found.');
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
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
            hasClientId: !!(process.env.VIMEO_CLIENT_ID || process.env.VITE_VIMEO_CLIENT_ID),
            hasSecret: !!(process.env.VIMEO_CLIENT_SECRET || process.env.VITE_VIMEO_CLIENT_SECRET),
            hasToken: !!(process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN)
        }
    });
});

// Public Sparring API (Bypass RLS for Landing Page)
app.get('/api/sparring/public', async (req, res) => {
    try {
        console.log('[API] Fetching public sparring videos via Service Role');

        // 1. Fetch videos directly (no join)
        const { data: videos, error: videoError } = await supabase
            .from('sparring_videos')
            .select('*')
            .limit(20)
            .order('created_at', { ascending: false });

        if (videoError) throw videoError;

        if (!videos || videos.length === 0) {
            return res.json([]);
        }

        // 2. Extract creator IDs
        const creatorIds = [...new Set(videos.map(v => v.creator_id))];

        // 3. Fetch creators manually
        const { data: creators, error: creatorError } = await supabase
            .from('creators')
            .select('id, name, profile_image')
            .in('id', creatorIds);

        if (creatorError) {
            console.warn('Failed to fetch creators for manual join', creatorError);
            // Return videos without creator info if creator fetch fails
            return res.json(videos.map(v => ({ ...v, creator: null })));
        }

        // 4. Map creators to videos
        const creatorMap = (creators || []).reduce((acc, c) => {
            acc[c.id] = c;
            return acc;
        }, {});

        const joinedData = videos.map(video => ({
            ...video,
            creator: creatorMap[video.creator_id] || { name: 'Unknown', profile_image: '' }
        }));

        res.json(joinedData);
    } catch (error) {
        console.error('Failed to fetch public sparring videos:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

// --- Secure Vimeo Proxy Endpoints ---

// 1. Create Upload Link
app.post('/api/vimeo/upload-link', async (req, res) => {
    const { fileSize, name, description } = req.body;

    const vimeoClientId = process.env.VIMEO_CLIENT_ID || process.env.VITE_VIMEO_CLIENT_ID;
    const vimeoSecret = process.env.VIMEO_CLIENT_SECRET || process.env.VITE_VIMEO_CLIENT_SECRET;
    const vimeoToken = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN;

    console.log('[Vimeo] Token sources:', {
        VIMEO_ACCESS_TOKEN: !!process.env.VIMEO_ACCESS_TOKEN,
        VITE_VIMEO_ACCESS_TOKEN: !!process.env.VITE_VIMEO_ACCESS_TOKEN,
        selected: vimeoToken?.substring(0, 8) + '...'
    });

    if (!vimeoToken) {
        return res.status(500).json({ error: 'Vimeo token not configured' });
    }

    try {
        console.log('[Vimeo] Creating upload link for:', { name, fileSize });
        console.log('[Vimeo] Token present:', !!vimeoToken, 'Length:', vimeoToken?.length);

        const response = await fetch('https://api.vimeo.com/me/videos', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vimeoToken}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.vimeo.*+json;version=3.4'
            },
            body: JSON.stringify({
                upload: {
                    approach: 'tus',
                    size: fileSize > 0 ? fileSize : undefined
                },
                name,
                description: description || 'Uploaded from Grapplay',
                privacy: {
                    view: 'anybody',
                    embed: 'public'
                }
            })
        });

        const data = await response.json();
        console.log('[Vimeo] Response status:', response.status);
        console.log('[Vimeo] Response data:', JSON.stringify(data, null, 2));

        if (!response.ok) {
            const errorMsg = data.error || data.error_description || data.developer_message || 'Vimeo API error';
            console.error('[Vimeo] API Error:', errorMsg, 'Full response:', data);
            throw new Error(errorMsg);
        }

        res.json(data);
    } catch (error) {
        console.error('Vimeo Upload Link Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 2. Get Video Info
app.get('/api/vimeo/video/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const vimeoToken = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN;

    try {
        const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
            headers: { 'Authorization': `Bearer ${vimeoToken}` }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Vimeo API error');

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. Delete Video
app.delete('/api/vimeo/video/:videoId', async (req, res) => {
    const { videoId } = req.params;
    const vimeoToken = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN;

    try {
        const response = await fetch(`https://api.vimeo.com/videos/${videoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${vimeoToken}` }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Vimeo API error');
        }

        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
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
    const { videoId, filename, cuts, title, description, drillId, lessonId, videoType, sparringId, courseId } = req.body;

    // Validate: exactly one of drillId, lessonId, sparringId, or courseId must be present
    const idCount = [drillId, lessonId, sparringId, courseId].filter(id => !!id).length;
    if (idCount === 0) {
        return res.status(400).json({ error: 'One of drillId, lessonId, sparringId, or courseId is required' });
    }
    if (idCount > 1) {
        return res.status(400).json({ error: 'Cannot specify multiple content IDs' });
    }

    if (!videoId || !filename || !cuts) {
        return res.status(400).json({ error: 'Invalid input data' });
    }

    const isLesson = !!lessonId;
    const isSparring = !!sparringId;
    const isCourse = !!courseId;
    const contentId = isLesson ? lessonId : (isSparring ? sparringId : (isCourse ? courseId : drillId));
    const tableName = isLesson ? 'lessons' : (isSparring ? 'sparring_videos' : (isCourse ? 'courses' : 'drills'));
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

                // Use authenticated download via Service Role for maximum reliability
                console.log(`[DEBUG] Downloading ${fileKey} from bucket ${bucketName}...`);
                logToDB(processId, 'info', `Source: ${bucketName}/${fileKey}`);

                const maxDownloadRetries = 3;
                let downloadSuccess = false;
                let lastDownloadError = null;

                for (let dAttempt = 1; dAttempt <= maxDownloadRetries && !downloadSuccess; dAttempt++) {
                    try {
                        console.log(`[DEBUG] Download attempt ${dAttempt}/${maxDownloadRetries}`);
                        const { data, error } = await supabase.storage
                            .from(bucketName)
                            .download(fileKey);

                        if (error) throw error;
                        if (!data) throw new Error('No data received from Supabase');

                        // In Node.js environment, the data is typically a Blob or Buffer
                        const buffer = Buffer.from(await data.arrayBuffer());
                        fs.writeFileSync(localInputPath, buffer);

                        downloadSuccess = true;
                    } catch (dErr) {
                        console.warn(`[DEBUG] Download attempt ${dAttempt} failed:`);
                        // Log full error object for debugging
                        console.warn(dErr);

                        lastDownloadError = dErr;
                        if (dAttempt < maxDownloadRetries) {
                            await new Promise(r => setTimeout(r, 2000 * dAttempt));
                        }
                    }
                }

                if (!downloadSuccess) {
                    const errorDetails = lastDownloadError ? JSON.stringify(lastDownloadError, Object.getOwnPropertyNames(lastDownloadError)) : 'Unknown Error';
                    throw new Error(`Failed to download from Supabase after ${maxDownloadRetries} attempts. Details: ${errorDetails}`);
                }

                console.log('[DEBUG] Download Complete');
                logToDB(processId, 'info', 'Download Complete');
            } else {
                console.log('[DEBUG] Using Local File');
                logToDB(processId, 'info', 'Using Local File');
            }

            // Start Processing
            const finalPath = path.join(processDir, 'final.mp4');

            if (cuts && cuts.length > 0) {
                // Step 1: Create segments
                logToDB(processId, 'info', 'Step 2: Cutting Video', { cuts });
                const segmentPaths = [];
                const inputPath = localInputPath;

                // Log Input File Stats
                try {
                    const stats = fs.statSync(localInputPath);
                    console.log(`[DEBUG] Input file size: ${stats.size} bytes`);
                    if (stats.size === 0) throw new Error('Input file is empty (0 bytes)');
                } catch (e) {
                    console.error('[DEBUG] Input file error:', e);
                    throw new Error(`Input file invalid: ${e.message}`);
                }

                for (let i = 0; i < cuts.length; i++) {
                    const cut = cuts[i];
                    const segmentFileName = `part_${i}.mp4`;
                    const segmentPath = path.join(processDir, segmentFileName);

                    await new Promise((resolve, reject) => {
                        ffmpeg(inputPath)
                            .setStartTime(cut.start)
                            .setDuration(cut.end - cut.start)
                            .outputOptions(['-c copy', '-avoid_negative_ts 1'])
                            .output(segmentPath)
                            .on('end', resolve)
                            .on('error', (err) => {
                                console.error(`[DEBUG] Error cutting part ${i}:`, err);
                                reject(err);
                            })
                            .run();
                    });
                    segmentPaths.push(segmentFileName); // Store filename only for relative path
                }
                logToDB(processId, 'info', 'Cuts Created');

                // Step 2: Create concat list with RELATIVE paths (Debugging)
                const concatListPath = path.join(processDir, 'concat_list.txt');
                // FFmpeg concat requires 'file keyword'
                const concatFileContent = segmentPaths.map(filename => `file '${filename}'`).join('\n');

                console.log('[DEBUG] Concat List Content:\n', concatFileContent);
                fs.writeFileSync(concatListPath, concatFileContent);

                // Log Segment Stats
                segmentPaths.forEach(seg => {
                    try {
                        const segPath = path.join(processDir, seg);
                        const stats = fs.statSync(segPath);
                        console.log(`[DEBUG] Segment ${seg} size: ${stats.size}`);
                    } catch (e) { console.error(`[DEBUG] Segment ${seg} missing/error`, e); }
                });

                // Step 3: Concat segments (Using Direct Exec for stability)
                logToDB(processId, 'info', 'Step 3: Concatenating');

                // Construct command manually to ensure -f concat comes BEFORE -i
                const ffmpegCmd = `"${ffmpegPath}" -f concat -safe 0 -i "${concatListPath}" -c copy "${finalPath}"`;
                console.log('[DEBUG] Manual FFmpeg Command:', ffmpegCmd);
                logToDB(processId, 'info', 'Exec Command', { ffmpegCmd });

                const execPromise = require('util').promisify(require('child_process').exec);
                try {
                    await execPromise(ffmpegCmd);
                    logToDB(processId, 'info', 'Concatenation Complete', { finalPath });
                } catch (err) {
                    console.error('[DEBUG] Manual Exec Error:', err);
                    throw new Error(`FFmpeg Concat Failed: ${err.message}`);
                }
            } else {
                // No cuts - just copy the original file
                logToDB(processId, 'info', 'No cuts provided, using original file');
                console.log('[DEBUG] No cuts provided, copying input to final path');
                fs.copyFileSync(localInputPath, finalPath);
            }

            // Step 4: Upload to Vimeo with Timeout and Retry
            logToDB(processId, 'info', 'Step 4: Uploading to Vimeo');

            // Validate Vimeo credentials
            const vimeoClientId = process.env.VIMEO_CLIENT_ID || process.env.VITE_VIMEO_CLIENT_ID;
            const vimeoSecret = process.env.VIMEO_CLIENT_SECRET || process.env.VITE_VIMEO_CLIENT_SECRET;
            const vimeoToken = process.env.VIMEO_ACCESS_TOKEN || process.env.VITE_VIMEO_ACCESS_TOKEN;

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

                    console.log(`[Vimeo] Immediate DB update SKIPPED for consistency. Waiting for validation or completion.`);
                    // We DO NOT update DB here anymore to prevent "premature completion" UI on frontend.
                    // The "Processing" state will remain until we confirm everything is ready.

                    // Then wait for encoding (mainly for thumbnail)
                    console.log(`[Vimeo] Waiting for encoding completion for video ${vimeoId}...`);
                    const { waitForVimeoEncoding } = require('./vimeo-status-checker');
                    const encodingResult = await waitForVimeoEncoding(vimeoId, 15); // Wait up to 15 min

                    if (!encodingResult.success) {
                        console.warn(`[Vimeo] Encoding timeout or error for ${vimeoId}, continuing with available data`);
                    }

                    // Use the thumbnail from Vimeo if available, else fallback to vumbnail
                    const finalThumbnail = encodingResult.thumbnail || `https://vumbnail.com/${vimeoId}.jpg`;

                    // Update the correct table based on content type
                    if (isLesson) {
                        // Check if existing thumbnail is custom
                        const { data: currentLesson } = await supabase.from('lessons').select('thumbnail_url').eq('id', lessonId).single();

                        const updateData = { vimeo_url: vimeoId };

                        if (videoType === 'preview') {
                            updateData.is_preview = true;
                        }

                        // Only update thumbnail if it's empty, placeholder, or generic vumbnail
                        const isPlaceholder = !currentLesson?.thumbnail_url ||
                            currentLesson.thumbnail_url.includes('placehold.co') ||
                            currentLesson.thumbnail_url.includes('generated') ||
                            currentLesson.thumbnail_url.includes('vumbnail.com');

                        // For previews, we still update thumbnail if needed
                        if (isPlaceholder) {
                            updateData.thumbnail_url = finalThumbnail;
                        }

                        // Update lessons table
                        console.log(`[DEBUG] Updating lessons table for ID: ${lessonId} with`, updateData);
                        const { data: updatedData, error: updateError } = await supabase.from('lessons')
                            .update(updateData)
                            .eq('id', lessonId)
                            .select();

                        if (updatedData && updatedData.length === 0) {
                            console.error(`[DEBUG] CRITICAL: Lesson update returned 0 rows! ID ${lessonId} might be missing or RLS blocked.`);
                        }

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
                        // Check if existing thumbnail is custom
                        const { data: currentSparring } = await supabase.from('sparring_videos').select('thumbnail_url').eq('id', sparringId).single();

                        const isPreview = videoType === 'preview';
                        const updateData = isPreview
                            ? { preview_vimeo_id: vimeoId }
                            : { video_url: vimeoId, is_published: true };

                        // Only update thumbnail if it's NOT a preview and it's currently a placeholder
                        const isPlaceholder = !currentSparring?.thumbnail_url ||
                            currentSparring.thumbnail_url.includes('placehold.co') ||
                            currentSparring.thumbnail_url.includes('generated') ||
                            currentSparring.thumbnail_url.includes('vumbnail.com');

                        if (!isPreview && isPlaceholder) {
                            updateData.thumbnail_url = finalThumbnail;
                        }

                        // Update sparring_videos table
                        console.log(`[DEBUG] Updating sparring table for ID: ${sparringId} with`, updateData);
                        const { data: updatedData, error: updateError } = await supabase.from('sparring_videos')
                            .update(updateData)
                            .eq('id', sparringId)
                            .select();

                        if (updatedData && updatedData.length === 0) {
                            console.error(`[DEBUG] CRITICAL: Sparring update returned 0 rows! ID ${sparringId} might be missing or RLS blocked.`);
                        }

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
                    } else if (isCourse) {
                        const updateData = { preview_vimeo_id: vimeoId };

                        // Update courses table
                        console.log(`[DEBUG] Updating courses table for ID: ${courseId} with`, updateData);
                        const { data: updatedData, error: updateError } = await supabase.from('courses')
                            .update(updateData)
                            .eq('id', courseId)
                            .select();

                        if (updateError) {
                            console.error('Supabase Update Error:', updateError);
                            logToDB(processId, 'error', 'DB Update Failed', { error: updateError.message });
                        } else {
                            console.log(`Supabase updated for course ${courseId}`);
                            logToDB(processId, 'info', 'Job Fully Complete', {
                                courseId,
                                vimeoId,
                                videoType
                            });
                        }
                    } else {
                        // Check if existing thumbnail is custom
                        const { data: currentDrill } = await supabase.from('drills').select('thumbnail_url').eq('id', drillId).single();

                        // Only update thumbnail for 'action' type video, and only if it's a placeholder
                        const isAction = videoType === 'action';
                        const isPlaceholder = !currentDrill?.thumbnail_url ||
                            currentDrill.thumbnail_url.includes('placehold.co') ||
                            currentDrill.thumbnail_url.includes('generated') ||
                            currentDrill.thumbnail_url.includes('vumbnail.com');

                        const columnToUpdate = isAction ? 'vimeo_url' : 'description_video_url';
                        const updateData = { [columnToUpdate]: vimeoId };

                        if (isAction && isPlaceholder) {
                            updateData.thumbnail_url = finalThumbnail;
                        }

                        // Update drills table
                        console.log(`[DEBUG] Updating drills table for ID: ${drillId} with`, updateData);
                        const { data: updatedData, error: updateError } = await supabase.from('drills')
                            .update(updateData)
                            .eq('id', drillId)
                            .select();

                        if (updatedData && updatedData.length === 0) {
                            console.error(`[DEBUG] CRITICAL: Drill update returned 0 rows! ID ${drillId} might be missing or RLS blocked.`);
                        }

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
                            [videoType === 'preview' ? 'preview_vimeo_id' : 'video_url']: 'error',
                            ...(videoType !== 'preview' ? {
                                thumbnailUrl: 'https://placehold.co/600x800/ff0000/ffffff?text=Upload+Error'
                            } : {})
                        })
                        .eq('id', sparringId);
                } else if (isCourse) {
                    await supabase.from('courses')
                        .update({
                            preview_vimeo_id: 'error'
                        })
                        .eq('id', courseId);
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
            try {
                fs.writeFileSync(path.join(__dirname, 'processing_error.log'), `[${new Date().toISOString()}] ${error.message}\n${error.stack}\n\n`, { flag: 'a' });
            } catch (e) { console.error('Failed to write error log', e); }

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
                            [videoType === 'preview' ? 'preview_vimeo_id' : 'video_url']: `ERROR: ${error.message}`.substring(0, 100),
                            ...(videoType !== 'preview' ? { thumbnail_url: 'https://placehold.co/600x800/ff0000/ffffff?text=Error' } : {})
                        })
                        .eq('id', sparringId);
                } else if (isCourse) {
                    await supabase.from('courses')
                        .update({
                            preview_vimeo_id: `ERROR: ${error.message}`.substring(0, 100)
                        })
                        .eq('id', courseId);
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

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
