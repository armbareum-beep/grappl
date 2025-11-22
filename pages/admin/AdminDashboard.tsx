import React from 'react';
import { Link } from 'react-router-dom';
import { Star, BookOpen, Users, Home } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-4">Í¥ÄÎ¶¨Ïûê ?Ä?úÎ≥¥??/h1>
                    <p className="text-lg text-slate-600">?åÎû´??Í¥ÄÎ¶?Í∏∞Îä•???†ÌÉù?òÏÑ∏??/p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Featured Content Management */}
                    <Link to="/admin/featured">
                        <div className="bg-white rounded-xl border border-slate-200 p-8 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                                <Star className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">???îÎ©¥ Í¥ÄÎ¶?/h2>
                            <p className="text-slate-600 text-sm">
                                ?∏Í∏∞ Í∞ïÏ¢å?Ä ?Ä???∏Ïä§?∏Îü≠?∞Î? ?†ÌÉù?òÏó¨ ???îÎ©¥??Íµ¨ÏÑ±?òÏÑ∏??
                            </p>
                        </div>
                    </Link>

                    {/* Course Management */}
                    <Link to="/admin/courses">
                        <div className="bg-white rounded-xl border border-slate-200 p-8 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Í∞ïÏ¢å Í¥ÄÎ¶?/h2>
                            <p className="text-slate-600 text-sm">
                                Î™®Îì† Í∞ïÏ¢åÎ•?Ï°∞Ìöå?òÍ≥† ?òÏ†ï ?êÎäî ??†ú?????àÏäµ?àÎã§
                            </p>
                        </div>
                    </Link>

                    {/* Creator Approval */}
                    <Link to="/admin/creators">
                        <div className="bg-white rounded-xl border border-slate-200 p-8 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4">
                                <Users className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">?¨Î¶¨?êÏù¥???πÏù∏</h2>
                            <p className="text-slate-600 text-sm">
                                ?¨Î¶¨?êÏù¥???†Ï≤≠??Í≤Ä?†ÌïòÍ≥??πÏù∏ ?êÎäî Í±∞Î??òÏÑ∏??
                            </p>
                        </div>
                    </Link>

                    {/* Back to Home */}
                    <Link to="/">
                        <div className="bg-white rounded-xl border border-slate-200 p-8 hover:shadow-lg transition-shadow cursor-pointer">
                            <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center mb-4">
                                <Home className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-900 mb-2">?àÏúºÎ°??åÏïÑÍ∞ÄÍ∏?/h2>
                            <p className="text-slate-600 text-sm">
                                Î©îÏù∏ ?òÏù¥ÏßÄÎ°??¥Îèô?©Îãà??
                            </p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
};
