import { MongoClient, type Db } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "clinicmanagement";

if (!uri) {
  throw new Error("Missing required environment variable: MONGODB_URI");
}

const mongoUri = uri;

const globalForMongo = globalThis as typeof globalThis & {
  mongoClientPromise?: Promise<MongoClient>;
};

export function getMongoClient(): Promise<MongoClient> {
  if (!globalForMongo.mongoClientPromise) {
    const client = new MongoClient(mongoUri);
    globalForMongo.mongoClientPromise = client.connect();
  }

  return globalForMongo.mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();

  return client.db(dbName);
}
