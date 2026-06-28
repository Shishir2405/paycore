/**
 * Mongoose connection helper with a global singleton.
 *
 * Next.js hot-reloads modules in dev and runs route handlers across invocations;
 * caching the connection on `globalThis` avoids opening a new pool on every call.
 */
import mongoose from 'mongoose';
import { env } from '@/config/env';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var __paycoreMongoose: MongooseCache | undefined;
}

const cache: MongooseCache = global.__paycoreMongoose ?? { conn: null, promise: null };
global.__paycoreMongoose = cache;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    mongoose.set('strictQuery', true);
    cache.promise = mongoose.connect(env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10_000,
      autoIndex: env.NODE_ENV !== 'production',
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (err) {
    cache.promise = null;
    throw err;
  }

  return cache.conn;
}

export async function dbDisconnect(): Promise<void> {
  if (cache.conn) {
    await cache.conn.disconnect();
    cache.conn = null;
    cache.promise = null;
  }
}
