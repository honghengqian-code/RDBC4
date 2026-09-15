import EmployerDashboard from "@/components/EmployerDashboard";
import RequireEmployer from "@/components/RequireEmployer";

export const metadata = { title: "Your roles — Noticeboard" };

export default function EmployerDashboardPage() {
  return (
    <RequireEmployer>
      <EmployerDashboard />
    </RequireEmployer>
  );
}
