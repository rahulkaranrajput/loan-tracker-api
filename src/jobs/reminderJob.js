const cron = require('node-cron');
const { PrismaClient } = require('@prisma/client');
const { sendSms, buildReminderMessage } = require('../services/smsService');

const prisma = new PrismaClient();

async function sendDueReminders() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const in3Days = new Date(today);
  in3Days.setDate(in3Days.getDate() + 3);
  in3Days.setHours(23, 59, 59, 999);

  const dueEmis = await prisma.emi.findMany({
    where: {
      status: { in: ['pending', 'partial'] },
      dueDate: { gte: today, lte: in3Days },
    },
    include: { loan: { include: { borrower: true } }, reminderLogs: { where: { sentAt: { gte: today } } } },
  });

  for (const emi of dueEmis) {
    if (emi.reminderLogs.length > 0) continue;

    const message = buildReminderMessage(emi.loan.borrower.name, emi.emiAmount, emi.dueDate, emi.loanId);
    try {
      await sendSms(emi.loan.borrower.phone, message);
      await prisma.reminderLog.create({ data: { emiId: emi.id, status: 'sent', message } });
      console.log(`Reminder sent for EMI ${emi.id}`);
    } catch (err) {
      await prisma.reminderLog.create({ data: { emiId: emi.id, status: 'failed', message } });
      console.error(`Failed to send reminder for EMI ${emi.id}:`, err.message);
    }
  }
}

function startReminderJob() {
  // Daily at 9 AM
  cron.schedule('0 9 * * *', sendDueReminders, { timezone: 'Asia/Kolkata' });
  console.log('Reminder cron job scheduled (daily 9 AM IST)');
}

module.exports = { startReminderJob, sendDueReminders };
