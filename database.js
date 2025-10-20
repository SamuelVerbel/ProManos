const { MongoClient, ServerApiVersion } = require('mongodb');

// String de conexión de respaldo POR SI LA VARIABLE DE ENTORNO FALLA
const fallbackURI = "mongodb+srv://promanoscommunity_db_user:%40Sam%40Ver25@cluster0.nuxrmf3.mongodb.net/promanos?retryWrites=true&w=majority&appName=Cluster0";

const uri = process.env.MONGODB_URI || fallbackURI;

console.log("🔧 Intentando conectar con:", uri.substring(0, 50) + "...");

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
    console.error("❌ Error conectando a MongoDB:", error.message);
    process.exit(1);
  }
}

module.exports = { connectDB };