# 🛡️ IntelliCrash — AI Road Safety Platform

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen)
![Version](https://img.shields.io/badge/Version-16.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**AI-powered road safety intelligence for Himachal Pradesh mountain roads.**

---

## 🚀 **Quick Access**

### **User Application**
- **Home**: `http://localhost:5173/` 
- **Navigation**: `http://localhost:5173/navigation`
- **Bulletin**: `http://localhost:5173/bulletin`
- **SOS**: `http://localhost:5173/sos`
- **Rewards**: `http://localhost:5173/rewards`

### **📊 Admin Portal**
- **Login**: `http://localhost:5173/admin-login`
- **Dashboard**: `http://localhost:5173/admin`
- **Risk Analysis**: `http://localhost:5173/admin/risk-analysis`
- **Sentiment Analysis**: `http://localhost:5173/admin/sentiment`

> **Admin Email**: `shubhamabhi004@gmail.com`

---

## 📋 **Features**

### **User Features**
✅ Real-time AI risk prediction (99.3% accuracy)  
✅ Smart navigation with hotspot alerts  
✅ One-tap SOS with hospital/police detection  
✅ Community incident bulletin board  
✅ Safety rewards & gamification  
✅ Explainable AI (XAI) for risk explanations  
✅ Offline PWA support  

### **Admin Features**
✅ Real-time analytics dashboard  
✅ SOS alert monitoring  
✅ Report management  
✅ Review sentiment analysis (NLP)  
✅ Feature importance visualization  
✅ CSV data import/export  
✅ ML model insights & risk simulation  

---

## 🛠️ **Setup**

### **Prerequisites**
- Node.js 16+
- Python 3.9+
- Supabase account

### **Installation**

**1. Clone & Navigate**
```bash
cd intellicrash
```

**2. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

**3. Backend Setup**
```bash
cd ../python
python -m venv myenv
source myenv/bin/activate  # Windows: myenv\Scripts\activate
pip install -r requirements.txt
python api.py
```

**4. SOS Server**
```bash
cd ../sos-server
npm install
npm start
```

---

## 🎯 **Admin Portal Guide**

### **Login**
1. Go to: `http://localhost:5173/admin-login`
2. Email: `shubhamabhi004@gmail.com`
3. Password: [Your password]
4. Or use Google/GitHub OAuth

### **Dashboard Tabs**

| Tab | Features |
|-----|----------|
| **Analytics** | Hour heatmap, incident types, risk trends, learned hotspots |
| **Sentiment** | Review sentiment breakdown, NLP insights, driver feedback |
| **Database** | SOS alerts, reports, sessions, contacts, reviews management |
| **Tools** | Feature importance, model debugging |
| **RF Model** | Random Forest model insights |

### **Quick Actions**
- 🔄 **Refresh** — Update all statistics
- ⚡ **Risk Analysis** — Simulate scenarios & test ML model
- 💬 **Sentiment Analysis** — View NLP breakdown
- 📥 **CSV Import** — Upload hotspot data
- 📥 **CSV Export** — Download any dataset
- 🗑️ **Delete** — Remove reviews from DB

---

## 📊 **Admin Statistics**

Dashboard displays in real-time:
- **SOS Total** — Emergency alerts filed
- **Reports Active** — Open incident reports
- **Sessions** — Active user sessions
- **Avg Driver** — Average driver safety score
- **High Risk SOS** — Active danger alerts
- **Reviews** — Total driver feedback count
- **Positive %** — Sentiment satisfaction rate
- **Contacts** — Form submissions received

---

## 🔐 **Security**

- ✅ Supabase auth with email verification
- ✅ Admin whitelist (email-based access control)
- ✅ JWT tokens for API authentication
- ✅ CORS protection
- ✅ Rate limiting on sensitive endpoints

---

## 📁 **File Structure**

```
intellicrash/
├── frontend/
│   ├── src/pages/
│   │   ├── Home.jsx              ← Main landing page
│   │   ├── Admin.jsx             ← Admin dashboard
│   │   ├── AdminLogin.jsx        ← Admin login
│   │   ├── AdminRiskAnalysis.jsx ← Risk simulation
│   │   ├── AdminSentimentChart.jsx ← Sentiment view
│   │   ├── Navigation.jsx        ← Navigation UI
│   │   ├── Bulletin.jsx          ← Incident bulletin
│   │   ├── SOS.jsx               ← Emergency SOS
│   │   ├── Rewards.jsx           ← Gamification
│   │   └── XAI.jsx               ← Explainable AI
│   └── src/services/
│       ├── api.js                ← API calls
│       ├── supabase.js           ← Supabase setup
│       └── gamification.js       ← Rewards logic
├── python/
│   ├── api.py                    ← FastAPI backend
│   ├── hotspot_model.py          ← ML hotspot detection
│   ├── sentiment.py              ← NLP sentiment analysis
│   ├── xai.py                    ← Explainable AI
│   └── train_hotspot_model.py    ← Model training
├── sos-server/
│   └── server.js                 ← SOS alert server
├── ADMIN_PORTAL_ACCESS.md        ← Admin guide (NEW)
└── README.md                     ← This file
```

---

## 🔌 **API Endpoints**

### **Core API** (`/api`)
```
GET  /stats                    → Platform statistics
GET  /reports                  → All reports
POST /reports                  → Create report
GET  /sos-alerts              → SOS emergencies
POST /sos                      → Trigger SOS

GET  /admin/stats             → Admin dashboard stats
GET  /reviews/all             → All reviews
DELETE /reviews/:id           → Delete review
GET  /reviews/stats           → Sentiment statistics

POST /hotspots/import         → Import hotspots CSV
GET  /feature_importances     → ML features
```

---

## 🚨 **Environment Variables**

**.env (Frontend)**
```
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://demswvtoqurpjoqrqndy.supabase.co
VITE_SUPABASE_KEY=sb_publishable_nB5DXgfVKcGDokaWRKKe3A_YjHq85oi
```

**.env (Backend)**
```
SUPABASE_URL=https://demswvtoqurpjoqrqndy.supabase.co
SUPABASE_KEY=sb_publishable_nB5DXgfVKcGDokaWRKKe3A_YjHq85oi
DATABASE_URL=your_database_url
```

---

## 📈 **Model Performance**

**Accuracy**: 99.3% (Hybrid BiLSTM-RF ensemble)  
**F1-Score**: 0.993 (Weighted average)  
**Precision**: 99.33%  
**Recall**: 99.32%  
**Training Data**: 20,000+ iRAD records  
**Coverage**: All 12 HP districts  

---

## 📚 **Documentation**

- 📖 [Admin Portal Guide](./ADMIN_PORTAL_ACCESS.md) — Complete admin setup
- 🎨 [UI Improvements](./frontend/src/pages/) — Component documentation
- 🔬 [ML Model](./python/hotspot_model.py) — Model details
- 💬 [API Reference](./python/api.py) — Endpoint documentation

---

## 🤝 **Team**

**IntelliCrash v16** — AI Road Safety Platform  
**Institution**: JNGEC Sundernagar, Himachal Pradesh  
**Project**: iRAD 2025-26

### **Core Team**
- 🧑‍💻 **Shubham** — AI/ML & Backend
- 🧑‍💻 **Rihal Rai** — Frontend & UX

### **Contact**
- 📧 **Shubham**: shubhamabhi004@gmail.com
- 📧 **Rihal**: rihalrai68@gmail.com
- 🚨 **Emergency**: 112 / 108 / 100

---

## 📝 **License**

MIT License — Free for academic and non-profit use

---

## ✨ **Version History**

| Version | Changes |
|---------|---------|
| **16.0** | Final light theme, UI polish, admin improvements |
| **15.0** | Risk analysis dashboard |
| **14.0** | Sentiment analysis integration |
| **13.0** | Rewards & gamification |

---

**Last Updated**: April 26, 2026  
**Status**: ✅ Production Ready  
**Support**: [GitHub Issues](./github.com/intellicrash)

---

**🛡️ Drive HP Safer. Together.**
