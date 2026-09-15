import JobForm from "@/components/JobForm";
import RequireEmployer from "@/components/RequireEmployer";

export const metadata = { title: "Post a role — Noticeboard" };

export default function EmployerPostPage() {
  return (
    <RequireEmployer>
      <JobForm />
    </RequireEmployer>
  );
}
