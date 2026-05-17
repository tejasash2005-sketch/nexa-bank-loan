"""
NexaBank Pro — User Routes
KYC, Payments, Notifications, Savings, Support Tickets
"""

from flask import Blueprint, request, jsonify, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from datetime import datetime
import hashlib
import random
import json
import time
import os

from backend.db import get_db, row_to_dict, rows_to_list
from backend.config import Config

user_bp = Blueprint("user", __name__, url_prefix="/api/user")

OTP_STORE = {}  # username → {otp, expires}

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in Config.ALLOWED_EXTENSIONS

# ── DOCUMENT UPLOAD ──────────────────────────────────────────────────
@user_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_doc():
    user_id = get_jwt_identity()
    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    doc_type = request.form.get("type", "other") # aadhaar, pan, bank

    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(f"{user_id}_{doc_type}_{int(time.time())}_{file.filename}")
        os.makedirs(Config.UPLOAD_DIR, exist_ok=True)
        save_path = os.path.join(Config.UPLOAD_DIR, filename)
        file.save(save_path)

        db_col = {
            "aadhaar": "aadhaar_file",
            "pan": "pan_file",
            "bank": "bank_file"
        }.get(doc_type, "bank_file")

        with get_db() as conn:
            # Ensure KYC row exists
            exists = conn.execute("SELECT id FROM kyc WHERE user_id=?", (user_id,)).fetchone()
            if not exists:
                from flask_jwt_extended import get_jwt
                username = get_jwt().get("username")
                conn.execute("INSERT INTO kyc (user_id, username, created_at) VALUES (?,?,?)",
                             (user_id, username, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))

            conn.execute(f"UPDATE kyc SET {db_col}=?, kyc_status='Pending' WHERE user_id=?", (filename, user_id))

        return jsonify({"message": f"{doc_type} uploaded successfully", "filename": filename}), 200

    return jsonify({"error": "File type not allowed"}), 400


@user_bp.route("/docs/<filename>")
@jwt_required()
def get_doc(filename):
    # In production, check if user owns the file or is admin
    return send_from_directory(Config.UPLOAD_DIR, filename)

def emi_calc(principal, annual_rate, months):
    r = annual_rate / 12
    if r == 0 or months == 0:
        return round(principal / max(months, 1), 2)
    return round(principal * r * (1 + r) ** months / ((1 + r) ** months - 1), 2)


# ── KYC ──────────────────────────────────────────────────────────────
@user_bp.route("/kyc", methods=["GET"])
@jwt_required()
def get_kyc():
    user_id = get_jwt_identity()
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM kyc WHERE user_id=?", (user_id,)
        ).fetchone()
    return jsonify(row_to_dict(row) or {}), 200


@user_bp.route("/kyc/send-otp", methods=["POST"])
@jwt_required()
def send_otp():
    from flask_jwt_extended import get_jwt
    username = get_jwt().get("username")
    user_id  = get_jwt_identity()

    data     = request.get_json(silent=True) or {}
    phone    = data.get("phone", "").strip()

    if not phone or len(phone) < 10:
        return jsonify({"error": "Valid phone number required"}), 400

    otp = str(random.randint(100000, 999999))
    OTP_STORE[username] = {"otp": otp, "expires": time.time() + 300, "phone": phone}

    # In production, integrate SMS gateway (Twilio/Msg91)
    # For now, return OTP in response for demo
    return jsonify({"message": f"OTP sent to {phone}", "demo_otp": otp}), 200


