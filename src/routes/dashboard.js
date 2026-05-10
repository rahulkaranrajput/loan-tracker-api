const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');

const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const today = new Date();
    const in3Days = new Date(today);
    in3Days.setDate(in3Days.getDate() + 3);

    const [activeLoans, totalLentResult, overdueEmis, upcomingEmis, totalCollected] = await Promise.all([
      prisma.loan.count({ where: { status: 'active' } }),
      prisma.loan.aggregate({ where: { status: 'active' }, _sum: { principalAmount: true } }),
      prisma.emi.findMany({
        where: { status: { in: ['pending', 'partial'] }, dueDate: { lt: today } },
        include: { loan: { include: { borrower: { select: { name: true, phone: true } } } } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.emi.findMany({
        where: { status: 'pending', dueDate: { gte: today, lte: in3Days } },
        include: { loan: { include: { borrower: { select: { name: true } } } } },
        orderBy: { dueDate: 'asc' },
      }),
      prisma.emi.aggregate({ where: { status: 'paid' }, _sum: { paidAmount: true } }),
    ]);

    res.json({
      activeLoans,
      totalLent: totalLentResult._sum.principalAmount || 0,
      overdueCount: overdueEmis.length,
      overdueEmis,
      upcomingEmis,
      totalCollected: totalCollected._sum.paidAmount || 0,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
