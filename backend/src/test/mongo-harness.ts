import { MongoDBContainer } from '@testcontainers/mongodb';
import mongoose from 'mongoose';

let container: Awaited<ReturnType<MongoDBContainer['start']>> | undefined;

export async function startMongo(): Promise<string> {
  const started = await new MongoDBContainer('mongo:7').start();
  container = started;
  let uri = started.getConnectionString();
  // Replica set advertises the container hostname; force single-host mode from the test runner.
  uri += uri.includes('?') ? '&directConnection=true' : '?directConnection=true';
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(uri);
  return uri;
}

export async function stopMongo(): Promise<void> {
  await mongoose.disconnect();
  if (container) {
    await container.stop();
    container = undefined;
  }
}
