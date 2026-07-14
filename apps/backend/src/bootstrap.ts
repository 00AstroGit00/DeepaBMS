import type { SeedModule, BootstrapOptions } from './seed/types';
import { authSeed } from './seed/auth.seed';
import { inventorySeed } from './domains/inventory/inventory.seed';
import { purchasingSeed } from './domains/purchasing/purchasing.seed';
import { restaurantSeed } from './domains/restaurant/restaurant.seed';
import { liquorSeed } from './domains/liquor/liquor.seed';
import { roomsSeed } from './domains/rooms/rooms.seed';
import { accountingSeed } from './domains/accounting/accounting.seed';
import { analyticsSeed } from './domains/analytics/analytics.seed';
import { hrSeed } from './domains/hr/hr.seed';

const SEED_REGISTRY: SeedModule[] = [
  authSeed,
  inventorySeed,
  purchasingSeed,
  restaurantSeed,
  liquorSeed,
  roomsSeed,
  accountingSeed,
  analyticsSeed,
  hrSeed,
];

function topoSort(modules: SeedModule[]): SeedModule[] {
  const visited = new Set<string>();
  const result: SeedModule[] = [];
  const moduleMap = new Map<string, SeedModule>();
  for (const m of modules) moduleMap.set(m.name, m);

  function visit(name: string, path: Set<string>): void {
    if (path.has(name))
      throw new Error(
        `Circular seed dependency: ${Array.from(path).join(' -> ')} -> ${name}`,
      );
    if (visited.has(name)) return;
    path.add(name);
    const mod = moduleMap.get(name);
    if (!mod) throw new Error(`Seed module "${name}" not found in registry`);
    for (const dep of mod.dependsOn) visit(dep, path);
    path.delete(name);
    visited.add(name);
    result.push(mod);
  }

  for (const m of modules) visit(m.name, new Set());
  return result;
}

export async function bootstrap(options?: BootstrapOptions): Promise<void> {
  let seeds = [...SEED_REGISTRY];

  if (options?.onlySeeds?.length) {
    seeds = seeds.filter((s) => options.onlySeeds!.includes(s.name));
  }
  if (options?.skipSeeds?.length) {
    seeds = seeds.filter((s) => !options.skipSeeds!.includes(s.name));
  }

  const ordered = topoSort(seeds);

  console.log(
    `[bootstrap] Running ${ordered.length} seed(s) in dependency order...`,
  );

  for (const seed of ordered) {
    if (options?.dryRun) {
      console.log(`[bootstrap] [dry-run] Would seed "${seed.name}"`);
      continue;
    }
    console.log(`[bootstrap] Seeding "${seed.name}"...`);
    await seed.run();
  }

  if (options?.dryRun) {
    console.log('[bootstrap] Dry-run complete. No data was modified.');
  } else {
    console.log('[bootstrap] All seeds complete.');
  }
}
