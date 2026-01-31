import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, CheckCircle2 } from 'lucide-react';
import { CompletedRoutineRecord } from '../../types';

interface Props {
  routines: CompletedRoutineRecord[];
}

export const RecentCompletedRoutinesSection: React.FC<Props> = ({ routines }) => {
  const navigate = useNavigate();
  // 이전에는 데이터가 없으면 null을 반환하여 섹션이 사라졌으나, 
  // 사용자가 혼란스러워하므로 "완료한 루틴이 없습니다" 메시지를 표시하도록 변경합니다.
  if (!routines || routines.length === 0) {
    return (
      <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-violet-400" />
            최근 완료한 루틴
          </h2>
        </div>
        <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 text-center">
          <p className="text-zinc-500 font-medium">아직 완료한 루틴이 없습니다. 첫 루틴을 완료해보세요!</p>
        </div>
      </section>
    );
  }

  // 시간 포맷 함수 (초 단위 지원)
  const formatDuration = (seconds: number) => {
    if (seconds <= 0) return '0초';

    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}시간 ${mins}분`;
    }
    if (mins > 0) {
      return `${mins}분 ${secs}초`;
    }
    return `${secs}초`;
  };

  // ... (getRelativeTime remains same) ...

  const getRelativeTime = (isoString: string) => {
    const now = new Date();
    const completed = new Date(isoString);
    const diffMs = now.getTime() - completed.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}분 전`;
    if (diffHours < 24) return `${diffHours}시간 전`;
    if (diffDays === 1) return '어제';
    return `${diffDays}일 전`;
  };

  return (
    <section className="px-4 md:px-6 lg:px-12 max-w-[1440px] mx-auto mb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-violet-400" />
            최근 완료한 루틴
          </h2>
          <p className="text-zinc-400 text-sm mt-1 font-medium">
            지난 훈련 기록을 확인하고 다시 도전해보세요
          </p>
        </div>
        <button
          onClick={() => navigate('/completed-routines')}
          className="text-sm font-bold text-violet-400 hover:text-violet-300 transition-colors bg-violet-500/10 px-4 py-2 rounded-full border border-violet-500/20"
        >
          더 보기
        </button>
      </div>

      <div
        className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-12 lg:px-12 snap-x snap-mandatory"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {routines.map((routine) => (
          <div
            key={routine.id}
            onClick={() => {
              if (routine.routineId && routine.routineId !== 'undefined') {
                navigate(`/routines/${routine.routineId}`);
              } else {
                console.warn('[RecentCompletedRoutinesSection] Missing or invalid routineId', routine);
              }
            }}
            className="snap-start flex-shrink-0 w-[140px] md:w-[180px] group cursor-pointer"
          >
            {/* Thumbnail Card */}
            <div className="relative bg-zinc-900 rounded-2xl overflow-hidden mb-3 transition-all duration-500 group-hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] group-hover:ring-1 group-hover:ring-violet-500/30 aspect-[2/3]">
              {routine.routineThumbnail ? (
                <img
                  src={routine.routineThumbnail}
                  alt={routine.routineTitle}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 font-bold text-xs uppercase bg-gradient-to-br from-violet-600/20 to-violet-900/20">No Image</div>
              )}

              {/* Completed Badge */}
              <div className="absolute top-3 right-3 bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-500/30 backdrop-blur-sm">
                완료
              </div>

              {/* Duration Badge */}
              <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-[10px] font-bold text-white border border-white/10 group-hover:border-violet-500/50 transition-colors">
                {formatDuration(routine.durationSeconds ?? (routine.durationMinutes * 60))}
              </div>
            </div>

            {/* Text Info - Standardized Style */}
            <div className="mt-3 flex gap-2.5 px-1">
              {/* Creator Avatar (Left side) */}
              <div className="shrink-0 pt-0.5">
                {routine.creatorId && (
                  <Link
                    to={routine.id ? `/routines/${routine.id}` : '#'}
                    onClick={(e) => {
                      // Prevent navigation if no routine ID or handle appropriately
                      e.stopPropagation();
                      // Maybe navigate to creator? The original link was to creator. 
                      // But wait, the previous code linked to /creator/:id
                      // Let's keep it if it's a real creator. But simple users don't have creator page.
                      // For now, let's just make it a non-clickable div if needed, or link to profile?
                      // Standard behavior in other cards is link to creator.
                      if (routine.creatorId) navigate(`/creator/${routine.creatorId}`);
                    }}
                    className="block"
                  >
                    <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden hover:border-violet-500/50 transition-colors">
                      {routine.creatorProfileImage ? (
                        <img src={routine.creatorProfileImage} alt={routine.creatorName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                          {routine.creatorName?.charAt(0) || 'U'}
                        </div>
                      )}
                    </div>
                  </Link>
                )}
                {!routine.creatorId && (
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center text-[10px] text-zinc-500 font-bold">
                    U
                  </div>
                )}
              </div>

              {/* Text Content (Right side) */}
              <div className="flex-1 min-w-0">
                <h3 className="text-zinc-100 text-sm md:text-base font-bold line-clamp-2 leading-snug mb-1 group-hover:text-violet-400 transition-colors">
                  {routine.routineTitle}
                </h3>
                <div className="flex items-center justify-between">
                  {/* Creator Name */}
                  <p className="text-zinc-500 text-xs font-medium truncate max-w-[60%]">
                    {routine.creatorName || '사용자'}
                  </p>

                  {/* Time/Status Badge - replacing 'getRelativeTime' with specific badge if preferred, 
                      or just keeping the relative time but styled like a badge?
                      User asked for "Same as other card".
                      Other card has: [Creator Name] [Category/Type Badge]
                      Here we can show [Creator Name] [Relative Time] styled as badge? 
                      Or [Creator Name] [Completed/Duration?]
                      
                      Let's put "루틴" or duration as the badge to match style.
                      Since "completedAt" is useful context, maybe we keep relative time as the badge text?
                      Or strictly "루틴"?
                      
                      Let's go with "루틴" badge or duration badge to be consistent visually.
                      But information-wise, "X mins ago" is valuable here.
                      Let's try: Left: Creator Name, Right: Relative Time (as badge style)
                   */}
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 line-clamp-1 max-w-[40%] text-right overflow-hidden text-ellipsis whitespace-nowrap">
                    {getRelativeTime(routine.completedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
