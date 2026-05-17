/* NexaBank Pro — Admin Portal Pages */

// Global object to store chart instances for cleanup
window._adminCharts = window._adminCharts || {};

function destroyCharts() {
  Object.values(window._adminCharts).forEach(chart => {
    if (chart && typeof chart.destroy === 'function') chart.destroy();
  });
  window._adminCharts = {};
}

async function loadAdminPage(page) {
  const main = document.getElementById('admin-main');
  if (!main) return;

  destroyCharts();
  main.innerHTML = `<div class="page-loader">⏳ Synchronizing ${page} Data…</div>`;

  try {
    switch (page) {
      case 'dashboard':    await renderAdminDash(); break;
      case 'applications': await renderAdminApps(); break;
      case 'kyc':          await renderAdminKYC();  break;
      case 'payments':     await renderAdminPayments(); break;
      case 'users':        await renderAdminUsers(); break;
      case 'analytics':    await renderAdminAnalytics(); break;
      case 'tickets':      await renderAdminTickets(); break;
      case 'audit':        await renderAdminAudit(); break;
      default: main.innerHTML = '<div class="card">Page not found</div>';
    }
  } catch (err) {
    console.error(`Error loading admin page ${page}:`, err);
    main.innerHTML = `<div class="error-msg">Failed to load ${page}. Connection timeout or server error.</div>`;
  }
}

// ── DASHBOARD ─────────────────────────────────────────────────────────
async function renderAdminDash() {
  const main = document.getElementById('admin-main');
  const d = await apiGet('/admin/stats');
  if (!d) return;

  // Calculate Approval Rate
  const appRate = d.total_loans > 0 ? ((d.approved / d.total_loans) * 100).toFixed(1) : 0;

  main.innerHTML = `
  <div class="page-header" style="padding:18px 25px; margin-bottom:20px; border-left: 5px solid #1d4ed8">
    <div class="page-header-icon" style="background:#eff6ff; color:#1d4ed8; width:45px; height:45px; font-size:22px">📊</div>
    <div>
      <div class="page-header-title" style="font-size:20px; letter-spacing:-0.5px">Executive Overview</div>
      <div class="page-header-sub">Real-time portfolio performance & risk metrics</div>
    </div>
    <div style="margin-left:auto; text-align:right">
        <div style="font-size:10px; color:#94a3b8; font-weight:800; text-transform:uppercase">System Status</div>
        <div style="color:#16a34a; font-weight:800; font-size:13px">● Fully Operational</div>
    </div>
  </div>

  <!-- Primary KPIs -->
  <div class="metrics-grid" style="margin-bottom:20px">
    <div class="metric-card border-blue shadow-sm">
      <div class="metric-icon">📁</div>
      <div class="metric-num">${d.total_loans}</div>
      <div class="metric-lbl">Total Applications</div>
    </div>
    <div class="metric-card border-green shadow-sm">
      <div class="metric-icon">🎯</div>
      <div class="metric-num">${appRate}%</div>
      <div class="metric-lbl">Approval Rate</div>
    </div>
    <div class="metric-card border-purple shadow-sm">
      <div class="metric-icon">💰</div>
      <div class="metric-num">${fmtCur(d.total_collected)}</div>
      <div class="metric-lbl">Collections</div>
    </div>
    <div class="metric-card border-orange shadow-sm">
      <div class="metric-icon">⏳</div>
      <div class="metric-num">${d.under_review}</div>
      <div class="metric-lbl">Under Review</div>
    </div>
  </div>

  <!-- Charts Section -->
  <div class="charts-grid-3" style="margin-bottom:20px">
    <div class="chart-container-adv">
      <div class="chart-title-adv"><span>📈</span> Application Velocity</div>
      <div class="chart-canvas-wrapper"><canvas id="trend-chart"></canvas></div>
    </div>
    <div class="chart-container-adv">
      <div class="chart-title-adv"><span>⚖️</span> Portfolio Status</div>
      <div class="chart-canvas-wrapper"><canvas id="status-chart"></canvas></div>
    </div>
    <div class="chart-container-adv">
      <div class="chart-title-adv"><span>⚠️</span> Risk Distribution</div>
      <div class="chart-canvas-wrapper"><canvas id="risk-chart"></canvas></div>
    </div>
  </div>

  <div style="display:grid; grid-template-columns: 1fr 2fr; gap:20px">
    <!-- Secondary Metrics -->
    <div style="display:flex; flex-direction:column; gap:15px">
        <div class="card shadow-sm" style="padding:15px; margin-bottom:0">
            <div style="color:#64748b; font-size:10px; font-weight:800; margin-bottom:10px; text-transform:uppercase">Infrastructure</div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                <span style="font-size:13px; color:#475569">KYC Verified</span>
                <span style="font-weight:800; color:#16a34a">${d.kyc_verified}</span>
            </div>
            <div style="display:flex; justify-content:space-between; margin-bottom:8px">
                <span style="font-size:13px; color:#475569">Total Customers</span>
                <span style="font-weight:800; color:#1d4ed8">${d.total_users}</span>
            </div>
            <div style="display:flex; justify-content:space-between">
                <span style="font-size:13px; color:#475569">Support Tickets</span>
                <span style="font-weight:800; color:#dc2626">${d.open_tickets}</span>
            </div>
        </div>
        <div class="chart-container-adv" style="height:225px">
            <div class="chart-title-adv"><span>💳</span> Payment Methods</div>
            <div class="chart-canvas-wrapper"><canvas id="method-chart"></canvas></div>
        </div>
    </div>

    <!-- Loan Type Table -->
    <div class="card shadow-sm" style="padding:0; margin-bottom:0; overflow:hidden">
        <div style="padding:15px 20px; background:#f8fafc; border-bottom:1px solid #e2e8f0; display:flex; justify-content:space-between; align-items:center">
            <span style="font-weight:800; font-size:13px; color:#1e293b; text-transform:uppercase">Portfolio by Loan Category</span>
            <span class="badge-user" style="font-size:10px">Active Products: ${d.by_type.length}</span>
        </div>
        <div class="table-wrap" style="border:none; border-radius:0">
            <table style="font-size:13px">
                <thead style="background:#fff">
                    <tr><th style="padding:12px 20px">Category</th><th style="padding:12px 20px">Apps</th><th style="padding:12px 20px">Total Exposure</th></tr>
                </thead>
                <tbody>
                    ${(d.by_type||[]).slice(0,6).map(r=>`
                    <tr>
                        <td style="padding:12px 20px"><strong>${LOANS[r.loan_type]?LOANS[r.loan_type].icon:''} ${r.loan_type}</strong></td>
                        <td style="padding:12px 20px">${r.count}</td>
                        <td style="padding:12px 20px; font-weight:700; color:#1d4ed8">${fmtCur(r.total)}</td>
                    </tr>`).join('')}
                </tbody>
            </table>
        </div>
    </div>
  </div>`;

  renderDashCharts(d);
}

