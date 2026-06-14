# 골든 시니어스 (Golden Seniors) — Claude 에이전트 가이드

## 서비스 개요
어르신 1:1 방문재활운동 매칭 플랫폼. 물리치료사·운동처방사가 어르신 자택에 방문해 재활운동을 제공한다. 대표: 박태준 (라이프앤듀어, 사업자 656-25-01988).

- **라이브 URL**: https://www.goldenseniors.co.kr
- **GitHub**: https://github.com/ptj5490-hub/golden-seniors
- **Vercel**: 자동 배포 (main 브랜치 push 시 반영)
- **인스타그램**: @goldenseniors_official

---

## 기술 스택
- **프론트엔드**: Vanilla HTML/CSS/JS (프레임워크 없음)
- **백엔드**: Firebase (Firestore, Auth, 익명 인증)
- **배포**: Vercel (goldenseniors.co.kr 도메인 연결)
- **알림**: Solapi 카카오 알림톡 + SMS 폴백
- **결제**: 토스페이먼츠 (현재 심사 중 — 1~2달 소요 예정)
- **서버리스**: Vercel Functions (`/api/notify.js`)

---

## 핵심 파일 구조
```
golden-seniors/
├── index.html                  # 메인 홈페이지
├── api/
│   └── notify.js               # 카카오 알림톡 서버리스 함수
├── pages/
│   ├── login.html              # 로그인
│   ├── signup.html             # 고객 회원가입
│   ├── signup-teacher.html     # 선생님 등록 신청
│   ├── teachers.html           # 전문가 목록 (지역 필터 포함)
│   ├── teacher.html            # 선생님 상세 프로필
│   ├── mypage.html             # 마이페이지
│   ├── chat.html               # 채팅 (고객↔선생님)
│   ├── admin.html              # 관리자 페이지
│   ├── schedule-dashboard.html # 스케줄 관리 대시보드
│   ├── quote-request.html      # 견적 요청
│   └── terms.html / privacy.html
└── js/
    └── notify.js               # 프론트엔드 알림톡 호출 함수
```

---

## Firebase 구조
- **컬렉션**: `users`, `quotes`, `chats`, `sessions`, `payments`, `reviews`, `teacher_quotes`
- **어드민 계정**: ptj5490@naver.com (uid: fMgomg6kgwefFoSxlkbFU1evJeR2, role: "admin")
- **선생님 상태값**: `status: pending | approved | rejected`
- **보안 규칙**: 본인 데이터만 접근, 어드민 전체 접근, 미인증 차단

---

## 카카오 알림톡 템플릿 ID
| 템플릿 | ID |
|---|---|
| 고객용 — 견적 도착 | KA01TP260517082936046At2hvwQrRPt |
| 선생님용 — 견적 요청 | KA01TP260517083051492o3mzxZcmpy0 |
| 고객용 — 결제 완료 | KA01TP260517083132307obUOKLOARmZ |
| 선생님용 — 매칭 확정 | KA01TP260517083236179DBApGOlNv17 |
| 고객용 — 메시지 도착 | KA01TP260525110658825dtwtV22X80B |
| 선생님용 — 메시지 도착 | KA01TP260517083314766utBFbCtJBIb |

---

## 수익 모델
- 세션 수수료 20% (선생님 80% 수령)
- 회당 단가: 선생님이 직접 설정 (보통 5~7만원)
- 정산: 수동 (엑셀) → 추후 자동화 예정
- 원천징수: 3.3% (프리랜서 용역)

---

## 현재 운영 상황 (2026년 6월 기준)
- 플랫폼 라이브 운영 중
- 선생님 모집 진행 중 (인스타 DM 6명 연락, 2명 면담 예정)
- 토스페이먼츠 실결제 심사 중 (1~2달 소요)
- Firebase 보안 규칙 설정 완료
- 위치기반 지역 필터 (서울 25개 구) 추가 완료

---

## 주요 문서 (Desktop 폴더)
- `골든시니어스_선생님_용역계약서_v3.docx` — 선생님 계약서
- `골든시니어스_정산관리.xlsx` — 수동 정산 엑셀
- `골든시니어스_2026_운영로드맵.html` — 6~12월 로드맵
- `골든시니어스_선생님모집_카드뉴스.html` — 인스타 카드뉴스 5장
- `골든시니어스_복지관배포_리플렛.html` — A5 복지관 배포 리플렛

---

## 코딩 컨벤션
- 프레임워크 없이 Vanilla JS 유지 (빌드 도구 없음)
- Firebase는 compat 버전 사용 (`firebase.firestore()`)
- 로컬 우선 패턴: UI 즉시 업데이트 → Firebase 백그라운드 동기화
- 수정 후 반드시 `git add → commit → push` 로 Vercel 자동 배포
- 코드 주석은 최소화, 변수명으로 의도 표현

---

## 자주 하는 작업
1. **선생님 승인**: Firestore `users` 컬렉션 → `status: approved` 변경
2. **알림 테스트**: `api/notify.js` 엔드포인트로 POST 요청
3. **배포**: `git push origin main` → Vercel 자동 반영 (1~2분)
4. **스케줄 확인**: `goldenseniors.co.kr/pages/schedule-dashboard.html`
5. **관리자 페이지**: `goldenseniors.co.kr/pages/admin.html`

---

## 환경변수 (Vercel 설정)
- `SOLAPI_API_KEY` / `SOLAPI_API_SECRET` — Solapi 인증
- `SOLAPI_SENDER` — 발신 번호
- `KAKAO_CHANNEL_ID` — 카카오 채널 ID
- `TEMPLATE_MSG_CUSTOMER` / `TEMPLATE_MSG_TEACHER` — 메시지 템플릿 ID
