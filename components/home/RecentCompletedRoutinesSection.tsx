import React from 'react';
import { useNavigate } from 'react-router-dom';
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
        className="flex gap-4 overflow-x-auto pb-6 -mx-4 px-4 md:-mx-6 md:px-6 lg:-mx-12 lg:px-12 hide-scrollbar snap-x snap-mandatory"
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
            className="snap-start flex-shrink-0 w-[240px] md:w-[320px] group relative bg-zinc-900/50 border border-zinc-800/50 rounded-2xl overflow-hidden hover:border-violet-500/50 transition-all duration-300 cursor-pointer hover:shadow-xl hover:shadow-violet-500/10"
          >
            {/* Thumbnail or Gradient Background */}
            {routine.routineThumbnail ? (
              <div className="aspect-video w-full overflow-hidden">
                <img
                  src={routine.routineThumbnail}
                  alt={routine.routineTitle}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : (
              <div className="aspect-video w-full bg-gradient-to-br from-violet-600/20 to-violet-900/20 relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.1),transparent_50%)]" />
              </div>
            )}

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Title */}
              <h3 className="font-bold text-white text-sm md:text-base line-clamp-2 group-hover:text-violet-300 transition-colors">
                {routine.routineTitle}
              </h3>

              {/* Stats Row */}
              <div className="flex items-center gap-3 text-[10px] md:text-xs">
                {/* Duration */}
                <div className="flex items-center gap-1 text-violet-400 font-medium whitespace-nowrap">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDuration(routine.durationSeconds ?? (routine.durationMinutes * 60))}</span>
                </div>

                {/* Relative Time */}
                <div className="text-zinc-500">
                  {getRelativeTime(routine.completedAt)}
                </div>
              </div>
            </div>

            {/* Completed Badge */}
            <div className="absolute top-2 right-2 bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-500/30 backdrop-blur-sm">
              완료
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
