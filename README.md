# FindPGRoom (PGFindR) - Premium Coliving Space Platform

FindPGRoom (PGFindR) is a modern, zero-brokerage coliving and Paying Guest (PG) accommodation platform. Built using React, TypeScript, Node.js, and Supabase, it allows seekers to search and book verified accommodations instantly, and property owners to manage listings, bed availability, inquiries, and payouts seamlessly.

---

## 🌟 Key Features

### Seeker Portal
- **Frictionless Navigation**: Bypasses manual credential input for instant demo login.
- **Automated Location Prompts**: Asks for the target city on first load to filter listings immediately.
- **Real-Time Search**: Custom modal overlays and filters for rent, sharing types (Single/Double/Triple), and amenities (WiFi, Food, AC, Parking, Security).
- **Instant Inquiries**: Simplified guest checkout form mapping details to owners with one-click email confirmation.
- **Personalized Dashboards**: Live tracking of inquiries, active bookings, and saved listings.

### Owner Dashboard
- **Listing Management**: Add and edit PG listings with descriptions, address, rules, rates, and photo uploads.
- **Interactive Bed Management**: Manage room assignments, floor numbers, sharing preferences, and track occupied vs. vacant beds.
- **Inquiry Desk**: Review and manage seeker requests, update visit statuses, and log custom tenant notes.
- **Earnings & KYC**: Verify identity via Aadhaar/PAN, link bank details, and track monthly rental income.

### Admin Panel
- **Listing Approvals**: Approve or reject newly registered PGs.
- **Platform Analytics**: Monitor overall user registrations (Seekers & Owners), active rooms, transactions, and commission logs.

### Global Enhancements
- **Logo Harmonization**: Consistent **FindPGRoom** branding matching navbar and footer styles.
- **Role-Appropriate Navbar**: Dynamic headers adapting menu choices and hiding/showing search controls depending on the active user context.
- **Page-Appropriate Footer**: Contextual support links and call-to-actions based strictly on the screen path.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite), TypeScript, Tailwind CSS, Radix UI (dialogs & sheets), Lucide React (icons), TanStack Query (state sync).
- **Backend**: Node.js, Express, TypeScript.
- **Database & Authentication**: Supabase (PostgreSQL), Supabase Auth.
- **Testing Suite**: Vitest, React Testing Library, Mock Service Worker (MSW).

---

## 📂 Project Structure

```text
PGFindR/
├── client/                 # React frontend client
│   ├── src/
│   │   ├── components/     # Reusable layout, search, and page UI components
│   │   ├── hooks/          # Authentication and Firebase integration
│   │   ├── pages/          # Seeker, Owner, and Admin dashboards and sub-views
│   │   └── __tests__/      # Automated frontend unit and integration tests
├── server/                 # Express backend server
│   ├── src/
│   │   └── routes/         # REST API routes (inquiries, PGs, payouts)
├── shared/                 # Common type definitions and interfaces
└── supabase/               # Supabase database configurations, seed data, and rules
```

---

## 🚀 Setup & Execution

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org/) installed (v18+ recommended).

### 2. Environment Configuration
Create a `.env` file at the root of the project with the following configuration:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001
VITE_FIREBASE_API_KEY=your_firebase_api_key
```

### 3. Install Dependencies
Run the installation command at the workspace root:
```bash
npm install
```

### 4. Running the Development Server
Launch both the frontend client and the backend server concurrently:
```bash
npm run dev
```

### 5. Running Tests
Run the unit test suite to assert component and endpoint validity:
```bash
npm run test
```

---

## 🚀 Development History & New Features

Below is a chronological log of all enhancements, features, and optimizations implemented during the pair programming sessions:

### 1. Cashfree Payment Gateway Migration
- **Complete Gateway Swap**: Replaced Razorpay with Cashfree across the entire stack (database migrations, backend payment routes, client-side scripts, sharing modules, and automated unit test suites).
- **Cashfree Web Checkout SDK**: Integrated Cashfree Web SDK for redirect-based order checkouts, supporting live production callbacks and sandbox environments.
- **Disbursements Ledger**: Enabled automatic calculation and tracking of Cashfree PG disbursements and payouts to property owners.

### 2. Admin KYC Panel Refactoring
- Rewrote the filtering, schema mappings, and in-memory pagination logic for the Admin Owner KYC verification panel (`AdminOwnersPage.tsx`), enabling administrators to easily inspect and approve pending property owners.

### 3. Query Alignment & 500 Error Fixes
- Addressed database query compilation errors (500 Internal Server Errors) by removing legacy references to non-existent schema fields (e.g. `email` column in the user profiles table) from all PG and booking SELECT queries.

### 4. Admin Settings Panel & Custom Tiers
- Built input forms in the Admin Platform Settings panel to manage flat **Platform Fees**, **Service Charges**, and a **3-Tier Owner Commission Rule** based on monthly rent thresholds (e.g., Tier 1 ≤ ₹5k, Tier 2 ≤ ₹10k, Tier 3 > ₹10k).
- Binds these fee parameters permanently onto booking records at creation time, preserving financial history.

### 5. Seeker Payment Options & Breakdown
- Integrated a payment plan selector on the Seeker checkout screen (`PaymentPage.tsx`) allowing seekers to choose between paying:
  - **Option 1**: Security Deposit (Advance) Only.
  - **Option 2**: Security Deposit + First Month's Rent.
- Renders an interactive, real-time bill breakdown listing the Security Deposit, First Month's Rent (if selected), Platform Fee, and Service Charge before payment confirmation.

### 6. Owner Onboarding Auto-Bypass
- Added a self-healing background check on owner profile login (`useAuth.tsx`). If an owner already has active PG listings, they bypass the onboarding questions and land directly on their dashboard.

### 7. Bed Count Selector & Proportional Pricing
- Added a digit numeric input field in the Seeker Inquiry form.
- Integrates dynamic Zod validation rules that limit the maximum allowed beds based on the chosen sharing type (e.g. max 1 bed for Single Sharing, up to 2 for Double, up to 3 for Triple).
- Scales all transaction amounts (monthly rent, deposit, platform fee, service charge, owner payouts, and commission amounts) proportionally by the number of beds booked.
- Updates status for exactly `num_beds` beds of that sharing type to `'reserved'` on successful checkout.

