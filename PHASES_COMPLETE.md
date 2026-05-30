# All Phases — Completion Checklist

## Phase 0 — Foundation ✅
- [x] Sidebar routes = all pages
- [x] Mock data removed
- [x] Real user in topbar
- [x] Toast notifications
- [x] `.env.example` + README
- [x] Patient-only public signup

## Phase 1 — MVP Hospital Ops ✅
- [x] OPD queue + token status (waiting → in consultation → completed)
- [x] Admin dashboard (live API)
- [x] Patients, doctors, appointments, OPD board
- [x] IPD admit / discharge / bed management
- [x] Lab request + admin upload
- [x] Billing generate + pay (cash + online)
- [x] Profiles (patient/doctor)
- [x] Appointment cancel (patient)

## Phase 2 — Commercial ✅
- [x] Razorpay create-order + verify + webhook
- [x] Twilio SMS + WhatsApp (with console fallback)
- [x] Lobby TV display
- [x] WebSocket live queue updates (`socket.io`)
- [x] Hindi / English i18n

## Phase 3 — Operations ✅
- [x] In-app notifications
- [x] Global search (patients, doctors, tokens)
- [x] Audit logs (admin)
- [x] Departments CRUD
- [x] Doctor update (admin)
- [x] Doctor schedules API
- [x] Inventory / pharmacy stock
- [x] Hospital settings (DB)
- [x] Analytics charts (revenue, appointments, beds)
- [x] Forgot / reset password

## Phase 4 — Production / Enterprise ✅
- [x] Cloud storage abstraction (local / AWS S3 / Cloudinary)
- [x] PDF export (bills, prescriptions) via jsPDF
- [x] Print CSS
- [x] Swagger API docs at `/api/docs`
- [x] Docker + docker-compose
- [x] Jest (backend) + Vitest (frontend) + GitHub CI

## Setup commands
```bash
mysql -u root -p hospital_db < hms_schema.sql
mysql -u root -p hospital_db < hospital-backend/migrations/001_payments_notifications.sql
mysql -u root -p hospital_db < hospital-backend/migrations/002_all_phases.sql
cd hospital-backend && npm run seed
```

## Optional external accounts
- Razorpay test/live keys
- Twilio SMS + WhatsApp sandbox
- AWS S3 or Cloudinary for lab files
