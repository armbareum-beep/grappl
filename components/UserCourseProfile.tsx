import React, { useEffect, useState } from 'react';
import { getUserSkillCourses } from '../lib/api';
import { BookOpen, Award } from 'lucide-react';

interface UserCourseProfileProps {
    userId: string;
    userName: string;
    userBelt?: string;
}

interface SkillCourse {
    id: string;
    course_id: string;
    slot_type: string; // 'standing', 'ground', etc.
    courses: {
        id: string;
        title: string;
        category: string;
        difficulty: string;
        thumbnailUrl: string;
    };
}

export const UserCourseProfile: React.FC<UserCourseProfileProps> = ({ userId, userName, userBelt }) => {
    const [skillCourses, setSkillCourses] = useState<SkillCourse[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSkills = async () => {
            if (!userId) return;
            setLoading(true);
            const { data } = await getUserSkillCourses(userId);
            if (data) {
                setSkillCourses(data as any);
            }
            setLoading(false);
        };

        fetchSkills();
    }, [userId]);

    if (loading) return <div className="animate-pulse h-20 bg-slate-100 rounded-lg"></div>;

    if (skillCourses.length === 0) {
        return (
            <div className="bg-slate-50 rounded-xl p-6 text-center border border-slate-100">
                <p className="text-slate-500 text-sm">장착된 스킬이 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                <h4 className="font-bold text-slate-800 flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    {userName}의 스킬 트리
                </h4>
                {userBelt && (
                    <span className="text-xs font-medium px-2 py-1 bg-white border border-slate-200 rounded-full text-slate-600">
                        {userBelt}
                    </span>
                )}
            </div>
            <div className="p-4">
                <div className="space-y-3">
                    {skillCourses.map((skill) => (
                        <div key={skill.id} className="flex items-center gap-3 group">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                {skill.courses.thumbnailUrl ? (
                                    <img
                                        src={skill.courses.thumbnailUrl}
                                        alt={skill.courses.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300">
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs text-purple-600 font-medium mb-0.5 uppercase tracking-wider">
                                    {skill.slot_type}
                                </div>
                                <div className="text-sm font-medium text-slate-900 truncate group-hover:text-purple-700 transition-colors">
                                    {skill.courses.title}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