function renderDashCharts(d) {
  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }
    }
  };

  try {
    // 1. Velocity Trend (Line)
    const vCtx = document.getElementById('trend-chart')?.getContext('2d');
    if (vCtx) {
      const gradient = vCtx.createLinearGradient(0, 0, 0, 200);
      gradient.addColorStop(0, 'rgba(29, 78, 216, 0.15)');
      gradient.addColorStop(1, 'rgba(29, 78, 216, 0)');

      window._adminCharts.trend = new Chart(vCtx, {
        type: 'line',
        data: {
          labels: d.monthly_trend.map(t => t.month),
          datasets: [{
            data: d.monthly_trend.map(t => t.count),
            borderColor: '#1d4ed8',
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            backgroundColor: gradient,
            pointBackgroundColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4
          }]
        },
        options: {
            ...chartDefaults,
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 } } },
                x: { grid: { display: false }, ticks: { font: { size: 9 } } }
            }
        }
      });
    }

    // 2. Status Breakdown (Doughnut)
    const sCtx = document.getElementById('status-chart')?.getContext('2d');
    if (sCtx) {
      window._adminCharts.status = new Chart(sCtx, {
        type: 'doughnut',
        data: {
          labels: d.by_status.map(s => s.loan_status),
          datasets: [{
            data: d.by_status.map(s => s.count),
            backgroundColor: ['#22c55e','#ef4444','#f59e0b','#1d4ed8','#8b5cf6','#64748b'],
            borderWidth: 0,
            hoverOffset: 10
          }]
        },
        options: {
            ...chartDefaults,
            plugins: {
                legend: { display: true, position: 'bottom', labels: { boxWidth: 8, padding: 10, font: { size: 10, weight: 600 } } }
            },
            cutout: '72%'
        }
      });
    }

    // 3. Risk Distribution (Bar)
    const rCtx = document.getElementById('risk-chart')?.getContext('2d');
    if (rCtx) {
      window._adminCharts.risk = new Chart(rCtx, {
        type: 'bar',
        data: {
          labels: d.by_risk.map(r => r.risk_level),
          datasets: [{
            data: d.by_risk.map(r => r.count),
            backgroundColor: ['#22c55e','#f59e0b','#ef4444'],
            borderRadius: 6,
            barThickness: 30
          }]
        },
        options: {
            ...chartDefaults,
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 } } },
                x: { grid: { display: false }, ticks: { font: { size: 10, weight: 700 } } }
            }
        }
      });
    }

    // 4. Payment Methods (Pie)
    const mCtx = document.getElementById('method-chart')?.getContext('2d');
    if (mCtx) {
        window._adminCharts.method = new Chart(mCtx, {
          type: 'pie',
          data: {
            labels: d.by_method.map(m => m.method),
            datasets: [{
                data: d.by_method.map(m => m.count),
                backgroundColor: ['#10b981','#3b82f6','#8b5cf6','#f59e0b'],
                borderWidth: 2,
                borderColor: '#fff'
            }]
          },
          options: {
              ...chartDefaults,
              plugins: {
                legend: { display: true, position: 'right', labels: { boxWidth: 10, font: { size: 10 } } }
              }
          }
        });
    }
  } catch(e) { console.error("Chart Render Error:", e); }
}

