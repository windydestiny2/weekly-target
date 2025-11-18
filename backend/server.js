// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cors = require('cors');
const weeklyTargetRoutes = require('./routes/weeklyTargetRoutes');
const learningLogRoutes = require('./routes/learningLogRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set to true if using HTTPS
}));

// Routes
app.use('/api', weeklyTargetRoutes);
app.use('/api', learningLogRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', authRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at: http://localhost:${PORT}`);
});
