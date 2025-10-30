# Dorm Booking Server (No-SQL JSON storage)
- Express + LowDB (JSON file) — no SQL required
- JWT auth with roles (student/admin)
- Upload slip via `/api/bookings` (multipart/form-data)
- Admin approves/rejects bookings

## Quick start
```bash
cd server
cp .env.example .env
npm install
npm run dev
# Server on http://localhost:4000
```
Default admin: `admin@example.com` / `admin123`
