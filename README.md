# Sport Dietitian Coach - Website

A two-part project:

- **frontend/** - React (Vite) site: Home, About, Booking, and Admin pages
- **backend/** - Express API + MySQL: handles booking requests, booking admin, notifications, and newsletter signups

## Design

Light "precision lab" theme: chalk background, ink-green text, ember-orange accent,
mono typeface for data/numbers. The dashed "tick" rules used as section dividers are a
deliberate nod to body-composition measurement.

## 1. Database

If this is a fresh setup:

```bash
mysql -u root -p < backend/db/schema.sql
```

If you already ran the original `schema.sql` before, run this migration instead:

```bash
mysql -u root -p sport_dietitian < backend/db/migration_001_availability.sql
```

This creates/updates the `sport_dietitian` database with `bookings` and `newsletter_subscribers` tables.

## 2. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with your DB credentials and set `ADMIN_PASSWORD`. The admin dashboard is available at:

```text
http://localhost:5173/admin
```

Booking prices default to:

- Nutrition Consultation: `$120`
- Body Composition Test: `$75`

You can change notification prices with `PRICE_CONSULTATION` and `PRICE_BODY_COMPOSITION` in `backend/.env`.

## 3. Notifications

Email notifications use Gmail SMTP. Create a Google App Password at:

```text
https://myaccount.google.com/apppasswords
```

Then set:

```text
GMAIL_USER=
GMAIL_APP_PASSWORD=
NOTIFY_EMAIL=
```

WhatsApp notifications are optional and use the WhatsApp Cloud API. To enable them, set:

```text
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TO=
```

If both Gmail and WhatsApp are configured, the backend attempts both when a booking is created.

## 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend starts on `http://localhost:5173` and proxies `/api` to the backend.

## Endpoints

| Method | Path              | Purpose |
|--------|-------------------|---------|
| POST   | /api/bookings     | Create a booking request |
| GET    | /api/bookings     | List bookings, requires `x-admin-password` |
| PATCH  | /api/bookings/:id | Update booking status, requires `x-admin-password` |
| GET    | /api/availability | Get booked times for a date, `?date=YYYY-MM-DD` |
| POST   | /api/newsletter   | Subscribe an email |
| GET    | /api/health       | Health check |
