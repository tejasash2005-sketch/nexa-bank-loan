"""
NexaBank Pro — Flask Backend Application
Full-Stack REST API with JWT Authentication
"""

import os
import sys
from datetime import datetime

# Allow running as `python app.py` from project root
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, jsonify, send_from_directory, request
from flask_jwt_extended import JWTManager
from flask_cors import CORS

from backend.config import Config
from backend.routes.auth_routes import auth_bp, TOKEN_BLOCKLIST
from backend.routes.predict_routes import predict_bp
from backend.routes.admin_routes import admin_bp
from backend.routes.user_routes import user_bp
from database.init_db import init_db


def create_app():
    app = Flask(__name__, static_folder="frontend", static_url_path="")
    app.config.from_object(Config)

    # ── CORS ──
    CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True,
         allow_headers=["Content-Type", "Authorization"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    # ── JWT ──
    jwt = JWTManager(app)

    @jwt.token_in_blocklist_loader
    def check_blocklist(jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        is_blocked = jti in TOKEN_BLOCKLIST
        print(f"DEBUG: [Blocklist Check] JTI: {jti}, Blocked: {is_blocked}")
        return is_blocked

    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token expired", "code": "TOKEN_EXPIRED"}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({"error": "Invalid token", "code": "INVALID_TOKEN"}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({"error": "Authorization required", "code": "NO_TOKEN"}), 401

    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({"error": "Token revoked", "code": "TOKEN_REVOKED"}), 401

    @app.before_request
    def debug_jwt():
        if request.path.startswith("/api/") and not any(x in request.path for x in ["/login", "/register", "/health", "/loans/types"]):
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            print(f"DEBUG: [Server Time: {now}] Request: {request.method} {request.path}")
            auth = request.headers.get("Authorization")
            if not auth:
                print(f"DEBUG: [Missing Header] {request.method} {request.path}")
            elif not auth.startswith("Bearer "):
                print(f"DEBUG: [Invalid Format] {request.method} {request.path} -> {auth[:15]}...")
            else:
                # We have a bearer token, let's see if JWT manager can load it
                print(f"DEBUG: [Header Present] {request.method} {request.path} -> Bearer {auth[7:15]}...")

    # ── BLUEPRINTS ──
    app.register_blueprint(auth_bp)
    app.register_blueprint(predict_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(user_bp)

    # ── HEALTH CHECK ──
    @app.route("/api/health")
    def health():
        return jsonify({
            "status":  "OK",
            "service": "NexaBank Pro API",
            "version": "2.0.0"
        }), 200

    # ── SERVE FRONTEND ──
    @app.route("/")
    def index():
        return send_from_directory("frontend", "index.html")

    @app.route("/<path:path>")
    def serve_frontend(path):
        file_path = os.path.join("frontend", path)
        if os.path.exists(file_path):
            return send_from_directory("frontend", path)
        # SPA fallback
        return send_from_directory("frontend", "index.html")

    # ── ERROR HANDLERS ──
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"error": "Method not allowed"}), 405

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({"error": "Internal server error"}), 500

    return app


if __name__ == "__main__":
    # Initialize DB first
    print("🏦 NexaBank Pro — Starting up …")
    init_db()

    # Train model if not exists
    model_dir = Config.MODEL_DIR
    if not os.path.exists(os.path.join(model_dir, "rf_model.pkl")):
        print("🤖 Training ML model (first-time setup) …")
        try:
            sys.path.insert(0, model_dir)
            from model.train_model import train
            train()
        except Exception as e:
            print(f"⚠️  Model training skipped: {e}")

    os.makedirs(Config.UPLOAD_DIR, exist_ok=True)

    app = create_app()
    print(f"🚀 Server running at http://localhost:{Config.PORT}")
    print(f"📖 API Base URL: http://localhost:{Config.PORT}/api")
    app.run(host=Config.HOST, port=Config.PORT, debug=Config.DEBUG)
