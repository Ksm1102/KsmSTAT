# 가능? · 고등학생 자기계발 스탯 트래커

공부, 운동, 자기주도학습, 독서·탐구 활동을 기록하면 나만의 5대 핵심 스탯과 레벨이 성장하는 고등학생 맞춤 성장 관리 웹 애플리케이션입니다.

## 주요 기능
- **5대 핵심 능력치 & 레이더 차트**: 지식, 체력, 주도력, 집중력, 탐구력 실시간 성장 추적
- **레벨 · 경험치 · 보너스 스탯 분배**: 활동 경험치 누적 시 레벨업 및 자유 분배 보너스 포인트 지급
- **레벨 · 스탯 조건부 마일스톤 목표**: 레벨을 달성해도 요구 스탯이 부족하면 해금되지 않는 단계별 목표 시스템
- **동기 부여 챌린지 & 친구 공유**: 7일 공부·30일 운동 등 챌린지 달성 시 희귀 스탯(메타인지, 불굴의 의지, 통찰력) 및 뱃지 지급, 진행 카드 공유
- **특정 날 스탯 · 레벨 이벤트**: 날짜별 경험치 배율·보너스 스탯 이벤트 및 사용자 커스텀 일정 등록
- **성장 아이템 가방 & 상점**: 성장 코인으로 부스터/회복 아이템 사용 및 학습·운동 장비 장착
- **고등학생 성장 랭킹 & 개인정보 보호**: Google 로그인 기반 Firebase Auth 인증, 본인 외 열람 불가한 Firestore 보안 규칙, 비공개/공개 랭킹 전환

## GitHub Pages 배포 방법
1. 이 저장소를 GitHub에 푸시합니다 (`main` 브랜치).
2. GitHub 저장소의 **Settings > Pages > Build and deployment > Source**를 **GitHub Actions**로 설정합니다.
3. `.github/workflows/deploy.yml`이 자동으로 `npm run build`를 실행해 배포합니다 (`vite.config.ts`에서 GitHub Pages용 상대 경로 `./` 자동 적용).
4. **Firebase Console > Authentication > Settings > Authorized domains**에 배포된 `*.github.io` 도메인을 추가하면 GitHub Pages에서도 Google 로그인이 정상 동작합니다.

## Vercel(버셀) 배포 방법
1. GitHub 저장소를 Vercel 대시보드(**Add New → Project**)에서 연결합니다.
2. `vercel.json`과 `vite.config.ts`가 Vercel 빌드(`dist` 출력, SPA 라우팅, 보안 헤더)를 자동으로 인식하므로 별도 빌드 설정 없이 **Deploy**를 클릭하면 됩니다.
3. 배포 완료 후 발급된 `*.vercel.app` (또는 커스텀 도메인)을 **Firebase Console > Authentication > Settings > Authorized domains**에 추가해야 Google 로그인이 정상 동작합니다.

