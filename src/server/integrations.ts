import "server-only";
import { serviceDatabase, checkDb } from "./supabase";
import {
  encryptSecret,
  decryptSecret,
  safePushcutEndpoint,
  retryDelay,
} from "@/lib/security";
import { integrationSchema } from "@/lib/admin-schemas";
import { HttpError } from "./auth";
import { money } from "@/lib/domain";
import { removeStoredMedia } from "./media-cleanup";
type Integration = {
  provider: string;
  enabled: boolean;
  config: Record<string, unknown>;
  secret_ciphertext: string | null;
  last_status: string;
  last_test_at: string | null;
};
type Job = {
  id: string;
  lease_token: string;
  provider: string;
  attempts: number;
  payload: { type: string; created_at?: string; data: Record<string, unknown> };
};
export async function getIntegration(provider: string, actor: string) {
  const { data, error } = await serviceDatabase().rpc("integration_admin", {
    p_provider: provider,
    p_actor: actor,
  });
  checkDb(error);
  return data as Integration | null;
}
export function maskedIntegration(data: Integration | null) {
  if (!data)
    return {
      enabled: false,
      config: {},
      has_secret: false,
      status: "not_configured",
      last_test_at: null,
    };
  return {
    enabled: data.enabled,
    config: data.config,
    has_secret: !!data.secret_ciphertext,
    status: data.last_status,
    last_test_at: data.last_test_at,
  };
}
export async function saveIntegration(
  provider: string,
  actor: string,
  input: unknown,
) {
  const body = integrationSchema.parse(input);
  if (body.secret && provider === "pushcut") safePushcutEndpoint(body.secret);
  const existing = await getIntegration(provider, actor);
  const cipher = body.secret
    ? encryptSecret(body.secret, process.env.INTEGRATION_ENCRYPTION_KEY || "")
    : null;
  if (
    body.enabled &&
    provider === "pushcut" &&
    ((!cipher && !existing?.secret_ciphertext) || body.remove_secret)
  )
    throw new HttpError(400, "Configure o endpoint secreto antes de ativar.");
  if (body.enabled && provider === "meta" && !body.config.pixel_id)
    throw new HttpError(400, "Informe o Pixel ID.");
  if (body.enabled && provider === "analytics" && !body.config.measurement_id)
    throw new HttpError(400, "Informe o Measurement ID.");
  if (provider === "whatsapp" && body.enabled)
    throw new HttpError(
      400,
      "A API de mensagens precisa de provisionamento e validação do provedor oficial. Use o WhatsApp por link nas configurações da loja.",
    );
  const publicConfig =
    provider === "meta"
      ? { pixel_id: body.config.pixel_id }
      : provider === "analytics"
        ? { measurement_id: body.config.measurement_id }
        : {};
  const { data, error } = await serviceDatabase().rpc("integration_admin", {
    p_provider: provider,
    p_actor: actor,
    p_input: {
      enabled: body.enabled,
      config: body.config,
      secret_ciphertext: cipher,
      remove_secret: body.remove_secret || false,
      public_config: publicConfig,
      last_status:
        provider === "whatsapp" ? "awaiting_integration" : "configured",
    },
  });
  checkDb(error);
  return maskedIntegration(data);
}
export async function pushcutSend(
  secret: string,
  payload: { title: string; text: string },
) {
  return fetch(safePushcutEndpoint(secret), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    redirect: "error",
    signal: AbortSignal.timeout(10000),
  });
}
export async function testIntegration(provider: string, actor: string) {
  const integration = await getIntegration(provider, actor);
  if (!integration)
    throw new HttpError(400, "Salve a configuração antes de testar.");
  if (provider !== "pushcut")
    return {
      message:
        provider === "whatsapp"
          ? "Aguardando API oficial. Mensagens recebidas ainda não estão conectadas."
          : "Configuração cadastrada. A instalação no navegador deve ser validada com consentimento e as ferramentas oficiais do fornecedor.",
      status: "configured",
    };
  if (!integration.secret_ciphertext)
    throw new HttpError(400, "Endpoint ainda não cadastrado.");
  const secret = decryptSecret(
    integration.secret_ciphertext,
    process.env.INTEGRATION_ENCRYPTION_KEY || "",
  );
  const response = await pushcutSend(secret, {
    title: "[TESTE] Zion Maison",
    text: "Teste autorizado de conexão. Esta notificação não representa uma visita ou venda.",
  });
  const status = response.ok
    ? "test_succeeded"
    : `test_http_${response.status}`;
  await serviceDatabase().rpc("integration_admin", {
    p_provider: provider,
    p_actor: actor,
    p_input: {
      enabled: integration.enabled,
      config: integration.config,
      last_status: status,
      tested: true,
      public_config: {},
    },
  });
  if (!response.ok)
    throw new HttpError(
      400,
      `O Pushcut respondeu HTTP ${response.status}. Revise o endpoint e as permissões do plano.`,
    );
  return { message: "Notificação de teste aceita pelo Pushcut.", status };
}
function notification(job: Job, config: Record<string, unknown>) {
  const data = job.payload.data;
  const type = job.payload.type;
  if (type === "summary")
    return {
      title: "Resumo Zion Maison",
      text: `Novas sessões: ${Number(data.sessions) || 0}\nCliques no WhatsApp: ${Number(data.whatsapp) || 0}\nEnvios de mensagem e vendas não confirmados.`,
    };
  if (type === "site_visited") {
    const attribution = data.attribution as Record<string, string> | undefined;
    return {
      title: "🛍️ Nova visita à Zion Maison!",
      text: `Origem: ${attribution?.utm_source || "Desconhecida"}\nHorário: ${job.payload.created_at ? new Date(job.payload.created_at).toLocaleTimeString("pt-BR", { timeZone: "America/Belem" }) : "Não informado"}`,
    };
  }
  if (type === "whatsapp_intent_created") {
    const items = Array.isArray(data.items)
      ? (data.items as Record<string, unknown>[])
      : [];
    return {
      title: "💬 Novo interesse de compra!",
      text:
        items
          .map(
            (i) =>
              `${i.name}\n${i.color} / ${i.size} · ${i.quantity} un. · ${money(Number(i.unit_price_cents) || 0)}`,
          )
          .join("\n\n") +
        "\n\nSeleção preparada no site — abertura do WhatsApp e envio não confirmados.",
    };
  }
  if (type === "whatsapp_click")
    return {
      title: "💬 WhatsApp aberto pelo site",
      text: "Envio de mensagem não confirmado. Consulte as intenções no painel.",
    };
  if (type === "whatsapp_message_received")
    return {
      title: "💬 Mensagem recebida",
      text: "Recebimento confirmado pelo webhook autenticado do provedor oficial.",
    };
  return {
    title: String(config.title || "Atualização Zion Maison").slice(0, 150),
    text: `Evento: ${type}\n${String(config.text || "Consulte o painel para conferir os detalhes.").slice(0, 1000)}`,
  };
}
export async function processDeliveries(options?: {
  assetId?: string;
  storageOnly?: boolean;
}) {
  const db = serviceDatabase();
  if (!options) {
    const { error } = await db.rpc("delivery_jobs", { p_action: "summary" });
    checkDb(error);
  }
  const { data, error } = await db.rpc("delivery_jobs", {
    p_action: options ? "storage-lease" : "lease",
    p_id: options?.assetId ?? null,
  });
  checkDb(error);
  let delivered = 0,
    failed = 0;
  for (const job of (data || []) as Job[]) {
    if (job.provider === "storage") {
      let state = "delivered";
      try {
        await removeStoredMedia(job.payload.data);
        delivered++;
      } catch {
        state = job.attempts < 5 ? "pending" : "failed";
        if (state === "failed") failed++;
      }
      const { error } = await db.rpc("delivery_jobs", {
        p_action: "finish",
        p_id: job.id,
        p_data: {
          state,
          lease_token: job.lease_token,
          error: state === "delivered" ? null : "storage_cleanup_failed",
          next_attempt_at: new Date(
            Date.now() + retryDelay(job.attempts),
          ).toISOString(),
        },
      });
      checkDb(error);
      continue;
    }
    const { data: raw, error: integrationError } = await db.rpc(
      "worker_integration",
      { p_provider: job.provider },
    );
    const integration = raw as Integration | null;
    if (integrationError || !integration?.secret_ciphertext) {
      await db.rpc("delivery_jobs", {
        p_action: "finish",
        p_id: job.id,
        p_data: {
          state: "cancelled",
          error: "integration_disabled",
          lease_token: job.lease_token,
        },
      });
      continue;
    }
    const { data: allowed, error: limitError } = await db.rpc(
      "consume_rate_limit",
      {
        p_key: `provider:${job.provider}`,
        p_limit: Number(integration.config.rate_per_hour) || 30,
        p_seconds: 3600,
      },
    );
    if (limitError || !allowed) {
      await db.rpc("delivery_jobs", {
        p_action: "finish",
        p_id: job.id,
        p_data: {
          lease_token: job.lease_token,
          state: "pending",
          next_attempt_at: new Date(Date.now() + 3600000).toISOString(),
          error: "frequency_limit",
          deferred: true,
        },
      });
      continue;
    }
    let state = "failed",
      code: number | undefined,
      next = Date.now() + retryDelay(job.attempts),
      errorCode = "network_error";
    try {
      const secret = decryptSecret(
        integration.secret_ciphertext,
        process.env.INTEGRATION_ENCRYPTION_KEY || "",
      );
      const response = await pushcutSend(
        secret,
        notification(job, integration.config),
      );
      code = response.status;
      if (response.ok) {
        state = "delivered";
        delivered++;
        errorCode = "";
      } else if (response.status === 429 || response.status >= 500) {
        state = job.attempts < 5 ? "pending" : "failed";
        const retry = response.headers.get("retry-after");
        if (retry) {
          const seconds = Number(retry);
          const delay = Number.isFinite(seconds)
            ? seconds * 1000
            : new Date(retry).getTime() - Date.now();
          if (Number.isFinite(delay))
            next = Date.now() + Math.max(15000, Math.min(3600000, delay));
        }
        errorCode = `http_${response.status}`;
      } else errorCode = `http_${response.status}`;
    } catch {
      state = job.attempts < 5 ? "pending" : "failed";
    }
    if (state === "failed") failed++;
    const { error: e } = await db.rpc("delivery_jobs", {
      p_action: "finish",
      p_id: job.id,
      p_data: {
        lease_token: job.lease_token,
        state,
        code: code ?? null,
        error: errorCode || null,
        next_attempt_at: new Date(
          next + Math.floor(Math.random() * 3000),
        ).toISOString(),
      },
    });
    checkDb(e);
  }
  return { claimed: (data || []).length, delivered, failed };
}
