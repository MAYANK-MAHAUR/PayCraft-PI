require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const fs = require('fs');
const path = require('path');
const db = require('./config/database');
const { ApiError } = require('./utils/errors');

const authRoutes = require('./routes/auth');
const piRoutes = require('./routes/pi');
const keysRoutes = require('./routes/keys');
const paymentsRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const transactionsRoutes = require('./routes/transactions');
const webhooksRoutes = require('./routes/webhooks');
const checkoutRoutes = require('./routes/checkout');
const exportsRoutes = require('./routes/exports');
const eventsRoutes = require('./routes/events');

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security headers & CORS
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'Idempotency-Key', 'Cookie'],
}));

app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'paycraft-api',
    version: '1.2.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/pi', piRoutes);
app.use('/api/keys', keysRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/exports', exportsRoutes);
app.use('/api/events', eventsRoutes);

// Error handler
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  console.error('Server error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
  });
});

// Verify schema & migrations
async function initDatabaseSchema() {
  try {
    const localSchemaPath = path.join(__dirname, 'schema.sql');
    const repoSchemaPath = path.join(__dirname, '../../database/schema.sql');
    let sql = '';

    if (fs.existsSync(localSchemaPath)) {
      sql = fs.readFileSync(localSchemaPath, 'utf8');
    } else if (fs.existsSync(repoSchemaPath)) {
      sql = fs.readFileSync(repoSchemaPath, 'utf8');
    }

    if (sql) {
      await db.query(sql);
      console.log('Database schema verified.');
    }
  } catch (err) {
    console.warn('Database schema notice:', err.message);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`PayCraft API running on port ${PORT}`);
  await initDatabaseSchema();
});
