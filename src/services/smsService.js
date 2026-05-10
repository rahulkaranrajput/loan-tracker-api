const axios = require('axios');

async function sendSms(phone, message) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey) throw new Error('FAST2SMS_API_KEY not configured');

  const response = await axios.post(
    'https://www.fast2sms.com/dev/bulkV2',
    {
      route: 'q',
      message,
      language: 'english',
      numbers: phone,
    },
    {
      headers: { authorization: apiKey },
    }
  );

  if (!response.data.return) {
    throw new Error(`Fast2SMS error: ${JSON.stringify(response.data)}`);
  }

  return response.data;
}

function buildReminderMessage(borrowerName, emiAmount, dueDate, loanId) {
  const date = new Date(dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  return `Dear ${borrowerName}, your EMI of Rs.${emiAmount} (Loan #${loanId.slice(-6).toUpperCase()}) is due on ${date}. Please pay on time. -Loan Tracker`;
}

module.exports = { sendSms, buildReminderMessage };