// ── APPLICATIONS ──────────────────────────────────────────────────────
async function renderAdminApps() {
  const main = document.getElementById('admin-main');
  const data = await apiGet('/admin/predictions');
  if (!data) return;

  main.innerHTML = `
  <div class="page-header" style="padding:15px 20px; margin-bottom:15px">
    <div class="page-header-icon" style="background:#eff6ff; width:40px; height:40px; font-size:20px">📋</div>
    <div>
      <div class="page-header-title" style="font-size:18px">Application Queue</div>
      <div class="page-header-sub">Management console for loan underwriting</div>
    </div>
  </div>

  <div class="card shadow-sm" style="padding:15px; margin-bottom:15px">
    <div class="form-row-3" style="margin-bottom:0; gap:12px">
      <div class="form-group"><label style="font-size:11px">Lifecycle Status</label>
        <select id="app-filter-status" onchange="filterApps()" style="padding:8px; font-size:12px; border-radius:8px">
          <option value="">All Statuses</option>
          <option>Under Review</option><option>Approved</option><option>Rejected</option>
          <option>Disbursed</option><option>Active</option><option>Closed</option>
        </select>
      </div>
      <div class="form-group"><label style="font-size:11px">Asset Category</label>
        <select id="app-filter-type" onchange="filterApps()" style="padding:8px; font-size:12px; border-radius:8px">
          <option value="">All Types</option>
          ${Object.keys(LOANS).map(n=>`<option>${n}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label style="font-size:11px">Entity Search</label>
        <input type="text" id="app-search" placeholder="Username or Name…" oninput="filterApps()" style="padding:8px; font-size:12px; border-radius:8px"/>
      </div>
    </div>
  </div>

  <div id="apps-list"></div>`;

  window._allApps = data || [];
  filterApps();
}

function filterApps() {
  const data   = window._allApps || [];
  const status = document.getElementById('app-filter-status').value;
  const type   = document.getElementById('app-filter-type').value;
  const search = (document.getElementById('app-search').value || '').toLowerCase();

  const filtered = data.filter(a =>
    (!status || a.loan_status === status) &&
    (!type   || a.loan_type   === type)   &&
    (!search || (a.name||'').toLowerCase().includes(search) || (a.username||'').toLowerCase().includes(search))
  );

  const list = document.getElementById('apps-list');
  if (!filtered.length) {
      list.innerHTML = '<div class="card shadow-sm" style="text-align:center;padding:50px;color:#94a3b8">📭 No applications match your current filters</div>';
      return;
  }

  list.innerHTML = filtered.map(a => `
  <div class="expander shadow-sm" style="margin-bottom:10px; border-radius:12px">
    <div class="expander-header" onclick="toggleExpander(this)" style="padding:12px 18px">
      <div style="display:flex;align-items:center;gap:12px;width:100%">
        <span style="font-size:18px">${LOANS[a.loan_type]?LOANS[a.loan_type].icon:'🔹'}</span>
        <span style="font-weight:800;font-size:14px;color:#1e293b">#${a.id}</span>
        <span style="font-size:13px;flex:1;color:#475569;font-weight:600">${a.name||a.username}</span>
        <span style="font-weight:800;color:#1d4ed8;font-size:14px;margin-right:15px">${fmtCur(a.loan_amount)}</span>
        ${getStatusBadge(a.loan_status)}
      </div>
      <span class="expander-arrow" style="margin-left:15px">▼</span>
    </div>
    <div class="expander-body" style="padding:20px; background:#fafbff; border-top:1px solid #f1f5f9">
      <div class="metrics-grid" style="grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px">
        <div class="metric-card shadow-sm" style="padding:12px"><div class="metric-num" style="font-size:16px">${a.credit_score||'—'}</div><div class="metric-lbl" style="font-size:9px">Bureau Score</div></div>
        <div class="metric-card shadow-sm" style="padding:12px"><div class="metric-num" style="font-size:16px">${fmtPct(a.approval_probability)}</div><div class="metric-lbl" style="font-size:9px">AI Confidence</div></div>
        <div class="metric-card shadow-sm" style="padding:12px"><div class="metric-num" style="font-size:16px">${a.risk_level||'—'}</div><div class="metric-lbl" style="font-size:9px">Risk Profile</div></div>
        <div class="metric-card shadow-sm" style="padding:12px"><div class="metric-num" style="font-size:16px">${a.age||'—'}</div><div class="metric-lbl" style="font-size:9px">Applicant Age</div></div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:20px">
        <div style="background:#fff; padding:15px; border-radius:12px; border:1px solid #e2e8f0">
            <div style="color:#64748b; font-weight:800; font-size:10px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px">Customer Dossier</div>
            <div style="font-size:13px; margin-bottom:4px; color:#1e293b"><strong>UID:</strong> ${a.username}</div>
            <div style="font-size:13px; margin-bottom:4px; color:#1e293b"><strong>Income:</strong> ${fmtCur(a.applicant_income)}</div>
            <div style="font-size:13px; color:#1e293b"><strong>Applied:</strong> ${fmtDate(a.applied_date)}</div>
        </div>
        <div style="background:#fff; padding:15px; border-radius:12px; border:1px solid #e2e8f0">
            <div style="color:#64748b; font-weight:800; font-size:10px; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px">Risk Assessment</div>
            <div style="font-size:13px; margin-bottom:4px; color:#1e293b"><strong>Stage:</strong> ${a.lifecycle_stage||'—'}</div>
            <div style="font-size:13px; margin-bottom:4px; color:#1e293b"><strong>Purpose:</strong> ${a.purpose||'—'}</div>
            <div style="font-size:13px; color:#1e293b"><strong>Fraud:</strong> ${a.fraud_flag?'<span style="color:#dc2626;font-weight:800">⚠️ Flagged</span>':'<span style="color:#16a34a;font-weight:800">✅ Clear</span>'}</div>
        </div>
      </div>

      <div style="background:#eff6ff;padding:12px 18px;border-radius:10px;margin-bottom:20px;display:flex;gap:20px;align-items:center;font-size:12px">
        <div style="font-weight:800; color:#1d4ed8">📁 Vault Documents:</div>
        <div style="display:flex; gap:15px">
            ${a.aadhaar_file ? `<a href="/api/user/docs/${a.aadhaar_file}" target="_blank" style="color:#1d4ed8; font-weight:700">📄 Aadhaar Card</a>` : '<span style="color:#94a3b8">Missing Aadhaar</span>'}
            ${a.pan_file ? `<a href="/api/user/docs/${a.pan_file}" target="_blank" style="color:#1d4ed8; font-weight:700">📄 PAN Card</a>` : '<span style="color:#94a3b8">Missing PAN</span>'}
            ${a.kyc_bank_file ? `<a href="/api/user/docs/${a.kyc_bank_file}" target="_blank" style="color:#1d4ed8; font-weight:700">📄 Bank Statement</a>` : '<span style="color:#94a3b8">Missing Bank Info</span>'}
        </div>
      </div>

      <div style="display:flex;gap:10px;flex-wrap:wrap; align-items:center">
        <input type="text" id="notes-${a.id}" placeholder="Underwriter comments…" style="flex:1;min-width:200px;padding:12px;border:1px solid #e2e8f0;border-radius:10px;font-size:13px"/>
        <button class="btn btn-success btn-sm" onclick="updateAppStatus(${a.id},'Approved','notes-${a.id}', this)" style="border-radius:8px">✅ Approve</button>
        <button class="btn btn-danger btn-sm" onclick="updateAppStatus(${a.id},'Rejected','notes-${a.id}', this)" style="border-radius:8px">❌ Reject</button>
        <button class="btn btn-primary btn-sm" onclick="updateAppStatus(${a.id},'Disbursed','notes-${a.id}', this)" style="border-radius:8px">💰 Disburse</button>
      </div>
    </div>
  </div>`).join('');
}

async function updateAppStatus(id, status, notesId, btn) {
  const notes = document.getElementById(notesId)?.value || '';
  const oldTxt = btn.innerHTML;
  btn.disabled = true; btn.innerHTML = '⏳ Processing…';
  const data  = await apiPut(`/admin/predictions/${id}/status`, { status, notes });
  if (data && !data.error) {
    showToast(`Success: Application #${id} status changed to ${status}`, 'success');
    renderAdminApps();
  } else {
    showToast(data?.error || 'Underwriting update failed', 'error');
    btn.disabled = false; btn.innerHTML = oldTxt;
  }
}

