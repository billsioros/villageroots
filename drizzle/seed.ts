import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { nodes, edges } from "./schema";
import { NODES, EDGES } from "../lib/graph/data";

config({ path: ".env.local" });

const ADMIN_EMAIL = "admin@villageroots.local";
const ADMIN_PASSWORD = "admin-password";
const USER_EMAIL = "user@villageroots.local";
const USER_PASSWORD = "user-password";

async function ensureUser(
  tx: any, // eslint-disable-line @typescript-eslint/no-explicit-any -- drizzle tx type is complex
  email: string,
  password: string,
  name: string,
  role: "admin" | "contributor",
) {
  const existing = (await tx.execute(
    sql`select id from auth.users where email = ${email}`,
  )) as { rows: { id: string }[] };
  let userId: string;
  if (existing.rows.length > 0) {
    userId = existing.rows[0].id;
    console.log(`user ${email} already exists (${userId})`);
  } else {
    const hash = await bcrypt.hash(password, 10);
    const created = (await tx.execute(
      sql`
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, confirmation_token, recovery_token, email_change_token_new,
          email_change,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) values (
          '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
          'authenticated', 'authenticated', ${email}, ${hash},
          now(), '', '', '',
          '',
          '{"provider":"email","providers":["email"]}', ${JSON.stringify({ name })},
          now(), now()
        ) returning id
      `,
    )) as { rows: { id: string }[] };
    userId = created.rows[0].id;
    console.log(`created ${role} user ${email} (${userId})`);
  }

  await tx.execute(sql`
    update auth.users set
      confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      email_change = coalesce(email_change, '')
    where id = ${userId}
  `);

  await tx.execute(sql`
    insert into auth.identities (
      id, user_id, provider_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), ${userId}, ${userId},
      ${JSON.stringify({ sub: userId, email })}, 'email',
      now(), now(), now()
    )
    on conflict (provider, provider_id) do nothing
  `);

  await tx.execute(sql`
    insert into user_roles (user_id, role)
    values (${userId}, ${role})
    on conflict (user_id) do nothing
  `);

  return userId;
}

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle({ client });

  const knownSlugs = new Set(NODES.map((n) => n.id));
  for (const e of EDGES) {
    const missing = [e.source, e.target].filter((s) => !knownSlugs.has(s));
    if (missing.length > 0) {
      throw new Error(
        `seed: edge ${e.id} references unknown node slug(s): ${missing.join(", ")}`,
      );
    }
  }

  await db.transaction(async (tx) => {
    const adminId = await ensureUser(tx, ADMIN_EMAIL, ADMIN_PASSWORD, "Admin User", "admin");
    const userId = await ensureUser(tx, USER_EMAIL, USER_PASSWORD, "Contributor User", "contributor");

    for (const n of NODES) {
      await tx
        .insert(nodes)
        .values({
          slug: n.id,
          type: n.type,
          label: n.label,
          subtitle: n.subtitle,
          description: n.description,
          properties: { x: n.x, y: n.y },
          status: "approved",
          privacy: "public",
          createdBy: adminId,
        })
        .onConflictDoNothing({ target: nodes.slug });
    }

    const nodeRows = await tx
      .select({ id: nodes.id, slug: nodes.slug })
      .from(nodes);
    const idBySlug = new Map(nodeRows.map((r) => [r.slug, r.id]));

    for (const e of EDGES) {
      const sourceId = idBySlug.get(e.source);
      const targetId = idBySlug.get(e.target);
      if (!sourceId || !targetId) {
        throw new Error(
          `seed: edge ${e.id} references node slug missing from DB: ${e.source}/${e.target}`,
        );
      }
      await tx
        .insert(edges)
        .values({
          slug: e.id,
          sourceId,
          targetId,
          type: e.verb,
          properties: {},
          status: "approved",
          createdBy: adminId,
        })
        .onConflictDoNothing({ target: edges.slug });
    }

    await tx
      .insert(nodes)
      .values({
        slug: "p-stavros",
        type: "person",
        label: "Stavros Katsaris",
        subtitle: "b. 1906",
        description: "Seeded pending node owned by the contributor.",
        properties: { x: 1100, y: 500 },
        status: "pending",
        privacy: "public",
        createdBy: userId,
      })
      .onConflictDoNothing({ target: nodes.slug });

    const counts = await tx.select({ status: nodes.status }).from(nodes);
    const pending = counts.filter((r) => r.status === "pending").length;
    console.log(`nodes seeded: ${counts.length} (${pending} pending)`);
  });

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
