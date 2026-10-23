import { Dashboard } from "@/components/admin/dashboard";
export default async function Reports({
  searchParams,
}: {
  searchParams: Promise<{ products?: string }>;
}) {
  return <Dashboard performance productIds={(await searchParams).products} />;
}