// ── KYC ──────────────────────────────────────────────────────────────
async function renderAdminKYC() {
  const main = document.getElementById('admin-main');
  const data = await apiGet('/admin/kyc');
  if (!data) return;

  const records = data || [];
  main.innerHTML = `
  <div class="page-header" style="padding:15px 20px; margin-bottom:15px">
    <div class="page-header-icon" style="background:#f0fdf4; width:40px; height:40px; font-size:20px">🔐</div>
    <div><div class="page-header-title" style="font-size:18px">Identity Verification</div><div class="page-header-sub">Compliance & KYC validation desk</div></div>
  </div>
  <div class="card shadow-sm" style="padding:0; overflow:hidden"><div class="table-wrap" style="border:none"><table>
    <thead style="background:#f8fafc"><tr><th style="padding:15px">Customer</th><th style="padding:15px">OTP</th><th style="padding:15px">Bank Profile</th><th style="padding:15px">Account #</th><th style="padding:15px">Status</th><th style="padding:15px">Action</th></tr></thead>
    <tbody>
      ${records.map(k=>`<tr>
        <td style="padding:12px 15px; font-size:13px"><strong>${k.username}</strong><br><small style="color:#64748b">${k.phone||'—'}</small></td>
        <td style="padding:12px 15px">${k.otp_verified?'<span style="color:#16a34a">✅ Verified</span>':'<span style="color:#dc2626">❌ Unverified</span>'}</td>
        <td style="padding:12px 15px; font-size:12px; font-weight:600">${k.bank_name||'—'}</td>
        <td style="padding:12px 15px; font-size:12px; font-family:monospace; color:#475569">${k.account_number||'—'}</td>
        <td style="padding:12px 15px">${k.kyc_status==='Verified'?'<span class="badge badge-approved">Verified</span>':'<span class="badge badge-review">Review Pending</span>'}</td>
        <td style="padding:12px 15px">${k.kyc_status!=='Verified'?`<button class="btn btn-success btn-sm" onclick="verifyKYCAdmin(${k.id}, this)" style="border-radius:6px">Approve KYC</button>`:'<span style="color:#16a34a; font-weight:800; font-size:11px">✅ VALIDATED</span>'}</td>
      </tr>`).join('')}
    </tbody>
  </table></div></div>`;
}

