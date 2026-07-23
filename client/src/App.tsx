import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/components/theme-provider'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { PublicLayout } from '@/components/layout/PublicLayout'

// Public
import { HomePage } from '@/pages/home/HomePage'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { SearchPage } from '@/pages/search/SearchPage'
import { PGDetailPage } from '@/pages/pg/PGDetailPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { MyInquiriesPage } from '@/pages/inquiry/MyInquiriesPage'
import { PaymentPage } from '@/pages/payment/PaymentPage'
import { PaymentSuccess } from '@/pages/payment/PaymentSuccess'
import { PaymentFailed } from '@/pages/payment/PaymentFailed'

// Seeker
import { SeekerLayout } from '@/pages/seeker/SeekerLayout'
import { SeekerDashboard } from '@/pages/seeker/SeekerDashboard'
import { InquiriesPage } from '@/pages/seeker/InquiriesPage'
import { BookingsPage } from '@/pages/seeker/BookingsPage'
import { ProfilePage } from '@/pages/seeker/ProfilePage'

// Owner
import { OwnerLayout } from '@/pages/owner/OwnerLayout'
import { OwnerDashboard } from '@/pages/owner/OwnerDashboard'
import { PGListPage } from '@/pages/owner/PGListPage'
import { PGFormPage } from '@/pages/owner/PGFormPage'
import { AvailabilityPage } from '@/pages/owner/AvailabilityPage'
import { OwnerInquiriesPage } from '@/pages/owner/OwnerInquiriesPage'
import { OwnerEarningsPage } from '@/pages/owner/OwnerEarningsPage'
import { KYCPage } from '@/pages/owner/KYCPage'

// Admin
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminPGsPage } from '@/pages/admin/AdminPGsPage'
import { AdminOwnersPage } from '@/pages/admin/AdminOwnersPage'
import { AdminTransactionsPage } from '@/pages/admin/AdminTransactionsPage'
import { AdminCommissionPage } from '@/pages/admin/AdminCommissionPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes with Navbar */}
              <Route element={<PublicLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchPage />} />
                <Route path="/pg/:id" element={<PGDetailPage />} />
                <Route path="/my-inquiries" element={<MyInquiriesPage />} />

                {/* Payment */}
                <Route path="/payment/:id" element={<PaymentPage />} />
                <Route path="/payment/success/:id" element={<PaymentSuccess />} />
                <Route path="/payment/failed/:id" element={<PaymentFailed />} />
              </Route>

              {/* Auth (no Navbar) */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />

              {/* Seeker */}
              <Route element={<SeekerLayout />}>
                <Route path="/seeker" element={<SeekerDashboard />} />
                <Route path="/seeker/inquiries" element={<InquiriesPage />} />
                <Route path="/seeker/bookings" element={<BookingsPage />} />
                <Route path="/seeker/profile" element={<ProfilePage />} />
              </Route>

              {/* Owner */}
              <Route element={<ProtectedRoute requiredRole="owner" />}>
                <Route element={<OwnerLayout />}>
                  <Route path="/owner" element={<OwnerDashboard />} />
                  <Route path="/owner/pgs" element={<PGListPage />} />
                  <Route path="/owner/pgs/new" element={<PGFormPage />} />
                  <Route path="/owner/pgs/:id/edit" element={<PGFormPage />} />
                  <Route path="/owner/pgs/:id/availability" element={<AvailabilityPage />} />
                  <Route path="/owner/inquiries" element={<OwnerInquiriesPage />} />
                  <Route path="/owner/earnings" element={<OwnerEarningsPage />} />
                  <Route path="/owner/kyc" element={<KYCPage />} />
                </Route>
              </Route>

              {/* Admin */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/pgs" element={<AdminPGsPage />} />
                  <Route path="/admin/owners" element={<AdminOwnersPage />} />
                  <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
                  <Route path="/admin/commission" element={<AdminCommissionPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                </Route>
              </Route>

              <Route path="/design-system" element={<DesignSystemPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
