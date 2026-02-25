import { notFound } from "next/navigation";

import { requireCustomer } from "../../../../lib/auth/customer";
import { CustomerAccountClient } from "../../../components/storefront/CustomerAccountClient";

type LocalizedAccountPageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function LocalizedAccountPage({ params }: LocalizedAccountPageProps) {
  const locale = (await params).locale.toLowerCase();
  if (locale !== "th" && locale !== "en" && locale !== "lo") {
    notFound();
  }

  await requireCustomer();
  return <CustomerAccountClient />;
}

