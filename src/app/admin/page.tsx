import { AdminLogin } from "./_components/admin-login";

// Force dynamic rendering - admin page needs database access
export const dynamic = "force-dynamic";

export default function AdminPage() {
  return <AdminLogin />;
}

