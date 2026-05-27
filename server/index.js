require('dotenv').config();
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

require('./db');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.PORT || 3000;
const publicDir = path.join(__dirname, '..', 'public');

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(express.static(publicDir));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

app.get('/dashboard', (_req, res) => {
  res.sendFile(path.join(publicDir, 'dashboard.html'));
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  if (req.method !== 'GET') return next();
  const file = path.join(publicDir, req.path === '/' ? 'index.html' : req.path);
  res.sendFile(file, (err) => {
    if (err) res.status(404).send('Not found');
  });
});

app.listen(PORT, () => {
  console.log(`TaskFlow running at http://localhost:${PORT}`);
  if (!process.env.GOOGLE_CLIENT_ID) {
    console.log('Tip: set GOOGLE_CLIENT_ID in .env to enable Google Sign-In');
  }
});
