/* NexaBank Pro — User Loans, Payments, KYC, Notifications */

async function renderDocCenter() {
  const main = document.getElementById('user-main');
  main.innerHTML = `<div class="page-loader">⏳ Loading Documents…</div>`;
  const kyc = await apiGet('/user/kyc');

  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#f0fdf4">📁</div>
  <div><div class="page-header-title">Document Center</div><div class="page-header-sub">Upload and manage your KYC documents</div></div></div>

  <div class="card shadow-sm">
    <div class="card-header">🆔 Identity Documents</div>
    <div class="form-row">
      <div class="form-group">
        <label>Aadhaar Card (PDF/Image)</label>
        <input type="file" id="up-aadhaar" accept=".pdf,.png,.jpg,.jpeg"/>
        ${kyc.aadhaar_file ? `<div style="margin-top:5px"><a href="/api/user/docs/${kyc.aadhaar_file}" target="_blank" class="badge badge-approved">📄 View Current Aadhaar</a></div>` : ''}
      </div>
      <div class="form-group" style="align-self:flex-end">
        <button class="btn btn-primary btn-sm" onclick="uploadDocument('aadhaar', 'up-aadhaar')">⬆️ Upload Aadhaar</button>
      </div>
    </div>
    <div class="form-row" style="margin-top:20px">
      <div class="form-group">
        <label>PAN Card (PDF/Image)</label>
        <input type="file" id="up-pan" accept=".pdf,.png,.jpg,.jpeg"/>
        ${kyc.pan_file ? `<div style="margin-top:5px"><a href="/api/user/docs/${kyc.pan_file}" target="_blank" class="badge badge-approved">📄 View Current PAN</a></div>` : ''}
      </div>
      <div class="form-group" style="align-self:flex-end">
        <button class="btn btn-primary btn-sm" onclick="uploadDocument('pan', 'up-pan')">⬆️ Upload PAN</button>
      </div>
    </div>
  </div>

  <div class="card shadow-sm">
    <div class="card-header">🏦 Financial Documents</div>
    <div class="form-row">
      <div class="form-group">
        <label>Bank Statement (Last 6 Months)</label>
        <input type="file" id="up-bank" accept=".pdf,.png,.jpg,.jpeg"/>
        ${kyc.bank_file ? `<div style="margin-top:5px"><a href="/api/user/docs/${kyc.bank_file}" target="_blank" class="badge badge-approved">📄 View Current Statement</a></div>` : ''}
      </div>
      <div class="form-group" style="align-self:flex-end">
        <button class="btn btn-primary btn-sm" onclick="uploadDocument('bank', 'up-bank')">⬆️ Upload Statement</button>
      </div>
    </div>
  </div>`;
}

async function renderChecklist() {
  const main = document.getElementById('user-main');
  const lt = localStorage.getItem('nb_last_loan_type') || 'Personal Loan';

  const docs = {
    mandatory: [
      { t: 'Aadhaar Card', d: 'Identity & address proof — mandatory for all' },
      { t: 'PAN Card', d: 'Tax identity — mandatory for all loans' },
      { t: 'Passport-size Photos', d: '3 recent passport photos' },
      { t: 'Bank Statement', d: 'Last 6 months — salary/savings account' },
      { t: 'Salary Slips', d: 'Last 3 months payslips' },
      { t: 'Form 16', d: 'Annual tax statement from employer' }
    ],
    recommended: [
      { t: 'Address Proof', d: 'Electricity bill / Rental agreement' },
      { t: 'Employment ID', d: 'Official company ID card' },
      { t: 'Credit Report', d: 'CIBIL or Experian report copy' }
    ]
  };

  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#fdf2f2">📋</div>
  <div><div class="page-header-title">Document Checklist</div><div class="page-header-sub">Required documents for your application</div></div></div>

  <div class="card shadow-sm" style="border-top: 4px solid #ef4444">
    <div style="margin-bottom:20px;display:flex;align-items:center;gap:10px">
      <span style="font-size:18px">📋</span>
      <span style="font-weight:700;color:#1e293b">Required for <span style="color:#4f46e5">👤 ${lt}</span></span>
    </div>

    <div style="display:flex;gap:15px;margin-bottom:30px">
      <div class="count-badge bg-req">${docs.mandatory.length} Required</div>
      <div class="count-badge bg-rec">${docs.recommended.length} Recommended</div>
    </div>

    <div style="margin-bottom:15px;display:flex;align-items:center;gap:10px">
       <div style="width:12px;height:12px;background:#ef4444;border-radius:50%"></div>
       <strong style="font-size:15px;color:#1e293b">Mandatory Documents</strong>
    </div>

    <div id="mandatory-list">
      ${docs.mandatory.map(item => `
        <div class="checklist-item">
          <div class="checklist-icon">✔</div>
          <div class="checklist-content">
            <div class="checklist-title">${item.t}</div>
            <div class="checklist-desc">${item.d}</div>
          </div>
          <div class="checklist-badge">REQUIRED</div>
        </div>
      `).join('')}
    </div>

    <div style="margin-top:30px;margin-bottom:15px;display:flex;align-items:center;gap:10px">
       <div style="width:12px;height:12px;background:#f59e0b;border-radius:50%"></div>
       <strong style="font-size:15px;color:#1e293b">Recommended (Optional)</strong>
    </div>

    <div id="recommended-list">
      ${docs.recommended.map(item => `
        <div class="checklist-item" style="background:#fffbeb;border-color:#fef3c7">
          <div class="checklist-icon" style="background:#f59e0b">ℹ️</div>
          <div class="checklist-content">
            <div class="checklist-title">${item.t}</div>
            <div class="checklist-desc">${item.d}</div>
          </div>
          <div class="checklist-badge" style="color:#d97706;border-color:#fde68a">OPTIONAL</div>
        </div>
      `).join('')}
    </div>

    <button class="btn btn-primary btn-full" style="margin-top:30px" onclick="userNav('docs')">🚀 Go to Document Upload</button>
  </div>`;
}

