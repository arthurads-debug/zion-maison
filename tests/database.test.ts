import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";

let db: PGlite;
const owner = "11111111-1111-4111-8111-111111111111";
const staff = "22222222-2222-4222-8222-222222222222";
const product = "33333333-3333-4333-8333-333333333333";
const variant = "44444444-4444-4444-8444-444444444444";
async function actor(id: string | null, sql: string) {
  await db.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id ?? ""}',false); set role ${id ? "authenticated" : "anon"};`,
  );
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(
    readFileSync("supabase/migrations/202610230001_foundation.sql", "utf8"),
  );
  try {
    await db.exec(
      readFileSync("supabase/migrations/202610230002_services.sql", "utf8"),
    );
  } catch (e) {
    const err = e as {
      message: string;
      position?: string;
      internalPosition?: string;
      internalQuery?: string;
    };
    throw new Error(JSON.stringify(err));
  }
  await db.exec(
    readFileSync(
      "supabase/migrations/202610230004_admin_functions.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync("supabase/migrations/202610230005_hardening.sql", "utf8"),
  );
  await db.exec(
    readFileSync("supabase/migrations/202610230006_catalog_search.sql", "utf8"),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/202610230007_contact_and_summaries.sql",
      "utf8",
    ),
  );
  await db.exec(
    readFileSync("supabase/migrations/202610230008_retention.sql", "utf8"),
  );
  await db.exec(
    readFileSync(
      "supabase/migrations/20261024160318_illustrative_commerce_guard.sql",
      "utf8",
    ),
  );
  await db.exec(`insert into auth.users values ('${owner}','owner@example.test'),('${staff}','staff@example.test');
    insert into public.admin_profiles(user_id,display_name,role,permissions) values
    ('${owner}','Owner','owner','{}'),('${staff}','Staff','staff',array['products.read']);
    insert into public.products(id,name,slug,price_cents,status) values ('${product}','Vestido','vestido',42990,'published');
    insert into public.products(name,slug,price_cents,status) values ('Rascunho','rascunho',10000,'draft');
    insert into public.variants(id,product_id,color,size,stock) values ('${variant}','${product}','Azul','P',1);`);
});
afterAll(async () => {
  await db?.close();
});
describe("PostgreSQL authorization and integrity", () => {
  it("public can read published products but not drafts", async () => {
    const { rows } = await actor(null, "select name from products");
    expect(rows).toEqual([{ name: "Vestido" }]);
  });
  it("public cannot modify catalog", async () => {
    await expect(
      actor(null, `update products set price_cents=1 where id='${product}'`),
    ).rejects.toThrow();
  });
  it("staff cannot elevate their own permissions", async () => {
    const result = await actor(
      staff,
      `update admin_profiles set role='owner' where user_id='${staff}' returning role`,
    );
    expect(result.rows).toHaveLength(0);
  });
  it("staff cannot invoke owner stock transactions", async () => {
    await expect(
      actor(
        staff,
        `select record_sale('${crypto.randomUUID()}', '[{"variant_id":"${variant}","quantity":1}]','test')`,
      ),
    ).rejects.toThrow(/denied/i);
  });
  it("sale is atomic and idempotent, no overselling on repeated submissions", async () => {
    const key = crypto.randomUUID();
    const payload = `'[{"variant_id":"${variant}","quantity":1}]'`;
    await actor(owner, `select record_sale('${key}',${payload},'Confirmed')`);
    await actor(owner, `select record_sale('${key}',${payload},'Confirmed')`);
    expect((await db.query("select stock from variants")).rows).toEqual([
      { stock: 0 },
    ]);
    expect((await db.query("select count(*)::int n from sales")).rows).toEqual([
      { n: 1 },
    ]);
    await expect(
      actor(
        owner,
        `select record_sale('${crypto.randomUUID()}',${payload},'Oversell')`,
      ),
    ).rejects.toThrow(/stock/i);
    expect((await db.query("select count(*)::int n from sales")).rows).toEqual([
      { n: 1 },
    ]);
  });
  it("stock version conflict cannot overwrite another adjustment", async () => {
    await expect(
      actor(owner, `select adjust_stock('${variant}',5,0,'outdated')`),
    ).rejects.toThrow(/conflict/i);
  });
  it("cannot reuse idempotency key with different content", async () => {
    const { rows } = await db.query<{ id: string }>(
      "select id from sales limit 1",
    );
    await expect(
      actor(
        owner,
        `select record_sale('${rows[0].id}','[{"variant_id":"${variant}","quantity":2}]','Changed')`,
      ),
    ).rejects.toThrow(/idempotency/i);
  });
  it("forbids deleting the last active owner", async () => {
    await expect(
      actor(
        owner,
        `update admin_profiles set active=false where user_id='${owner}'`,
      ),
    ).rejects.toThrow(/owner/i);
  });
  it("forbids creating a verified asset by bypassing upload validation", async () => {
    await expect(
      actor(
        owner,
        "insert into media_assets(kind,original_path,url,mime,bytes,published) values('image','forged','https://evil.test/x','image/jpeg',1,true)",
      ),
    ).rejects.toThrow();
  });
  it("forbids directly publishing a product without complete validation", async () => {
    await expect(
      actor(
        owner,
        "update products set status='published' where slug='rascunho'",
      ),
    ).rejects.toThrow();
  });
  it("deduplicates event ids and counts one new session", async () => {
    const event = {
      id: crypto.randomUUID(),
      type: "view_item",
      session_id: crypto.randomUUID(),
      visitor_id: crypto.randomUUID(),
      product_id: product,
      data: { path: "/produto/vestido" },
      attribution: { utm_source: "instagram" },
    };
    await db.query("select ingest_event($1::jsonb)", [JSON.stringify(event)]);
    await db.query("select ingest_event($1::jsonb)", [JSON.stringify(event)]);
    expect(
      (
        await db.query(
          "select count(*)::int n from events where type='site_visited'",
        )
      ).rows,
    ).toEqual([{ n: 1 }]);
    expect(
      (
        await db.query(
          "select count(*)::int n from events where type='view_item'",
        )
      ).rows,
    ).toEqual([{ n: 1 }]);
  });
  it("reports actual persisted events and denies unprivileged reports", async () => {
    const result = await actor(
      owner,
      "select dashboard_report(now()-interval '1 day',now()+interval '1 day') report",
    );
    const report = (
      result.rows[0] as {
        report: { metrics: { product_views: number }; visitors: number };
      }
    ).report;
    expect(report.metrics.product_views).toBe(1);
    expect(report.visitors).toBe(1);
    await expect(
      actor(
        staff,
        "select dashboard_report(now()-interval '1 day',now()+interval '1 day')",
      ),
    ).rejects.toThrow(/denied/i);
  });
  it("queues, leases and finishes an integration delivery with deduplication", async () => {
    await db.query("select integration_admin('pushcut',$1,$2)", [
      owner,
      JSON.stringify({
        enabled: true,
        config: { events: ["whatsapp_click"] },
        secret_ciphertext: "encrypted",
        public_config: {},
      }),
    ]);
    const id = crypto.randomUUID();
    await db.query(
      "insert into events(id,type,data) values($1,'whatsapp_click','{}')",
      [id],
    );
    const result = await db.query<{
      jobs: { id: string; attempts: number; lease_token: string }[];
    }>("select delivery_jobs('lease') jobs");
    expect(result.rows[0].jobs).toHaveLength(1);
    const job = result.rows[0].jobs[0];
    expect(job.attempts).toBe(1);
    expect(
      (
        await db.query<{ jobs: unknown[] }>(
          "select delivery_jobs('lease') jobs",
        )
      ).rows[0].jobs,
    ).toHaveLength(0);
    await db.query("select delivery_jobs('finish',$1,$2)", [
      job.id,
      JSON.stringify({
        state: "delivered",
        code: 200,
        lease_token: job.lease_token,
      }),
    ]);
    expect(
      (
        await db.query("select state from private.deliveries where id=$1", [
          job.id,
        ])
      ).rows,
    ).toEqual([{ state: "delivered" }]);
  });
  it("expires a crashed final delivery attempt instead of leaving it processing forever", async () => {
    const id = crypto.randomUUID();
    await db.query(
      "insert into private.deliveries(id,provider,dedupe_key,state,attempts,lease_until) values($1,'pushcut',$2,'processing',5,now()-interval '1 minute')",
      [id, id],
    );
    await db.query("select delivery_jobs('lease')");
    expect(
      (await db.query("select state from private.deliveries where id=$1", [id]))
        .rows,
    ).toEqual([{ state: "failed" }]);
  });
  it("searches actual variant colors and hides unpublished products in the catalog RPC", async () => {
    const result = await actor(
      null,
      'select search_catalog(\'{"q":"Azul","sort":"popular"}\') catalog',
    );
    const catalog = (
      result.rows[0] as {
        catalog: { count: number; products: { name: string }[] };
      }
    ).catalog;
    expect(catalog.count).toBe(1);
    expect(catalog.products[0].name).toBe("Vestido");
  });
  it("attributes a cart contact to its products while counting one global WhatsApp click", async () => {
    await db.query(
      "update variants set stock=3,version=version+1 where id=$1",
      [variant],
    );
    const key = crypto.randomUUID();
    await db.query("select create_intent($1,$2,$3,$4)", [
      key,
      "Cliente teste",
      JSON.stringify([{ variant_id: variant, quantity: 1 }]),
      "/minha-selecao",
    ]);
    const { rows: sessions } = await db.query<{
      id: string;
      visitor_id: string;
    }>("select id,visitor_id from analytics_sessions limit 1");
    await db.query("select ingest_event($1)", [
      JSON.stringify({
        id: crypto.randomUUID(),
        type: "whatsapp_click",
        session_id: sessions[0].id,
        visitor_id: sessions[0].visitor_id,
        data: { intent_id: key },
      }),
    ]);
    const result = await actor(
      owner,
      `select dashboard_report(now()-interval '1 day',now()+interval '1 day',array['${product}']::uuid[]) report`,
    );
    const report = (
      result.rows[0] as {
        report: { metrics: { whatsapp_clicks: number; intents: number } };
      }
    ).report;
    expect(report.metrics.whatsapp_clicks).toBe(1);
    expect(report.metrics.intents).toBe(1);
  });
  it("enqueues all missed summary intervals after the worker resumes", async () => {
    await db.exec(
      'update private.integrations set config=\'{"mode":"summary","interval_minutes":15,"events":["whatsapp_click"]}\',updated_at=now()-interval \'1 hour\' where provider=\'pushcut\'',
    );
    await db.exec(
      "insert into events(type,created_at) values('whatsapp_click',now()-interval '45 minutes'),('whatsapp_click',now()-interval '30 minutes')",
    );
    await db.query("select delivery_jobs('summary')");
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from private.deliveries where payload->>'type'='summary'",
        )
      ).rows[0].n,
    ).toBeGreaterThanOrEqual(2);
  });
  it("preserves file paths in durable cleanup when deleting a media record", async () => {
    const id = crypto.randomUUID();
    await db.query(
      "insert into media_assets(id,kind,original_path,public_path,url,mime,bytes,published) values($1,'image','private/original',$2,'https://example.test/image.webp','image/jpeg',10,true)",
      [id, `${id}.webp`],
    );
    await actor(owner, `select media_metadata('${id}',p_delete=>true)`);
    expect(
      (
        await db.query<{ n: number }>(
          "select count(*)::int n from private.deliveries where provider='storage' and payload->'data'->>'original_path'='private/original'",
        )
      ).rows[0].n,
    ).toBe(1);
  });
});

