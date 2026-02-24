import { requireDeveloper } from "../../../../../lib/auth/admin";
import DeveloperLogsClient from "../../../../components/admin/developer/DeveloperLogsClient";

export default async function AdminDeveloperLogsPage() {
  await requireDeveloper();

  return (
    <div className="space-y-4">
      <DeveloperLogsClient />
    </div>
  );
}


