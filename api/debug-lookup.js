// 임시 진단용 — 확인 후 삭제 예정
const { admin, db } = require('./_firebaseAdmin');

module.exports = async function handler(req, res) {
  const key = req.query.key;
  if (key !== process.env.ADMIN_PHONE) return res.status(403).json({ error: 'forbidden' });

  const email = req.query.email;
  const uid   = req.query.uid;

  try {
    let doc;
    if (uid) {
      doc = await db.collection('users').doc(uid).get();
    } else if (email) {
      const snap = await db.collection('users').where('email', '==', email).limit(5).get();
      return res.status(200).json({ count: snap.size, docs: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    }
    if (!doc || !doc.exists) return res.status(200).json({ exists: false });
    return res.status(200).json({ exists: true, id: doc.id, data: doc.data() });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
