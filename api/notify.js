// Vercel 서버리스 함수 — 카카오 알림톡 발송 (Solapi)
// 환경변수 설정 필요: SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER, KAKAO_CHANNEL_ID

const https = require('https');
const crypto = require('crypto');

// ── Solapi 인증 헤더 생성 ──
function makeAuthHeader(apiKey, apiSecret) {
  const date    = new Date().toISOString();
  const salt    = crypto.randomBytes(16).toString('hex');
  const hmac    = crypto.createHmac('sha256', apiSecret);
  hmac.update(date + salt);
  const signature = hmac.digest('hex');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

// ── Solapi API 호출 ──
function sendSolapi(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'api.solapi.com',
      path:     '/messages/v4/send',
      method:   'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': makeAuthHeader(
          process.env.SOLAPI_API_KEY,
          process.env.SOLAPI_API_SECRET
        ),
      },
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', d => raw += d);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ── 알림톡 템플릿 ──
const TEMPLATES = {
  // 고객 → 새 견적 도착
  quote_arrived: {
    templateId: process.env.TEMPLATE_QUOTE_ARRIVED || '',
    build: ({ customerName, teacherName, price, link }) => ({
      '#{고객명}': customerName,
      '#{선생님명}': teacherName,
      '#{금액}': price,
      '#{링크}': link,
    }),
  },
  // 선생님 → 새 견적 요청
  quote_requested: {
    templateId: process.env.TEMPLATE_QUOTE_REQUESTED || '',
    build: ({ teacherName, region, condition, link }) => ({
      '#{선생님명}': teacherName,
      '#{지역}': region,
      '#{증상}': condition,
      '#{링크}': link,
    }),
  },
  // 고객 → 결제/매칭 완료
  payment_done_customer: {
    templateId: process.env.TEMPLATE_PAYMENT_CUSTOMER || '',
    build: ({ customerName, teacherName, link }) => ({
      '#{고객명}': customerName,
      '#{선생님명}': teacherName,
      '#{링크}': link,
    }),
  },
  // 선생님 → 결제 완료
  payment_done_teacher: {
    templateId: process.env.TEMPLATE_PAYMENT_TEACHER || '',
    build: ({ teacherName, customerName, price, link }) => ({
      '#{선생님명}': teacherName,
      '#{고객명}': customerName,
      '#{금액}': price,
      '#{링크}': link,
    }),
  },
  // 채팅 새 메시지
  new_message: {
    templateId: process.env.TEMPLATE_NEW_MESSAGE || '',
    build: ({ receiverName, senderName, link }) => ({
      '#{수신자명}': receiverName,
      '#{발신자명}': senderName,
      '#{링크}': link,
    }),
  },
};

// ── 메인 핸들러 ──
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://golden-seniors.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, to, params } = req.body;

  // 필수값 체크
  if (!type || !to || !params) {
    return res.status(400).json({ error: '필수 파라미터 누락' });
  }

  const template = TEMPLATES[type];
  if (!template) {
    return res.status(400).json({ error: `알 수 없는 알림 유형: ${type}` });
  }
  if (!template.templateId) {
    // 템플릿 미설정 시 조용히 성공 처리 (개발 중)
    return res.status(200).json({ ok: true, skipped: true, reason: '템플릿 미설정' });
  }

  // 전화번호 정리 (010-xxxx → 01011110000)
  const phone = String(to).replace(/[^0-9]/g, '');
  if (phone.length < 10) {
    return res.status(400).json({ error: '유효하지 않은 전화번호' });
  }

  const variables = template.build(params);

  try {
    const result = await sendSolapi({
      message: {
        to:   phone,
        from: process.env.SOLAPI_SENDER,
        kakaoOptions: {
          pfId:       process.env.KAKAO_CHANNEL_ID,
          templateId: template.templateId,
          variables,
        },
      },
    });
    return res.status(200).json({ ok: true, result });
  } catch (e) {
    console.error('알림톡 발송 오류:', e);
    return res.status(500).json({ error: e.message });
  }
}
