import { notFound } from "next/navigation";
import EmployerApplicationDetail from "@/components/EmployerApplicationDetail";
import RequireEmployer from "@/components/RequireEmployer";

export default function ApplicationDetailPage({
  params,
}: {
  params: { id: string; applicationId: string };
}) {
  const jobId = Number(params.id);
  const applicationId = Number(params.applicationId);
  if (!Number.isInteger(jobId) || !Number.isInteger(applicationId)) notFound();

  return (
    <RequireEmployer>
      <EmployerApplicationDetail jobId={jobId} applicationId={applicationId} />
    </RequireEmployer>
  );
}
