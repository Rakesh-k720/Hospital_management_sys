# LifeLine Hospital Management System

Market-ready multi-role HMS: Admin, Doctor, and Patient portals with OPD queue, IPD, laboratory, and billing.

## Quick Start

### 1. Database (MySQL)
```bash
mysql -u root -p < hms_schema.sql
mysql -u root -p hospital_db < hospital-backend/migrations/001_payments_notifications.sql
mysql -u root -p hospital_db < hospital-backend/migrations/002_all_phases.sql
cd hospital-backend && npm run seed
```

See **PHASES_COMPLETE.md** for full feature checklist (Phase 0–4).

### 2. Backend
```bash
cd hospital-backend
cp .env.example .env
# Edit .env with your MySQL credentials
npm install
npm run dev
```
API: http://localhost:5000

### 3. Frontend
```bash
cp .env.example .env
npm install
npm run dev
```
App: http://localhost:5173/Hospital_management_sys/

### 4. Lobby TV Display (no login)
http://localhost:5173/Hospital_management_sys/#/lobby

## Demo Logins (after seed)
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hms.com | password123 |
| Doctor | alice@hms.com | password123 |
| Patient | rakesh@gmail.com | password123 |

## Features
- **Patient:** Book OPD, token queue, prescriptions, lab reports, pay bills, profile
- **Doctor:** Live queue, prescriptions, lab orders, IPD patients, profile
- **Admin:** Dashboard, doctors/patients, OPD board, IPD admit/discharge, lab upload, billing, appointments
- **Public:** Lobby display for waiting room TVs

## Phase 2: Payments, Notifications, i18n

### Razorpay (UPI / Cards)
1. Create account at [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Add to `hospital-backend/.env`:
   ```
   RAZORPAY_KEY_ID=rzp_test_...
   RAZORPAY_KEY_SECRET=...
   ```
3. Patient → Bills → Pay Now → UPI/Razorpay opens checkout
4. Run migration: `mysql -u root -p hospital_db < hospital-backend/migrations/001_payments_notifications.sql`

### SMS + WhatsApp (Twilio)
1. [Twilio Console](https://www.twilio.com/console) — get Account SID & Auth Token
2. SMS: buy a phone number → `TWILIO_PHONE_NUMBER`
3. WhatsApp: enable WhatsApp Sandbox → `TWILIO_WHATSAPP_FROM=+14155238886`
4. Patient must join sandbox (send join code to Twilio WhatsApp number)
5. Without Twilio: alerts log to console + `notification_logs` table

### Hindi / English
- Click **हिं / EN** button in top bar or login page

### Tests & CI
```bash
# Frontend
npm test

# Backend
cd hospital-backend && npm test
```
GitHub Actions runs both on push to `main`.

## Production Checklist
- Set strong `JWT_SECRET` in backend `.env`
- Configure `VITE_API_BASE_URL` to your API domain
- Use HTTPS and secure MySQL credentials
- Replace local `uploads/` with cloud storage for lab PDFs (S3 recommended)
- Add Razorpay/SMS keys when enabling payments/notifications

## Tech Stack
React (Vite) + Tailwind | Node.js + Express | MySQL
