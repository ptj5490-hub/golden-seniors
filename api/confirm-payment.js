// Vercel 서버리스 함수 — 토스페이먼츠 결제 승인(confirm)
//
// 토스 결제창에서 사용자가 인증만 마친 결제는 아직 "확정"된 상태가 아니다.
// 서버가 시크릿 키로 토스 승인 API를 호출해야 결제가 실제로 완료된다.
// 이 단계가 없으면 결제는 일정 시간 뒤 자동취소된다.
//
// 승인 직전에 "우리가 기대한 금액(계약금 168,000 / 잔금 1,512,000)"과
// 토스가 넘겨준 금액이 일치하는지 서버에서 대조해 금액 위변조를 막는다.
//
// 환경변수 설정 필요:
//   TOSS_SECRET_KEY  — 토스 대시보드 → 결제연동 → 시크릿 키
//                      (심사/테스트: test_sk_..., 라이브 전환 시: live_sk_...)
//   FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY (_firebaseAdmin.js 사용)

const https = require('https');
const { admin, db } = require('./_firebaseAdmin');

// 정찰제 12주 프로그램에서 허용되는 결제 금액(원) — 계약금 / 잔금
const ALLOWED_AMOUNTS = new Set([168000, 1512000]);

// ── 토스 승인 API 호출 ──
function tossConfirm({ paymentKey, orderId, amount, secretKey }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ paymentKey, orderId, amount });
    const auth = Buffer.from(`${secretKey}:`).toString('base64'); // 토스는 "시크릿키:" 형태를 base64
    const request = https.request({
      hostname: 'api.tosspayments.com',
      path:     '/v1/payments/confirm',
      method:   'POST',
      headers: {
        'Authorization':  `Basic ${auth}`,
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (r) => {
      let raw = '';
      r.on('data', d => raw += d);
      r.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = { raw }; }
        resolve({ statusCode: r.statusCode, body: parsed });
      });
    });
    request.on('error', reject);
    request.write(body);
    request.end();
  });
}

module.exports = async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowed = ['https://golden-seniors.vercel.app', 'https://www.goldenseniors.co.kr', 'https://goldenseniors.co.kr'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secretKey = process.env.TOSS_SECRET_KEY;
  if (!secretKey) {
    console.error('[confirm-payment] TOSS_SECRET_KEY 미설정');
    return res.status(500).json({ error: '결제 승인 설정이 아직 준비되지 않았어요. 담당자에게 문의해주세요.' });
  }

  // ── 로그인 확인 (익명 로그인 포함) ──
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: '로그인이 필요해요.' });
  let uid;
  try {
    uid = (await admin.auth().verifyIdToken(idToken)).uid;
  } catch (e) {
    return res.status(401).json({ error: '인증 확인에 실패했어요.' });
  }

  const { paymentKey, orderId, amount } = req.body || {};
  const amountNum = parseInt(amount, 10);
  if (!paymentKey || !orderId || !Number.isInteger(amountNum) || amountNum <= 0) {
    return res.status(400).json({ error: '필수 결제 정보가 누락됐어요.' });
  }

  // ── 서버측 금액 대조 (위변조 방어의 핵심) ──
  const payRef = db.collection('payments').doc(String(orderId));
  let snap;
  try {
    snap = await payRef.get();
  } catch (e) {
    console.error('[confirm-payment] payments 조회 오류:', e);
    return res.status(500).json({ error: '결제 정보 확인 중 오류가 발생했어요.' });
  }
  if (!snap.exists) return res.status(404).json({ error: '결제 정보를 찾을 수 없어요.' });
  const pay = snap.data();

  if (pay.customerUid && pay.customerUid !== uid) {
    return res.status(403).json({ error: '본인의 결제 건이 아니에요.' });
  }
  if (pay.status === 'success') {
    // 이미 승인 완료된 건 — 새로고침 등으로 중복 호출된 경우 조용히 성공 처리
    return res.status(200).json({ ok: true, alreadyConfirmed: true });
  }
  if (Number(pay.amount) !== amountNum) {
    console.error('[confirm-payment] 금액 불일치:', { orderId, docAmount: pay.amount, reqAmount: amountNum });
    return res.status(400).json({ error: '결제 금액이 일치하지 않아요.' });
  }
  // 정찰제 단계 결제(stage 있음)면 허용 금액만 통과
  if (pay.stage && !ALLOWED_AMOUNTS.has(amountNum)) {
    return res.status(400).json({ error: '허용되지 않은 결제 금액이에요.' });
  }

  // ── 토스 승인 호출 ──
  let result;
  try {
    result = await tossConfirm({ paymentKey, orderId: String(orderId), amount: amountNum, secretKey });
  } catch (e) {
    console.error('[confirm-payment] 토스 호출 오류:', e);
    return res.status(502).json({ error: '결제 승인 요청 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.' });
  }

  if (result.statusCode >= 400) {
    const t = result.body || {};
    console.error('[confirm-payment] 토스 승인 실패:', result.statusCode, JSON.stringify(t));
    await payRef.set({
      status:     'failed',
      failReason: t.code || t.message || `HTTP ${result.statusCode}`,
      failedAt:   admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true }).catch(() => {});
    return res.status(400).json({ error: t.message || '결제 승인에 실패했어요.', code: t.code || null });
  }

  // ── 승인 성공 → payments 문서 확정 ──
  const t = result.body || {};
  await payRef.set({
    status:         'success',
    approvedAt:     admin.firestore.FieldValue.serverTimestamp(),
    tossPaymentKey: t.paymentKey || paymentKey,
    tossMethod:     t.method || null,
    tossStatus:     t.status || null,
    tossApprovedAt: t.approvedAt || null,
    paidAmount:     (t.totalAmount != null) ? t.totalAmount : amountNum,
    receiptUrl:     (t.receipt && t.receipt.url) || null,
  }, { merge: true });

  return res.status(200).json({
    ok:         true,
    method:     t.method || null,
    approvedAt: t.approvedAt || null,
    receiptUrl: (t.receipt && t.receipt.url) || null,
  });
};
