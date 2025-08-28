const express = require('express');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const mysql = require('mysql2');
require('dotenv').config();

// Load configuration
const config = require('./config.json');

// Add Clerk SDK
const { Clerk } = require('@clerk/clerk-sdk-node');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Initialize Clerk with secret key
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY || config.clerk.secretKey });

// Middleware
app.use(express.json());
app.use(express.static('.'));

// MySQL database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST || config.database.host,
  user: process.env.DB_USER || config.database.user,
  password: process.env.DB_PASSWORD || config.database.password,
  database: process.env.DB_NAME || config.database.database,
  port: process.env.DB_PORT || config.database.port
});

// Connect to database
db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL database:', err.message);
    console.log('Continuing without database connection...');
    // Set a flag to indicate database is not available
    global.dbAvailable = false;
  } else {
    console.log('Connected to MySQL database');
    global.dbAvailable = true;
    
    // Create users table if it doesn't exist
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    db.query(createUsersTable, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
      } else {
        console.log('Users table ready');
      }
    });
    
    // Create messages table if it doesn't exist
    const createMessagesTable = `
      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        username VARCHAR(50),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;
    
    db.query(createMessagesTable, (err) => {
      if (err) {
        console.error('Error creating messages table:', err.message);
      } else {
        console.log('Messages table ready');
      }
    });
  }
});

const PORT = process.env.PORT || 3001;

// Serve the main HTML file for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// User registration endpoint
app.post('/api/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  
  // If database is not available, use in-memory storage
  if (!global.dbAvailable) {
    // For demo purposes, we'll just return success
    return res.status(201).json({ message: 'User registered successfully (demo mode)', userId: Date.now() });
  }
  
  const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
  db.query(query, [username, email, password], (err, result) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
  });
});

// User login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // If database is not available, use in-memory storage
  if (!global.dbAvailable) {
    // For demo purposes, we'll just return success
    return res.json({ message: 'Login successful (demo mode)', user: { id: Date.now(), username, email: username + '@demo.com' } });
  }
  
  const query = 'SELECT id, username, email FROM users WHERE username = ? AND password = ?';
  db.query(query, [username, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    if (results.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    
    res.json({ message: 'Login successful', user: results[0] });
  });
});

// Get chat messages
app.get('/api/messages', (req, res) => {
  // If database is not available, return empty array
  if (!global.dbAvailable) {
    return res.json([]);
  }
  
  const query = 'SELECT username, message, created_at FROM messages ORDER BY created_at DESC LIMIT 50';
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    res.json(results);
  });
});

// Save chat message
app.post('/api/messages', (req, res) => {
  const { userId, username, message } = req.body;
  
  if (!userId || !username || !message) {
    return res.status(400).json({ error: 'User ID, username, and message are required' });
  }
  
  // If database is not available, just return success
  if (!global.dbAvailable) {
    return res.status(201).json({ message: 'Message saved successfully (demo mode)', messageId: Date.now() });
  }
  
  const query = 'INSERT INTO messages (user_id, username, message) VALUES (?, ?, ?)';
  db.query(query, [userId, username, message], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error: ' + err.message });
    }
    
    res.status(201).json({ message: 'Message saved successfully', messageId: result.insertId });
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Handle user joining
  socket.on('user-join', (userData) => {
    console.log('User joined:', userData);
    // Broadcast to all clients that a new user joined
    socket.broadcast.emit('user-joined', userData);
  });
  
  // Handle chat messages
  socket.on('chat-message', (messageData) => {
    console.log('Chat message received:', messageData);
    // Save message to database if available
    const { userId, username, text } = messageData;
    if (userId && username && text && global.dbAvailable) {
      const query = 'INSERT INTO messages (user_id, username, message) VALUES (?, ?, ?)';
      db.query(query, [userId, username, text], (err) => {
        if (err) {
          console.error('Error saving message to database:', err.message);
        }
      });
    }
    // Broadcast message to all clients
    io.emit('chat-message', messageData);
  });
  
  // Handle call events
  socket.on('call-initiated', (callData) => {
    console.log('Call initiated:', callData);
    // Send call invitation to specific user
    socket.broadcast.emit('call-invitation', callData);
  });
  
  socket.on('call-accepted', (callData) => {
    console.log('Call accepted:', callData);
    // Notify caller that call was accepted
    socket.broadcast.emit('call-accepted', callData);
  });
  
  socket.on('call-ended', (callData) => {
    console.log('Call ended:', callData);
    // Notify all users that call ended
    io.emit('call-ended', callData);
  });
  
  // Handle WebRTC signaling
  socket.on('offer', (data) => {
    console.log('Offer received');
    socket.broadcast.emit('offer', data);
  });
  
  socket.on('answer', (data) => {
    console.log('Answer received');
    socket.broadcast.emit('answer', data);
  });
  
  socket.on('ice-candidate', (data) => {
    console.log('ICE candidate received');
    socket.broadcast.emit('ice-candidate', data);
  });
  
  // Handle user disconnecting
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Broadcast to all clients that a user left
    socket.broadcast.emit('user-left', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Open your browser and navigate to the URL above to use Shadowverse');
  console.log('WebSocket server is ready for real-time communication');
  console.log(`Database connection: ${db.config.host}:${db.config.port}/${db.config.database}`);
});