# Smart Ration Distribution System (PDS)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://reactjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748.svg)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC.svg)](https://tailwindcss.com/)

A modern, transparent, and secure Public Distribution System (PDS) platform designed according to **ISO/IEC/IEEE 29148** requirements engineering standards. The system automates subsidized commodity entitlements, prevents ghost transactions and inventory leakage through QR verification and atomic database transactions, provides queue booking and grievance redressal, and generates real-time administrative analytics.

---

## 📐 System Architecture

The repository is structured as an enterprise-grade TypeScript monorepo:

```
smart-ration-distribution-system/
├── shared/             # Shared TypeScript DTOs, interfaces, and type definitions
├── backend/            # Express.js REST API with Prisma ORM & SQLite/PostgreSQL
│   ├── prisma/         # Prisma schema and development database seed script
│   ├── src/
│   │   ├── config/     # Database and server configurations
│   │   ├── controllers/# Business logic for Auth, Beneficiary, Shopkeeper, Admin, Distribution, etc.
│   │   ├── middlewares/# JWT Auth, Role Guard, Rate Limiter, Error Handler
│   │   ├── services/   # Notification and abstraction services
│   │   └── tests/      # Automated integration test suites (7 modules)
│   └── Dockerfile      # Production multi-stage Docker build container
├── frontend/           # Vite + React + Tailwind CSS client application
│   ├── src/
│   │   ├── components/ # Reusable UI cards, tables, modals, navbar, notifications
│   │   ├── pages/      # Role-based views for Beneficiary, Shopkeeper, and Admin
│   │   ├── services/   # Axios API client with request/response interceptors
│   │   └── types/      # Frontend state & data models
│   └── Dockerfile      # Production Nginx container build
├── docker-compose.yml  # Multi-container orchestration (PostgreSQL, Backend, Frontend)
└── .env.example        # Environment configuration template
```

---

## 🛠️ Prerequisites

Before installing, ensure your environment meets the following requirements:

- **Node.js**: `v20.x` or higher (LTS recommended)
- **npm**: `v10.x` or higher
- **Git**: `v2.x` or higher
- **Docker & Docker Compose** *(Optional, for containerized execution or local PostgreSQL)*

---

## 🚀 Step-by-Step Installation & Quickstart

### 1. Clone the Repository & Install Dependencies

```bash
git clone https://github.com/your-org/smart-ration-distribution-system.git
cd smart-ration-distribution-system

# Install all workspace dependencies (shared, backend, frontend)
npm install
```

### 2. Environment Configuration

Copy the example environment configuration:

```bash
cp .env.example .env
```

Ensure the environment variables match your local environment:
- `PORT`: `5000` (Backend API Port)
- `VITE_API_URL`: `http://localhost:5000/api`
- `DATABASE_URL`: `"file:./dev.db"` (for lightweight SQLite dev setup) or `"postgresql://postgres:postgres@localhost:5432/smart_ration_db?schema=public"`

### 3. Build Monorepo Workspaces

Compile TypeScript definitions and frontend assets:

```bash
npm run build
```

---

## 🗄️ Database Setup & Development Seeding

Initialize the database schema and populate it with fictional development seed data:

```bash
# Generate Prisma Client code bindings
npm run db:generate

# Synchronize database schema (creates tables and constraints)
npm run db:push

# Populate database with development fixtures (Shops, Items, Entitlements, Users)
npm run db:seed
```

---

## 💻 Running the Application Locally

### Standard Development Execution

Launch backend and frontend dev servers in separate terminal sessions:

#### Terminal 1: Backend Server (Port 5000)
```bash
npm run dev:backend
```
*API Base URL*: `http://localhost:5000/api`

#### Terminal 2: Frontend Web App (Port 5173)
```bash
npm run dev:frontend
```
*Client URL*: `http://localhost:5173`

---

## 🐳 Containerized Execution (Docker Compose)

To run the entire system (PostgreSQL 16, Node Backend, Nginx Frontend) in isolated Docker containers:

```bash
# Start all services in detached mode
docker compose up -d --build

# Inspect running containers
docker compose ps

# View container logs
docker compose logs -f

# Stop containerized services
docker compose down
```

---

## 🔑 Development Demo Accounts

Use the following pre-seeded test credentials to explore role-specific workflows:

| Role | Email | Password | Details & Context |
| :--- | :--- | :--- | :--- |
| **Beneficiary** | `beneficiary@gmail.com` | `password123` | **Card No**: `RC_DELHI_100293`<br>**Category**: BPL (Below Poverty Line)<br>**QR Token**: `CARD_RC_DELHI_100293_SEED_TOKEN`<br>**Assigned FPS**: Sector 12, RK Puram |
| **Shopkeeper** *(FPS Dealer)* | `shopkeeper1@pds.gov.in` | `password123` | **Assigned Shop**: Central Fair Price Shop #1 (`FPS_DELHI_001`) |
| **Administrator** | `admin@pds.gov.in` | `password123` | **Permissions**: System-wide configuration, policy rules, grievance response, reports |

