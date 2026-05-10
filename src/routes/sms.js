const router = require('express').Router();
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const { sendSms, buildReminderMessage } = require('../services/smsService');

const prisma = new PrismaClient();

router.use(authenticate);

const sendSchema = z.object({
  emiId: z.string().uuid().optional(),
  loanId: z.string().uuid().optional(),
}).refine((d) => d.emiId || d.loanId, { message: 'Provide emiId or loanId' });

router.post('/send', async (req, res, next) => {
  try {
    const { emiId, loanId } = sendSchema.parse(req.body);

    const emis = emiId
      ? [await prisma.emi.findUnique({ where: { id: emiId }, include: { loan: { include: { borrower: true } } } })]
      : await prisma.emi.findMany({
          where: { loanId, status: { in: ['pending', 'partial'] } },
          include: { loan: { include: { borrower: true } } },
        });

    const results = [];
    for (const emi of emis.filter(Boolean)) {
      const message = buildReminderMessage(
        emi.loan.borrower.name,
        emi.emiAmount,
        emi.dueDate,
        emi.loanId
      );
      try {
        await sendSms(emi.loan.borrower.phone, message);
        await prisma.reminderLog.create({ data: { emiId: emi.id, status: 'sent', message } });
        results.push({ emiId: emi.id, status: 'sent' });
      } catch (err) {
        await prisma.reminderLog.create({ data: { emiId: emi.id, status: 'failed', message } });
        results.push({ emiId: emi.id, status: 'failed', error: err.message });
      }
    }

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
