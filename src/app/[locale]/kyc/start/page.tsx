import { notFound } from "next/navigation";

import { CustomerKycStartClient } from "../../../../components/storefront/CustomerKycStartClient";

type LocalizedKycStartPageProps = {
  params: Promise<{ locale: string }>;
};

export const dynamic = "force-dynamic";

export default async function LocalizedKycStartPage({ params }: LocalizedKycStartPageProps) {
  const locale = (await params).locale.toLowerCase();
  if (locale !== "th" && locale !== "en" && locale !== "lo") {
    notFound();
  }

  return <CustomerKycStartClient />;
}
