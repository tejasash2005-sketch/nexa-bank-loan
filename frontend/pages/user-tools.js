/* NexaBank Pro — User Tools Pages */

// ── EMI CALCULATOR ────────────────────────────────────────────────────
function renderEMICalc() {
  const main = document.getElementById('user-main');
  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#eff6ff">🧮</div>
  <div><div class="page-header-title">EMI Calculator</div><div class="page-header-sub">Calculate exact EMI and amortization schedule</div></div></div>
  <div class="card">
    <div class="card-header">🔢 Loan Parameters</div>
    <div class="form-row-3">
      <div class="form-group"><label>Loan Type</label>
        <select id="ec-type" onchange="calcEMILive()">
          ${Object.keys(LOANS).map(n=>`<option value="${n}">${LOANS[n].icon} ${n}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Loan Amount (₹)</label>
        <input type="number" id="ec-amount" value="500000" min="10000" max="50000000" oninput="calcEMILive()"/>
      </div>
      <div class="form-group"><label>Interest Rate (% p.a.)</label>
        <input type="number" id="ec-rate" value="12" min="1" max="30" step="0.1" oninput="calcEMILive()"/>
      </div>
    </div>
    <div class="form-group"><label>Tenure (months): <span id="ec-tenure-label">24</span></label>
      <input type="range" id="ec-tenure" min="3" max="360" value="24" oninput="document.getElementById('ec-tenure-label').textContent=this.value;calcEMILive()"/>
    </div>
  </div>

  <div id="emi-result"></div>`;

  // Bind loan type to rate
  document.getElementById('ec-type').addEventListener('change', function() {
    const info = LOANS[this.value];
    if (info) {
      document.getElementById('ec-rate').value = (info.rate * 100).toFixed(2);
      document.getElementById('ec-tenure').value = info.tenure;
      document.getElementById('ec-tenure-label').textContent = info.tenure;
    }
    calcEMILive();
  });
  calcEMILive();
}

function calcEMILive() {
  const amt    = parseFloat(document.getElementById('ec-amount').value) || 0;
  const rate   = parseFloat(document.getElementById('ec-rate').value) / 100 || 0;
  const months = parseInt(document.getElementById('ec-tenure').value) || 12;
  if (!amt || !rate) return;

  const emi     = emiCalc(amt, rate, months);
  const total   = emi * months;
  const interest = total - amt;
  const sched   = buildLoanSchedule(amt, rate, Math.min(months, 60));

  document.getElementById('emi-result').innerHTML = `
  <div class="metrics-grid">
    <div class="metric-card border-blue"><div class="metric-num">${fmtCur(emi)}</div><div class="metric-lbl">Monthly EMI</div></div>
    <div class="metric-card border-orange"><div class="metric-num">${fmtCur(interest)}</div><div class="metric-lbl">Total Interest</div></div>
    <div class="metric-card border-green"><div class="metric-num">${fmtCur(total)}</div><div class="metric-lbl">Total Payable</div></div>
    <div class="metric-card border-purple"><div class="metric-num">${((interest/amt)*100).toFixed(1)}%</div><div class="metric-lbl">Interest %</div></div>
  </div>

  <div class="chart-wrap">
    <canvas id="emi-chart" height="200"></canvas>
  </div>

  <div class="card">
    <div class="card-header">📅 Amortization Schedule (${Math.min(months,60)} months shown)</div>
    <div class="table-wrap"><table>
      <tr><th>Month</th><th>Principal</th><th>Interest</th><th>Balance</th></tr>
      ${sched.map(r=>`<tr><td>${r.month}</td><td>${fmtCur(r.principal)}</td><td>${fmtCur(r.interest)}</td><td>${fmtCur(r.balance)}</td></tr>`).join('')}
    </table></div>
  </div>`;

  // Chart
  try {
    const ctx = document.getElementById('emi-chart').getContext('2d');
    if (window._emiChart) window._emiChart.destroy();
    window._emiChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sched.map(r => 'M'+r.month),
        datasets: [
          {label:'Principal',data:sched.map(r=>r.principal),backgroundColor:'#1d4ed8cc'},
          {label:'Interest', data:sched.map(r=>r.interest), backgroundColor:'#f59e0bcc'}
        ]
      },
      options: {responsive:true,plugins:{title:{display:true,text:'Principal vs Interest Breakdown'}},scales:{x:{stacked:true},y:{stacked:true}}}
    });
  } catch {}
}

