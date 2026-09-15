import { notFound } from "next/navigation";
import EmployerJobEdit from "@/components/EmployerJobEdit";
import RequireEmployer from "@/components/RequireEmployer";

export const metadata = { title: "Edit role — Noticeboard" };

export default function EmployerJobEditPage({ params }: { params: { id: string } }) {
  const jobId = Number(params.id);
  if (!Number.isInteger(jobId)) notFound();

  return (
    <RequireEmployer>
      <EmployerJobEdit jobId={jobId} />
    </RequireEmployer>
  );
}
