<div align="center">

# 🍱 FoodRescue

### *Connecting Surplus Food with People Who Need It*

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)

</div>

---

## 📖 Overview

**FoodRescue** is a full-stack web platform that bridges the gap between food donors and those in need. Organizations, restaurants, and individuals with surplus food can list their donations, while receivers can browse and claim available listings. Volunteers can opt in to handle logistics — ensuring food gets from point A to point B safely and efficiently.

Built with a modern, component-driven React frontend and a secure RESTful Node.js/Express backend, FoodRescue makes the process of food redistribution seamless, transparent, and trackable in real time.

---

## ✨ Features

### 🧑‍🤝‍🧑 Role-Based System
- **Donors** — Post food listings with details (title, quantity, food type, expiry time, location, and images). Manage and track their active listings.
- **Receivers** — Browse available food, claim listings, choose self-pickup or volunteer delivery, and track their orders in real time.
- **Volunteers** — View and accept delivery tasks, update task statuses (Assigned → Picked Up → Delivered), and view task locations on a live map.

### 🗺️ Interactive Live Maps
- Real-time pickup/delivery location visualization powered by **Leaflet** and **OpenStreetMap**.
- Animated map camera transitions and color-coded markers per role.
- Embedded maps available on the Food Detail, Tracking, and Volunteer Dashboard pages.

### 📦 End-to-End Donation Workflow
- Full status lifecycle tracking: `AVAILABLE → CLAIMED → ASSIGNED → PICKED UP → DELIVERED`
- Automatic status updates propagated across Donor, Receiver, and Volunteer views.

### 🔐 Secure Authentication
- JWT-based authentication with protected, role-aware routes.
- Passwords are securely hashed using **bcryptjs**.
- Persistent login sessions via Zustand state management.

### 📊 Impact Dashboard
- Platform-wide statistics: total meals saved, active donors, deliveries completed, and more.
- Serves as a public-facing motivational page to encourage participation.

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite, React Router v7, Tailwind CSS v4 |
| **State Management** | Zustand |
| **Maps** | Leaflet, React-Leaflet |
| **UI Utilities** | Lucide React, React Hot Toast, date-fns |
| **Backend** | Node.js, Express 5 |
| **Database** | PostgreSQL |
| **ORM** | Prisma |
| **Authentication** | JSON Web Tokens (JWT), bcryptjs |
| **File Uploads** | Multer |

---

## 📁 Project Structure

```
FoodRescue/
├── client/                     # React frontend (Vite)
│   └── src/
│       ├── components/         # Shared UI components (Navbar, MapView, FoodCard, StatusBadge)
│       ├── pages/
│       │   ├── donor/          # DonorDashboard, AddFoodPage, ManageListingsPage
│       │   ├── receiver/       # ReceiverDashboard, TrackingPage
│       │   ├── volunteer/      # VolunteerDashboard
│       │   ├── HomePage.jsx
│       │   ├── FoodDetailPage.jsx
│       │   ├── ImpactPage.jsx
│       │   ├── LoginPage.jsx
│       │   └── SignupPage.jsx
│       └── store/              # Zustand auth store
│
├── server/                     # Node.js/Express backend
│   ├── prisma/
│   │   ├── schema.prisma       # Database schema
│   │   └── seed.js             # Database seeder
│   └── src/
│       ├── middleware/         # Auth middleware (JWT verification)
│       ├── routes/             # auth, food, claims, donor, volunteer, stats
│       └── index.js            # Express app entry point
│
├── uploads/                    # Uploaded food images (served statically)
├── .env                        # Root environment variables
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [PostgreSQL](https://www.postgresql.org/) v14 or higher
- [Git](https://git-scm.com/)

### 1. Clone the Repository

```bash
git clone https://github.com/grafenx07/foodrescue.git
cd foodrescue
```

### 2. Configure Environment Variables

Create a **`.env`** file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/foodrescue"
JWT_SECRET="your_super_secret_jwt_key"
PORT=4000
```

> ⚠️ Replace `USER` and `PASSWORD` with your actual PostgreSQL credentials.

### 3. Install Dependencies

**Backend:**
```bash
npm install
```

**Frontend:**
```bash
cd client
npm install
cd ..
```

### 4. Set Up the Database

```bash
# Push the schema to PostgreSQL
npm run db:push

# (Optional) Generate Prisma client
npm run db:generate

# (Optional) Seed the database with sample data
npm run db:seed
```

### 5. Run the Application

Open **two terminals** and run:

**Terminal 1 — Backend:**
```bash
npm run dev
# Server runs at http://localhost:4000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# App runs at http://localhost:5173
```

---

## 📜 Available Scripts

From the **project root:**

| Script | Description |
|---|---|
| `npm run dev` | Start the backend server with Nodemon |
| `npm run start` | Start the backend server in production |
| `npm run db:push` | Push Prisma schema to the database |
| `npm run db:seed` | Seed the database with sample data |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Open Prisma Studio (database GUI) |

From the **`client/` directory:**

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build the production bundle |
| `npm run preview` | Preview the production build |

---

## 🗄️ Database Schema

The core data models are:

- **`User`** — Stores all users with a role (`DONOR`, `RECEIVER`, `VOLUNTEER`).
- **`FoodListing`** — A food donation record created by a Donor, with status tracking.
- **`Claim`** — Created when a Receiver claims a FoodListing. Supports `SELF` or `VOLUNTEER` pickup.
- **`VolunteerTask`** — Assigned when a Volunteer accepts a Claim requiring delivery.

**Food Status Lifecycle:**

```
AVAILABLE → CLAIMED → ASSIGNED → PICKED_UP → DELIVERED
                                            ↘ CANCELLED / EXPIRED
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/auth/register` | Register a new user | Public |
| `POST` | `/api/auth/login` | Login and get a JWT | Public |
| `GET` | `/api/food` | Get all available food listings | Public |
| `GET` | `/api/food/:id` | Get a specific food listing | Public |
| `POST` | `/api/food` | Create a new food listing | Donor |
| `DELETE`| `/api/food/:id` | Delete a listing | Donor |
| `POST` | `/api/claims` | Claim a food listing | Receiver |
| `GET` | `/api/claims/my` | Get receiver's claims | Receiver |
| `GET` | `/api/volunteer/tasks` | Get available volunteer tasks | Volunteer |
| `PATCH` | `/api/volunteer/tasks/:id`| Update a task status | Volunteer |
| `GET` | `/api/stats` | Get platform-wide impact stats | Public |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Grafenberg Langpen**

- 🐙 GitHub: [@grafenx07](https://github.com/grafenx07)
- 📧 Email: [grafenberglangpen7@gmail.com](mailto:grafenberglangpen7@gmail.com)

---

<div align="center">

Made with ❤️ to fight food waste.

*If this project helped you, please consider giving it a ⭐ on GitHub!*

</div>
