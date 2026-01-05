import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Repeat, Send, MoreHorizontal, Sparkles, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

const FEED_POSTS = [
    {
        id: 1,
        user: { name: 'Marcus', belt: 'Blue Belt', isInstructor: true, image: null },
        content: "스파링에서 탑 포지션을 잡았을 때, 상대가 하프가드로 들어오면 무리해서 패스하려 하지 마세요. \n\n먼저 상대의 머리를 제압하고 크로스페이스를 만든 뒤에 천천히 압박해야 합니다. 급하면 오히려 스윕당하기 쉽습니다. 👇 아래 영상에서 디테일을 확인하세요.",
        timeAgo: '2h',
        likes: 124,
        comments: 18,
        image: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2669&auto=format&fit=crop',
        video: false
    },
    {
        id: 2,
        user: { name: 'Ji-hoon', belt: 'Brown Belt', isInstructor: false, image: null },
        content: "오늘 드릴 세션 완료! 🔥\n지난주보다 확실히 골반 움직임이 가벼워진 느낌입니다. 역시 꾸준함이 답이네요.",
        timeAgo: '5h',
        likes: 856,
        comments: 42,
        image: null,
        video: false,
        aiBadge: true
    },
    {
        id: 3,
        user: { name: 'Sarah Kim', belt: 'Blue Belt', isInstructor: false, image: null },
        content: "질문 있습니다! 🙋‍♀️\n클로즈 가드에서 암바 시도할 때 자꾸 상대가 팔을 빼는데, 락을 거는 타이밍이 문제일까요? 고수님들의 조언 부탁드려요!",
        timeAgo: '8h',
        likes: 45,
        comments: 12,
        image: null,
        video: false
    }
];

