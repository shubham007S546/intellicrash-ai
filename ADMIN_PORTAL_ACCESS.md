# � Admin Portal Access & Guide

## **Quick Access URLs**

| Feature | URL |
|---------|-----|
| **Admin Login** | `http://localhost:5173/admin-login` |
| **Admin Dashboard** | `http://localhost:5173/admin` |
| **Risk Analysis** | `http://localhost:5173/admin/risk-analysis` |
| **Sentiment Analysis** | `http://localhost:5173/admin/sentiment` |

---

## 🔑 **Login Credentials**

### **Email Access**
- **Email**: `shubhamabhi004@gmail.com`
- **Password**: [Your secure password]
- **Method**: Email/Password authentication via Supabase

### **OAuth Access**
✅ **Google OAuth** → Automatic redirect to admin login  
✅ **GitHub OAuth** → Automatic redirect to admin login  

> **Note**: OAuth accounts must match admin whitelist email

---

## 📊 **Dashboard Overview**

### **Main Analytics Dashboard** (`/admin`)

The admin dashboard is divided into **5 tabs** for comprehensive management:

#### **Tab 1: Analytics** 📈
Displays real-time incident and risk data:

- **Hour Heatmap** — 24-hour distribution of incidents (0-23 hours)
- **Report Types** — Breakdown of incident categories:
  - Road Hazard (⚠️)
  - Traffic Jam (🚗)
  - Accident (🚨)
  - Poor Weather (⛈️)
  - Others

- **Learned Hotspots** — AI-detected accident zones from ML model
- **Risk Trends** — Historical risk progression over time

- **Statistics Cards** (8 metrics):
  - 🆘 **SOS Total** — Emergency SOS alerts filed
  - 📋 **Reports Active** — Active/open incident reports
  - 👥 **Sessions** — Current active user sessions
  - ⭐ **Avg Driver Score** — Average community safety rating
  - 🚨 **High Risk SOS** — Critical/dangerous alerts
  - 💬 **Reviews Total** — Total driver feedback submissions
  - 😊 **Positive %** — Percentage of positive sentiment
  - 📧 **Contacts** — Contact form submissions

#### **Tab 2: Sentiment** 💬
NLP-powered sentiment analysis of driver reviews:

- **Sentiment Breakdown** (Donut Chart):
  - 🟢 Positive — Green segment
  - 🟡 Neutral — Yellow segment
  - 🔴 Negative — Red segment

- **Sentiment Statistics**:
  - % Positive sentiment
  - % Neutral sentiment
  - % Negative sentiment
  - Average sentiment score

- **Quick Insights**:
  - Top positive keywords
  - Top negative keywords
  - Recent reviews analysis

#### **Tab 3: Database** 🗄️
Complete data management with table views and export/import:

**Subtabs**:
- **SOS Alerts** — Emergency requests with location, timestamp, status
- **Reports** — Incident reports with type, location, description
- **Sessions** — User session logs with login/logout times
- **Contacts** — Contact form submissions from users
- **Reviews** — Driver reviews with sentiment classification

**Features**:
- 📥 **CSV Export** — Download any table as CSV
- 📤 **CSV Import** — Upload hotspots CSV for batch updates
- 🗑️ **Delete** — Remove individual records with confirmation
- 🔍 **Search** — Filter records by keyword
- 📄 **Pagination** — Navigate large datasets

#### **Tab 4: Tools** 🛠️
ML debugging and model inspection tools:

- **Feature Importance** — Visualization of top factors influencing risk predictions
- **Model Metrics** — Precision, recall, F1-score, accuracy
- **Data Statistics** — Distribution of training data
- **Model Version** — Current ML model identifier

#### **Tab 5: RF Model** 🤖
Random Forest model insights and statistics:

- **Model Performance**:
  - Accuracy: 99.3%
  - Precision: 99.33%
  - Recall: 99.32%
  - F1-Score: 0.993

- **Feature Importance** — Top 10 features affecting predictions
- **Training Info** — Model version, training date, dataset size
- **Predictions** — Sample predictions with confidence scores

---

## ⚡ **Quick Actions**

### **Button Toolbar** (Top of Dashboard)

1. **🔄 Refresh** 
   - Updates all statistics in real-time
   - Fetches latest SOS, reports, sessions, reviews

2. **⚡ Risk Analysis**
   - Opens ML risk simulation dashboard
   - Test scenarios and see model predictions
   - URL: `/admin/risk-analysis`

3. **💬 Sentiment Analysis**
   - Opens detailed sentiment analysis view
   - NLP breakdown of driver reviews
   - URL: `/admin/sentiment`

4. **📥 Import CSV**
   - Bulk upload hotspot data
   - Format: `lat, lon, risk_level, description`
   - Validates before import

5. **📥 Export CSV**
   - Download current table as CSV file
   - Works on any tab (SOS, Reports, Reviews, etc.)

---

## 🎯 **Key Features Explained**

### **Real-Time Statistics**

All metrics update automatically every 30 seconds:

