#!/usr/bin/env node
/**
 * autocommit.mjs — Watch for file changes and auto-commit + push
 * Usage:  npm run autocommit
 *
 * Watches the project every 30 seconds.
 * If there are uncommitted changes it commits and pushes automatically.
 * Useful during active development when deploying to Render.
 */
import { execSync } from 'child_process';

const INTERVAL_SECONDS = 30;

function run(cmd, silent = false) {
  return execSync(cmd, { encoding: 'utf8', stdio: silent ? 'pipe' : 'inherit' });
}

function hasChanges() {
  const status = run('git status --porcelain', true);
  return status.trim().length > 0;
}

function autoCommitAndPush() {
  if (!hasChanges()) {
    process.stdout.write('.');   // dot = nothing to commit
    return;
  }

  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const msg = `auto: update ${ts}`;

  try {
    run('git add -A');
    run(`git commit -m "${msg}"`);
    run('git push origin main');
    console.log(`\n✅ [${ts}] Auto-committed & pushed → Render deploying...`);
  } catch (e) {
    console.error('\n❌ Auto-commit failed:', e.message);
  }
}

console.log(`🔄 Auto-commit watcher started (every ${INTERVAL_SECONDS}s)`);
console.log('   Press Ctrl+C to stop.\n');

// Run once immediately, then on interval
autoCommitAndPush();
setInterval(autoCommitAndPush, INTERVAL_SECONDS * 1000);