async function uploadDocument(type, inputId) {
  const fileInput = document.getElementById(inputId);
  if (!fileInput.files[0]) { showToast('Please select a file', 'error'); return; }

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);
  formData.append('type', type);

  const token = getToken();
  const res = await fetch('/api/user/upload', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token },
    body: formData
  });

  const data = await res.json();
  if (res.ok) {
    showToast(`✅ ${type} uploaded!`, 'success');
    renderDocCenter();
  } else {
    showToast(data.error || 'Upload failed', 'error');
  }
}

// ── MY LOANS ──────────────────────────────────────────────────────────
async function renderMyLoans() {
  const main = document.getElementById('user-main');
  main.innerHTML = `<div class="page-loader">⏳ Loading your loans…</div>`;
  const data = await apiGet('/predictions');
  if (!data || data.error) { main.innerHTML = `<div class="page-loader">❌ Failed to load loans</div>`; return; }

  if (data.length === 0) {
    main.innerHTML = `
    <div class="page-header"><div class="page-header-icon" style="background:#eff6ff">📄</div>
    <div><div class="page-header-title">My Loan Details</div><div class="page-header-sub">All your loan applications</div></div></div>
    <div class="card shadow-sm" style="text-align:center;padding:60px">
      <div style="font-size:60px;margin-bottom:16px">📭</div>
      <div style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:8px">No Loans Yet</div>
      <div style="color:#64748b;margin-bottom:24px">Apply for your first loan to get started.</div>
      <button class="btn btn-primary" onclick="userNav('apply')">🚀 Apply for Loan</button>
    </div>`;
    return;
  }

  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#eff6ff">📄</div>
  <div><div class="page-header-title">My Loan Details</div><div class="page-header-sub">${data.length} application(s) found</div></div></div>
  <div id="loans-list"></div>`;

  const kyc = await apiGet('/user/kyc');
  const list = document.getElementById('loans-list');
  window._myLoans = data;

  data.forEach((loan, idx) => {
    const info = LOANS[loan.loan_type] || {};
    const sched = buildLoanSchedule(loan.loan_amount||0, info.rate||0.12, info.tenure||24);
    const totalInt = sched.reduce((s,r)=>s+r.interest,0);
    const stageIdx = STATUS_STAGE[loan.loan_status] || 2;

    list.innerHTML += `
    <div class="card shadow-sm" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div style="display:flex;align-items:center;gap:14px">
          <div style="font-size:40px">${info.icon||'💰'}</div>
          <div>
            <div style="font-size:18px;font-weight:800;color:#1e293b">${loan.loan_type}</div>
            <div style="font-size:13px;color:#64748b">Application #${loan.id} · Applied ${fmtDate(loan.applied_date)}</div>
          </div>
        </div>
        <div>${getStatusBadge(loan.loan_status)}</div>
      </div>

      <div class="metrics-grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="metric-card border-blue"><div class="metric-num">${fmtCur(loan.loan_amount)}</div><div class="metric-lbl">Amount</div></div>
        <div class="metric-card border-green"><div class="metric-num">${fmtCur(loan.emi)}</div><div class="metric-lbl">EMI</div></div>
        <div class="metric-card border-purple"><div class="metric-num">${loan.credit_score||'—'}</div><div class="metric-lbl">Score</div></div>
        <div class="metric-card border-orange"><div class="metric-num">${fmtPct(loan.approval_probability)}</div><div class="metric-lbl">Prob</div></div>
      </div>

      <div class="card-header">🔄 Loan Progress</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${LC_STEPS.map(([ico,lbl],i)=>`
        <div class="${i<stageIdx?'step-done':i===stageIdx?'step-active':'step-wait'}" style="padding:6px;border-radius:6px;font-size:11px;text-align:center">
          ${ico} ${lbl.split(' ')[0]} ${i<stageIdx?'✔':''}
        </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
        <div style="background:#f8fafc;border-radius:12px;padding:16px;font-size:13px">
          <div style="font-weight:700;margin-bottom:10px">📋 Details</div>
          <div>👤 ${loan.name||'—'}</div>
          <div>💼 ${loan.employment_type||'—'}</div>
          <div>🔄 ${loan.repayment_mode||'—'}</div>
        </div>
        <div style="background:#f8fafc;border-radius:12px;padding:16px;font-size:13px">
          <div style="font-weight:700;margin-bottom:10px">💰 Financials</div>
          <div>💵 Inc: ${fmtCur(loan.applicant_income)}</div>
          <div>💸 Int: ${fmtCur(totalInt)}</div>
          <div>⚠️ Risk: ${getRiskBadge(loan.risk_level)}</div>
        </div>
      </div>

      <div style="background:#f8fafc;border-radius:12px;padding:16px;font-size:13px;margin-top:16px">
        <div style="font-weight:700;margin-bottom:10px">📁 Uploaded Documents (KYC)</div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          ${kyc.aadhaar_file ? `<a href="/api/user/docs/${kyc.aadhaar_file}" target="_blank" class="badge badge-approved">📄 Aadhaar</a>` : '<span class="badge badge-review">❌ Aadhaar Missing</span>'}
          ${kyc.pan_file ? `<a href="/api/user/docs/${kyc.pan_file}" target="_blank" class="badge badge-approved">📄 PAN Card</a>` : '<span class="badge badge-review">❌ PAN Missing</span>'}
          ${kyc.bank_file ? `<a href="/api/user/docs/${kyc.bank_file}" target="_blank" class="badge badge-approved">📄 Bank Statement</a>` : '<span class="badge badge-review">❌ Bank Docs Missing</span>'}
        </div>
        <button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="userNav('docs')">⚙️ Manage Documents</button>
      </div>

      <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary btn-sm" onclick="userNav('payments')">💳 Pay EMI</button>
        <button class="btn btn-outline btn-sm" onclick="downloadReportByIndex(${idx})">⬇ Download Report</button>
      </div>
    </div>`;
  });
}

