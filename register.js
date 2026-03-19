// =============================================
//  NEU Library — register.js
//  No password — saves to Firestore only
// =============================================

import { db } from "./firebase.js";
import {
  collection, query, where, getDocs, addDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── College → Programs map ────────────────────
const PROGRAMS = {
  "College of Accountancy": [
    "Bachelor of Science in Accountancy",
    "Bachelor of Science in Accounting Information System"
  ],
  "College of Agriculture": [
    "Bachelor of Science in Agriculture"
  ],
  "College of Arts and Sciences": [
    "Bachelor of Arts in Economics",
    "Bachelor of Arts in Political Science",
    "Bachelor of Science in Biology",
    "Bachelor of Science in Psychology",
    "Bachelor of Public Administration"
  ],
  "College of Business Administration": [
    "Bachelor of Science in Business Administration Major in Financial Management",
    "Bachelor of Science in Business Administration Major in Human Resource Development Management",
    "Bachelor of Science in Business Administration Major in Legal Management",
    "Bachelor of Science in Business Administration Major in Marketing Management",
    "Bachelor of Science in Entrepreneurship",
    "Bachelor of Science in Real Estate Management"
  ],
  "College of Communication": [
    "Bachelor of Arts in Broadcasting",
    "Bachelor of Arts in Communication",
    "Bachelor of Arts in Journalism"
  ],
  "College of Informatics and Computing Studies": [
    "Bachelor of Library and Information Science",
    "Bachelor of Science in Computer Science",
    "Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Digital Animation Technology",
    "Bachelor of Science in Entertainment and Multimedia Computing with Specialization in Game Development",
    "Bachelor of Science in Information Technology",
    "Bachelor of Science in Information System"
  ],
  "College of Criminology": [
    "Bachelor of Science in Criminology"
  ],
  "College of Education": [
    "Bachelor of Elementary Education",
    "Bachelor of Elementary Education with Specialization in Preschool Education",
    "Bachelor of Elementary Education with Specialization in Special Education",
    "Bachelor of Secondary Education Major in Music, Arts, and Physical Education",
    "Bachelor of Secondary Education Major in English",
    "Bachelor of Secondary Education Major in Filipino",
    "Bachelor of Secondary Education Major in Mathematics",
    "Bachelor of Secondary Education Major in Science",
    "Bachelor of Secondary Education Major in Social Studies",
    "Bachelor of Secondary Education Major in Technology and Livelihood Education"
  ],
  "College of Engineering and Architecture": [
    "Bachelor of Science in Architecture",
    "Bachelor of Science in Astronomy",
    "Bachelor of Science in Civil Engineering",
    "Bachelor of Science in Electrical Engineering",
    "Bachelor of Science in Electronics Engineering",
    "Bachelor of Science in Industrial Engineering",
    "Bachelor of Science in Mechanical Engineering"
  ],
  "College of Medical Technology": [
    "Bachelor of Science in Medical Technology"
  ],
  "College of Midwifery": [
    "Diploma in Midwifery"
  ],
  "College of Music": [
    "Bachelor of Music in Choral Conducting",
    "Bachelor of Music in Music Education",
    "Bachelor of Music in Piano",
    "Bachelor of Music in Voice"
  ],
  "College of Nursing": [
    "Bachelor of Science in Nursing"
  ],
  "College of Physical Therapy": [
    "Bachelor of Science in Physical Therapy"
  ],
  "College of Respiratory Therapy": [
    "Bachelor of Science in Respiratory Therapy"
  ],
  "School of International Relations": [
    "Bachelor of Arts in Foreign Service"
  ],
  "Faculty / Staff": [
    "Faculty / Staff"
  ]
};

// ── Student number auto-format ────────────────
function formatStudentNumber(input) {
  // Remove non-digits
  let val = input.value.replace(/\D/g, '');

  // Auto-insert dashes: XX-XXXXX-XXX
  if (val.length > 2)  val = val.slice(0,2) + '-' + val.slice(2);
  if (val.length > 8)  val = val.slice(0,8) + '-' + val.slice(8);
  if (val.length > 12) val = val.slice(0,12);

  input.value = val;

  // Live validation
  const err = document.getElementById('studentNumError');
  if (val.length > 0 && !validateStudentNumber(val)) {
    err.style.display = 'block';
    input.classList.add('invalid');
  } else {
    err.style.display = 'none';
    input.classList.remove('invalid');
  }
}

function validateStudentNumber(val) {
  return /^\d{2}-\d{5}-\d{3}$/.test(val);
}

// Expose to HTML
window.formatStudentNumber = formatStudentNumber;
document.getElementById('footerYear').textContent = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', () => {

  // Populate programs when college changes
  document.getElementById('regCollege').addEventListener('change', function () {
    const programSelect = document.getElementById('regProgram');
    const college       = this.value;
    const studentNumGroup = document.getElementById('studentNumber').closest('.form-group');
    clearErr('collegeError');

    // Hide student number for Faculty/Staff
    if (college === 'Faculty / Staff') {
      studentNumGroup.style.display = 'none';
      document.getElementById('studentNumber').value = '';
      clearErr('studentNumError');
    } else {
      studentNumGroup.style.display = '';
    }

    programSelect.innerHTML = '';
    if (!college) {
      programSelect.innerHTML = '<option value="">— Select college first —</option>';
      programSelect.disabled  = true;
      return;
    }

    programSelect.disabled = false;
    programSelect.innerHTML = '<option value="">— Select program —</option>';

    if (college === 'Faculty / Staff') {
      const opt = document.createElement('option');
      opt.value = opt.textContent = 'Faculty / Staff';
      programSelect.appendChild(opt);
      programSelect.value = 'Faculty / Staff';
    } else {
      (PROGRAMS[college] || []).forEach(prog => {
        const opt = document.createElement('option');
        opt.value = opt.textContent = prog;
        programSelect.appendChild(opt);
      });
    }
  });

  // Live clear errors
  document.getElementById('fullName').addEventListener('input',   () => clearErr('nameError'));
  document.getElementById('regEmail').addEventListener('input',   () => clearErr('emailError'));
  document.getElementById('yearLevel').addEventListener('change', () => clearErr('yearError'));
  document.getElementById('regCollege').addEventListener('change',() => clearErr('collegeError'));
  document.getElementById('regProgram').addEventListener('change',() => clearErr('programError'));

  // Register button
  document.getElementById('registerBtn').addEventListener('click', handleRegister);
  document.getElementById('regEmail').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleRegister();
  });
});

