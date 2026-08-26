#!/usr/bin/env node
/**
 * push.mjs  — One-command commit + push to GitHub
 * Usage:  npm run push
 *         npm run push "optional custom message"
 */
import { execSync } from 'child_process';

const msg = process.argv[2] || `chore: update ${new Date().toISOString()}`;

function run(cmd) {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: 'inherit' });
}

try {
  run('git add -A');
  run(`git commit -m "${msg}" --allow-empty`);
  run('git push origin main');
  console.log('\n✅ Pushed to GitHub — Render will auto-deploy in ~30s');
} catch (e) {
  console.error('\n❌ Push failed:', e.message);
  process.exit(1);
}