function downloadReportByIndex(idx) {
  const loan = (window._myLoans && window._myLoans[idx]);
  if (!loan) return;
  const info = LOANS[loan.loan_type] || {};
  const sched = buildLoanSchedule(loan.loan_amount||0, info.rate||0.12, info.tenure||24);
  const totalInt = sched.reduce((s,r)=>s+r.interest,0);
  const text = `NEXA BANK PRO — LOAN REPORT
${'='.repeat(40)}
Application ID : ${loan.id}
Name           : ${loan.name}
Loan Type      : ${loan.loan_type}
Loan Amount    : ${fmtCur(loan.loan_amount)}
EMI            : ${fmtCur(loan.emi)}
Credit Score   : ${loan.credit_score}
Risk Level     : ${loan.risk_level}
Approval Score : ${loan.approval_probability}%
Status         : ${loan.loan_status}
Applied Date   : ${loan.applied_date}
Total Interest : ${fmtCur(totalInt)}
Total Payable  : ${fmtCur((loan.loan_amount||0)+totalInt)}

AI Factors: ${loan.explainability||'—'}
${'='.repeat(40)}
NexaBank Pro Financial Services Pvt. Ltd.
RBI Registered NBFC`;
  const blob = new Blob([text], {type:'text/plain'});
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `loan_report_${loan.id}.txt`; a.click();
}

