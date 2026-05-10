const router = require('express').Router();
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');
const authenticate = require('../middleware/auth');
const upload = require('../middleware/upload');

const prisma = new PrismaClient();

const borrowerSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(10).max(10),
  address: z.string().min(1),
  guarantorName: z.string().optional(),
  guarantorPhone: z.string().optional(),
});

router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const borrowers = await prisma.borrower.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(borrowers);
  } catch (err) {
    next(err);
  }
});

router.post('/', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'idProof', maxCount: 1 }]), async (req, res, next) => {
  try {
    const data = borrowerSchema.parse(req.body);
    if (req.files?.photo) data.photoUrl = `/uploads/${req.files.photo[0].filename}`;
    if (req.files?.idProof) data.idProofUrl = `/uploads/${req.files.idProof[0].filename}`;

    const borrower = await prisma.borrower.create({ data });
    res.status(201).json(borrower);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const borrower = await prisma.borrower.findUnique({
      where: { id: req.params.id },
      include: { loans: { select: { id: true, principalAmount: true, status: true, startDate: true } } },
    });
    if (!borrower) return res.status(404).json({ error: 'Borrower not found' });
    res.json(borrower);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', upload.fields([{ name: 'photo', maxCount: 1 }, { name: 'idProof', maxCount: 1 }]), async (req, res, next) => {
  try {
    const data = borrowerSchema.partial().parse(req.body);
    if (req.files?.photo) data.photoUrl = `/uploads/${req.files.photo[0].filename}`;
    if (req.files?.idProof) data.idProofUrl = `/uploads/${req.files.idProof[0].filename}`;

    const borrower = await prisma.borrower.update({ where: { id: req.params.id }, data });
    res.json(borrower);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await prisma.borrower.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
