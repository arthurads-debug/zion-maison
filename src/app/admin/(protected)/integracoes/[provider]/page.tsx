import { notFound } from "next/navigation";
import { IntegrationEditor } from "@/components/admin/integrations";
export default async function Integration({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  if (!["meta", "analytics", "pushcut", "whatsapp"].includes(provider))
    notFound();
  return <IntegrationEditor provider={provider} />;
}
