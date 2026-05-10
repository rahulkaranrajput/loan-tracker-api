require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./routes/auth');
const borrowerRoutes = require('./routes/borrowers');
const loanRoutes = require('./routes/loans');
const smsRoutes = require('./routes/sms');
const dashboardRoutes = require('./routes/dashboard');
const errorHandler = require('./middleware/errorHandler');
const { startReminderJob } = require('./jobs/reminderJob');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads')));

app.use('/auth', authRoutes);
app.use('/borrowers', borrowerRoutes);
app.use('/loans', loanRoutes);
app.use('/sms', smsRoutes);
app.use('/dashboard', dashboardRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Loan Tracker API running on port ${PORT}`);
  startReminderJob();
});

module.exports = app;
