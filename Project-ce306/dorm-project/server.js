const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static('public')); 

const SECRET_KEY = 'mysecretkey'; 

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'dorm_system',
    password: 'lift9678', // อย่าลืมแก้รหัสผ่าน!
    port: 5432,
});

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

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1 AND password = $2', [username, password]);
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

app.get('/api/reports', authenticateJWT, async (req, res) => {
    try {
        let sql = 'SELECT r.*, u.username FROM repair_reports r JOIN users u ON r.user_id = u.id';
        let values = [];
        if (req.user.role === 'user') {
            sql += ' WHERE r.user_id = $1';
            values = [req.user.id];
        }
        sql += ' ORDER BY r.id DESC'; 
        const result = await pool.query(sql, values);
        res.json(result.rows); 
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/reports', authenticateJWT, async (req, res) => {
    const { title, description, image_url } = req.body;
    try {
        await pool.query(
            'INSERT INTO repair_reports (user_id, title, description, image_url) VALUES ($1, $2, $3, $4)',
            [req.user.id, title, description, image_url || null]
        );
        res.json({ message: 'Created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/reports/:id', authenticateJWT, async (req, res) => {
    const { status } = req.body;
    try {
        await pool.query('UPDATE repair_reports SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ message: 'Updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Members API
app.get('/api/members', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        const result = await pool.query('SELECT * FROM room_members ORDER BY room_number ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/members', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { room_number, full_name, phone, image_url } = req.body;
    try {
        await pool.query(
            'INSERT INTO room_members (room_number, full_name, phone, image_url) VALUES ($1, $2, $3, $4)',
            [room_number, full_name, phone, image_url || null]
        );
        res.json({ message: 'Member added successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/members/:id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        await pool.query('DELETE FROM room_members WHERE id = $1', [req.params.id]);
        res.json({ message: 'Member deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// API: จัดการบัญชีผู้ใช้งาน (Accounts API - NEW)
// ============================================
app.get('/api/users', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        // ดึงเฉพาะ id, username, role (ไม่ส่งรหัสผ่านกลับไปแสดง)
        const result = await pool.query('SELECT id, username, role FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const { username, password, role } = req.body;
    try {
        // เช็คว่ามี username นี้หรือยัง
        const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) {
            return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีในระบบแล้ว' });
        }
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
            [username, password, role || 'user']
        );
        res.json({ message: 'Account created successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/users/:id', authenticateJWT, async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    try {
        if (req.params.id == req.user.id) {
            return res.status(400).json({ message: 'ไม่สามารถลบบัญชีของตัวเองได้' });
        }
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        // เช็คกรณีลบไม่ได้เพราะผู้ใช้นี้เคยแจ้งซ่อม (ติด Foreign Key)
        if (err.code === '23503') { 
            res.status(400).json({ message: 'ไม่สามารถลบได้ เนื่องจากบัญชีนี้มีประวัติการแจ้งซ่อมในระบบ' });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));