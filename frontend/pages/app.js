/* NexaBank Pro — Main App Router */

async function loadUserPage(page) {
  const main = document.getElementById('user-main');
  if (!main) return;

  switch (page) {
    case 'apply':       main.innerHTML = renderApply(); updateLoanInfo(); break;
    case 'docs':        await renderDocCenter(); break;
    case 'checklist':   await renderChecklist(); break;
    case 'loans':       await renderMyLoans(); break;
    case 'payments':    await renderPayments(); break;
    case 'kyc':         await renderKYC(); break;
    case 'notifications': await renderNotifications(); break;
    case 'emi-calc':    renderEMICalc(); break;
    case 'compare':     renderCompare(); break;
    case 'credit':      renderCredit(); break;
    case 'eligibility': renderEligibility(); break;
    case 'preclosure':  renderPreclosure(); break;
    case 'support':     await renderSupport(); break;
    case 'savings':     await renderSavings(); break;
    case 'insurance':   renderInsurance(); break;
    case 'profile':     renderProfile(); break;
    default:
      main.innerHTML = renderApply();
      updateLoanInfo();
  }
}
