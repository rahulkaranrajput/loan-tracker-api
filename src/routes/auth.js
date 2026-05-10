const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const registerSchema = z.object({
  phone: z.string().min(10).max(10),
  pin: z.string().min(4).max(6),
  name: z.string().min(1),
});

const loginSchema = z.object({
  phone: z.string().min(10).max(10),
  pin: z.string().min(4).max(6),
});

router.post('/register', async (req, res, next) => {
  try {
    const { phone, pin, name } = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { phone } });
    if (existing) return res.status(409).json({ error: 'User already registered' });

    const hashed = await bcrypt.hash(pin, 10);
    const user = await prisma.user.create({ data: { phone, pin: hashed, name } });
    const token = jwt.sign({ id: user.id, phone: user.phone }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });
    res.status(201).json({ token, user: { id: user.id, name: user.name, phone: user.phone } });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { phone, pin } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !(await bcrypt.compare(pin, user.pin))) {
      return res.status(401).json({ error: 'Invalid phone or PIN' });
    }
    const token = jwt.sign({ id: user.id, phone: user.phone }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });
    res.json({ token, user: { id: user.id, name: user.name, phone: user.phone } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
