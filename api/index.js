const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();

// CORS configuration
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('فقط الصور (JPG, PNG) و PDF مسموح بها'));
  }
});

// In-memory data stores
let users = [
  {
    id: '1',
    name: 'مدير النظام',
    email: 'admin@xonda.sa',
    password: 'admin123',
    role: 'super_admin',
    dealer_id: '1'
  },
  {
    id: '2',
    name: 'محمد أحمد',
    email: 'dealer@xonda.sa',
    password: 'dealer123',
    role: 'dealer_admin',
    dealer_id: '1'
  }
];

let dealers = [
  {
    id: '1',
    name: 'وكيل زوندا الرئيسي',
    commercial_register: 'CR123456',
    contact_phone: '966501234567',
    contact_email: 'info@xonda.sa',
    address: 'الرياض، المملكة العربية السعودية',
    is_active: true
  }
];

let deviceCategories = [
  { id: '1', name: 'أجهزة منزلية' },
  { id: '2', name: 'أجهزة إلكترونية' },
  { id: '3', name: 'أجهزة مكتبية' }
];

let deviceTypes = [
  { id: '1', name: 'ثلاجة', model: 'Model X-500', category_id: '1' },
  { id: '2', name: 'غسالة', model: 'Model W-300', category_id: '1' },
  { id: '3', name: 'لابتوب', model: 'Model L-700', category_id: '2' },
  { id: '4', name: 'تلفزيون', model: 'Model T-900', category_id: '2' },
  { id: '5', name: 'طابعة', model: 'Model P-200', category_id: '3' }
];

let warrantyPackages = [
  { id: '1', name: 'ضمان سنة واحدة', duration_months: 12, price: 299.99, description: 'ضمان شامل لمدة سنة' },
  { id: '2', name: 'ضمان سنتين', duration_months: 24, price: 499.99, description: 'ضمان شامل لمدة سنتين' },
  { id: '3', name: 'ضمان ثلاث سنوات', duration_months: 36, price: 699.99, description: 'ضمان شامل لمدة 3 سنوات' }
];

let warranties = [];
let warrantyImages = [];
let notifications = [];

// Helper function to generate Xonda ID
function generateXondaId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `XND-${timestamp}-${random}`;
}

// Helper function to calculate expiry date
function calculateExpiryDate(saleDate, durationMonths) {
  const date = new Date(saleDate);
  date.setMonth(date.getMonth() + durationMonths);
  return date.toISOString().split('T')[0];
}

// Create notification
function createNotification(userId, title, message, type = 'info', warrantyId = null) {
  const notification = {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    user_id: userId,
    title,
    message,
    type,
    is_read: false,
    related_warranty_id: warrantyId,
    created_at: new Date().toISOString()
  };
  notifications.push(notification);
  return notification;
}

// ==================== ROUTES ====================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Xonda Warranty API is running',
    timestamp: new Date().toISOString(),
    stats: {
      warranties: warranties.length,
      users: users.length,
      notifications: notifications.length
    }
  });
});

// ==================== AUTH ROUTES ====================

