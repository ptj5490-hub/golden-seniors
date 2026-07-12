// Vercel 서버리스 함수에서 공용으로 쓰는 Firebase Admin 초기화
// 환경변수 설정 필요: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
// (Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성 에서 발급)

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

module.exports = { admin, db: admin.firestore() };
