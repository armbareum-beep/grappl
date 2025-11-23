import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlayCircle, CheckCircle, Users } from 'lucide-react';
import { Button } from '../components/Button';
import { MOCK_CREATORS } from '../constants';
import { getFeaturedContent, getCourses, getCreators } from '../lib/api';
import { Creator, Course } from '../types';
import { CourseCard } from '../components/CourseCard';

export const Home: React.FC = () => {
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([]);
  const [featuredCreators, setFeaturedCreators] = useState<Creator[]>([]);
  const [featuredContent, setFeaturedContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const { data } = await getFeaturedContent();
        setFeaturedContent(data);

        // Courses
        if (data?.featuredCourseIds && data.featuredCourseIds.length > 0) {
          const allCourses = await getCourses();
          const featured = allCourses.filter(c => data.featuredCourseIds.includes(c.id));
          setFeaturedCourses(featured);
        } else {
          const allCourses = await getCourses();
          setFeaturedCourses(allCourses.slice(0, 3));
        }

        // Creators
        if (data?.featuredCreatorIds && data.featuredCreatorIds.length > 0) {
          const allCreators = await getCreators();
          const featured = allCreators.filter(c => data.featuredCreatorIds.includes(c.id));
          setFeaturedCreators(featured);
        } else {
          const allCreators = await getCreators();
          if (allCreators && allCreators.length > 0) {
            setFeaturedCreators(allCreators.slice(0, 2));
          } else {
            setFeaturedCreators(MOCK_CREATORS.slice(0, 2));
          }
        }
      } catch (error) {
        console.error('Error fetching featured content:', error);
        const allCourses = await getCourses();
        setFeaturedCourses(allCourses.slice(0, 3));
        setFeaturedCreators(MOCK_CREATORS.slice(0, 2));
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

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

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <div className="relative bg-slate-900 text-white py-24 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src={featuredContent?.heroImageUrl || "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=2069&q=80"}
            alt="Jiu Jitsu Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">
            매트를 지배하는 <span className="text-blue-500">기술의</span> 정점
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            세계적인 챔피언들의 노하우가 담긴 체계적인 커리큘럼.
            Grappolio와 함께 당신의 주짓수를 한 단계 업그레이드하세요.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/browse">
              <Button size="lg" className="w-full sm:w-auto text-lg px-8 py-4">
                지금 시작하기
              </Button>
            </Link>
            <Link to="/pricing">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto text-lg px-8 py-4">
                요금제 보기
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 text-center">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlayCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">고화질 테크닉 영상</h3>
              <p className="text-slate-600">모든 디테일을 놓치지 않는 4K 고화질 영상과 멀티 앵글 제공.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">체계적인 커리큘럼</h3>
              <p className="text-slate-600">초급부터 고급까지, 단계별로 구성된 마스터 클래스.</p>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">검증된 인스트럭터</h3>
              <p className="text-slate-600">월드 챔피언, 블랙벨트 지도자들이 직접 알려주는 실전 기술.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Courses */}
      <div className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">인기 강좌</h2>
              <p className="text-slate-600 mt-2">가장 많은 회원이 시청한 강좌입니다.</p>
            </div>
            <Link to="/browse" className="text-blue-600 font-semibold hover:text-blue-700">
              전체 보기 &rarr;
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </div>
      </div>

      {/* Featured Creators */}
      <div className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900">대표 인스트럭터</h2>
            <p className="text-slate-600 mt-2">세계적인 수준의 인스트럭터들과 함께하세요.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            {featuredCreators.map(creator => (
              <div key={creator.id} className="flex items-center gap-6 p-6 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
                <img src={creator.profileImage} alt={creator.name} className="w-24 h-24 rounded-full object-cover" />
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-1">{creator.name}</h3>
                  <p className="text-slate-600 mb-3 line-clamp-2">{creator.bio}</p>
                  <Link to={`/creator/${creator.id}`}>
                    <Button variant="outline" size="sm">프로필 보기</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">지금 바로 시작하세요</h2>
          <p className="text-blue-100 text-lg mb-8">
            첫 달 무료 체험으로 모든 프리미엄 강좌를 무제한으로 시청하세요.
            언제든지 해지할 수 있습니다.
          </p>
          <Link to="/pricing">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 border-transparent">
              무료 체험 시작하기
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
