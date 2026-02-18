import { ReactNode } from "react";

import { requireAdmin } from "../../../lib/auth/admin";
import { AdminShell } from "../../components/admin/AdminShell";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  await requireAdmin();

  return <AdminShell>{children}</AdminShell>;
}
