import { MongoClient } from "mongodb";
import { existsSync, readFileSync } from "node:fs";
import type {
  Client,
  Tenant,
  TenantMembership,
  User,
} from "../src/server/models";

function loadLocalEnv() {
  if (!existsSync(".env.local")) {
    return;
  }

  const envFile = readFileSync(".env.local", "utf8");

  for (const line of envFile.split("\n")) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex);
    const value = trimmedLine.slice(separatorIndex + 1);

    process.env[key] ??= value;
  }
}

loadLocalEnv();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? "clinicmanagement";

if (!uri) {
  throw new Error("MONGODB_URI is required");
}

const now = new Date();
const ownerGoogleSubjectId =
  process.env.SEED_GOOGLE_SUBJECT_ID ?? "local-seed-owner";

const client = new MongoClient(uri);

try {
  await client.connect();
  const db = client.db(dbName);
  const oldSeedTenants = await db
    .collection<Tenant>("tenants")
    .find({
      name: { $in: ["Downtown Body Clinic", "North Psychology Group"] },
    })
    .toArray();
  const oldSeedTenantIds = oldSeedTenants
    .map((tenant) => tenant._id?.toHexString())
    .filter((tenantId): tenantId is string => Boolean(tenantId));

  await db.collection<Client>("clients").deleteMany({
    tenantId: { $in: oldSeedTenantIds },
  });
  await db.collection<TenantMembership>("tenantMemberships").deleteMany({
    tenantId: { $in: oldSeedTenantIds },
  });
  await db.collection<Tenant>("tenants").deleteMany({
    name: { $in: ["Downtown Body Clinic", "North Psychology Group"] },
  });
  await db.collection<User>("users").deleteMany({
    googleSubjectId: ownerGoogleSubjectId,
  });

  await db.collection<User>("users").insertOne({
    googleSubjectId: ownerGoogleSubjectId,
    email: "owner@example.test",
    name: "Seed Owner",
    image: null,
    createdAt: now,
    updatedAt: now,
  });
  const owner = await db.collection<User>("users").findOne({
    googleSubjectId: ownerGoogleSubjectId,
  });

  if (!owner?._id) {
    throw new Error("Unable to create seed owner");
  }

  const downtown = await db.collection<Tenant>("tenants").insertOne({
    name: "Downtown Body Clinic",
    createdAt: now,
    updatedAt: now,
  });
  const north = await db.collection<Tenant>("tenants").insertOne({
    name: "North Psychology Group",
    createdAt: now,
    updatedAt: now,
  });

  const memberships: TenantMembership[] = [
    {
      tenantId: downtown.insertedId.toHexString(),
      userId: owner._id.toHexString(),
      role: "owner",
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: north.insertedId.toHexString(),
      userId: owner._id.toHexString(),
      role: "owner",
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db
    .collection<TenantMembership>("tenantMemberships")
    .insertMany(memberships);

  await db.collection<Client>("clients").insertMany([
    {
      tenantId: downtown.insertedId.toHexString(),
      name: "Maria Rodriguez",
      language: "Spanish",
      phoneNumber: "555-0101",
      email: "maria.rodriguez@example.test",
      discountNotes: "Intro package discount",
      generalNotes: "Prefers morning appointments.",
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: downtown.insertedId.toHexString(),
      name: "Jordan Lee",
      language: "English",
      phoneNumber: "555-0102",
      email: "jordan.lee@example.test",
      discountNotes: "",
      generalNotes: "Interested in recurring treatment plan.",
      createdAt: now,
      updatedAt: now,
    },
    {
      tenantId: north.insertedId.toHexString(),
      name: "Samira Patel",
      language: "English",
      phoneNumber: "555-0201",
      email: "samira.patel@example.test",
      discountNotes: "Student rate",
      generalNotes: "Needs remote appointment reminders.",
      createdAt: now,
      updatedAt: now,
    },
  ]);

  console.log("Seed complete");
  console.log(`Seed owner Google subject: ${ownerGoogleSubjectId}`);
} finally {
  await client.close();
}
