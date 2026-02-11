import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    QuantentPosition,
    ContentLevel,
    UniformType,
    Creator
} from '../../types';
import {
    createDrill, getDrillById, updateDrill,
    createLesson, getLessonById, updateLesson,
    createSparringVideo, getSparringVideoById, updateSparringVideo,
    uploadThumbnail,
    getCreators
} from '../../lib/api';
import { VimeoThumbnailSelector } from '../../components/VimeoThumbnailSelector';
import { extractVimeoId, extractVimeoHash } from '../../lib/vimeo';
import { Button } from '../../components/Button';
import { ArrowLeft, Upload, Trash2, Loader, Camera } from 'lucide-react';
import { useBackgroundUpload } from '../../contexts/BackgroundUploadContext';
import { ThumbnailCropper } from '../../components/ThumbnailCropper';
import { useToast } from '../../contexts/ToastContext';
import { ImageUploader } from '../../components/ImageUploader';
import '@mux/mux-video';

type ContentType = 'drill' | 'lesson' | 'sparring';

type ProcessingState = {
    file: File | null;
    videoId: string | null;
    vimeoUrl: string | null;
    filename: string | null;
    previewUrl: string | null;
    status: 'idle' | 'uploading' | 'previewing' | 'ready' | 'processing' | 'completed' | 'complete' | 'error';
    error: string | null;
    isBackgroundUploading?: boolean;
    uploadProgress?: number;
};

const initialProcessingState: ProcessingState = {
    file: null,
    videoId: null,
    vimeoUrl: null,
    filename: null,
    previewUrl: null,
    status: 'idle',
    error: null,
    isBackgroundUploading: false
};

const CONTENT_LABELS: Record<ContentType, string> = {
    drill: '드릴',
    lesson: '레슨',
    sparring: '스파링'
};

interface UnifiedUploadModalProps {
    initialContentType?: ContentType;
}

