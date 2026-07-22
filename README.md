# SwiftPG (PGFindR) - Premium Coliving Space Platform

SwiftPG (PGFindR) is a modern, zero-brokerage coliving and Paying Guest (PG) accommodation platform. Built using React, TypeScript, Node.js, and Supabase, it allows seekers to search and book verified accommodations instantly, and property owners to manage listings, bed availability, inquiries, and payouts seamlessly.

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
- **Logo Harmonization**: Consistent **SwiftPG** branding matching navbar and footer styles.
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
