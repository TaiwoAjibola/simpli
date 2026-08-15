#!/usr/bin/env node
// Phase 3 migration — additive, idempotent, non-destructive.
// Adds optional work fields onto existing docs. Never deletes or overwrites existing values.
//
// Usage:
//   node scripts/migrate-work-fields.mjs            # dry-run: print counts only
//   node scripts/migrate-work-fields.mjs --apply    # real writes
//
// Requires env (from .env): FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        let value = m[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        value = value.replace(/\\n/g, '\n');
        process.env[m[1]] = value;
      }
    }
  }
}

const APPLY = process.argv.includes('--apply');
const DEFAULTS = {
  task: 'non-development',
  actionPoint: 'non-development',
  defect: 'development'
};

let stats = { read: 0, wouldWrite: 0, writes: 0, skipped: 0, errors: 0 };

async function maybeWrite(db, ref, updates) {
  const meaningful = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
  if (Object.keys(meaningful).length === 0) return;
  stats.wouldWrite += Object.keys(meaningful).length;
  if (APPLY) {
    try {
      await ref.update(meaningful);
      stats.writes += Object.keys(meaningful).length;
    } catch (e) {
      stats.errors++;
      console.error('  write error', ref.path, e.message);
    }
  }
}

function missing(keys, doc) {
  const out = {};
  for (const k of keys) {
    if (doc[k] === undefined || doc[k] === null) out[k] = true;
  }
  return out;
}

async function migrate() {
  loadEnv();
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY
      })
    });
  }
  const db = getFirestore();

  console.log(`Mode: ${APPLY ? 'APPLY (writes enabled)' : 'DRY-RUN (no writes)'}`);
  console.log(`Project: ${process.env.FIREBASE_PROJECT_ID}\n`);

  // Goal cache for appId/phaseId derivation
  const goals = new Map();
  {
    const snap = await db.collection('goals').get();
    for (const d of snap.docs) goals.set(d.id, d.data());
    console.log(`Loaded ${goals.size} goals`);
  }

  // Tasks
  {
    const snap = await db.collection('tasks').get();
    console.log(`\n[tasks] ${snap.size} docs`);
    for (const d of snap.docs) {
      stats.read++;
      const data = d.data();
      const need = missing(['workType', 'appId', 'phaseId'], data);
      if (!Object.keys(need).length) { stats.skipped++; continue; }

      const goal = data.goalId ? goals.get(data.goalId) : undefined;
      const updates = {};
      if (need.workType) updates.workType = DEFAULTS.task;
      if (need.appId) updates.appId = goal?.appId;
      if (need.phaseId) updates.phaseId = goal?.phaseId || undefined;
      if (Object.keys(updates).length) {
        console.log(`  ${d.id}: ${JSON.stringify(updates)}`);
        await maybeWrite(db, d.ref, updates);
      }
    }
  }

  // Action points
  {
    const snap = await db.collection('actionPoints').get();
    console.log(`\n[actionPoints] ${snap.size} docs`);
    for (const d of snap.docs) {
      stats.read++;
      const data = d.data();
      const need = missing(['workType', 'appId', 'phaseId'], data);
      if (!Object.keys(need).length) { stats.skipped++; continue; }

      let derivedAppId;
      let derivedPhaseId;
      if (data.goalId) {
        const g = goals.get(data.goalId);
        derivedAppId = g?.appId;
        derivedPhaseId = g?.phaseId;
      }
      if (data.taskId) {
        const t = await db.collection('tasks').doc(data.taskId).get();
        if (t.exists) {
          const td = t.data();
          if (derivedAppId === undefined) derivedAppId = td.appId || (td.goalId ? goals.get(td.goalId)?.appId : undefined);
          if (derivedPhaseId === undefined) derivedPhaseId = td.phaseId || (td.goalId ? goals.get(td.goalId)?.phaseId : undefined);
        }
      }
      const updates = {};
      if (need.workType) updates.workType = DEFAULTS.actionPoint;
      if (need.appId) updates.appId = derivedAppId;
      if (need.phaseId) updates.phaseId = derivedPhaseId;
      if (Object.keys(updates).length) {
        console.log(`  ${d.id}: ${JSON.stringify(updates)}`);
        await maybeWrite(db, d.ref, updates);
      }
    }
  }

  // Defects
  {
    const snap = await db.collection('defects').get();
    console.log(`\n[defects] ${snap.size} docs`);
    for (const d of snap.docs) {
      stats.read++;
      const data = d.data();
      if (data.workType !== undefined && data.workType !== null) { stats.skipped++; continue; }
      const updates = { workType: DEFAULTS.defect };
      console.log(`  ${d.id}: ${JSON.stringify(updates)}`);
      await maybeWrite(db, d.ref, updates);
    }
  }

  // Phases: assign `order` by createdAt per app (idempotent)
  {
    const snap = await db.collection('phases').get();
    console.log(`\n[phases] ${snap.size} docs`);
    const byApp = new Map();
    for (const d of snap.docs) {
      const data = d.data();
      if (data.order !== undefined && data.order !== null) { stats.skipped++; continue; }
      const key = data.appId || 'none';
      if (!byApp.has(key)) byApp.set(key, []);
      byApp.get(key).push({ id: d.id, ref: d.ref, data });
    }
    for (const [appKey, list] of byApp) {
      list.sort((a, b) => {
        const at = a.data.createdAt?.toMillis ? a.data.createdAt.toMillis() : a.data.createdAt || 0;
        const bt = b.data.createdAt?.toMillis ? b.data.createdAt.toMillis() : b.data.createdAt || 0;
        return at - bt;
      });
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        const updates = { order: i };
        console.log(`  ${p.id} (app ${appKey}): order=${i}`);
        await maybeWrite(db, p.ref, updates);
      }
    }
  }

  // NEW: work-growth fields — followers/webhook/github sub-doc/recurrence/effort
  {
    const snap = await db.collection('tasks').get();
    console.log(`\n[tasks] growth fields (Phase 3b)`);
    for (const d of snap.docs) {
      stats.read++;
      const data = d.data();
      const updates = {};
      if (data.followers === undefined) updates.followers = [];
      if (data.recurrence === undefined) updates.recurrence = null;
      if (data.origin === undefined) updates.origin = { source: 'manual' };
      if (data.effortHours === undefined) updates.effortHours = null;
      if (Object.keys(updates).length) {
        console.log(`  ${d.id}: ${JSON.stringify(updates)}`);
        await maybeWrite(db, d.ref, updates);
      }
    }
  }
  {
    const snap = await db.collection('defects').get();
    console.log(`\n[defects] growth fields (Phase 3b)`);
    for (const d of snap.docs) {
      stats.read++;
      const data = d.data();
      const updates = {};
      if (data.followers === undefined) updates.followers = [];
      if (data.testCycle === undefined) updates.testCycle = data.testCycle || null;
      if (data.github === undefined) updates.github = null;
      if (Object.keys(updates).length) {
        console.log(`  ${d.id}: ${JSON.stringify(updates)}`);
        await maybeWrite(db, d.ref, updates);
      }
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`read: ${stats.read}, skipped: ${stats.skipped}, fieldWrites(${APPLY ? 'applied' : 'dry'}): ${stats.wouldWrite}, errors: ${stats.errors}`);
  if (!APPLY) console.log('\nRe-run with --apply to write changes.');
}

migrate().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
