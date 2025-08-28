const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2');
const fs = require('fs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const config = fs.existsSync('./config.json') ? require('./config.json') : {};

// DATABASE CONFIG
const dbConfig = {
  host: process.env.DB_HOST || (config.database && config.database.host),
  user: process.env.DB_USER || (config.database && config.database.user),
  password: process.env.DB_PASSWORD || (config.database && config.database.password),
  database: process.env.DB_NAME || (config.database && config.database.database),
  port: process.env.DB_PORT || (config.database && config.database.port) || 3306
};

let dbAvailable = false;
let db;

try {
  db = mysql.createConnection(dbConfig);
  db.connect(err => {
    if (err) {
      console.log('DB not available, running in demo mode');
      dbAvailable = false;
    } else {
      console.log('Connected to MySQL database');
      dbAvailable = true;
    }
  });
} catch {
  console.log('DB not available, running in demo mode');
  dbAvailable = false;
}

// Middleware
app.use(express.json());
app.use(express.static('.'));

// ROUTES
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// REGISTER
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  if (!dbAvailable) return res.status(201).json({ message: 'User registered (demo mode)', userId: Date.now() });

  const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
  db.query(query, [username, email, password], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'User registered', userId: result.insertId });
  });
});

// LOGIN
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

  if (!dbAvailable) return res.json({ message: 'Login successful (demo mode)', user: { id: Date.now(), username, email: username + '@demo.com' } });

  const query = 'SELECT id, username, email FROM users WHERE username=? AND password=?';
  db.query(query, [username, password], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ message: 'Login successful', user: results[0] });
  });
});

// CHAT
app.get('/api/messages', (req, res) => {
  if (!dbAvailable) return res.json([]);
  db.query('SELECT username, message, created_at FROM messages ORDER BY created_at DESC LIMIT 50', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

app.post('/api/messages', (req, res) => {
  const { userId, username, message } = req.body;
  if (!userId || !username || !message) return res.status(400).json({ error: 'Missing fields' });

  if (!dbAvailable) return res.status(201).json({ message: 'Message saved (demo mode)', messageId: Date.now() });

  const query = 'INSERT INTO messages (user_id, username, message) VALUES (?, ?, ?)';
  db.query(query, [userId, username, message], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Message saved', messageId: result.insertId });
  });
});

// WebSocket
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('chat-message', (data) => {
    io.emit('chat-message', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || (config.app && config.app.port) || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
