import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './components/PublicLayout';
import HomePage from './pages/HomePage';
import HotelsPage from './pages/HotelsPage';
import HotelDetailPage from './pages/HotelDetailPage';
import BookingPage from './pages/BookingPage';
import RoomDetailPage from './pages/RoomDetailPage';
import OffersPage from './pages/OffersPage';
import OfferDetailPage from './pages/OfferDetailPage';
import GalleryPage from './pages/GalleryPage';
import ContactPage from './pages/ContactPage';
import GenericPage from './pages/GenericPage';
import LoginPage from './pages/LoginPage';
import PlatformLoginPage from './pages/PlatformLoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import DashboardPage from './pages/admin/DashboardPage';
import WebsiteBuilderPage from './pages/admin/WebsiteBuilderPage';
import ReservationsPage from './pages/admin/ReservationsPage';
import PaymentsPage from './pages/admin/PaymentsPage';
import ReportsPage from './pages/admin/ReportsPage';
import AxisRoomsPage from './pages/admin/AxisRoomsPage';
import ContentPage from './pages/admin/ContentPage';
import UsersPage from './pages/admin/UsersPage';
import SupportAccessPage from './pages/admin/SupportAccessPage';
import PlatformLayout from './pages/platform/PlatformLayout';
import PlatformDashboardPage from './pages/platform/PlatformDashboardPage';
import PlatformTenantsPage from './pages/platform/PlatformTenantsPage';
import PlatformTenantOnboardingPage from './pages/platform/PlatformTenantOnboardingPage';
import PlatformTenantDetailPage from './pages/platform/PlatformTenantDetailPage';
import PlatformPlansPage from './pages/platform/PlatformPlansPage';
import PlatformSubscriptionsPage from './pages/platform/PlatformSubscriptionsPage';
import PlatformThemesPage from './pages/platform/PlatformThemesPage';
import PlatformDomainsPage from './pages/platform/PlatformDomainsPage';
import PlatformFeaturesPage from './pages/platform/PlatformFeaturesPage';
import PlatformIntegrationsPage from './pages/platform/PlatformIntegrationsPage';
import PlatformSupportPage from './pages/platform/PlatformSupportPage';
import PlatformUsersPage from './pages/platform/PlatformUsersPage';
import PlatformAuditPage from './pages/platform/PlatformAuditPage';
import PlatformHealthPage from './pages/platform/PlatformHealthPage';

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/hotels" element={<HotelsPage />} />
        <Route path="/hotels/:slug" element={<HotelDetailPage />} />
        <Route path="/hotels/:propertySlug/rooms/:roomSlug" element={<RoomDetailPage />} />
        <Route path="/offers" element={<OffersPage />} />
        <Route path="/offers/:slug" element={<OfferDetailPage />} />
        <Route path="/gallery" element={<GalleryPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="/:slug" element={<GenericPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/platform-login" element={<PlatformLoginPage />} />

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="website" element={<WebsiteBuilderPage />} />
        <Route path="reservations" element={<ReservationsPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="axisrooms" element={<AxisRoomsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="support-access" element={<SupportAccessPage />} />
      </Route>

      <Route path="/platform-admin" element={<PlatformLayout />}>
        <Route index element={<PlatformDashboardPage />} />
        <Route path="tenants" element={<PlatformTenantsPage />} />
        <Route path="tenants/new" element={<PlatformTenantOnboardingPage />} />
        <Route path="tenants/:id" element={<PlatformTenantDetailPage />} />
        <Route path="plans" element={<PlatformPlansPage />} />
        <Route path="subscriptions" element={<PlatformSubscriptionsPage />} />
        <Route path="themes" element={<PlatformThemesPage />} />
        <Route path="domains" element={<PlatformDomainsPage />} />
        <Route path="features" element={<PlatformFeaturesPage />} />
        <Route path="integrations" element={<PlatformIntegrationsPage />} />
        <Route path="support" element={<PlatformSupportPage />} />
        <Route path="users" element={<PlatformUsersPage />} />
        <Route path="audit" element={<PlatformAuditPage />} />
        <Route path="health" element={<PlatformHealthPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
