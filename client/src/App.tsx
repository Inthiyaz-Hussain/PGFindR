import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { queryClient } from '@/lib/queryClient'
import { AuthProvider } from '@/hooks/useAuth'
import { ThemeProvider } from '@/components/theme-provider'
import { ProtectedRoute } from '@/components/shared/ProtectedRoute'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { InstallAppButton } from '@/components/InstallAppButton'

// Public
import { HomePage } from '@/pages/home/HomePage'
import { DesignSystemPage } from '@/pages/DesignSystemPage'
import { SearchPage } from '@/pages/search/SearchPage'
import { PGDetailPage } from '@/pages/pg/PGDetailPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { MyInquiriesPage } from '@/pages/inquiry/MyInquiriesPage'
import { PaymentPage } from '@/pages/payment/PaymentPage'
import { PaymentSuccess } from '@/pages/payment/PaymentSuccess'
import { PaymentFailed } from '@/pages/payment/PaymentFailed'
import { TermsConditionsPage } from '@/pages/public/TermsConditionsPage'
import { PrivacyPolicyPage } from '@/pages/public/PrivacyPolicyPage'
import { RefundPolicyPage } from '@/pages/public/RefundPolicyPage'
import { NotFoundPage } from '@/pages/public/NotFoundPage'
import { AboutPage as PublicAboutPage } from '@/pages/public/AboutPage'
import InvoicePage from '@/pages/payment/InvoicePage'

// Seeker
import { SeekerLayout } from '@/pages/seeker/SeekerLayout'
import { SeekerDashboard } from '@/pages/seeker/SeekerDashboard'
import { InquiriesPage } from '@/pages/seeker/InquiriesPage'
import { BookingsPage } from '@/pages/seeker/BookingsPage'
import { ProfilePage } from '@/pages/seeker/ProfilePage'
import { SavedPGsPage } from '@/pages/seeker/SavedPGsPage'
import { AboutPage as SeekerAboutPage } from '@/pages/seeker/AboutPage'
import { HelpDeskPage } from '@/pages/seeker/HelpDeskPage'

// Owner
import { OwnerLayout } from '@/pages/owner/OwnerLayout'
import { OwnerDashboard } from '@/pages/owner/OwnerDashboard'
import { PGListPage } from '@/pages/owner/PGListPage'
import { PGFormPage } from '@/pages/owner/PGFormPage'
import { AvailabilityPage } from '@/pages/owner/AvailabilityPage'
import { OwnerInquiriesPage } from '@/pages/owner/OwnerInquiriesPage'
import { OwnerEarningsPage } from '@/pages/owner/OwnerEarningsPage'
import { OwnerReviewsPage } from '@/pages/owner/OwnerReviewsPage'
import { KYCPage } from '@/pages/owner/KYCPage'
import { AboutPage as OwnerAboutPage } from '@/pages/owner/AboutPage'
import { OwnerResourcesPage } from '@/pages/owner/OwnerResourcesPage'
import { OwnerRegistrationPage } from '@/pages/owner/OwnerRegistrationPage'
import { RegisterCallback } from '@/pages/owner/RegisterCallback'
import { OnboardingPage } from '@/pages/owner/OnboardingPage'
import { OnboardingCallback } from '@/pages/owner/OnboardingCallback'
import { MyTenantsPage } from '@/pages/owner/MyTenantsPage'
import { OwnerSetPasswordPage } from '@/pages/owner/OwnerSetPasswordPage'

