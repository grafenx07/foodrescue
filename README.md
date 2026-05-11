<div align="center">

<img src="https://img.shields.io/badge/version-1.1.0-green?style=for-the-badge" alt="version"/>
<img src="https://img.shields.io/badge/license-ISC-blue?style=for-the-badge" alt="license"/>
<img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge" alt="PRs Welcome"/>
<img src="https://img.shields.io/badge/node-%3E%3D18.0-339933?style=for-the-badge&logo=node.js&logoColor=white" alt="Node"/>
<img src="https://img.shields.io/badge/react-19-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>

<br/><br/>

```
  ██████╗  ██████╗  ██████╗ ██████╗     ██████╗ ███████╗███████╗ ██████╗██╗   ██╗███████╗
 ██╔════╝ ██╔═══██╗██╔═══██╗██╔══██╗    ██╔══██╗██╔════╝██╔════╝██╔════╝██║   ██║██╔════╝
 ██║  ███╗██║   ██║██║   ██║██║  ██║    ██████╔╝█████╗  ███████╗██║     ██║   ██║█████╗
 ██║   ██║██║   ██║██║   ██║██║  ██║    ██╔══██╗██╔══╝  ╚════██║██║     ██║   ██║██╔══╝
 ╚██████╔╝╚██████╔╝╚██████╔╝██████╔╝    ██║  ██║███████╗███████║╚██████╗╚██████╔╝███████╗
  ╚═════╝  ╚═════╝  ╚═════╝ ╚═════╝     ╚═╝  ╚═╝╚══════╝╚══════╝ ╚═════╝ ╚═════╝╚══════╝
```

### 🍱 Connecting surplus food with people who need it — in real time.

