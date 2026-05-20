const express = require('express');
const cors = require('cors');

const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Simple in-memory data store (for demo)
let users = [
  {
    id: '1',
    name: 'مدير النظام',
    email: 'admin@xonda.sa',
    password: 'admin123',
    role: 'super_admin'
  }
];

let warranties = [];

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Xonda Warranty API is running',
    timestamp: new Date().toISOString()
  });
});

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    
    // Simple token (in production use JWT)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Get warranties
app.get('/api/warranties', (req, res) => {
  try {
    res.json(warranties);
  } catch (error) {
    console.error('Get warranties error:', error);
    res.status(500).json({ error: 'فشل في جلب الضمانات' });
  }
});

// Create warranty
app.post('/api/warranties', (req, res) => {
  try {
    const warrantyData = req.body;
    
    const newWarranty = {
      id: Date.now().toString(),
      xonda_id: `XND-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      ...warrantyData,
      created_at: new Date().toISOString()
    };
    
    warranties.push(newWarranty);
    
    res.status(201).json(newWarranty);
  } catch (error) {
    console.error('Create warranty error:', error);
    res.status(500).json({ error: 'فشل في إنشاء الضمان' });
  }
});

// Get device types
app.get('/api/device-types', (req, res) => {
  try {
    const deviceTypes = [
      { id: '1', name: 'ثلاجة', model: 'Model X-500' },
      { id: '2', name: 'غسالة', model: 'Model W-300' },
      { id: '3', name: 'لابتوب', model: 'Model L-700' }
    ];
    res.json(deviceTypes);
  } catch (error) {
    console.error('Get device types error:', error);
    res.status(500).json({ error: 'فشل في جلب أنواع الأجهزة' });
  }
});

// Get warranty packages
app.get('/api/warranty-packages', (req, res) => {
  try {
    const packages = [
      { id: '1', name: 'ضمان سنة واحدة', duration_months: 12, price: 299.99 },
      { id: '2', name: 'ضمان سنتين', duration_months: 24, price: 499.99 },
      { id: '3', name: 'ضمان ثلاث سنوات', duration_months: 36, price: 699.99 }
    ];
    res.json(packages);
  } catch (error) {
    console.error('Get warranty packages error:', error);
    res.status(500).json({ error: 'فشل في جلب باقات الضمان' });
  }
});

// Dashboard stats
app.get('/api/dashboard/stats', (req, res) => {
  try {
    const stats = {
      total: warranties.length,
      pending: warranties.filter(w => w.status === 'pending').length,
      approved: warranties.filter(w => w.status === 'approved').length,
      rejected: warranties.filter(w => w.status === 'rejected').length
    };
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'فشل في جلب الإحصائيات' });
  }
});

// Catch all
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
