import { requireCustomer } from "../../../lib/auth/customer";
import { CustomerOrdersClient } from "../../components/storefront/CustomerOrdersClient";

export const dynamic = "force-dynamic";

export default async function CustomerOrdersPage() {
  await requireCustomer();
  return <CustomerOrdersClient />;
}