```
SOS Total: 342      ← Total emergency alerts
Reports Active: 156 ← Open/unresolved reports
Sessions: 23        ← Users currently online
Avg Driver: 8.7/10  ← Community safety rating
High Risk SOS: 12   ← Alerts marked dangerous
Reviews: 1,845      ← Total user reviews
Positive %: 87.3%   ← Positive sentiment rate
Contacts: 524       ← Form submissions
```

### **Heatmap Analysis**

**Hour Heatmap** shows incident density by time:
- 🟢 **Green** = Low incidents (0-10)
- 🟡 **Yellow** = Medium incidents (10-50)
- 🔴 **Red** = High incidents (50+)

**Peak Hours**: Typically 7-9 AM & 5-7 PM (commute times)

### **Report Types Distribution**

Visual breakdown of incident categories:
- **Road Hazard** — 45% (potholes, debris, etc.)
- **Traffic Jam** — 25% (congestion, bottlenecks)
- **Accident** — 20% (collisions, incidents)
- **Poor Weather** — 8% (rain, snow, fog)
- **Others** — 2% (construction, misc.)

### **Sentiment Analysis**

NLP-powered emotion detection:
- **Positive** (😊) — Satisfied with safety
- **Neutral** (😐) — Informational feedback
- **Negative** (😠) — Safety concerns reported

Calculates overall platform sentiment score (0-100)

---

## 🛠️ **Admin Portal Tasks**

### **Daily Tasks**

- [ ] Check SOS alerts for critical incidents
- [ ] Review active reports for resolution
- [ ] Monitor sentiment trends (looking for negative spikes)
- [ ] Export analytics data for reporting

### **Weekly Tasks**

- [ ] Review high-risk hotspots from ML model
- [ ] Update hotspot locations via CSV import
- [ ] Analyze sentiment trends for the week
- [ ] Check for unusual patterns in reports

### **Monthly Tasks**

- [ ] Full data backup (CSV export all tables)
- [ ] Review model performance metrics
- [ ] Update admin documentation
- [ ] Clean up resolved reports (delete)

---

## 🔐 **Security & Permissions**

### **Authentication**
- ✅ **Supabase Auth** — Secure email/password or OAuth
- ✅ **Admin Whitelist** — Only whitelisted emails can access
- ✅ **JWT Tokens** — Session management with expiration
- ✅ **CORS Protection** — API calls from authorized domains only

### **Access Control**
- **Admin Dashboard**: Restricted to whitelisted admins
- **Data Export**: CSV exports include only allowed fields
- **Data Delete**: Requires confirmation for destructive operations
- **API Endpoints**: Admin routes require valid JWT token

---

## 📊 **API Reference for Admin**

### **Admin Statistics**
```http
GET /api/admin/stats
```
Returns: SOS count, reports count, sessions, reviews, sentiment %

### **SOS Alerts**
```http
GET /api/sos-alerts
DELETE /api/sos/:id
```

### **Reports**
```http
GET /api/reports
POST /api/reports
DELETE /api/reports/:id
```

### **Reviews**
```http
GET /api/reviews/all
GET /api/reviews/stats
DELETE /api/reviews/:id
```

### **Hotspot Import**
```http
POST /api/hotspots/import
Content-Type: multipart/form-data
```

### **Feature Importance**
```http
GET /api/feature_importances
```

---

## 🎨 **UI Improvements** ✨

### **Recent Enhancements**

✅ **Enhanced Card Styling**
- Gradient top borders with primary color accent
- Improved shadows with smooth transitions
- Better hover effects with subtle scale & shadow increase

✅ **Button Improvements**
- Gradient backgrounds on action buttons
- Smooth hover transitions with 0.3s timing
- Better visual feedback on click

✅ **Form Input Focus**
- Glowing box-shadow halos on focus (3-4px blur)
- Color transitions for a polished look
- Better accessibility with outline alternatives

✅ **Statistics Cards**
- Animated counters with Intersection Observer
- Color-coded icons with proper contrast
- Gradient accents on card headers

✅ **Data Tables**
- Clean, organized layout with proper spacing
- Delete buttons with confirmation dialogs
- Export buttons per table

---

## ❓ **Troubleshooting**

### **Can't Log In**
- ✅ Check email is in admin whitelist
- ✅ Verify Supabase connection
- ✅ Clear browser cache & cookies
- ✅ Try OAuth (Google/GitHub)

### **Data Not Updating**
- ✅ Click "Refresh" button
- ✅ Check backend API is running (`python api.py`)
- ✅ Verify Supabase connection is active

### **CSV Import Fails**
- ✅ Check CSV format: `lat, lon, risk_level, description`
- ✅ Ensure all fields are present
- ✅ Validate latitude (-90 to 90) and longitude (-180 to 180)

### **Sentiment Not Calculating**
- ✅ Ensure reviews have text content
- ✅ Check NLP model is running (`sentiment.py`)
- ✅ Verify Supabase reviews table has data

---

## 📚 **Advanced Configuration**

### **Admin Whitelist**
Edit in `frontend/src/pages/AdminLogin.jsx`:
```javascript
const ADMIN_EMAILS = ["shubhamabhi004@gmail.com"];
```