// Login
app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        dealer_id: user.dealer_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// Get current user
app.get('/api/auth/me', (req, res) => {
  try {
    const user = users[0];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      dealer_id: user.dealer_id
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ==================== WARRANTY ROUTES ====================

// Get all warranties
app.get('/api/warranties', (req, res) => {
  try {
    const { status, dealer_id } = req.query;
    
    let filtered = [...warranties];
    
    if (status) {
      filtered = filtered.filter(w => w.status === status);
    }
    
    if (dealer_id) {
      filtered = filtered.filter(w => w.dealer_id === dealer_id);
    }
    
    // Add related data
    const enriched = filtered.map(warranty => {
      const device = deviceTypes.find(d => d.id === warranty.device_type_id);
      const pkg = warrantyPackages.find(p => p.id === warranty.warranty_package_id);
      const dealer = dealers.find(d => d.id === warranty.dealer_id);
      const images = warrantyImages.filter(i => i.warranty_id === warranty.id);
      
      return {
        ...warranty,
        device_type: device,
        warranty_package: pkg,
        dealer: dealer,
        images: images
      };
    });
    
    res.json(enriched);
  } catch (error) {
    console.error('Get warranties error:', error);
    res.status(500).json({ error: 'فشل في جلب الضمانات' });
  }
});

// Get single warranty
app.get('/api/warranties/:id', (req, res) => {
  try {
    const warranty = warranties.find(w => w.id === req.params.id);
    
    if (!warranty) {
      return res.status(404).json({ error: 'الضمان غير موجود' });
    }
    
    const device = deviceTypes.find(d => d.id === warranty.device_type_id);
    const pkg = warrantyPackages.find(p => p.id === warranty.warranty_package_id);
    const dealer = dealers.find(d => d.id === warranty.dealer_id);
    const images = warrantyImages.filter(i => i.warranty_id === warranty.id);
    
    res.json({
      ...warranty,
      device_type: device,
      warranty_package: pkg,
      dealer: dealer,
      images: images
    });
  } catch (error) {
    console.error('Get warranty error:', error);
    res.status(500).json({ error: 'فشل في جلب الضمان' });
  }
});

// Create warranty
app.post('/api/warranties', upload.array('images', 5), (req, res) => {
  try {
    const warrantyData = JSON.parse(req.body.data || '{}');
    const files = req.files || [];
    
    // Find warranty package to get duration
    const pkg = warrantyPackages.find(p => p.id === warrantyData.warranty_package_id);
    
    const newWarranty = {
      id: Date.now().toString(),
      xonda_id: generateXondaId(),
      serial_number: warrantyData.serial_number,
      device_type_id: warrantyData.device_type_id,
      warranty_package_id: warrantyData.warranty_package_id,
      customer_name: warrantyData.customer_name,
      customer_phone: warrantyData.customer_phone,
      sale_date: warrantyData.sale_date,
      expiry_date: pkg ? calculateExpiryDate(warrantyData.sale_date, pkg.duration_months) : null,
      dealer_id: warrantyData.dealer_id || '1',
      submitted_by: '1',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    warranties.push(newWarranty);
    
    // Save images
    files.forEach((file, index) => {
      const image = {
        id: Date.now().toString() + index,
        warranty_id: newWarranty.id,
        file_name: file.originalname,
        file_size: file.size,
        mime_type: file.mimetype,
        file_data: file.buffer.toString('base64'), // Store as base64
        uploaded_at: new Date().toISOString()
      };
      warrantyImages.push(image);
    });
    
    // Create notification
    createNotification(
      '1',
      'ضمان جديد',
      `تم إنشاء ضمان جديد برقم ${newWarranty.xonda_id}`,
      'success',
      newWarranty.id
    );
    
    res.status(201).json(newWarranty);
  } catch (error) {
    console.error('Create warranty error:', error);
    res.status(500).json({ error: 'فشل في إنشاء الضمان: ' + error.message });
  }
});

// Update warranty status
app.put('/api/warranties/:id/status', (req, res) => {
  try {
    const { status, rejection_reason, revision_notes } = req.body;
    const warranty = warranties.find(w => w.id === req.params.id);
    
    if (!warranty) {
      return res.status(404).json({ error: 'الضمان غير موجود' });
    }
    
    warranty.status = status;
    warranty.updated_at = new Date().toISOString();
    
    if (status === 'rejected') {
      warranty.rejection_reason = rejection_reason;
    }
    
    if (status === 'revision_requested') {
      warranty.revision_notes = revision_notes;
    }
    
    if (status === 'approved' || status === 'rejected') {
      warranty.reviewed_at = new Date().toISOString();
      warranty.reviewed_by = '1';
    }
    
    // Create notification
    let notifTitle = '';
    let notifMessage = '';
    let notifType = 'info';
    
    if (status === 'approved') {
      notifTitle = 'تم الموافقة على الضمان';
      notifMessage = `تم الموافقة على الضمان ${warranty.xonda_id}`;
      notifType = 'success';
    } else if (status === 'rejected') {
      notifTitle = 'تم رفض الضمان';
      notifMessage = `تم رفض الضمان ${warranty.xonda_id}`;
      notifType = 'error';
    } else if (status === 'revision_requested') {
      notifTitle = 'مطلوب مراجعة';
      notifMessage = `يتطلب الضمان ${warranty.xonda_id} مراجعة`;
      notifType = 'warning';
    }
    
    createNotification('1', notifTitle, notifMessage, notifType, warranty.id);
    
    res.json(warranty);
  } catch (error) {
    console.error('Update warranty status error:', error);
    res.status(500).json({ error: 'فشل في تحديث حالة الضمان' });
  }
});

// Delete warranty
app.delete('/api/warranties/:id', (req, res) => {
  try {
    const index = warranties.findIndex(w => w.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'الضمان غير موجود' });
    }
    
    // Delete related images
    warrantyImages = warrantyImages.filter(i => i.warranty_id !== req.params.id);
    
    warranties.splice(index, 1);
    
    res.json({ message: 'تم حذف الضمان بنجاح' });
  } catch (error) {
    console.error('Delete warranty error:', error);
    res.status(500).json({ error: 'فشل في حذف الضمان' });
  }
});

// ==================== DEVICE ROUTES ====================

// Get device categories
app.get('/api/device-categories', (req, res) => {
  try {
    res.json(deviceCategories);
  } catch (error) {
    console.error('Get device categories error:', error);
    res.status(500).json({ error: 'فشل في جلب فئات الأجهزة' });
  }
});

// Get device types
app.get('/api/device-types', (req, res) => {
  try {
    const enriched = deviceTypes.map(device => {
      const category = deviceCategories.find(c => c.id === device.category_id);
      return { ...device, category };
    });
    res.json(enriched);
  } catch (error) {
    console.error('Get device types error:', error);
    res.status(500).json({ error: 'فشل في جلب أنواع الأجهزة' });
  }
});

// ==================== WARRANTY PACKAGE ROUTES ====================

app.get('/api/warranty-packages', (req, res) => {
  try {
    res.json(warrantyPackages);
  } catch (error) {
    console.error('Get warranty packages error:', error);
    res.status(500).json({ error: 'فشل في جلب باقات الضمان' });
  }
});

// ==================== DEALER ROUTES ====================

app.get('/api/dealers', (req, res) => {
  try {
    res.json(dealers);
  } catch (error) {
    console.error('Get dealers error:', error);
    res.status(500).json({ error: 'فشل في جلب الوكلاء' });
  }
});

// ==================== DASHBOARD STATS ====================

app.get('/api/dashboard/stats', (req, res) => {
  try {
    const stats = {
      total: warranties.length,
      pending: warranties.filter(w => w.status === 'pending').length,
      approved: warranties.filter(w => w.status === 'approved').length,
      rejected: warranties.filter(w => w.status === 'rejected').length,
      revision_requested: warranties.filter(w => w.status === 'revision_requested').length,
      total_value: warranties.reduce((sum, w) => {
        const pkg = warrantyPackages.find(p => p.id === w.warranty_package_id);
        return sum + (pkg ? pkg.price : 0);
      }, 0),
      recent_warranties: warranties
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5)
        .map(w => {
          const device = deviceTypes.find(d => d.id === w.device_type_id);
          return {
            ...w,
            device_name: device ? device.name : 'غير معروف'
          };
        })
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'فشل في جلب الإحصائيات' });
  }
});

