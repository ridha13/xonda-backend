const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Auth middleware
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Xonda Warranty API is running' });
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Get user from database
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // For demo: accept password "admin123" for any admin user
    // In production, use: const validPassword = await bcrypt.compare(password, user.password_hash);
    const validPassword = password === 'admin123';
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
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
    res.status(500).json({ error: 'Server error' });
  }
});

// Get warranties
app.get('/api/warranties', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('warranties')
      .select(`
        *,
        device_type:device_types(*),
        warranty_package:warranty_packages(*),
        dealer:dealers(*)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Get warranties error:', error);
    res.status(500).json({ error: 'Failed to fetch warranties' });
  }
});

// Create warranty
app.post('/api/warranties', authenticate, async (req, res) => {
  try {
    const warrantyData = req.body;
    
    // Generate Xonda ID
    const xondaId = `XND-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    
    const { data, error } = await supabase
      .from('warranties')
      .insert([{
        ...warrantyData,
        xonda_id: xondaId,
        submitted_by: req.user.id
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Create warranty error:', error);
    res.status(500).json({ error: 'Failed to create warranty' });
  }
});

// Get device types
app.get('/api/device-types', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('device_types')
      .select('*, category:device_categories(*)')
      .eq('is_active', true);
    
    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Get device types error:', error);
    res.status(500).json({ error: 'Failed to fetch device types' });
  }
});

// Get warranty packages
app.get('/api/warranty-packages', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('warranty_packages')
      .select('*')
      .eq('is_active', true);
    
    if (error) throw error;
    
    res.json(data || []);
  } catch (error) {
    console.error('Get warranty packages error:', error);
    res.status(500).json({ error: 'Failed to fetch warranty packages' });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', authenticate, async (req, res) => {
  try {
    const { data: warranties } = await supabase
      .from('warranties')
      .select('status');
    
    const stats = {
      total: warranties?.length || 0,
      pending: warranties?.filter(w => w.status === 'pending').length || 0,
      approved: warranties?.filter(w => w.status === 'approved').length || 0,
      rejected: warranties?.filter(w => w.status === 'rejected').length || 0
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Export for Vercel
module.exports = app;
