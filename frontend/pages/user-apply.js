/* NexaBank Pro — User Apply + Loans Pages */

function renderApply() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem('nb_apply_form') || '{}');
  } catch(e) { saved = {}; }

  let resultData = null;
  try {
    resultData = JSON.parse(localStorage.getItem('nb_apply_result_data') || 'null');
  } catch(e) { resultData = null; }

  if (resultData && resultData.id) {
    setTimeout(() => {
      const container = document.getElementById('apply-result-container');
      if (container) renderApplyResult(resultData, false);
      else {
        // If container missing, clear and re-render the whole page
        localStorage.removeItem('nb_apply_result_data');
        loadUserPage('apply');
      }
    }, 50);
    return `<div id="apply-result-container"><div class="page-loader">⏳ Loading result…</div></div>`;
  }

  return `
  <div class="page-header">
    <div class="page-header-icon" style="background:#eff6ff">🏦</div>
    <div>
      <div class="page-header-title">Apply for Loan</div>
      <div class="page-header-sub">Fill your details for an instant AI-powered decision</div>
    </div>
  </div>

  <div id="apply-result-container"></div>

  <div id="apply-card">
    <form id="apply-form" onsubmit="submitLoanApp(event)" oninput="saveApplyForm()">

      <!-- Section 1: Personal Information -->
      <div class="card shadow-sm" style="padding: 24px; margin-bottom: 20px;">
        <div style="font-weight: 700; color: #4338ca; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">👤</span> Personal Information
        </div>

        <div class="form-row-4" style="display: grid; grid-template-columns: 1fr 0.5fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" id="a-name" placeholder="Your full name" required value="${saved.name||''}"/>
          </div>
          <div class="form-group">
            <label>Age *</label>
            <input type="number" id="a-age" placeholder="28" required value="${saved.age||'28'}"/>
          </div>
          <div class="form-group">
            <label>Gender</label>
            <select id="a-gender">
              <option value="Male" ${saved.gender==='Male'?'selected':''}>Male</option>
              <option value="Female" ${saved.gender==='Female'?'selected':''}>Female</option>
            </select>
          </div>
          <div class="form-group">
            <label>Nationality</label>
            <input type="text" id="a-nat" placeholder="Indian" value="${saved.nationality||'Indian'}"/>
          </div>
        </div>

        <div class="form-row-3" style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
          <div class="form-group">
            <label>Marital Status</label>
            <select id="a-marital">
              <option value="Single" ${saved.marital_status==='Single'?'selected':''}>Single</option>
              <option value="Married" ${saved.marital_status==='Married'?'selected':''}>Married</option>
            </select>
          </div>
          <div class="form-group">
            <label>Employment Type</label>
            <select id="a-emp">
              <option value="Salaried" ${saved.employment_type==='Salaried'?'selected':''}>Salaried</option>
              <option value="Self-Employed" ${saved.employment_type==='Self-Employed'?'selected':''}>Self-Employed</option>
            </select>
          </div>
          <div class="form-group">
            <label>Loan Purpose</label>
            <input type="text" id="a-purpose" placeholder="e.g. Home renovation" value="${saved.purpose||''}"/>
          </div>
        </div>
      </div>

      <!-- Section 2: Financial Details -->
      <div class="card shadow-sm" style="padding: 24px; margin-bottom: 20px;">
        <div style="font-weight: 700; color: #4338ca; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">💰</span> Financial Details
        </div>

        <div class="form-group" id="loan-info-banner" style="background: #f8fafc; padding: 10px 15px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 13px; color: #475569;">
           <span id="loan-info-text">Select a loan type to see rates</span>
        </div>

        <div class="form-row-3" style="gap: 15px; margin-bottom: 20px;">
          <div class="form-group">
            <label>Loan Type *</label>
            <select id="a-loan-type" onchange="updateLoanInfo()" required>
              ${Object.keys(LOANS).map(n=>`<option value="${n}" ${saved.loan_type===n?'selected':''}>${LOANS[n].icon} ${n}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Loan Amount (₹) *</label>
            <input type="number" id="a-loan-amount" placeholder="500000" required value="${saved.loan_amount||'500000'}" oninput="updateLoanInfo()"/>
          </div>
          <div class="form-group">
            <label>Monthly Income (₹) *</label>
            <input type="number" id="a-income" placeholder="50000" required value="${saved.applicant_income||''}" oninput="updateLoanInfo()"/>
          </div>
        </div>

        <div class="form-row-3" style="gap: 15px; margin-bottom: 20px;">
          <div class="form-group">
             <label>Credit History</label>
             <select id="a-credit" onchange="updateLoanInfo()">
               <option value="1" ${saved.credit_history==='1'?'selected':''}>✅ Good</option>
               <option value="0" ${saved.credit_history==='0'?'selected':''}>❌ Bad / No History</option>
             </select>
          </div>
          <div class="form-group">
            <label>Existing Loan EMI (₹/mo)</label>
            <input type="number" id="a-exemi" placeholder="0" value="${saved.existing_emi||'0'}" oninput="updateLoanInfo()"/>
          </div>
          <div class="form-group">
            <label>Add Loan Insurance (+0.5%)</label>
            <select id="a-ins" onchange="updateLoanInfo()">
              <option value="No" ${saved.insurance_opted==='No'?'selected':''}>No</option>
              <option value="Yes" ${saved.insurance_opted==='Yes'?'selected':''}>Yes</option>
            </select>
          </div>
        </div>

        <!-- Real-time Preview Banner -->
        <div id="emi-preview-banner" style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 15px 25px; display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
           <div style="text-align: center;"><div id="p-emi" style="font-size: 20px; font-weight: 800; color: #1d4ed8;">₹ 0</div><div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Est. Monthly EMI</div></div>
           <div style="text-align: center;"><div id="p-tenure" style="font-size: 20px; font-weight: 800; color: #1d4ed8;">0 mo</div><div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Tenure</div></div>
           <div style="text-align: center;"><div id="p-rate" style="font-size: 20px; font-weight: 800; color: #1d4ed8;">0%</div><div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Rate P.A.</div></div>
           <div style="text-align: center;"><div id="p-fee" style="font-size: 20px; font-weight: 800; color: #1d4ed8;">₹ 0</div><div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">Processing Fee (1%)</div></div>
           <div style="text-align: center;"><div id="p-dti" style="font-size: 20px; font-weight: 800; color: #dc2626;">0.00</div><div style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase;">DTI Ratio</div></div>
        </div>
      </div>

      <!-- Section 3: Advanced Loan Options -->
      <div class="card shadow-sm" style="padding: 24px; margin-bottom: 20px;">
        <div style="font-weight: 700; color: #4338ca; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">⚙️</span> Advanced Loan Options
        </div>

        <div class="form-row-3" style="gap: 15px; margin-bottom: 20px;">
          <div class="form-group">
            <label>Repayment Mode</label>
            <select id="a-repay">
              <option value="EMI (Fixed)" ${saved.repayment_mode==='EMI (Fixed)'?'selected':''}>EMI (Fixed)</option>
              <option value="Step-Up" ${saved.repayment_mode==='Step-Up'?'selected':''}>Step-Up</option>
              <option value="Bullet" ${saved.repayment_mode==='Bullet'?'selected':''}>Bullet Payment</option>
            </select>
          </div>
          <div class="form-group">
            <label>Moratorium Period</label>
            <select id="a-mor">
              <option value="0" ${saved.moratorium_period=='0'?'selected':''}>None</option>
              <option value="3" ${saved.moratorium_period=='3'?'selected':''}>3 Months</option>
              <option value="6" ${saved.moratorium_period=='6'?'selected':''}>6 Months</option>
            </select>
          </div>
          <div class="form-group">
            <label>Co-Borrower (Optional)</label>
            <input type="text" id="a-coborrow" placeholder="Spouse/Parent/Sibling" value="${saved.co_borrower||''}"/>
          </div>
        </div>

        <div class="form-row-2" style="display: grid; grid-template-columns: 2fr 1fr; gap: 15px;">
          <div class="form-group">
            <label>Collateral / Property Value (₹)</label>
            <input type="number" id="a-prop" placeholder="0" value="${saved.property_value||'0'}"/>
          </div>
          <div class="form-group">
            <label>Loan Category</label>
            <select id="a-cat">
              <option value="General" ${saved.loan_category==='General'?'selected':''}>General</option>
              <option value="Priority" ${saved.loan_category==='Priority'?'selected':''}>Priority Sector</option>
            </select>
          </div>
        </div>
      </div>

      <button type="submit" class="btn btn-primary btn-full" id="apply-btn" style="height: 50px; font-size: 16px; margin-bottom: 40px;">🚀 Submit Application</button>
    </form>
  </div>`;
}

function saveApplyForm() {
  const form = document.getElementById('apply-form');
  if (!form) return;
  const data = {
    name: document.getElementById('a-name').value,
    age: document.getElementById('a-age').value,
    gender: document.getElementById('a-gender').value,
    nationality: document.getElementById('a-nat').value,
    marital_status: document.getElementById('a-marital').value,
    employment_type: document.getElementById('a-emp').value,
    purpose: document.getElementById('a-purpose').value,
    loan_type: document.getElementById('a-loan-type').value,
    loan_amount: document.getElementById('a-loan-amount').value,
    applicant_income: document.getElementById('a-income').value,
    credit_history: document.getElementById('a-credit').value,
    existing_emi: document.getElementById('a-exemi').value,
    insurance_opted: document.getElementById('a-ins').value,
    repayment_mode: document.getElementById('a-repay').value,
    moratorium_period: document.getElementById('a-mor').value,
    co_borrower: document.getElementById('a-coborrow').value,
    property_value: document.getElementById('a-prop').value,
    loan_category: document.getElementById('a-cat').value,
  };
  localStorage.setItem('nb_apply_form', JSON.stringify(data));
}

function editApplication() {
  localStorage.removeItem('nb_apply_result_data');
  loadUserPage('apply');
  showToast('✏️ You can now modify your application', 'info');
}

function updateLoanInfo() {
  const lt = document.getElementById('a-loan-type')?.value;
  if (!lt) return;
  const info = LOANS[lt];
  if (!info) return;

  const amt = Number(document.getElementById('a-loan-amount').value) || 0;
  const inc = Number(document.getElementById('a-income').value) || 1;
  const exEmi = Number(document.getElementById('a-exemi').value) || 0;
  const ins = document.getElementById('a-ins').value === 'Yes';

  const rate = info.rate + (ins ? 0.005 : 0);
  const emi = emiCalc(amt, rate, info.tenure);
  const dti = (emi + exEmi) / inc;

  // Update Banner Text
  const banner = document.getElementById('loan-info-text');
  if (banner) banner.innerHTML = `<strong>${info.icon} ${lt}</strong> — ${info.desc} | Rate: ${(rate*100).toFixed(1)}% p.a. | Tenure: ${info.tenure} months`;

  // Update Real-time stats
  document.getElementById('p-emi').textContent = fmtCur(emi);
  document.getElementById('p-tenure').textContent = info.tenure + ' mo';
  document.getElementById('p-rate').textContent = (rate*100).toFixed(1) + '%';
  document.getElementById('p-fee').textContent = fmtCur(amt * 0.01);
  document.getElementById('p-dti').textContent = dti.toFixed(2);
  document.getElementById('p-dti').style.color = dti > 0.5 ? '#dc2626' : '#16a34a';

  saveApplyForm();
}

function resetApplyForm() {
  localStorage.removeItem('nb_apply_form');
  localStorage.removeItem('nb_apply_result_data');
  userNav('apply');
}

async function submitLoanApp(e) {
  e.preventDefault();
  const btn = document.getElementById('apply-btn');
  btn.disabled = true;
  btn.textContent = 'Processing…';

  // Save form first to ensure localStorage is up to date
  saveApplyForm();

  const body = JSON.parse(localStorage.getItem('nb_apply_form') || '{}');

  // Ensure we have numbers and required defaults
  body.marital_status = body.marital_status || 'Single';
  body.nationality = body.nationality || 'Indian';
  body.coapplicant_income = Number(body.coapplicant_income || 0);
  body.applicant_income = Number(body.applicant_income || 0);
  body.loan_amount = Number(body.loan_amount || 0);
  body.age = Number(body.age || 0);
  body.existing_emi = Number(body.existing_emi || 0);
  body.property_value = Number(body.property_value || 0);
  body.moratorium_period = Number(body.moratorium_period || 0);
  body.annual_income = body.applicant_income * 12;

  try {
    const data = await apiPost('/predict', body);
    if (data && data.id) {
      renderApplyResult(data);
    } else {
      const msg = (data && data.error) ? data.error : 'Failed to process application. Please check your connection.';
      showToast(msg, 'error');
      btn.disabled = false;
      btn.textContent = '🚀 Submit Application';
    }
  } catch (err) {
    console.error('[NexaBank] Application Error:', err);
    showToast('A system error occurred. Please try again.', 'error');
    btn.disabled = false;
    btn.textContent = '🚀 Submit Application';
  }
}

function renderApplyResult(d, save = true) {
  if (save) {
    localStorage.setItem('nb_apply_result_data', JSON.stringify(d));
    localStorage.setItem('nb_last_loan_type', d.loan_type);
    loadUserPage('apply');
    return;
  }

  const approved = d.approval_probability >= 70;
  const color    = approved ? '#16a34a' : d.approval_probability >= 40 ? '#d97706' : '#dc2626';
  const info     = LOANS[d.loan_type] || {};
  const totalInt = (d.emi * (info.tenure||24)) - d.loan_amount;

  const resultHtml = `
  <div class="celebration-box" style="padding:20px;margin-bottom:15px; background: ${approved ? '#f0fdf4' : '#fffbeb'}; border-color: ${approved ? '#86efac' : '#fcd34d'};">
    <div style="font-size:40px">${approved ? '🎉' : '📋'}</div>
    <div class="celebration-title" style="font-size:24px; color: ${color}">${approved ? 'Application Approved!' : 'Application Received'}</div>
    <div style="font-size:12px; color:#64748b; margin-bottom: 10px;">Application ID: <strong>#${d.id}</strong> • Status: <strong>${d.loan_status}</strong></div>

    <p style="font-size: 14px; color: #475569; max-width: 600px; margin: 0 auto 20px;">
      ${approved
        ? 'Congratulations! Your loan application has passed our AI risk assessment. You can now proceed to document verification.'
        : 'Your application has been received and is currently under review. Our AI is analyzing your credit profile for the best possible rates.'}
    </p>

    <div class="celebration-stats" style="margin-top:15px;gap:15px; display: grid; grid-template-columns: repeat(3, 1fr);">
      <div class="celebration-stat" style="padding:15px; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div class="celebration-stat-num" style="font-size:18px; color: #1e293b;">${fmtCur(d.loan_amount)}</div>
        <div class="celebration-stat-lbl" style="font-size:10px; color: #64748b;">Loan Amount</div>
      </div>
      <div class="celebration-stat" style="padding:15px; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div class="celebration-stat-num" style="font-size:18px; color: #1d4ed8;">${fmtCur(d.emi)}</div>
        <div class="celebration-stat-lbl" style="font-size:10px; color: #64748b;">Monthly EMI</div>
      </div>
      <div class="celebration-stat" style="padding:15px; background: white; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div class="celebration-stat-num" style="font-size:18px; color: ${color};">${fmtPct(d.approval_probability)}</div>
        <div class="celebration-stat-lbl" style="font-size:10px; color: #64748b;">AI Confidence Score</div>
      </div>
    </div>
  </div>

  <div class="charts-grid-3" style="margin-bottom:20px; gap:15px;">
    <div class="chart-container-adv" style="height:280px; padding:18px;">
      <div class="chart-title-adv">📉 Approval Probability</div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">Chance of final disbursement based on current data.</div>
      <div class="chart-canvas-wrapper"><canvas id="apply-result-chart"></canvas></div>
    </div>
    <div class="chart-container-adv" style="height:280px; padding:18px;">
      <div class="chart-title-adv">🍕 Principal vs Interest</div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">Blue is your loan amount. Orange is total interest.</div>
      <div class="chart-canvas-wrapper"><canvas id="apply-pie-chart"></canvas></div>
    </div>
    <div class="chart-container-adv" style="height:280px; padding:18px;">
      <div class="chart-title-adv">🕸️ Credit Risk Profile</div>
      <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">Analysis of Income, History, and Stability.</div>
      <div class="chart-canvas-wrapper"><canvas id="apply-radar-chart"></canvas></div>
    </div>
  </div>

  <div style="display:flex; gap:12px; margin-bottom:30px;">
    <button class="btn btn-primary" onclick="userNav('loans')" style="flex:1.5; height: 48px;">📄 View My Loans</button>
    <button class="btn btn-outline" onclick="editApplication()" style="flex:1; height: 48px;">✏️ Modify Application</button>
    <button class="btn btn-outline" onclick="resetApplyForm()" style="flex:1; height: 48px;">🆕 Apply New</button>
  </div>`;


  const container = document.getElementById('apply-result-container');
  if (container) {
    container.innerHTML = resultHtml;

    setTimeout(() => {
      try {
        new Chart(document.getElementById('apply-result-chart'), {
          type: 'doughnut',
          data: { datasets: [{ data: [d.approval_probability, 100 - d.approval_probability], backgroundColor: [color, '#f1f5f9'], cutout: '75%', circumference: 180, rotation: 270 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        new Chart(document.getElementById('apply-pie-chart'), {
          type: 'pie',
          data: { labels: ['P','I'], datasets: [{ data: [d.loan_amount, totalInt], backgroundColor: ['#1d4ed8', '#f59e0b'] }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        new Chart(document.getElementById('apply-radar-chart'), {
          type: 'polarArea',
          data: { labels: ['H','I','S','R'], datasets: [{ data: [d.credit_score/10, d.approval_probability, 80, 70], backgroundColor: ['#1d4ed899','#22c55e99','#8b5cf699','#f59e0b99'] }] },
          options: { responsive: true, maintainAspectRatio: false, scales: { r: { display: false } }, plugins: { legend: { display: false } } }
        });
      } catch(e) {}
    }, 100);
  }
}

function editApplication() {
  localStorage.removeItem('nb_apply_result_data');
  loadUserPage('apply');
  showToast('✏️ You can now modify your application', 'info');
}

function updateLoanInfo() {
  const lt = document.getElementById('a-loan-type')?.value;
  if (!lt) return;
  const info = LOANS[lt];
  if (info) showToast(`${info.icon} ${lt}: ${fmtPct(info.rate*100)} p.a.`, 'info');
}

async function showLoanRequirements() {
  userNav('checklist');
}
