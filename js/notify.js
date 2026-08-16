// 카카오 알림톡 발송 헬퍼
// 각 HTML 페이지에서 <script src="../js/notify.js"></script> 로 포함

const NOTIFY_URL = '/api/notify';
const SITE_URL   = 'https://golden-seniors.vercel.app';

window.sendNotify = async function(type, phone, params) {
  if (!phone) return;
  try {
    // /api/notify는 로그인(익명 로그인 포함)된 사용자만 호출할 수 있어서 토큰을 항상 확보해둔다
    let user = firebase.auth().currentUser;
    if (!user) user = (await firebase.auth().signInAnonymously()).user;
    const idToken = await user.getIdToken();

    await fetch(NOTIFY_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
      body:    JSON.stringify({ type, to: phone, params }),
    });
  } catch(e) {
    console.warn('알림톡 발송 실패 (서비스는 계속 진행):', e);
  }
};

// ── 알림 유형별 편의 함수 ──

// ① 고객에게: 선생님 견적 도착
window.notifyQuoteArrived = function(customerPhone, customerName, teacherName, price, quoteId) {
  return sendNotify('quote_arrived', customerPhone, {
    customerName,
    teacherName,
    price: Number(price).toLocaleString(),
    link:  `${SITE_URL}/pages/quotes.html?quoteId=${quoteId}`,
  });
};

// ② 선생님에게: 새 견적 요청
window.notifyQuoteRequested = function(teacherPhone, teacherName, region, condition, quoteId) {
  return sendNotify('quote_requested', teacherPhone, {
    teacherName,
    region,
    condition,
    link: `${SITE_URL}/pages/dashboard-teacher.html`,
  });
};

// ②-B 관리자에게: 새 견적 요청 접수 (수신 번호는 서버에서 고정되므로 to는 비워둠)
window.notifyQuoteRequestedAdmin = function(region, condition, customerName, phone) {
  return sendNotify('quote_requested_admin', 'admin', { region, condition, customerName, phone });
};

// ③ 고객에게: 결제/매칭 완료
window.notifyPaymentDoneCustomer = function(customerPhone, customerName, teacherName, quoteId) {
  return sendNotify('payment_done_customer', customerPhone, {
    customerName,
    teacherName,
    link: `${SITE_URL}/pages/chat.html?chatId=${quoteId}`,
  });
};

// ④ 선생님에게: 매칭 확정
window.notifyPaymentDoneTeacher = function(teacherPhone, teacherName, customerName, price, quoteId) {
  return sendNotify('payment_done_teacher', teacherPhone, {
    teacherName,
    customerName,
    price: Number(price).toLocaleString(),
    link:  `${SITE_URL}/pages/chat.html?chatId=${quoteId}`,
  });
};

// ⑤-A 고객에게: 선생님 메시지 도착
window.notifyNewMessageCustomer = function(customerPhone, customerName, teacherName, chatId) {
  return sendNotify('new_message_customer', customerPhone, {
    customerName,
    teacherName,
    link: `${SITE_URL}/pages/chat.html?chatId=${chatId}`,
  });
};

// ⑤-B 선생님에게: 고객 메시지 도착
window.notifyNewMessageTeacher = function(teacherPhone, teacherName, customerName, chatId) {
  return sendNotify('new_message_teacher', teacherPhone, {
    teacherName,
    customerName,
    link: `${SITE_URL}/pages/chat.html?chatId=${chatId}`,
  });
};

// 구버전 호환 (role 구분 전 코드에서 호출 시 — 삭제 예정)
window.notifyNewMessage = function(receiverPhone, receiverName, senderName, chatId) {
  console.warn('notifyNewMessage deprecated → notifyNewMessageCustomer/Teacher 사용 권장');
  return sendNotify('new_message_customer', receiverPhone, {
    customerName: receiverName,
    teacherName:  senderName,
    link:         `${SITE_URL}/pages/chat.html?chatId=${chatId}`,
  });
};
