"""
NexaBank Pro — ML Model Training Script
Trains the Random Forest loan approval classifier
Run this once to generate rf_model.pkl and scaler.pkl
"""

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import pickle
import os

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

def build_features(app_income, coapp_income, loan_amt, credit_hist, age,
                   marital_flag=1, gender_flag=1):
    ti = app_income + coapp_income
    return {
        'Applicant Income': app_income,
        'Coapplicant Income': coapp_income,
        'Loan Amount': loan_amt,
        'Credit History': credit_hist,
        'Total Income': ti,
        'Loan-to-Income Ratio': loan_amt / max(ti, 1),
        'Log Applicant Income': float(np.log1p(app_income)),
        'Log Coapplicant Income': float(np.log1p(coapp_income)),
        'Log Total Income': float(np.log1p(ti)),
        'Loan per Coapplicant': loan_amt / max(coapp_income, 1),
        'DTI Ratio': loan_amt / max(app_income * 12, 1),
        'Credit-Income Interaction': credit_hist * app_income,
        'Applicant Income Squared': float(app_income ** 2),
        'Loan Amount Squared': float(loan_amt ** 2),
        'Income Ratio': app_income / max(ti, 1),
        'Loan-Credit Interaction': float(np.log1p(loan_amt)) * credit_hist,
        'High Loan Flag': 1 if loan_amt > 500000 else 0,
        'High Income Flag': 1 if app_income > 100000 else 0,
        'Coapplicant Flag': 1 if coapp_income > 0 else 0,
        'Loan Income Log Ratio': float(np.log1p(loan_amt)) / max(float(np.log1p(app_income)), 0.001),
        'Sqrt Applicant Income': float(np.sqrt(app_income)),
        'Sqrt Coapplicant Income': float(np.sqrt(max(coapp_income, 0))),
        'Applicant-Loan Interaction': app_income * loan_amt / 1e8,
        'Coapplicant-Loan Interaction': coapp_income * loan_amt / 1e8,
        'Marital Status Flag': marital_flag,
        'Gender Flag': gender_flag,
        'Age': age,
        'Nationality Flag': 1,
        'Employment Status Flag': 1,
    }


def generate_synthetic_data(n=5000, seed=42):
    np.random.seed(seed)
    records = []
    for _ in range(n):
        app_income    = np.random.lognormal(mean=11, sigma=0.6)
        coapp_income  = np.random.choice([0, np.random.lognormal(10.5, 0.5)], p=[0.4, 0.6])
        loan_amt      = np.random.lognormal(13, 0.7)
        credit_hist   = np.random.choice([0, 1], p=[0.2, 0.8])
        age           = np.random.randint(21, 65)
        mar_flag      = np.random.randint(0, 2)
        gen_flag      = np.random.randint(0, 2)
        feats         = build_features(app_income, coapp_income, loan_amt, credit_hist, age, mar_flag, gen_flag)

        # Approval logic
        prob = 0.3
        if credit_hist == 1:          prob += 0.35
        if loan_amt / max(app_income * 12, 1) < 0.5: prob += 0.2
        if app_income > 60000:        prob += 0.1
        if coapp_income > 0:          prob += 0.05
        label = 1 if np.random.rand() < min(prob, 0.95) else 0

        feats['label'] = label
        records.append(feats)

    return pd.DataFrame(records)


def train():
    print("🔄 Generating synthetic training data …")
    df = generate_synthetic_data(6000)

    X = df[FEATURE_NAMES].values
    y = df['label'].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    scaler = StandardScaler()
    X_train_s = scaler.fit_transform(X_train)
    X_test_s  = scaler.transform(X_test)

    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=12,
        min_samples_split=5,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )

    print("🤖 Training Random Forest (200 trees) …")
    model.fit(X_train_s, y_train)

    preds = model.predict(X_test_s)
    acc   = accuracy_score(y_test, preds)
    print(f"\n✅ Test Accuracy: {acc*100:.2f}%")
    print(classification_report(y_test, preds, target_names=['Rejected', 'Approved']))

    out_dir = os.path.join(os.path.dirname(__file__))
    os.makedirs(out_dir, exist_ok=True)

    with open(os.path.join(out_dir, "rf_model.pkl"), "wb") as f:
        pickle.dump(model, f)
    with open(os.path.join(out_dir, "scaler.pkl"), "wb") as f:
        pickle.dump(scaler, f)
    with open(os.path.join(out_dir, "feature_names.pkl"), "wb") as f:
        pickle.dump(FEATURE_NAMES, f)

    print(f"\n✅ Model artifacts saved to: {out_dir}")
    return model, scaler


if __name__ == "__main__":
    train()
