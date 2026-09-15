import { notFound } from "next/navigation";
import EmployerApplicants from "@/components/EmployerApplicants";
import RequireEmployer from "@/components/RequireEmployer";

export default function JobApplicantsPage({ params }: { params: { id: string } }) {
  const jobId = Number(params.id);
  if (!Number.isInteger(jobId)) notFound();

  return (
    <RequireEmployer>
      <EmployerApplicants jobId={jobId} />
    </RequireEmployer>
  );
}
