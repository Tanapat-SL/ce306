const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static('public')); 

const SECRET_KEY = 'mysecretkey'; 

// ============================================
// ตั้งค่าการเชื่อมต่อ PostgreSQL
// ============================================
const pool = new Pool({
    user: 'postgres',        // ชื่อผู้ใช้ของ pgAdmin 
    host: 'localhost',
    database: 'dorm_system', // ชื่อฐานข้อมูล
    password: 'lift9678', // ⚠️ อย่าลืมแก้ให้เป็นรหัสผ่าน pgAdmin ของคุณ!
    port: 5432,
});

// Middleware ตรวจสอบ JWT Token
const authenticateJWT = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (token) {
        jwt.verify(token, SECRET_KEY, (err, user) => {
            if (err) return res.sendStatus(403);
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};


// ============================================
// API: Authentication
// ============================================

// API ล็อกอิน (Login)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 AND password = $2',
            [username, password]
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
            res.json({ token, role: user.role });
        } else {
            res.status(401).json({ message: 'Login failed' });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================================
// API: ระบบแจ้งซ่อม (Repair Reports)
// ============================================

// ดึงรายการแจ้งซ่อม (Read)
app.get('/api/reports', authenticateJWT, async (req, res) => {
    try {
        let sql = 'SELECT r.*, u.username FROM repair_reports r JOIN users u ON r.user_id = u.id';
        let values = [];

        if (req.user.role === 'user') {
            sql += ' WHERE r.user_id = $1';
            values = [req.user.id];
        }

        sql += ' ORDER BY r.id ASC'; 
        const result = await pool.query(sql, values);
        res.json(result.rows); 
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// สร้างรายการแจ้งซ่อม (Create)
app.post('/api/reports', authenticateJWT, async (req, res) => {
    const { title, description } = req.body;
    try {
        await pool.query(
            'INSERT INTO repair_reports (user_id, title, description) VALUES ($1, $2, $3)',
            [req.user.id, title, description]
        );
        res.json({ message: 'Created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// เปลี่ยนสถานะรายการแจ้งซ่อม (Update - Admin)
app.put('/api/reports/:id', authenticateJWT, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query(
            'UPDATE repair_reports SET status = $1 WHERE id = $2',
            [status, req.params.id]
        );
        res.json({ message: 'Updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// ============================================
// API: จัดการผู้พักอาศัย (Room Members)
// ============================================

// 1. ดึงรายชื่อผู้พักอาศัย (Admin Only)
app.get('/api/members', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const result = await pool.query('SELECT * FROM room_members ORDER BY room_number ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. เพิ่มผู้พักอาศัยใหม่ (Admin Only)
app.post('/api/members', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { room_number, full_name, phone } = req.body;
    try {
        await pool.query(
            'INSERT INTO room_members (room_number, full_name, phone) VALUES ($1, $2, $3)',
            [room_number, full_name, phone]
        );
        res.json({ message: 'Member added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. ย้ายออก / ลบผู้พักอาศัย (Admin Only)
app.delete('/api/members/:id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        await pool.query('DELETE FROM room_members WHERE id = $1', [req.params.id]);
        res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// เริ่มการทำงานเซิร์ฟเวอร์
app.listen(3000, () => console.log('Server running on http://localhost:3000'));