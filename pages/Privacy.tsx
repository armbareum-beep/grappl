import React from 'react';
import { Link } from 'react-router-dom';

export const Privacy: React.FC = () => {
    return (
        <div className="min-h-screen bg-slate-950 py-12">
            <div className="max-w-4xl mx-auto px-4">
                <div className="bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">
                    <h1 className="text-4xl font-bold text-white mb-8">개인정보처리방침</h1>

                    <div className="space-y-6 text-slate-300">
                        <section>
                            <p className="leading-relaxed mb-4">
                                Grapplay(이하 "회사")는 정보통신망 이용촉진 및 정보보호 등에 관한 법률, 개인정보보호법 등 관련 법령에 따라
                                이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보처리방침을 수립·공개합니다.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">1. 개인정보의 수집 및 이용 목적</h2>
                            <p className="mb-2">회사는 다음의 목적을 위하여 개인정보를 처리합니다:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li><strong>회원 가입 및 관리:</strong> 회원 가입의사 확인, 회원제 서비스 제공, 본인 식별·인증, 회원자격 유지·관리</li>
                                <li><strong>서비스 제공:</strong> 콘텐츠 제공, 맞춤 서비스 제공, 본인인증, 요금결제·정산</li>
                                <li><strong>마케팅 및 광고:</strong> 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공</li>
                                <li><strong>고충처리:</strong> 민원인의 신원 확인, 민원사항 확인, 사실조사를 위한 연락·통지, 처리결과 통보</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">2. 수집하는 개인정보의 항목</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-400 mb-2">가. 필수 수집 항목</h3>
                                    <ul className="list-disc list-inside ml-4 space-y-1">
                                        <li>이메일 주소</li>
                                        <li>비밀번호 (암호화 저장)</li>
                                        <li>이름 또는 닉네임</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-blue-400 mb-2">나. 선택 수집 항목</h3>
                                    <ul className="list-disc list-inside ml-4 space-y-1">
                                        <li>프로필 이미지</li>
                                        <li>벨트 등급</li>
                                        <li>전화번호 (크리에이터 등록 시)</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-blue-400 mb-2">다. 자동 수집 항목</h3>
                                    <ul className="list-disc list-inside ml-4 space-y-1">
                                        <li>IP 주소, 쿠키, 방문 일시</li>
                                        <li>서비스 이용 기록, 불량 이용 기록</li>
                                        <li>기기 정보 (OS, 브라우저 종류)</li>
                                    </ul>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-blue-400 mb-2">라. 결제 정보</h3>
                                    <ul className="list-disc list-inside ml-4 space-y-1">
                                        <li>결제 수단 정보 (PayPal, 카드사 등 PG사를 통해 처리)</li>
                                        <li>결제 내역, 환불 계좌 정보</li>
                                    </ul>
                                    <p className="text-sm text-slate-400 mt-2">
                                        * 회사는 신용카드 번호, 계좌번호 등 민감한 결제 정보를 직접 저장하지 않으며,
                                        결제대행업체(PG사)를 통해 안전하게 처리됩니다.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">3. 개인정보의 보유 및 이용 기간</h2>
                            <ol className="list-decimal list-inside space-y-2 ml-4">
                                <li>회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</li>
                                <li>회원 탈퇴 시 지체 없이 파기합니다. 다만, 다음의 정보는 아래의 이유로 명시한 기간 동안 보존합니다:
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                        <li><strong>계약 또는 청약철회 등에 관한 기록:</strong> 5년 (전자상거래법)</li>
                                        <li><strong>대금결제 및 재화 등의 공급에 관한 기록:</strong> 5년 (전자상거래법)</li>
                                        <li><strong>소비자 불만 또는 분쟁처리에 관한 기록:</strong> 3년 (전자상거래법)</li>
                                        <li><strong>표시·광고에 관한 기록:</strong> 6개월 (전자상거래법)</li>
                                        <li><strong>로그 기록:</strong> 3개월 (통신비밀보호법)</li>
                                    </ul>
                                </li>
                            </ol>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">4. 개인정보의 제3자 제공</h2>
                            <p className="mb-2">회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우는 예외로 합니다:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>이용자가 사전에 동의한 경우</li>
                                <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
                            </ul>

                            <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                                <h3 className="text-lg font-semibold text-blue-400 mb-2">결제 처리를 위한 제공</h3>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-2">제공받는 자</th>
                                            <th className="text-left py-2">제공 목적</th>
                                            <th className="text-left py-2">제공 항목</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-700">
                                            <td className="py-2">PayPal</td>
                                            <td className="py-2">결제 처리</td>
                                            <td className="py-2">이메일, 결제 금액</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2">포트원</td>
                                            <td className="py-2">국내 결제 처리</td>
                                            <td className="py-2">이름, 이메일, 결제 금액</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">5. 개인정보 처리의 위탁</h2>
                            <p className="mb-2">회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다:</p>

                            <div className="mt-4 p-4 bg-slate-800 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700">
                                            <th className="text-left py-2">수탁업체</th>
                                            <th className="text-left py-2">위탁 업무</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b border-slate-700">
                                            <td className="py-2">Supabase</td>
                                            <td className="py-2">데이터 저장 및 관리</td>
                                        </tr>
                                        <tr className="border-b border-slate-700">
                                            <td className="py-2">Vimeo</td>
                                            <td className="py-2">동영상 호스팅 및 스트리밍</td>
                                        </tr>
                                        <tr>
                                            <td className="py-2">Vercel</td>
                                            <td className="py-2">웹 호스팅</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">6. 정보주체의 권리·의무 및 행사방법</h2>
                            <p className="mb-2">이용자는 언제든지 다음과 같은 권리를 행사할 수 있습니다:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>개인정보 열람 요구</li>
                                <li>개인정보 정정·삭제 요구</li>
                                <li>개인정보 처리 정지 요구</li>
                                <li>회원 탈퇴 (동의 철회)</li>
                            </ul>
                            <p className="mt-4 text-sm text-slate-400">
                                권리 행사는 회사에 대해 서면, 전화, 이메일 등을 통하여 하실 수 있으며,
                                회사는 이에 대해 지체 없이 조치하겠습니다.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">7. 개인정보의 파기</h2>
                            <ol className="list-decimal list-inside space-y-2 ml-4">
                                <li>회사는 개인정보 보유기간의 경과, 처리목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</li>
                                <li>파기 절차 및 방법:
                                    <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                                        <li><strong>전자적 파일:</strong> 복구 불가능한 방법으로 영구 삭제</li>
                                        <li><strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각</li>
                                    </ul>
                                </li>
                            </ol>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">8. 개인정보 보호책임자</h2>
                            <div className="p-4 bg-slate-800 rounded-lg">
                                <p className="mb-2">회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제를 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:</p>
                                <div className="mt-4 space-y-2">
                                    <p><strong>개인정보 보호책임자</strong></p>
                                    <p>성명: [담당자명]</p>
                                    <p>직책: [직책]</p>
                                    <p>이메일: privacy@grapplay.com</p>
                                    <p>전화: [연락처]</p>
                                </div>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">9. 개인정보의 안전성 확보 조치</h2>
                            <p className="mb-2">회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:</p>
                            <ul className="list-disc list-inside space-y-2 ml-4">
                                <li>개인정보 취급 직원의 최소화 및 교육</li>
                                <li>개인정보에 대한 접근 제한</li>
                                <li>개인정보의 암호화 (비밀번호 등)</li>
                                <li>해킹 등에 대비한 기술적 대책</li>
                                <li>접속기록의 보관 및 위변조 방지</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-semibold text-white mb-4">10. 개인정보 처리방침의 변경</h2>
                            <p className="leading-relaxed">
                                이 개인정보처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는
                                변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
                            </p>
                        </section>

                        <section className="pt-8 border-t border-slate-700">
                            <p className="text-sm text-slate-400">
                                <strong>부칙</strong><br />
                                본 방침은 2025년 1월 1일부터 시행됩니다.
                            </p>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-700">
                        <Link
                            to="/"
                            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-xl transition-colors"
                        >
                            홈으로 돌아가기
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
