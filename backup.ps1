# Grapplay 프로젝트 백업 스크립트

Write-Host "=== Grapplay 백업 시작 ===" -ForegroundColor Green

# 변경사항 확인
Write-Host "`n변경된 파일:" -ForegroundColor Yellow
git status --short

# 사용자에게 커밋 메시지 입력 받기
$commitMessage = Read-Host "`n커밋 메시지를 입력하세요 (예: 홈 화면 디자인 수정)"

if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    $commitMessage = "자동 백업: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

# Git 명령어 실행
Write-Host "`n파일 추가 중..." -ForegroundColor Cyan
git add .

Write-Host "커밋 생성 중..." -ForegroundColor Cyan
git commit -m "$commitMessage"

Write-Host "GitHub에 업로드 중..." -ForegroundColor Cyan
git push origin main

Write-Host "`n=== 백업 완료! ===" -ForegroundColor Green
Write-Host "GitHub에서 확인: https://github.com/armbareum-beep/grappl" -ForegroundColor Blue

# 5초 후 자동 종료
Start-Sleep -Seconds 5
