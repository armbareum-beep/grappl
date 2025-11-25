import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getUserCourses, getCourseProgress } from '../lib/api';
import { Course } from '../types';
import { CourseCard } from '../components/CourseCard';
import { useAuth } from '../contexts/AuthContext';
import { BookOpen, PlayCircle } from 'lucide-react';

interface CourseWithProgress extends Course {
  progress?: number;
  completedLessons?: number;
  totalLessons?: number;
}

export const MyLibrary: React.FC = () => {
  const { user } = useAuth();
  const [courses, setCourses] = useState<CourseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMyCourses() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const coursesData = await getUserCourses(user.id);

        const coursesWithProgress = await Promise.all(
          coursesData.map(async (course) => {
            const progressData = await getCourseProgress(user.id, course.id);
            return {
              ...course,
              progress: progressData.percentage,
              completedLessons: progressData.completed,
              totalLessons: progressData.total
            };
          })
        );

        setCourses(coursesWithProgress);
      } catch (error) {
        console.error('Error fetching user courses:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchMyCourses();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">로그인이 필요합니다</h2>
          <p className="text-slate-400 mb-6">내 강좌를 보려면 로그인하세요.</p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인하기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <BookOpen className="w-10 h-10" />
            <h1 className="text-4xl font-bold">내 강좌</h1>
          </div>
          <p className="text-blue-100 text-lg">
            구매한 강좌를 계속 학습하세요
          </p>
        </div>
      </div>

      {/* Subscriber Features Info */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-12">
        <div className="bg-slate-900 rounded-xl shadow-lg p-6 border border-slate-800">
          <h3 className="text-lg font-bold text-white mb-4">🌟 구독자 전용 혜택</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-900/50 rounded-lg text-blue-400">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">무제한 수강</h4>
                <p className="text-sm text-slate-400">모든 강좌를 제한 없이 자유롭게 수강하세요.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-purple-900/50 rounded-lg text-purple-400">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">오프라인 저장</h4>
                <p className="text-sm text-slate-400">앱에서 영상을 다운로드하여 데이터 걱정 없이 시청하세요.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-900/50 rounded-lg text-green-400">
                <PlayCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">4K 초고화질</h4>
                <p className="text-sm text-slate-400">선명한 화질로 디테일한 기술을 확인하세요.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {courses.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-slate-900 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg border border-slate-800">
              <BookOpen className="w-12 h-12 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">아직 구매한 강좌가 없습니다</h2>
            <p className="text-slate-400 mb-8">관심 있는 강좌를 찾아보세요!</p>
            <Link
              to="/browse"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              강좌 둘러보기
            </Link>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">
                  총 {courses.length}개의 강좌
                </h2>
                <p className="text-slate-400 mt-1">언제든지 학습을 이어갈 수 있습니다</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div key={course.id} className="relative flex flex-col h-full">
                  <CourseCard course={course} />

                  {/* Progress Overlay */}
                  <div className="absolute bottom-[140px] left-0 right-0 px-4">
                    <div className="bg-slate-900/95 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-700">
                      <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                        <span>진도율</span>
                        <span>{Math.round(course.progress || 0)}%</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 mb-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${course.progress || 0}%` }}
                        ></div>
                      </div>
                      <Link to={`/courses/${course.id}`}>
                        <button className="w-full flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 rounded transition-colors">
                          <PlayCircle className="w-3 h-3" />
                          {course.progress === 100 ? '다시 보기' : course.progress && course.progress > 0 ? '이어보기' : '학습 시작하기'}
                        </button>
                      </Link>
                    </div>
                  </div>

                  <div className="absolute top-4 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    ✓ 구매 완료
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mt-12 border-t border-slate-800 pt-8">
          <h2 className="text-2xl font-bold text-white mb-4">구독 상태</h2>
          <div className="bg-slate-900 p-6 rounded-xl shadow-lg border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-slate-400 text-sm">현재 멤버십</span>
              <p className="text-xl font-bold text-white">
                {user.isSubscriber ? '구독 회원' : '무료 회원'}
              </p>
            </div>
            {!user.isSubscriber && (
              <Link to="/pricing">
                <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                  멤버십 업그레이드
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
