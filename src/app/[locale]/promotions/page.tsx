import { redirect } from "next/navigation";

type LocalizedPromotionsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function LocalizedPromotionsPage({ params }: LocalizedPromotionsPageProps) {
  const locale = String((await params).locale ?? "").trim().toLowerCase();
  if (locale === "en" || locale === "lo" || locale === "th") {
    redirect(`/${locale}`);
  }
  redirect("/");
}