async function verifyKYCAdmin(id, btn) {
  btn.disabled = true;
  const data = await apiPut(`/admin/kyc/${id}/verify`, {});
  if (data && !data.error) { showToast('KYC Verification Finalized', 'success'); renderAdminKYC(); }
}

// ── PAYMENTS ──────────────────────────────────────────────────────────
async function renderAdminPayments() {
  const main = document.getElementById('admin-main');
  const data = await apiGet('/admin/payments');
  if (!data) return;

  main.innerHTML = `
  <div class="page-header" style="padding:15px 20px; margin-bottom:15px">
    <div class="page-header-icon" style="background:#fdf4ff; width:40px; height:40px; font-size:20px">💳</div>
    <div><div class="page-header-title" style="font-size:18px">Transaction Ledger</div><div class="page-header-sub">System-wide EMI collection history</div></div>
  </div>
  <div class="card shadow-sm" style="padding:0; overflow:hidden"><div class="table-wrap" style="border:none"><table>
    <thead style="background:#f8fafc"><tr><th style="padding:15px">Entity</th><th style="padding:15px">Instalment #</th><th style="padding:15px">Method</th><th style="padding:15px">Total Paid</th><th style="padding:15px">Value Date</th><th style="padding:15px">Status</th></tr></thead>
    <tbody>
      ${data.map(p=>`<tr>
        <td style="padding:12px 15px; font-size:13px"><strong>${p.username}</strong></td>
        <td style="padding:12px 15px; font-size:12px">Month ${p.month_number}</td>
        <td style="padding:12px 15px; font-size:12px; font-weight:600">${p.payment_method||'Gateway'}</td>
        <td style="padding:12px 15px; font-weight:800; color:#16a34a; font-size:14px">${fmtCur(p.total_paid)}</td>
        <td style="padding:12px 15px; font-size:11px; color:#64748b">${fmtDate(p.paid_date)}</td>
        <td style="padding:12px 15px"><span class="badge badge-approved" style="font-size:10px">✅ Settled</span></td>
      </tr>`).join('')}
    </tbody>
  </table></div></div>`;
}

