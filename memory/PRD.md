# Kantik Tracks Studio - Product Requirements Document

## Overview
Worship resources platform for Haitian "Chants d'Espérance" focused on PDF chord charts with playlists/setlists and team sharing.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Auth**: JWT-based authentication (no hardcoded credentials)
- **Storage**: Base64 encoded files in MongoDB (MVP)
- **PDF Processing**: PyMuPDF for automatic preview generation
- **Email**: SendGrid for transactional payment notifications

## User Personas
1. **Individual Worship Leader** - Standard plan user downloading chord charts
2. **Worship Team Leader** - Team plan owner managing up to 7 members
3. **Admin** - Manages catalog, uploads PDFs, reviews payments

## Core Requirements
- [x] Song catalog with search/filters
- [x] Song detail pages with download gating
- [x] User authentication (register/login)
- [x] Library for downloaded songs
- [x] Playlists with drag-and-drop reorder
- [x] Team management (up to 7 members)
- [x] Manual payment submission (MonCash, Bank Transfer)
- [x] Admin console (songs CRUD, payment review, user management)
- [x] Bilingual support (FR/EN toggle, default French)
- [x] Automatic PDF preview generation with watermark
- [x] Secure admin setup (no hardcoded credentials)
- [x] Email notifications for payments (submitted, approved, rejected)

## What's Been Implemented (Feb 2026)

### Backend APIs (100% functional - 38/38 tests + 10 email tests)
- **Auth**: register, login, me
- **Songs**: list, detail, create, update, delete, featured, preview status/image
- **Resources**: upload with auto-preview generation, download with entitlement checks
- **Library**: user's downloaded songs
- **Playlists**: CRUD, add/remove/reorder songs
- **Teams**: create, invite, accept invite, remove members (max 7 enforced)
- **Payments**: create (+ email), upload receipt, admin review (+ email)
- **Admin**: stats, users, songs, payments, promote/demote admin
- **Setup**: First admin promotion via secure token
- **Email Service**: SendGrid integration for payment notifications

### Frontend Pages (All 12 pages functional)
- **Home** - Hero section, featured songs
- **Catalog** - Search, filters (language/tier), sort, song cards with preview
- **Song Detail** - Metadata, watermarked preview, download buttons, add to playlist
- **Library** - Downloaded songs list
- **Playlists** - Create, manage, drag-drop reorder
- **Pricing** - 3 plans: Free, Standard 500 HTG, Team 2000 HTG
- **Account** - Profile, subscription status, payment submission, history
- **Team** - Create team, invite members, manage roles
- **Auth** - Login/register forms
- **Admin Dashboard** - Overview stats (users, subscriptions, payments, songs)
- **Admin Songs** - CRUD, resource upload (Chords/Lyrics PDF, auto Preview)
- **Admin Payments** - Review pending, approve/reject with notes
- **Admin Users** - Manage roles, plans

### Security Improvements (Feb 2026)
- Removed hardcoded admin credentials from seed endpoint
- Added `/api/setup/first-admin` endpoint with secure token
- Admin setup requires `ADMIN_SETUP_TOKEN` environment variable
- Seed endpoint only creates songs, not admin users

### Seed Data
- 10 Chants d'Espérance songs (3 STANDARD, 7 PREMIUM)

## Plans & Entitlements
| Feature | FREE | STANDARD | TEAM |
|---------|------|----------|------|
| Browse catalog | ✓ | ✓ | ✓ |
| Preview songs | ✓ | ✓ | ✓ |
| Download STANDARD | ✗ | ✓ | ✓ |
| Download PREMIUM | ✗ | ✗ | ✓ |
| Personal library | ✗ | ✓ | ✓ |
| Create playlists | ✗ | ✓ | ✓ |
| Team (up to 7) | ✗ | ✗ | ✓ |
| Shared library | ✗ | ✗ | ✓ |

## Prioritized Backlog

### P0 (Done)
- ✅ Core catalog and song detail
- ✅ Authentication system
- ✅ Playlists with drag-drop
- ✅ Payment submission flow
- ✅ Admin dashboard
- ✅ Automatic PDF preview generation
- ✅ Secure admin setup (no hardcoded credentials)

### P1 (Next Phase)
- [ ] Firebase Storage integration for PDFs (currently Base64 in MongoDB)
- [ ] Signed URL downloads for security
- [ ] Email notifications for payment approval
- [ ] Setlist export to PDF

### P2 (Future)
- [ ] Google OAuth login
- [ ] Stripe automatic renewals
- [ ] Mobile PWA support
- [ ] Preview audio snippets
- [ ] Song transposition tool

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
ADMIN_SETUP_TOKEN=your-secure-token-here  # Required for first admin setup
# Optional for seed:
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure-password
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://your-domain.com
```

## Admin Setup Guide

### First-Time Admin Setup (Secure Method)
1. Set `ADMIN_SETUP_TOKEN` in backend/.env
2. Register a new user through the app
3. Call the setup endpoint:
   ```bash
   curl -X POST "https://your-domain.com/api/setup/first-admin" \
     -H "Content-Type: application/json" \
     -d '{"email":"your-email@example.com","setupToken":"your-setup-token"}'
   ```
4. Login with your credentials and access /admin

### Alternative: Via MongoDB
```javascript
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { role: "ADMIN", isAdmin: true } }
)
```

## Admin Workflow

### Upload Song:
1. Go to /admin/songs
2. Click "Add Song"
3. Fill in details (number, title, tier)
4. Save song
5. Click "Chords" button to upload PDF
6. Preview is auto-generated with watermark

### Review Payment:
1. Go to /admin/payments
2. Click "View" on pending payment
3. Review receipt and details
4. Click Approve or Reject
5. Confirm action

### Manage Users:
1. Go to /admin/users
2. Search for user
3. Click "View" to see details
4. Promote to admin or reset plan as needed

## Testing
- Backend: pytest at /app/backend/tests/test_kantik_api.py
- Test Report: /app/test_reports/iteration_3.json
- Success Rate: 100% backend, 100% frontend
