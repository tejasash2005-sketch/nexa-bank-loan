"""
NexaBank Pro — Prediction / Loan Routes
POST /api/predict          — Submit new loan application (protected)
GET  /api/predictions      — Get user's applications (protected)
GET  /api/predictions/<id> — Get single application
GET  /api/loans/types      — Get loan types (public)
GET  /api/loans/emi        — Calculate EMI (public)
GET  /api/loans/eligibility — Eligibility check (protected)
POST /api/loans/preclosure — Pre-closure calculation
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import numpy as np
import pickle
import os
import json
import hashlib
import random
from datetime import datetime
from sklearn.ensemble import IsolationForest

from backend.db import get_db, row_to_dict, rows_to_list
from backend.config import Config

predict_bp = Blueprint("predict", __name__, url_prefix="/api")

# ── LOAD MODEL ────────────────────────────────────────────────────────
_model  = None
_scaler = None

def load_model():
    global _model, _scaler
    if _model is not None:
        return _model, _scaler
    model_dir = Config.MODEL_DIR
    try:
        with open(os.path.join(model_dir, "rf_model.pkl"), "rb") as f:
            _model  = pickle.load(f)
        with open(os.path.join(model_dir, "scaler.pkl"), "rb") as f:
            _scaler = pickle.load(f)
        print("✅ ML model loaded")
    except Exception as e:
        print(f"⚠️  Model not found ({e}). Using rule-based fallback.")
        _model  = None
        _scaler = None
    return _model, _scaler


def build_features(app_income, coapp_income, loan_amt, credit_hist, age,
                   marital_flag=1, gender_flag=1):
    ti = app_income + coapp_income
    return [
        app_income, coapp_income, loan_amt, credit_hist, ti,
        loan_amt / max(ti, 1),
        float(np.log1p(app_income)),
        float(np.log1p(coapp_income)),
        float(np.log1p(ti)),
        loan_amt / max(coapp_income, 1),
        loan_amt / max(app_income * 12, 1),
        credit_hist * app_income,
        float(app_income ** 2),
        float(loan_amt ** 2),
        app_income / max(ti, 1),
        float(np.log1p(loan_amt)) * credit_hist,
        1 if loan_amt > 500000 else 0,
        1 if app_income > 100000 else 0,
        1 if coapp_income > 0 else 0,
        float(np.log1p(loan_amt)) / max(float(np.log1p(app_income)), 0.001),
        float(np.sqrt(app_income)),
        float(np.sqrt(max(coapp_income, 0))),
        app_income * loan_amt / 1e8,
        coapp_income * loan_amt / 1e8,
        marital_flag, gender_flag, age, 1, 1
    ]


def emi_calc(principal, annual_rate, months):
    r = annual_rate / 12
    if r == 0 or months == 0:
        return round(principal / max(months, 1), 2)
    return round(principal * r * (1 + r) ** months / ((1 + r) ** months - 1), 2)


def rule_based_predict(feats_list, app_income, loan_amt, credit_hist):
    """Fallback when model pkl not available"""
    prob = 0.3
    if credit_hist == 1: prob += 0.35
    if loan_amt / max(app_income * 12, 1) < 0.5: prob += 0.2
    if app_income > 60000: prob += 0.1
    return min(prob, 0.97)


# ── LOAN TYPES & DETAILS ─────────────────────────────────────────────
@predict_bp.route("/loans/types", methods=["GET"])
def loan_types():
    result = []
    for name, (rate, tenure) in Config.LOANS.items():
        result.append({
            "name":        name,
            "icon":        Config.LOAN_ICONS.get(name, "💰"),
            "description": Config.LOAN_DESCRIPTIONS.get(name, ""),
            "rate":        rate,
            "rate_pct":    f"{rate*100:.2f}%",
            "tenure_months": tenure,
            "tenure_years":  tenure // 12,
        })
    return jsonify(result), 200


@predict_bp.route("/loans/details", methods=["GET"])
def loan_details():
    """Returns required documents and details for all loan types"""
    details = {
        "Personal Loan": {
            "required_documents": ["3 Months Salary Slip", "Bank Statement (6 months)", "Address Proof", "Identity Proof"],
            "eligibility": "Min Salary ₹25,000, Age 21-60",
            "processing_time": "24-48 Hours"
        },
        "Home Loan": {
            "required_documents": ["Property Documents", "Agreement to Sell", "NOC from Builder", "6 Months Salary Slip"],
            "eligibility": "Stable Income, Good Credit Score (750+)",
            "processing_time": "7-15 Days"
        },
        "Car Loan": {
            "required_documents": ["Proforma Invoice", "Income Proof", "KYC Documents"],
            "eligibility": "Min Income ₹3 Lakhs p.a.",
            "processing_time": "2-3 Days"
        },
        "Education Loan": {
            "required_documents": ["Admission Letter", "Fee Structure", "Academic Records", "Co-applicant KYC"],
            "eligibility": "Admission in recognized institute",
            "processing_time": "5-7 Days"
        },
        "General": {
            "required_documents": ["Aadhaar Card", "PAN Card", "2 Passport Size Photos", "Bank Passbook"],
            "notes": "Standard KYC is mandatory for all loan types."
        }
    }
    return jsonify(details), 200


# ── EMI CALCULATOR ────────────────────────────────────────────────────
@predict_bp.route("/loans/emi", methods=["GET"])
def calc_emi():
    try:
        principal = float(request.args.get("principal", 0))
        rate      = float(request.args.get("rate", 0))
        months    = int(request.args.get("months", 12))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid parameters"}), 400

    if principal <= 0 or rate <= 0 or months <= 0:
        return jsonify({"error": "All parameters must be positive"}), 400

    annual_rate = rate / 100
    emi         = emi_calc(principal, annual_rate, months)
    r_mo        = annual_rate / 12
    total_paid  = emi * months
    total_int   = total_paid - principal

    schedule = []
    bal = principal
    for m in range(1, months + 1):
        int_p = bal * r_mo
        pri_p = max(emi - int_p, 0)
        bal   = max(bal - pri_p, 0)
        schedule.append({
            "month":     m,
            "principal": round(pri_p, 2),
            "interest":  round(int_p, 2),
            "balance":   round(bal, 2),
        })

    return jsonify({
        "emi":           emi,
        "total_paid":    round(total_paid, 2),
        "total_interest": round(total_int, 2),
        "principal":     principal,
        "schedule":      schedule[:24],  # first 24 months
    }), 200


# ── ELIGIBILITY ───────────────────────────────────────────────────────
@predict_bp.route("/loans/eligibility", methods=["GET"])
@jwt_required()
def eligibility():
    try:
        income       = float(request.args.get("income", 0))
        existing_emi = float(request.args.get("existing_emi", 0))
        cibil        = int(request.args.get("cibil", 700))
        age          = int(request.args.get("age", 30))
        tenure_yrs   = int(request.args.get("tenure", 10))
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid parameters"}), 400

    foir          = 0.50
    available_inc = income - existing_emi
    max_emi       = available_inc * foir
    score_factor  = min(1.0, max(0, (cibil - 300) / 600))
    age_factor    = min(1.0, (65 - age) / 30) if age < 65 else 0.2

    results = []
    for lname, (rate, _) in Config.LOANS.items():
        ten = tenure_yrs * 12
        r_mo = rate / 12
        max_loan = 0
        if r_mo > 0:
            max_loan = int(max_emi * ((1+r_mo)**ten - 1) / (r_mo*(1+r_mo)**ten) * score_factor * age_factor)
        results.append({
            "loan_type":  lname,
            "icon":       Config.LOAN_ICONS.get(lname, "💰"),
            "max_amount": max_loan,
            "rate_pct":   f"{rate*100:.1f}%",
            "eligible":   cibil >= 650 and available_inc > 0,
        })

    return jsonify({
        "max_emi":        round(max(0, max_emi), 2),
        "score_factor":   round(score_factor * 100),
        "eligible":       cibil >= 650,
        "cibil":          cibil,
        "available_income": round(available_inc, 2),
        "results":        results,
    }), 200


# ── PREDICT / APPLY FOR LOAN ──────────────────────────────────────────
@predict_bp.route("/predict", methods=["POST"])
@jwt_required()
def predict():
    user_id = get_jwt_identity()
    from flask_jwt_extended import get_jwt
    username = get_jwt().get("username")

    data     = request.get_json(silent=True) or {}

    # Required fields
    required = ["name", "loan_type", "loan_amount", "applicant_income",
                "credit_history", "age", "gender", "marital_status"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        app_income   = float(data["applicant_income"])
        coapp_income = float(data.get("coapplicant_income", 0))
        loan_amt     = float(data["loan_amount"])
        credit_hist  = int(data["credit_history"])
        age          = int(data["age"])
        gender       = data["gender"]
        marital      = data["marital_status"]
        loan_type    = data["loan_type"]

        if loan_type not in Config.LOANS:
            return jsonify({"error": "Invalid loan type"}), 400
        if loan_amt <= 0 or app_income <= 0:
            return jsonify({"error": "Loan amount and income must be positive"}), 400

        annual_rate, tenure_months = Config.LOANS[loan_type]
        emi = emi_calc(loan_amt, annual_rate, tenure_months)

        # Feature engineering
        mar_flag = 1 if marital.lower() in ["married", "yes"] else 0
        gen_flag = 1 if gender.lower() in ["male", "m"] else 0
        feats    = build_features(app_income, coapp_income, loan_amt, credit_hist, age, mar_flag, gen_flag)

        # Predict
        try:
            model, scaler = load_model()
            if model is not None and scaler is not None:
                X        = scaler.transform([feats])
                prob     = float(model.predict_proba(X)[0][1]) * 100
                decision = int(model.predict(X)[0])
            else:
                prob     = rule_based_predict(feats, app_income, loan_amt, credit_hist) * 100
                decision = 1 if prob > 50 else 0
        except Exception as prediction_error:
            print(f"⚠️ Prediction error: {prediction_error}")
            prob     = rule_based_predict(feats, app_income, loan_amt, credit_hist) * 100
            decision = 1 if prob > 50 else 0

        # Anomaly / Fraud detection (Disabled on-the-fly fit to prevent crash)
        # In a real app, use a pre-trained IsolationForest model
        fraud  = 0
        if loan_amt > app_income * 100: fraud = 1 # Simple heuristic

        # Risk level
        dti = loan_amt / max(app_income * 12, 1)
        if prob >= 70 and credit_hist == 1 and dti < 0.4:
            risk = "Low"
        elif prob >= 40:
            risk = "Medium"
        else:
            risk = "High"

        # Credit score (estimated)
        credit_score = min(900, max(300, int(300 + credit_hist * 400 + prob * 2)))

        # Explainability
        explain_factors = []
        if credit_hist == 1: explain_factors.append("✅ Good credit history")
        else: explain_factors.append("❌ No credit history")
        if dti < 0.3: explain_factors.append("✅ Low Debt-to-Income ratio")
        elif dti > 0.6: explain_factors.append("⚠️ High DTI ratio")
        if app_income > 60000: explain_factors.append("✅ Strong income")
        if coapp_income > 0: explain_factors.append("✅ Co-applicant income")
        if loan_amt > 5000000: explain_factors.append("⚠️ High loan amount")

        # Lifecycle / Status
        if prob >= 75:
            loan_status = "Under Review"
            lifecycle   = "AI Risk Assessment"
        elif prob >= 50:
            loan_status = "Under Review"
            lifecycle   = "Document Verification"
        else:
            loan_status = "Under Review"
            lifecycle   = "Credit Bureau Check"

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        tx_id = "NB" + hashlib.md5((username + str(datetime.now().timestamp())).encode()).hexdigest()[:10].upper()

        input_data = {k: v for k, v in data.items()}
        result_data = {
            "prediction":         "Approved" if decision == 1 else "Rejected",
            "approval_probability": round(prob, 2),
            "risk_level":         risk,
            "emi":                emi,
            "credit_score":       credit_score,
        }

        with get_db() as conn:
            try:
                cur = conn.execute("""
                    INSERT INTO predictions (
                        user_id, username, name, age, gender, nationality, marital_status,
                        aadhaar, pan, loan_type, loan_amount, applicant_income, coapplicant_income,
                        credit_history, credit_score, employment_type, purpose, annual_income,
                        existing_emi, collateral, repayment_mode, insurance_opted, guarantor,
                        co_borrower, moratorium_period, property_value, processing_fee,
                        pre_closure_penalty, emi, loan_status, lifecycle_stage,
                        approval_probability, risk_level, fraud_flag, explainability,
                        emi_day, account_number, bank_name, ifsc_code,
                        input_features, result, applied_date, last_updated
                    ) VALUES (
                        ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?
                    )""", (
                    user_id, username,
                    data.get("name", "User"), age, gender, data.get("nationality", "Indian"),
                    marital, data.get("aadhaar", ""), data.get("pan", ""),
                    loan_type, loan_amt, app_income, coapp_income,
                    credit_hist, credit_score, data.get("employment_type", "Salaried"),
                    data.get("purpose", "General"), data.get("annual_income", app_income * 12),
                    data.get("existing_emi", 0), data.get("collateral", "None"),
                    data.get("repayment_mode", "Auto-Debit"),
                    data.get("insurance_opted", "No"),
                    data.get("guarantor", "None"), data.get("co_borrower", "None"),
                    data.get("moratorium_period", 0),
                    data.get("property_value", 0), round(loan_amt * 0.01, 2),
                    2.0, emi, loan_status, lifecycle,
                    round(prob, 2), risk, fraud,
                    " | ".join(explain_factors), int(data.get("emi_day", 5)),
                    data.get("account_number", ""), data.get("bank_name", ""),
                    data.get("ifsc_code", ""),
                    json.dumps(input_data), json.dumps(result_data),
                    now, now
                ))
                pred_id = cur.lastrowid
            except Exception as db_err:
                print(f"❌ Database Insert Error: {db_err}")
                return jsonify({"error": "Database error while saving application"}), 500

            # Notification
            try:
                msg = f"🎯 Loan application #{pred_id} submitted for {loan_type} of ₹{loan_amt:,.0f}"
                conn.execute(
                    "INSERT INTO notifications (user_id, username, message, type, created_at) VALUES (?,?,?,?,?)",
                    (user_id, username, msg, "info", now)
                )
            except: pass # Don't crash if notification fails

        return jsonify({
            "id":                   pred_id,
            "prediction":           "Approved" if decision == 1 else "Rejected",
            "approval_probability": round(prob, 2),
            "risk_level":           risk,
            "emi":                  emi,
            "credit_score":         credit_score,
            "fraud_flag":           fraud,
            "explainability":       explain_factors,
            "loan_status":          loan_status,
            "lifecycle_stage":      lifecycle,
            "transaction_id":       tx_id,
            "loan_type":            loan_type,
            "loan_amount":          loan_amt,
            "annual_rate_pct":      annual_rate * 100,
            "tenure_months":        tenure_months,
            "annual_rate":          annual_rate,
            "message":              "Application submitted successfully"
        }), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── GET MY PREDICTIONS ────────────────────────────────────────────────
@predict_bp.route("/predictions", methods=["GET"])
@jwt_required()
def get_predictions():
    user_id = get_jwt_identity()
    from flask_jwt_extended import get_jwt
    role = get_jwt().get("role")

    with get_db() as conn:
        if role == "admin":
            rows = conn.execute(
                "SELECT * FROM predictions ORDER BY applied_date DESC"
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM predictions WHERE user_id=? ORDER BY applied_date DESC",
                (user_id,)
            ).fetchall()
    return jsonify(rows_to_list(rows)), 200


# ── GET SINGLE PREDICTION ─────────────────────────────────────────────
@predict_bp.route("/predictions/<int:pred_id>", methods=["GET"])
@jwt_required()
def get_prediction(pred_id):
    user_id = get_jwt_identity()
    from flask_jwt_extended import get_jwt
    role = get_jwt().get("role")

    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM predictions WHERE id=?", (pred_id,)
        ).fetchone()
    if not row:
        return jsonify({"error": "Not found"}), 404
    pred = row_to_dict(row)
    if role != "admin" and str(pred["user_id"]) != str(user_id):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(pred), 200


# ── PRE-CLOSURE CALCULATOR ────────────────────────────────────────────
@predict_bp.route("/loans/preclosure", methods=["POST"])
@jwt_required()
def preclosure():
    data = request.get_json(silent=True) or {}
    try:
        principal  = float(data.get("principal", 0))
        rate       = float(data.get("rate", 0)) / 100
        months     = int(data.get("months", 12))
        paid       = int(data.get("paid", 0))
        penalty_pct = float(data.get("penalty_pct", 2.0)) / 100
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid parameters"}), 400

    emi = emi_calc(principal, rate, months)
    r_mo = rate / 12
    bal  = principal
    for _ in range(paid):
        ip  = bal * r_mo
        pp  = emi - ip
        bal = max(bal - pp, 0)

    outstanding   = bal
    penalty_amt   = outstanding * penalty_pct
    total_pre     = outstanding + penalty_amt
    remain        = months - paid
    future_total  = emi * remain
    interest_saved = future_total - outstanding
    net_saving    = max(0, interest_saved - penalty_amt)

    return jsonify({
        "emi":             emi,
        "outstanding":     round(outstanding, 2),
        "penalty_amount":  round(penalty_amt, 2),
        "total_preclosure": round(total_pre, 2),
        "remaining_emis":  remain,
        "future_total":    round(future_total, 2),
        "interest_saved":  round(interest_saved, 2),
        "net_saving":      round(net_saving, 2),
        "recommend_preclosure": net_saving > 0,
    }), 200
