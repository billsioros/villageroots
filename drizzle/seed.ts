import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import bcrypt from "bcryptjs";
import { nodes, edges } from "./schema";
import { NODES, EDGES } from "../lib/graph/data";

config({ path: ".env.local" });

const TEST_EMAIL = "test@villageroots.local";
const TEST_PASSWORD = "test-password";

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle({ client });

  const existingUser = await client`select id from auth.users where email = ${TEST_EMAIL}`;
  let userId: string;
  if (existingUser.length > 0) {
    userId = existingUser[0].id as string;
  } else {
    const hash = await bcrypt.hash(TEST_PASSWORD, 10);
    const created = await client`
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(),
        'authenticated', 'authenticated', ${TEST_EMAIL}, ${hash},
        now(), '{"provider":"email","providers":["email"]}', '{"name":"Test User"}',
        now(), now()
      ) returning id`;
    userId = created[0].id as string;
    console.log(`created test user ${TEST_EMAIL} (${userId})`);
  }

  for (const n of NODES) {
    await db
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
        createdBy: userId,
      })
      .onConflictDoNothing({ target: nodes.slug });
  }

  const nodeRows = await db.select({ id: nodes.id, slug: nodes.slug }).from(nodes);
  const idBySlug = new Map(nodeRows.map((r) => [r.slug, r.id]));

  for (const e of EDGES) {
    await db
      .insert(edges)
      .values({
        slug: e.id,
        sourceId: idBySlug.get(e.source)!,
        targetId: idBySlug.get(e.target)!,
        type: e.verb,
        properties: {},
        status: "approved",
        createdBy: userId,
      })
      .onConflictDoNothing({ target: edges.slug });
  }

  await db
    .insert(nodes)
    .values({
      slug: "p-stavros",
      type: "person",
      label: "Stavros Katsaris",
      subtitle: "b. 1906",
      description: "Seeded pending node owned by the test user.",
      properties: { x: 1100, y: 500 },
      status: "pending",
      privacy: "public",
      createdBy: userId,
    })
    .onConflictDoNothing({ target: nodes.slug });

  const counts = await db
    .select({ status: nodes.status })
    .from(nodes);
  const pending = counts.filter((r) => r.status === "pending").length;
  console.log(`nodes seeded: ${counts.length} (${pending} pending)`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