// ── PAYMENTS ──────────────────────────────────────────────────────────
async function renderPayments() {
  const main = document.getElementById('user-main');
  main.innerHTML = `<div class="page-loader">⏳ Loading…</div>`;
  const [loans, payments] = await Promise.all([apiGet('/predictions'), apiGet('/user/payments')]);
  if (!loans) return;

  const activeLoans = (loans||[]).filter(l => ['Under Review','Approved','Disbursed','Active'].includes(l.loan_status));

  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#fdf4ff">💳</div>
  <div><div class="page-header-title">EMI Payments</div><div class="page-header-sub">Pay and track all your EMIs</div></div></div>

  <div id="payment-receipt"></div>

  ${activeLoans.length === 0 ? '<div class="card shadow-sm" style="text-align:center;padding:60px">No active loans to pay.</div>' : ''}

  ${activeLoans.map(loan => {
    const info = LOANS[loan.loan_type] || {};
    const sched = buildLoanSchedule(loan.loan_amount||0, info.rate||0.12, Math.min(info.tenure||24, 12));
    const paidMonths = (payments||[]).filter(p=>p.prediction_id==loan.id && p.status==='Success').map(p=>p.month_number);

    return `
    <div class="card shadow-sm">
      <div class="card-header">${info.icon||'💰'} ${loan.loan_type} — #${loan.id} — ${fmtCur(loan.loan_amount)}</div>
      <div class="metrics-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:20px">
        <div class="metric-card border-blue"><div class="metric-num">${fmtCur(loan.emi)}</div><div class="metric-lbl">EMI</div></div>
        <div class="metric-card border-green"><div class="metric-num">${paidMonths.length}</div><div class="metric-lbl">Paid</div></div>
        <div class="metric-card border-orange"><div class="metric-num">${Math.max(0,(info.tenure||24)-paidMonths.length)}</div><div class="metric-lbl">Left</div></div>
      </div>

      <div class="card-header">📅 EMI Schedule</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      ${sched.slice(0, 6).map(row => {
        const paid = paidMonths.includes(row.month);
        const cls = paid ? 'emi-paid' : 'emi-upcoming';
        return `
        <div class="emi-card ${cls}" style="display:flex;justify-content:space-between;align-items:center;padding:10px;font-size:12px">
          <span><strong>M${row.month}</strong></span>
          <span style="display:flex;align-items:center;gap:5px">
            ${paid ? `<span class="badge badge-approved" style="font-size:10px">Paid</span>` : `<button class="btn btn-success btn-xs" onclick="payEMI(${loan.id},${row.month},${loan.emi})">Pay</button>`}
          </span>
        </div>`;
      }).join('')}
      </div>

      <div class="card-header" style="margin-top:16px">📜 Payment History</div>
      ${(payments||[]).filter(p=>p.prediction_id==loan.id).length === 0
        ? '<div style="color:#94a3b8;font-size:14px">No payments made yet</div>'
        : `<div class="table-wrap"><table>
            <tr><th>Month</th><th>EMI</th><th>Total</th><th>Method</th><th>Status</th></tr>
            ${(payments||[]).filter(p=>p.prediction_id==loan.id).map(p=>`
            <tr>
              <td>#${p.month_number}</td>
              <td>${fmtCur(p.emi_amount)}</td>
              <td style="font-weight:700;color:#16a34a">${fmtCur(p.total_paid)}</td>
              <td>${p.payment_method}</td>
              <td><span class="badge badge-approved" style="font-size:10px">✅ SUCCESS</span></td>
            </tr>`).join('')}
          </table></div>`}
    </div>`;
  }).join('')}`;
}

async function payEMI(predId, month, amount) {
  const method = prompt('Payment Method (Net Banking, UPI, Card):', 'UPI') || 'UPI';
  if (!method) return;
  const data = await apiPost('/user/payments/pay', { prediction_id: predId, month_number: month, payment_method: method });
  if (data && data.transaction_id) {
    showToast('✅ Payment successful! ' + data.transaction_id, 'success');
    renderPayments();
  } else {
    showToast((data && data.error) || 'Payment failed', 'error');
  }
}

// ── KYC ──────────────────────────────────────────────────────────────
async function renderKYC() {
  const main = document.getElementById('user-main');
  main.innerHTML = `<div class="page-loader">⏳ Loading…</div>`;
  const kyc = await apiGet('/user/kyc');

  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#f0fdf4">🔐</div>
  <div><div class="page-header-title">KYC Verification</div><div class="page-header-sub">Verify your identity</div></div></div>

  <div class="card shadow-sm">
    <div class="card-header">📱 Step 1 — Phone OTP</div>
    ${kyc && kyc.otp_verified ? '<div class="success-msg" style="font-size:13px;padding:8px">✅ Phone OTP Verified</div>' : ''}
    <div class="form-row">
      <div class="form-group"><input type="text" id="kyc-phone" value="${(kyc&&kyc.phone)||''}" placeholder="Phone Number"/></div>
      <div class="form-group" style="align-self:flex-end"><button class="btn btn-outline btn-sm" onclick="sendKYCOtp()">📱 Send OTP</button></div>
    </div>
    <div id="otp-section" class="${(kyc&&kyc.otp_verified)?'hidden':''}">
      <div class="form-row">
        <div class="form-group"><input type="text" id="kyc-otp" placeholder="6-digit OTP"/></div>
        <div class="form-group" style="align-self:flex-end"><button class="btn btn-success btn-sm" onclick="verifyKYCOtp()">✅ Verify</button></div>
      </div>
      <div id="otp-hint" class="success-msg hidden" style="font-size:11px"></div>
    </div>
  </div>

  <div class="card shadow-sm">
    <div class="card-header">🏦 Step 2 — Bank Details</div>
    ${kyc && kyc.kyc_status === 'Verified' ? '<div class="success-msg" style="font-size:13px;padding:8px">✅ KYC Verified by Bank</div>' : ''}
    <div class="form-row-3">
      <div class="form-group"><input type="text" id="kyc-account" value="${(kyc&&kyc.account_number)||''}" placeholder="Account No"/></div>
      <div class="form-group"><input type="text" id="kyc-ifsc" value="${(kyc&&kyc.ifsc_code)||''}" placeholder="IFSC"/></div>
      <div class="form-group">
        <select id="kyc-bank">
          ${['SBI','HDFC Bank','ICICI Bank','Axis Bank','Kotak','PNB','BOB','Canara','Union','Yes Bank']
            .map(b=>`<option ${(kyc&&kyc.bank_name)===b?'selected':''}>${b}</option>`).join('')}
        </select>
      </div>
    </div>
    <button class="btn btn-primary btn-sm btn-full" onclick="submitKYC()">🔐 Submit KYC</button>
  </div>

  <div class="card shadow-sm">
    <div class="card-header">🆔 Step 3 — Identity Verification</div>
    <div class="form-row">
      <div class="form-group">
        <input type="text" id="kyc-aadhaar" placeholder="Aadhaar No (12 digits)"/>
        ${kyc.aadhaar_file ? `<div style="margin-top:5px"><a href="/api/user/docs/${kyc.aadhaar_file}" target="_blank" class="badge badge-approved" style="font-size:10px">📄 Aadhaar Uploaded</a></div>` : ''}
      </div>
      <div class="form-group" style="align-self:flex-end"><button class="btn btn-outline btn-sm" onclick="verifyAadhaar()">Verify</button></div>
    </div>
    <div class="form-row">
      <div class="form-group">
        <input type="text" id="kyc-pan" placeholder="PAN No (ABCDE1234F)"/>
        ${kyc.pan_file ? `<div style="margin-top:5px"><a href="/api/user/docs/${kyc.pan_file}" target="_blank" class="badge badge-approved" style="font-size:10px">📄 PAN Uploaded</a></div>` : ''}
      </div>
      <div class="form-group" style="align-self:flex-end"><button class="btn btn-outline btn-sm" onclick="verifyPAN()">Verify</button></div>
    </div>
  </div>

  ${kyc ? `
  <div class="card shadow-sm">
    <div class="card-header">📊 KYC Status</div>
    <div class="metrics-grid" style="grid-template-columns:repeat(4,1fr)">
      <div class="metric-card border-green" style="padding:10px"><div class="metric-num" style="font-size:13px">${kyc.otp_verified?'Verified':'Pending'}</div><div class="metric-lbl" style="font-size:9px">OTP</div></div>
      <div class="metric-card border-orange" style="padding:10px"><div class="metric-num" style="font-size:13px">${kyc.kyc_status||'Pending'}</div><div class="metric-lbl" style="font-size:9px">Status</div></div>
      <div class="metric-card border-blue" style="padding:10px"><div class="metric-num" style="font-size:11px">${kyc.bank_name||'—'}</div><div class="metric-lbl" style="font-size:9px">Bank</div></div>
      <div class="metric-card border-purple" style="padding:10px"><div class="metric-num" style="font-size:13px">${(kyc.aadhaar_file?1:0)+(kyc.pan_file?1:0)+(kyc.bank_file?1:0)}/3</div><div class="metric-lbl" style="font-size:9px">Docs</div></div>
    </div>
    <button class="btn btn-outline btn-xs btn-full" style="margin-top:15px" onclick="userNav('docs')">📁 Open Document Center</button>
  </div>` : ''}`;
}

