import sqlite3
import os
import random
from datetime import datetime, timedelta

DB_PATH = os.path.join(os.path.dirname(__file__), "nexabank.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def seed():
    conn = get_db()
    cur = conn.cursor()
    now = datetime.now()

    # 1. Ensure users exist
    usernames = ["rahul_sharma", "priya_patel", "amit_verma", "sneha_reddy", "vikram_singh", "ananya_das"]
    names = ["Rahul Sharma", "Priya Patel", "Amit Verma", "Sneha Reddy", "Vikram Singh", "Ananya Das"]

    for i in range(len(usernames)):
        uname = usernames[i]
        name = names[i]
        email = f"{uname}@example.com"
        # Password 'user123' hashed
        pw_hash = "$2b$12$K0h7wK7lH0uL1y3p1h3p1uL1y3p1h3p1uL1y3p1h3p1uL1y3p1h3p" # Dummy hash

        cur.execute("INSERT OR IGNORE INTO users (username, name, email, password_hash, role, created_at) VALUES (?,?,?,?,?,?)",
                    (uname, name, email, pw_hash, "user", (now - timedelta(days=30)).strftime("%Y-%m-%d %H:%M:%S")))

    conn.commit()

    # Get user IDs
    users = cur.execute("SELECT id, username, name FROM users WHERE role='user'").fetchall()

    # 2. Add 6 KYC records
    for u in users:
        status = "Verified" if u['id'] % 2 == 0 else "Pending"
        v_at = now.strftime("%Y-%m-%d %H:%M:%S") if status == "Verified" else None

        cur.execute("""
            INSERT OR REPLACE INTO kyc (user_id, username, phone, otp_verified, bank_name, account_number, ifsc_code, kyc_status, verified_at, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (u['id'], u['username'], f"987654321{u['id']}", 1, "HDFC Bank", f"501000{u['id']}1234", "HDFC0001234", status, v_at, (now - timedelta(days=20)).strftime("%Y-%m-%d %H:%M:%S")))

    # 3. Add Loan Applications (Predictions)
    loan_types = ["Personal Loan", "Home Loan", "Car Loan", "Education Loan", "Business Loan"]
    for i, u in enumerate(users):
        ltype = loan_types[i % len(loan_types)]
        amt = random.randint(100000, 2000000)
        income = random.randint(50000, 150000)
        prob = random.uniform(40, 95)
        status = "Approved" if prob > 70 else ("Rejected" if prob < 50 else "Under Review")
        risk = "Low" if prob > 80 else ("Medium" if prob > 60 else "High")

        cur.execute("""
            INSERT INTO predictions (
                user_id, username, name, age, gender, loan_type, loan_amount, applicant_income,
                credit_history, credit_score, loan_status, approval_probability, risk_level,
                applied_date, last_updated
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (u['id'], u['username'], u['name'], 25 + i, "Male" if i % 2 == 0 else "Female",
              ltype, amt, income, 1, 700 + i*10, status, round(prob, 2), risk,
              (now - timedelta(days=i*2)).strftime("%Y-%m-%d %H:%M:%S"), now.strftime("%Y-%m-%d %H:%M:%S")))

    # 4. Add Payments
    preds = cur.execute("SELECT id, user_id, username, loan_amount FROM predictions WHERE loan_status='Approved'").fetchall()
    for p in preds:
        cur.execute("""
            INSERT INTO payments (user_id, username, prediction_id, month_number, emi_amount, total_paid, payment_method, transaction_id, status, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (p['user_id'], p['username'], p['id'], 1, p['loan_amount']/12, p['loan_amount']/12, "UPI", f"TXN{p['id']}001", "Success", now.strftime("%Y-%m-%d %H:%M:%S")))

    # 5. Add Support Tickets
    categories = ["Technical", "Payment", "Loan Approval", "KYC"]
    for i, u in enumerate(users[:4]):
        tid = f"TKT-{u['id']}{random.randint(100,999)}"
        cur.execute("""
            INSERT INTO support_tickets (ticket_id, user_id, username, category, subject, description, priority, status, created_at)
            VALUES (?,?,?,?,?,?,?,?,?)
        """, (tid, u['id'], u['username'], categories[i], f"Issue with {categories[i]}", "I am facing some problems with the portal. Please help.", "Medium", "Open", now.strftime("%Y-%m-%d %H:%M:%S")))

    conn.commit()
    conn.close()
    print("✅ Dummy data seeded successfully")

if __name__ == "__main__":
    seed()