---

## 📷 QR Scanning & Manual Verification Guide

### Camera-Based Scanning Workflow
1. Log in as **Shopkeeper** (`shopkeeper1@pds.gov.in`).
2. Navigate to **QR Verification & Distribution** in the sidebar navigation.
3. Click **Start Scanner** to initialize device camera feed.
4. Point the camera at a Beneficiary's QR code displayed on their **Digital Card** page.

### Manual Verification Fallback (Testing / Devices without Camera)
1. On the QR Verification page, locate the **Manual Reference Entry** input field.
2. Input the seed QR reference token: `CARD_RC_DELHI_100293_SEED_TOKEN` (or the card number `RC_DELHI_100293`).
3. Click **Verify Beneficiary**.
4. The system validates the code against the backend database and loads real-time eligible entitlements (Rice, Wheat, Sugar).
5. Input requested quantities and click **Finalize Ration Distribution**.
6. An **atomic transaction** updates stock levels and outputs a printable **Digital Receipt** (`RCPT_...`).

---

## 🧪 Running Automated Test Suites

The repository includes 7 comprehensive backend integration test suites testing end-to-end business workflows, database transactional integrity, and security access controls.

### Run All Integration Tests
```bash
npm test
```

### Run Individual Test Suites
```bash
# 1. Beneficiary Access & Security Tests
npx ts-node backend/src/tests/beneficiaryAccess.test.ts

# 2. Shopkeeper Stock Inventory Tests
npx ts-node backend/src/tests/shopkeeperStock.test.ts

# 3. QR Verification & Dispensing Workflow Tests
npx ts-node backend/src/tests/distributionWorkflow.test.ts

# 4. Queue Booking & Notification Service Tests
npx ts-node backend/src/tests/queueAndNotification.test.ts

# 5. Complaint Management & Grievance Tests
npx ts-node backend/src/tests/complaintManagement.test.ts

# 6. Administration Module & Security Audit Tests
npx ts-node backend/src/tests/adminModule.test.ts

# 7. Reports & CSV Export Analytics Tests
npx ts-node backend/src/tests/reportsAndAnalytics.test.ts
```

---

## 🔧 Troubleshooting Guide

| Issue / Symptom | Possible Cause | Resolution Step |
| :--- | :--- | :--- |
| `Error: Port 5000 is already in use` | Another process is occupying Port 5000. | Stop existing Node processes (`npx kill-port 5000`) or update `PORT` in `.env`. |
| `PrismaClientInitializationError` | Database file missing or PostgreSQL server unallocated. | Run `npm run db:push` to re-create SQLite database or start PostgreSQL via `docker compose up -d postgres`. |
| `HTTP 401 Unauthorized` | Missing or expired JWT token. | Re-authenticate at `/login` to acquire a fresh JWT token in `localStorage`. |
| `HTTP 403 Forbidden` | Accessing endpoint prohibited for current user role. | Log out and switch to an account with appropriate permissions (e.g., Admin for `/admin` routes). |
| `Camera Permission Denied` | Browser blocked video stream access. | Grant camera permissions in browser site settings or use the **Manual Verification Fallback**. |

---

## 📋 Production Deployment Checklist

> [!IMPORTANT]
> **Distinction Note**: The steps above establish a **Locally Working Demonstration**. Production deployments require the hardening measures outlined below.

Before deploying the Smart Ration Distribution System to a cloud production environment (AWS, GCP, Azure, DigitalOcean), complete the following checklist:

- [ ] **HTTPS / TLS Termination**: Configure a reverse proxy (Nginx, Caddy, or Cloudflare Application Gateway) with Let's Encrypt SSL certificates for secure HTTPS transport.
- [ ] **Secret Management**: Remove all hardcoded default secrets. Inject production secrets (`JWT_SECRET`, `DATABASE_URL`) from a secure secret store (AWS Secrets Manager, HashiCorp Vault, Kubernetes Secrets).
- [ ] **Managed PostgreSQL Database**: Deploy a high-availability PostgreSQL cluster (e.g., AWS RDS / GCP Cloud SQL) with connection pooling (PgBouncer), SSL connection enforcement, automated daily backups, and Point-in-Time Recovery (PITR).
- [ ] **Database Migrations**: Execute zero-downtime database migrations using `npx prisma migrate deploy` prior to updating application containers.
- [ ] **Centralized Logging & Monitoring**: Configure structured logging (Winston/Pino) shipping logs to Datadog/ELK, and set up error tracing with Sentry.
- [ ] **API Protection & Firewalls**: Enable Web Application Firewall (WAF) rules, enforce strict CORS domain origin restrictions, and configure rate limiters at the ingress level.
- [ ] **Data Privacy & Access Audit**: Verify user data anonymization compliance and ensure security audit logs are archived to immutable cloud storage (S3 Object Lock).

---

## 📄 License

This project is open-source under the **MIT License**.