// ==================== NOTIFICATION ROUTES ====================

app.get('/api/notifications', (req, res) => {
  try {
    const userNotifications = notifications
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 50);
    
    res.json(userNotifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'فشل في جلب الإشعارات' });
  }
});

app.put('/api/notifications/:id/read', (req, res) => {
  try {
    const notification = notifications.find(n => n.id === req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: 'الإشعار غير موجود' });
    }
    
    notification.is_read = true;
    
    res.json(notification);
  } catch (error) {
    console.error('Mark notification read error:', error);
    res.status(500).json({ error: 'فشل في تحديث الإشعار' });
  }
});

// ==================== REPORTS ====================

app.get('/api/reports/warranties', (req, res) => {
  try {
    const { start_date, end_date, status, dealer_id } = req.query;
    
    let filtered = [...warranties];
    
    if (start_date) {
      filtered = filtered.filter(w => new Date(w.created_at) >= new Date(start_date));
    }
    
    if (end_date) {
      filtered = filtered.filter(w => new Date(w.created_at) <= new Date(end_date));
    }
    
    if (status) {
      filtered = filtered.filter(w => w.status === status);
    }
    
    if (dealer_id) {
      filtered = filtered.filter(w => w.dealer_id === dealer_id);
    }
    
    const report = {
      total: filtered.length,
      by_status: {
        pending: filtered.filter(w => w.status === 'pending').length,
        approved: filtered.filter(w => w.status === 'approved').length,
        rejected: filtered.filter(w => w.status === 'rejected').length,
        revision_requested: filtered.filter(w => w.status === 'revision_requested').length
      },
      by_device_type: {},
      total_value: 0,
      warranties: filtered
    };
    
    // Group by device type
    filtered.forEach(warranty => {
      const device = deviceTypes.find(d => d.id === warranty.device_type_id);
      const deviceName = device ? device.name : 'غير معروف';
      
      if (!report.by_device_type[deviceName]) {
        report.by_device_type[deviceName] = 0;
      }
      report.by_device_type[deviceName]++;
      
      // Calculate total value
      const pkg = warrantyPackages.find(p => p.id === warranty.warranty_package_id);
      if (pkg) {
        report.total_value += pkg.price;
      }
    });
    
    res.json(report);
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ error: 'فشل في إنشاء التقرير' });
  }
});

// ==================== ERROR HANDLERS ====================

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error: ' + err.message });
});

module.exports = app;
