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

        // Fetch progress for each course
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">로그인이 필요합니다</h2>
          <p className="text-slate-600 mb-6">내 강좌를 보려면 로그인하세요.</p>
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
    <div className="bg-slate-50 min-h-screen">
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {courses.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 shadow-lg">
              <BookOpen className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">아직 구매한 강좌가 없습니다</h2>
            <p className="text-slate-600 mb-8">관심 있는 강좌를 찾아보세요!</p>
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
                <h2 className="text-2xl font-bold text-slate-900">
                  총 {courses.length}개의 강좌
                </h2>
                <p className="text-slate-600 mt-1">언제든지 학습을 이어갈 수 있습니다</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div key={course.id} className="relative flex flex-col h-full">
                  <CourseCard course={course} />

                  {/* Progress Overlay */}
                  <div className="absolute bottom-[140px] left-0 right-0 px-4">
                    <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-slate-100">
                      <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                        <span>진도율</span>
                        <span>{Math.round(course.progress || 0)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
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

        <div className="mt-12 border-t border-slate-200 pt-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">구독 상태</h2>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <span className="text-slate-500 text-sm">현재 멤버십</span>
              <p className="text-xl font-bold text-slate-900">
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