// ── COMPARE LOANS ─────────────────────────────────────────────────────
function renderCompare() {
  const main = document.getElementById('user-main');
  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#f0fdf4">⚖️</div>
  <div><div class="page-header-title">Compare Loans</div><div class="page-header-sub">Side-by-side loan comparison</div></div></div>
  <div class="card">
    <div class="form-row-3">
      <div class="form-group"><label>Loan 1</label><select id="cmp-1" onchange="updateCompare()">${Object.keys(LOANS).map((n,i)=>`<option ${i===0?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="form-group"><label>Loan 2</label><select id="cmp-2" onchange="updateCompare()">${Object.keys(LOANS).map((n,i)=>`<option ${i===1?'selected':''}>${n}</option>`).join('')}</select></div>
      <div class="form-group"><label>Loan Amount (₹)</label><input type="number" id="cmp-amount" value="500000" oninput="updateCompare()"/></div>
    </div>
  </div>
  <div id="compare-result"></div>`;
  updateCompare();
}

function updateCompare() {
  const l1 = document.getElementById('cmp-1').value;
  const l2 = document.getElementById('cmp-2').value;
  const amt = parseFloat(document.getElementById('cmp-amount').value) || 500000;
  const i1 = LOANS[l1], i2 = LOANS[l2];
  if (!i1 || !i2) return;

  const emi1 = emiCalc(amt, i1.rate, i1.tenure);
  const emi2 = emiCalc(amt, i2.rate, i2.tenure);
  const tot1 = emi1 * i1.tenure, tot2 = emi2 * i2.tenure;
  const int1 = tot1 - amt, int2 = tot2 - amt;

  document.getElementById('compare-result').innerHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px">
    ${[{l:l1,i:i1,emi:emi1,tot:tot1,int:int1},{l:l2,i:i2,emi:emi2,tot:tot2,int:int2}].map(d=>`
    <div class="card" style="text-align:center">
      <div style="font-size:40px;margin-bottom:8px">${d.i.icon}</div>
      <div style="font-size:18px;font-weight:800;margin-bottom:16px">${d.l}</div>
      <div class="metric-card border-blue" style="margin-bottom:8px"><div class="metric-num">${fmtCur(d.emi)}</div><div class="metric-lbl">Monthly EMI</div></div>
      <div class="metric-card border-orange" style="margin-bottom:8px"><div class="metric-num">${fmtCur(d.int)}</div><div class="metric-lbl">Total Interest</div></div>
      <div class="metric-card border-green"><div class="metric-num">${fmtCur(d.tot)}</div><div class="metric-lbl">Total Payable</div></div>
      <div style="margin-top:12px;font-size:13px;color:#64748b">Rate: ${(d.i.rate*100).toFixed(2)}% | Tenure: ${d.i.tenure} months</div>
    </div>`).join('')}
  </div>

  <div class="chart-wrap">
    <canvas id="compare-chart" height="220"></canvas>
  </div>

  <div class="card" style="background:#f0fdf4;border-color:#bbf7d0;padding:16px 20px">
    <strong>💡 Recommendation:</strong> ${int1 < int2 ? `<strong>${l1}</strong> saves you ${fmtCur(int2-int1)} in interest` : `<strong>${l2}</strong> saves you ${fmtCur(int1-int2)} in interest`}
  </div>`;

  // Comparison Chart
  try {
    const ctx = document.getElementById('compare-chart').getContext('2d');
    if (window._cmpChart) window._cmpChart.destroy();
    window._cmpChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: [l1, l2],
        datasets: [
          { label: 'Principal', data: [amt, amt], backgroundColor: '#1d4ed8cc' },
          { label: 'Total Interest', data: [int1, int2], backgroundColor: '#f59e0bcc' }
        ]
      },
      options: {
        responsive: true,
        plugins: { title: { display: true, text: 'Total Repayment Comparison' } },
        scales: { x: { stacked: true }, y: { stacked: true } }
      }
    });
  } catch(e) { console.error('Chart error:', e); }
}

// ── CREDIT SCORE BOOSTER ──────────────────────────────────────────────
function renderCredit() {
  const main = document.getElementById('user-main');
  const score = 700;
  const pct = ((score-300)/600*100).toFixed(0);
  const col = score >= 750 ? '#16a34a' : score >= 650 ? '#d97706' : '#dc2626';
  const lbl = score >= 750 ? 'Excellent' : score >= 700 ? 'Good' : score >= 650 ? 'Fair' : 'Poor';

  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#eff6ff">📊</div>
  <div><div class="page-header-title">Credit Score Booster</div><div class="page-header-sub">Track and improve your credit health</div></div></div>

  <div class="card" style="text-align:center;padding:36px">
    <div style="font-size:72px;font-weight:800;color:${col}">${score}</div>
    <div style="font-size:18px;font-weight:700;color:${col};margin-bottom:16px">${lbl}</div>
    <div class="elig-bar" style="max-width:400px;margin:0 auto 8px;height:16px">
      <div class="elig-fill" style="width:${pct}%;background:${col}"></div>
    </div>
    <div style="display:flex;justify-content:space-between;max-width:400px;margin:0 auto;font-size:12px;color:#94a3b8">
      <span>300 Poor</span><span>500 Fair</span><span>700 Good</span><span>900 Excellent</span>
    </div>
  </div>

  <div class="card">
    <div class="card-header">💡 Tips to Improve Your Score</div>
    ${[
      ['✅','Pay all EMIs on time','Each on-time payment positively impacts your score'],
      ['💳','Keep credit utilization below 30%','High utilization hurts your score'],
      ['🔍','Check your credit report regularly','Dispute errors to correct inaccuracies'],
      ['📅','Maintain old credit accounts','Credit age improves your profile'],
      ['🚫','Avoid multiple loan applications','Too many hard enquiries lower your score'],
      ['💰','Pay off existing debts','Reduce outstanding balances systematically'],
    ].map(([ico,tip,desc])=>`
    <div style="display:flex;gap:14px;align-items:flex-start;background:#f8fafc;border-radius:10px;padding:14px;margin:6px 0">
      <span style="font-size:20px">${ico}</span>
      <div><div style="font-weight:700;color:#1e293b;font-size:14px">${tip}</div><div style="font-size:13px;color:#64748b;margin-top:3px">${desc}</div></div>
    </div>`).join('')}
  </div>

  <div class="card">
    <div class="card-header">📊 Score Breakdown (Estimated)</div>
    <div class="metrics-grid">
      <div class="metric-card border-green"><div class="metric-num">35%</div><div class="metric-lbl">Payment History</div></div>
      <div class="metric-card border-blue"><div class="metric-num">30%</div><div class="metric-lbl">Credit Utilization</div></div>
      <div class="metric-card border-purple"><div class="metric-num">15%</div><div class="metric-lbl">Credit Age</div></div>
      <div class="metric-card border-orange"><div class="metric-num">20%</div><div class="metric-lbl">Credit Mix</div></div>
    </div>
  </div>`;
}

// ── ELIGIBILITY CHECK ─────────────────────────────────────────────────
function renderEligibility() {
  const main = document.getElementById('user-main');
  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#eff6ff">🏦</div>
  <div><div class="page-header-title">Loan Eligibility Check</div><div class="page-header-sub">Find out how much you can borrow</div></div></div>
  <div class="card">
    <div class="card-header">📋 Your Financial Profile</div>
    <div class="form-row-3">
      <div class="form-group"><label>Monthly Income (₹)</label><input type="number" id="el-income" value="50000"/></div>
      <div class="form-group"><label>Existing EMI (₹/month)</label><input type="number" id="el-emi" value="0"/></div>
      <div class="form-group"><label>CIBIL Score</label><input type="number" id="el-cibil" value="700" min="300" max="900"/></div>
    </div>
    <div class="form-row-3">
      <div class="form-group"><label>Age</label><input type="number" id="el-age" value="30" min="18" max="65"/></div>
      <div class="form-group"><label>Tenure (years)</label><input type="number" id="el-tenure" value="10" min="1" max="30"/></div>
      <div class="form-group" style="align-self:flex-end"><button class="btn btn-primary btn-full" onclick="checkEligibility()">🔍 Check Eligibility</button></div>
    </div>
  </div>
  <div id="elig-result"></div>`;
}

async function checkEligibility() {
  const params = new URLSearchParams({
    income:       document.getElementById('el-income').value,
    existing_emi: document.getElementById('el-emi').value,
    cibil:        document.getElementById('el-cibil').value,
    age:          document.getElementById('el-age').value,
    tenure:       document.getElementById('el-tenure').value,
  });
  const data = await apiGet('/loans/eligibility?' + params);
  if (!data) return;
  const pct = data.score_factor;
  const col = pct >= 70 ? '#16a34a' : pct >= 40 ? '#d97706' : '#dc2626';

  document.getElementById('elig-result').innerHTML = `
  <div class="metrics-grid">
    <div class="metric-card border-blue"><div class="metric-num">${fmtCur(data.available_income)}</div><div class="metric-lbl">Available for EMI</div></div>
    <div class="metric-card border-purple"><div class="metric-num">${fmtCur(data.max_emi)}</div><div class="metric-lbl">Max Monthly EMI</div></div>
    <div class="metric-card border-${data.eligible?'green':'red'}"><div class="metric-num">${data.eligible?'✅ Yes':'❌ No'}</div><div class="metric-lbl">Eligible</div></div>
    <div class="metric-card border-orange"><div class="metric-num">${data.cibil}</div><div class="metric-lbl">CIBIL Score</div></div>
  </div>

  <div class="card">
    <div style="margin-bottom:16px">
      <div style="font-size:13px;color:#64748b;font-weight:600;margin-bottom:6px">OVERALL ELIGIBILITY SCORE</div>
      <div class="elig-bar"><div class="elig-fill" style="width:${pct}%;background:${col}"></div></div>
      <div style="color:${col};font-weight:700;font-size:14px;margin-top:4px">${pct}% — ${pct>=80?'Excellent':pct>=60?'Good':pct>=40?'Fair':'Poor'}</div>
    </div>
  </div>

  <div class="card">
    <div class="card-header">📊 Eligibility by Loan Type</div>
    <div class="table-wrap"><table>
      <tr><th>Loan Type</th><th>Max Amount</th><th>Rate</th><th>Status</th></tr>
      ${(data.results||[]).map(r=>`
      <tr>
        <td>${LOANS[r.loan_type]?LOANS[r.loan_type].icon:''} ${r.loan_type}</td>
        <td style="font-weight:700;color:#1d4ed8">${fmtCur(r.max_amount)}</td>
        <td>${r.rate_pct}</td>
        <td>${r.eligible?'<span class="badge badge-approved">✅ Eligible</span>':'<span class="badge badge-rejected">❌ Not Eligible</span>'}</td>
      </tr>`).join('')}
    </table></div>
  </div>`;
}

// ── PRE-CLOSURE CALCULATOR ────────────────────────────────────────────
function renderPreclosure() {
  const main = document.getElementById('user-main');
  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#f0fdf4">📈</div>
  <div><div class="page-header-title">Pre-Closure Calculator</div><div class="page-header-sub">Calculate savings if you close loan early</div></div></div>
  <div class="card">
    <div class="card-header">🔢 Loan Details</div>
    <div class="form-row-3">
      <div class="form-group"><label>Loan Type</label><select id="pc-type" onchange="updatePCRate()">${Object.keys(LOANS).map(n=>`<option>${n}</option>`).join('')}</select></div>
      <div class="form-group"><label>Original Loan Amount (₹)</label><input type="number" id="pc-amt" value="1000000"/></div>
      <div class="form-group"><label>Interest Rate (% p.a.)</label><input type="number" id="pc-rate" value="12" step="0.1"/></div>
    </div>
    <div class="form-row-3">
      <div class="form-group"><label>Original Tenure (months)</label><input type="number" id="pc-months" value="60" min="3"/></div>
      <div class="form-group"><label>EMIs Already Paid</label><input type="number" id="pc-paid" value="12" min="0"/></div>
      <div class="form-group"><label>Pre-closure Penalty (%)</label><input type="number" id="pc-penalty" value="2" step="0.1" min="0" max="5"/></div>
    </div>
    <button class="btn btn-primary" onclick="calcPreclosure()">📊 Calculate</button>
  </div>
  <div id="pc-result"></div>`;
}

function updatePCRate() {
  const info = LOANS[document.getElementById('pc-type').value];
  if (info) {
    document.getElementById('pc-rate').value = (info.rate * 100).toFixed(2);
    document.getElementById('pc-months').value = info.tenure;
  }
}

async function calcPreclosure() {
  const data = await apiPost('/loans/preclosure', {
    principal:   parseFloat(document.getElementById('pc-amt').value),
    rate:        parseFloat(document.getElementById('pc-rate').value),
    months:      parseInt(document.getElementById('pc-months').value),
    paid:        parseInt(document.getElementById('pc-paid').value),
    penalty_pct: parseFloat(document.getElementById('pc-penalty').value),
  });
  if (!data || data.error) { showToast('Calculation failed', 'error'); return; }

  document.getElementById('pc-result').innerHTML = `
  <div class="metrics-grid">
    <div class="metric-card border-blue"><div class="metric-num">${fmtCur(data.outstanding)}</div><div class="metric-lbl">Outstanding Balance</div></div>
    <div class="metric-card border-orange"><div class="metric-num">${fmtCur(data.penalty_amount)}</div><div class="metric-lbl">Pre-closure Penalty</div></div>
    <div class="metric-card border-red"><div class="metric-num">${fmtCur(data.total_preclosure)}</div><div class="metric-lbl">Total to Pay Now</div></div>
    <div class="metric-card border-${data.recommend_preclosure?'green':'orange'}"><div class="metric-num">${fmtCur(data.net_saving)}</div><div class="metric-lbl">Net Savings</div></div>
  </div>
  <div class="card" style="background:${data.recommend_preclosure?'#f0fdf4':'#fefce8'};border-color:${data.recommend_preclosure?'#bbf7d0':'#fef08a'}">
    ${data.recommend_preclosure
      ? `<strong style="color:#16a34a">🎉 Recommendation: Pre-close your loan!</strong><br><span style="color:#475569">You will save ${fmtCur(data.net_saving)} in interest. Pre-closure amount: ${fmtCur(data.total_preclosure)}</span>`
      : `<strong style="color:#d97706">⚠️ Continue regular EMIs</strong><br><span style="color:#475569">The penalty exceeds interest savings. Consider paying extra principal instead.</span>`}
  </div>`;
}

// ── SUPPORT TICKETS ───────────────────────────────────────────────────
async function renderSupport() {
  const main = document.getElementById('user-main');
  main.innerHTML = `<div class="page-loader">⏳ Loading…</div>`;
  const tickets = await apiGet('/user/support');

  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#fef2f2">🆘</div>
  <div><div class="page-header-title">Support Tickets</div><div class="page-header-sub">Raise issues, track resolutions 24×7</div></div></div>

  <div class="card">
    <div class="card-header">➕ Raise New Ticket</div>
    <div class="form-row-3">
      <div class="form-group"><label>Category</label>
        <select id="st-cat">
          <option>Loan Status Query</option><option>EMI Payment Issue</option><option>KYC Problem</option>
          <option>Document Upload</option><option>Account Issue</option><option>Disbursement Delay</option>
          <option>Interest Rate Query</option><option>Pre-closure Request</option><option>Fraud Report</option><option>General Inquiry</option>
        </select>
      </div>
      <div class="form-group"><label>Priority</label>
        <select id="st-pri"><option>Low</option><option selected>Medium</option><option>High</option><option>Urgent</option></select>
      </div>
      <div class="form-group"><label>Subject</label><input type="text" id="st-subj" placeholder="Brief subject…"/></div>
    </div>
    <div class="form-group"><label>Description</label><textarea id="st-desc" placeholder="Describe your issue in detail…"></textarea></div>
    <button class="btn btn-primary" onclick="submitTicket()">🚀 Submit Ticket</button>
  </div>

  <div class="card">
    <div class="card-header">📋 My Tickets (${(tickets||[]).length})</div>
    ${!(tickets||[]).length ? '<div style="color:#94a3b8">No tickets yet</div>' :
    (tickets||[]).reverse().map(t => {
      const statusColors = {Open:'#dc2626',Resolved:'#16a34a','In Progress':'#d97706',Closed:'#64748b'};
      const col = statusColors[t.status]||'#64748b';
      return `<div class="ticket-card">
        <div class="ticket-header">
          <div><span class="ticket-id">${t.ticket_id}</span> <strong style="margin-left:8px">${t.subject}</strong></div>
          <span style="color:${col};font-weight:700;font-size:13px">${t.status}</span>
        </div>
        <div style="font-size:13px;color:#64748b">Category: ${t.category} | Priority: ${t.priority} | ${fmtDate(t.created_at)}</div>
        <div style="font-size:13px;color:#475569;margin-top:8px">${t.description}</div>
        ${t.resolution ? `<div style="background:#f0fdf4;border-radius:8px;padding:10px;margin-top:8px;font-size:13px"><strong style="color:#16a34a">Resolution:</strong> ${t.resolution}</div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

async function submitTicket() {
  const data = await apiPost('/user/support', {
    category:    document.getElementById('st-cat').value,
    priority:    document.getElementById('st-pri').value,
    subject:     document.getElementById('st-subj').value,
    description: document.getElementById('st-desc').value,
  });
  if (data && data.ticket_id) {
    showToast('✅ Ticket ' + data.ticket_id + ' raised!', 'success');
    renderSupport();
  } else {
    showToast((data && data.error) || 'Failed to create ticket', 'error');
  }
}

// ── SAVINGS PLANNER ───────────────────────────────────────────────────
async function renderSavings() {
  const main = document.getElementById('user-main');
  main.innerHTML = `<div class="page-loader">⏳ Loading…</div>`;
  const goals = await apiGet('/user/savings');

  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#f0fdf4">💹</div>
  <div><div class="page-header-title">Savings & Goal Planner</div><div class="page-header-sub">Plan deposits and track your financial goals</div></div></div>

  <div class="card">
    <div class="card-header">🎯 Create Savings Goal</div>
    <div class="form-row">
      <div class="form-group"><label>Plan Type</label>
        <select id="sg-plan">
          <option>Recurring Deposit (RD)</option><option>Fixed Deposit (FD)</option>
          <option>SIP</option><option>Emergency Fund</option>
          <option>Down Payment Fund</option><option>Education Fund</option><option>Retirement Fund</option>
        </select>
      </div>
      <div class="form-group"><label>Interest Rate (% p.a.)</label><input type="number" id="sg-rate" value="7.5" step="0.25" min="1" max="15" oninput="calcSavings()"/></div>
    </div>
    <div class="form-row-3">
      <div class="form-group"><label>Monthly Contribution (₹)</label><input type="number" id="sg-monthly" value="5000" oninput="calcSavings()"/></div>
      <div class="form-group"><label>Tenure (months)</label><input type="number" id="sg-tenure" value="60" min="6" max="360" oninput="calcSavings()"/></div>
      <div class="form-group"><label>Target Goal Amount (₹)</label><input type="number" id="sg-goal" value="0" oninput="calcSavings()"/></div>
    </div>

    <div id="savings-preview"></div>

    <div class="chart-container-adv" style="height:280px; margin-top:10px; padding: 15px;">
      <div class="chart-title-adv">📈 Growth Projection & Loan Comparison</div>
      <div style="font-size:11px; color:#64748b; margin-bottom:10px;">Compare your savings growth against various loan cost trends.</div>
      <div class="chart-canvas-wrapper"><canvas id="savings-line-chart"></canvas></div>
    </div>

    <button class="btn btn-primary" onclick="saveSavingsGoal()" style="margin-top:15px">💾 Save Goal</button>
  </div>

  <div class="card">
    <div class="card-header">📊 My Savings Goals (${(goals||[]).length})</div>
    ${!(goals||[]).length ? '<div style="color:#94a3b8">No goals yet. Create your first one above!</div>' :
    (goals||[]).map(g => {
      const progress = g.goal_amount > 0 ? Math.min(100, (g.current_amount / g.goal_amount * 100)).toFixed(0) : 0;
      return `<div class="goal-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <strong>${g.plan_name}</strong>
          <span class="badge badge-${g.status==='Active'?'active':'closed'}">${g.status}</span>
        </div>
        <div style="font-size:13px;color:#64748b">
          Monthly: ${fmtCur(g.monthly_amount)} | Rate: ${g.interest_rate}% | Target: ${fmtCur(g.goal_amount)} | Matures: ${fmtDate(g.maturity_date)}
        </div>
        ${g.goal_amount > 0 ? `<div class="goal-progress"><div class="goal-fill" style="width:${progress}%"></div></div><div style="font-size:12px;color:#1d4ed8;font-weight:700">${progress}% complete</div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
  calcSavings();
}

function calcSavings() {
  const monthly = parseFloat(document.getElementById('sg-monthly').value) || 0;
  const rateAnnual = parseFloat(document.getElementById('sg-rate').value) || 0;
  const rateMonthly = rateAnnual / 12 / 100;
  const months  = parseInt(document.getElementById('sg-tenure').value) || 0;
  const goal    = parseFloat(document.getElementById('sg-goal').value) || 0;
  if (!monthly || !months) return;

  const fv       = monthly * ((Math.pow(1+rateMonthly, months) - 1) / rateMonthly) * (1+rateMonthly);
  const invested = monthly * months;
  const earned   = fv - invested;
  const progress = goal > 0 ? Math.min(100, fv/goal*100).toFixed(0) : 0;
  const col      = progress >= 100 ? '#16a34a' : '#1d4ed8';

  document.getElementById('savings-preview').innerHTML = `
  <div class="metrics-grid" style="margin-top:16px">
    <div class="metric-card border-blue"><div class="metric-num">${fmtCur(invested)}</div><div class="metric-lbl">Total Invested</div></div>
    <div class="metric-card border-green"><div class="metric-num">${fmtCur(earned)}</div><div class="metric-lbl">Interest Earned</div></div>
    <div class="metric-card border-purple"><div class="metric-num">${fmtCur(fv)}</div><div class="metric-lbl">Maturity Value</div></div>
    ${goal > 0 ? `<div class="metric-card border-${progress>=100?'green':'orange'}"><div class="metric-num">${progress}%</div><div class="metric-lbl">Goal Progress</div></div>` : ''}
  </div>
  ${goal > 0 ? `<div class="elig-bar"><div class="elig-fill" style="width:${Math.min(100,progress)}%;background:${col}"></div></div>` : ''}`;

  // Update Line Chart
  updateSavingsChart(monthly, rateAnnual, months);
}

function updateSavingsChart(monthly, rateAnnual, totalMonths) {
  const ctx = document.getElementById('savings-line-chart').getContext('2d');
  if (window._savingsChart) window._savingsChart.destroy();

  const labels = [];
  const savingsData = [];
  const pLoanData = [];
  const hLoanData = [];
  const gLoanData = [];
  const bLoanData = [];

  const rateMonthly = rateAnnual / 12 / 100;
  const step = totalMonths > 60 ? 12 : 6;

  for (let m = 0; m <= totalMonths; m += step) {
    labels.push('Month ' + m);

    // Savings Path
    const fv = m === 0 ? 0 : monthly * ((Math.pow(1+rateMonthly, m) - 1) / rateMonthly) * (1+rateMonthly);
    savingsData.push(Math.round(fv));

    // Comparative trends for All Loan Types
    const calculateCost = (amt, rateKey) => {
      const r = LOANS[rateKey].rate / 12;
      const t = LOANS[rateKey].tenure;
      const emi = amt * r * Math.pow(1+r, t) / (Math.pow(1+r, t) - 1);
      return Math.round(emi * Math.min(m, t));
    };

    pLoanData.push(calculateCost(500000, "Personal Loan"));
    hLoanData.push(calculateCost(2000000, "Home Loan"));
    gLoanData.push(calculateCost(300000, "Gold Loan"));
    bLoanData.push(calculateCost(1000000, "Business Loan"));
  }

  window._savingsChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        { label: 'Your Savings Path', data: savingsData, borderColor: '#1d4ed8', backgroundColor: '#1d4ed822', borderWidth: 4, fill: true, tension: 0.4 },
        { label: 'Personal Loan Cost (5L)', data: pLoanData, borderColor: '#f59e0b', borderDash: [5, 5], fill: false },
        { label: 'Home Loan Cost (20L)', data: hLoanData, borderColor: '#7c3aed', borderDash: [5, 5], fill: false },
        { label: 'Gold Loan Cost (3L)', data: gLoanData, borderColor: '#10b981', borderDash: [5, 5], fill: false },
        { label: 'Business Loan Cost (10L)', data: bLoanData, borderColor: '#ef4444', borderDash: [5, 5], fill: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 9 }, padding: 5 } },
        tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${fmtCur(ctx.raw)}` } }
      },
      scales: {
        y: { ticks: { callback: (v) => '₹' + fmt(v), font: { size: 9 } } },
        x: { ticks: { font: { size: 9 } } }
      }
    }
  });
}

async function saveSavingsGoal() {
  const data = await apiPost('/user/savings', {
    plan_name:      document.getElementById('sg-plan').value,
    monthly_amount: parseFloat(document.getElementById('sg-monthly').value),
    interest_rate:  parseFloat(document.getElementById('sg-rate').value),
    goal_amount:    parseFloat(document.getElementById('sg-goal').value),
    tenure_months:  parseInt(document.getElementById('sg-tenure').value),
  });
  if (data && data.id) {
    showToast('✅ Savings goal saved!', 'success');
    renderSavings();
  } else {
    showToast((data && data.error) || 'Failed to save goal', 'error');
  }
}

// ── INSURANCE ─────────────────────────────────────────────────────────
function renderInsurance() {
  const main = document.getElementById('user-main');
  const plans = [
    {ico:'🏥',name:'Health Shield',desc:'Covers EMI during hospitalization (up to 6 months)',price:'₹299/month',badge:'Most Popular',col:'#1d4ed8',benefits:['Cashless at 5,000+ hospitals','Up to ₹10L coverage','No medical test up to 40 yrs']},
    {ico:'👤',name:'Life Cover',desc:'Outstanding loan repaid on death or total disability',price:'0.5% of loan p.a.',badge:'Recommended',col:'#16a34a',benefits:['Decreasing term insurance','Accidental death rider','Waiver of premium']},
    {ico:'💼',name:'Job Loss Cover',desc:'EMI paid for 6 months if involuntarily unemployed',price:'₹199/month',badge:'Popular',col:'#d97706',benefits:['IRDAI approved','30-day waiting period','Up to 6 EMIs covered']},
    {ico:'🔥',name:'Property Shield',desc:'Covers property against fire, flood, earthquake',price:'0.1% of property value',badge:'For Home Loans',col:'#7c3aed',benefits:['Natural disasters covered','Rebuild cost basis','Quick claim settlement']},
    {ico:'🤝',name:'Critical Illness',desc:'Lump sum on 30+ critical illnesses',price:'₹399/month',badge:'Add-on',col:'#0891b2',benefits:['Cancer, heart, stroke','Survival benefit 30 days','Tax benefit u/s 80D']},
  ];
  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#fefce8">🛡️</div>
  <div><div class="page-header-title">Insurance & Benefits</div><div class="page-header-sub">Protect your loan and family with insurance</div></div></div>
  <div class="insurance-grid">
    ${plans.map(p=>`
    <div class="ins-card" style="border-top:3px solid ${p.col}">
      <div class="ins-icon">${p.ico}</div>
      <div class="ins-name">${p.name}</div>
      <div class="ins-desc">${p.desc}</div>
      <div class="ins-price" style="color:${p.col}">${p.price}</div>
      <ul style="text-align:left;font-size:12px;color:#475569;list-style:none;padding:0;margin-bottom:14px">
        ${p.benefits.map(b=>`<li>• ${b}</li>`).join('')}
      </ul>
      <div class="ins-badge" style="background:${p.col}">${p.badge}</div>
      <br><button class="btn btn-outline btn-sm" style="margin-top:12px" onclick="showToast('Insurance enquiry sent for ${p.name}!','success')">Enquire Now</button>
    </div>`).join('')}
  </div>`;
}

// ── PROFILE ───────────────────────────────────────────────────────────
function renderProfile() {
  const user = getUser() || {};
  const main = document.getElementById('user-main');
  main.innerHTML = `
  <div class="page-header"><div class="page-header-icon" style="background:#eff6ff">⚙️</div>
  <div><div class="page-header-title">Profile Settings</div><div class="page-header-sub">Manage your account preferences</div></div></div>

  <div class="profile-section">
    <div class="profile-avatar">👤</div>
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:20px;font-weight:800">${user.name||user.username}</div>
      <div style="color:#64748b">${user.email||''}</div>
      <div class="badge badge-user" style="margin-top:6px">CUSTOMER</div>
    </div>

    <div class="card-header">✏️ Update Profile</div>
    <div class="form-row">
      <div class="form-group"><label>Full Name</label><input type="text" id="pr-name" value="${user.name||''}"/></div>
      <div class="form-group"><label>Phone</label><input type="text" id="pr-phone" value="${user.phone||''}"/></div>
    </div>
    <div class="form-group"><label>Language</label>
      <select id="pr-lang">
        ${Object.entries(LANGUAGES).map(([k,v])=>`<option value="${v}" ${v===user.lang?'selected':''}>${k}</option>`).join('')}
      </select>
    </div>
    <button class="btn btn-primary" onclick="updateProfile()">💾 Save Changes</button>
  </div>

  <div class="profile-section">
    <div class="card-header">🔒 Change Password</div>
    <div class="form-row-3">
      <div class="form-group"><label>Current Password</label><input type="password" id="pr-old-pw" placeholder="Current password"/></div>
      <div class="form-group"><label>New Password</label><input type="password" id="pr-new-pw" placeholder="New password (min 6)"/></div>
      <div class="form-group" style="align-self:flex-end"><button class="btn btn-danger" onclick="changePassword()">🔑 Update Password</button></div>
    </div>
  </div>

  <div class="profile-section" style="background:#f8fafc">
    <div class="card-header">📊 Account Info</div>
    <div class="form-row">
      <div><div style="font-size:13px;color:#64748b">Username</div><div style="font-weight:700">${user.username||'—'}</div></div>
      <div><div style="font-size:13px;color:#64748b">Email</div><div style="font-weight:700">${user.email||'—'}</div></div>
      <div><div style="font-size:13px;color:#64748b">Role</div><div style="font-weight:700">${user.role||'user'}</div></div>
    </div>
  </div>`;
}

async function updateProfile() {
  const data = await apiPut('/me/profile', {
    name:  document.getElementById('pr-name').value,
    phone: document.getElementById('pr-phone').value,
    lang:  document.getElementById('pr-lang').value,
  });
  if (data && data.user) {
    setUser({...getUser(), ...data.user});
    showToast('✅ Profile updated!', 'success');
  } else {
    showToast((data && data.error) || 'Update failed', 'error');
  }
}

async function changePassword() {
  const data = await apiPost('/me/change-password', {
    old_password: document.getElementById('pr-old-pw').value,
    new_password: document.getElementById('pr-new-pw').value,
  });
  if (data && !data.error) {
    showToast('✅ Password changed!', 'success');
    document.getElementById('pr-old-pw').value = '';
    document.getElementById('pr-new-pw').value = '';
  } else {
    showToast((data && data.error) || 'Change failed', 'error');
  }
}
