
import React, { useState } from 'react';
import { Calendar, User, Clock, Download, Dumbbell, Globe } from 'lucide-react';
import { format } from 'date-fns';

// Mock data for shared weekly routines
// In a real implementation, this would come from a 'user_weekly_schedules' table
const SHARED_SCHEDULES = [
    {
        id: 'mock-ws-1',
        title: "IBJJF 팬암 대비 4주차 스케줄",
        creatorName: "Grapplay Coach",
        creatorAvatar: null,
        description: "시합 1달 전, 고강도 드릴과 스파링 위주의 스케줄입니다.",
        difficulty: "Advanced",
        totalTimeMinutes: 420, // 7 hours
        daysCount: 5, // 5 days a week
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
        likes: 42,
        downloads: 15,
        routinesPreview: ['가드 패스 드릴 A', '레그락 방어 루틴', '체력 컨디셔닝']
    },
    {
        id: 'mock-ws-2',
        title: "화이트벨트 기초 3분할",
        creatorName: "Master Lee",
        creatorAvatar: null,
        description: "기초 체력과 기본 움직임을 익히는 주 3회 루틴",
        difficulty: "Beginner",
        totalTimeMinutes: 180, // 3 hours
        daysCount: 3,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
        likes: 128,
        downloads: 89,
        routinesPreview: ['기초 구르기', '새우빼기 집중', '탑 포지션 유지']
    },
    {
        id: 'mock-ws-3',
        title: "직장인을 위한 주 2회 효율 루틴",
        creatorName: "BJJ Worker",
        creatorAvatar: null,
        description: "짧은 시간에 최대 효율을 뽑는 컴팩트 루틴",
        difficulty: "Intermediate",
        totalTimeMinutes: 120,
        daysCount: 2,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
        likes: 56,
        downloads: 23,
        routinesPreview: ['출근 전 20분 드릴', '퇴근 후 40분 스파링']
    }
];

export const SharedRoutineLibrary: React.FC = () => {
    const [schedules, setSchedules] = useState(SHARED_SCHEDULES);

    const handleImport = (id: string, title: string) => {
        // In a real app, this would fetch the schedule JSON and save it to the user's local storage or backend
        alert(`'${title}' 스케줄을 내 캘린더로 가져왔습니다! (Mock Alert)`);
    };

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white mb-1">공유된 주간 훈련 계획</h2>
                    <p className="text-zinc-400 text-sm">다른 그래플러들의 주간 루틴을 참고하여 내 훈련 계획을 세워보세요.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {schedules.map(schedule => (
                    <div key={schedule.id} className="group bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all duration-300 flex flex-col h-full hover:shadow-[0_0_20px_rgba(124,58,237,0.1)]">
                        {/* Header Area */}
                        <div className="p-6 pb-4 bg-gradient-to-br from-zinc-800/50 to-zinc-900 border-b border-zinc-800/50">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 text-violet-500 shadow-inner">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div className="flex gap-2">
                                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold border ${schedule.difficulty === 'Beginner' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                            schedule.difficulty === 'Advanced' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                        }`}>
                                        {schedule.difficulty}
                                    </span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2 leading-tight group-hover:text-violet-400 transition-colors">
                                {schedule.title}
                            </h3>
                            <p className="text-xs text-zinc-500 line-clamp-2 min-h-[2.5em]">
                                {schedule.description}
                            </p>
                        </div>

                        {/* Stats Row */}
                        <div className="px-6 py-3 bg-zinc-950/30 flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/50">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5" title="주간 운동 일수">
                                    <Dumbbell className="w-3.5 h-3.5 text-zinc-500" />
                                    <span className="font-medium text-zinc-300">주 {schedule.daysCount}회</span>
                                </span>
                                <span className="flex items-center gap-1.5" title="총 소요 시간">
                                    <Clock className="w-3.5 h-3.5 text-zinc-500" />
                                    <span className="font-medium text-zinc-300">{Math.floor(schedule.totalTimeMinutes / 60)}h {schedule.totalTimeMinutes % 60}m</span>
                                </span>
                            </div>
                        </div>

                        {/* Content Preview */}
                        <div className="p-6 flex-1 flex flex-col">
                            <div className="flex-1 space-y-2 mb-6">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">포함된 주요 루틴</p>
                                {schedule.routinesPreview.map((routine, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-zinc-300">
                                        <div className="w-1 h-1 rounded-full bg-violet-500 shrink-0" />
                                        <span className="truncate">{routine}</span>
                                    </div>
                                ))}
                                {schedule.routinesPreview.length < 3 && (
                                    <div className="text-xs text-zinc-600 italic pl-3">...외 {3 - schedule.routinesPreview.length}개</div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                                        {schedule.creatorAvatar ? (
                                            <img src={schedule.creatorAvatar} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-3.5 h-3.5 text-zinc-500" />
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-medium text-zinc-300">{schedule.creatorName}</span>
                                        <span className="text-[10px] text-zinc-600">{format(new Date(schedule.createdAt), 'yyyy.MM.dd')}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleImport(schedule.id, schedule.title)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-violet-600 hover:text-white text-zinc-400 text-xs font-bold transition-all group/btn"
                                >
                                    <Download className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                                    가져오기
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Coming Soon Card */}
                <div className="bg-zinc-900/30 border border-zinc-800/50 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[300px]">
                    <Globe className="w-12 h-12 text-zinc-700 mb-4" />
                    <h3 className="text-lg font-bold text-zinc-500 mb-2">당신의 루틴을 공유하세요!</h3>
                    <p className="text-sm text-zinc-600 max-w-xs">
                        주간 계획표에서 '공유' 버튼을 눌러 나만의 트레이닝 루틴을 다른 유저들에게 선보이세요.
                    </p>
                </div>
            </div>
        </div>
    );
};
