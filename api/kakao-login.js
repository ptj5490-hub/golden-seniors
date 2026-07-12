// Vercel 서버리스 함수 — 카카오 로그인 검증 & Firebase 커스텀 토큰 발급
//
// 기존 방식(카카오ID로 고정 비밀번호를 만들어 Firebase 이메일/비밀번호 로그인에 사용)은
// 카카오ID만 알면 누구든 같은 비밀번호를 계산해 계정에 로그인할 수 있는 취약점이 있었다.
// 이 함수는 클라이언트가 보낸 카카오 액세스 토큰을 카카오 서버에 직접 검증(클라이언트가
// 보낸 kakaoId는 신뢰하지 않음)한 뒤, 그 결과로만 Firebase 커스텀 토큰을 발급한다.
// 환경변수 설정 필요: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

const https = require('https');
const { admin } = require('./_firebaseAdmin');

function fetchKakaoUser(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'kapi.kakao.com',
      path:     '/v2/user/me',
      method:   'GET',
      headers:  { Authorization: `Bearer ${accessToken}` },
    }, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = null; }
        if (res.statusCode >= 400 || !parsed || !parsed.id) {
          reject(new Error('카카오 토큰 검증 실패'));
        } else {
          resolve(parsed);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ['https://golden-seniors.vercel.app', 'https://www.goldenseniors.co.kr', 'https://goldenseniors.co.kr'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { accessToken } = req.body || {};
  if (!accessToken) return res.status(400).json({ error: 'accessToken이 필요해요' });

  let kakaoUser;
  try {
    kakaoUser = await fetchKakaoUser(accessToken);
  } catch (e) {
    return res.status(401).json({ error: '카카오 인증 확인에 실패했어요.' });
  }

  const kakaoId    = String(kakaoUser.id);
  let uid          = `kakao_${kakaoId}`;
  const kakaoName  = kakaoUser.kakao_account?.profile?.nickname
                   || kakaoUser.properties?.nickname
                   || '카카오회원';
  const syntheticEmail = `kakao_${kakaoId}@golden-seniors.internal`;

  // 이메일 기준으로 먼저 조회한다 — 예전 방식(카카오ID로 비밀번호를 계산하던 방식)으로
  // 이미 가입한 계정은 uid가 kakao_${kakaoId}가 아니라 Firebase가 임의로 부여한 값이라,
  // uid로만 찾으면 "새 계정"으로 착각해 같은 이메일로 또 만들려다 충돌이 난다.
  let isNewUser = false;
  try {
    const existing = await admin.auth().getUserByEmail(syntheticEmail);
    uid = existing.uid;
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      try {
        await admin.auth().createUser({ uid, email: syntheticEmail, displayName: kakaoName });
        isNewUser = true;
      } catch (createErr) {
        console.error('[kakao-login] 사용자 생성 오류:', createErr);
        return res.status(500).json({ error: '로그인 처리 중 오류가 발생했어요.' });
      }
    } else {
      console.error('[kakao-login] 사용자 조회 오류:', e);
      return res.status(500).json({ error: '로그인 처리 중 오류가 발생했어요.' });
    }
  }

  try {
    const customToken = await admin.auth().createCustomToken(uid);
    return res.status(200).json({ ok: true, customToken, isNewUser, kakaoName });
  } catch (e) {
    console.error('[kakao-login] 토큰 발급 오류:', e);
    return res.status(500).json({ error: '로그인 처리 중 오류가 발생했어요.' });
  }
};
