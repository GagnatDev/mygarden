import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test MongoDB harness.
 *
 * By default each integration-test file spins up a disposable MongoDB via
 * `@testcontainers/mongodb` (needs a working Docker daemon that can pull the
 * `mongo:7` image).
 *
 * When `MONGO_TEST_URI` is set, the harness instead connects to that already
 * running MongoDB and gives each test file its own throwaway database, so the
 * suites run in sandboxes/CI where Testcontainers can't pull an image. The
 * server must be a (single-node) replica set — the app uses multi-document
 * transactions (see `garden.service.ts`). See
 * `.claude/skills/verify-backend-changes/SKILL.md` for how to start one.
 *
 * Example:
 *   MONGO_TEST_URI=mongodb://127.0.0.1:27017 pnpm --filter backend test
 */

// Lazily-created Testcontainers instance (only when MONGO_TEST_URI is unset).
let container: { stop: () => Promise<unknown> } | undefined;

const externalBaseUri = process.env.MONGO_TEST_URI?.trim();

/** Give each test file an isolated database name on the shared external server. */
function withIsolatedDatabase(baseUri: string): string {
  const dbName = `mygarden_test_${uuidv4().replace(/-/g, '')}`;
  const queryIndex = baseUri.indexOf('?');
  const query = queryIndex === -1 ? '' : baseUri.slice(queryIndex);
  const withoutQuery = queryIndex === -1 ? baseUri : baseUri.slice(0, queryIndex);

  // Drop any trailing slash / existing default-database segment, then append ours.
  const schemeIndex = withoutQuery.indexOf('://');
  const scheme = schemeIndex === -1 ? '' : withoutQuery.slice(0, schemeIndex + 3);
  const afterScheme = schemeIndex === -1 ? withoutQuery : withoutQuery.slice(schemeIndex + 3);
  const hosts = afterScheme.split('/')[0] ?? afterScheme;

  return `${scheme}${hosts}/${dbName}${query}`;
}

export async function startMongo(): Promise<string> {
  let uri: string;

  if (externalBaseUri) {
    uri = withIsolatedDatabase(externalBaseUri);
  } else {
    const { MongoDBContainer } = await import('@testcontainers/mongodb');
    const started = await new MongoDBContainer('mongo:7').start();
    container = started;
    uri = started.getConnectionString();
  }

  // Replica set advertises the container/server hostname; force single-host mode
  // from the test runner so we talk to exactly the node we started.
  uri += uri.includes('?') ? '&directConnection=true' : '?directConnection=true';

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
  return uri;
}

export async function stopMongo(): Promise<void> {
  // When using a shared external server, drop this file's throwaway database so
  // repeated runs don't accumulate state (Testcontainers gets discarded whole).
  if (externalBaseUri && mongoose.connection.readyState === 1) {
    try {
      await mongoose.connection.dropDatabase();
    } catch {
      /* best-effort cleanup */
    }
  }

  await mongoose.disconnect();

  if (container) {
    await container.stop();
    container = undefined;
  }
}
