import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "nexabank.db")

def fix():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    # Check if columns exist in kyc
    cur.execute("PRAGMA table_info(kyc)")
    cols = [c[1] for c in cur.fetchall()]

    missing = ["aadhaar_file", "pan_file", "bank_file"]
    for m in missing:
        if m not in cols:
            print(f"Adding column {m} to kyc table...")
            try:
                cur.execute(f"ALTER TABLE kyc ADD COLUMN {m} TEXT DEFAULT ''")
            except Exception as e:
                print(f"Error adding {m}: {e}")

    conn.commit()
    conn.close()
    print("✅ Database columns checked/fixed.")

if __name__ == "__main__":
    fix()
