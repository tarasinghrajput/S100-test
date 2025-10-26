import mongoose from "mongoose";

let connectionPromise = null;
let connectionEnabled = Boolean(process.env.MONGODB_URI);

export function isDatabaseEnabled() {
  return connectionEnabled;
}

export async function initDatabase() {
  if (!process.env.MONGODB_URI) {
    connectionEnabled = false;
    console.warn(
      "[db] MONGODB_URI not set. Falling back to in-memory user tracking."
    );
    return null;
  }

  if (connectionPromise) {
    return connectionPromise;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB;

  connectionPromise = mongoose
    .connect(uri, dbName ? { dbName } : undefined)
    .then((connection) => {
      console.log("[db] Connected to MongoDB");
      connectionEnabled = true;
      return connection;
    })
    .catch((error) => {
      console.error("[db] MongoDB connection failed:", error);
      connectionEnabled = false;
      connectionPromise = null;
      return null;
    });

  return connectionPromise;
}

export async function closeDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    connectionPromise = null;
    connectionEnabled = Boolean(process.env.MONGODB_URI);
  }
}