export const UnifiedUploadModal: React.FC<UnifiedUploadModalProps> = ({ initialContentType }) => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();

    const typeFromUrl = searchParams.get('type') as ContentType;
    const [contentType, setContentType] = useState<ContentType>(initialContentType || typeFromUrl || 'drill');
    const isEditMode = !!id;
    const { success, error: toastError } = useToast();

    const [creators, setCreators] = useState<Creator[]>([]);
    const [selectedCreatorId, setSelectedCreatorId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdatingDuration, setIsUpdatingDuration] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: QuantentPosition.Standing,
        level: ContentLevel.Beginner,
        uniformType: UniformType.Gi,
        sparringType: 'Sparring' as 'Sparring' | 'Competition',
        price: 0,
        durationMinutes: 0,
        length: '0:00',
    });
    const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
    const [createdContentId, setCreatedContentId] = useState<string | null>(null);

    // Related items (lessons, sparrings) for Drills and other types
    const [relatedItems, setRelatedItems] = useState<{ type: 'drill' | 'lesson' | 'course' | 'sparring'; id: string; title: string }[]>([]);
    const [availableLessons, setAvailableLessons] = useState<any[]>([]);
    const [availableSparrings, setAvailableSparrings] = useState<any[]>([]);
    const [showRelatedModal, setShowRelatedModal] = useState(false);
    const [relatedSearchQuery, setRelatedSearchQuery] = useState('');
    const [activeContentTab, setActiveContentTab] = useState<'lesson' | 'sparring'>('lesson');

    const [mainVideo, setMainVideo] = useState<ProcessingState>(initialProcessingState);
    const [descVideo, setDescVideo] = useState<ProcessingState>(initialProcessingState);

    const { queueUpload, tasks } = useBackgroundUpload();

    const mainVideoRef = React.useRef<HTMLVideoElement>(null);
    const descVideoRef = React.useRef<HTMLVideoElement>(null);
    const mainVimeoRef = React.useRef<HTMLIFrameElement>(null);
    const descVimeoRef = React.useRef<HTMLIFrameElement>(null);
    const [croppingImage, setCroppingImage] = useState<string | null>(null);
    const [activeCropper, setActiveCropper] = useState<'main' | 'desc' | null>(null);
    const [activeTab, setActiveTab] = useState<'main' | 'desc'>('main');

    useEffect(() => {
        if (isAdmin) {
            getCreators().then(list => {
                setCreators(list);
                if (!isEditMode && user?.id && !selectedCreatorId) {
                    setSelectedCreatorId(user.id);
                }
            }).catch(e => console.error('Failed to load creators:', e));
        }
    }, [isAdmin, isEditMode, user?.id]);

    // Load available lessons and sparrings for related content selection
    useEffect(() => {
        const loadSelectionData = async () => {
            const targetCreatorId = selectedCreatorId || user?.id;
            if (!targetCreatorId) return;

            try {
                const api = await import('../../lib/api');
                const [lessonsRes, sparringsRes] = await Promise.all([
                    api.getCreatorLessons(targetCreatorId),
                    api.getSparringVideos(100, targetCreatorId)
                ]);

                if (lessonsRes.data) setAvailableLessons(lessonsRes.data);
                if (sparringsRes.data) setAvailableSparrings(sparringsRes.data);
            } catch (err) {
                console.error('Failed to load selection data:', err);
            }
        };
        loadSelectionData();
    }, [selectedCreatorId, user?.id]);

    useEffect(() => {
        async function fetchInitialData() {
            if (!isEditMode || !id) return;

            try {
                let result: any = null;
                let fetchError: any = null;

                if (contentType === 'drill') {
                    const res = await getDrillById(id);
                    if ((res as any).error) {
                        fetchError = (res as any).error;
                    } else {
                        result = res;
                    }
                } else if (contentType === 'lesson') {
                    const { data, error } = await getLessonById(id);
                    if (error) fetchError = error;
                    else result = data;
                } else if (contentType === 'sparring') {
                    const { data, error } = await getSparringVideoById(id);
                    if (error) fetchError = error;
                    else result = data;
                }

                if (fetchError) {
                    throw fetchError;
                }

                if (result) {
                    // Normalize data since API returns might be raw DB objects (snake_case) or transformed (camelCase)
                    const data = result;

                    setFormData({
                        title: data.title || '',
                        description: data.description || '',
                        category: (data.category as QuantentPosition) || QuantentPosition.Standing,
                        level: (data.difficulty as ContentLevel) || ContentLevel.Beginner,
                        uniformType: (data.uniformType || data.uniform_type as UniformType) || UniformType.Gi,
                        sparringType: contentType === 'sparring' ? (data.category as any) || 'Sparring' : 'Sparring',
                        price: data.price || 0,
                        durationMinutes: data.durationMinutes || data.duration_minutes || 0,
                        length: data.length || '0:00',
                    });

                    if (data.thumbnailUrl || data.thumbnail_url) {
                        setThumbnailUrl(data.thumbnailUrl || data.thumbnail_url);
                    }

                    // Handle Vimeo URL (CamelCase or SnakeCase)
                    const vUrl = data.vimeoUrl || data.vimeo_url;
                    if (vUrl) {
                        const vId = extractVimeoId(vUrl);
                        const vHash = extractVimeoHash(vUrl);
                        let previewUrl = vId ? `https://player.vimeo.com/video/${vId}` : null;
                        if (previewUrl && vHash) previewUrl += `?h=${vHash}`;

                        setMainVideo(prev => ({
                            ...prev,
                            status: 'complete',
                            vimeoUrl: vUrl,
                            previewUrl: previewUrl
                        }));
                    }

                    // Handle Description Video (Drill specific)
                    const dUrl = data.descriptionVideoUrl || data.description_video_url || data.descriptionVimeoUrl || data.description_vimeo_url;
                    if (contentType === 'drill' && dUrl) {
                        const vId = extractVimeoId(dUrl);
                        const vHash = extractVimeoHash(dUrl);
                        let previewUrl = vId ? `https://player.vimeo.com/video/${vId}` : null;
                        if (previewUrl && vHash) previewUrl += `?h=${vHash}`;

                        setDescVideo(prev => ({
                            ...prev,
                            status: 'complete',
                            vimeoUrl: dUrl,
                            previewUrl: previewUrl
                        }));
                    }

                    // Handle Related Items (Drill specific)
                    if (contentType === 'drill' || contentType === 'sparring') {
                        const items = data.relatedItems || data.related_items;
                        if (items && Array.isArray(items)) {
                            setRelatedItems(items);
                        } else if (data.relatedLessonId || data.related_lesson_id) {
                            // Fallback for old single ID
                            const oldId = data.relatedLessonId || data.related_lesson_id;
                            const lesson = availableLessons.find(l => l.id === oldId);
                            setRelatedItems([{
                                type: 'lesson',
                                id: oldId,
                                title: lesson?.title || 'Related Lesson'
                            }]);
                        }
                    }

                    // Handle Creator ID
                    const cId = data.creatorId || data.creator_id;
                    if (cId) {
                        setSelectedCreatorId(cId);
                    }
                }
            } catch (err) {
                console.error('Failed to fetch content:', err);
                toastError('정보를 불러오는데 실패했습니다.');
                navigate('/creator');
            }
        }
        fetchInitialData();
    }, [id, isEditMode, contentType, navigate, isAdmin, user?.id, toastError]);

    useEffect(() => {
        setMainVideo(initialProcessingState);
        setDescVideo(initialProcessingState);
        setCreatedContentId(null);
        setThumbnailUrl('');
    }, [contentType]);

    useEffect(() => {
        if (tasks.length === 0) return;
        tasks.forEach(task => {
            const isMainMatch = mainVideo.videoId === task.id;
            const isDescMatch = descVideo.videoId === task.id;
            if (!isMainMatch && !isDescMatch) return;

            const updateFn = isMainMatch ? setMainVideo : setDescVideo;
            updateFn(prev => {
                const newStatus = task.status === 'uploading' ? 'ready' : (task.status as any);
                if (prev.uploadProgress === Math.round(task.progress) && prev.status === newStatus) return prev;
                return {
                    ...prev,
                    uploadProgress: Math.round(task.progress),
                    isBackgroundUploading: task.status === 'uploading',
                    status: newStatus,
                    error: task.error || null
                };
            });
        });
    }, [tasks, mainVideo.videoId, descVideo.videoId]);

    const MAX_VIDEO_DURATION_SECONDS = 90; // 1분 30초 제한

    const handleFileUpload = async (file: File, setter: React.Dispatch<React.SetStateAction<ProcessingState>>) => {
        const objectUrl = URL.createObjectURL(file);

        // 드릴 영상 길이 검증 (1분 30초 제한)
        if (contentType === 'drill') {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = objectUrl;

            await new Promise<void>((resolve, reject) => {
                video.onloadedmetadata = () => {
                    if (video.duration > MAX_VIDEO_DURATION_SECONDS) {
                        URL.revokeObjectURL(objectUrl);
                        toastError(`영상 길이가 1분 30초를 초과합니다. (${Math.floor(video.duration)}초) 1분 30초 이하의 영상만 업로드할 수 있습니다.`);
                        reject(new Error('Video too long'));
                    } else {
                        resolve();
                    }
                };
                video.onerror = () => {
                    resolve(); // 메타데이터 로드 실패 시 일단 업로드 허용
                };
            }).catch(() => {
                setter(prev => ({ ...prev, error: '영상 길이가 1분 30초를 초과합니다.' }));
                return;
            });
        }

        setter(prev => ({
            ...prev,
            file,
            previewUrl: objectUrl,
            status: 'ready',
            isBackgroundUploading: false,
            videoId: null,
            error: null
        }));
    };

    // 로컬 비디오 캡쳐 (Vimeo는 아래 썸네일 선택기 사용)
    const captureFromVideo = async (type: 'main' | 'desc') => {
        try {
            const video = type === 'main' ? mainVideoRef.current : descVideoRef.current;
            if (!video) {
                toastError('영상이 로드되지 않았습니다.');
                return;
            }
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            setCroppingImage(canvas.toDataURL('image/jpeg', 1.0));
            setActiveCropper(type);
        } catch (e: any) {
            console.error('Capture failed:', e);
            toastError('화면 캡처에 실패했습니다.');
        }
    };

    // Mux 썸네일 가져오기 (드릴 전용 - 9:16 세로 비율, 현재 재생 위치)
    const captureFromMux = async (playbackId: string, type: 'main' | 'desc') => {
        try {
            // 현재 비디오의 재생 위치 가져오기
            const muxVideo = document.querySelector(`mux-video[playback-id="${playbackId}"]`) as any;
            const currentTime = muxVideo?.currentTime || 0;

            // 9:16 세로 비율 (720x1280), 현재 재생 위치에서 캡처
            const thumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg?width=720&height=1280&fit_mode=crop&time=${currentTime}`;
            const response = await fetch(thumbnailUrl);
            if (!response.ok) {
                toastError('썸네일을 가져올 수 없습니다. Playback ID를 확인해주세요.');
                return;
            }
            const blob = await response.blob();
            const reader = new FileReader();
            reader.onload = () => {
                setCroppingImage(reader.result as string);
                setActiveCropper(type);
            };
            reader.readAsDataURL(blob);
        } catch (e: any) {
            console.error('Mux thumbnail fetch failed:', e);
            toastError('Mux 썸네일을 가져오는데 실패했습니다.');
        }
    };

    const handleCropComplete = async (blob: Blob) => {
        setIsSubmitting(true);
        try {
            const { url, error } = await uploadThumbnail(blob);
            if (error) throw error;
            if (url) {
                setThumbnailUrl(url);
                success('썸네일이 캡처되었습니다.');
            }
        } catch (err) {
            console.error('Thumbnail upload failed:', err);
            toastError('썸네일 저장에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
            setCroppingImage(null);
            setActiveCropper(null);
        }
    };

    const ensureDraftRecord = async () => {
        const effectiveCreatorId = (isAdmin && selectedCreatorId) ? selectedCreatorId : user?.id;
        const commonData = {
            title: formData.title || 'Untitled',
            description: formData.description,
            creatorId: effectiveCreatorId,
            category: (contentType === 'sparring' ? formData.sparringType : formData.category) as any,
            difficulty: (contentType === 'sparring' ? undefined : formData.level) as any,
            uniformType: formData.uniformType,
            durationMinutes: formData.durationMinutes,
            // Don't use placeholder thumbnail if Vimeo URL exists - let API fetch it
            thumbnailUrl: thumbnailUrl || (mainVideo.vimeoUrl || descVideo.vimeoUrl ? undefined : `https://placehold.co/600x800/1e293b/ffffff?text=${contentType}`),
            vimeoUrl: mainVideo.vimeoUrl || undefined,
            descriptionVideoUrl: contentType === 'drill' ? (descVideo.vimeoUrl || undefined) : undefined,
        };

        let result: any;
        if (contentType === 'drill') {
            result = await createDrill(commonData);
        } else if (contentType === 'lesson') {
            // Fix: 'length' is required for createLesson
            result = await createLesson({ ...commonData, courseId: undefined, lessonNumber: 1, length: formData.length });
        } else if (contentType === 'sparring') {
            result = await createSparringVideo({ ...commonData, price: formData.price });
        }
        if (result?.error || !result?.data) throw result?.error || new Error('Failed to create record');
        const newId = result.data.id;
        setCreatedContentId(newId);
        return newId;
    };

    const handleSubmit = async () => {
        if (!user) return;
        if (contentType === 'drill') {
            const isMainValid = mainVideo.status === 'complete' || mainVideo.status === 'completed' || !!mainVideo.vimeoUrl || !!mainVideo.videoId || !!mainVideo.file;
            const isDescValid = descVideo.status === 'complete' || descVideo.status === 'completed' || !!descVideo.vimeoUrl || !!descVideo.videoId || !!descVideo.file;
            if (!isMainValid && !isDescValid) {
                toastError('동작 영상 또는 설명 영상 중 최소 하나는 있어야 합니다.');
                return;
            }
        }
        setIsSubmitting(true);
        try {
            let contentId = id || createdContentId;
            if (!contentId) contentId = await ensureDraftRecord();
            if (!contentId) throw new Error("Failed to create or retrieve content record ID.");

            const effectiveCreatorId = (isAdmin && selectedCreatorId) ? selectedCreatorId : user?.id;
            let instructorName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Unknown';
            if (isAdmin && selectedCreatorId) {
                const sel = creators.find(c => c.id === selectedCreatorId);
                if (sel) instructorName = sel.name;
            } else if (user?.id) {
                const c = creators.find(cr => cr.id === user.id);
                if (c) instructorName = c.name;
            }

            const commonData = {
                title: formData.title,
                description: formData.description,
                creatorId: effectiveCreatorId,
                category: (contentType === 'sparring' ? formData.sparringType : formData.category) as any,
                difficulty: (contentType === 'sparring' ? undefined : formData.level) as any,
                uniformType: formData.uniformType,
                durationMinutes: formData.durationMinutes,
                // Don't use placeholder thumbnail if Vimeo URL exists - let API fetch it
                thumbnailUrl: thumbnailUrl || (mainVideo.vimeoUrl || descVideo.vimeoUrl ? undefined : `https://placehold.co/600x800/1e293b/ffffff?text=${contentType}`),
                length: formData.length,
                vimeoUrl: mainVideo.vimeoUrl || undefined,
                descriptionVideoUrl: contentType === 'drill' ? (descVideo.vimeoUrl || undefined) : undefined,
                relatedItems: (contentType === 'drill' || contentType === 'sparring') ? relatedItems : undefined,
            };

            if (contentType === 'drill') await updateDrill(contentId, commonData);
            else if (contentType === 'lesson') await updateLesson(contentId, commonData);
            else if (contentType === 'sparring') await updateSparringVideo(contentId, { ...commonData, price: formData.price });

            if (mainVideo.file && !mainVideo.isBackgroundUploading && !mainVideo.videoId) {
                const vId = `${crypto.randomUUID()}-${Date.now()}`;
                const ext = mainVideo.file.name.split('.').pop()?.toLowerCase() || 'mp4';
                await queueUpload(mainVideo.file, contentType === 'sparring' ? 'sparring' : 'action', {
                    videoId: vId,
                    filename: `${vId}.${ext}`,
                    cuts: [],
                    title: `[${contentType.toUpperCase()}] ${formData.title}`,
                    description: formData.description,
                    sparringId: contentType === 'sparring' ? contentId : undefined,
                    lessonId: contentType === 'lesson' ? contentId : undefined,
                    drillId: contentType === 'drill' ? contentId : undefined,
                    videoType: contentType === 'sparring' ? 'sparring' : 'action',
                    instructorName,
                    thumbnailUrl: commonData.thumbnailUrl
                });
            }

            if (contentType === 'drill' && descVideo.file && !descVideo.isBackgroundUploading && !descVideo.videoId) {
                const vId = `${crypto.randomUUID()}-${Date.now()}`;
                const ext = descVideo.file.name.split('.').pop()?.toLowerCase() || 'mp4';
                await queueUpload(descVideo.file, 'desc', {
                    videoId: vId,
                    filename: `${vId}.${ext}`,
                    cuts: [],
                    title: `[DRILL DESC] ${formData.title}`,
                    description: formData.description,
                    drillId: contentId,
                    videoType: 'desc',
                    instructorName,
                    thumbnailUrl: commonData.thumbnailUrl
                });
            }

            success(`${CONTENT_LABELS[contentType]} 업로드/수정 완료!`);
            setTimeout(() => navigate(-1), 500);
        } catch (err: any) {
            console.error(err);
            toastError(err.message || '업로드 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRefreshDuration = async () => {
        if (!mainVideo.vimeoUrl) return;
        const vId = extractVimeoId(mainVideo.vimeoUrl);
        if (!vId) return;

        setIsUpdatingDuration(true);
        try {
            const contentId = id || createdContentId;
            if (!contentId) {
                toastError('기록된 콘텐츠 ID가 없습니다.');
                return;
            }

            const response = await fetch('/api/upload-to-vimeo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'complete_upload',
                    vimeoId: vId,
                    contentId,
                    contentType,
                    videoType: 'action'
                })
            });

            if (response.ok) {
                success('길이 정보가 성공적으로 갱신되었습니다.');
                // Refresh data if in edit mode
                if (id) {
                    let result: any;
                    if (contentType === 'drill') result = await getDrillById(id);
                    else if (contentType === 'lesson') result = await getLessonById(id);
                    else if (contentType === 'sparring') { const res = await getSparringVideoById(id); result = res.data; }

                    if (result && !result.error) {
                        setFormData(prev => ({ ...prev, length: result.length || '0:00' }));
                    }
                }
            } else {
                const error = await response.json();
                throw new Error(error.error || '갱신 실패');
            }
        } catch (err: any) {
            console.error(err);
            toastError('갱신 중 오류가 발생했습니다: ' + err.message);
        } finally {
            setIsUpdatingDuration(false);
        }
    };

    const renderVideoBox = (type: 'main' | 'desc', state: ProcessingState, label: string) => {
        const isMain = type === 'main';
        const setter = isMain ? setMainVideo : setDescVideo;
        const isDrillType = contentType === 'drill';

        return (
            <div className="flex flex-col gap-4 h-full">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-zinc-400">
                        {isDrillType ? 'Mux Playback ID (선택)' : 'Vimeo URL/ID (선택)'}
                    </label>
                    <input
                        type="text"
                        value={state.vimeoUrl || ''}
                        onChange={(e) => {
                            let val = e.target.value.trim();

                            if (isDrillType) {
                                // Drill: Use Mux - extract playback ID from URL if needed
                                // Handle formats:
                                // - https://stream.mux.com/PLAYBACK_ID
                                // - https://stream.mux.com/PLAYBACK_ID.m3u8
                                // - https://image.mux.com/PLAYBACK_ID/thumbnail.jpg
                                // - Just PLAYBACK_ID
                                if (val.includes('stream.mux.com/')) {
                                    const match = val.match(/stream\.mux\.com\/([a-zA-Z0-9]+)/);
                                    if (match) val = match[1];
                                } else if (val.includes('image.mux.com/')) {
                                    const match = val.match(/image\.mux\.com\/([a-zA-Z0-9]+)/);
                                    if (match) val = match[1];
                                }
                                // Remove any file extension
                                val = val.replace(/\.(m3u8|mp4|jpg|png).*$/, '');

                                setter(prev => ({
                                    ...prev,
                                    vimeoUrl: val || null,
                                    status: val ? 'complete' : (prev.file ? 'ready' : 'idle'),
                                    previewUrl: val || (prev.file ? prev.previewUrl : null)
                                }));

                                // Auto-set thumbnail from Mux (9:16 세로 비율)
                                if (val && !thumbnailUrl) {
                                    setThumbnailUrl(`https://image.mux.com/${val}/thumbnail.jpg?width=720&height=1280&fit_mode=crop`);
                                }
                            } else {
                                // Lesson/Sparring: Use Vimeo
                                const vId = extractVimeoId(val);
                                const vHash = extractVimeoHash(val);
                                let embedUrl = '';
                                if (vId) {
                                    embedUrl = `https://player.vimeo.com/video/${vId}`;
                                    if (vHash) embedUrl += `?h=${vHash}`;
                                }
                                setter(prev => ({
                                    ...prev,
                                    vimeoUrl: val || null,
                                    status: val ? 'complete' : (prev.file ? 'ready' : 'idle'),
                                    previewUrl: val ? embedUrl : (prev.file ? prev.previewUrl : null)
                                }));
                            }
                        }}
                        placeholder={isDrillType ? 'Mux Playback ID 또는 URL 입력' : 'Vimeo URL 또는 ID를 입력하세요'}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-700/50 rounded-lg text-sm text-zinc-300 focus:outline-none focus:border-violet-500/50"
                    />
                    {/* Vimeo duration refresh button - only for non-drill content */}
                    {!isDrillType && isMain && state.vimeoUrl && (
                        <button
                            type="button"
                            onClick={handleRefreshDuration}
                            disabled={isUpdatingDuration}
                            className="text-[10px] text-violet-400 hover:text-violet-300 font-medium flex items-center gap-1 mt-1 transition-colors"
                        >
                            {isUpdatingDuration ? (
                                <Loader className="w-3 h-3 animate-spin" />
                            ) : (
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                            )}
                            길이 정보 갱신 (0:00으로 나올 때 클릭)
                        </button>
                    )}
                </div>

                {(state.status === 'idle' || state.status === 'error') && !state.vimeoUrl ? (
                    <div className="flex-1 min-h-[250px] border-2 border-dashed border-zinc-800 rounded-xl p-6 text-center hover:border-violet-500 hover:bg-zinc-800/50 transition-all cursor-pointer relative flex flex-col items-center justify-center group">
                        <input type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0], setter)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                        <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                            <Upload className="w-8 h-8 text-zinc-400 group-hover:text-violet-400" />
                        </div>
                        <p className="font-bold text-white text-lg mb-2">{label} 업로드</p>
                        <p className="text-sm text-zinc-500">탭하여 동영상 선택</p>
                        {isDrillType && (
                            <p className="text-xs text-amber-500 mt-2 font-medium">⏱ 최대 1분 30초 이하 영상만 가능</p>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 min-h-[250px] flex flex-col gap-3">
                        {/* 캡처/삭제 버튼 */}
                        <div className="flex justify-end gap-2">
                            {/* Mux 드릴: 썸네일 캡처 버튼 표시 */}
                            {isDrillType && state.vimeoUrl && (
                                <button onClick={() => captureFromMux(state.vimeoUrl!, type)} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white text-sm flex items-center gap-2 transition-colors">
                                    <Camera className="w-4 h-4" /> 현재 장면 캡처
                                </button>
                            )}
                            {/* 로컬 비디오일 때만 캡쳐 버튼 표시 */}
                            {!state.vimeoUrl && (
                                <button onClick={() => captureFromVideo(type)} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-white text-sm flex items-center gap-2 transition-colors">
                                    <Camera className="w-4 h-4" /> 썸네일 캡처
                                </button>
                            )}
                            <button onClick={() => setter(initialProcessingState)} className="px-4 py-2 bg-zinc-800 hover:bg-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2 border border-zinc-700 transition-colors">
                                <Trash2 className="w-4 h-4" /> 삭제
                            </button>
                        </div>
                        <div className="flex-1 border-2 border-zinc-700 bg-zinc-800/50 rounded-xl overflow-hidden relative">
                            {isDrillType && state.vimeoUrl ? (
                                // Drill with Mux Playback ID
                                <mux-video
                                    key={state.vimeoUrl}
                                    playback-id={state.vimeoUrl}
                                    controls
                                    muted
                                    playsinline
                                    style={{ width: '100%', height: '100%', minHeight: '250px', display: 'block', objectFit: 'contain' }}
                                />
                            ) : state.previewUrl ? (
                                state.previewUrl.includes('vimeo') ? (
                                    <iframe ref={isMain ? mainVimeoRef : descVimeoRef} src={state.previewUrl} className="w-full h-full min-h-[250px]" frameBorder="0" allow="autoplay; fullscreen" allowFullScreen />
                                ) : (
                                    <video ref={isMain ? mainVideoRef : descVideoRef} src={state.previewUrl} className="w-full h-full object-cover min-h-[250px]" crossOrigin="anonymous" controls autoPlay muted loop playsInline />
                                )
                            ) : null}
                        </div>
                        {state.file && !state.vimeoUrl && (
                            <div className="bg-black/60 backdrop-blur rounded-lg px-3 py-2">
                                <p className="text-sm text-white truncate">{state.file?.name || 'Uploaded Video'}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    const isDrill = contentType === 'drill';
    const cropperAspectRatio = activeCropper === 'main' ? (isDrill ? 9 / 16 : 16 / 9) : (isDrill ? 9 / 16 : 16 / 9);

    return (
        <div className="min-h-screen bg-zinc-950 py-8 px-4 sm:px-6 lg:px-8 relative">
            {croppingImage && <ThumbnailCropper imageSrc={croppingImage} onCropComplete={handleCropComplete} onCancel={() => { setCroppingImage(null); setActiveCropper(null); }} aspectRatio={cropperAspectRatio} />}

            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/creator')} className="p-2 bg-zinc-900 rounded-full text-zinc-400 hover:text-white">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{isEditMode ? `${CONTENT_LABELS[contentType]} 수정` : `새 ${CONTENT_LABELS[contentType]} 만들기`}</h1>
                        {!isEditMode && (
                            <div className="flex gap-2 mt-2">
                                {(['drill', 'lesson'] as ContentType[]).map(type => (
                                    <button key={type} onClick={() => setContentType(type)} className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${contentType === type ? 'bg-violet-600 border-violet-600 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}>{CONTENT_LABELS[type]}</button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">제목</label>
                            <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500 transition-all" />
                        </div>

                        {isAdmin && (
                            <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl mb-4">
                                <label className="block text-sm font-bold text-violet-400 mb-2">인스트럭터 선택 (관리자 대리 업로드)</label>
                                <select value={selectedCreatorId} onChange={(e) => setSelectedCreatorId(e.target.value)} className="w-full px-4 py-3 bg-zinc-950 border border-violet-500/30 rounded-xl text-white outline-none focus:border-violet-500">
                                    <option value="">본인 (관리자 계정)</option>
                                    {creators.map(creator => (<option key={creator.id} value={creator.id}>{creator.name}</option>))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {contentType === 'sparring' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">스파링 종류</label>
                                        <select value={formData.sparringType} onChange={e => setFormData({ ...formData, sparringType: e.target.value as any })} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500">
                                            <option value="Sparring">스파링</option>
                                            <option value="Competition">컴페티션</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">가격</label>
                                        <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">포지션</label>
                                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as QuantentPosition })} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500">
                                            {Object.values(QuantentPosition).map(pos => (<option key={pos} value={pos}>{pos}</option>))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-zinc-400 mb-2">레벨</label>
                                        <select value={formData.level} onChange={e => setFormData({ ...formData, level: e.target.value as ContentLevel })} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500">
                                            {Object.values(ContentLevel).map(lvl => (<option key={lvl} value={lvl}>{lvl}</option>))}
                                        </select>
                                    </div>
                                </>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-zinc-400 mb-2">복장</label>
                                <select value={formData.uniformType} onChange={e => setFormData({ ...formData, uniformType: e.target.value as UniformType })} className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500">
                                    {Object.values(UniformType).map(u => (<option key={u} value={u}>{u}</option>))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-zinc-400 mb-2">설명</label>
                            <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-5 py-3.5 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-violet-500 resize-none" placeholder="상세 설명을 입력하세요" />
                        </div>

                        {/* Related Content Section */}
                        {(contentType === 'drill' || contentType === 'sparring') && (
                            <div className="pt-6 border-t border-zinc-800/50">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">관련 콘텐츠</h3>
                                        <p className="text-sm text-zinc-500">드릴과 관련된 레슨이나 스파링을 연결하세요</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setShowRelatedModal(true)}
                                        className="gap-2 border-zinc-700 text-zinc-300"
                                    >
                                        <Upload className="w-4 h-4" /> 콘텐츠 선택 ({relatedItems.length})
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    {relatedItems.map((item, index) => (
                                        <div key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800/50 rounded-xl hover:bg-zinc-900/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded leading-none ${item.type === 'lesson' ? 'bg-violet-500/20 text-violet-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                    {item.type.toUpperCase()}
                                                </span>
                                                <span className="text-sm text-zinc-200 font-medium truncate max-w-[200px] sm:max-w-[400px]">{item.title}</span>
                                            </div>
                                            <button
                                                onClick={() => setRelatedItems(prev => prev.filter((_, i) => i !== index))}
                                                className="p-1.5 hover:bg-rose-500/10 rounded-lg text-zinc-500 hover:text-rose-400 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {relatedItems.length === 0 && (
                                        <div className="text-center py-6 bg-zinc-950/30 border border-dashed border-zinc-800 rounded-xl">
                                            <p className="text-xs text-zinc-500">선택된 관련 콘텐츠가 없습니다</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-zinc-800/50">
                            <label className="block text-sm font-semibold text-zinc-400 mb-3">썸네일</label>
                            {/* VimeoThumbnailSelector: 레슨/스파링 전용 (드릴은 Mux 사용) */}
                            {contentType !== 'drill' && mainVideo.vimeoUrl && (
                                <div className="mb-8 p-6 bg-violet-500/5 rounded-2xl border border-violet-500/20">
                                    <VimeoThumbnailSelector
                                        vimeoId={extractVimeoId(mainVideo.vimeoUrl) || mainVideo.vimeoUrl}
                                        vimeoHash={extractVimeoHash(mainVideo.vimeoUrl)}
                                        onSelect={(url) => setThumbnailUrl(url)}
                                        currentThumbnailUrl={thumbnailUrl}
                                    />
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div className="space-y-4">
                                    <ImageUploader onUploadComplete={(url) => setThumbnailUrl(url)} currentImageUrl={thumbnailUrl} bucketName="course-thumbnails" />
                                </div>
                                {thumbnailUrl && (
                                    <div className="space-y-2">
                                        <p className="text-xs text-zinc-500 font-medium">현재 미리보기</p>
                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-zinc-800">
                                            <img src={thumbnailUrl} alt="썸네일" loading="lazy" className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-800 overflow-hidden">
                        {contentType === 'drill' ? (
                            <>
                                <div className="flex border-b border-zinc-800">
                                    <button onClick={() => setActiveTab('main')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'main' ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/10' : 'text-zinc-500 hover:bg-zinc-800'}`}>동작 영상</button>
                                    <button onClick={() => setActiveTab('desc')} className={`flex-1 py-4 font-bold transition-all ${activeTab === 'desc' ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/10' : 'text-zinc-500 hover:bg-zinc-800'}`}>설명 영상</button>
                                </div>
                                <div className="p-6">{activeTab === 'main' ? renderVideoBox('main', mainVideo, '동작 영상') : renderVideoBox('desc', descVideo, '설명 영상')}</div>
                            </>
                        ) : (
                            <div className="p-6">{renderVideoBox('main', mainVideo, `${CONTENT_LABELS[contentType]} 영상`)}</div>
                        )}
                    </div>

                    <div className="mt-8 flex gap-4">
                        <Button variant="secondary" onClick={() => navigate('/creator')} className="flex-1 h-14 rounded-xl">취소</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !formData.title || (contentType === 'drill' ? (!mainVideo.file && !mainVideo.vimeoUrl && !descVideo.file && !descVideo.vimeoUrl) : (!mainVideo.file && !mainVideo.vimeoUrl))}
                            className="flex-[2] h-14 rounded-xl bg-violet-600 hover:bg-violet-500"
                        >
                            {isSubmitting ? <Loader className="w-5 h-5 animate-spin mx-auto" /> : (isEditMode ? '수정사항 저장' : '업로드 시작')}
                        </Button>
                    </div>
                </div>
            </div>
            {/* Related Content Selection Modal */}
            {showRelatedModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRelatedModal(false)} />
                    <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
                        <div className="p-6 border-b border-zinc-800">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-white">관련 콘텐츠 선택</h3>
                                <button onClick={() => setShowRelatedModal(false)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder={`${activeContentTab === 'lesson' ? '레슨' : '스파링'} 제목으로 검색...`}
                                    value={relatedSearchQuery}
                                    onChange={(e) => setRelatedSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm outline-none focus:border-violet-500"
                                />
                                <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                            </div>
                        </div>

                        {/* Tabs */}
                        <div className="flex px-6 border-b border-zinc-800">
                            <button
                                onClick={() => setActiveContentTab('lesson')}
                                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeContentTab === 'lesson' ? 'text-violet-400 border-violet-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                            >
                                레슨 ({availableLessons.length})
                            </button>
                            <button
                                onClick={() => setActiveContentTab('sparring')}
                                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${activeContentTab === 'sparring' ? 'text-blue-400 border-blue-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
                            >
                                스파링 ({availableSparrings.length})
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                            <div className="space-y-6">
                                {/* Lessons List */}
                                {activeContentTab === 'lesson' && (
                                    <div className="space-y-1">
                                        {availableLessons
                                            .filter(l => l.title.toLowerCase().includes(relatedSearchQuery.toLowerCase()))
                                            .map(lesson => {
                                                const isSelected = relatedItems.some(ri => ri.id === lesson.id && ri.type === 'lesson');
                                                return (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setRelatedItems(prev => prev.filter(ri => !(ri.id === lesson.id && ri.type === 'lesson')));
                                                            } else {
                                                                setRelatedItems(prev => [...prev, { type: 'lesson', id: lesson.id, title: lesson.title }]);
                                                            }
                                                        }}
                                                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${isSelected ? 'bg-violet-500/10 border border-violet-500/30' : 'hover:bg-zinc-800 border border-transparent'}`}
                                                    >
                                                        <div className="w-16 aspect-video rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                                                            {lesson.thumbnailUrl && <img src={lesson.thumbnailUrl} alt={lesson.title || "썸네일"} loading="lazy" className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div className="flex-1 text-left min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">{lesson.title}</p>
                                                            {lesson.courseTitle && <p className="text-[10px] text-zinc-500 truncate">{lesson.courseTitle}</p>}
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-violet-500 border-violet-500' : 'border-zinc-700'}`}>
                                                            {isSelected && <Upload className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        {availableLessons.length === 0 && (
                                            <div className="text-center py-12">
                                                <p className="text-zinc-500 text-sm">등록된 레슨이 없습니다.</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Sparrings List */}
                                {activeContentTab === 'sparring' && (
                                    <div className="space-y-1">
                                        {availableSparrings
                                            .filter(s => s.title.toLowerCase().includes(relatedSearchQuery.toLowerCase()))
                                            .map(sparring => {
                                                const isSelected = relatedItems.some(ri => ri.id === sparring.id && ri.type === 'sparring');
                                                return (
                                                    <button
                                                        key={sparring.id}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setRelatedItems(prev => prev.filter(ri => !(ri.id === sparring.id && ri.type === 'sparring')));
                                                            } else {
                                                                setRelatedItems(prev => [...prev, { type: 'sparring', id: sparring.id, title: sparring.title }]);
                                                            }
                                                        }}
                                                        className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all ${isSelected ? 'bg-blue-500/10 border border-blue-500/30' : 'hover:bg-zinc-800 border border-transparent'}`}
                                                    >
                                                        <div className="w-16 aspect-video rounded-lg bg-zinc-800 overflow-hidden flex-shrink-0">
                                                            {sparring.thumbnailUrl && <img src={sparring.thumbnailUrl} alt={sparring.title || "썸네일"} loading="lazy" className="w-full h-full object-cover" />}
                                                        </div>
                                                        <div className="flex-1 text-left min-w-0">
                                                            <p className="text-sm font-bold text-white truncate">{sparring.title}</p>
                                                            <p className="text-[10px] text-zinc-500 truncate">{sparring.creatorName}</p>
                                                        </div>
                                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-zinc-700'}`}>
                                                            {isSelected && <Upload className="w-3 h-3 text-white" />}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        {availableSparrings.length === 0 && (
                                            <div className="text-center py-12">
                                                <p className="text-zinc-500 text-sm">등록된 스파링 영상이 없습니다.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-zinc-950 border-t border-zinc-800">
                            <Button
                                onClick={() => setShowRelatedModal(false)}
                                className="w-full bg-violet-600 hover:bg-violet-500 h-12 rounded-xl font-bold"
                            >
                                {relatedItems.length}개 항목 선택됨
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
