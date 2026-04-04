/**
 * Seed an allowlist email. Usage:
 *   ALLOWED_EMAIL=user@example.com pnpm --filter backend run seed
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import { buildContainer } from '../config/container.js';
import { loadEnv } from '../config/env.js';

async function run() {
  const emailArg = process.env.ALLOWED_EMAIL?.trim();
  if (!emailArg) {
    console.error('Set ALLOWED_EMAIL environment variable (e.g. ALLOWED_EMAIL=a@b.com)');
    process.exit(1);
  }

  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI);
  const { allowedEmailRepo } = buildContainer(env);

  const email = emailArg.toLowerCase();
  const existing = await allowedEmailRepo.findByEmail(email);
  if (existing) {
    console.log('Email already on allowlist:', email);
    await mongoose.disconnect();
    return;
  }

  await allowedEmailRepo.create({ email, addedBy: null });
  console.log('Added to allowlist:', email);
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
