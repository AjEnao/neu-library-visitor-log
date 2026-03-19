import { initializeApp }  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth }        from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDz9QYaeztjSfzCtKE195yZx465zesVslA",
  authDomain:        "neu-library-visitor-log-642ca.firebaseapp.com",
  projectId:         "neu-library-visitor-log-642ca",
  storageBucket:     "neu-library-visitor-log-642ca.firebasestorage.app",
  messagingSenderId: "347996304857",
  appId:             "1:347996304857:web:35b686df65a6c3580b95c8"
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);