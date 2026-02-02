import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
    onUploadComplete: (url: string) => void;
    currentImageUrl?: string;
    bucketName?: string;
    onValidityChange?: (isValid: boolean) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
    onUploadComplete,
    currentImageUrl,
    bucketName = 'course-thumbnails',
    onValidityChange
}) => {
    const [isValid, setIsValid] = useState(true);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync preview with prop changes
    React.useEffect(() => {
        if (currentImageUrl) {
            setPreviewUrl(currentImageUrl);
            setIsValid(true);
        }
    }, [currentImageUrl]);

    const handleFileSelect = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result as string);
            setIsValid(true); // Reset validity on new file
            onValidityChange?.(true);
        };
        reader.readAsDataURL(file);

        // Upload to Supabase
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { data, error } = await supabase.storage
                .from(bucketName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);

            onUploadComplete(publicUrl);
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('이미지 업로드 중 오류가 발생했습니다.');
            setPreviewUrl(currentImageUrl || null);
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const clearPreview = () => {
        setPreviewUrl(null);
        setIsValid(true);
        onValidityChange?.(true);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-4">
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleChange}
                className="hidden"
            />

            {previewUrl ? (
                <div className="relative">
                    <img
                        src={previewUrl}
                        alt="Preview"
                        className={`w-full h-48 object-cover rounded-lg border ${isValid ? 'border-slate-700' : 'border-red-500 opacity-50'}`}
                        onError={() => {
                            setIsValid(false);
                            onValidityChange?.(false);
                        }}
                        onLoad={() => {
                            setIsValid(true);
                            onValidityChange?.(true);
                        }}
                    />
                    {!isValid && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="bg-red-500/90 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                                이미지 로드 실패
                            </span>
                        </div>
                    )}
                    <button
                        onClick={clearPreview}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragActive
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
                        }`}
                >
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                            {uploading ? (
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            ) : (
                                <ImageIcon className="w-8 h-8 text-slate-400" />
                            )}
                        </div>
                        <div>
                            <p className="text-slate-300 font-medium">
                                {uploading ? '업로드 중...' : '이미지를 드래그하거나 클릭하여 선택'}
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                PNG, JPG, GIF (최대 5MB)
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