async function sendKYCOtp() {
  const phone = document.getElementById('kyc-phone').value.trim();
  if (!phone) { showToast('Enter phone number', 'error'); return; }
  const data = await apiPost('/user/kyc/send-otp', { phone });
  if (data && !data.error) {
    document.getElementById('otp-section').classList.remove('hidden');
    const hint = document.getElementById('otp-hint');
    hint.textContent = `Demo OTP: ${data.demo_otp}`;
    hint.classList.remove('hidden');
    showToast('OTP sent', 'success');
  } else { showToast('Error sending OTP', 'error'); }
}

async function verifyKYCOtp() {
  const otp = document.getElementById('kyc-otp').value.trim();
  const data = await apiPost('/user/kyc/verify-otp', { otp });
  if (data && !data.error) { showToast('✅ Verified!', 'success'); renderKYC(); }
  else showToast('Invalid OTP', 'error');
}

async function submitKYC() {
  const data = await apiPost('/user/kyc/submit', {
    account_number: document.getElementById('kyc-account').value,
    ifsc_code:      document.getElementById('kyc-ifsc').value,
    bank_name:      document.getElementById('kyc-bank').value,
  });
  if (data && !data.error) { showToast('✅ Submitted!', 'success'); renderKYC(); }
  else showToast('Failed', 'error');
}

