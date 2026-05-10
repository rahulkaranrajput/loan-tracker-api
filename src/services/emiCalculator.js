function calculateEmiAmount(principal, annualRate, tenureMonths) {
  const r = annualRate / 12 / 100;
  if (r === 0) return principal / tenureMonths;
  const emi = (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  return Math.round(emi * 100) / 100;
}

function generateEmiSchedule(loanId, principal, annualRate, tenureMonths, startDate, emiAmount) {
  const r = annualRate / 12 / 100;
  const schedule = [];
  let outstanding = principal;

  for (let i = 1; i <= tenureMonths; i++) {
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + i);

    const interestComponent = Math.round(outstanding * r * 100) / 100;
    const principalComponent = Math.round((emiAmount - interestComponent) * 100) / 100;
    outstanding = Math.round((outstanding - principalComponent) * 100) / 100;

    // Last EMI: absorb rounding difference
    const finalOutstanding = i === tenureMonths ? 0 : Math.max(0, outstanding);

    schedule.push({
      loanId,
      installmentNumber: i,
      dueDate,
      interestComponent,
      principalComponent,
      emiAmount,
      outstandingBalance: finalOutstanding,
      status: 'pending',
      lateFeeApplied: 0,
    });

    outstanding = finalOutstanding;
  }

  return schedule;
}

module.exports = { calculateEmiAmount, generateEmiSchedule };
