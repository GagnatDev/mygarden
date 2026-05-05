import type { ClientSession } from 'mongoose';

/** Optional MongoDB session for multi-document transactions */
export type WithMongoSession = {
  session?: ClientSession;
};