@user_bp.route("/kyc/verify-otp", methods=["POST"])
@jwt_required()
def verify_otp():
    from flask_jwt_extended import get_jwt
    username = get_jwt().get("username")
    user_id  = get_jwt_identity()

    data     = request.get_json(silent=True) or {}
    otp_in   = str(data.get("otp", "")).strip()

    stored = OTP_STORE.get(username)
    if not stored:
        return jsonify({"error": "No OTP sent. Request OTP first."}), 400
    if time.time() > stored["expires"]:
        return jsonify({"error": "OTP expired. Request again."}), 400
    if otp_in != stored["otp"]:
        return jsonify({"error": "Invalid OTP"}), 400

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id FROM kyc WHERE user_id=?", (user_id,)
        ).fetchone()
        if existing:
            conn.execute(
                "UPDATE kyc SET phone=?, otp_verified=1, created_at=COALESCE(created_at,?) WHERE user_id=?",
                (stored["phone"], now, user_id)
            )
        else:
            conn.execute(
                """INSERT INTO kyc (user_id, username, phone, otp_verified, kyc_status, created_at)
                   VALUES (?,?,?,1,'Pending',?)""",
                (user_id, username, stored["phone"], now)
            )

    del OTP_STORE[username]
    return jsonify({"message": "OTP verified successfully"}), 200


@user_bp.route("/kyc/submit", methods=["POST"])
@jwt_required()
def submit_kyc():
    from flask_jwt_extended import get_jwt
    user_id  = get_jwt_identity()
    username = get_jwt().get("username")

    data     = request.get_json(silent=True) or {}
    account  = data.get("account_number", "")
    ifsc     = data.get("ifsc_code", "")
    bank     = data.get("bank_name", "")

    if not account or not ifsc or not bank:
        return jsonify({"error": "Account number, IFSC and bank name are required"}), 400

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_db() as conn:
        existing = conn.execute(
            "SELECT id,otp_verified FROM kyc WHERE user_id=?", (user_id,)
        ).fetchone()

        if existing:
            conn.execute(
                """UPDATE kyc SET account_number=?, ifsc_code=?, bank_name=?,
                   kyc_status=?, created_at=COALESCE(created_at,?) WHERE user_id=?""",
                (account, ifsc, bank,
                 "Verified" if existing["otp_verified"] else "Pending",
                 now, user_id)
            )
        else:
            conn.execute(
                """INSERT INTO kyc (user_id,username,account_number,ifsc_code,bank_name,kyc_status,created_at)
                   VALUES (?,?,?,?,?,'Pending',?)""",
                (user_id, username, account, ifsc, bank, now)
            )

        kyc = conn.execute("SELECT * FROM kyc WHERE user_id=?", (user_id,)).fetchone()

        if kyc and kyc["otp_verified"]:
            conn.execute(
                "INSERT INTO notifications (user_id,username,message,type,created_at) VALUES (?,?,?,?,?)",
                (user_id, username,
                 "✅ KYC submitted successfully. Verification in progress.", "success", now)
            )

    return jsonify({"message": "KYC submitted", "kyc": row_to_dict(kyc)}), 200


# ── AADHAAR & PAN VERIFICATION ───────────────────────────────────────
@user_bp.route("/kyc/aadhaar", methods=["POST"])
@jwt_required()
def verify_aadhaar():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    aadhaar_no = data.get("aadhaar_number", "").strip()

    if not aadhaar_no or len(aadhaar_no) != 12 or not aadhaar_no.isdigit():
        return jsonify({"error": "Invalid Aadhaar number. Must be 12 digits."}), 400

    # Mock Aadhaar Verification
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    aadhaar_hash = hashlib.sha256(aadhaar_no.encode()).hexdigest()

    with get_db() as conn:
        conn.execute(
            "UPDATE kyc SET aadhaar_hash=?, kyc_status='Pending' WHERE user_id=?",
            (aadhaar_hash, user_id)
        )
        # Also update predictions table if they have one
        conn.execute("UPDATE predictions SET aadhaar=? WHERE user_id=?", (aadhaar_no, user_id))

    return jsonify({
        "message": "Aadhaar number submitted successfully",
        "status": "Verified (Mock)",
        "reference_id": hashlib.md5(aadhaar_no.encode()).hexdigest()[:10].upper()
    }), 200


@user_bp.route("/kyc/pan", methods=["POST"])
@jwt_required()
def verify_pan():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    pan_no = data.get("pan_number", "").strip().upper()

    import re
    if not pan_no or not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]{1}$", pan_no):
        return jsonify({"error": "Invalid PAN format. E.g. ABCDE1234F"}), 400

    # Mock PAN Verification
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pan_hash = hashlib.sha256(pan_no.encode()).hexdigest()

    with get_db() as conn:
        conn.execute(
            "UPDATE kyc SET pan_hash=?, kyc_status='Pending' WHERE user_id=?",
            (pan_hash, user_id)
        )
        # Also update predictions table
        conn.execute("UPDATE predictions SET pan=? WHERE user_id=?", (pan_no, user_id))

    return jsonify({
        "message": "PAN card submitted successfully",
        "status": "Verified (Mock)",
        "reference_id": hashlib.md5(pan_no.encode()).hexdigest()[:10].upper()
    }), 200


# ── PAYMENTS ─────────────────────────────────────────────────────────
@user_bp.route("/payments", methods=["GET"])
@jwt_required()
def get_payments():
    user_id   = get_jwt_identity()
    pred_id   = request.args.get("prediction_id")
    with get_db() as conn:
        if pred_id:
            rows = conn.execute(
                "SELECT * FROM payments WHERE user_id=? AND prediction_id=? ORDER BY month_number",
                (user_id, pred_id)
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM payments WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
                (user_id,)
            ).fetchall()
    return jsonify(rows_to_list(rows)), 200


