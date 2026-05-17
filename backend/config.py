"""
NexaBank Pro — Configuration
"""
import os
from datetime import timedelta

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)

class Config:
    SECRET_KEY          = os.environ.get("SECRET_KEY", "nexabank-secret-jwt-key-2025-ultra-secure-12345")
    JWT_SECRET_KEY      = os.environ.get("JWT_SECRET_KEY", "nexabank-jwt-secret-2025-ultra-secure-abc123xyz")
    JWT_ACCESS_TOKEN_EXPIRES  = timedelta(hours=8)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    DATABASE_PATH = os.path.join(ROOT_DIR, "database", "nexabank.db")
    MODEL_DIR     = os.path.join(ROOT_DIR, "model")
    UPLOAD_DIR    = os.path.join(ROOT_DIR, "backend", "uploads")

    CORS_ORIGINS = ["http://localhost:5000", "http://127.0.0.1:5000",
                    "http://localhost:3000", "http://127.0.0.1:3000",
                    "http://localhost:5500", "http://127.0.0.1:5500",
                    "http://localhost:8080", "http://127.0.0.1:8080"]

    DEBUG   = os.environ.get("DEBUG", "True") == "True"
    PORT    = int(os.environ.get("PORT", 5000))
    HOST    = os.environ.get("HOST", "0.0.0.0")

    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB
    ALLOWED_EXTENSIONS = {"pdf", "png", "jpg", "jpeg"}

    # Rate limiting
    RATELIMIT_DEFAULT = "200 per day;50 per hour;5 per minute"

    # Loan constants
    LOANS = {
        "Personal Loan":        (0.12,  24),
        "Home Loan":            (0.08,  240),
        "Car Loan":             (0.10,  60),
        "Education Loan":       (0.09,  120),
        "Gold Loan":            (0.11,  12),
        "Business Loan":        (0.13,  60),
        "Startup Loan":         (0.15,  72),
        "Travel Loan":          (0.14,  12),
        "Medical Loan":         (0.10,  36),
        "Agriculture Loan":     (0.07,  60),
        "Solar Energy Loan":    (0.065, 84),
        "Wedding Loan":         (0.13,  36),
        "Debt Consolidation":   (0.11,  48),
        "Micro Business Loan":  (0.12,  24),
        "Vehicle Upgrade Loan": (0.105, 48),
        "Loan Against Property":(0.085, 180),
        "Overdraft Facility":   (0.135, 12),
        "Senior Citizen Loan":  (0.075, 60),
        "NRI Home Loan":        (0.085, 240),
        "Top-Up Loan":          (0.115, 36),
    }

    LOAN_ICONS = {
        "Personal Loan": "👤", "Home Loan": "🏠", "Car Loan": "🚗",
        "Education Loan": "🎓", "Gold Loan": "🥇", "Business Loan": "💼",
        "Startup Loan": "🚀", "Travel Loan": "✈️", "Medical Loan": "🏥",
        "Agriculture Loan": "🌾", "Solar Energy Loan": "☀️", "Wedding Loan": "💍",
        "Debt Consolidation": "🔗", "Micro Business Loan": "🏪",
        "Vehicle Upgrade Loan": "🛵", "Loan Against Property": "🏢",
        "Overdraft Facility": "💳", "Senior Citizen Loan": "👴",
        "NRI Home Loan": "🌏", "Top-Up Loan": "⬆️",
    }

    LOAN_DESCRIPTIONS = {
        "Personal Loan": "For any personal need — medical, home, travel",
        "Home Loan": "Buy, construct or renovate your dream home",
        "Car Loan": "Drive your dream car with easy EMIs",
        "Education Loan": "Invest in your future with education funding",
        "Gold Loan": "Instant loan against your gold ornaments",
        "Business Loan": "Expand your business with working capital",
        "Startup Loan": "Fuel your startup idea with seed funding",
        "Travel Loan": "Plan your dream vacation without compromise",
        "Medical Loan": "Emergency medical expenses covered instantly",
        "Agriculture Loan": "Seasonal farming and equipment financing",
        "Solar Energy Loan": "Go green with subsidized solar financing",
        "Wedding Loan": "Make your special day truly memorable",
        "Debt Consolidation": "Merge multiple debts into one easy payment",
        "Micro Business Loan": "Small entrepreneurs & street vendors",
        "Vehicle Upgrade Loan": "Upgrade to two-wheeler or EV",
        "Loan Against Property": "Unlock the value of your property",
        "Overdraft Facility": "Flexible revolving credit line on demand",
        "Senior Citizen Loan": "Dedicated loans for pensioners at low rates",
        "NRI Home Loan": "Home loan specially designed for NRIs",
        "Top-Up Loan": "Additional loan on your existing active loan",
    }

    FEATURE_NAMES = [
        'Applicant Income', 'Coapplicant Income', 'Loan Amount', 'Credit History',
        'Total Income', 'Loan-to-Income Ratio', 'Log Applicant Income',
        'Log Coapplicant Income', 'Log Total Income', 'Loan per Coapplicant',
        'DTI Ratio', 'Credit-Income Interaction', 'Applicant Income Squared',
        'Loan Amount Squared', 'Income Ratio', 'Loan-Credit Interaction',
        'High Loan Flag', 'High Income Flag', 'Coapplicant Flag',
        'Loan Income Log Ratio', 'Sqrt Applicant Income', 'Sqrt Coapplicant Income',
        'Applicant-Loan Interaction', 'Coapplicant-Loan Interaction',
        'Marital Status Flag', 'Gender Flag', 'Age', 'Nationality Flag',
        'Employment Status Flag'
    ]
