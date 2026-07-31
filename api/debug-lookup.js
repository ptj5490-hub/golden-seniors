// 임시 진단용 — 확인 후 삭제 예정
const { admin, db } = require('./_firebaseAdmin');

module.exports = async function handler(req, res) {
  const key = req.query.key;
  if (key !== process.env.ADMIN_PHONE) return res.status(403).json({ error: 'forbidden' });

  const email = req.query.email;
  const uid   = req.query.uid;
  const name  = req.query.name;

  try {
    if (uid) {
      const doc = await db.collection('users').doc(uid).get();
      let authInfo = null;
      try {
        const u = await admin.auth().getUser(uid);
        authInfo = { uid: u.uid, email: u.email, displayName: u.displayName, createdAt: u.metadata.creationTime };
      } catch(e) { authInfo = { error: e.code || e.message }; }
      return res.status(200).json({ firestoreExists: doc.exists, firestoreData: doc.exists ? doc.data() : null, authInfo });
    } else if (email) {
      const snap = await db.collection('users').where('email', '==', email).limit(5).get();
      return res.status(200).json({ count: snap.size, docs: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    } else if (name) {
      const snap = await db.collection('users').where('name', '==', name).limit(10).get();
      return res.status(200).json({ count: snap.size, docs: snap.docs.map(d => ({ id: d.id, ...d.data() })) });
    }
    return res.status(400).json({ error: 'uid, email, name 중 하나가 필요해요' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
