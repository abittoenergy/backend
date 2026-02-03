import "dotenv/config";
import db from "../../config/db";
import { seed_history } from "../schema/seed-history.schema";
import { eq } from "drizzle-orm";

import seed001 from "./001-roles-permission";

type Seed = {
  id: string;
  name: string;
  run: () => Promise<void>;
  dependsOn?: string[];
  alwaysRun?: boolean;
};

const seeds: Seed[] = [
  seed001, // Always run - roles & permissions
];

async function hasRun(id: string) {
  const rows = await db.select().from(seed_history).where(eq(seed_history.id, id)).limit(1);

  return rows.length > 0;
}

async function markRun(id: string, name: string) {
  await db.insert(seed_history).values({ id, name }).onConflictDoNothing();
}

async function main() {
  const byId = new Map(seeds.map((s) => [s.id, s]));
  for (const s of seeds) {
    if (!s.dependsOn) continue;
    for (const dep of s.dependsOn) {
      if (!byId.has(dep)) {
        throw new Error(`Seed "${s.id}" depends on missing seed "${dep}"`);
      }
    }
  }

  for (const seed of seeds) {
    const already = await hasRun(seed.id);
    if (already && !seed.alwaysRun) {
      console.log(`Skipping ${seed.id} (${seed.name}) — already ran`);
      continue;
    }

    console.log(`Running ${seed.id} (${seed.name})`);
    try {
      await seed.run();
      await markRun(seed.id, seed.name);
      console.log(`Done ${seed.id}`);
    } catch (e) {
      console.error(`Failed ${seed.id}:`, e);
      process.exit(1);
    }
  }

  console.log("All seeds complete");
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed runner crashed:", e);
  process.exit(1);
});
