let currentUser = null;
let currentToken = localStorage.getItem('token') || null;
let globalReports = []; 
let mockAnnouncements = [{ id: 1, title: 'แจ้งล้างแอร์', content: 'ทีมช่างจะเข้า...', date: 'วันนี้' }];

document.addEventListener('DOMContentLoaded', checkInitialAuth);

function togglePasswordVisibility() {
    const pInput = document.getElementById('password');
    const icon = document.getElementById('toggle-password-icon');
    if (pInput.type === 'password') { pInput.type = 'text'; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
    else { pInput.type = 'password'; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

function showAlert(message, type = 'success') {
    const b = document.getElementById('alert-box');
    const m = document.getElementById('alert-msg');
    const i = document.getElementById('alert-icon');
    b.className = 'mb-6 p-4 rounded-xl shadow-sm border text-sm flex justify-between ' + 
        (type==='success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800');
    i.className = type==='success' ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-exclamation';
    m.innerText = message; b.classList.remove('hidden'); setTimeout(hideAlert, 4000);
}
function hideAlert() { document.getElementById('alert-box').classList.add('hidden'); }

function checkInitialAuth() {
    if (currentToken) { currentUser = { username: localStorage.getItem('username'), role: localStorage.getItem('user_role') }; renderAuth(); }
    else renderLoginState();
}

async function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();
    try {
        const r = await fetch('/api/login', { method: 'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:u, password:p}) });
        const d = await r.json();
        if (r.ok) {
            currentToken = d.token; currentUser = {username:u, role:d.role};
            localStorage.setItem('token', d.token); localStorage.setItem('user_role', d.role); localStorage.setItem('username', u);
            showAlert(`ยินดีต้อนรับ ${u}`, 'success'); renderAuth();
        } else showAlert(d.message || 'รหัสผ่านผิด', 'error');
    } catch { showAlert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error'); }
}

function logout() { localStorage.clear(); currentToken=null; currentUser=null; renderLoginState(); }

function renderLoginState() {
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-student').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('user-nav').classList.add('hidden');
}

function renderAuth() {
    renderLoginState();
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('user-nav').classList.remove('hidden');
    document.getElementById('nav-user-badge').innerHTML = `<i class="fa-solid fa-user-circle"></i> ${currentUser.username} (${currentUser.role})`;
    if (currentUser.role === 'admin') {
        document.getElementById('view-admin').classList.remove('hidden');
        renderAnnouncementsAdmin();
    } else {
        document.getElementById('view-student').classList.remove('hidden');
        renderAnnouncementsStudent();
    }
    loadReports();
}

function renderAnnouncementsStudent() {
    document.getElementById('student-announcements').innerHTML = mockAnnouncements.map(a => 
        `<div class="p-3 bg-slate-50 rounded border mb-2"><div class="font-bold text-sm">${escapeHtml(a.title)}</div><div class="text-xs text-slate-600">${escapeHtml(a.content)}</div></div>`).join('');
}
function renderAnnouncementsAdmin() {
    document.getElementById('admin-announcements-list').innerHTML = mockAnnouncements.map(a => 
        `<div class="p-3 bg-white rounded border flex justify-between mb-2"><div><div class="font-bold text-sm">${escapeHtml(a.title)}</div><div class="text-xs text-slate-600">${escapeHtml(a.content)}</div></div><button onclick="deleteAnnouncement(${a.id})" class="text-rose-500 text-xs"><i class="fa-solid fa-trash"></i></button></div>`).join('');
}
function handleCreateAnnouncement(e) {
    e.preventDefault();
    mockAnnouncements.unshift({ id: Date.now(), title: document.getElementById('ann-title').value, content: document.getElementById('ann-content').value, date: 'วันนี้' });
    e.target.reset(); renderAnnouncementsAdmin(); showAlert('โพสต์ประกาศแล้ว', 'success');
}
function deleteAnnouncement(id) { mockAnnouncements = mockAnnouncements.filter(a => a.id !== id); renderAnnouncementsAdmin(); }

async function loadReports() {
    if (!currentToken) return;
    const r = await fetch('/api/reports', {headers:{'Authorization':`Bearer ${currentToken}`}});
    if(r.status===401||r.status===403) return logout();
    globalReports = await r.json();
    if(currentUser.role==='admin') { renderAdminTable(globalReports); updateStats(globalReports); }
    else renderStudentTable(globalReports);
}

function renderStudentTable(r) {
    const t = document.getElementById('student-report-tbody');
    if(!r.length) return t.innerHTML=`<tr><td colspan="5" class="p-4 text-center">ไม่มีข้อมูล</td></tr>`;
    t.innerHTML = r.map(i => `
        <tr class="border-b"><td class="p-3 font-mono">#${i.id}</td><td class="p-3 text-center">${i.image_url?`<img src="${i.image_url}" class="h-10 mx-auto">`:''}</td>
        <td class="p-3">${escapeHtml(i.title)}</td><td class="p-3 text-xs">${escapeHtml(i.description||'-')}</td><td class="p-3 text-center">${badge(i.status)}</td></tr>`).join('');
}
function renderAdminTable(r) {
    const t = document.getElementById('admin-report-tbody');
    if(!r.length) return t.innerHTML=`<tr><td colspan="6" class="p-4 text-center">ไม่มีข้อมูล</td></tr>`;
    t.innerHTML = r.map(i => `
        <tr class="border-b"><td class="p-3 font-mono">#${i.id}</td><td class="p-3 text-indigo-600 font-bold">${escapeHtml(i.username)}</td>
        <td class="p-3 text-center">${i.image_url?`<img src="${i.image_url}" class="h-10 mx-auto">`:''}</td>
        <td class="p-3 font-medium">${escapeHtml(i.title)}</td><td class="p-3 text-center">${badge(i.status)}</td>
        <td class="p-3 text-center">
            <button onclick="viewReportDetail(${i.id})" class="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded mr-2">ดูข้อมูล</button>
            <button onclick="updateReportStatus(${i.id}, 'กำลังแก้ไข')" class="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">กำลังแก้ไข</button>
            <button onclick="updateReportStatus(${i.id}, 'เสร็จสิ้น')" class="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded">เสร็จสิ้น</button>
        </td></tr>`).join('');
}

function updateStats(r) {
    document.getElementById('stat-total').innerText = r.length;
    document.getElementById('stat-pending').innerText = r.filter(x=>x.status==='รอดำเนินการ').length;
    document.getElementById('stat-progress').innerText = r.filter(x=>x.status==='กำลังแก้ไข').length;
    document.getElementById('stat-completed').innerText = r.filter(x=>x.status==='เสร็จสิ้น').length;
}

async function updateReportStatus(id, s) {
    await fetch(`/api/reports/${id}`, {method:'PUT', headers:{'Content-Type':'application/json','Authorization':`Bearer ${currentToken}`}, body:JSON.stringify({status:s})});
    loadReports();
}

function viewReportDetail(id) {
    const r = globalReports.find(x => x.id === id); if(!r) return;
    document.getElementById('detail-id').innerText = `#${r.id}`; document.getElementById('detail-user').innerText = r.username;
    document.getElementById('detail-title').innerText = r.title; document.getElementById('detail-desc').innerText = r.description||'-';
    document.getElementById('detail-status').innerHTML = badge(r.status);
    document.getElementById('detail-image-container').innerHTML = r.image_url ? `<img src="${r.image_url}" class="max-h-48 cursor-pointer" onclick="window.open('${r.image_url}')">` : 'ไม่มีรูป';
    document.getElementById('modal-report-detail').classList.remove('hidden');
}
function closeReportDetail() { document.getElementById('modal-report-detail').classList.add('hidden'); }
function toggleReportModal(show) { document.getElementById('modal-report').classList.toggle('hidden', !show); }

function readFileAsBase64(f) { return new Promise(r => { const rd = new FileReader(); rd.onload = () => r(rd.result); rd.readAsDataURL(f); }); }
async function handleCreateReport(e) {
    e.preventDefault(); const f = document.getElementById('report-image-file').files[0];
    const b = { title: document.getElementById('report-title').value, description: document.getElementById('report-desc').value, image_url: f ? await readFileAsBase64(f) : '' };
    await fetch('/api/reports', {method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${currentToken}`}, body:JSON.stringify(b)});
    toggleReportModal(false); loadReports(); showAlert('ส่งเรื่องแล้ว'); e.target.reset();
}

// Admin Tabs
function switchAdminTab(tName) {
    ['repairs', 'announcements', 'members', 'accounts'].forEach(t => {
        document.getElementById(`admin-tab-${t}`).classList.toggle('hidden', t !== tName);
        document.getElementById(`tab-btn-${t}`).className = t === tName ? 'px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white' : 'px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 text-slate-700';
    });
    if(tName==='members') loadMembers();
    if(tName==='accounts') loadAccounts();
}

// Members
async function loadMembers() {
    const r = await (await fetch('/api/members', {headers:{'Authorization':`Bearer ${currentToken}`}})).json();
    document.getElementById('admin-members-tbody').innerHTML = r.map(m => `<tr class="border-b"><td class="p-3">${m.image_url?`<img src="${m.image_url}" class="h-8 rounded-full">`:''}</td><td class="p-3 font-bold">${m.room_number}</td><td class="p-3">${m.full_name}</td><td class="p-3">${m.phone}</td><td class="p-3 text-center"><button onclick="deleteMember(${m.id})" class="text-rose-500 text-xs">ย้ายออก</button></td></tr>`).join('');
}
async function handleAddMember(e) {
    e.preventDefault(); const f = document.getElementById('mem-image-file').files[0];
    const b = {room_number:document.getElementById('mem-room').value, full_name:document.getElementById('mem-name').value, phone:document.getElementById('mem-phone').value, image_url:f?await readFileAsBase64(f):''};
    await fetch('/api/members', {method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${currentToken}`}, body:JSON.stringify(b)});
    loadMembers(); e.target.reset(); showAlert('เพิ่มแล้ว');
}
async function deleteMember(id) { if(confirm('ย้ายออก?')) { await fetch(`/api/members/${id}`, {method:'DELETE', headers:{'Authorization':`Bearer ${currentToken}`}}); loadMembers(); } }

// Accounts (NEW)
async function loadAccounts() {
    try {
        const r = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${currentToken}` } });
        const accs = await r.json();
        const tbody = document.getElementById('admin-accounts-tbody');
        if (!accs.length) return tbody.innerHTML = `<tr><td colspan="4" class="p-6 text-center">ไม่มีข้อมูล</td></tr>`;
        
        tbody.innerHTML = accs.map(a => `
            <tr class="border-b">
                <td class="p-3 font-mono text-xs">#${a.id}</td>
                <td class="p-3 font-bold text-sky-600">${escapeHtml(a.username)}</td>
                <td class="p-3 text-center">${a.role==='admin'?'<span class="bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-bold uppercase">Admin</span>':'<span class="bg-sky-100 text-sky-700 px-2 py-1 rounded text-[10px] font-bold uppercase">User</span>'}</td>
                <td class="p-3 text-center"><button onclick="deleteAccount(${a.id})" class="text-rose-500 text-xs bg-rose-50 px-2 py-1 rounded hover:bg-rose-100"><i class="fa-solid fa-trash"></i> ลบ</button></td>
            </tr>
        `).join('');
    } catch(err) {}
}

async function handleCreateAccount(e) {
    e.preventDefault();
    const u = document.getElementById('acc-username').value.trim();
    const p = document.getElementById('acc-password').value.trim();
    const r = document.getElementById('acc-role').value;
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` }, body: JSON.stringify({ username: u, password: p, role: r }) });
    const data = await res.json();
    if(res.ok) { showAlert('สร้างบัญชีแล้ว', 'success'); e.target.reset(); loadAccounts(); }
    else showAlert(data.message, 'error');
}

async function deleteAccount(id) {
    if(!confirm('ยืนยันการลบบัญชี? (หากเคยแจ้งซ่อมจะไม่สามารถลบได้)')) return;
    const res = await fetch(`/api/users/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${currentToken}` } });
    if(res.ok) { showAlert('ลบบัญชีแล้ว', 'success'); loadAccounts(); }
    else { const d = await res.json(); showAlert(d.message, 'error'); }
}

function badge(s) {
    if(s==='รอดำเนินการ') return `<span class="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs">รอดำเนินการ</span>`;
    if(s==='กำลังแก้ไข') return `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">กำลังแก้ไข</span>`;
    return `<span class="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs">เสร็จสิ้น</span>`;
}
function escapeHtml(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }