"""
NexaBank Pro — Admin Routes
All routes require admin role JWT
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
import json
import logging

from backend.db import get_db, row_to_dict, rows_to_list
from backend.config import Config

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")

# Configure logging to help debug 500 errors
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def require_admin(fn):
    """Decorator to enforce admin role"""
    from functools import wraps
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        try:
            claims = get_jwt()
            if claims.get("role") != "admin":
                return jsonify({"error": "Admin access required"}), 403
            return fn(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in admin check: {str(e)}")
            return jsonify({"error": "Admin verification failed"}), 500
    return wrapper


# ── DASHBOARD STATS ───────────────────────────────────────────────────
@admin_bp.route("/stats", methods=["GET"])
@require_admin
def stats():
    try:
        with get_db() as conn:
            # Basic Counts
            total_loans  = conn.execute("SELECT COUNT(*) FROM predictions").fetchone()[0] or 0
            approved     = conn.execute("SELECT COUNT(*) FROM predictions WHERE loan_status='Approved'").fetchone()[0] or 0
            rejected     = conn.execute("SELECT COUNT(*) FROM predictions WHERE loan_status='Rejected'").fetchone()[0] or 0
            disbursed    = conn.execute("SELECT COUNT(*) FROM predictions WHERE loan_status='Disbursed'").fetchone()[0] or 0
            under_review = conn.execute("SELECT COUNT(*) FROM predictions WHERE loan_status='Under Review'").fetchone()[0] or 0
            total_users  = conn.execute("SELECT COUNT(*) FROM users WHERE role='user'").fetchone()[0] or 0

            # Financials
            total_amount = conn.execute("SELECT SUM(loan_amount) FROM predictions").fetchone()[0] or 0
            total_collected = conn.execute("SELECT SUM(total_paid) FROM payments WHERE status='Success'").fetchone()[0] or 0

            # KYC & Support
            kyc_verified = conn.execute("SELECT COUNT(*) FROM kyc WHERE kyc_status='Verified'").fetchone()[0] or 0
            open_tickets = conn.execute("SELECT COUNT(*) FROM support_tickets WHERE status='Open'").fetchone()[0] or 0

            # Aggregations
            by_type = rows_to_list(conn.execute("""
                SELECT COALESCE(loan_type, 'Other') as loan_type, COUNT(*) as count, COALESCE(SUM(loan_amount), 0) as total
                FROM predictions GROUP BY loan_type ORDER BY count DESC
            """).fetchall())

            by_status = rows_to_list(conn.execute("""
                SELECT COALESCE(loan_status, 'Under Review') as loan_status, COUNT(*) as count
                FROM predictions GROUP BY loan_status
            """).fetchall())

            by_risk = rows_to_list(conn.execute("""
                SELECT COALESCE(risk_level, 'Medium') as risk_level, COUNT(*) as count
                FROM predictions GROUP BY risk_level
            """).fetchall())

            trend = rows_to_list(conn.execute("""
                SELECT strftime('%Y-%m', applied_date) as month, COUNT(*) as count
                FROM predictions
                WHERE applied_date IS NOT NULL
                GROUP BY month ORDER BY month DESC LIMIT 12
            """).fetchall())

            # New: Payment method distribution
            by_method = rows_to_list(conn.execute("""
                SELECT COALESCE(payment_method, 'Online') as method, COUNT(*) as count
                FROM payments GROUP BY method
            """).fetchall())

            # New: Top users by volume
            top_users = rows_to_list(conn.execute("""
                SELECT username, SUM(loan_amount) as total
                FROM predictions GROUP BY username ORDER BY total DESC LIMIT 5
            """).fetchall())

        return jsonify({
            "total_loans":     int(total_loans),
            "approved":        int(approved),
            "rejected":        int(rejected),
            "disbursed":       int(disbursed),
            "under_review":    int(under_review),
            "total_users":     int(total_users),
            "total_amount":    float(total_amount),
            "total_collected": float(total_collected),
            "kyc_verified":    int(kyc_verified),
            "open_tickets":    int(open_tickets),
            "by_type":         by_type if by_type else [],
            "by_status":       by_status if by_status else [],
            "by_risk":         by_risk if by_risk else [],
            "monthly_trend":   list(reversed(trend)) if trend else [],
            "by_method":       by_method if by_method else [],
            "top_users":       top_users if top_users else [],
        }), 200
    except Exception as e:
        logger.error(f"Error in /admin/stats: {str(e)}")
        return jsonify({"error": f"Stats error: {str(e)}"}), 500


# ── ALL PREDICTIONS ───────────────────────────────────────────────────
@admin_bp.route("/predictions", methods=["GET"])
@require_admin
def all_predictions():
    try:
        status    = request.args.get("status", "")
        loan_type = request.args.get("loan_type", "")
        search    = request.args.get("search", "")

        query  = """
            SELECT p.*, k.aadhaar_file, k.pan_file, k.bank_file as kyc_bank_file
            FROM predictions p
            LEFT JOIN kyc k ON p.user_id = k.user_id
            WHERE 1=1
        """
        params = []
        if status:    query += " AND p.loan_status=?";   params.append(status)
        if loan_type: query += " AND p.loan_type=?";     params.append(loan_type)
        if search:    query += " AND (p.name LIKE ? OR p.username LIKE ?)"; params += [f"%{search}%", f"%{search}%"]
        query += " ORDER BY p.applied_date DESC LIMIT 200"

        with get_db() as conn:
            rows = conn.execute(query, params).fetchall()
            data = rows_to_list(rows)

        return jsonify(data), 200
    except Exception as e:
        logger.error(f"Error in /admin/predictions: {str(e)}")
        return jsonify({"error": f"Predictions error: {str(e)}"}), 500


# ── UPDATE LOAN STATUS ────────────────────────────────────────────────
@admin_bp.route("/predictions/<int:pred_id>/status", methods=["PUT"])
@require_admin
def update_status(pred_id):
    try:
        admin_id       = get_jwt_identity()
        admin_username = get_jwt().get("username", "admin")

        data   = request.get_json(silent=True) or {}
        status = data.get("status")
        notes  = data.get("notes", "")

        valid = ["Under Review", "Approved", "Rejected", "Disbursed", "Active", "Closed"]
        if status not in valid:
            return jsonify({"error": f"Invalid status: {status}"}), 400

        lifecycle_map = {
            "Under Review": "AI Risk Assessment",
            "Approved":     "Final Approval",
            "Rejected":     "Credit Bureau Check",
            "Disbursed":    "Loan Disbursement",
            "Active":       "Active Repayment",
            "Closed":       "Loan Closed",
        }
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        with get_db() as conn:
            pred = conn.execute("SELECT * FROM predictions WHERE id=?", (pred_id,)).fetchone()
            if not pred:
                return jsonify({"error": "Application not found"}), 404

            update_fields = "loan_status=?, lifecycle_stage=?, last_updated=?"
            params        = [status, lifecycle_map.get(status, ""), now]

            if status == "Disbursed":
                update_fields += ", disbursement_date=?"
                params.append(now[:10])
            if notes:
                update_fields += ", admin_notes=?"
                params.append(notes)

            params.append(pred_id)
            conn.execute(f"UPDATE predictions SET {update_fields} WHERE id=?", params)

            # Notify user
            icons = {"Approved": "🎉", "Rejected": "❌", "Disbursed": "💰", "Active": "✅", "Closed": "🏁"}
            msg = f"{icons.get(status,'📋')} Your {pred['loan_type']} application is now {status}!"
            conn.execute(
                "INSERT INTO notifications (user_id, username, message, type, created_at) VALUES (?,?,?,?,?)",
                (pred["user_id"], pred["username"], msg,
                 "success" if status in ["Approved","Disbursed","Active"] else "error" if status == "Rejected" else "info",
                 now)
            )

            # Audit
            conn.execute(
                "INSERT INTO audit_log (user_id, username, action, details, created_at) VALUES (?,?,?,?,?)",
                (admin_id, admin_username, "STATUS_CHANGE", f"Loan #{pred_id} → {status}", now)
            )

        return jsonify({"message": f"Status updated to {status}"}), 200
    except Exception as e:
        logger.error(f"Error in update_status: {str(e)}")
        return jsonify({"error": str(e)}), 500


# ── ALL USERS ─────────────────────────────────────────────────────────
@admin_bp.route("/users", methods=["GET"])
@require_admin
def all_users():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id,username,name,email,phone,role,lang,is_active,last_login,created_at FROM users ORDER BY created_at DESC"
        ).fetchall()
    return jsonify(rows_to_list(rows)), 200


# ── CREATE ADMIN ──────────────────────────────────────────────────────
@admin_bp.route("/users/create-admin", methods=["POST"])
@require_admin
def create_admin():
    import bcrypt
    data     = request.get_json(silent=True) or {}
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")
    name     = data.get("name", "Admin User")
    email    = data.get("email", f"{username}@nexabank.in")

    if not username or len(username) < 3:
        return jsonify({"error": "Username must be at least 3 chars"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 chars"}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    now     = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        with get_db() as conn:
            existing = conn.execute("SELECT id FROM users WHERE username=?", (username,)).fetchone()
            if existing:
                return jsonify({"error": "Username taken"}), 409
            conn.execute(
                "INSERT INTO users (username,name,email,password_hash,role,lang,created_at) VALUES (?,?,?,?,?,?,?)",
                (username, name, email, pw_hash, "admin", "en", now)
            )
        return jsonify({"message": f"Admin '{username}' created"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── DEACTIVATE USER ───────────────────────────────────────────────────
@admin_bp.route("/users/<int:user_id>/deactivate", methods=["PUT"])
@require_admin
def deactivate_user(user_id):
    with get_db() as conn:
        conn.execute("UPDATE users SET is_active=0 WHERE id=?", (user_id,))
    return jsonify({"message": "User deactivated"}), 200


# ── KYC RECORDS ───────────────────────────────────────────────────────
@admin_bp.route("/kyc", methods=["GET"])
@require_admin
def all_kyc():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM kyc ORDER BY created_at DESC").fetchall()
    return jsonify(rows_to_list(rows)), 200


@admin_bp.route("/kyc/<int:kyc_id>/verify", methods=["PUT"])
@require_admin
def verify_kyc(kyc_id):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_db() as conn:
        kyc = conn.execute("SELECT * FROM kyc WHERE id=?", (kyc_id,)).fetchone()
        if not kyc:
            return jsonify({"error": "KYC not found"}), 404
        conn.execute(
            "UPDATE kyc SET kyc_status='Verified', verified_at=? WHERE id=?",
            (now, kyc_id)
        )
        conn.execute(
            "INSERT INTO notifications (user_id,username,message,type,created_at) VALUES (?,?,?,?,?)",
            (kyc["user_id"], kyc["username"], "✅ Your KYC has been verified!", "success", now)
        )
    return jsonify({"message": "KYC verified"}), 200


# ── PAYMENT RECORDS ───────────────────────────────────────────────────
@admin_bp.route("/payments", methods=["GET"])
@require_admin
def all_payments():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM payments ORDER BY created_at DESC LIMIT 500").fetchall()
    return jsonify(rows_to_list(rows)), 200


# ── SUPPORT TICKETS ───────────────────────────────────────────────────
@admin_bp.route("/tickets", methods=["GET"])
@require_admin
def all_tickets():
    status = request.args.get("status", "")
    query  = "SELECT * FROM support_tickets"
    params = []
    if status:
        query  += " WHERE status=?"
        params  = [status]
    query += " ORDER BY created_at DESC"
    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return jsonify(rows_to_list(rows)), 200


@admin_bp.route("/tickets/<ticket_id>/resolve", methods=["PUT"])
@require_admin
def resolve_ticket(ticket_id):
    data       = request.get_json(silent=True) or {}
    resolution = data.get("resolution", "Resolved by admin")
    now        = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_db() as conn:
        t = conn.execute("SELECT * FROM support_tickets WHERE ticket_id=?", (ticket_id,)).fetchone()
        if not t:
            return jsonify({"error": "Ticket not found"}), 404
        conn.execute(
            "UPDATE support_tickets SET status='Resolved', resolution=?, updated_at=? WHERE ticket_id=?",
            (resolution, now, ticket_id)
        )
        conn.execute(
            "INSERT INTO notifications (user_id,username,message,type,created_at) VALUES (?,?,?,?,?)",
            (t["user_id"], t["username"], f"✅ Your support ticket {ticket_id} has been resolved!", "success", now)
        )
    return jsonify({"message": "Ticket resolved"}), 200


# ── AUDIT LOG ─────────────────────────────────────────────────────────
@admin_bp.route("/audit", methods=["GET"])
@require_admin
def audit_log():
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 200"
        ).fetchall()
    return jsonify(rows_to_list(rows)), 200
