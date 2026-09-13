const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { initDb } = require('./services/db');
const kioskRoutes = require('./routes/kioskRoutes');
const documentRoutes = require('./routes/documentRoutes');
const doctorRoutes = require('./routes/doctorRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory for viewing scanned prescriptions and lab reports
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'medikiosk-backend',
    timestamp: new Date().toISOString(),
    postgresConnected: require('./services/db').db.isPostgres()
  });
});

// Mount Routes
app.use('/api', kioskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api', doctorRoutes);
app.use('/api/doctor', doctorRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server
async function startServer() {
  await initDb();
  app.listen(PORT, () => {
    console.log(`========================================================`);
    console.log(` MediKiosk Backend running on http://localhost:${PORT}`);
    console.log(` SIH26047 - Patient Case-Taking Software (Ayush/Allopathy)`);
    console.log(`========================================================`);
  });
}

startServer();
