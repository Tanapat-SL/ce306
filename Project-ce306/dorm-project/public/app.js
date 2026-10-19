/**
 * DormCare Application Client Logic
 * Single Page Application (SPA) with Dynamic DOM Updates & RESTful API integration
 */

// Application State
let currentUser = null;
let currentToken = localStorage.getItem('token') || null;
let mockAnnouncements = [
    { id: 1, title: 'แจ้งล้างแอร์ประจำปี', content: 'ทีมช่างจะเข้าทำการล้างแอร์ในวันเสาร์นี้ เวลา 09:00 - 16:00 น.', date: '19 ต.ค. 2026' },
    { id: 2, title: 'ขอความร่วมมือคัดแยกขยะ', content: 'โปรดทิ้งขยะในจุดที่จัดไว้ให้ ณ ชั้น 1', date: '15 ต.ค. 2026' }
];

// Initialize application on DOM loaded
document.addEventListener('DOMContentLoaded', () => {
    checkInitialAuth();
});

// Helper: Show Alert
function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('alert-box');
    const alertMsg = document.getElementById('alert-msg');
    const alertIcon = document.getElementById('alert-icon');

    alertBox.className = 'mb-6 p-4 rounded-xl shadow-sm border text-sm flex items-center justify-between ';
    
    if (type === 'success') {
        alertBox.classList.add('bg-emerald-50', 'border-emerald-200', 'text-emerald-800');
        alertIcon.className = 'fa-solid fa-circle-check text-emerald-600 text-base';
    } else if (type === 'error') {
        alertBox.classList.add('bg-rose-50', 'border-rose-200', 'text-rose-800');
        alertIcon.className = 'fa-solid fa-circle-exclamation text-rose-600 text-base';
    } else {
        alertBox.classList.add('bg-amber-50', 'border-amber-200', 'text-amber-800');
        alertIcon.className = 'fa-solid fa-triangle-exclamation text-amber-600 text-base';
    }

    alertMsg.innerText = message;
    alertBox.classList.remove('hidden');

    setTimeout(() => {
        hideAlert();
    }, 4000);
}

function hideAlert() {
    document.getElementById('alert-box').classList.add('hidden');
}

// Check stored authentication state
function checkInitialAuth() {
    if (currentToken) {
        const storedRole = localStorage.getItem('user_role') || 'user';
        const storedUsername = localStorage.getItem('username') || 'user';
        currentUser = { username: storedUsername, role: storedRole };
        renderAuthenticatedState();
    } else {
        renderLoginState();
    }
}

// Handle Login Submission
async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('username').value.trim();
    const passwordInput = document.getElementById('password').value.trim();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            currentToken = data.token;
            currentUser = { username: usernameInput, role: data.role };
            
            localStorage.setItem('token', data.token);
            localStorage.setItem('user_role', data.role);
            localStorage.setItem('username', usernameInput);

            showAlert(`ยินดีต้อนรับ ${usernameInput} เข้าสู่ระบบ`, 'success');
            renderAuthenticatedState();
        } else {
            showAlert(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
        }
    } catch (err) {
        console.error('Login Error:', err);
        showAlert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการรัน server.js', 'error');
    }
}

// Logout
function logout() {
    localStorage.clear();
    currentToken = null;
    currentUser = null;
    renderLoginState();
    showAlert('ออกจากระบบเรียบร้อยแล้ว', 'info');
}

// UI State Renderers
function renderLoginState() {
    document.getElementById('view-login').classList.remove('hidden');
    document.getElementById('view-student').classList.add('hidden');
    document.getElementById('view-admin').classList.add('hidden');
    document.getElementById('user-nav').classList.add('hidden');
}

function renderAuthenticatedState() {
    document.getElementById('view-login').classList.add('hidden');
    document.getElementById('user-nav').classList.remove('hidden');

    const badge = document.getElementById('nav-user-badge');
    badge.innerHTML = `<i class="fa-solid fa-user-circle mr-1"></i> ${currentUser.username} (${currentUser.role.toUpperCase()})`;

    if (currentUser.role === 'admin') {
        document.getElementById('view-admin').classList.remove('hidden');
        document.getElementById('view-student').classList.add('hidden');
        renderAnnouncementsAdmin();
    } else {
        document.getElementById('view-student').classList.remove('hidden');
        document.getElementById('view-admin').classList.add('hidden');
        renderAnnouncementsStudent();
    }

    loadReports();
}

