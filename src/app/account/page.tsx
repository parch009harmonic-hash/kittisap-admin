import { requireCustomer } from "../../../lib/auth/customer";
import { CustomerAccountClient } from "../../components/storefront/CustomerAccountClient";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  await requireCustomer();
  return <CustomerAccountClient />;
}
