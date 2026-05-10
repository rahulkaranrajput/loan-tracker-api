# LoanBook API

REST API backend for the **LoanBook** personal loan tracking app. Built with Node.js, Express, Prisma, and PostgreSQL.

## Features

- JWT authentication (phone + PIN)
- Borrower management with photo & ID proof uploads
- Compound interest EMI schedule generation
- Payment tracking with late fee support
- Automated SMS reminders via Fast2SMS (daily cron at 9 AM IST)
- Dashboard summary (total lent, overdue EMIs, upcoming EMIs)

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 LTS |
| Framework | Express.js |
| ORM | Prisma 6 |
| Database | PostgreSQL |
| Auth | JWT |
| SMS | Fast2SMS |
| Scheduler | node-cron |
| Uploads | Multer |
| Validation | Zod |

## Getting Started

### Prerequisites
- Node.js 20+
- PostgreSQL running locally

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

```env
DATABASE_URL="postgresql://user:password@localhost:5432/loan_tracker"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="30d"
PORT=3000
FAST2SMS_API_KEY="your-fast2sms-api-key"
UPLOAD_DIR="./uploads"
```

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register lender (phone, pin, name) |
| POST | `/auth/login` | Login and get JWT token |

### Borrowers
| Method | Endpoint | Description |
|---|---|---|
| GET | `/borrowers` | List all borrowers |
| POST | `/borrowers` | Create borrower (multipart: photo, idProof) |
| GET | `/borrowers/:id` | Borrower detail with loan history |
| PUT | `/borrowers/:id` | Update borrower |
| DELETE | `/borrowers/:id` | Delete borrower |

### Loans
| Method | Endpoint | Description |
|---|---|---|
| GET | `/loans` | List loans (filter: `?status=active`) |
| POST | `/loans` | Create loan + auto-generate EMI schedule |
| GET | `/loans/:id` | Loan detail with full EMI list |
| PUT | `/loans/:id` | Update loan status/late fee |
| DELETE | `/loans/:id` | Delete loan |
| GET | `/loans/:id/emis` | List EMIs for a loan |
| PATCH | `/loans/:loanId/emis/:emiId` | Mark EMI paid / apply late fee |

### Other
| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard` | Portfolio summary |
| POST | `/sms/send` | Manually trigger SMS reminder |

## EMI Calculation

Uses compound interest compounded monthly:

```
r   = annualRate / 12 / 100
EMI = P × r × (1+r)^n / ((1+r)^n - 1)
```

Each installment's principal and interest components are pre-calculated and stored at loan creation time.

## Deployment (Railway)

1. Push to GitHub
2. Connect repo on [railway.app](https://railway.app)
3. Add PostgreSQL plugin — `DATABASE_URL` is set automatically
4. Add remaining env vars in Railway dashboard
5. Open Shell tab and run: `npx prisma migrate deploy`

## License

MIT
