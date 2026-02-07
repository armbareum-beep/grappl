import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button } from './Button';
import { Check, X } from 'lucide-react';

interface ThumbnailCropperProps {
    imageSrc: string;
    onCropComplete: (croppedBlob: Blob, croppedBase64: string) => void;
    onCancel: () => void;
    aspectRatio?: number;
}

export const ThumbnailCropper: React.FC<ThumbnailCropperProps> = ({ imageSrc, onCropComplete, onCancel, aspectRatio = 9 / 16 }) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

    const onCropChange = (crop: { x: number; y: number }) => {
        setCrop(crop);
    };

    const onZoomChange = (zoom: number) => {
        setZoom(zoom);
    };

    const onCropCompleteHandler = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const createImage = (url: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<{ blob: Blob, base64: string } | null> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return null;
        }

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.drawImage(
            image,
            pixelCrop.x,
            pixelCrop.y,
            pixelCrop.width,
            pixelCrop.height,
            0,
            0,
            pixelCrop.width,
            pixelCrop.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(null);
                    return;
                }
                const base64 = canvas.toDataURL('image/jpeg', 1.0);
                resolve({ blob, base64 });
            }, 'image/jpeg', 1.0);
        });
    };

    const handleSave = async () => {
        try {
            const result = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (result) {
                onCropComplete(result.blob, result.base64);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const getAspectLabel = (ratio: number) => {
        if (Math.abs(ratio - 9 / 16) < 0.01) return '9:16';
        if (Math.abs(ratio - 16 / 9) < 0.01) return '16:9';
        if (Math.abs(ratio - 1) < 0.01) return '1:1';
        return '';
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 animate-in fade-in duration-200">
            <div className="bg-zinc-900 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col h-[85vh] max-h-[800px] border border-zinc-800 shadow-2xl">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <span className="w-1 h-4 bg-violet-500 rounded-full"></span>
                        썸네일 위치 조정 ({getAspectLabel(aspectRatio)})
                    </h3>
                    <button onClick={onCancel} aria-label="썸네일 편집 취소" className="p-2 hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5 text-zinc-400" /></button>
                </div>
                <div className="relative flex-1 bg-black">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={onCropChange}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={onZoomChange}
                    />
                </div>
                <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex flex-col gap-4">
                    <div>
                        <label className="text-xs text-zinc-400 mb-2 block font-medium uppercase tracking-wide">Zoom</label>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-violet-500"
                        />
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                        <Button variant="ghost" onClick={onCancel} className="text-zinc-400 hover:text-white">취소</Button>
                        <Button onClick={handleSave} className="bg-violet-600 text-white hover:bg-violet-500 px-6 font-bold shadow-lg shadow-violet-500/20">
                            <Check className="w-4 h-4 mr-2" />
                            적용하기
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
