import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Link2, Facebook, Twitter, Instagram } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const KakaoIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3C5.925 3 1 6.925 1 11.775C1 14.675 2.875 17.225 5.75 18.725C5.75 18.725 5.225 20.675 5.15 20.975C5.075 21.275 5.375 21.425 5.6 21.275C6.725 20.525 9.05 18.95 10.625 17.875C11.075 17.95 11.6 17.95 12 17.95C18.075 17.95 23 14.025 23 9.175C23 4.325 18.075 3 12 3Z" />
    </svg>
);

const ThreadsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.7126 10.4568C12.7126 12.0163 12.0945 12.9248 10.8584 12.9248C9.5529 12.9248 8.86877 12.0813 8.86877 10.5898C8.86877 8.94132 9.77132 8.16913 11.1965 8.16913C12.1132 8.16913 12.5922 8.44111 12.7126 8.92471V10.4568ZM12.7214 7.21061C12.2855 6.97451 11.751 6.8488 11.1965 6.8488C8.83296 6.8488 7.37877 8.28929 7.37877 10.5898C7.37877 12.9734 8.79093 14.2442 10.859 14.2442C12.084 14.2442 12.8943 13.6828 13.4326 12.9204L14.0734 13.6195C13.2796 14.7176 12.0461 15.176 10.859 15.176C8.28452 15.176 6.13605 13.5674 6.13605 10.6045C6.13605 7.6338 8.35652 5.51868 11.3656 5.51868C14.7351 5.51868 16.5912 7.7332 16.5912 11.1367V11.2372C16.5912 11.6668 16.524 12.0729 16.4862 12.443C16.3263 13.9113 15.2238 15.0006 13.8824 15.0006C12.7303 15.0006 11.9566 14.2341 11.9566 13.0645V10.418C11.6876 10.1506 11.2844 9.99285 10.8584 9.99285C10.0511 9.99285 9.61393 10.3642 9.61393 10.963C9.61393 11.4589 9.91662 11.7056 10.3706 11.7056C10.749 11.7056 11.0853 11.5208 11.3596 11.2682V13.0645C11.3596 14.6461 12.4865 15.6888 13.8824 15.6888C15.6312 15.6888 17.0621 14.2882 17.2721 12.5239C17.3232 12.1129 17.3364 11.6565 17.3364 11.2372V11.1367C17.3364 7.24585 15.1519 4.60303 11.3656 4.60303C7.59074 4.60303 4.88281 7.26571 4.88281 10.6045C4.88281 14.0729 7.70671 16.3685 10.859 16.3685C12.3396 16.3685 13.5682 15.9328 14.5447 15.2755L14.9818 16.4526C13.9046 17.1509 12.4909 17.6883 10.859 17.6883C7.14305 17.6883 3.63867 14.8809 3.63867 10.6045C3.63867 6.6432 6.94074 3.41113 11.3656 3.41113C15.6312 3.41113 18.2323 6.64777 18.2323 11.1367V11.2372L18.2317 11.2404C18.2317 11.2435 18.2323 11.2464 18.2323 11.2372Z" />
    </svg>
);

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    text: string;
    url?: string;
    imageUrl?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    title,
    text,
    url,
    imageUrl,
}) => {
    const shareUrl = url || window.location.href;
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = async (platform: string) => {
        let openUrl = '';
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedText = encodeURIComponent(text);

        switch (platform) {
            case 'kakao':
                handleCopy();
                alert('링크가 복사되었습니다. 카카오톡에 붙여넣기 해주세요!');
                return;
            case 'facebook':
                openUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
                break;
            case 'twitter':
                openUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
                break;
            case 'threads':
                openUrl = `https://www.threads.net/intent/post?text=${encodedText}%20${encodedUrl}`;
                break;
            case 'instagram':
                handleCopy();
                alert('링크가 복사되었습니다. 인스타그램에 붙여넣기 해주세요!');
                return;
        }

        if (openUrl) {
            window.open(openUrl, '_blank', 'width=600,height=400');
        }
    };

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden ring-1 ring-white/5"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none" />

                        <div className="p-8 relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white leading-tight tracking-tight">공유하기</h3>
                                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Share with friends</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    aria-label="공유 모달 닫기"
                                    className="p-3 bg-zinc-800/50 hover:bg-zinc-800 rounded-2xl text-zinc-500 hover:text-white transition-all active:scale-95"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="bg-zinc-950/50 rounded-3xl overflow-hidden mb-8 border border-zinc-800/50 flex items-center gap-4 p-4 group transition-all hover:bg-zinc-950/80">
                                {imageUrl && (
                                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-zinc-800 border border-white/5">
                                        <img src={imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-black text-sm truncate mb-1">{title}</p>
                                    <div className="flex items-center gap-1.5 text-zinc-500">
                                        <Link2 className="w-3 h-3 shrink-0" />
                                        <p className="text-[10px] font-bold truncate tracking-tight">{shareUrl}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-y-8 gap-x-4">
                                <ShareButton
                                    icon={<Link2 className="w-5 h-5" />}
                                    label={copied ? "복사됨!" : "링크 복사"}
                                    onClick={handleCopy}
                                    color="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/50"
                                    active={copied}
                                />

                                <ShareButton
                                    icon={<KakaoIcon />}
                                    label="카카오톡"
                                    onClick={() => handleShare('kakao')}
                                    color="bg-[#FEE500] hover:bg-[#FDD835] text-[#3c1e1e]"
                                />

                                <ShareButton
                                    icon={<Instagram className="w-5 h-5" />}
                                    label="Instagram"
                                    onClick={() => handleShare('instagram')}
                                    color="bg-gradient-to-tr from-[#FFD600] via-[#FF0169] to-[#D300C5] text-white shadow-xl shadow-rose-900/20"
                                />

                                <ShareButton
                                    icon={<Facebook className="w-5 h-5" />}
                                    label="Facebook"
                                    onClick={() => handleShare('facebook')}
                                    color="bg-[#1877F2] hover:bg-[#166FE5] text-white shadow-xl shadow-blue-900/20"
                                />

                                <ShareButton
                                    icon={<Twitter className="w-4 h-4" />}
                                    label="X"
                                    onClick={() => handleShare('twitter')}
                                    color="bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-white"
                                />

                                <ShareButton
                                    icon={<ThreadsIcon />}
                                    label="Threads"
                                    onClick={() => handleShare('threads')}
                                    color="bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-white"
                                />
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(modalContent, document.body);
};

const ShareButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    color: string;
    active?: boolean;
}> = ({ icon, label, onClick, color, active }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center gap-3 group"
    >
        <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 transform shadow-lg",
            color,
            active ? 'ring-2 ring-violet-500 ring-offset-2 ring-offset-zinc-900 scale-95' : 'hover:scale-110 active:scale-90'
        )}>
            {icon}
        </div>
        <span className={cn(
            "text-[10px] font-black tracking-tighter transition-colors text-center uppercase whitespace-nowrap",
            active ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300"
        )}>
            {label}
        </span>
    </button>
);

export default ShareModal;
