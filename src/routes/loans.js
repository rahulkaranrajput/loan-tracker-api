const router = require('express').Router();
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const { calculateEmiAmount, generateEmiSchedule } = require('../services/emiCalculator');

const prisma = new PrismaClient();

const loanSchema = z.object({
  borrowerId: z.string().uuid(),
  principalAmount: z.number().positive(),
  annualInterestRate: z.number().positive(),
  tenureMonths: z.number().int().positive(),
  startDate: z.string().datetime(),
  lateFeeAmount: z.number().min(0).default(0),
  gracePeriodDays: z.number().int().min(0).default(5),
});

const emiPaymentSchema = z.object({
  paidAmount: z.number().positive(),
  paidDate: z.string().datetime().optional(),
  applyLateFee: z.boolean().optional(),
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = status ? { status } : {};
    const loans = await prisma.loan.findMany({
      where,
      include: { borrower: { select: { name: true, phone: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(loans);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = { ...req.body, principalAmount: Number(req.body.principalAmount), annualInterestRate: Number(req.body.annualInterestRate), tenureMonths: Number(req.body.tenureMonths), lateFeeAmount: Number(req.body.lateFeeAmount || 0), gracePeriodDays: Number(req.body.gracePeriodDays || 5) };
    const data = loanSchema.parse(body);
    const emiAmount = calculateEmiAmount(data.principalAmount, data.annualInterestRate, data.tenureMonths);

    const loan = await prisma.loan.create({
      data: { ...data, startDate: new Date(data.startDate), emiAmount },
    });

    const schedule = generateEmiSchedule(
      loan.id,
      data.principalAmount,
      data.annualInterestRate,
      data.tenureMonths,
      new Date(data.startDate),
      emiAmount
    );

    await prisma.emi.createMany({ data: schedule });

    const result = await prisma.loan.findUnique({
      where: { id: loan.id },
      include: { borrower: { select: { name: true, phone: true } }, emis: { orderBy: { installmentNumber: 'asc' } } },
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: req.params.id },
      include: {
        borrower: true,
        emis: { orderBy: { installmentNumber: 'asc' } },
      },
    });
    if (!loan) return res.status(404).json({ error: 'Loan not found' });
    res.json(loan);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const allowed = ['status', 'lateFeeAmount', 'gracePeriodDays'];
    const data = Object.fromEntries(Object.entries(req.body).filter(([k]) => allowed.includes(k)));
    const loan = await prisma.loan.update({ where: { id: req.params.id }, data });
    res.json(loan);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.loan.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get('/:id/emis', async (req, res, next) => {
  try {
    const emis = await prisma.emi.findMany({
      where: { loanId: req.params.id },
      orderBy: { installmentNumber: 'asc' },
    });
    res.json(emis);
  } catch (err) {
    next(err);
  }
});

router.patch('/:loanId/emis/:emiId', async (req, res, next) => {
  try {
    const { paidAmount, paidDate, applyLateFee } = emiPaymentSchema.parse(req.body);

    const emi = await prisma.emi.findUnique({ where: { id: req.params.emiId } });
    if (!emi) return res.status(404).json({ error: 'EMI not found' });

    const loan = await prisma.loan.findUnique({ where: { id: req.params.loanId } });

    const lateFeeApplied = applyLateFee ? loan.lateFeeAmount : emi.lateFeeApplied;
    const status = paidAmount >= emi.emiAmount + lateFeeApplied ? 'paid' : 'partial';

    const updated = await prisma.emi.update({
      where: { id: req.params.emiId },
      data: {
        paidAmount,
        paidDate: paidDate ? new Date(paidDate) : new Date(),
        lateFeeApplied,
        status,
      },
    });

    const allEmis = await prisma.emi.findMany({ where: { loanId: req.params.loanId } });
    const allPaid = allEmis.every((e) => e.status === 'paid');
    if (allPaid) await prisma.loan.update({ where: { id: req.params.loanId }, data: { status: 'closed' } });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