it("archives daily counts without identities before removing raw events, idempotently", async () => {
  await db.exec(
    "insert into public.events(type,created_at) values('view_item',now()-interval '100 days');select public.retention_cleanup();select public.retention_cleanup();",
  );
  const { rows } = await db.query<{ product_views: number }>(
    "select product_views from public.analytics_archive",
  );
  expect(Number(rows[0].product_views)).toBe(1);
  const raw = await db.query(
    "select id from public.events where created_at<now()-interval '100 days'",
  );
  expect(raw.rows).toHaveLength(0);
  await expect(
    actor(null, "select * from public.analytics_archive"),
  ).rejects.toThrow();
});

it("rejects illustrative pieces in the actual intent and sale RPCs, even with stock, and permits conversion", async () => {
  const pid = crypto.randomUUID(),
    vid = crypto.randomUUID(),
    key = crypto.randomUUID();
  await db.query(
    "insert into products(id,name,slug,price_cents,status,details) values($1,'Exemplo',$2,10000,'published',$3::jsonb)",
    [pid, `exemplo-${pid}`, JSON.stringify({ tags: ["ilustrativo"] })],
  );
  await db.query(
    "insert into variants(id,product_id,color,size,stock) values($1,$2,'Areia','P',2)",
    [vid, pid],
  );
  const lines = JSON.stringify([{ variant_id: vid, quantity: 1 }]);
  await expect(
    db.query("select create_intent($1,'Teste',$2::jsonb,'/')", [key, lines]),
  ).rejects.toThrow(/ilustrativ/i);
  await expect(
    actor(owner, `select record_sale('${key}','${lines}','Teste')`),
  ).rejects.toThrow(/ilustrativ/i);
  expect(
    (await db.query("select id from purchase_intents where id=$1", [key])).rows,
  ).toHaveLength(0);
  expect(
    (
      await db.query<{ stock: number }>(
        "select stock from variants where id=$1",
        [vid],
      )
    ).rows[0].stock,
  ).toBe(2);
  await db.query("update products set details='{}'::jsonb where id=$1", [pid]);
  const result = await db.query(
    "select create_intent($1,'Teste',$2::jsonb,'/')",
    [key, lines],
  );
  expect(result.rows).toHaveLength(1);
});
