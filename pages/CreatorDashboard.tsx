import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { MOCK_REVENUE_STATS } from '../constants';
import { Button } from '../components/Button';
import { Upload, DollarSign, Clock, TrendingUp } from 'lucide-react';

export const CreatorDashboard: React.FC = () => {
  return (
    <div className="bg-slate-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">크리에이터 대시보드</h1>
            <p className="text-slate-500">수익 및 시청 시간을 관리하세요.</p>
          </div>
          <Button className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            새 영상 업로드
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-500 font-medium">이번 달 예상 수익</h3>
              <div className="p-2 bg-green-100 rounded-full">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">₩2,400,000</p>
            <div className="flex items-center mt-2 text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>지난달 대비 +12%</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-500 font-medium">총 시청 시간</h3>
              <div className="p-2 bg-blue-100 rounded-full">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">300 시간</p>
            <div className="flex items-center mt-2 text-sm text-blue-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>지난달 대비 +8%</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-500 font-medium">구독 수익 배분율</h3>
              <div className="p-2 bg-purple-100 rounded-full">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <p className="text-3xl font-bold text-slate-900">5.2%</p>
            <p className="text-xs text-slate-400 mt-2">전체 플랫폼 시청 시간 중 점유율</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">월별 수익 추이</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_REVENUE_STATS}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => [`₩${value.toLocaleString()}`, '수익']}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-6">시청 시간 추이</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={MOCK_REVENUE_STATS}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                     formatter={(value: number) => [`${value}시간`, '시청 시간']}
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="watchHours" stroke="#0f172a" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
          <h3 className="text-blue-900 font-bold mb-2">수익 정산 안내</h3>
          <p className="text-blue-800 text-sm">
            수익은 매달 1일 정산되며, 
            <span className="font-bold"> (내 영상 시청 시간 / 플랫폼 전체 시청 시간) × 구독 총 수익</span> 
            공식에 따라 배분됩니다. 강의형 영상은 1.5배, 고급 시퀀스 영상은 2.0배의 가중치가 적용됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};
