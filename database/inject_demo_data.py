import sqlite3
import os
import bcrypt
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "nexabank.db")

def inject():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    now = datetime.now()

    print("🚀 Injecting Professional Demo Data...")

    # 1. Create a Demo Admin and User if they don't exist
    pw_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    cur.execute("INSERT OR IGNORE INTO users (username, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)",
                ("admin", "NexaBank Admin", "admin@nexabank.pro", pw_hash, "admin", now.isoformat()))

    user_hash = bcrypt.hashpw(b"user123", bcrypt.gensalt()).decode()
    cur.execute("INSERT OR IGNORE INTO users (username, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)",
                ("user", "John Doe", "john@example.com", user_hash, "user", now.isoformat()))

    conn.commit()
    user_row = cur.execute("SELECT id FROM users WHERE username='user'").fetchone()
    uid = user_row[0]

    # 2. Inject some Loan Applications (Predictions)
    loans = [
        ("Personal Loan", 500000, "Approved", "Active", 85.5, "Low"),
        ("Home Loan", 2500000, "Approved", "Disbursed", 92.0, "Low"),
        ("Car Loan", 800000, "Under Review", "Under Review", 45.0, "Medium"),
        ("Education Loan", 1200000, "Rejected", "Rejected", 12.0, "High")
    ]

    for i, (ltype, amt, status, stage, prob, risk) in enumerate(loans):
        app_date = (now - timedelta(days=i*10)).strftime("%Y-%m-%d %H:%M:%S")
        cur.execute("""
            INSERT INTO predictions (
                user_id, username, name, loan_type, loan_amount, applicant_income,
                loan_status, lifecycle_stage, approval_probability, risk_level,
                applied_date, last_updated, emi, credit_score, employment_type
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (uid, "user", "John Doe", ltype, amt, 60000, status, stage, prob, risk,
              app_date, app_date, amt*0.02, 750, "Salaried"))

    # 3. Inject Notifications
    notifs = [
        ("🎉 Welcome to NexaBank Pro!", "success"),
        ("💰 Your Home Loan of ₹25,00,000 has been Disbursed!", "success"),
        ("⚠️ Please upload your PAN card to avoid delays.", "warning")
    ]
    for msg, ntype in notifs:
        cur.execute("INSERT INTO notifications (user_id, username, message, type, created_at) VALUES (?,?,?,?,?)",
                    (uid, "user", msg, ntype, now.isoformat()))

    conn.commit()
    conn.close()
    print("✅ Demo Data Injected Successfully! Your project is now 'Lively'.")

if __name__ == "__main__":
    inject()
