import React, { useState } from 'react';
import { Upload, Film, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadVideo } from '../lib/api-video-upload';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from './Button';

interface VideoMetadata {
    title: string;
    description: string;
    category: string;
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
    price: number;
    length: string;
}

export const VideoUploader: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [metadata, setMetadata] = useState<VideoMetadata>({
        title: '',
        description: '',
        category: '',
        difficulty: 'Beginner',
        price: 0,
        length: '0:00'
    });

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        // 파일 크기 체크 (Basic: 500MB, Pro: 무제한)
        const maxSize = 500 * 1024 * 1024; // 500MB
        if (selectedFile.size > maxSize) {
            setError('파일 크기는 500MB를 초과할 수 없습니다. (Basic 계정 제한)');
            return;
        }

        // 파일 형식 체크
        if (!selectedFile.type.startsWith('video/')) {
            setError('비디오 파일만 업로드 가능합니다.');
            return;
        }

        setFile(selectedFile);
        setError(null);

        // 파일 이름을 제목으로 자동 설정
        const fileName = selectedFile.name.replace(/\.[^/.]+$/, '');
        setMetadata(prev => ({ ...prev, title: fileName }));
    };

    const handleUpload = async () => {
        if (!file || !user) return;

        // 유효성 검사
        if (!metadata.title.trim()) {
            setError('제목을 입력해주세요.');
            return;
        }
        if (!metadata.category) {
            setError('카테고리를 선택해주세요.');
            return;
        }

        setUploading(true);
        setError(null);
        setProgress(0);

        try {
            await uploadVideo(
                file,
                {
                    ...metadata,
                    creatorId: user.id
                },
                (progressPercent) => {
                    setProgress(progressPercent);
                }
            );

            setSuccess(true);
            setTimeout(() => {
                navigate('/creator/videos');
            }, 2000);
        } catch (err: any) {
            console.error('Upload error:', err);
            setError(err.message || '업로드 중 오류가 발생했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1024 / 1024).toFixed(1) + ' MB';
    };

    return (
        <div className="max-w-3xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">새 영상 업로드</h2>
                <p className="text-slate-600 mb-8">
                    영상을 업로드하면 자동으로 Vimeo에 저장됩니다.
                </p>

                {/* 파일 선택 영역 */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                        영상 파일
                    </label>

                    {!file ? (
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center hover:border-blue-400 transition-colors">
                            <Upload className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handleFileSelect}
                                className="hidden"
                                id="video-upload"
                                disabled={uploading}
                            />
                            <label
                                htmlFor="video-upload"
                                className="cursor-pointer inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                            >
                                파일 선택
                            </label>
                            <p className="text-sm text-slate-500 mt-4">
                                MP4, MOV, AVI 등 (최대 500MB - Basic 계정)
                            </p>
                        </div>
                    ) : (
                        <div className="border-2 border-blue-500 rounded-xl p-6 bg-blue-50">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <Film className="w-12 h-12 text-blue-600 flex-shrink-0" />
                                    <div>
                                        <p className="font-semibold text-slate-900">{file.name}</p>
                                        <p className="text-sm text-slate-600 mt-1">
                                            {formatFileSize(file.size)} • {file.type}
                                        </p>
                                    </div>
                                </div>
                                {!uploading && (
                                    <button
                                        onClick={() => setFile(null)}
                                        className="text-slate-400 hover:text-red-600 transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 메타데이터 입력 */}
                {file && !success && (
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                제목 *
                            </label>
                            <input
                                type="text"
                                value={metadata.title}
                                onChange={(e) => setMetadata({ ...metadata, title: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="영상 제목을 입력하세요"
                                disabled={uploading}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                설명
                            </label>
                            <textarea
                                value={metadata.description}
                                onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                rows={4}
                                placeholder="영상에 대한 설명을 입력하세요"
                                disabled={uploading}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    카테고리 *
                                </label>
                                <select
                                    value={metadata.category}
                                    onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={uploading}
                                >
                                    <option value="">선택하세요</option>
                                    <option value="Standing">스탠딩</option>
                                    <option value="Guard">가드</option>
                                    <option value="Guard Pass">가드 패스</option>
                                    <option value="Side">사이드</option>
                                    <option value="Mount">마운트</option>
                                    <option value="Back">백</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    난이도
                                </label>
                                <select
                                    value={metadata.difficulty}
                                    onChange={(e) => setMetadata({ ...metadata, difficulty: e.target.value as any })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    disabled={uploading}
                                >
                                    <option value="Beginner">초급</option>
                                    <option value="Intermediate">중급</option>
                                    <option value="Advanced">상급</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    가격 (₩)
                                </label>
                                <input
                                    type="number"
                                    value={metadata.price}
                                    onChange={(e) => setMetadata({ ...metadata, price: Number(e.target.value) })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="0 (무료)"
                                    min="0"
                                    disabled={uploading}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    영상 길이
                                </label>
                                <input
                                    type="text"
                                    value={metadata.length}
                                    onChange={(e) => setMetadata({ ...metadata, length: e.target.value })}
                                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="예: 10:30"
                                    disabled={uploading}
                                />
                            </div>
                        </div>

                        {/* 에러 메시지 */}
                        {error && (
                            <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        )}

                        {/* 업로드 버튼 */}
                        <Button
                            onClick={handleUpload}
                            disabled={uploading || !metadata.title || !metadata.category}
                            className="w-full py-4 text-lg"
                        >
                            {uploading ? `업로드 중... ${progress}%` : '업로드 시작'}
                        </Button>

                        {/* 진행률 바 */}
                        {uploading && (
                            <div className="space-y-2">
                                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-sm text-slate-600 text-center">
                                    {progress < 80 ? 'Vimeo에 업로드 중...' :
                                        progress < 90 ? '데이터베이스에 저장 중...' :
                                            '거의 완료...'}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* 성공 메시지 */}
                {success && (
                    <div className="text-center py-12">
                        <CheckCircle2 className="w-20 h-20 text-green-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-slate-900 mb-2">
                            업로드 완료!
                        </h3>
                        <p className="text-slate-600 mb-6">
                            영상이 성공적으로 업로드되었습니다.
                        </p>
                        <p className="text-sm text-slate-500">
                            잠시 후 영상 관리 페이지로 이동합니다...
                        </p>
                    </div>
                )}
            </div>

            {/* 안내 사항 */}
            {!file && (
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">📝 업로드 안내</h4>
                    <ul className="space-y-2 text-sm text-blue-800">
                        <li>• Basic 계정은 주당 500MB, 총 5GB까지 업로드 가능합니다.</li>
                        <li>• 업로드된 영상은 자동으로 Vimeo에 저장됩니다.</li>
                        <li>• 영상은 비공개(unlisted)로 설정되며, 링크를 통해서만 접근 가능합니다.</li>
                        <li>• 업로드 후 Vimeo에서 자동으로 트랜스코딩이 진행됩니다.</li>
                    </ul>
                </div>
            )}
        </div>
    );
};
