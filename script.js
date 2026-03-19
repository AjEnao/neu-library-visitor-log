// =============================================
//  NEU Library Visitor Log — script.js
// =============================================

import { db } from "./firebase.js";
import {
  collection, addDoc, serverTimestamp,
  query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth, signInWithPopup, GoogleAuthProvider }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {

  const loginCard   = document.getElementById('loginCard');
  const successCard = document.getElementById('successCard');
  const signInBtn   = document.getElementById('signInBtn');

  // ── Buttons ──────────────────────────────────
  signInBtn.addEventListener('click', handleSignIn);

  document.getElementById('adminBtn').addEventListener('click', () => {
    window.location.href = 'admin.html';
  });

  document.getElementById('signOutBtn').addEventListener('click', resetForm);

  // ── Google Sign In ────────────────────────────
  document.getElementById('googleSignInBtn').addEventListener('click', handleGoogleSignIn);

  // ── Toggle Email / Student No. ────────────────
  let signInMode = 'email';

  document.getElementById('toggleEmail').addEventListener('click', () => {
    signInMode = 'email';
    document.getElementById('toggleEmail').classList.add('active');
    document.getElementById('toggleStudentNum').classList.remove('active');
    document.getElementById('emailGroup').style.display = '';
    document.getElementById('studentNumGroup').style.display = 'none';
    document.getElementById('notRegisteredWarning').classList.add('hidden');
  });

  document.getElementById('toggleStudentNum').addEventListener('click', () => {
    signInMode = 'studentnum';
    document.getElementById('toggleStudentNum').classList.add('active');
    document.getElementById('toggleEmail').classList.remove('active');
    document.getElementById('studentNumGroup').style.display = '';
    document.getElementById('emailGroup').style.display = 'none';
    document.getElementById('notRegisteredWarning').classList.add('hidden');
  });

  // ── Live validation ───────────────────────────
  document.getElementById('email').addEventListener('input', function () {
    if (validateEmail(this.value)) clearError('email', 'emailError');
    document.getElementById('notRegisteredWarning').classList.add('hidden');
  });
  document.getElementById('reason').addEventListener('change', function () {
    if (this.value) clearError('reason', 'reasonError');
  });

  // ── Footer year ───────────────────────────────
  document.getElementById('footerYear').textContent = new Date().getFullYear();

  // ── Card out animation ────────────────────────
  const s = document.createElement('style');
  s.textContent = `@keyframes cardOut{to{opacity:0;transform:translateY(-20px) scale(.97)}}`;
  document.head.appendChild(s);

  // ── Helpers ───────────────────────────────────
  function validateEmail(v) {
    return /^[^\s@]+@neu\.edu\.ph$/i.test(v.trim());
  }
  function showError(inputId, errorId) {
    document.getElementById(inputId).classList.add('invalid');
    document.getElementById(errorId).classList.add('show');
  }
  function clearError(inputId, errorId) {
    document.getElementById(inputId).classList.remove('invalid');
    document.getElementById(errorId).classList.remove('show');
  }
  function formatTime(date) {
    return date.toLocaleString('en-PH', {
      month:'short', day:'numeric', year:'numeric',
      hour:'2-digit', minute:'2-digit', hour12:true
    });
  }

  // ── Sign In ───────────────────────────────────
  async function handleSignIn() {
    const reason = document.getElementById('reason').value;
    let valid = true;

    // Validate based on current mode
    let lookupEmail = '';
    if (signInMode === 'email') {
      const emailVal = document.getElementById('email').value.trim();
      if (!validateEmail(emailVal)) { showError('email', 'emailError'); valid = false; }
      else { clearError('email', 'emailError'); lookupEmail = emailVal.toLowerCase(); }
    } else {
      const snVal = document.getElementById('studentNumInput').value.trim();
      if (!/^\d{2}-\d{5}-\d{3}$/.test(snVal)) {
        document.getElementById('studentNumInput').classList.add('invalid');
        document.getElementById('studentNumError').classList.add('show');
        valid = false;
      } else {
        document.getElementById('studentNumInput').classList.remove('invalid');
        document.getElementById('studentNumError').classList.remove('show');
      }
    }

    if (!reason) { showError('reason', 'reasonError'); valid = false; }
    else clearError('reason', 'reasonError');
    if (!valid) return;

    const reasonLabel = document.getElementById('reason')
      .options[document.getElementById('reason').selectedIndex].text;

    signInBtn.classList.add('loading');
    signInBtn.querySelector('.btn-text').textContent = 'Signing in…';

    try {
      let userSnap;

      if (signInMode === 'studentnum') {
        // Lookup by student number
        const snVal = document.getElementById('studentNumInput').value.trim();
        const snQuery = query(collection(db, 'users'), where('studentNumber', '==', snVal));
        try {
          userSnap = await getDocs(snQuery);
        } catch (e) {
          userSnap = { empty: false, docs: [] };
        }
        if (userSnap.empty) {
          signInBtn.classList.remove('loading');
          signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';
          document.getElementById('warningText').textContent = 'Student number not found. Please register first.';
          document.getElementById('notRegisteredWarning').classList.remove('hidden');
          return;
        }
        // Get email from found user
        const foundEmail = userSnap.docs[0]?.data()?.email;
        if (!foundEmail) {
          signInBtn.classList.remove('loading');
          signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';
          document.getElementById('warningText').textContent = 'Student number not found. Please register first.';
          document.getElementById('notRegisteredWarning').classList.remove('hidden');
          return;
        }
        lookupEmail = foundEmail.toLowerCase();
      }

      // ── Check if email is blocked ─────────────────
      if (!lookupEmail) {
        signInBtn.classList.remove('loading');
        signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';
        return;
      }
      const blockedDocId = lookupEmail.replace(/\./g, '_');
      try {
        const { doc: fsDoc, getDoc } = await import(
          "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
        );
        const blockedSnap = await getDoc(fsDoc(db, 'blocked', blockedDocId));
        if (blockedSnap.exists()) {
          signInBtn.classList.remove('loading');
          signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';
          document.getElementById('warningText').textContent = 'Your email has been blocked. Please contact the library administrator.';
          document.getElementById('notRegisteredWarning').classList.remove('hidden');
          return;
        }
      } catch (e) {
        console.warn('Block check error:', e);
      }

      // ── Check if email is registered (for email mode) ──
      if (signInMode === 'email') {
        const userQuery = query(collection(db, 'users'), where('email', '==', lookupEmail));
        try {
          userSnap = await getDocs(userQuery);
        } catch (queryErr) {
          userSnap = { empty: false, docs: [] };
        }
        if (userSnap.empty) {
          signInBtn.classList.remove('loading');
          signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';
          document.getElementById('warningText').textContent = 'This email is not yet registered. Please register first.';
          document.getElementById('notRegisteredWarning').classList.remove('hidden');
          return;
        }
      }

      document.getElementById('notRegisteredWarning').classList.add('hidden');

      // Get all data from registered user
      const userData     = userSnap.docs?.[0]?.data() || {};
      const programLabel = userData.program      || 'Unknown';
      const collegeLabel = userData.college      || 'Unknown';
      const fullName     = userData.fullName     || lookupEmail.split('@')[0];
      const yearLevel    = userData.yearLevel    || '';
      const studentNumber= userData.studentNumber|| '';
      const type         = userData.type         || 'student';

      await addDoc(collection(db, 'visits'), {
        name:          fullName,
        email:         lookupEmail,
        type:          type,
        program:       programLabel,
        college:       collegeLabel,
        yearLevel:     yearLevel,
        studentNumber: studentNumber,
        reason:        reasonLabel,
        status:        'Active',
        timeIn:        serverTimestamp(),
        timeOut:       null,
        timestamp:     serverTimestamp()
      });

      signInBtn.classList.remove('loading');
      signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';

      // Badge: TYPE — COLLEGE
      const typeLabel = type === 'faculty' ? 'Faculty / Staff' : 'Student';
      document.getElementById('successBadge').textContent =
        `${typeLabel} — ${collegeLabel}`;

      // Purpose pill
      document.getElementById('successPurpose').innerHTML =
        `📌 Purpose: ${reasonLabel}`;

      // Time on its own line
      document.getElementById('successTime').textContent = formatTime(new Date());

      loginCard.style.animation = 'cardOut 0.35s ease forwards';
      setTimeout(() => {
        loginCard.style.display = 'none';
        successCard.classList.add('visible');
      }, 330);

    } catch (err) {
      console.error('Firestore error:', err);
      signInBtn.classList.remove('loading');
      signInBtn.querySelector('.btn-text').textContent = 'Sign In to Library';
      alert('Error: ' + err.message);
    }
  }

  // ── Google Sign In ────────────────────────────
  async function handleGoogleSignIn() {
    const reason = document.getElementById('reason').value;
    if (!reason) { showError('reason', 'reasonError'); return; }
    clearError('reason', 'reasonError');

    const reasonLabel = document.getElementById('reason')
      .options[document.getElementById('reason').selectedIndex].text;

    try {
      const auth     = getAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ hd: 'neu.edu.ph' });

      const result = await signInWithPopup(auth, provider);
      const user   = result.user;
      const email  = user.email.toLowerCase();

      // Must be @neu.edu.ph
      if (!email.endsWith('@neu.edu.ph')) {
        document.getElementById('warningText').textContent =
          'Please use your NEU Google account (@neu.edu.ph).';
        document.getElementById('notRegisteredWarning').classList.remove('hidden');
        await auth.signOut();
        return;
      }

      // Check if blocked
      const blockedDocId  = email.replace(/\./g, '_');
      const { doc: fsDoc, getDoc } = await import(
        "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
      );
      const blockedSnap = await getDoc(fsDoc(db, 'blocked', blockedDocId));
      if (blockedSnap.exists()) {
        document.getElementById('warningText').textContent =
          'Your email has been blocked. Please contact the library administrator.';
        document.getElementById('notRegisteredWarning').classList.remove('hidden');
        return;
      }

      // Get user data from users collection
      const userQuery = query(collection(db, 'users'), where('email', '==', email));
      const userSnap  = await getDocs(userQuery);

      let fullName     = user.displayName || email.split('@')[0];
      let collegeLabel = 'Unknown';
      let programLabel = 'Unknown';
      let yearLevel    = '';
      let studentNumber= '';
      let type         = 'student';

      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        fullName      = userData.fullName     || fullName;
        collegeLabel  = userData.college      || 'Unknown';
        programLabel  = userData.program      || 'Unknown';
        yearLevel     = userData.yearLevel    || '';
        studentNumber = userData.studentNumber|| '';
        type          = userData.type         || 'student';
      }

      // Save visit
      await addDoc(collection(db, 'visits'), {
        name: fullName, email,
        type, program: programLabel, college: collegeLabel,
        yearLevel, studentNumber,
        reason: reasonLabel, status: 'Active',
        timeIn: serverTimestamp(), timeOut: null,
        timestamp: serverTimestamp()
      });

      document.getElementById('notRegisteredWarning').classList.add('hidden');
      const typeLabel = type === 'faculty' ? 'Faculty / Staff' : 'Student';
      document.getElementById('successBadge').textContent  = `${typeLabel} — ${collegeLabel}`;
      document.getElementById('successPurpose').innerHTML  = `📌 Purpose: ${reasonLabel}`;
      document.getElementById('successTime').textContent   = formatTime(new Date());

      loginCard.style.animation = 'cardOut 0.35s ease forwards';
      setTimeout(() => {
        loginCard.style.display = 'none';
        successCard.classList.add('visible');
      }, 330);

    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        alert('Google Sign-In failed: ' + err.message);
      }
    }
  }

  // ── Reset ─────────────────────────────────────
  function resetForm() {
    window.location.reload();
  }

});

// Auto-format student number (exposed for oninput in HTML)
window.autoFormatStudentNum = function(input) {
  let val = input.value.replace(/\D/g, '');
  if (val.length > 2) val = val.slice(0,2) + '-' + val.slice(2);
  if (val.length > 8) val = val.slice(0,8) + '-' + val.slice(8);
  if (val.length > 12) val = val.slice(0,12);
  input.value = val;
};