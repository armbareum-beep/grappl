import React, { useEffect, useState } from 'react';
import { getVimeoThumbnails, isMuxPlaybackId } from '../lib/api';
import { getVimeoVideoInfo } from '../lib/vimeo';
import { Loader2, AlertCircle, Check, RefreshCw } from 'lucide-react';

interface VimeoThumbnail {
    id: string;
    url: string;
    active: boolean;
}

interface VimeoThumbnailSelectorProps {
    vimeoId: string;
    vimeoHash?: string | null;
    onSelect: (url: string) => void;
    currentThumbnailUrl?: string;
}

export const VimeoThumbnailSelector: React.FC<VimeoThumbnailSelectorProps> = ({
    vimeoId,
    vimeoHash,
    onSelect,
    currentThumbnailUrl
}) => {
    const [thumbnails, setThumbnails] = useState<VimeoThumbnail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);

    const fetchThumbnails = async () => {
        setLoading(true);
        setError(null);
        setProcessing(false);
        try {
            // Skip Mux playback IDs - they don't have Vimeo thumbnails
            if (isMuxPlaybackId(vimeoId)) {
                setError('Mux 영상은 썸네일 선택이 지원되지 않습니다.');
                setLoading(false);
                return;
            }

            // 1. Try backend API first (better quality, multiple options)
            const result = await getVimeoThumbnails(vimeoId);

            // Check if video is still processing
            if (result.processing) {
                setProcessing(true);
                setError(result.message || '영상이 아직 처리 중입니다.');
                return;
            }

            if (!result.error && result.thumbnails && result.thumbnails.length > 0) {
                setThumbnails(result.thumbnails);
                return;
            }

            console.warn('Backend thumbnail fetch failed, trying fallback:', result.error);

            // 2. Fallback to oEmbed (client-side) if backend fails
            // Construct URL based on ID and Hash for private videos
            const fallbackUrl = vimeoHash
                ? `https://vimeo.com/${vimeoId}/${vimeoHash}`
                : vimeoId;

            const info = await getVimeoVideoInfo(fallbackUrl);

            if (info && info.thumbnail) {
                setThumbnails([{
                    id: 'default',
                    url: info.thumbnail,
                    active: true
                }]);
                // Clear any backend error since we have a fallback
                setError(null);
            } else {
                // If both failed, show backend error or generic error
                setError(result.error || '썸네일을 불러오는데 실패했습니다.');
            }
        } catch (err) {
            console.error(err);
            setError('썸네일을 불러오는데 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (vimeoId) {
            fetchThumbnails();
        }
    }, [vimeoId, vimeoHash]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-zinc-500 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
                <p className="text-sm font-medium">Vimeo에서 썸네일을 생성하고 있습니다...</p>
                <p className="text-xs text-zinc-600">여러 시간대의 썸네일을 자동 생성합니다</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`flex flex-col items-center justify-center py-8 gap-3 rounded-xl border ${
                processing
                    ? 'text-amber-400 bg-amber-500/5 border-amber-500/20'
                    : 'text-rose-400 bg-rose-500/5 border-rose-500/20'
            }`}>
                {processing ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                    <AlertCircle className="w-6 h-6" />
                )}
                <p className="text-sm font-medium">{error}</p>
                <button
                    onClick={fetchThumbnails}
                    className="flex items-center gap-2 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-3 h-3" /> {processing ? '새로고침' : '다시 시도'}
                </button>
            </div>
        );
    }

    if (thumbnails.length === 0) {
        return (
            <div className="text-center py-8 text-zinc-500 bg-zinc-900/50 rounded-xl border border-dashed border-zinc-800">
                <p className="text-sm">Vimeo에 생성된 썸네일이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in duration-300">
            <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                Vimeo에서 추천하는 썸네일
                <span className="bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded text-[10px]">{thumbnails.length}</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {thumbnails.map((thumb) => {
                    const isSelected = currentThumbnailUrl === thumb.url;
                    return (
                        <button
                            key={thumb.id}
                            type="button"
                            onClick={() => onSelect(thumb.url)}
                            className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all group ${isSelected
                                ? 'border-violet-500 ring-2 ring-violet-500/20'
                                : 'border-zinc-800 hover:border-zinc-600'
                                }`}
                        >
                            <img
                                src={thumb.url}
                                alt="Vimeo thumbnail"
                                className={`w-full h-full object-cover transition-transform duration-500 ${!isSelected && 'group-hover:scale-105'}`}
                            />
                            {isSelected && (
                                <div className="absolute inset-0 bg-violet-600/20 flex items-center justify-center backdrop-blur-[1px]">
                                    <div className="bg-violet-500 rounded-full p-1 shadow-lg shadow-violet-500/50">
                                        <Check className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            )}
                            {!isSelected && (
                                <div className="absolute inset-0 bg-zinc-950/0 group-hover:bg-zinc-950/20 transition-colors" />
                            )}
                        </button>
                    );
                })}
            </div>
            <p className="text-[10px] text-zinc-500 mt-3 text-center">
                이미지를 선택하면 즉시 반영됩니다. (저장 버튼을 눌러야 최종 저장됩니다)
            </p>
        </div>
    );
};
