const { MongoClient } = require('mongodb');

const DEFAULT_URL = 'mongodb://127.0.0.1:27017';

// Connection pool: เก็บ client แยกตาม url
const clients = {};

async function getClient(url) {
  if (!clients[url]) {
    const client = new MongoClient(url);
    try {
      await client.connect();
      clients[url] = client;
    } catch (err) {
      await client.close().catch(() => {});
      throw err;
    }
  }
  return clients[url];
}

exports.insertMany = async (db_input, collection_input, input) => {
  const client = await getClient(DEFAULT_URL);
  const collection = client.db(db_input).collection(collection_input);
  return await collection.insertMany(input);
};

exports.find = async (db_input, collection_input, input) => {
  const client = await getClient(DEFAULT_URL);
  const collection = client.db(db_input).collection(collection_input);
  return await collection.find(input).limit(1000).sort({ "_id": -1 }).toArray();
};

exports.findproject = async (db_input, collection_input, input1, input2) => {
  const client = await getClient(DEFAULT_URL);
  const collection = client.db(db_input).collection(collection_input);
  return await collection.find(input1).limit(500).sort({ "_id": -1 }).project(input2).toArray();
};

exports.findsome = async (db_input, collection_input, input) => {
  const client = await getClient(DEFAULT_URL);
  const collection = client.db(db_input).collection(collection_input);
  return await collection.find(input).limit(500).sort({ "_id": -1 }).project({ "PO": 1, "CP": 1, "ALL_DONE": 1 }).toArray();
};

exports.update = async (server, db_input, collection_input, input1, input2) => {
  const client = await getClient(server);
  const collection = client.db(db_input).collection(collection_input);
  const res = await collection.updateOne(input1, input2);
  const logCollection = client.db('LOG').collection('UPDATE_LOG');
  await logCollection.insertOne({
    "timestamp": new Date(),
    "server": server,
    "db": db_input,
    "collection": collection_input,
    "filter": input1,
    "update": input2,
    "matchedCount": res.matchedCount,
    "modifiedCount": res.modifiedCount,
  });
  return res;
};

exports.findSAP = async (urls, db_input, collection_input, input) => {
  const client = await getClient(urls);
  const collection = client.db(db_input).collection(collection_input);
  return await collection.find(input).limit(30000).sort({ "_id": -1 }).toArray();
};
