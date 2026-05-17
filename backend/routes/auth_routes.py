"""
NexaBank Pro — Authentication Routes
POST /api/register
POST /api/login
POST /api/logout
POST /api/refresh
GET  /api/me
PUT  /api/me/profile
POST /api/me/change-password
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity, get_jwt
)
import bcrypt
from datetime import datetime
import re

from backend.db import get_db, row_to_dict
from backend.config import Config

auth_bp = Blueprint("auth", __name__, url_prefix="/api")

# JWT blocklist (in-memory; for production use Redis)
TOKEN_BLOCKLIST = set()


def is_valid_email(email):
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email))


def audit(conn, user_id, username, action, details=""):
    conn.execute(
        "INSERT INTO audit_log (user_id, username, action, details, created_at) VALUES (?,?,?,?,?)",
        (user_id, username, action, details, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    )


# ── REGISTER ──────────────────────────────────────────────────────────
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = data.get("username", "").strip().lower()
    name     = data.get("name", "").strip()
    email    = data.get("email", "").strip().lower()
    password = data.get("password", "")
    phone    = data.get("phone", "").strip()

    # Validation
    if not username or len(username) < 3:
        return jsonify({"error": "Username must be at least 3 characters"}), 400
    if not re.match(r"^[a-z0-9_]+$", username):
        return jsonify({"error": "Username: letters, digits and _ only"}), 400
    if not name or len(name) < 2:
        return jsonify({"error": "Full name is required"}), 400
    if not email or not is_valid_email(email):
        return jsonify({"error": "Valid email is required"}), 400
    if not password or len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    now     = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    try:
        with get_db() as conn:
            # Check uniqueness
            existing = conn.execute(
                "SELECT id FROM users WHERE username=? OR email=?", (username, email)
            ).fetchone()
            if existing:
                return jsonify({"error": "Username or email already taken"}), 409

            cur = conn.execute(
                """INSERT INTO users (username, name, email, phone, password_hash, role, lang, created_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (username, name, email, phone, pw_hash, "user", "en", now)
            )
            uid = cur.lastrowid
            audit(conn, uid, username, "REGISTER", f"New user registered: {email}")

            # Welcome notification
            conn.execute(
                """INSERT INTO notifications (user_id, username, message, type, created_at)
                   VALUES (?,?,?,?,?)""",
                (uid, username, "🎉 Welcome to NexaBank Pro! Your account is ready.", "success", now)
            )

        identity = str(uid)
        claims   = {"username": username, "role": "user"}
        access_token  = create_access_token(identity=identity, additional_claims=claims)
        refresh_token = create_refresh_token(identity=identity, additional_claims=claims)

        return jsonify({
            "message": "Account created successfully",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": uid, "username": username, "name": name,
                "email": email, "role": "user"
            }
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── LOGIN ─────────────────────────────────────────────────────────────
@auth_bp.route("/login", methods=["POST"])
def login():
    data     = request.get_json(silent=True) or {}
    username = data.get("username", "").strip().lower()
    password = data.get("password", "")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    try:
        with get_db() as conn:
            user = conn.execute(
                "SELECT * FROM users WHERE username=? AND is_active=1", (username,)
            ).fetchone()

            if not user:
                return jsonify({"error": "Invalid credentials"}), 401

            if not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
                return jsonify({"error": "Invalid credentials"}), 401

            # Update last login
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            conn.execute(
                "UPDATE users SET last_login=? WHERE id=?", (now, user["id"])
            )
            audit(conn, user["id"], username, "LOGIN")

        identity = str(user["id"])
        claims   = {"username": username, "role": user["role"]}
        access_token  = create_access_token(identity=identity, additional_claims=claims)
        refresh_token = create_refresh_token(identity=identity, additional_claims=claims)

        # DEBUG: Print JTI
        from flask_jwt_extended import decode_token
        jti = decode_token(access_token)["jti"]
        print(f"DEBUG: [Login Success] User: {username}, JTI: {jti}")

        return jsonify({
            "access_token":  access_token,
            "refresh_token": refresh_token,
            "user": {
                "id":       user["id"],
                "username": user["username"],
                "name":     user["name"],
                "email":    user["email"],
                "role":     user["role"],
                "lang":     user["lang"],
                "phone":    user["phone"],
            }
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── REFRESH ───────────────────────────────────────────────────────────
@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    identity      = get_jwt_identity()
    access_token  = create_access_token(identity=identity)
    return jsonify({"access_token": access_token}), 200


# ── LOGOUT ────────────────────────────────────────────────────────────
@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    jti = get_jwt()["jti"]
    TOKEN_BLOCKLIST.add(jti)
    return jsonify({"message": "Logged out successfully"}), 200


# ── GET CURRENT USER ──────────────────────────────────────────────────
@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_me():
    user_id = get_jwt_identity()
    with get_db() as conn:
        user = conn.execute(
            "SELECT id,username,name,email,phone,role,lang,last_login,created_at FROM users WHERE id=?",
            (user_id,)
        ).fetchone()
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(row_to_dict(user)), 200


# ── UPDATE PROFILE ────────────────────────────────────────────────────
@auth_bp.route("/me/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    data     = request.get_json(silent=True) or {}
    name     = data.get("name", "").strip()
    phone    = data.get("phone", "").strip()
    lang     = data.get("lang", "en")

    if name and len(name) < 2:
        return jsonify({"error": "Name too short"}), 400

    with get_db() as conn:
        conn.execute(
            "UPDATE users SET name=COALESCE(NULLIF(?,0),name), phone=?, lang=? WHERE id=?",
            (name or None, phone, lang, user_id)
        )
        conn.execute(
            "UPDATE users SET name=? WHERE id=? AND ? != ''",
            (name, user_id, name)
        )
        if name:
            conn.execute("UPDATE users SET name=? WHERE id=?", (name, user_id))
        conn.execute("UPDATE users SET phone=?, lang=? WHERE id=?", (phone, lang, user_id))
        user = conn.execute(
            "SELECT id,username,name,email,phone,role,lang FROM users WHERE id=?",
            (user_id,)
        ).fetchone()
    return jsonify({"message": "Profile updated", "user": row_to_dict(user)}), 200


# ── CHANGE PASSWORD ───────────────────────────────────────────────────
@auth_bp.route("/me/change-password", methods=["POST"])
@jwt_required()
def change_password():
    user_id      = get_jwt_identity()
    from flask_jwt_extended import get_jwt
    username     = get_jwt().get("username", "user")

    data         = request.get_json(silent=True) or {}
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")

    if not old_password or not new_password:
        return jsonify({"error": "Both old and new passwords required"}), 400
    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
        if not bcrypt.checkpw(old_password.encode(), user["password_hash"].encode()):
            return jsonify({"error": "Current password is incorrect"}), 401
        new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
        conn.execute("UPDATE users SET password_hash=? WHERE id=?", (new_hash, user_id))
        audit(conn, user_id, username, "CHANGE_PASSWORD")

    return jsonify({"message": "Password changed successfully"}), 200
