# PurchaseHub

**Your digital home for everything you own.**

PurchaseHub is a full-stack SaaS MVP that helps users store receipts, track warranties, manage repair history, and never lose important purchase records again.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, TypeScript, Tailwind CSS, React Router, Axios, Recharts |
| Backend | Node.js, Express.js, TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT |
| File Storage | Cloudinary |
| OCR | Google Cloud Vision API |
| Email | Nodemailer (warranty reminders) |
| Deployment | Vercel (frontend), Render (backend), MongoDB Atlas |

## Project Structure

```
PurchaseHub/
├── backend/
│   └── src/
│       ├── config/       # DB, Cloudinary config
│       ├── controllers/  # Route handlers
│       ├── middleware/   # Auth, upload, validation
│       ├── models/       # Mongoose schemas
│       ├── routes/       # API routes
│       ├── services/     # OCR, email, Cloudinary
│       └── utils/        # JWT, warranty helpers
└── frontend/
    └── src/
        ├── components/   # UI + feature components
        ├── hooks/        # Auth context
        ├── layouts/      # App shell
        ├── pages/        # Route pages
        ├── services/     # API client
        ├── types/        # TypeScript interfaces
        └── utils/        # Formatters, helpers
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account
- Google Cloud Vision API credentials (optional, for OCR)
- SMTP credentials (optional, for email reminders)

### 1. Clone & Install

```bash
cd PurchaseHub

# Backend
cd backend
cp .env.example .env
npm install

# Frontend
cd ../frontend
cp .env.example .env
npm install
```

### 2. Configure Environment

**backend/.env**

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/purchasehub
JWT_SECRET=your-secret-key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
GOOGLE_APPLICATION_CREDENTIALS=./google-credentials.json
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FRONTEND_URL=http://localhost:5173
```

**frontend/.env**

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Open **http://localhost:5173**

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/profile` | Get profile |
| PUT | `/api/auth/profile` | Update profile |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List (search, filter) |
| POST | `/api/products` | Create |
| GET | `/api/products/:id` | Get details |
| PUT | `/api/products/:id` | Update |
| DELETE | `/api/products/:id` | Delete |
| GET | `/api/products/:id/timeline` | Lifecycle timeline |
| POST | `/api/products/:id/documents` | Upload document |
| DELETE | `/api/products/:id/documents/:docId` | Delete document |

### Repairs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products/:productId/repairs` | List repairs |
| POST | `/api/products/:productId/repairs` | Add repair |
| PUT | `/api/products/:productId/repairs/:id` | Update repair |
| DELETE | `/api/products/:productId/repairs/:id` | Delete repair |

### Dashboard & OCR
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Dashboard analytics |
| GET | `/api/dashboard/categories` | User categories |
| POST | `/api/ocr/scan` | Scan receipt (OCR) |

## Deployment

### MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a database user and whitelist IP `0.0.0.0/0` (or Render's IP)
3. Copy connection string to `MONGODB_URI`

### Backend → Render

1. Push code to GitHub
2. Create a **Web Service** on [render.com](https://render.com)
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add all environment variables from `.env.example`
5. Upload Google credentials as env var or secret file

### Frontend → Vercel

1. Import repo on [vercel.com](https://vercel.com)
2. Settings:
   - **Root Directory:** `frontend`
   - **Framework:** Vite
3. Environment variable:
   ```
   VITE_API_URL=https://your-render-app.onrender.com/api
   ```
4. Deploy

### Cloudinary Setup

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Copy Cloud Name, API Key, API Secret to backend `.env`

### Google Vision OCR Setup

1. Enable Cloud Vision API in Google Cloud Console
2. Create a service account and download JSON key
3. Save as `backend/google-credentials.json`
4. Set `GOOGLE_APPLICATION_CREDENTIALS` path

### Email Reminders (Optional)

Uses Gmail App Password or any SMTP provider. Cron jobs run daily:
- **Midnight:** Refresh warranty statuses
- **9 AM:** Send 30-day, 7-day, and expiry-day reminders

## Features

- JWT authentication with protected routes
- Product CRUD with warranty auto-calculation
- Receipt OCR auto-fill (Google Vision)
- Document upload (PDF, JPG, PNG) via Cloudinary
- Repair history with invoice attachments
- Product lifecycle timeline
- Dashboard with spending analytics
- Search & filter by category, warranty status
- Email warranty reminders (30d, 7d, expiry day)
- Responsive SaaS-style UI

## License

MIT