**[Live Demo](#) · [Report Bug](https://github.com/grafenx07/foodrescue/issues) · [Request Feature](https://github.com/grafenx07/foodrescue/issues) · [Contribute](#contributing)**

</div>

---

## 🌍 The Problem We're Solving

Every day, **millions of kilograms of edible food** are thrown away by restaurants, hostels, messes, and households — while millions of people go to bed hungry. FoodRescue is a **full-stack real-time logistics platform** that bridges this gap by connecting three groups:

| Role | Who | What they do |
|------|-----|-------------|
| 🍽️ **Donor** | Restaurant, mess, hostel, individual | Posts surplus food listings |
| 🤝 **Receiver** | NGO, individual, community org | Claims food and tracks delivery |
| 🚴 **Volunteer** | Anyone with a bike | Picks up and delivers claimed food |

> _"The world produces enough food for everyone. Logistics is all that stands between waste and relief."_

---

## ✨ Features

### 🗺️ Live Tracking Map — Uber/Swiggy Style
- **Road-following routes** powered by the OSRM routing engine (no straight lines)
- **Animated directional polylines** — moving dashes show direction of travel in real time
- **Role-aware route switching** — automatically changes route as the delivery progresses:
  - Volunteer: `pickup location → donor` (ASSIGNED) then `volunteer → receiver` (PICKED_UP)
  - Self-pickup: `receiver GPS → donor location` with a Navigate button
  - Donor delivery: `live donor position → receiver address`
- **Google Maps-style pulsing blue dot** for user's current GPS location
- **Modern Carto Voyager tiles** — clean, professional basemap
- **Animated role-based map icons**: bouncing 🚴 volunteers, swaying 🚗 donors, glowing 🏠 receivers

### 🔐 Secure Authentication & Roles
- JWT-based authentication with bcrypt password hashing
- Four distinct roles: Donor, Receiver, Volunteer, Admin
- Secure **password reset via email** (SMTP/Gmail with token expiry)
- Protected routes enforced on both frontend and backend

### 📦 Food Listing Lifecycle
- Donors post food with title, quantity, food type, expiry time, and photo
- Flexible delivery arrangements: **Volunteer delivers | Donor delivers | Receiver picks up | Flexible**
- Full status pipeline: `AVAILABLE → CLAIMED → ASSIGNED → PICKED_UP → DELIVERED`
- Auto-expiry of listings past their best-before time

### 🚀 Delivery Verification with OTP
- **OTP-based handover confirmation** — receiver sees a 6-digit code; deliverer enters it to mark as delivered
- Prevents fraudulent delivery confirmations
- OTPs are auto-generated server-side when food is picked up

### 📍 Smart Location Handling
- **Nominatim-powered autocomplete** on all location fields — type a place name, pick from suggestions, get precise coordinates instantly
- GPS "Detect" button for reverse-geocoding current position
- Coordinates stored alongside text addresses for accurate map pins
- Global geolocation permission prompt on first login for all roles

### 📡 Real-Time Location Sharing
- Volunteers share live GPS position during delivery (every 5 s)
- Donor shares live location during self-delivery
- Receiver can share their location back to the deliverer
- Live positions polled every 8 s on the tracking page

### 🛡️ Admin Control Panel
- Manage all users, listings, and claims from a single dashboard
- Overview stats: active listings, total deliveries, volunteer count
- Delete listings, revoke access, monitor platform health

### 📧 Transactional Email Notifications
- Registration welcome email
- Food claim notifications to donors
- Volunteer assignment alerts
- Password reset with secure tokenised links (expires in 1 h)

---

## 🏗️ Architecture

```
FoodRescue/
├── client/                  # React 19 + Vite frontend
│   └── src/
│       ├── components/      # Shared UI — MapView, LocationInput, Navbar, StatusBadge
│       ├── hooks/           # useLocationPermission
│       ├── lib/             # Axios instance with JWT interceptor
│       ├── pages/
│       │   ├── donor/       # AddFoodPage, ManageListingsPage
│       │   ├── receiver/    # ReceiverDashboard, TrackingPage
│       │   ├── volunteer/   # VolunteerDashboard
│       │   └── admin/       # AdminDashboard
│       └── store/           # Zustand auth store
│
└── server/                  # Node.js + Express backend
    ├── prisma/
    │   └── schema.prisma    # PostgreSQL schema
    └── src/
        ├── middleware/      # JWT auth, multer upload
        ├── routes/          # auth, food, claims, donor, volunteer, admin, stats
        └── services/        # emailService (Nodemailer)
```

---

## 🛠️ Tech Stack

**Frontend**

| | Technology |
|---|---|
| ⚡ Framework | React 19 + Vite 8 |
| 💅 Styling | Tailwind CSS v4 |
| 🗺️ Maps | React-Leaflet + Leaflet.js |
| 🧭 Routing | React Router v7 |
| 🔄 State | Zustand |
| 📡 HTTP | Axios |
| 🗾 Geocoding | Nominatim (OpenStreetMap) |
| 🛣️ Road Routing | OSRM (Open Source Routing Machine) |
| 🗓️ Dates | date-fns |
| 🔔 Toasts | react-hot-toast |
| 🎨 Icons | Lucide React |

**Backend**

| | Technology |
|---|---|
| 🚀 Runtime | Node.js 18+ |
| 🌐 Framework | Express 5 |
| 🗄️ Database | PostgreSQL |
| 🔗 ORM | Prisma 5 |
| 🔐 Auth | JWT + bcryptjs |
| 📸 Uploads | Multer |
| 📧 Email | Nodemailer (Gmail SMTP) |
| 🆔 IDs | UUID v4 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL database
- Gmail account (for SMTP email — optional for local dev)

### 1. Clone the repository

```bash
git clone https://github.com/grafenx07/foodrescue.git
cd foodrescue
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/foodrescue"
JWT_SECRET="your-super-secret-key"
PORT=4000
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:5173

# Gmail SMTP (optional — needed for password reset & notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
EMAIL_FROM="FoodRescue <your@gmail.com>"
APP_URL=http://localhost:5173
```

> **Tip:** Generate a strong JWT secret with:
> ```bash
> node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
> ```

### 3. Install dependencies

```bash
# Backend dependencies (root)
npm install

# Frontend dependencies
cd client && npm install && cd ..
```

### 4. Set up the database

```bash
# Push schema to your PostgreSQL database
npm run db:push

# (Optional) Open Prisma Studio to browse data
npm run db:studio
```

### 5. Run the development servers

Open two terminals:

```bash
# Terminal 1 — Backend (port 4000)
npm run dev

# Terminal 2 — Frontend (port 5173)
cd client && npm run dev
```

Visit **[http://localhost:5173](http://localhost:5173)** 🎉

---

## 📱 How It Works

```
Donor posts food  →  Receiver claims it  →  Volunteer assigned
                                                    ↓
                              Live map: Volunteer → Donor (pickup)
                                                    ↓
                              Live map: Volunteer → Receiver (delivery)
                                                    ↓
                              Receiver reads OTP → Delivery confirmed ✅
```

### Self-Pickup Flow
```
Receiver claims food (SELF pickup)
    → Map shows route: Receiver → Donor
    → Receiver goes, taps "I've Picked Up"
    → Status: DELIVERED ✅
```

### Donor Delivery Flow
```
Donor posts food with "I will deliver"
    → Receiver claims
    → Donor shares live location on map
    → Map shows route: Donor → Receiver
    → OTP verification on arrival ✅
```

---

## 🗺️ API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login, receive JWT |
| `POST` | `/api/auth/forgot-password` | Send password reset email |
| `POST` | `/api/auth/reset-password` | Reset password with token |
| `GET` | `/api/food` | Browse available listings |
| `POST` | `/api/food` | Donor creates listing |
| `POST` | `/api/claim/:foodId` | Receiver claims food |
| `GET` | `/api/claim/:claimId` | Get claim details |
| `GET` | `/api/claim/:claimId/locations` | Poll live positions |
| `POST` | `/api/claim/:claimId/location` | Push live GPS position |
| `GET` | `/api/claim/:claimId/otp` | Get delivery OTP |
| `POST` | `/api/claim/:claimId/self-pickup` | Confirm self-pickup |
| `GET` | `/api/volunteer/tasks` | Volunteer active tasks |
| `POST` | `/api/volunteer/accept/:claimId` | Accept delivery task |
| `PATCH` | `/api/volunteer/task/:taskId` | Update task status |
| `GET` | `/api/donor/listings` | Donor's listings |
| `GET` | `/api/donor/deliveries` | Donor's pending deliveries |
| `PATCH` | `/api/donor/deliver/:claimId` | Update delivery status |
| `GET` | `/api/stats` | Platform impact stats |
| `GET` | `/api/admin/*` | Admin management endpoints |

---

## 🗄️ Database Schema

```
User ──────────────────────┐
 ├── FoodListing []         │ (donor)
 ├── Claim []               │ (receiver)
 └── VolunteerTask []       │ (volunteer)
                            │
FoodListing ───────────────►Claim ──────────► VolunteerTask
  title                      pickupType          status
  quantity                   status              volunteer
  foodType                   receiver            ASSIGNED
  location (+ lat/lng)       volunteerTask       PICKED_UP
  pickupArrangement                              DELIVERED
  status:
    AVAILABLE → CLAIMED → ASSIGNED → PICKED_UP → DELIVERED
```

---

## 🌱 Roadmap

- [ ] **PWA support** — offline capability and install prompts
- [ ] **Push notifications** — real-time delivery alerts
- [ ] **Food rating system** — receiver rates food quality
- [ ] **Volunteer leaderboard** — gamification for volunteers
- [ ] **Multi-city expansion** — regional coordinator accounts
- [ ] **Donation analytics** — carbon footprint saved, meals served
- [ ] **WhatsApp integration** — claim food via WhatsApp Bot
- [ ] **ML demand prediction** — predict high-need zones for proactive donation drives

---

## 🤝 Contributing

Contributions are what make open source amazing! Any contributions you make are **greatly appreciated**.

1. Fork the project
2. Create your feature branch: `git checkout -b feat/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feat/amazing-feature`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

### Good First Issues

- Improve mobile responsiveness of the tracking page
- Add dark mode support
- Write unit tests for API routes
- Add food category filters on the browse page

---

## 📸 Screenshots

> _Screenshots coming soon — run the app locally to see it in action!_

---

## 📊 Impact Stats

FoodRescue tracks:
- 🍱 Total meals rescued
- 🌿 kg of food saved from waste
- 🚴 Active volunteers
- 🏙️ Cities covered

---

## 📄 License

Distributed under the **ISC License**. See [`LICENSE`](LICENSE) for more information.

---

## 🙏 Acknowledgements

- [OpenStreetMap](https://www.openstreetmap.org/) & [Nominatim](https://nominatim.org/) — free geocoding
- [OSRM](http://project-osrm.org/) — open source road-following routing engine
- [Leaflet.js](https://leafletjs.com/) — interactive maps
- [Carto](https://carto.com/) — beautiful Voyager map tiles
- [Prisma](https://www.prisma.io/) — next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) — utility-first CSS
- Every volunteer who donates their time to fight food waste 💚

---

<div align="center">

**If FoodRescue inspired you, please consider giving it a ⭐ — it helps more people discover the project and join the mission!**

Made with 💚 to fight food waste

[⬆ Back to top](#)

</div>