const FeedPost = ({ post }: { post: typeof FEED_POSTS[0] }) => {
    const [liked, setLiked] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="border-b border-zinc-800 p-4 hover:bg-zinc-900/40 transition-colors cursor-pointer group text-left relative">
            <div className="flex gap-3">
                <div className="flex-shrink-0 pt-1">
                    <div className="w-[44px] h-[44px] rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                        {post.user.image ? (
                            <img src={post.user.image} alt={post.user.name} className="w-full h-full object-cover" />
                        ) : (
                            <span className="font-bold text-zinc-500">{post.user.name[0]}</span>
                        )}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-100 text-[15px]">{post.user.name}</span>
                            {post.user.isInstructor && (
                                <ShieldCheck className="w-3.5 h-3.5 text-violet-500 fill-violet-500/20" />
                            )}
                            <span className="text-zinc-500 text-xs">{post.timeAgo}</span>
                        </div>
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-1 rounded-full hover:bg-zinc-800 transition-colors"
                            >
                                <MoreHorizontal className="w-5 h-5 text-zinc-600 group-hover:text-zinc-400" />
                            </button>
                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-32 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                                    <button className="w-full text-left px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 transition-colors">신고하기</button>
                                    <button className="w-full text-left px-4 py-2 text-xs text-rose-500 hover:bg-white/5 transition-colors">삭제하기</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {!post.user.isInstructor && (
                        <div className="mb-2">
                            <span className={cn(
                                "text-[10px] px-1.5 py-0.5 rounded font-bold border",
                                post.user.belt.includes("Black") ? "bg-zinc-950 text-zinc-400 border-zinc-700" :
                                    post.user.belt.includes("Brown") ? "bg-amber-950/30 text-amber-500 border-amber-900/30" :
                                        post.user.belt.includes("Purple") ? "bg-purple-950/30 text-purple-400 border-purple-900/30" :
                                            post.user.belt.includes("Blue") ? "bg-blue-950/30 text-blue-400 border-blue-900/30" :
                                                "bg-zinc-900 text-zinc-500 border-zinc-800"
                            )}>
                                {post.user.belt}
                            </span>
                        </div>
                    )}

                    <p className="text-zinc-200 text-[15px] leading-relaxed whitespace-pre-wrap mb-3">
                        {post.content}
                    </p>

                    {post.image && (
                        <div className="mb-3 rounded-xl overflow-hidden border border-zinc-800 aspect-square">
                            <img src={post.image} alt="Post media" className="w-full h-full object-cover" />
                        </div>
                    )}

                    {post.aiBadge && (
                        <div className="mb-3 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                                <Sparkles className="w-4 h-4 text-violet-400" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-violet-300">AI Analysis Complete</div>
                                <div className="text-xs text-violet-200/70">Routine performance improved by 12%</div>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-4 -ml-2">
                        <button
                            className="group flex items-center gap-1.5 p-2 rounded-full hover:bg-zinc-800/50 transition-colors"
                            onClick={(e) => { e.stopPropagation(); setLiked(!liked); }}
                        >
                            <Heart className={cn("w-5 h-5 transition-colors", liked ? "fill-red-500 text-red-500" : "text-zinc-500 group-hover:text-red-500")} />
                            <span className={cn("text-xs", liked ? "text-red-500" : "text-zinc-500")}>{liked ? post.likes + 1 : post.likes}</span>
                        </button>

                        <button className="group flex items-center gap-1.5 p-2 rounded-full hover:bg-zinc-800/50 transition-colors">
                            <MessageCircle className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
                            <span className="text-xs text-zinc-500">{post.comments}</span>
                        </button>

                        <button className="group flex items-center p-2 rounded-full hover:bg-zinc-800/50 transition-colors">
                            <Repeat className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
                        </button>

                        <button className="group flex items-center p-2 rounded-full hover:bg-zinc-800/50 transition-colors">
                            <Send className="w-5 h-5 text-zinc-500 group-hover:text-zinc-300" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const CommunityFeedSection = () => {
    const navigate = useNavigate();

    return (
        <section className="py-24 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-900/20 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-xl mx-auto px-4 relative z-10">
                <div className="text-center mb-12 relative">
                    <div className="inline-flex items-center px-3 py-1.5 rounded-full border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm mb-6">
                        <MessageCircle className="w-3.5 h-3.5 text-violet-500 mr-2" />
                        <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em]">LIVE COMMUNITY</span>
                    </div>
                    <h2 className="text-white text-3xl md:text-5xl font-black tracking-tighter leading-tight mb-4">
                        벨트 너머의 노하우<br />
                        <span className="text-violet-500">함께 성장하는 공간</span>
                    </h2>
                    <p className="text-zinc-500 text-lg">
                        궁금한 점을 질문하고, 고수들의 답변을 확인하세요.
                    </p>
                </div>

                <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl relative min-h-[600px] flex flex-col">
                    <div className="h-14 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-20 shrink-0">
                        <span className="font-black text-lg tracking-tighter text-white">
                            Grapplay Feed
                        </span>
                        <div className="flex gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                            <div className="w-2 h-2 rounded-full bg-zinc-800"></div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto relative scrollbar-hide pb-20">
                        <div className="divide-y divide-zinc-900 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {FEED_POSTS.map(post => (
                                <FeedPost key={post.id} post={post} />
                            ))}
                        </div>
                    </div>

                    {/* Fading Overlay */}
                    <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-black via-black/80 to-transparent z-20 pointer-events-none" />

                    {/* CTA Button Overlay */}
                    <div className="absolute bottom-0 inset-x-0 flex items-end justify-center pb-8 z-30 pointer-events-none">
                        <button
                            onClick={() => navigate('/journal')}
                            className="pointer-events-auto bg-zinc-100 hover:bg-white text-black font-bold text-sm px-6 py-3 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Sparkles className="w-4 h-4" /> 커뮤니티에서 더보기
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-zinc-600 text-sm">
                        매일 500개 이상의 유용한 팁이 공유되고 있습니다.
                    </p>
                </div>
            </div>
        </section>
    );
};
