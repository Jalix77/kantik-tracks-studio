# Kantik Tracks Studio

A worship resources platform for Haitian "Chants d'Espérance" focused on PDF chord charts.

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- MongoDB

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # Configure environment variables
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup
```bash
cd frontend
yarn install
yarn start
```

## Environment Variables

### Backend (.env)
```bash
# Database
MONGO_URL="mongodb://localhost:27017"
DB_NAME="kantik_tracks"

# Security
ADMIN_SETUP_TOKEN="your-secure-setup-token"  # Required for first admin setup

# CORS
CORS_ORIGINS="*"

# Email Notifications (SendGrid)
EMAIL_PROVIDER=sendgrid
RESEND_API_KEY=SG.your-sendgrid-api-key
EMAIL_FROM="Kantik Tracks <no-reply@yourdomain.com>"
APP_BASE_URL="https://your-domain.com"
SUPPORT_EMAIL="support@yourdomain.com"
```

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=http://localhost:8001
```

## First Admin Setup

1. **Register a user** through the app at `/auth?mode=register`
2. **Promote to admin** using the setup endpoint:
```bash
curl -X POST "https://your-domain.com/api/setup/first-admin" \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","setupToken":"your-setup-token"}'
```
3. **Login** and access `/admin`

## Email Notifications

The app sends transactional emails for payment events using SendGrid:

### Email Types
1. **Payment Submitted** - Sent when user submits a payment
   - Subject: "Paiement reçu — en attente de validation | Payment received — pending review"
   - Includes: Plan requested, amount, provider, reference, 24h processing note

2. **Payment Approved** - Sent when admin approves a payment
   - Subject: "Paiement approuvé — abonnement activé | Payment approved — subscription activated"
   - Includes: Active plan, expiration date, links to catalog and library

3. **Payment Rejected** - Sent when admin rejects a payment
   - Subject: "Paiement rejeté — action requise | Payment rejected — action required"
   - Includes: Rejection note, possible reasons, link to resubmit

### Testing Email Integration
1. Set up your SendGrid API key in `.env`
2. Create a test payment through the app or API
3. Check backend logs for email status:
```bash
tail -f /var/log/supervisor/backend.err.log | grep email
```
4. Verify delivery in SendGrid dashboard: https://app.sendgrid.com/activity

### Email Configuration Notes
- Emails are **non-blocking** - payment actions succeed even if email fails
- All emails are **bilingual** (French/English)
- Failed email sends are **logged** with payment ID for debugging
- From address must be **verified** in SendGrid

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Songs
- `GET /api/songs` - List songs (with search/filter)
- `GET /api/songs/{id}` - Get song details
- `GET /api/songs/{id}/preview` - Get preview image

### Playlists
- `GET /api/playlists` - List user's playlists
- `POST /api/playlists` - Create playlist
- `POST /api/playlists/{id}/songs/{songId}` - Add song to playlist

### Payments
- `POST /api/payments` - Submit payment (triggers email)
- `GET /api/payments` - List user's payments

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `POST /api/admin/payments/{id}/review` - Approve/reject payment (triggers email)
- `GET /api/admin/users` - List all users

## Testing

### Backend Tests
```bash
cd backend
python -m pytest tests/ -v --asyncio-mode=auto
```

### Email Tests
```bash
python -m pytest tests/test_email.py -v --asyncio-mode=auto
```

## Tech Stack

- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Auth**: JWT-based authentication
- **Email**: SendGrid
- **PDF Processing**: PyMuPDF (automatic preview generation)

## License

© 2026 Kantik Tracks Studio. All rights reserved.
