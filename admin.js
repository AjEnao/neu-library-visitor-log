// =============================================
//  NEU Library Admin — admin.js
// =============================================

import { db, auth } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, query, orderBy,
  onSnapshot, deleteDoc, doc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── State ──────────────────────────────────────
let allVisits    = [];
let deleteTarget = null;
let unsubVisits  = null;

// ── Footer years ───────────────────────────────
document.getElementById('loginYear').textContent = new Date().getFullYear();
document.getElementById('dashYear').textContent  = new Date().getFullYear();

// ── Shake animation ─────────────────────────────
const sh = document.createElement('style');
sh.textContent = `.shake{animation:shake .4s ease}
@keyframes shake{0%,100%{transform:translateX(0)}
20%{transform:translateX(-8px)}40%{transform:translateX(8px)}
60%{transform:translateX(-5px)}80%{transform:translateX(5px)}}`;
document.head.appendChild(sh);

// =============================================
//  AUTH STATE — auto login/logout transitions
// =============================================
// Force sign-out on page load — always require fresh login
// =============================================
signOut(auth).then(() => {
  onAuthStateChanged(auth, user => {
    if (user) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('dashScreen').classList.remove('hidden');
      startDashboard(user);
    } else {
      document.getElementById('loginScreen').style.display = '';
      document.getElementById('dashScreen').classList.add('hidden');
      if (unsubVisits) { unsubVisits(); unsubVisits = null; }
    }
  });
});

// =============================================
//  ATTACH ALL EVENT LISTENERS
// =============================================
document.addEventListener('DOMContentLoaded', () => {

  // Login form
  document.getElementById('loginBtn')
    ?.addEventListener('click', handleLogin);
  document.getElementById('adminUser')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  document.getElementById('adminPass')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); });
  document.getElementById('eyeBtn')
    ?.addEventListener('click', togglePass);

  document.getElementById('adminGoogleBtn')
    ?.addEventListener('click', handleGoogleLogin);

  // Logout
  document.getElementById('logoutBtn')
    ?.addEventListener('click', handleLogout);

  // Tabs
  document.getElementById('tabBtnVisits')
    ?.addEventListener('click', () => switchTab('visits'));
  document.getElementById('tabBtnUsers')
    ?.addEventListener('click', () => switchTab('users'));
  document.getElementById('tabBtnBlocked')
    ?.addEventListener('click', () => switchTab('blocked'));

  // Search & date filters
  document.getElementById('searchInput')
    ?.addEventListener('input', filterTable);
  document.getElementById('dateFrom')
    ?.addEventListener('change', filterTable);
  document.getElementById('dateTo')
    ?.addEventListener('change', filterTable);

  // Extra filters
  document.getElementById('filterReason')
    ?.addEventListener('change', filterTable);
  document.getElementById('filterProgram')
    ?.addEventListener('change', filterTable);
  document.getElementById('filterType')
    ?.addEventListener('change', filterTable);

  // Clear all filters
  document.getElementById('clearFiltersBtn')
    ?.addEventListener('click', () => {
      document.getElementById('searchInput').value   = '';
      document.getElementById('dateFrom').value      = '';
      document.getElementById('dateTo').value        = '';
      document.getElementById('filterReason').value  = '';
      document.getElementById('filterProgram').value = '';
      document.getElementById('filterType').value    = '';
      filterTable();
    });

  // Export
  document.getElementById('exportBtn')
    ?.addEventListener('click', exportPDF);

  // Delete modal
  document.getElementById('deleteConfirmBtn')
    ?.addEventListener('click', confirmDelete);
  document.getElementById('deleteCancelBtn')
    ?.addEventListener('click', closeDelete);

  // Block modal
  document.getElementById('blockConfirmBtn')
    ?.addEventListener('click', confirmBlock);
  document.getElementById('blockCancelBtn')
    ?.addEventListener('click', closeBlock);

  // Unblock modal
  document.getElementById('unblockConfirmBtn')
    ?.addEventListener('click', confirmUnblock);
  document.getElementById('unblockCancelBtn')
    ?.addEventListener('click', closeUnblock);

  // Block email input
  document.getElementById('blockEmailBtn')
    ?.addEventListener('click', blockEmail);
  document.getElementById('blockEmailInput')
    ?.addEventListener('keydown', e => { if (e.key === 'Enter') blockEmail(); });

  // Add user modal
  document.getElementById('openAddUserBtn')
    ?.addEventListener('click', () => {
      alert('To add admin users:\n\n1. Go to console.firebase.google.com\n2. Select your project\n3. Build → Authentication → Users\n4. Click "Add user"\n5. Enter their @neu.edu.ph email + password\n\nThey can log in here immediately after.');
    });
});