// ── USERS ─────────────────────────────────────────────────────────────
async function renderAdminUsers() {
  const main = document.getElementById('admin-main');
  const data = await apiGet('/admin/users');
  if (!data) return;

  main.innerHTML = `
  <div class="page-header" style="padding:15px 20px; margin-bottom:15px">
    <div class="page-header-icon" style="background:#eff6ff; width:40px; height:40px; font-size:20px">👥</div>
    <div><div class="page-header-title" style="font-size:18px">User Governance</div><div class="page-header-sub">Access control and account management</div></div>
  </div>
  <div class="card shadow-sm" style="padding:0; overflow:hidden"><div class="table-wrap" style="border:none"><table>
    <thead style="background:#f8fafc"><tr><th style="padding:15px">System Principal</th><th style="padding:15px">Full Name</th><th style="padding:15px">Role</th><th style="padding:15px">Account Status</th><th style="padding:15px">Last Authentication</th></tr></thead>
    <tbody>
      ${data.map(u=>`<tr>
        <td style="padding:12px 15px; font-size:13px"><strong>${u.username}</strong></td>
        <td style="padding:12px 15px; font-size:13px; color:#475569">${u.name||'—'}</td>
        <td style="padding:12px 15px"><span class="${u.role==='admin'?'badge-admin':'badge-user'}">${u.role.toUpperCase()}</span></td>
        <td style="padding:12px 15px">${u.is_active?'<span style="color:#16a34a; font-weight:700">● Active</span>':'<span style="color:#dc2626; font-weight:700">○ Disabled</span>'}</td>
        <td style="padding:12px 15px; font-size:11px; color:#64748b">${fmtDate(u.last_login)}</td>
      </tr>`).join('')}
    </tbody>
  </table></div></div>`;
}

// ── ANALYTICS ─────────────────────────────────────────────────────────
async function renderAdminAnalytics() {
  const main = document.getElementById('admin-main');
  const d    = await apiGet('/admin/stats');
  if (!d) return;

  main.innerHTML = `
  <div class="page-header" style="padding:18px 25px; margin-bottom:20px; border-left: 5px solid #10b981">
    <div class="page-header-icon" style="background:#f0fdf4; color:#10b981; width:45px; height:45px; font-size:22px">📈</div>
    <div><div class="page-header-title" style="font-size:20px; letter-spacing:-0.5px">Advanced Business Intelligence</div><div class="page-header-sub">Portfolio concentration, risk vectors, and growth analytics</div></div>
  </div>

  <div class="charts-grid-3" style="gap:20px; margin-bottom:20px">
    <div class="chart-container-adv" style="height:320px"><div class="chart-title-adv"><span>📊</span> Application Velocity (12M)</div><div class="chart-canvas-wrapper"><canvas id="an-trend"></canvas></div></div>
    <div class="chart-container-adv" style="height:320px"><div class="chart-title-adv"><span>🥧</span> Portfolio Mix by Status</div><div class="chart-canvas-wrapper"><canvas id="an-status"></canvas></div></div>
    <div class="chart-container-adv" style="height:320px"><div class="chart-title-adv"><span>🛡️</span> Risk Exposure Matrix</div><div class="chart-canvas-wrapper"><canvas id="an-risk"></canvas></div></div>
  </div>

  <div class="charts-grid-3" style="gap:20px">
    <div class="chart-container-adv" style="height:320px"><div class="chart-title-adv"><span>💰</span> Payment Channel Analysis</div><div class="chart-canvas-wrapper"><canvas id="an-method"></canvas></div></div>
    <div class="chart-container-adv" style="height:320px"><div class="chart-title-adv"><span>🏷️</span> Volume by Product Class</div><div class="chart-canvas-wrapper"><canvas id="an-type"></canvas></div></div>
    <div class="chart-container-adv" style="height:320px"><div class="chart-title-adv"><span>🔝</span> Top Exposure by Entity</div><div class="chart-canvas-wrapper"><canvas id="an-top-users"></canvas></div></div>
  </div>`;

  renderAnalyticsCharts(d);
}

