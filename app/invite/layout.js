import ProtectedRoute from '@/src/components/shared/ProtectedRoute';
import Navbar from '@/src/components/shared/Navbar';

export default function InviteLayout({ children }) {
  return (
    <ProtectedRoute>
      <Navbar />
      <main className="flex-1">{children}</main>
    </ProtectedRoute>
  );
}
