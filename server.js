const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const app = express();
const PORT = 3000;

app.use(express.static(__dirname));
app.use(express.json());

let discordBot = null;
let botToken = null;

function startDiscordBot(token) {
    if (!discordBot && token) {
        botToken = token;
        const botProcess = spawn('python', ['managerbot.py', token]);
        
        botProcess.stdout.on('data', (data) => {
            console.log(`Discord Bot: ${data}`);
        });
        
        botProcess.stderr.on('data', (data) => {
            console.log(`Discord Bot Error: ${data}`);
        });
        
        botProcess.on('close', (code) => {
            console.log(`Discord Bot exited with code ${code}`);
            discordBot = null;
        });
        
        discordBot = botProcess;
        return true;
    }
    return false;
}

function stopDiscordBot() {
    if (discordBot) {
        discordBot.kill();
        discordBot = null;
        return true;
    }
    return false;
}

function loadUsers() {
    try {
        if (fs.existsSync('users.json')) {
            return JSON.parse(fs.readFileSync('users.json', 'utf8'));
        }
    } catch (error) {
        console.log('Error loading users:', error);
    }
    return {};
}

function saveUsers(users) {
    try {
        fs.writeFileSync('users.json', JSON.stringify(users, null, 2));
    } catch (error) {
        console.log('Error saving users:', error);
    }
}

function generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/activity', (req, res) => {
    res.sendFile(path.join(__dirname, 'activty.html'));
});

app.get('/adminpanel', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin panel/adminpanel.html'));
});

app.get('/games', (req, res) => {
    res.sendFile(path.join(__dirname, 'games/games.html'));
});

app.post('/api/create-account', (req, res) => {
    const { username, password } = req.body;
    const users = loadUsers();
    
    if (users[username]) {
        return res.json({ success: false, message: 'Username already exists' });
    }
    
    users[username] = {
        username,
        password,
        accessCode: null,
        createdAt: new Date().toISOString()
    };
    
    saveUsers(users);
    res.json({ success: true, message: 'Account created successfully' });
});

app.post('/api/login', (req, res) => {
    const { username, password, accessCode } = req.body;
    const users = loadUsers();
    
    if (!users[username]) {
        return res.json({ success: false, message: 'Account not found' });
    }
    
    if (users[username].password !== password) {
        return res.json({ success: false, message: 'Invalid password' });
    }
    
    if (!users[username].accessCode) {
        return res.json({ success: false, message: 'No access code assigned. Please contact admin.' });
    }
    
    if (users[username].accessCode !== accessCode) {
        return res.json({ success: false, message: 'Invalid access code' });
    }
    
    res.json({ success: true, message: 'Login successful' });
});

app.post('/api/admin-login', (req, res) => {
    const { username, code } = req.body;
    
    if (username === 'admin' && code === 'admin123') {
        res.json({ success: true });
    } else {
        res.json({ success: false, message: 'Invalid admin credentials' });
    }
});

app.get('/api/users', (req, res) => {
    const users = loadUsers();
    const activeUsers = Object.values(users).map(user => ({
        username: user.username,
        accessCode: user.accessCode || 'No code assigned'
    }));
    res.json(activeUsers);
});

app.post('/api/generate-code', (req, res) => {
    const { username } = req.body;
    const users = loadUsers();
    
    if (!users[username]) {
        return res.json({ success: false, message: 'User not found' });
    }
    
    const accessCode = generateAccessCode();
    users[username].accessCode = accessCode;
    saveUsers(users);
    
    res.json({ success: true, accessCode });
});

app.post('/api/change-code', (req, res) => {
    const { username, newCode } = req.body;
    const users = loadUsers();
    
    if (!users[username]) {
        return res.json({ success: false, message: 'User not found' });
    }
    
    users[username].accessCode = newCode;
    saveUsers(users);
    
    res.json({ success: true, message: 'Access code updated' });
});

app.post('/api/remove-code', (req, res) => {
    const { username } = req.body;
    const users = loadUsers();
    
    if (!users[username]) {
        return res.json({ success: false, message: 'User not found' });
    }
    
    users[username].accessCode = null;
    saveUsers(users);
    
    res.json({ success: true, message: 'Access code removed' });
});

app.post('/api/remove-user', (req, res) => {
    const { username } = req.body;
    const users = loadUsers();
    
    if (!users[username]) {
        return res.json({ success: false, message: 'User not found' });
    }
    
    delete users[username];
    saveUsers(users);
    
    res.json({ success: true, message: 'User removed' });
});

app.post('/api/start-bot', (req, res) => {
    const { token } = req.body;
    
    if (!token) {
        return res.json({ success: false, message: 'Bot token required' });
    }
    
    const success = startDiscordBot(token);
    res.json({ success, message: success ? 'Bot started' : 'Bot already running or invalid token' });
});

app.post('/api/stop-bot', (req, res) => {
    const success = stopDiscordBot();
    res.json({ success, message: success ? 'Bot stopped' : 'Bot not running' });
});

app.get('/admin-dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin panel/adminlogin.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
