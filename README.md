# 🏦 NexaBank Pro — AI-Powered Loan Portal (Full Stack)

> **Converted from Streamlit → Full Stack (Flask + JWT + SQLite + Vanilla JS)**

---

## 🚀 Quick Start (3 Commands)

```bash
# Clone / extract the project
cd nexabank

# Linux/Mac
chmod +x run.sh && ./run.sh

# Windows
run.bat
```

Open **http://localhost:5000** in your browser.

| Role | Username | Password |
|------|----------|----------|
| 🛠 Admin | `admin` | `admin123` |
| 👤 User  | `user`  | `user123`  |

---

## 📁 Project Structure

```
nexabank/
├── app.py                     # Flask entry point
├── requirements.txt           # Python dependencies
├── run.sh / run.bat           # One-click start scripts
│
├── backend/
│   ├── __init__.py
│   ├── config.py              # Config, JWT, loan constants
│   ├── db.py                  # SQLite context manager
│   └── routes/
│       ├── auth_routes.py     # /register /login /logout /me
│       ├── predict_routes.py  # /predict /predictions /loans/*
│       ├── admin_routes.py    # /admin/* (protected)
│       └── user_routes.py     # /user/* (KYC, payments, etc.)
│
├── database/
│   ├── init_db.py             # Schema creation
│   └── nexabank.db            # SQLite DB (auto-created)
│
├── model/
│   ├── train_model.py         # ML training script
│   ├── rf_model.pkl           # Trained model (auto-generated)
│   └── scaler.pkl             # Scaler (auto-generated)
│
└── frontend/
    ├── index.html             # SPA shell with all pages
    ├── styles/
    │   └── main.css           # Complete professional CSS
    └── pages/
        ├── config.js          # Loan constants, helpers
        ├── api.js             # JWT-aware fetch wrapper
        ├── auth.js            # Login/Register/Routing
        ├── user-apply.js      # Loan application form
        ├── user-loans.js      # My loans, payments, KYC, notifs
        ├── user-tools.js      # EMI calc, compare, savings, etc.
        ├── admin.js           # Full admin portal
        └── app.js             # Page router
```

---

## 🔌 REST API Reference

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | ❌ | Create new user account |
| POST | `/api/login` | ❌ | Login, get JWT tokens |
| POST | `/api/logout` | ✅ | Revoke access token |
| POST | `/api/refresh` | 🔄 | Refresh access token |
| GET  | `/api/me` | ✅ | Get current user profile |
| PUT  | `/api/me/profile` | ✅ | Update name/phone/language |
| POST | `/api/me/change-password` | ✅ | Change password |

### Loans & Predictions
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/loans/types` | ❌ | All 20 loan types |
| GET  | `/api/loans/emi?principal=&rate=&months=` | ❌ | EMI + amortization |
| GET  | `/api/loans/eligibility?income=&cibil=&age=&tenure=` | ✅ | Eligibility per loan type |
| POST | `/api/predict` | ✅ | Submit loan application → AI decision |
| GET  | `/api/predictions` | ✅ | My loan applications |
| GET  | `/api/predictions/<id>` | ✅ | Single loan detail |
| POST | `/api/loans/preclosure` | ✅ | Pre-closure savings calc |

### User Features
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/user/kyc` | ✅ | Get KYC status |
| POST | `/api/user/kyc/send-otp` | ✅ | Send phone OTP |
| POST | `/api/user/kyc/verify-otp` | ✅ | Verify OTP |
| POST | `/api/user/kyc/submit` | ✅ | Submit bank details |
| GET  | `/api/user/payments` | ✅ | Payment history |
| POST | `/api/user/payments/pay` | ✅ | Pay EMI |
| GET  | `/api/user/notifications` | ✅ | Get notifications |
| PUT  | `/api/user/notifications/mark-read` | ✅ | Mark all read |
| GET  | `/api/user/savings` | ✅ | Savings goals |
| POST | `/api/user/savings` | ✅ | Create savings goal |
| GET  | `/api/user/support` | ✅ | Support tickets |
| POST | `/api/user/support` | ✅ | Create ticket |

### Admin (Admin-only)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET  | `/api/admin/stats` | 🛠 | Dashboard statistics |
| GET  | `/api/admin/predictions` | 🛠 | All applications |
| PUT  | `/api/admin/predictions/<id>/status` | 🛠 | Update loan status |
| GET  | `/api/admin/users` | 🛠 | All users |
| POST | `/api/admin/users/create-admin` | 🛠 | Create admin user |
| GET  | `/api/admin/kyc` | 🛠 | All KYC records |
| PUT  | `/api/admin/kyc/<id>/verify` | 🛠 | Verify KYC |
| GET  | `/api/admin/payments` | 🛠 | All payments |
| GET  | `/api/admin/tickets` | 🛠 | All support tickets |
| PUT  | `/api/admin/tickets/<id>/resolve` | 🛠 | Resolve ticket |
| GET  | `/api/admin/audit` | 🛠 | Audit log |

