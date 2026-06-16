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

  // ① 고객용 - 견적서 도착
  quote_arrived: {
    templateId: 'KA01TP260517082936046At2hvwQrRPt',
    build: ({ customerName, teacherName, price, link }) => ({
      '#{고객명}':   customerName,
      '#{선생님명}': teacherName,
      '#{금액}':     price,
      '#{링크}':     link,
    }),
    sms: ({ customerName, teacherName, price, link }) =>
      `[골든 시니어스] ${customerName}님, ${teacherName} 선생님의 견적이 도착했어요!\n제안 금액: ${price}원\n확인: ${link}`,
  },

  // ② 선생님용 - 새 견적 요청
  quote_requested: {
    templateId: 'KA01TP260517083051492o3mzxZcmpy0',
    build: ({ teacherName, region, condition, link }) => ({
      '#{선생님명}': teacherName,
      '#{지역}':     region,
      '#{증상}':     condition,
      '#{링크}':     link,
    }),
    sms: ({ teacherName, region, condition, link }) =>
      `[골든 시니어스] ${teacherName} 선생님, 새 견적 요청이 들어왔어요!\n지역: ${region} / 증상: ${condition}\n확인: ${link}`,
  },

  // ③ 고객용 - 결제 완료
  payment_done_customer: {
    templateId: 'KA01TP260517083132307obUOKLOARmZ',
    build: ({ customerName, teacherName, link }) => ({
      '#{고객명}':   customerName,
      '#{선생님명}': teacherName,
      '#{링크}':     link,
    }),
    sms: ({ customerName, teacherName, link }) =>
      `[골든 시니어스] ${customerName}님, 결제 완료! ${teacherName} 선생님과 매칭됐어요.\n채팅: ${link}`,
  },

  // ④ 선생님용 - 매칭 확정
  payment_done_teacher: {
    templateId: 'KA01TP260517083236179DBApGOlNv17',
    build: ({ teacherName, customerName, price, link }) => ({
      '#{선생님명}': teacherName,
      '#{고객명}':   customerName,
      '#{금액}':     price,
      '#{링크}':     link,
    }),
    sms: ({ teacherName, customerName, price, link }) =>
      `[골든 시니어스] ${teacherName} 선생님, ${customerName}님 결제 완료! 금액: ${price}원\n채팅: ${link}`,
  },

  // ⑤-A 고객용 - 선생님 메시지 도착
  // 템플릿 본문:
  // [골든 시니어스]
  // #{고객명}님, 신청하신 방문재활운동 서비스 관련하여 #{선생님명} 선생님의 답변 메시지가 도착했습니다.
  // 채팅창에서 내용을 확인해 주세요.
  // #{링크}
  new_message_customer: {
    templateId: process.env.TEMPLATE_MSG_CUSTOMER || 'KA01TP260525110658825dtwtV22X80B',
    build: ({ customerName, teacherName, link }) => ({
      '#{고객명}':   customerName,
      '#{선생님명}': teacherName,
      '#{링크}':     link,
    }),
    sms: ({ customerName, teacherName, link }) =>
      `[골든 시니어스] ${customerName}님, 신청하신 방문재활운동 서비스 관련하여 ${teacherName} 선생님의 답변 메시지가 도착했습니다.\n확인: ${link}`,
  },

  // ⑤-B 선생님용 - 고객 메시지 도착
  // 템플릿 본문:
  // [골든 시니어스]
  // #{선생님명} 선생님, #{고객명}님으로부터 방문재활운동 서비스 관련 문의 메시지가 도착했습니다.
  // 채팅창에서 내용을 확인해 주세요.
  // #{링크}
  new_message_teacher: {
    templateId: process.env.TEMPLATE_MSG_TEACHER || 'KA01TP260517083314766utBFbCtJBIb',
    build: ({ teacherName, customerName, link }) => ({
      '#{선생님명}': teacherName,
      '#{고객명}':   customerName,
      '#{링크}':     link,
    }),
    sms: ({ teacherName, customerName, link }) =>
      `[골든 시니어스] ${teacherName} 선생님, ${customerName}님으로부터 방문재활운동 서비스 관련 문의 메시지가 도착했습니다.\n확인: ${link}`,
  },
  // ⑦ 관리자용 — 선생님 신규 가입 신청 (SMS only)
  teacher_signup_admin: {
    templateId: null,
    sms: ({ teacherName, phone, area, license }) =>
      `[골든시니어스] 선생님 신규 가입 신청\n이름: ${teacherName}\n연락처: ${phone}\n지역: ${area}\n자격: ${license}\n관리자 페이지에서 승인해주세요.`,
  },
};

// ── 메인 핸들러 ──
module.exports = async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowed = ['https://golden-seniors.vercel.app', 'https://www.goldenseniors.co.kr', 'https://goldenseniors.co.kr'];
  if (allowed.includes(origin)) res.setHeader('Access-Control-Allow-Origin', origin);
  // legacy single-value header removed — replaced above
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { type, to, params } = req.body;

  if (!type || !to || !params) {
    return res.status(400).json({ error: '필수 파라미터 누락' });
  }

  const template = TEMPLATES[type];
  if (!template) {
    return res.status(400).json({ error: `알 수 없는 알림 유형: ${type}` });
  }
  if (!template.templateId) {
    // 템플릿 미설정 시 SMS 폴백으로 발송
    const phone = String(to).replace(/[^0-9]/g, '');
    if (phone.length < 10) return res.status(400).json({ error: '유효하지 않은 전화번호' });
    const smsText = template.sms ? template.sms(params) : '';
    if (!smsText) return res.status(200).json({ ok: true, skipped: true, reason: '템플릿 미설정' });
    try {
      const result = await sendSolapi({
        message: { to: phone, from: process.env.SOLAPI_SENDER, text: smsText },
      });
      return res.status(200).json({ ok: true, result, via: 'sms_fallback' });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  const phone = String(to).replace(/[^0-9]/g, '');
  if (phone.length < 10) {
    return res.status(400).json({ error: '유효하지 않은 전화번호' });
  }

  const variables = template.build(params);
  const smsText   = template.sms ? template.sms(params) : '';

  try {
    const result = await sendSolapi({
      message: {
        to:   phone,
        from: process.env.SOLAPI_SENDER,
        text: smsText,
        kakaoOptions: {
          pfId:       process.env.KAKAO_CHANNEL_ID,
          templateId: template.templateId,
          variables,
          disableSms: false,
        },
      },
    });
    return res.status(200).json({ ok: true, result });
  } catch (e) {
    console.error('알림톡 발송 오류:', e);
    return res.status(500).json({ error: e.message });
  }
}