function renderAnalyticsCharts(d) {
  const commonOptions = { responsive:true, maintainAspectRatio:false };
  try {
    // 1. Line Trend
    const tCtx = document.getElementById('an-trend').getContext('2d');
    window._adminCharts.anTrend = new Chart(tCtx, {
      type: 'line',
      data: { labels: d.monthly_trend.map(t=>t.month), datasets: [{ label:'Volume', data:d.monthly_trend.map(t=>t.count), borderColor:'#1d4ed8', fill:true, backgroundColor:'rgba(29, 78, 216, 0.05)', tension:0.4, pointRadius:3 }] },
      options: { ...commonOptions, plugins:{legend:{display:false}}, scales:{y:{grid:{color:'#f1f5f9'}}, x:{grid:{display:false}}} }
    });

    // 2. Pie Status
    const sCtx = document.getElementById('an-status').getContext('2d');
    window._adminCharts.anStatus = new Chart(sCtx, {
      type: 'pie',
      data: { labels: d.by_status.map(s=>s.loan_status), datasets: [{ data:d.by_status.map(s=>s.count), backgroundColor: ['#22c55e','#ef4444','#f59e0b','#1d4ed8','#8b5cf6','#64748b'], borderWidth: 2, borderColor:'#fff' }] },
      options: { ...commonOptions, plugins:{legend:{position:'bottom', labels:{boxWidth:10, font:{size:10, weight:600}}}} }
    });

    // 3. Doughnut Risk
    const rCtx = document.getElementById('an-risk').getContext('2d');
    window._adminCharts.anRisk = new Chart(rCtx, {
      type: 'doughnut',
      data: { labels: d.by_risk.map(r=>r.risk_level), datasets: [{ data:d.by_risk.map(r=>r.count), backgroundColor: ['#22c55e','#f59e0b','#ef4444'], borderWidth: 0 }] },
      options: { ...commonOptions, cutout:'70%', plugins:{legend:{position:'bottom', labels:{boxWidth:10, font:{size:10, weight:600}}}} }
    });

    // 4. Method Pie
    const mCtx = document.getElementById('an-method').getContext('2d');
    window._adminCharts.anMethod = new Chart(mCtx, {
      type: 'pie',
      data: { labels: d.by_method.map(m=>m.method), datasets: [{ data:d.by_method.map(m=>m.count), backgroundColor: ['#10b981','#3b82f6','#8b5cf6','#f59e0b'], borderWidth: 2, borderColor:'#fff' }] },
      options: { ...commonOptions, plugins:{legend:{position:'bottom', labels:{boxWidth:10, font:{size:10, weight:600}}}} }
    });

    // 5. Bar Type
    const tyCtx = document.getElementById('an-type').getContext('2d');
    window._adminCharts.anType = new Chart(tyCtx, {
      type: 'bar',
      data: { labels: d.by_type.slice(0,6).map(t=>t.loan_type), datasets: [{ label:'Applications', data:d.by_type.slice(0,6).map(t=>t.count), backgroundColor:'#3b82f6', borderRadius:6 }] },
      options: { ...commonOptions, plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, grid:{color:'#f1f5f9'}}, x:{grid:{display:false}}} }
    });

    // 6. Top Users Bar
    const uCtx = document.getElementById('an-top-users').getContext('2d');
    window._adminCharts.anUsers = new Chart(uCtx, {
      type: 'bar',
      data: { labels: d.top_users.map(u=>u.username), datasets: [{ label:'Loan Exposure', data:d.top_users.map(u=>u.total), backgroundColor:'#8b5cf6', borderRadius:6 }] },
      options: { ...commonOptions, indexAxis:'y', plugins:{legend:{display:false}}, scales:{x:{grid:{color:'#f1f5f9'}}, y:{grid:{display:false}}} }
    });

  } catch(e) { console.error("BI Analytics Render Error:", e); }
}

