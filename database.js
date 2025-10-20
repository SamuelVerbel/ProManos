const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let database;

async function connectDB() {
  if (database) return database;
  
  try {
    await client.connect();
    database = client.db("promanos");
    console.log("✅ Conectado a MongoDB Atlas - Base: promanos");
    return database;
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error);
    process.exit(1);
  }
}

module.exports = { connectDB };