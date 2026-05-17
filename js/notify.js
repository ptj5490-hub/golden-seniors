// 카카오 알림톡 발송 헬퍼
// 각 HTML 페이지에서 <script src="../js/notify.js"></script> 로 포함

const NOTIFY_URL = '/api/notify';
const SITE_URL   = 'https://golden-seniors.vercel.app';

window.sendNotify = async function(type, phone, params) {
  if (!phone) return;
  try {
    await fetch(NOTIFY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ type, to: phone, params }),
    });
  } catch(e) {
    console.warn('알림톡 발송 실패 (서비스는 계속 진행):', e);
  }
};

// ── 알림 유형별 편의 함수 ──

// 1. 고객에게: 선생님 견적 도착
window.notifyQuoteArrived = function(customerPhone, customerName, teacherName, price, quoteId) {
  return sendNotify('quote_arrived', customerPhone, {
    customerName,
    teacherName,
    price: Number(price).toLocaleString(),
    link:  `${SITE_URL}/pages/quotes.html?quoteId=${quoteId}`,
  });
};

// 2. 선생님에게: 새 견적 요청
window.notifyQuoteRequested = function(teacherPhone, teacherName, region, condition, quoteId) {
  return sendNotify('quote_requested', teacherPhone, {
    teacherName,
    region,
    condition,
    link: `${SITE_URL}/pages/dashboard-teacher.html`,
  });
};

// 3. 고객에게: 결제/매칭 완료
window.notifyPaymentDoneCustomer = function(customerPhone, customerName, teacherName, quoteId) {
  return sendNotify('payment_done_customer', customerPhone, {
    customerName,
    teacherName,
    link: `${SITE_URL}/pages/chat.html?chatId=${quoteId}`,
  });
};

// 4. 선생님에게: 결제 완료
window.notifyPaymentDoneTeacher = function(teacherPhone, teacherName, customerName, price, quoteId) {
  return sendNotify('payment_done_teacher', teacherPhone, {
    teacherName,
    customerName,
    price: Number(price).toLocaleString(),
    link:  `${SITE_URL}/pages/chat.html?chatId=${quoteId}`,
  });
};

// 5. 채팅 새 메시지
window.notifyNewMessage = function(receiverPhone, receiverName, senderName, chatId) {
  return sendNotify('new_message', receiverPhone, {
    receiverName,
    senderName,
    link: `${SITE_URL}/pages/chat.html?chatId=${chatId}`,
  });
};