// ── TICKETS ───────────────────────────────────────────────────────────
async function renderAdminTickets() {
  const main = document.getElementById('admin-main');
  const data = await apiGet('/admin/tickets');
  if (!data) return;

  main.innerHTML = `
  <div class="page-header" style="padding:15px 20px; margin-bottom:15px">
    <div class="page-header-icon" style="background:#fef2f2; width:40px; height:40px; font-size:20px">🆘</div>
    <div><div class="page-header-title" style="font-size:18px">Customer Resolution Desk</div><div class="page-header-sub">Manage and resolve system support tickets</div></div>
  </div>
  ${data.length === 0 ? '<div class="card shadow-sm" style="text-align:center;padding:60px;color:#94a3b8">📭 No active support tickets in queue</div>' : data.map(t => `
    <div class="expander shadow-sm" style="margin-bottom:10px; border-radius:12px">
      <div class="expander-header" onclick="toggleExpander(this)" style="padding:12px 18px">
        <span style="font-size:13px; font-weight:700; color:#1e293b; flex:1">#${t.ticket_id} | ${t.username} — <span style="font-weight:500; color:#475569">${t.subject}</span></span>
        <div style="display:flex; align-items:center; gap:10px">
            <span style="font-size:10px; font-weight:800; text-transform:uppercase; color:${t.priority==='Urgent'?'#dc2626':'#64748b'}">${t.priority}</span>
            ${t.status==='Resolved'?'<span class="badge badge-approved" style="font-size:10px">RESOLVED</span>':'<span class="badge badge-review" style="font-size:10px">OPEN</span>'}
        </div>
      </div>
      <div class="expander-body" style="padding:20px; background:#fafbff; border-top:1px solid #f1f5f9">
        <div style="font-size:13px; margin-bottom:20px; color:#1e293b; line-height:1.6; background:#fff; padding:15px; border-radius:10px; border:1px solid #e2e8f0">${t.description}</div>
        ${t.status!=='Resolved'?`
          <div class="form-group" style="margin-bottom:15px">
            <label style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase">Final Resolution</label>
            <textarea id="res-${t.ticket_id}" placeholder="Type technical resolution details for the customer…" style="width:100%; padding:12px; border-radius:10px; border:1px solid #e2e8f0; font-size:13px; min-height:100px"></textarea>
          </div>
          <button class="btn btn-success btn-sm" onclick="resolveTicket('${t.ticket_id}','res-${t.ticket_id}', this)" style="border-radius:8px">✅ Authorize Resolution</button>
        `: `<div style="background:#f0fdf4; padding:15px; border-radius:12px; border:1px solid #bbf7d0; color:#15803d; font-size:13px"><strong>✓ RESOLUTION:</strong> ${t.resolution}</div>`}
      </div>
    </div>
  `).join('')}`;
}

async function resolveTicket(tid, rid, btn) {
  const res = document.getElementById(rid).value.trim();
  if(!res) { showToast("Resolution description required", "error"); return; }
  btn.disabled = true; btn.innerHTML = '⏳ Processing…';
  const data = await apiPut(`/admin/tickets/${tid}/resolve`, { resolution: res });
  if(data && !data.error) { showToast('Ticket Resolved Successfully', 'success'); renderAdminTickets(); }
  else { btn.disabled = false; btn.innerHTML = '✅ Authorize Resolution'; }
}

// ── AUDIT LOG ─────────────────────────────────────────────────────────
async function renderAdminAudit() {
  const main = document.getElementById('admin-main');
  const data = await apiGet('/admin/audit');
  if (!data) return;

  main.innerHTML = `
  <div class="page-header" style="padding:15px 20px; margin-bottom:15px">
    <div class="page-header-icon" style="background:#f8fafc; width:40px; height:40px; font-size:20px">📜</div>
    <div><div class="page-header-title" style="font-size:18px">System Audit Trail</div><div class="page-header-sub">Immutable security and activity logs</div></div>
  </div>
  <div class="card shadow-sm" style="padding:0; overflow:hidden"><div class="table-wrap" style="border:none"><table>
    <thead style="background:#f8fafc"><tr><th style="padding:15px">Identity</th><th style="padding:15px">Event Class</th><th style="padding:15px">Transaction Context</th><th style="padding:15px">Timestamp</th></tr></thead>
    <tbody>
      ${data.map(a=>`<tr>
        <td style="padding:12px 15px; font-size:13px"><strong>${a.username||'SYSTEM'}</strong></td>
        <td style="padding:12px 15px"><span style="font-size:10px;font-weight:800;background:#eff6ff;color:#1d4ed8;padding:3px 8px;border-radius:6px;text-transform:uppercase">${a.action}</span></td>
        <td style="padding:12px 15px; font-size:12px; color:#475569">${a.details||'—'}</td>
        <td style="padding:12px 15px; font-size:11px; color:#64748b">${fmtDate(a.created_at)}</td>
      </tr>`).join('')}
    </tbody>
  </table></div></div>`;
}