// =============================================
//  LOGIN
// =============================================
async function handleLogin() {
  const email = document.getElementById('adminUser').value.trim();
  const pass  = document.getElementById('adminPass').value;
  const err   = document.getElementById('loginError');
  const btn   = document.getElementById('loginBtn');
  const txt   = document.getElementById('loginBtnText');
  const spin  = document.getElementById('loginSpinner');

  err.classList.add('hidden');

  if (!email || !pass) {
    err.textContent = 'Please enter your email and password.';
    err.classList.remove('hidden');
    return;
  }

  // Loading state
  btn.disabled    = true;
  txt.textContent = 'Signing in…';
  spin.classList.remove('hidden');

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged handles the rest automatically

  } catch (e) {
    console.error('Auth error:', e.code, e.message);

    let msg = 'Incorrect email or password.';
    if (e.code === 'auth/user-not-found')        msg = 'No account found with this email.';
    if (e.code === 'auth/wrong-password')         msg = 'Incorrect password.';
    if (e.code === 'auth/invalid-email')          msg = 'Please enter a valid email.';
    if (e.code === 'auth/too-many-requests')      msg = 'Too many attempts. Try again later.';
    if (e.code === 'auth/network-request-failed') msg = 'Network error. Check your connection.';
    if (e.code === 'auth/invalid-credential')     msg = 'Incorrect email or password.';

    err.textContent = msg;
    err.classList.remove('hidden');
    btn.disabled    = false;
    txt.textContent = 'Access Dashboard';
    spin.classList.add('hidden');

    const card = document.querySelector('.login-card');
    card.classList.add('shake');
    setTimeout(() => card.classList.remove('shake'), 500);
  }
}

function togglePass() {
  const input = document.getElementById('adminPass');
  const icon  = document.getElementById('eyeIcon');
  if (input.type === 'password') {
    input.type = 'text';
    icon.innerHTML = `<path d="M3 3l14 14M8.5 8.7A3 3 0 0011.3 11.5M6.1 6.2C4.2 7.4 2.6 9.5 2 10c1.6 2.2 4.6 5 8 5a8 8 0 003.9-1M9.9 4.6A8 8 0 0118 10c-.5.7-1.5 2-3 3.1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>`;
  } else {
    input.type = 'password';
    icon.innerHTML = `<path d="M2 10s3-5.5 8-5.5S18 10 18 10s-3 5.5-8 5.5S2 10 2 10z" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="10" r="2.2" stroke="currentColor" stroke-width="1.4"/>`;
  }
}

async function handleGoogleLogin() {
  const err = document.getElementById('loginError');
  err.classList.add('hidden');

  // Only these emails are allowed as admins
  const ALLOWED_ADMINS = [
    'aj.enao@neu.edu.ph',
    'jcesperanza@neu.edu.ph'
  ];

  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ hd: 'neu.edu.ph' });
    const result = await signInWithPopup(auth, provider);
    const email  = result.user.email?.toLowerCase();

    if (!ALLOWED_ADMINS.includes(email)) {
      await signOut(auth);
      err.textContent = 'Access denied. Your account is not authorized as an admin.';
      err.classList.remove('hidden');
      return;
    }
    // onAuthStateChanged handles the rest
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      err.textContent = 'Google sign-in failed: ' + e.message;
      err.classList.remove('hidden');
    }
  }
}

