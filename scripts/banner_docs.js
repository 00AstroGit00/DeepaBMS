const fs = require('fs');
const { execSync } = require('child_process');

const files = execSync('grep -rliE "postgres|redis" docs/', { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

const BANNER = '> ⚠️ **Legacy architecture notes.** DeepaBMS v1.0.0 is deployed on **SQLite only** (single-writer, single replica, no external cache). Any mentions of other relational databases or external caches below are historical design notes, not the current architecture. See `docs/engineering/ARCHITECTURE.md` for the authoritative design.\n\n';

let added = 0, skipped = 0;
for (const f of files) {
  let c = fs.readFileSync(f, 'utf8');
  if (c.startsWith('> ⚠️ **Legacy architecture notes')) { skipped++; continue; }
  // Insert after YAML frontmatter if present
  if (c.startsWith('---\n')) {
    const end = c.indexOf('\n---\n');
    if (end !== -1) {
      const after = c.indexOf('\n', end + 5);
      c = c.slice(0, after + 1) + '\n' + BANNER + c.slice(after + 1);
      fs.writeFileSync(f, c);
      added++;
      continue;
    }
  }
  fs.writeFileSync(f, BANNER + c);
  added++;
}
console.log(`banner added=${added} skipped=${skipped} total=${files.length}`);
