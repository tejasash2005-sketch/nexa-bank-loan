/* NexaBank Pro — Frontend Config & Constants */
const API_BASE = '/api';

const LOANS = {
  "Personal Loan":        {rate:0.12, tenure:24,  icon:"👤",  desc:"For any personal need — medical, home, travel"},
  "Home Loan":            {rate:0.08, tenure:240, icon:"🏠",  desc:"Buy, construct or renovate your dream home"},
  "Car Loan":             {rate:0.10, tenure:60,  icon:"🚗",  desc:"Drive your dream car with easy EMIs"},
  "Education Loan":       {rate:0.09, tenure:120, icon:"🎓",  desc:"Invest in your future with education funding"},
  "Gold Loan":            {rate:0.11, tenure:12,  icon:"🥇",  desc:"Instant loan against your gold ornaments"},
  "Business Loan":        {rate:0.13, tenure:60,  icon:"💼",  desc:"Expand your business with working capital"},
  "Startup Loan":         {rate:0.15, tenure:72,  icon:"🚀",  desc:"Fuel your startup idea with seed funding"},
  "Travel Loan":          {rate:0.14, tenure:12,  icon:"✈️",  desc:"Plan your dream vacation without compromise"},
  "Medical Loan":         {rate:0.10, tenure:36,  icon:"🏥",  desc:"Emergency medical expenses covered instantly"},
  "Agriculture Loan":     {rate:0.07, tenure:60,  icon:"🌾",  desc:"Seasonal farming and equipment financing"},
  "Solar Energy Loan":    {rate:0.065,tenure:84,  icon:"☀️",  desc:"Go green with subsidized solar financing"},
  "Wedding Loan":         {rate:0.13, tenure:36,  icon:"💍",  desc:"Make your special day truly memorable"},
  "Debt Consolidation":   {rate:0.11, tenure:48,  icon:"🔗",  desc:"Merge multiple debts into one easy payment"},
  "Micro Business Loan":  {rate:0.12, tenure:24,  icon:"🏪",  desc:"Small entrepreneurs & street vendors"},
  "Vehicle Upgrade Loan": {rate:0.105,tenure:48,  icon:"🛵",  desc:"Upgrade to two-wheeler or EV"},
  "Loan Against Property":{rate:0.085,tenure:180, icon:"🏢",  desc:"Unlock the value of your property"},
  "Overdraft Facility":   {rate:0.135,tenure:12,  icon:"💳",  desc:"Flexible revolving credit line on demand"},
  "Senior Citizen Loan":  {rate:0.075,tenure:60,  icon:"👴",  desc:"Dedicated loans for pensioners at low rates"},
  "NRI Home Loan":        {rate:0.085,tenure:240, icon:"🌏",  desc:"Home loan specially designed for NRIs"},
  "Top-Up Loan":          {rate:0.115,tenure:36,  icon:"⬆️",  desc:"Additional loan on your existing active loan"},
};

const LANGUAGES = {
  "🇬🇧 English":"en","🇮🇳 हिन्दी":"hi","🇮🇳 தமிழ்":"ta","🇮🇳 తెలుగు":"te",
  "🇮🇳 বাংলা":"bn","🇮🇳 ಕನ್ನಡ":"kn","🇮🇳 മലയാളം":"ml","🇮🇳 ਪੰਜਾਬੀ":"pa",
  "🇮🇳 मराठी":"mr","🇫🇷 Français":"fr","🇩🇪 Deutsch":"de","🇪🇸 Español":"es",
  "🇸🇦 العربية":"ar","🇨🇳 中文":"zh","🇯🇵 日本語":"ja"
};

const LC_STEPS = [
  ["📋","Application Submitted"],["🔍","Document Verification"],
  ["🤖","AI Risk Assessment"],["🏦","Credit Bureau Check"],
  ["📝","Underwriting Review"],["✅","Final Approval"],
  ["💰","Loan Disbursement"],["🔄","Active Repayment"],["🎉","Loan Closed"]
];

const STATUS_STAGE = {
  "Under Review":2,"Approved":5,"Disbursed":6,"Active":7,"Closed":8,"Rejected":3
};

function fmt(n){return Number(n||0).toLocaleString('en-IN')}
function fmtCur(n){return '₹ '+fmt(n)}
function fmtPct(n){return (Number(n)||0).toFixed(1)+'%'}
function fmtDate(s){if(!s)return'—';try{return new Date(s).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}catch{return s}}

function emiCalc(principal,annualRate,months){
  const r=annualRate/12;
  if(r===0||months===0) return Math.round(principal/Math.max(months,1));
  return Math.round(principal*r*Math.pow(1+r,months)/(Math.pow(1+r,months)-1));
}

function buildLoanSchedule(principal,annualRate,months){
  const r=annualRate/12;
  const emi=emiCalc(principal,annualRate,months);
  let bal=principal,sched=[];
  for(let m=1;m<=months;m++){
    const ip=bal*r,pp=Math.max(emi-ip,0);
    bal=Math.max(bal-pp,0);
    sched.push({month:m,principal:Math.round(pp),interest:Math.round(ip),balance:Math.round(bal)});
  }
  return sched;
}

function getStatusBadge(status){
  const map={
    'Approved':'badge badge-approved','Rejected':'badge badge-rejected',
    'Disbursed':'badge badge-disbursed','Active':'badge badge-active',
    'Closed':'badge badge-closed','Under Review':'badge badge-review'
  };
  return `<span class="${map[status]||'badge badge-review'}">${status||'Under Review'}</span>`;
}

function getRiskBadge(risk){
  const map={'Low':'#16a34a','Medium':'#d97706','High':'#dc2626'};
  const col=map[risk]||'#94a3b8';
  return `<span style="background:${col}20;color:${col};border:1px solid ${col}40;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700">${risk||'—'}</span>`;
}
