module.exports = async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  const fs = require('fs');
  const path = require('path');
  fs.writeFileSync(path.resolve(__dirname, 'mongo-uri.txt'), uri);
  global.__MONGOD__ = mongod;
  process.env.MONGODB_URI = uri;
  console.log('🗄️ Global setup: In‑memory MongoDB started at', uri);
};
