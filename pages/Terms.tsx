import React from 'react';
import { Link } from 'react-router-dom';

export const Terms: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 py-12 relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 rounded-full blur-[120px]" />
            </div>

            <div className="relative max-w-4xl mx-auto px-4">
                <div className="bg-slate-900/60 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                    <div className="relative z-10">
                        <h1 className="text-4xl font-bold text-white mb-2">이용약관</h1>
                        <p className="text-slate-400 mb-8">Grapplay 서비스 이용을 위한 약관입니다.</p>

                        <div className="space-y-8 text-slate-300">
                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제1조 (목적)
                                </h2>
                                <p className="leading-relaxed pl-4 border-l border-slate-800">
                                    본 약관은 Grapplay(이하 "회사")가 제공하는 온라인 주짓수 교육 플랫폼 서비스(이하 "서비스")의 이용과 관련하여
                                    회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제2조 (정의)
                                </h2>
                                <ul className="space-y-2 ml-4">
                                    <li className="flex items-start gap-2">
                                        <span className="text-slate-500 mt-1">•</span>
                                        <span>"서비스"란 회사가 제공하는 온라인 주짓수 교육 콘텐츠 및 관련 서비스를 의미합니다.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-slate-500 mt-1">•</span>
                                        <span>"회원"이란 본 약관에 동의하고 회사와 서비스 이용계약을 체결한 자를 말합니다.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-slate-500 mt-1">•</span>
                                        <span>"콘텐츠"란 회사가 제공하는 강좌, 영상, 루틴, 드릴 등 모든 교육 자료를 의미합니다.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-slate-500 mt-1">•</span>
                                        <span>"크리에이터"란 회사의 플랫폼을 통해 콘텐츠를 제작하고 판매하는 자를 말합니다.</span>
                                    </li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제3조 (약관의 효력 및 변경)
                                </h2>
                                <ol className="list-decimal list-inside space-y-2 ml-4 text-slate-300">
                                    <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.</li>
                                    <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있습니다.</li>
                                    <li>약관이 변경되는 경우 회사는 변경사항을 시행일자 7일 전부터 공지합니다.</li>
                                </ol>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제4조 (회원가입)
                                </h2>
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>회원가입은 이용자가 본 약관에 동의하고 회사가 정한 가입 양식에 따라 정보를 기입한 후 회사가 이를 승낙함으로써 체결됩니다.</li>
                                    <li>회사는 다음 각 호에 해당하는 경우 회원가입을 거부할 수 있습니다:
                                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-slate-400">
                                            <li>타인의 명의를 도용한 경우</li>
                                            <li>허위 정보를 기재한 경우</li>
                                            <li>만 14세 미만인 경우</li>
                                            <li>기타 회사가 정한 이용 요건을 충족하지 못한 경우</li>
                                        </ul>
                                    </li>
                                </ol>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제5조 (서비스의 제공)
                                </h2>
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>회사는 다음과 같은 서비스를 제공합니다:
                                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-slate-400">
                                            <li>온라인 주짓수 강좌 및 영상 콘텐츠</li>
                                            <li>훈련 루틴 및 드릴 프로그램</li>
                                            <li>크리에이터와의 1:1 피드백 서비스</li>
                                            <li>커뮤니티 및 학습 관리 기능</li>
                                        </ul>
                                    </li>
                                    <li>서비스는 연중무휴 1일 24시간 제공함을 원칙으로 합니다. 다만, 시스템 점검 등 필요한 경우 서비스를 일시 중단할 수 있습니다.</li>
                                </ol>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제6조 (유료 서비스 및 결제)
                                </h2>
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>회사가 제공하는 유료 서비스의 요금은 서비스 화면에 명시된 금액으로 합니다.</li>
                                    <li>결제는 PayPal, 신용카드, 간편결제 등 회사가 제공하는 방법으로 진행됩니다.</li>
                                    <li>구독 서비스는 자동 갱신되며, 회원은 언제든지 구독을 해지할 수 있습니다.</li>
                                    <li>환불 정책은 다음과 같습니다:
                                        <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-slate-400">
                                            <li>강좌 구매 후 7일 이내, 수강 진도율 10% 미만인 경우 전액 환불</li>
                                            <li>구독 서비스는 결제일로부터 7일 이내 미사용 시 전액 환불</li>
                                            <li>크리에이터의 귀책사유로 서비스 제공이 불가능한 경우 전액 환불</li>
                                        </ul>
                                    </li>
                                </ol>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제7조 (저작권 및 지적재산권)
                                </h2>
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>서비스 내 모든 콘텐츠의 저작권은 해당 크리에이터 또는 회사에 귀속됩니다.</li>
                                    <li>회원은 서비스를 통해 제공받은 콘텐츠를 무단으로 복제, 배포, 전송, 판매할 수 없습니다.</li>
                                    <li>위반 시 저작권법에 따라 민·형사상 책임을 질 수 있습니다.</li>
                                </ol>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제8조 (회원의 의무)
                                </h2>
                                <p className="mb-2">회원은 다음 행위를 하여서는 안 됩니다:</p>
                                <ul className="list-disc list-inside space-y-2 ml-4 text-slate-400">
                                    <li>타인의 정보 도용</li>
                                    <li>회사 또는 제3자의 지적재산권 침해</li>
                                    <li>음란, 폭력적, 혐오적 콘텐츠 게시</li>
                                    <li>서비스 운영 방해 행위</li>
                                    <li>기타 관련 법령 위반 행위</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제9조 (서비스 이용 제한)
                                </h2>
                                <p className="leading-relaxed pl-4 border-l border-slate-800">
                                    회사는 회원이 본 약관을 위반하거나 서비스의 정상적인 운영을 방해한 경우,
                                    사전 통지 후 서비스 이용을 제한하거나 계약을 해지할 수 있습니다.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제10조 (면책조항)
                                </h2>
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인한 서비스 중단에 대해 책임지지 않습니다.</li>
                                    <li>회사는 회원의 귀책사유로 인한 서비스 이용 장애에 대해 책임지지 않습니다.</li>
                                    <li>회사는 회원이 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대해 책임지지 않습니다.</li>
                                </ol>
                            </section>

                            <section>
                                <h2 className="text-xl font-semibold text-violet-400 mb-3 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                    제11조 (분쟁 해결)
                                </h2>
                                <ol className="list-decimal list-inside space-y-2 ml-4">
                                    <li>본 약관은 대한민국 법률에 따라 규율되고 해석됩니다.</li>
                                    <li>서비스 이용과 관련하여 회사와 회원 간 발생한 분쟁에 대해서는 회사의 본사 소재지를 관할하는 법원을 전속 관할 법원으로 합니다.</li>
                                </ol>
                            </section>

                            <section className="pt-8 border-t border-slate-700/50">
                                <p className="text-sm text-slate-500">
                                    <strong className="text-slate-400">부칙</strong><br />
                                    본 약관은 2025년 1월 1일부터 시행됩니다.
                                </p>
                            </section>
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-700/50 flex justify-center">
                            <Link
                                to="/"
                                className="inline-flex items-center justify-center bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-violet-600/25 active:scale-95"
                            >
                                홈으로 돌아가기
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