async function handleLogout() {
  await signOut(auth);
  window.location.href = 'index.html';
}

// =============================================
//  DASHBOARD INIT
// =============================================
async function startDashboard(user) {
  document.querySelector('.admin-chip').innerHTML = `
    <svg viewBox="0 0 16 16" fill="none" width="13" height="13">
      <circle cx="8" cy="5.5" r="2.8" stroke="currentColor" stroke-width="1.3"/>
      <path d="M2.5 13.5c0-2.485 2.462-4.5 5.5-4.5s5.5 2.015 5.5 4.5"
        stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
    </svg>
    Admin
  `;

  // Save this admin to Firestore so all admins are visible in Manage Users
  try {
    const { setDoc, doc: firestoreDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
    );
    await setDoc(firestoreDoc(db, 'admins', user.uid), {
      email: user.email,
      uid:   user.uid,
      role:  'Admin',
      addedOn: user.metadata?.creationTime || new Date().toISOString()
    }, { merge: true });
  } catch(e) {
    console.warn('Could not save admin record:', e);
  }

  // Real-time listener for visits
  const q = query(collection(db, 'visits'), orderBy('timestamp', 'desc'));
  unsubVisits = onSnapshot(q, snapshot => {
    allVisits = snapshot.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
    updateStats();
    filterTable();
  }, err => {
    console.error('Firestore snapshot error:', err);
  });

  renderUserTable();
}

// =============================================
//  STATS
// =============================================
function updateStats() {
  const now          = new Date();
  const todayStr     = toDateStr(now);
  const startOfWeek  = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let d0 = 0, d1 = 0, d2 = 0;
  allVisits.forEach(r => {
    if (!r.timestamp) return;
    const d = r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
    if (toDateStr(d) === todayStr) d0++;
    if (d >= startOfWeek)          d1++;
    if (d >= startOfMonth)         d2++;
  });

  animateCount('statToday', d0);
  animateCount('statWeek',  d1);
  animateCount('statMonth', d2);
  animateCount('statTotal', allVisits.length);
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  let cur = 0;
  const step = Math.max(1, Math.floor(target / 20));
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(t);
  }, 40);
}