@user_bp.route("/payments/pay", methods=["POST"])
@jwt_required()
def pay_emi():
    from flask_jwt_extended import get_jwt
    user_id  = get_jwt_identity()
    username = get_jwt().get("username")

    data     = request.get_json(silent=True) or {}
    pred_id  = data.get("prediction_id")
    month    = data.get("month_number")
    method   = data.get("payment_method", "Net Banking")

    if not pred_id or not month:
        return jsonify({"error": "prediction_id and month_number required"}), 400

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    tx_id = "TXN" + hashlib.md5((username + str(time.time())).encode()).hexdigest()[:10].upper()

    with get_db() as conn:
        pred = conn.execute(
            "SELECT * FROM predictions WHERE id=? AND user_id=?", (pred_id, user_id)
        ).fetchone()
        if not pred:
            return jsonify({"error": "Loan not found"}), 404

        # Check already paid
        already = conn.execute(
            "SELECT id FROM payments WHERE prediction_id=? AND month_number=? AND status='Success'",
            (pred_id, month)
        ).fetchone()
        if already:
            return jsonify({"error": "EMI for this month already paid"}), 409

        loan_type = pred["loan_type"]
        if loan_type not in Config.LOANS:
            return jsonify({"error": "Invalid loan type in record"}), 400

        rate, tenure = Config.LOANS[loan_type]
        emi_val      = emi_calc(pred["loan_amount"], rate, tenure)
        r_mo         = rate / 12
        int_p        = pred["loan_amount"] * r_mo  # simplified
        pri_p        = max(emi_val - int_p, 0)

        # Late fee
        late_fee = 0.0  # simplified; real: calculate from due_date

        total = round(emi_val + late_fee, 2)

        conn.execute("""
            INSERT INTO payments (user_id,username,prediction_id,month_number,paid_date,
                principal,interest,emi_amount,late_fee,total_paid,payment_method,transaction_id,status,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (
            user_id, username, pred_id, month,
            now, round(pri_p, 2), round(int_p, 2), emi_val,
            late_fee, total, method, tx_id, "Success", now
        ))

        conn.execute(
            "INSERT INTO notifications (user_id,username,message,type,created_at) VALUES (?,?,?,?,?)",
            (user_id, username,
             f"💳 EMI payment ₹{total:,.0f} for month #{month} successful! Txn: {tx_id}", "success", now)
        )

    return jsonify({
        "message":        "Payment successful",
        "transaction_id": tx_id,
        "emi_amount":     emi_val,
        "late_fee":       late_fee,
        "total_paid":     total,
        "month":          month,
        "method":         method,
        "status":         "Success",
        "paid_date":      now,
    }), 201


# ── NOTIFICATIONS ─────────────────────────────────────────────────────
@user_bp.route("/notifications", methods=["GET"])
@jwt_required()
def get_notifications():
    user_id = get_jwt_identity()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30",
            (user_id,)
        ).fetchall()
        unread = conn.execute(
            "SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=0",
            (user_id,)
        ).fetchone()[0]
    return jsonify({"notifications": rows_to_list(rows), "unread": unread}), 200


@user_bp.route("/notifications/mark-read", methods=["PUT"])
@jwt_required()
def mark_read():
    user_id = get_jwt_identity()
    with get_db() as conn:
        conn.execute(
            "UPDATE notifications SET is_read=1 WHERE user_id=?", (user_id,)
        )
    return jsonify({"message": "Notifications marked as read"}), 200


# ── SAVINGS GOALS ─────────────────────────────────────────────────────
@user_bp.route("/savings", methods=["GET"])
@jwt_required()
def get_savings():
    user_id = get_jwt_identity()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM savings_goals WHERE user_id=? ORDER BY created_at DESC",
            (user_id,)
        ).fetchall()
    return jsonify(rows_to_list(rows)), 200


@user_bp.route("/savings", methods=["POST"])
@jwt_required()
def create_savings():
    from flask_jwt_extended import get_jwt
    user_id  = get_jwt_identity()
    username = get_jwt().get("username")

    data     = request.get_json(silent=True) or {}

    required = ["plan_name", "monthly_amount", "interest_rate"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    from dateutil.relativedelta import relativedelta
    months        = int(data.get("tenure_months", 60))
    maturity_date = (datetime.now() + relativedelta(months=months)).strftime("%Y-%m-%d")

    with get_db() as conn:
        cur = conn.execute("""
            INSERT INTO savings_goals
                (user_id,username,plan_name,monthly_amount,interest_rate,goal_amount,
                 current_amount,start_date,maturity_date,status,created_at)
            VALUES (?,?,?,?,?,?,0,?,?,?,?)
        """, (
            user_id, username,
            data["plan_name"], float(data["monthly_amount"]),
            float(data["interest_rate"]),
            float(data.get("goal_amount", 0)),
            now[:10], maturity_date, "Active", now
        ))
    return jsonify({"message": "Savings goal created", "id": cur.lastrowid}), 201


# ── SUPPORT TICKETS ───────────────────────────────────────────────────
@user_bp.route("/support", methods=["GET"])
@jwt_required()
def get_tickets():
    user_id = get_jwt_identity()
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM support_tickets WHERE user_id=? ORDER BY created_at DESC",
            (user_id,)
        ).fetchall()
    return jsonify(rows_to_list(rows)), 200


@user_bp.route("/support", methods=["POST"])
@jwt_required()
def create_ticket():
    from flask_jwt_extended import get_jwt
    user_id  = get_jwt_identity()
    username = get_jwt().get("username")

    data     = request.get_json(silent=True) or {}
    subject  = data.get("subject", "").strip()
    desc     = data.get("description", "").strip()
    category = data.get("category", "General Inquiry")
    priority = data.get("priority", "Medium")

    if not subject or not desc:
        return jsonify({"error": "Subject and description are required"}), 400

    now       = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    ticket_id = "TKT" + hashlib.md5((username + str(time.time())).encode()).hexdigest()[:8].upper()

    with get_db() as conn:
        conn.execute("""
            INSERT INTO support_tickets
                (ticket_id,user_id,username,category,subject,description,priority,status,created_at,updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)
        """, (
            ticket_id, user_id, username,
            category, subject, desc, priority, "Open", now, now
        ))
        conn.execute(
            "INSERT INTO notifications (user_id,username,message,type,created_at) VALUES (?,?,?,?,?)",
            (user_id, username,
             f"🆘 Support ticket {ticket_id} raised successfully.", "info", now)
        )
    return jsonify({"message": "Ticket created", "ticket_id": ticket_id}), 201