// ── Helpers ───────────────────────────────────
function showErr(id, msg) {
  const el = document.getElementById(id);
  if (msg) el.textContent = msg;
  el.style.display = 'block';
  el.classList.add('show');
}
function clearErr(id) {
  const el = document.getElementById(id);
  el.style.display = 'none';
  el.classList.remove('show');
}
function clearAll() {
  ['nameError','emailError','yearError','collegeError','programError','generalError']
    .forEach(clearErr);
}
function validateEmail(v) {
  return /^[^\s@]+@neu\.edu\.ph$/i.test(v.trim());
}

// ── Register ──────────────────────────────────
async function handleRegister() {
  clearAll();

  const fullName    = document.getElementById('fullName').value.trim();
  const email       = document.getElementById('regEmail').value.trim().toLowerCase();
  const studentNum  = document.getElementById('studentNumber').value.trim();
  const yearLevel   = document.getElementById('yearLevel').value;
  const college     = document.getElementById('regCollege').value;
  const program     = document.getElementById('regProgram').value;
  const isFaculty   = college === 'Faculty / Staff';

  let valid = true;
  if (!fullName)             { showErr('nameError');    valid = false; }
  if (!validateEmail(email)) { showErr('emailError');   valid = false; }
  if (!isFaculty && !validateStudentNumber(studentNum)) {
    showErr('studentNumError', 'Invalid format. Use: 24-10942-984');
    valid = false;
  }
  if (!yearLevel)            { showErr('yearError');    valid = false; }
  if (!college)              { showErr('collegeError'); valid = false; }
  if (!program)              { showErr('programError'); valid = false; }
  if (!valid) return;

  // Loading state
  const btn  = document.getElementById('registerBtn');
  const txt  = btn.querySelector('.btn-text');
  const spin = document.getElementById('regSpinner');
  btn.disabled    = true;
  txt.textContent = 'Creating account…';
  spin.classList.remove('hidden');

  try {
    // Check if email already registered
    const existing = await getDocs(
      query(collection(db, 'users'), where('email', '==', email))
    );
    if (!existing.empty) {
      showErr('emailError', 'This email is already registered. Try signing in.');
      btn.disabled    = false;
      txt.textContent = 'Create Account';
      spin.classList.add('hidden');
      return;
    }

    // Save to Firestore users collection
    await addDoc(collection(db, 'users'), {
      fullName,
      email,
      studentNumber: studentNum,
      yearLevel,
      college,
      program,
      type:      college === 'Faculty / Staff' ? 'faculty' : 'student',
      createdAt: new Date().toISOString()
    });

    // Show success
    document.getElementById('registerCard').style.display   = 'none';
    document.getElementById('successRegCard').style.display = 'block';

  } catch (e) {
    console.error('Registration error:', e);
    let msg = 'Registration failed. Please try again.';
    if (e.code === 'permission-denied')
      msg = 'Permission denied. Check your Firestore rules.';
    if (e.code === 'unavailable')
      msg = 'Network error. Check your internet connection.';

    const genErr = document.getElementById('generalError');
    genErr.textContent = msg;
    genErr.style.display = 'block';

    btn.disabled    = false;
    txt.textContent = 'Create Account';
    spin.classList.add('hidden');
  }
}