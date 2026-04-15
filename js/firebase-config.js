// ====================================================
// 골든 시니어스 — Firebase 설정 (CDN 모듈 방식)
// ====================================================
import { initializeApp }        from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import { getAuth }              from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import { getFirestore }         from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyBJtViY764nCepskf7Wf3Wl9JqPrC1bx2o",
  authDomain:        "golden-seniors.firebaseapp.com",
  projectId:         "golden-seniors",
  storageBucket:     "golden-seniors.firebasestorage.app",
  messagingSenderId: "244026917780",
  appId:             "1:244026917780:web:2dbb4b16db8365b0a10581",
  measurementId:     "G-0FGLFMZ3PF"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
