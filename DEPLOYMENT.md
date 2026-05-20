# 🚀 دليل رفع Backend API

## الخطوات:

### 1️⃣ رفع Backend على Vercel

#### الطريقة الأسهل (Vercel CLI):

```bash
# في مجلد xonda-backend-vercel
cd xonda-backend-vercel

# رفع مباشرة
vercel

# بعد ما ينجح، شغل production deployment
vercel --prod
```

سيعطيك رابط Backend مثل:
```
https://xonda-backend-xxxxx.vercel.app
```

#### أو عبر GitHub:

1. أنشئ repository جديد: `xonda-backend`
2. ارفع جميع ملفات `xonda-backend-vercel`
3. في Vercel، اربط الـ repository
4. Deploy

---

### 2️⃣ إضافة Environment Variables في Vercel

بعد رفع Backend:

1. اذهب: https://vercel.com/your-username/xonda-backend/settings/environment-variables

2. أضف:
   - **SUPABASE_URL:** `https://your-project.supabase.co`
   - **SUPABASE_KEY:** `your-anon-key-here`
   - **JWT_SECRET:** `any-random-secret-string-here`

3. اضغط **Save**

4. **Redeploy** المشروع

---

### 3️⃣ ربط Frontend بالـ Backend

في مشروع Frontend:

1. أنشئ ملف `.env.local`:
```
NEXT_PUBLIC_API_URL=https://xonda-backend-xxxxx.vercel.app
```

2. في Vercel Frontend settings → Environment Variables:
   - **NEXT_PUBLIC_API_URL:** `https://xonda-backend-xxxxx.vercel.app`

3. **Redeploy** Frontend

---

### 4️⃣ تجربة تسجيل الدخول

البيانات التجريبية:
- Email: `admin@xonda.sa`
- Password: `admin123`

---

## 🔧 استكشاف الأخطاء:

### CORS Error:
تأكد أن Backend يسمح بـ CORS من domain الفرونت إند

### 401 Unauthorized:
تحقق من Environment Variables في كلا المشروعين

### Database Connection Error:
تحقق من SUPABASE_URL و SUPABASE_KEY

---

تم إعداده بواسطة Claude
