<div align="center">

![FoodRescue](https://img.shields.io/badge/FoodRescue-Real%20Time%20Food%20Logistics-2ecc71?style=flat-square&labelColor=1a1a1a)
![Version](https://img.shields.io/badge/version-1.1.0-2ecc71?style=flat-square)
![License](https://img.shields.io/badge/license-ISC-3498db?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D18.0-339933?style=flat-square&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/react-19-61DAFB?style=flat-square&logo=react)
![PRs](https://img.shields.io/badge/PRs-Welcome-27ae60?style=flat-square)

<br />

# 🍱 FoodRescue

**Connecting surplus food with communities in need — powered by real-time logistics**

[View Demo](#features) • [Report Issue](https://github.com/grafenx07/foodrescue/issues) • [Request Feature](https://github.com/grafenx07/foodrescue/issues) • [Contribute](#contributing)

</div>

---

## 🎯 About FoodRescue

FoodRescue is a **full-stack real-time logistics platform** designed to eliminate food waste by creating an efficient marketplace between food donors and receivers. Every day, millions of kilograms of edible food are discarded while communities face food insecurity. We bridge that gap through intelligent routing, volunteer coordination, and seamless real-time tracking.

### The Impact
- **Prevent food waste** from restaurants, messes, hostels, and households
- **Serve communities** through NGOs, individuals, and community organizations
- **Empower volunteers** by providing efficient delivery coordination

---

## 🌟 Core Features

### 🗺️ Intelligent Live Tracking
- **Road-following routes** powered by OSRM (Open Source Routing Machine) — realistic navigation, not straight lines
- **Real-time GPS tracking** with Google Maps-style pulsing location indicator
- **Smart route adaptation** based on delivery stage (pickup → delivery)
- **Animated directional polylines** showing direction of travel
- **Professional Carto Voyager tiles** for clean, modern map experience
- **Role-aware route switching** automatically updates as delivery progresses

### 🔐 Enterprise-Grade Security
- **JWT-based authentication** with bcrypt password hashing
- **Four distinct role system**: Donor, Receiver, Volunteer, Admin
- **Secure password reset** via email with time-limited tokens
- **Protected routes** enforced on both frontend and backend
- **OTP-based handover verification** — 6-digit codes prevent fraudulent confirmations

### 📍 Smart Location Services
- **Nominatim-powered autocomplete** for place name searching with precise coordinates
- **GPS "Detect" button** for reverse-geocoding current position
- **Auto-prompts** for location permission across all user roles
- **Coordinates stored** alongside addresses for accurate map pins

### 📦 Complete Food Listing Lifecycle
- Post food with: title, quantity, food type, expiry time, and photos
- **Flexible delivery options**: Volunteer delivers | Donor delivers | Receiver picks up | Flexible
- **Smart status pipeline**: `AVAILABLE → CLAIMED → ASSIGNED → PICKED_UP → DELIVERED`
- **Auto-expiry** of listings past their best-before time

### 📡 Real-Time Location Sharing
- **Live GPS updates** every 5 seconds during active delivery
- **Volunteer position sharing** during pickup and delivery phases
- **Donor live location** during self-delivery
- **Receiver can share location** back to deliverer for easier pickup
- **Poll-based updates** every 8 seconds on tracking pages

### 📊 Admin Control Panel
- **Centralized dashboard** for managing users, listings, and claims
- **Platform overview**: Active listings, total deliveries, volunteer count
- **User management** with access controls
- **Delivery monitoring** and support tools

### 📧 Transactional Notifications
- Registration welcome emails
- Claim notifications to donors
- Volunteer assignment alerts
- Secure password reset with 1-hour token expiry

---

## 🏗️ Architecture

```
FoodRescue/
├── client/                    # React 19 + Vite Frontend
│   └── src/
│       ├── components/        # Reusable UI components
│       │   ├── MapView.jsx
│       │   ├── LocationInput.jsx
│       │   ├── Navbar.jsx
│       │   └── StatusBadge.jsx
│       ├── hooks/             # Custom React hooks
│       │   └── useLocationPermission.js
│       ├── lib/               # Shared utilities
│       │   └── axios.js       # API client with JWT interceptor
│       ├── pages/             # Feature pages
│       │   ├── donor/
│       │   ├── receiver/
│       │   ├── volunteer/
│       │   └── admin/
│       └── store/             # Zustand state management
│
└── server/                    # Node.js + Express Backend
    ├── prisma/
    │   └── schema.prisma      # PostgreSQL data model
    └── src/
        ├── middleware/        # Auth, file uploads
        ├── routes/            # API endpoints
        ├── services/          # Business logic
        │   └── emailService.js
        └── utils/             # Helper functions
```

---

## 🛠️ Technology Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| **Framework** | React 19 + Vite 8 |
| **Styling** | Tailwind CSS v4 |
| **Maps & Routing** | React-Leaflet + Leaflet.js + OSRM |
| **Geocoding** | Nominatim (OpenStreetMap) |
| **State Management** | Zustand |
| **HTTP Client** | Axios |
| **Routing** | React Router v7 |
| **Date Handling** | date-fns |
| **UI Components** | Lucide React Icons |
| **Notifications** | react-hot-toast |

### Backend
| Layer | Technology |
|-------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Express 5 |
| **Database** | PostgreSQL |
| **ORM** | Prisma 5 |
| **Authentication** | JWT + bcryptjs |
| **File Uploads** | Multer |
| **Email Service** | Nodemailer (Gmail SMTP) |
| **ID Generation** | UUID v4 |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18.0
- PostgreSQL (local or cloud)
- Gmail account (optional — for email features)

### 1️⃣ Clone & Setup

```bash
git clone https://github.com/grafenx07/foodrescue.git
cd foodrescue
```

### 2️⃣ Environment Configuration

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/foodrescue"

# Authentication
JWT_SECRET="your-generated-secret-key"

# Server
PORT=4000
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:5173

# Email (Optional — for password reset & notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM="FoodRescue <noreply@foodrescue.local>"
APP_URL=http://localhost:5173
```

**Generate a secure JWT secret:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3️⃣ Install Dependencies

```bash
# Backend
npm install

# Frontend
cd client && npm install && cd ..
```

### 4️⃣ Database Setup

```bash
# Push Prisma schema to PostgreSQL
npm run db:push

# Optional: Open Prisma Studio to browse data
npm run db:studio
```

### 5️⃣ Run Development Servers

**Terminal 1 — Backend (http://localhost:4000)**
```bash
npm run dev
```

**Terminal 2 — Frontend (http://localhost:5173)**
```bash
cd client && npm run dev
```

Visit **http://localhost:5173** to start using FoodRescue! 🎉

---

## 📋 User Flows

### 🍽️ Donor Workflow
```
1. Register as Donor
2. Post Food Listing (title, quantity, expiry, photo)
3. Choose delivery method:
   - Volunteer picks up from me
   - I will deliver myself
   - Flexible arrangement
4. Receive notification when claimed
5. Meet volunteer/receiver for handoff
6. Confirm delivery with OTP
```

### 🤝 Receiver Workflow
```
1. Register as Receiver
2. Browse available listings
3. Claim food listing
4. Choose pickup method:
   - Self-pickup (navigate to donor)
   - Volunteer delivery
   - Donor delivery
5. Receive live tracking updates
6. Verify OTP when food arrives
7. Mark as received
```

### 🚴 Volunteer Workflow
```
1. Register as Volunteer
2. View available delivery tasks
3. Accept pickup task
4. Navigate to donor location
5. Confirm pickup with OTP
6. Navigate to receiver location
7. Confirm delivery with OTP
8. Task complete - Earn volunteer points
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Create new account |
| `POST` | `/api/auth/login` | Get JWT token |
| `POST` | `/api/auth/forgot-password` | Request password reset |
| `POST` | `/api/auth/reset-password` | Reset with token |

### Food Listings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/food` | Browse all listings |
| `POST` | `/api/food` | Create new listing |
| `GET` | `/api/food/:id` | Get listing details |
| `PATCH` | `/api/food/:id` | Update listing |
| `DELETE` | `/api/food/:id` | Delete listing |

### Claims & Tracking
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/claim/:foodId` | Claim a food listing |
| `GET` | `/api/claim/:claimId` | Get claim details |
| `GET` | `/api/claim/:claimId/locations` | Poll live positions |
| `POST` | `/api/claim/:claimId/location` | Share GPS position |
| `GET` | `/api/claim/:claimId/otp` | Get delivery OTP |
| `POST` | `/api/claim/:claimId/verify-otp` | Verify OTP code |

### Volunteer Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/volunteer/tasks` | Get active tasks |
| `POST` | `/api/volunteer/accept/:claimId` | Accept task |
| `PATCH` | `/api/volunteer/task/:taskId` | Update task status |
| `GET` | `/api/volunteer/stats` | Volunteer statistics |

### Admin
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/users` | List all users |
| `DELETE` | `/api/admin/users/:id` | Remove user |
| `GET` | `/api/admin/listings` | All listings |
| `GET` | `/api/admin/stats` | Platform statistics |

### Statistics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stats` | Platform impact metrics |
| `GET` | `/api/stats/volunteer/:id` | Volunteer contribution stats |

---

## 🗄️ Data Model

```
User
├── id (UUID)
├── email (unique)
├── password (hashed)
├── role (Donor | Receiver | Volunteer | Admin)
├── profile { name, phone, lat, lng }
└── relationships
    ├── FoodListing[] (if Donor)
    ├── Claim[] (if Receiver)
    └── VolunteerTask[] (if Volunteer)

FoodListing
├── id, title, description
├── quantity, foodType, category
├── expiresAt, photoUrl
├── location { address, lat, lng }
├── pickupArrangement (VOLUNTEER | DONOR | RECEIVER | FLEXIBLE)
├── status (AVAILABLE → CLAIMED → ASSIGNED → PICKED_UP → DELIVERED)
└── donorId (FK: User)

Claim
├── id, status
├── pickupType (SELF | VOLUNTEER | DONOR | FLEXIBLE)
├── foodId (FK: FoodListing)
├── receiverId (FK: User)
└── volunteerTaskId (FK: VolunteerTask)

VolunteerTask
├── id, status
├── currentLocation { lat, lng, updatedAt }
├── claimId (FK: Claim)
├── volunteerId (FK: User)
└── deliveryOTP (auto-generated)
```

---

## 🌱 Roadmap

**Current Version: 1.1.0**

### Next Releases
- [ ] **Push Notifications** — real-time delivery alerts via WebSocket/FCM
- [ ] **PWA Support** — offline capability and installable app
- [ ] **Food Ratings System** — receiver ratings and reviews
- [ ] **Volunteer Leaderboard** — gamification with badges and achievements
- [ ] **Multi-City Expansion** — regional coordinator role
- [ ] **Advanced Analytics** — carbon footprint tracking, impact metrics
- [ ] **WhatsApp Integration** — claim food via WhatsApp Bot
- [ ] **ML Demand Prediction** — predictive models for high-need zones
- [ ] **Mobile Apps** — Native iOS/Android applications

---

## 🤝 Contributing

We love contributions! Here's how to get started:

1. **Fork the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/foodrescue.git
   cd foodrescue
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feat/amazing-feature
   ```

3. **Commit with conventional format**
   ```bash
   git commit -m "feat: add amazing feature"
   git commit -m "fix: resolve tracking bug"
   git commit -m "docs: improve README"
   ```

4. **Push and create PR**
   ```bash
   git push origin feat/amazing-feature
   ```

### Contribution Guidelines
- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Write tests for new features
- Update documentation
- Keep code clean and well-commented
- PRs welcome for bug fixes, features, and documentation!

### Good First Issues
- [ ] Improve mobile responsiveness of tracking page
- [ ] Add dark mode support
- [ ] Write unit tests for API routes
- [ ] Add food category filters to browse page
- [ ] Implement delivery history view
- [ ] Add volunteer performance analytics

---

## 📊 Platform Metrics

FoodRescue tracks impact through:

| Metric | Purpose |
|--------|---------|
| 🍱 Meals Rescued | Total food items delivered |
| 🌿 kg Saved | Food waste prevented |
| 🚴 Active Volunteers | Community engagement |
| 🏙️ Cities Covered | Geographic expansion |
| ⏱️ Avg Delivery Time | Operational efficiency |
| ✅ Success Rate | Delivery completion |

---

## 🐛 Bug Reports & Support

Found an issue? Let us know!

- **Bug Report**: [Open an Issue](https://github.com/grafenx07/foodrescue/issues/new?template=bug_report.md)
- **Feature Request**: [Request Feature](https://github.com/grafenx07/foodrescue/issues/new?template=feature_request.md)
- **Discussions**: [Start Discussion](https://github.com/grafenx07/foodrescue/discussions)

---

## 📄 License

FoodRescue is distributed under the **ISC License**. See [`LICENSE`](LICENSE) for details.

---

## 🙏 Acknowledgments

Built on the shoulders of amazing open-source projects:

- **[OpenStreetMap](https://www.openstreetmap.org/)** & **[Nominatim](https://nominatim.org/)** — free, global geocoding
- **[OSRM](http://project-osrm.org/)** — intelligent road-based routing
- **[Leaflet.js](https://leafletjs.com/)** — lightweight interactive maps
- **[Carto](https://carto.com/)** — professional Voyager map tiles
- **[Prisma](https://www.prisma.io/)** — next-generation Node.js ORM
- **[Tailwind CSS](https://tailwindcss.com/)** — utility-first CSS framework
- **[React](https://react.dev/)** — modern UI library
- **[Express.js](https://expressjs.com/)** — web framework

---

<div align="center">

### Made with 💚 to fight food waste

**Help us expand FoodRescue's impact — star us, share with your network, and contribute!**

[⬆ Back to top](#-foodrescue)

</div>
