import { AppShell } from "@/components/app-shell";
import { DashboardScreen } from "@/components/dashboard-screen";
import { Landing } from "@/components/landing";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) return <Landing />;
  return (
    <AppShell>
      <DashboardScreen />
    </AppShell>
  );
}