---

## 🗄️ Database Schema

```sql
users          (id, username, name, email, phone, password_hash, role, lang, is_active, last_login, created_at)
predictions    (id, user_id, loan_type, loan_amount, applicant_income, emi, loan_status, approval_probability, risk_level, explainability, ...)
payments       (id, user_id, prediction_id, month_number, emi_amount, total_paid, transaction_id, status, ...)
kyc            (id, user_id, phone, otp_verified, account_number, bank_name, kyc_status, ...)
notifications  (id, user_id, message, type, is_read, created_at)
support_tickets(id, ticket_id, user_id, category, subject, description, priority, status, resolution, ...)
savings_goals  (id, user_id, plan_name, monthly_amount, interest_rate, goal_amount, maturity_date, ...)
audit_log      (id, user_id, username, action, details, created_at)
```

---

## ✨ Features (Complete)

### 🏠 Landing Page
- Responsive hero with animated stats
- 20 Loan product grid with rates
- Features section, About, Contact
- CTA with direct registration

### 🔐 Authentication
- JWT access + refresh tokens (8h / 30d)
- bcrypt password hashing (cost factor 12)
- Token blocklist (logout invalidation)
- Auto-refresh on 401 responses
- Role-based access: User / Admin

### 👤 User Portal (14 Pages)
1. **Apply for Loan** — Full form with real-time EMI preview
2. **EMI Calculator** — Amortization table + Chart.js bar chart
3. **Compare Loans** — Side-by-side 2-loan comparison
4. **Credit Score Booster** — Score visualization + improvement tips
5. **KYC Verification** — OTP + bank details + verification flow
6. **EMI Payments** — Pay EMIs, receipt generation, history table
7. **My Loans** — Status tracker, lifecycle steps, AI explainability
8. **Notifications** — Real-time notification center with unread badge
9. **Loan Eligibility Check** — FOIR-based multi-loan eligibility
10. **Pre-Closure Calculator** — Interest savings vs penalty analysis
11. **Support Tickets** — Create + track tickets (all categories)
12. **Savings Planner** — FV calculator + goal tracker
13. **Insurance Products** — 5 plans with premium/coverage comparison
14. **Profile Settings** — Edit name/phone/language, change password

### 🛠 Admin Portal (8 Pages)
1. **Dashboard** — 8 KPIs + 3 live Chart.js charts
2. **Loan Applications** — Filter/search, approve/reject/disburse
3. **KYC Records** — Verify KYC, view all details
4. **Payment Records** — All transactions, totals
5. **User Management** — All users, create admin, deactivate
6. **Advanced Analytics** — 4 charts (pie, line, bar, horizontal bar)
7. **Support Queue** — Resolve tickets, view all
8. **Audit Log** — Full action history

### 🤖 AI / ML
- Random Forest Classifier (200 trees)
- 29 engineered features (income ratios, log transforms, squared terms)
- Isolation Forest for fraud detection
- Rule-based fallback if model not present
- AI explainability factors shown per application

### 📊 Additional
- 20 loan types with rates and tenures
- 15 language constants (full i18n ready)
- Celebration animation on loan submission
- Amortization schedule generation
- PDF/text report download
- Audit trail for all admin actions

---

## 🔧 Manual Setup (Step by Step)

```bash
# 1. Navigate to project
cd nexabank

# 2. Create virtual environment
python3 -m venv venv

# 3. Activate it
source venv/bin/activate        # Linux/Mac
# OR: venv\Scripts\activate     # Windows

# 4. Install dependencies
pip install -r requirements.txt

# 5. Initialize database
python3 -c "from database.init_db import init_db; init_db()"

# 6. Train ML model
python3 model/train_model.py

# 7. Start server
python3 app.py
```

---

## 🌍 Environment Variables (Optional)

```bash
SECRET_KEY=your-flask-secret-key
JWT_SECRET_KEY=your-jwt-secret-key
PORT=5000
HOST=0.0.0.0
DEBUG=True
```

---

## 🐳 Docker (Optional)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
RUN python database/init_db.py && python model/train_model.py
EXPOSE 5000
CMD ["python", "app.py"]
```

```bash
docker build -t nexabank . && docker run -p 5000:5000 nexabank
```

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| Flask | Web framework |
| flask-jwt-extended | JWT authentication |
| flask-cors | Cross-origin requests |
| bcrypt | Password hashing |
| numpy | Numerical operations |
| scikit-learn | ML model (RandomForest + IsolationForest) |
| python-dateutil | Date calculations |

**Frontend:** Pure HTML/CSS/JavaScript + Chart.js (CDN) — No npm required!

---

*© 2025 NexaBank Pro Financial Services Pvt. Ltd. — RBI Registered NBFC*