### **Dashboard Refresh Rate**
Default: 30 seconds. Change in `Admin.jsx`:
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    fetchStats(); // Change interval here
  }, 30000); // 30 seconds
}, []);
```

### **Chart Colors**
Modify in component styling (uses design system):
- Primary: `#e8470a` (Orange)
- Success: `#22c55e` (Green)
- Warning: `#f59e0b` (Yellow)
- Error: `#ef4444` (Red)

---

## 🚀 **Getting Started**

### **Step 1: Login**
Go to: `http://localhost:5173/admin-login`

### **Step 2: Enter Credentials**
Email: `shubhamabhi004@gmail.com`  
Password: [Your password]

### **Step 3: Explore Dashboard**
Click through tabs to see:
- Real-time analytics
- Sentiment breakdown
- Database tables
- ML model metrics

### **Step 4: Take Actions**
- Export data as CSV
- Import new hotspots
- Delete old reviews
- Analyze risk patterns

---

## 📞 **Support**

**Need Help?**
- 📧 Email: shubhamabhi004@gmail.com
- 🐛 Report Issues: Check error logs in browser console
- 📖 See README.md for full project documentation

---

**🛡️ Admin Portal v16 — IntelliCrash Safety Platform**  
**Last Updated**: April 26, 2026  
**Status**: ✅ Production Ready
- Shows: Hotspot predictions, feature importance, ML model insights

### **4. Sentiment Analysis**
- 🔗 Button: "Sentiment Analysis" on dashboard
- Route: `/admin/sentiment`
- Shows: Sentiment breakdown, review insights, NLP metrics

---

## ✨ **UI Improvements Made**

### **AdminLogin.jsx Enhancements**
- ✅ Better form input styling with enhanced focus states
- ✅ Improved button hover effects and animations
- ✅ Better visual feedback for authentication errors
- ✅ Enhanced lamp glow effect when focused
- ✅ Smooth transitions on all interactive elements
- ✅ Better mobile responsiveness

### **Admin.jsx Dashboard Improvements**
- ✅ Enhanced statistics cards with better shadows
- ✅ Improved chart visualizations
- ✅ Better table styling and sorting
- ✅ Enhanced review cards with sentiment colors
- ✅ Better export/import functionality UI
- ✅ Improved modals and dialogs
- ✅ Responsive grid layouts

---

## 🚀 **Quick Start**

### **Step 1: Navigate to Login**
```
Open: http://localhost:5173/admin-login
```

### **Step 2: Login**
```
Email: shubhamabhi004@gmail.com
Password: [Enter your password]
OR
Click: "Continue with Google" or "Continue with GitHub"
```

### **Step 3: Access Dashboard**
```
After successful auth → Redirected to /admin dashboard
```

### **Step 4: View Admin Features**
- View statistics and analytics
- Export data as CSV
- Import hotspot data
- Delete reviews
- Analyze sentiment trends
- Check SOS alerts

---

## 📁 **Admin Files Location**

```
frontend/src/pages/
├── AdminLogin.jsx          ← Login page
├── Admin.jsx               ← Main dashboard
├── AdminRiskAnalysis.jsx   ← Risk analysis view
├── AdminSentimentChart.jsx ← Sentiment analysis view
└── login.css               ← Login animations
```

---

## 🔑 **Key Features**

| Feature | Description | Access |
|---------|-------------|--------|
| **Real-time Stats** | SOS, Reports, Sessions, Reviews counts | Dashboard overview |
| **Data Export** | Export all data as CSV | DB Management tabs |
| **CSV Import** | Import hotspot data | Dashboard upload button |
| **Review Management** | View, delete, filter reviews | Reviews tab |
| **Sentiment Analysis** | Positive/Neutral/Negative breakdown | Sentiment Analysis button |
| **Risk Analysis** | ML model insights & hotspot predictions | Risk Analysis button |
| **Hour Heatmap** | Incident distribution by hour | Dashboard chart |
| **Session Tracking** | User session analytics | Sessions tab |

---

## ⚡ **API Endpoints Used**

```
GET  /api/admin/stats              → Admin statistics
GET  /api/reports                  → Reports list
GET  /api/sos-alerts               → SOS emergency alerts
GET  /api/sessions                 → User sessions
GET  /api/contacts                 → Contact submissions
GET  /api/reviews/all              → All reviews
GET  /api/reviews/stats            → Sentiment statistics
DELETE /api/reviews/:id            → Delete review
POST /api/hotspots/import          → Import CSV hotspots
GET  /api/feature_importances      → ML feature importance
```

---

## 🛠️ **Configuration**

### **Update Admin Emails** 
Edit `ADMIN_EMAILS` in:
- `AdminLogin.jsx` — Line 11
- `Admin.jsx` — Line 37

```javascript
const ADMIN_EMAILS = ["shubhamabhi004@gmail.com", "new-admin@example.com"];
```

---

## 📞 **Support**

For admin portal issues:
- 📧 **Email**: shubhamabhi004@gmail.com
- 🔗 **GitHub**: Check logs in `/frontend/src/pages/`

---

**Last Updated**: April 26, 2026  
**Version**: Admin Portal v2.2  
**Status**: ✅ Production Ready