// Load Reports from RESTful API
async function loadReports() {
    if (!currentToken) return;

    try {
        const response = await fetch('/api/reports', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }

        const reports = await response.json();

        if (currentUser.role === 'admin') {
            renderAdminTable(reports);
            updateAdminStats(reports);
        } else {
            renderStudentTable(reports);
        }
    } catch (err) {
        console.error('Fetch Reports Error:', err);
        showAlert('ไม่สามารถดึงข้อมูลรายการซ่อมได้', 'error');
    }
}

// Render Student Reports Table
function renderStudentTable(reports) {
    const tbody = document.getElementById('student-report-tbody');
    if (!reports || reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-slate-400 text-xs">
                    <i class="fa-solid fa-inbox text-3xl mb-2 block text-slate-300"></i>
                    ยังไม่มีรายการแจ้งซ่อมในขณะนี้
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = reports.map(item => `
        <tr class="hover:bg-slate-50/80 transition">
            <td class="py-3.5 px-6 font-mono text-xs font-semibold text-slate-500">#${item.id}</td>
            <td class="py-3.5 px-6 font-medium text-slate-800">${escapeHtml(item.title)}</td>
            <td class="py-3.5 px-6 text-slate-500 text-xs">${escapeHtml(item.description || '-')}</td>
            <td class="py-3.5 px-6 text-center">${getStatusBadgeHtml(item.status)}</td>
            <td class="py-3.5 px-6 text-right">
                ${item.status === 'รอดำเนินการ' ? `
                    <span class="text-[11px] text-slate-400 italic">อยู่ในคิวตรวจสอบ</span>
                ` : `
                    <span class="text-[11px] text-emerald-600 font-medium">เจ้าหน้าที่กำลังจัดการ</span>
                `}
            </td>
        </tr>
    `).join('');
}

// Render Admin Reports Table
function renderAdminTable(reports) {
    const tbody = document.getElementById('admin-report-tbody');
    if (!reports || reports.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="py-8 text-center text-slate-400 text-xs">
                    <i class="fa-solid fa-inbox text-3xl mb-2 block text-slate-300"></i>
                    ไม่มีรายการแจ้งซ่อมในระบบ
                </td>
            </tr>`;
        return;
    }

    tbody.innerHTML = reports.map(item => `
        <tr id="report-row-${item.id}" class="hover:bg-slate-50/80 transition">
            <td class="py-3.5 px-6 font-mono text-xs font-semibold text-slate-500">#${item.id}</td>
            <td class="py-3.5 px-6 font-medium text-slate-800 flex items-center space-x-1.5">
                <i class="fa-solid fa-user text-slate-400 text-xs"></i>
                <span>${escapeHtml(item.username)}</span>
            </td>
            <td class="py-3.5 px-6 font-medium text-slate-800">${escapeHtml(item.title)}</td>
            <td class="py-3.5 px-6 text-slate-500 text-xs max-w-xs truncate">${escapeHtml(item.description || '-')}</td>
            <td id="status-cell-${item.id}" class="py-3.5 px-6 text-center">${getStatusBadgeHtml(item.status)}</td>
            <td class="py-3.5 px-6 text-center">
                <div class="inline-flex rounded-lg shadow-sm" role="group">
                    <button onclick="updateReportStatus(${item.id}, 'รอดำเนินการ')" 
                        class="px-2.5 py-1 text-xs font-medium bg-white text-amber-600 border border-slate-200 rounded-l-lg hover:bg-amber-50 transition">
                        รอดำเนินการ
                    </button>
                    <button onclick="updateReportStatus(${item.id}, 'กำลังแก้ไข')" 
                        class="px-2.5 py-1 text-xs font-medium bg-white text-blue-600 border-t border-b border-slate-200 hover:bg-blue-50 transition">
                        กำลังแก้ไข
                    </button>
                    <button onclick="updateReportStatus(${item.id}, 'เสร็จสิ้น')" 
                        class="px-2.5 py-1 text-xs font-medium bg-white text-emerald-600 border border-slate-200 rounded-r-lg hover:bg-emerald-50 transition">
                        เสร็จสิ้น
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update Admin Dashboard Stats Counters
function updateAdminStats(reports) {
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'รอดำเนินการ').length;
    const progress = reports.filter(r => r.status === 'กำลังแก้ไข').length;
    const completed = reports.filter(r => r.status === 'เสร็จสิ้น').length;

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-progress').innerText = progress;
    document.getElementById('stat-completed').innerText = completed;
}

// Dynamic Status Update (No Full Page Reload)
async function updateReportStatus(id, newStatus) {
    try {
        const response = await fetch(`/api/reports/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            const statusCell = document.getElementById(`status-cell-${id}`);
            if (statusCell) {
                statusCell.innerHTML = getStatusBadgeHtml(newStatus);
            }
            showAlert(`อัปเดตสถานะรายการ #${id} เป็น "${newStatus}" เรียบร้อยแล้ว`, 'success');
            loadReports(); 
        } else {
            showAlert('ไม่สามารถอัปเดตสถานะได้', 'error');
        }
    } catch (err) {
        console.error('Update Status Error:', err);
        showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

// Handle Create Report Modal Form
function toggleReportModal(show) {
    const modal = document.getElementById('modal-report');
    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

async function handleCreateReport(e) {
    e.preventDefault();
    const title = document.getElementById('report-title').value.trim();
    const desc = document.getElementById('report-desc').value.trim();

    if (!title) {
        showAlert('กรุณากรอกหัวข้อปัญหา', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/reports', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ title, description: desc })
        });

        if (response.ok) {
            showAlert('ส่งเรื่องแจ้งซ่อมเรียบร้อยแล้ว', 'success');
            document.getElementById('report-title').value = '';
            document.getElementById('report-desc').value = '';
            toggleReportModal(false);
            loadReports();
        } else {
            showAlert('เกิดข้อผิดพลาด ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
    } catch (err) {
        console.error('Create Report Error:', err);
        showAlert('ไม่สามารถส่งเรื่องได้', 'error');
    }
}

// Admin Tabs Switcher
function switchAdminTab(tabName) {
    const tabs = ['repairs', 'announcements', 'members'];
    
    tabs.forEach(tab => {
        const content = document.getElementById(`admin-tab-${tab}`);
        const btn = document.getElementById(`tab-btn-${tab}`);
        
        if (content && btn) {
            if (tab === tabName) {
                content.classList.remove('hidden');
                btn.className = 'px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white shadow-sm transition';
                if (tab === 'members') loadMembers();
            } else {
                content.classList.add('hidden');
                btn.className = 'px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 text-slate-700 hover:bg-slate-300 transition';
            }
        }
    });
}

// Announcements Rendering
function renderAnnouncementsStudent() {
    const container = document.getElementById('student-announcements');
    container.innerHTML = mockAnnouncements.map(a => `
        <div class="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div class="flex justify-between items-center mb-1">
                <span class="font-semibold text-slate-800 text-sm">${escapeHtml(a.title)}</span>
                <span class="text-[10px] text-slate-400">${a.date}</span>
            </div>
            <p class="text-xs text-slate-600">${escapeHtml(a.content)}</p>
        </div>
    `).join('');
}

function renderAnnouncementsAdmin() {
    const container = document.getElementById('admin-announcements-list');
    container.innerHTML = mockAnnouncements.map(a => `
        <div class="p-3 bg-white rounded-xl border border-slate-200 flex justify-between items-start">
            <div>
                <div class="flex items-center space-x-2">
                    <span class="font-bold text-slate-800 text-sm">${escapeHtml(a.title)}</span>
                    <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">${a.date}</span>
                </div>
                <p class="text-xs text-slate-600 mt-1">${escapeHtml(a.content)}</p>
            </div>
            <button onclick="deleteAnnouncement(${a.id})" class="text-rose-500 hover:text-rose-700 text-xs px-2 py-1">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function handleCreateAnnouncement(e) {
    e.preventDefault();
    const title = document.getElementById('ann-title').value.trim();
    const content = document.getElementById('ann-content').value.trim();

    if (title && content) {
        mockAnnouncements.unshift({
            id: Date.now(),
            title,
            content,
            date: 'วันนี้'
        });
        document.getElementById('ann-title').value = '';
        document.getElementById('ann-content').value = '';
        renderAnnouncementsAdmin();
        showAlert('โพสต์ประกาศเรียบร้อยแล้ว', 'success');
    }
}

function deleteAnnouncement(id) {
    mockAnnouncements = mockAnnouncements.filter(a => a.id !== id);
    renderAnnouncementsAdmin();
    showAlert('ลบประกาศเรียบร้อยแล้ว', 'info');
}

// Status Badges Generator
function getStatusBadgeHtml(status) {
    if (status === 'รอดำเนินการ') {
        return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <span class="w-1.5 h-1.5 mr-1.5 bg-amber-500 rounded-full animate-pulse"></span>รอดำเนินการ
        </span>`;
    } else if (status === 'กำลังแก้ไข') {
        return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <span class="w-1.5 h-1.5 mr-1.5 bg-blue-500 rounded-full"></span>กำลังแก้ไข
        </span>`;
    } else if (status === 'เสร็จสิ้น') {
        return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <span class="w-1.5 h-1.5 mr-1.5 bg-emerald-500 rounded-full"></span>เสร็จสิ้น
        </span>`;
    }
    return `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">${escapeHtml(status || '-')}</span>`;
}

// Utility: Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// -----------------------------------------------------------------
// Room Members Management (Admin)
// -----------------------------------------------------------------
async function loadMembers() {
    if (currentUser.role !== 'admin') return;
    try {
        const response = await fetch('/api/members', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const members = await response.json();
        
        const tbody = document.getElementById('admin-members-tbody');
        if (!members || members.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-slate-400 text-xs">ไม่มีข้อมูลผู้พักอาศัย</td></tr>`;
            return;
        }

        tbody.innerHTML = members.map(m => `
            <tr class="hover:bg-slate-50 transition">
                <td class="py-3 px-6 font-bold text-indigo-600">${escapeHtml(m.room_number)}</td>
                <td class="py-3 px-6 font-medium text-slate-800">${escapeHtml(m.full_name)}</td>
                <td class="py-3 px-6 text-slate-600">${escapeHtml(m.phone)}</td>
                <td class="py-3 px-6 text-center">
                    <button onclick="deleteMember(${m.id})" class="text-rose-500 hover:text-rose-700 text-xs font-medium px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 transition">
                        <i class="fa-solid fa-user-minus"></i> ย้ายออก
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        console.error('Fetch Members Error:', err);
    }
}

async function handleAddMember(e) {
    e.preventDefault();
    const room = document.getElementById('mem-room').value.trim();
    const name = document.getElementById('mem-name').value.trim();
    const phone = document.getElementById('mem-phone').value.trim();

    try {
        const response = await fetch('/api/members', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentToken}` },
            body: JSON.stringify({ room_number: room, full_name: name, phone: phone })
        });

        if (response.ok) {
            showAlert('เพิ่มรายชื่อผู้พักอาศัยเรียบร้อยแล้ว', 'success');
            document.getElementById('mem-room').value = '';
            document.getElementById('mem-name').value = '';
            document.getElementById('mem-phone').value = '';
            loadMembers();
        } else {
            showAlert('ไม่สามารถบันทึกข้อมูลได้', 'error');
        }
    } catch (err) {
        showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

async function deleteMember(id) {
    if (!confirm('ยืนยันการลบรายชื่อผู้พักอาศัย (ย้ายออก) ใช่หรือไม่?')) return;
    try {
        const response = await fetch(`/api/members/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        if (response.ok) {
            showAlert('ลบข้อมูลเรียบร้อยแล้ว', 'success');
            loadMembers();
        }
    } catch (err) {
        showAlert('ลบข้อมูลไม่สำเร็จ', 'error');
    }
}