async function verifyAadhaar() {
  const num = document.getElementById('kyc-aadhaar').value.trim();
  if (num.length !== 12) { showToast('Invalid Aadhaar', 'error'); return; }
  const data = await apiPost('/user/kyc/aadhaar', { aadhaar_number: num });
  if (data && !data.error) { showToast('✅ Aadhaar Verified', 'success'); renderKYC(); }
}

async function verifyPAN() {
  const num = document.getElementById('kyc-pan').value.trim();
  if (num.length !== 10) { showToast('Invalid PAN', 'error'); return; }
  const data = await apiPost('/user/kyc/pan', { pan_number: num });
  if (data && !data.error) { showToast('✅ PAN Verified', 'success'); renderKYC(); }
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────
async function renderNotifications() {
  const main = document.getElementById('user-main');
  main.innerHTML = `<div class="page-loader">⏳ Loading…</div>`;
  const data = await apiGet('/user/notifications');
  await apiPut('/user/notifications/mark-read', {});

  const badge = document.getElementById('notif-count');
  if (badge) badge.style.display = 'none';

  if (!data) return;
  const notifs = data.notifications || [];
  const typeIcons = {success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};

  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#fefce8">🔔</div>
  <div><div class="page-header-title">Notifications</div><div class="page-header-sub">${notifs.length} notifications</div></div></div>

  ${notifs.length === 0 ? `
  <div class="card shadow-sm" style="text-align:center;padding:40px">
    <div style="font-size:50px;margin-bottom:10px">🔔</div>
    <div style="font-size:16px;font-weight:700">No notifications yet</div>
  </div>` : notifs.reverse().map(n => `
  <div class="notif-item ${!n.is_read?'unread':''}" style="padding:12px">
    <div class="notif-icon">${typeIcons[n.type]||'ℹ️'}</div>
    <div>
      <div class="notif-text" style="font-size:13px">${n.message}</div>
      <div class="notif-time" style="font-size:11px">${fmtDate(n.created_at)}</div>
    </div>
  </div>`).join('')}`;
}