// Admin
import { AdminLayout } from '@/pages/admin/AdminLayout'
import { AdminDashboard } from '@/pages/admin/AdminDashboard'
import { AdminPGsPage } from '@/pages/admin/AdminPGsPage'
import { AdminOwnersPage } from '@/pages/admin/AdminOwnersPage'
import { AdminTransactionsPage } from '@/pages/admin/AdminTransactionsPage'
import { AdminCommissionPage } from '@/pages/admin/AdminCommissionPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminPlatformSettingsPage } from '@/pages/admin/AdminPlatformSettingsPage'
import { AdminAuditLogsPage } from '@/pages/admin/AdminAuditLogsPage'
import { AdminKYCPage } from '@/pages/admin/AdminKYCPage'
import { AdminListingInquiriesPage } from '@/pages/admin/AdminListingInquiriesPage'
import { AdminOwnerInquiriesPage } from '@/pages/admin/AdminOwnerInquiriesPage'

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
                <Route path="/about" element={<PublicAboutPage />} />
                <Route path="/pg/:id" element={<PGDetailPage />} />
                <Route path="/my-inquiries" element={<MyInquiriesPage />} />
                <Route path="/terms" element={<TermsConditionsPage />} />
                <Route path="/privacy" element={<PrivacyPolicyPage />} />
                <Route path="/refund-policy" element={<RefundPolicyPage />} />

                {/* Payment */}
                <Route path="/payment/:id" element={<PaymentPage />} />
                <Route path="/payment/success/:id" element={<PaymentSuccess />} />
                <Route path="/payment/failed/:id" element={<PaymentFailed />} />
              </Route>

              {/* Auth (no Navbar) */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/invoice/:type/:paymentId" element={<InvoicePage />} />
              <Route path="/owner/register" element={<OwnerRegistrationPage />} />
              <Route path="/owner/register-callback" element={<RegisterCallback />} />
              <Route path="/owner/set-password" element={<OwnerSetPasswordPage />} />

              {/* Owner Portal - Public Auth Redirects */}
              <Route path="/owner/login" element={<Navigate to="/auth/login?role=owner&from=/owner" replace />} />
              <Route path="/owner/signup" element={<Navigate to="/owner/register" replace />} />

              {/* Admin Portal - Public Auth Redirects */}
              <Route path="/admin/login" element={<Navigate to="/auth/login?role=admin&from=/admin" replace />} />

              {/* Seeker */}
              <Route element={<SeekerLayout />}>
                <Route path="/seeker" element={<SeekerDashboard />} />
                <Route path="/seeker/inquiries" element={<InquiriesPage />} />
                <Route path="/seeker/bookings" element={<BookingsPage />} />
                <Route path="/seeker/saved" element={<SavedPGsPage />} />
                <Route path="/seeker/profile" element={<ProfilePage />} />
                <Route path="/seeker/about" element={<SeekerAboutPage />} />
                <Route path="/seeker/help" element={<HelpDeskPage />} />
              </Route>

              {/* Owner */}
              <Route element={<ProtectedRoute requiredRole="owner" />}>
                <Route path="/owner/onboarding" element={<OnboardingPage />} />
                <Route path="/owner/onboarding-callback" element={<OnboardingCallback />} />

                <Route element={<OwnerLayout />}>
                  <Route path="/owner" element={<OwnerDashboard />} />
                  <Route path="/owner/dashboard" element={<OwnerDashboard />} />
                  <Route path="/owner/pgs" element={<PGListPage />} />
                  <Route path="/owner/pgs/new" element={<PGFormPage />} />
                  <Route path="/owner/pgs/:id/edit" element={<PGFormPage />} />
                  <Route path="/owner/pgs/:id/availability" element={<AvailabilityPage />} />
                  <Route path="/owner/tenants" element={<MyTenantsPage />} />
                  <Route path="/owner/inquiries" element={<OwnerInquiriesPage />} />
                  <Route path="/owner/reviews" element={<OwnerReviewsPage />} />
                  <Route path="/owner/earnings" element={<OwnerEarningsPage />} />
                  <Route path="/owner/kyc" element={<KYCPage />} />
                  <Route path="/owner/about" element={<OwnerAboutPage />} />
                  <Route path="/owner/profile" element={<ProfilePage />} />
                  <Route path="/owner/resources" element={<OwnerResourcesPage />} />
                </Route>
              </Route>

              {/* Admin */}
              <Route element={<ProtectedRoute requiredRole="admin" />}>
                <Route element={<AdminLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/dashboard" element={<AdminDashboard />} />
                  <Route path="/admin/pgs" element={<AdminPGsPage />} />
                  <Route path="/admin/pgs/new" element={<PGFormPage />} />
                  <Route path="/admin/pgs/:id/edit" element={<PGFormPage />} />
                   <Route path="/admin/owners" element={<AdminOwnersPage />} />
                  <Route path="/admin/owner-inquiries" element={<AdminOwnerInquiriesPage />} />
                  <Route path="/admin/listing-inquiries" element={<AdminListingInquiriesPage />} />
                  <Route path="/admin/transactions" element={<AdminTransactionsPage />} />
                  <Route path="/admin/commission" element={<AdminCommissionPage />} />
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/profile" element={<ProfilePage />} />
                  <Route path="/admin/platform-settings" element={<AdminPlatformSettingsPage />} />
                  <Route path="/admin/audit-logs" element={<AdminAuditLogsPage />} />
                  <Route path="/admin/kyc" element={<AdminKYCPage />} />
                </Route>
              </Route>

              <Route path="/design-system" element={<DesignSystemPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
          <InstallAppButton />
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
