import React from 'react';
import { Link } from 'react-router-dom';
import { Course } from '../types';
import { Play, Clock, BookOpen } from 'lucide-react';

interface CourseCardProps {
    course: Course;
}

export const CourseCard: React.FC<CourseCardProps> = ({ course }) => {
    const isFree = course.price === 0;
    const formattedPrice = isFree ? '무료' : new Intl.NumberFormat('ko-KR', {
        style: 'currency',
        currency: 'KRW',
    }).format(course.price);

    const difficultyLabel = course.difficulty === 'Beginner' ? '초급' :
        course.difficulty === 'Intermediate' ? '중급' : '상급';

    return (
        <Link to={`/courses/${course.id}`} className="group block h-full">
            <div className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col border border-slate-100">
                <div className="relative aspect-video overflow-hidden">
                    <img
                        src={course.thumbnailUrl}
                        alt={course.title}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-white/90 p-3 rounded-full">
                            <Play className="w-6 h-6 text-blue-600 fill-current" />
                        </div>
                    </div>
                    <span className={`absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded text-white ${course.difficulty === 'Advanced' ? 'bg-red-500' :
                        course.difficulty === 'Intermediate' ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
                        {difficultyLabel}
                    </span>
                    {course.lessonCount && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center">
                            <BookOpen className="w-3 h-3 mr-1" />
                            {course.lessonCount}개 레슨
                        </div>
                    )}
                </div>

                <div className="p-4 flex flex-col flex-grow">
                    <div className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">
                        {course.category}
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                        {course.title}
                    </h3>

                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                        {course.description}
                    </p>

                    <div className="mt-auto space-y-3">
                        <div className="flex items-center text-sm text-slate-500">
                            <span>{course.creatorName}</span>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                            <span className={`font-bold ${isFree ? 'text-green-600' : 'text-slate-900'}`}>
                                {formattedPrice}
                            </span>
                            <span className="text-xs text-slate-400 flex items-center">
                                <Clock className="w-3 h-3 mr-1" /> {course.views.toLocaleString()} 조회
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};