// =============================================
//  VISIT TABLE
// =============================================
async function renderVisitTable(records) {
  const tbody = document.getElementById('visitBody');
  const empty = document.getElementById('emptyState');
  const count = document.getElementById('recordCount');

  tbody.innerHTML   = '';
  count.textContent = `${records.length} record(s)`;

  if (records.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  // Load blocked emails for visual strikethrough
  let blockedEmails = new Set();
  try {
    const blockedSnap = await getDocs(collection(db, 'blocked'));
    blockedSnap.docs.forEach(d => blockedEmails.add(d.data().email?.toLowerCase()));
  } catch(e) { /* ignore */ }

  records.forEach((r, i) => {
    const ts   = r.timestamp?.toDate ? r.timestamp.toDate() : new Date();
    const dept = r.college  || r.program || '—';
    const prog = r.program  || '—';

    const tr = document.createElement('tr');
    const isBlocked = blockedEmails.has((r.email||'').toLowerCase());
    if (isBlocked) tr.classList.add('row-blocked');
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>
        <div class="name-main">${esc(r.name || '')}</div>
        <div class="name-email" style="font-size:.72rem;color:#b0bad0;">${esc(r.yearLevel || '')}</div>
      </td>
      <td><div class="name-email" style="font-size:.82rem;font-weight:500">${esc(r.studentNumber || '—')}</div></td>
      <td><div class="name-email">${esc(r.email || '')}</div></td>
      <td><span class="badge badge-${r.type||'student'}">${cap(r.type||'student')}</span></td>
      <td>${esc(r.reason || '')}</td>
      <td style="white-space:nowrap;font-size:.82rem">${formatTime(ts)}</td>
      <td>
        <div class="name-main" style="font-size:.8rem">${esc(r.college || '—')}</div>
        <div class="name-email">${esc(r.program || '')}</div>
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-del" data-id="${r.firestoreId}" data-name="${esc(r.name||'')}" data-email="${esc(r.email||'')}">Delete</button>
          ${isBlocked
            ? `<span class="blocked-tag">BLOCKED</span>`
            : `<button class="btn-block" data-email="${esc(r.email||'')}">Block</button>`
          }
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-del').forEach(btn =>
    btn.addEventListener('click', () => openDelete(btn.dataset.id, btn.dataset.name, btn.dataset.email))
  );

  tbody.querySelectorAll('.btn-block').forEach(btn =>
    btn.addEventListener('click', () => blockEmailFromTable(btn.dataset.email, btn.closest('tr')))
  );
}

// ── Time Out ────────────────────────────────────
async function handleTimeOut(firestoreId) {
  try {
    const { updateDoc, doc: firestoreDoc, serverTimestamp: st } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
    );
    await updateDoc(firestoreDoc(db, 'visits', firestoreId), {
      timeOut: st(),
      status:  'Out'
    });
  } catch (e) {
    alert('Could not record time out: ' + e.message);
  }
}

function filterTable() {
  const q             = (document.getElementById('searchInput').value || '').toLowerCase();
  const fromVal       = document.getElementById('dateFrom').value;
  const toVal         = document.getElementById('dateTo').value;
  const filterReason  = document.getElementById('filterReason').value;
  const filterProgram = document.getElementById('filterProgram').value;
  const filterType    = document.getElementById('filterType').value;

  const filtered = allVisits.filter(r => {
    const matchQ = !q ||
      (r.name||'').toLowerCase().includes(q)    ||
      (r.email||'').toLowerCase().includes(q)   ||
      (r.reason||'').toLowerCase().includes(q);
    const d = r.timestamp?.toDate ? r.timestamp.toDate() : new Date();
    const matchFrom   = !fromVal || d >= new Date(fromVal);
    const matchTo     = !toVal   || d <= new Date(toVal + 'T23:59:59');
    const matchReason = !filterReason  || (r.reason  || '') === filterReason;
    const matchProgram= !filterProgram || (r.college || r.program || '') === filterProgram;
    const matchType   = !filterType    || (r.type    || '') === filterType;
    return matchQ && matchFrom && matchTo && matchReason && matchProgram && matchType;
  });

  renderVisitTable(filtered);
}

// ── Delete ──────────────────────────────────────
function openDelete(firestoreId, name, email) {
  deleteTarget = { firestoreId, email };
  document.getElementById('deleteTargetName').textContent = name || email || '';
  document.getElementById('deleteModal').classList.remove('hidden');
}
function closeDelete() {
  deleteTarget = null;
  document.getElementById('deleteModal').classList.add('hidden');
}
async function confirmDelete() {
  if (!deleteTarget) return;
  const { firestoreId, email } = deleteTarget;
  try {
    // Delete visit record
    await deleteDoc(doc(db, 'visits', firestoreId));

    // Also delete user account from users collection
    if (email) {
      const { query: fsQuery, where: fsWhere, getDocs: fsGetDocs, deleteDoc: fsDel, doc: fsDoc }
        = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
      const userSnap = await fsGetDocs(fsQuery(collection(db, 'users'), fsWhere('email', '==', email.toLowerCase())));
      for (const d of userSnap.docs) {
        await fsDel(fsDoc(db, 'users', d.id));
      }
    }

    closeDelete();
  } catch (e) {
    alert('Delete failed: ' + e.message);
  }
}

// ── Export PDF ────────────────────────────────────
function exportPDF() {
  const rows = allVisits.map((r, i) => {
    const ts = r.timestamp?.toDate ? r.timestamp.toDate() : new Date();
    return `<tr>
      <td>${i+1}</td>
      <td><strong>${esc(r.name||'')}</strong><br><span style="font-size:10px;color:#888">${esc(r.yearLevel||'')}</span></td>
      <td>${esc(r.studentNumber||'—')}</td>
      <td>${esc(r.email||'')}</td>
      <td>${cap(r.type||'student')}</td>
      <td>${esc(r.reason||'')}</td>
      <td style="white-space:nowrap">${formatTime(ts)}</td>
      <td><strong>${esc(r.college||'')}</strong><br><span style="font-size:10px;color:#888">${esc(r.program||'')}</span></td>
    </tr>`;
  }).join('');

  // Inject print-only content + styles
  const printId = 'neu-print-content';
  let existing = document.getElementById(printId);
  if (existing) existing.remove();

  const div = document.createElement('div');
  div.id = printId;
  div.innerHTML = `
    <div class="print-header">
      <div class="print-logo">NEU</div>
      <div class="print-header-text">
        <h1>New Era University Library</h1>
        <p>Visitor Log Report</p>
      </div>
    </div>
    <div class="print-meta">
      <span><strong>Generated:</strong> ${new Date().toLocaleString('en-PH')}</span>
      <span><strong>Total Records:</strong> ${allVisits.length}</span>
    </div>
    <table class="print-table">
      <thead>
        <tr>
          <th>#</th><th>Name</th><th>Student No.</th><th>Email</th><th>Type</th>
          <th>Purpose</th><th>Date &amp; Time</th><th>College / Program</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="print-footer">New Era University Library — Visitor Log — Confidential</div>
  `;
  document.body.appendChild(div);

  // Inject print styles
  const styleId = 'neu-print-style';
  let existingStyle = document.getElementById(styleId);
  if (existingStyle) existingStyle.remove();

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @media print {
      @page { size: 8.5in 13in portrait; margin: 15mm; }
      body > *:not(#neu-print-content) { display: none !important; }
      #neu-print-content { display: block !important; font-family: Arial, sans-serif; color: #1a1a1a; }
    }
    #neu-print-content { display: none; }
    .print-header { display:flex; align-items:center; gap:14px; margin-bottom:14px; border-bottom:3px solid #0f1f3d; padding-bottom:12px; }
    .print-logo { width:46px; height:46px; background:#0f1f3d; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-weight:bold; font-size:11px; flex-shrink:0; }
    .print-header-text h1 { font-size:17px; color:#0f1f3d; margin:0; }
    .print-header-text p  { font-size:11px; color:#666; margin-top:3px; }
    .print-meta { font-size:11px; color:#555; margin-bottom:12px; display:flex; gap:24px; }
    .print-meta strong { color:#0f1f3d; }
    .print-table { border-collapse:collapse; width:100%; font-size:11px; }
    .print-table thead tr { background:#0f1f3d; }
    .print-table th { color:#fff; padding:8px 10px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.05em; white-space:nowrap; }
    .print-table td { padding:7px 10px; border-bottom:1px solid #e8ecf3; vertical-align:top; }
    .print-table tbody tr:nth-child(even) td { background:#f7f9fc; }
    .print-footer { margin-top:18px; font-size:10px; color:#aaa; text-align:center; border-top:1px solid #e8ecf3; padding-top:10px; }
  `;
  document.head.appendChild(style);

  window.print();

  // Cleanup after print
  window.addEventListener('afterprint', () => {
    document.getElementById(printId)?.remove();
    document.getElementById(styleId)?.remove();
  }, { once: true });
}

// =============================================
//  MANAGE USERS
// =============================================
async function renderUserTable() {
  const tbody = document.getElementById('userBody');
  tbody.innerHTML = `<tr><td colspan="5" style="padding:1rem;color:var(--muted);font-size:.83rem;">Loading...</td></tr>`;

  try {
    const snapshot = await getDocs(collection(db, 'admins'));
    tbody.innerHTML = '';

    if (snapshot.empty) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:1rem;color:var(--muted);font-size:.83rem;">No admin users found.</td></tr>`;
      return;
    }

    snapshot.docs.forEach((d, i) => {
      const u  = d.data();
      const tr = document.createElement('tr');
      const added = u.addedOn
        ? new Date(u.addedOn).toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})
        : '—';
      const isCurrentUser = u.uid === auth.currentUser?.uid;

      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><div class="name-main">${esc(u.email)}</div></td>
        <td><span class="badge badge-faculty">${esc(u.role || 'Admin')}</span></td>
        <td>${added}</td>
        <td>${isCurrentUser
          ? '<span style="font-size:.75rem;color:#b0bad0;">Current session</span>'
          : `<button class="btn-del" data-uid="${d.id}">Remove</button>`
        }</td>
      `;
      tbody.appendChild(tr);
    });

    // Attach remove listeners
    tbody.querySelectorAll('.btn-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (confirm('Remove this admin user?')) {
          try {
            const { deleteDoc, doc: firestoreDoc } = await import(
              "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
            );
            await deleteDoc(firestoreDoc(db, 'admins', btn.dataset.uid));
            renderUserTable();
          } catch(e) {
            alert('Could not remove: ' + e.message);
          }
        }
      });
    });

  } catch(e) {
    console.error('Error loading admins:', e);
    tbody.innerHTML = `<tr><td colspan="5" style="padding:1rem;color:#e05a5a;font-size:.83rem;">Error loading users: ${e.message}</td></tr>`;
  }
}

// =============================================
//  TABS
// =============================================
function switchTab(tab) {
  document.getElementById('panelVisits').classList.toggle('hidden',  tab !== 'visits');
  document.getElementById('panelUsers').classList.toggle('hidden',   tab !== 'users');
  document.getElementById('panelBlocked').classList.toggle('hidden', tab !== 'blocked');
  document.getElementById('tabBtnVisits').classList.toggle('active',  tab === 'visits');
  document.getElementById('tabBtnUsers').classList.toggle('active',   tab === 'users');
  document.getElementById('tabBtnBlocked').classList.toggle('active', tab === 'blocked');
  if (tab === 'users')   renderUserTable();
  if (tab === 'blocked') renderBlockedTable();
}

// ── Block from visit table ──────────────────────
let blockTarget = null; // { email, rowElement }

function blockEmailFromTable(email, rowEl) {
  blockTarget = { email, rowEl };
  document.getElementById('blockTargetEmail').textContent = email;
  document.getElementById('blockModal').classList.remove('hidden');
}

function closeBlock() {
  blockTarget = null;
  document.getElementById('blockModal').classList.add('hidden');
}

async function confirmBlock() {
  if (!blockTarget) return;
  const { email, rowEl } = blockTarget;
  try {
    const { setDoc, doc: firestoreDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
    );
    const docId = email.replace(/\./g, '_');
    await setDoc(firestoreDoc(db, 'blocked', docId), {
      email,
      blockedOn: new Date().toISOString()
    });

    // Strikethrough the row visually
    if (rowEl) {
      rowEl.classList.add('row-blocked');
      // Replace Block button with BLOCKED tag
      const blockBtn = rowEl.querySelector('.btn-block');
      if (blockBtn) {
        blockBtn.outerHTML = `<span class="blocked-tag">BLOCKED</span>`;
      }
    }
    closeBlock();
  } catch (e) {
    alert('Could not block: ' + e.message);
    closeBlock();
  }
}

// =============================================
//  BLOCKED EMAILS
// =============================================
async function blockEmail() {
  const input = document.getElementById('blockEmailInput');
  const email = input.value.trim().toLowerCase();

  if (!email) { alert('Please enter an email address.'); return; }
  if (!/^[^\s@]+@neu\.edu\.ph$/i.test(email)) {
    alert('Please enter a valid @neu.edu.ph email.'); return;
  }

  try {
    const { setDoc, doc: firestoreDoc } = await import(
      "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js"
    );
    // Use email as doc ID (replace dots with underscores for Firestore)
    const docId = email.replace(/\./g, '_');
    await setDoc(firestoreDoc(db, 'blocked', docId), {
      email,
      blockedOn: new Date().toISOString()
    });
    input.value = '';
    renderBlockedTable();
  } catch (e) {
    alert('Could not block email: ' + e.message);
  }
}

async function renderBlockedTable() {
  const tbody = document.getElementById('blockedBody');
  const empty = document.getElementById('blockedEmpty');
  tbody.innerHTML = `<tr><td colspan="4" style="padding:1rem;color:var(--muted);font-size:.83rem;">Loading...</td></tr>`;

  try {
    const snapshot = await getDocs(collection(db, 'blocked'));
    tbody.innerHTML = '';

    if (snapshot.empty) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    snapshot.docs.forEach((d, i) => {
      const b  = d.data();
      const tr = document.createElement('tr');
      const blockedOn = b.blockedOn
        ? new Date(b.blockedOn).toLocaleDateString('en-PH', {month:'short', day:'numeric', year:'numeric'})
        : '—';
      tr.innerHTML = `
        <td>${i + 1}</td>
        <td><div class="name-main">${esc(b.email)}</div></td>
        <td>${blockedOn}</td>
        <td><button class="btn-unblock" data-id="${d.id}" data-email="${esc(b.email)}">Unblock</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('.btn-unblock').forEach(btn =>
      btn.addEventListener('click', () => openUnblock(btn.dataset.id, btn.dataset.email, btn.closest('tr')))
    );
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="4" style="padding:1rem;color:#e05a5a;font-size:.83rem;">Error: ${e.message}</td></tr>`;
  }
}

// ── Unblock modal ───────────────────────────────
let unblockTarget = null; // { docId, email, rowEl }

function openUnblock(docId, email, rowEl) {
  unblockTarget = { docId, email, rowEl };
  document.getElementById('unblockTargetEmail').textContent = email;
  document.getElementById('unblockModal').classList.remove('hidden');
}
function closeUnblock() {
  unblockTarget = null;
  document.getElementById('unblockModal').classList.add('hidden');
}
async function confirmUnblock() {
  if (!unblockTarget) return;
  const { docId, email, rowEl } = unblockTarget;
  try {
    await deleteDoc(doc(db, 'blocked', docId));

    // Remove row instantly without refresh
    rowEl?.remove();

    // Re-number remaining rows
    document.querySelectorAll('#blockedBody tr').forEach((tr, i) => {
      tr.cells[0].textContent = i + 1;
    });

    // Show empty state if no rows left
    if (document.querySelectorAll('#blockedBody tr').length === 0) {
      document.getElementById('blockedEmpty').classList.remove('hidden');
    }

    // Also restore Block button in Visit Log if email matches
    document.querySelectorAll('#visitBody tr').forEach(tr => {
      const emailCell = tr.querySelector('.name-email');
      if (emailCell?.textContent?.toLowerCase() === email.toLowerCase()) {
        tr.classList.remove('row-blocked');
        const blockedTag = tr.querySelector('.blocked-tag');
        if (blockedTag) {
          const btn = document.createElement('button');
          btn.className = 'btn-block';
          btn.dataset.email = email;
          btn.textContent = 'Block';
          btn.style.marginLeft = '.4rem';
          btn.addEventListener('click', () => blockEmailFromTable(email, tr));
          blockedTag.replaceWith(btn);
        }
      }
    });

    closeUnblock();

    // Re-render visit table to remove strikethrough instantly
    filterTable();

  } catch (e) {
    alert('Could not unblock: ' + e.message);
    closeUnblock();
  }
}

function formatTime(date) {
  return date.toLocaleString('en-PH', {
    month:'numeric', day:'numeric', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true
  });
}
function toDateStr(d)  { return d.toISOString().split('T')[0]; }
function cap(s)        { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }
function esc(s)        { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }