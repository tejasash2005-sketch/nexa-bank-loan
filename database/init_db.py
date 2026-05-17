"""
NexaBank Pro — Database Initialization
Creates all tables in SQLite (or MySQL if configured)
"""

import sqlite3
import os
import bcrypt
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "nexabank.db")


def get_db():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


def init_db():
    conn = get_db()
    cur = conn.cursor()

    # ── USERS TABLE ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT    UNIQUE NOT NULL,
            name          TEXT    NOT NULL DEFAULT '',
            email         TEXT    UNIQUE NOT NULL DEFAULT '',
            phone         TEXT    DEFAULT '',
            password_hash TEXT    NOT NULL,
            role          TEXT    NOT NULL DEFAULT 'user',
            lang          TEXT    NOT NULL DEFAULT 'en',
            avatar        TEXT    DEFAULT '',
            is_active     INTEGER DEFAULT 1,
            last_login    TEXT    DEFAULT '',
            created_at    TEXT    NOT NULL
        )
    """)

    # ── PREDICTIONS / LOAN APPLICATIONS TABLE ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS predictions (
            id                  INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id             INTEGER NOT NULL REFERENCES users(id),
            username            TEXT    NOT NULL,
            name                TEXT,
            age                 INTEGER,
            gender              TEXT,
            nationality         TEXT,
            marital_status      TEXT,
            aadhaar             TEXT,
            pan                 TEXT,
            loan_type           TEXT,
            loan_amount         REAL,
            applicant_income    REAL,
            coapplicant_income  REAL,
            credit_history      INTEGER,
            credit_score        INTEGER,
            employment_type     TEXT,
            purpose             TEXT,
            annual_income       REAL,
            existing_emi        REAL,
            collateral          TEXT,
            repayment_mode      TEXT,
            insurance_opted     TEXT,
            guarantor           TEXT,
            co_borrower         TEXT,
            moratorium_period   INTEGER DEFAULT 0,
            property_value      REAL    DEFAULT 0,
            processing_fee      REAL    DEFAULT 0,
            pre_closure_penalty REAL    DEFAULT 2.0,
            emi                 REAL,
            loan_status         TEXT    DEFAULT 'Under Review',
            lifecycle_stage     TEXT    DEFAULT 'Application Submitted',
            approval_probability REAL,
            risk_level          TEXT,
            fraud_flag          INTEGER DEFAULT 0,
            explainability      TEXT,
            emi_day             INTEGER DEFAULT 5,
            disbursement_date   TEXT,
            account_number      TEXT,
            bank_name           TEXT,
            ifsc_code           TEXT,
            credit_file         TEXT,
            bank_file           TEXT,
            input_features      TEXT,
            result              TEXT,
            applied_date        TEXT,
            last_updated        TEXT,
            admin_notes         TEXT    DEFAULT ''
        )
    """)

    # ── EMI PAYMENTS TABLE ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS payments (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL REFERENCES users(id),
            username        TEXT    NOT NULL,
            prediction_id   INTEGER NOT NULL REFERENCES predictions(id),
            month_number    INTEGER,
            due_date        TEXT,
            paid_date       TEXT,
            principal       REAL,
            interest        REAL,
            emi_amount      REAL,
            late_fee        REAL    DEFAULT 0,
            total_paid      REAL,
            payment_method  TEXT,
            transaction_id  TEXT    UNIQUE,
            status          TEXT    DEFAULT 'Pending',
            created_at      TEXT
        )
    """)

    # ── KYC TABLE ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS kyc (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL REFERENCES users(id),
            username        TEXT    UNIQUE NOT NULL,
            phone           TEXT,
            otp_verified    INTEGER DEFAULT 0,
            selfie_uploaded INTEGER DEFAULT 0,
            account_number  TEXT,
            ifsc_code       TEXT,
            bank_name       TEXT,
            kyc_status      TEXT    DEFAULT 'Pending',
            verified_at     TEXT,
            aadhaar_hash    TEXT,
            pan_hash        TEXT,
            aadhaar_file    TEXT    DEFAULT '',
            pan_file        TEXT    DEFAULT '',
            bank_file       TEXT    DEFAULT '',
            created_at      TEXT
        )
    """)

    # ── NOTIFICATIONS TABLE ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER NOT NULL REFERENCES users(id),
            username    TEXT    NOT NULL,
            message     TEXT    NOT NULL,
            type        TEXT    DEFAULT 'info',
            is_read     INTEGER DEFAULT 0,
            created_at  TEXT    NOT NULL
        )
    """)

    # ── SUPPORT TICKETS TABLE ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS support_tickets (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ticket_id   TEXT    UNIQUE NOT NULL,
            user_id     INTEGER NOT NULL REFERENCES users(id),
            username    TEXT    NOT NULL,
            category    TEXT,
            subject     TEXT,
            description TEXT,
            priority    TEXT    DEFAULT 'Medium',
            status      TEXT    DEFAULT 'Open',
            resolution  TEXT    DEFAULT '',
            created_at  TEXT,
            updated_at  TEXT
        )
    """)

    # ── SAVINGS GOALS TABLE ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS savings_goals (
            id              INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id         INTEGER NOT NULL REFERENCES users(id),
            username        TEXT    NOT NULL,
            plan_name       TEXT,
            monthly_amount  REAL,
            interest_rate   REAL,
            goal_amount     REAL,
            current_amount  REAL    DEFAULT 0,
            start_date      TEXT,
            maturity_date   TEXT,
            status          TEXT    DEFAULT 'Active',
            created_at      TEXT
        )
    """)

    # ── AUDIT LOG TABLE ──
    cur.execute("""
        CREATE TABLE IF NOT EXISTS audit_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id     INTEGER,
            username    TEXT,
            action      TEXT,
            details     TEXT,
            ip_address  TEXT    DEFAULT '',
            created_at  TEXT
        )
    """)

    # ── DEFAULT ADMIN & USER ──
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    admin_hash = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
    user_hash  = bcrypt.hashpw(b"user123",  bcrypt.gensalt()).decode()

    cur.execute("""
        INSERT OR IGNORE INTO users (username, name, email, password_hash, role, lang, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("admin", "Administrator", "admin@nexabank.in", admin_hash, "admin", "en", now))

    cur.execute("""
        INSERT OR IGNORE INTO users (username, name, email, password_hash, role, lang, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, ("user", "Demo User", "user@nexabank.in", user_hash, "user", "en", now))

    conn.commit()
    conn.close()
    print(f"✅ Database initialized at: {DB_PATH}")


if __name__ == "__main__":
    init_db()
