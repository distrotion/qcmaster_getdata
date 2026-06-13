const { MongoClient } = require('mongodb');

const SERVER_URLS = {
  'BP12-PH':  'mongodb://172.23.10.75:27017',
  'BP12-GAS': 'mongodb://172.23.10.99:27017',
  'GW-GAS':   'mongodb://172.23.10.71:27017',
  'HES-ISN':  'mongodb://172.23.10.70:27017',
  'HES-GAS':  'mongodb://172.23.10.73:27017',
  'HES-PH':   'mongodb://172.23.10.139:12020',
  'HES-PAL':  'mongodb://172.23.10.139:12022',
  'BP12-PAL': 'mongodb://172.23.10.139:12014',
  'BP12-PVD': 'mongodb://172.23.10.139:12016',
  'BP12-KNG': 'mongodb://172.23.10.139:12012',
  'HES-HYD':  'mongodb://172.23.10.139:12012', // PH
  'HES-FP':   'mongodb://172.23.10.139:12010', // GAS
  'HES-ZFC':  'mongodb://172.23.10.139:12014', // PAL
};

// Connection pool: เก็บ client แยกตาม server
const clients = {};

async function getClient(server) {
  const url = SERVER_URLS[server];
  if (!url) throw new Error(`Unknown server: ${server}`);

  if (!clients[server]) {
    const client = new MongoClient(url, {
      connectTimeoutMS: 3000,
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 120000, // เดิม 5000 ต่ำเกินไป -> query ที่ดึงข้อมูลเยอะถูกตัดทิ้งก่อนเสร็จ
    });
    try {
      await client.connect();
      clients[server] = client;
    } catch (err) {
      await client.close().catch(() => {});
      throw err;
    }
  }
  return clients[server];
}

exports.insertMany = async (server, db_input, collection_input, input) => {
  const client = await getClient(server);
  const collection = client.db(db_input).collection(collection_input);
  return await collection.insertMany(input);
};

exports.find = async (server, db_input, collection_input, input, projection) => {
  const client = await getClient(server);
  const collection = client.db(db_input).collection(collection_input);
  let cursor = collection.find(input).limit(0).sort({ "_id": -1 });
  if (projection) cursor = cursor.project(projection);
  return await cursor.toArray();
};

// สำหรับหน้ารายงาน: find + ตัดรูปดิบ PIC1..PICn (key /^PIC\d+$/) ออกจาก FINAL ฝั่ง server
// (รายงานไม่เคยใช้ PIC\d+ — Number/Graph ใช้ PO3, OCR ใช้ PIC\d+data) -> payload เล็กลง ~15 เท่า
// อ่านอย่างเดียว ไม่แก้ document ใน DB
const STRIP_RAW_PIC = {
  $function: {
    body: "function(final){ function strip(o){ if(o && typeof o==='object'){ for(const k of Object.keys(o)){ if(/^PIC[0-9]+$/.test(k)){ delete o[k]; } else { strip(o[k]); } } } } strip(final); return final; }",
    args: ["$FINAL"],
    lang: "js",
  },
};

exports.findReport = async (server, db_input, collection_input, input, limit) => {
  const client = await getClient(server);
  const collection = client.db(db_input).collection(collection_input);
  // เรียง _id ใหม่->เก่า ก่อน แล้วค่อย limit -> strip ทำเฉพาะ N ตัวที่เก็บ (ไม่เปลือง)
  const pipeline = [{ $match: input }, { $sort: { "_id": -1 } }];
  if (limit && limit > 0) pipeline.push({ $limit: limit });
  pipeline.push({ $addFields: { FINAL: STRIP_RAW_PIC } });
  return await collection.aggregate(pipeline).toArray();
};

exports.findsome = async (server, db_input, collection_input, input) => {
  const client = await getClient(server);
  const collection = client.db(db_input).collection(collection_input);
  return await collection.find(input).limit(500).sort({ "_id": -1 }).project({ "PO": 1, "CP": 1, "ALL_DONE": 1 }).toArray();
};

exports.findallC = async (server, db_input) => {
  const client = await getClient(server);
  const db = client.db(db_input);

  const collections = await db.listCollections().toArray();
  let res = {};
  await Promise.all(collections.map(async (coll) => {
    res[coll.name] = await db.collection(coll.name).find({}).toArray();
  }));
  return res;
};

// คืนรายชื่อ collection ทั้งหมดในฐานข้อมูล (ไม่ดึง document)
exports.listCollections = async (server, db_input) => {
  const client = await getClient(server);
  const db = client.db(db_input);
  const collections = await db.listCollections().toArray();
  return collections.map((coll) => coll.name);
};

exports.update = async (server, db_input, collection_input, input1, input2) => {
  const client = await getClient(server);
  const collection = client.db(db_input).collection(collection_input);
  const res = await collection.updateOne(input1, input2);
  const logCollection = client.db('LOG').collection('UPDATE_LOG');
  const logDoc = {
    "timestamp": new Date(),
    "server": server,
    "db": db_input,
    "collection": collection_input,
    "filter": input1,
    "update": input2,
    "matchedCount": res.matchedCount,
    "modifiedCount": res.modifiedCount,
  };
  if (db_input === 'MAIN_DATA') {
    // MAIN_DATA: คงพฤติกรรมเดิมทุกประการ (ข้อกำหนด: ห้ามเปลี่ยนอะไรที่เกี่ยวกับ MAIN_DATA)
    await logCollection.insertOne(logDoc);
  } else {
    // log ตัวใหญ่ (เช่นมีรูป base64) เก็บเฉพาะ metadata และไม่ await เพื่อไม่ให้ request รอ
    const updateStr = JSON.stringify(input2);
    if (updateStr.length > 10240) {
      logDoc.update = { "_truncated": true, "bytes": updateStr.length, "fields": Object.keys(input2.$set || input2) };
    }
    logCollection.insertOne(logDoc).catch(err => console.error('UPDATE_LOG insert failed:', err.message));
  }
  return res;
};

exports.findSAP = async (server, db_input, collection_input, input) => {
  const client = await getClient(server);
  const collection = client.db(db_input).collection(collection_input);
  return await collection.find(input).limit(1000).sort({ "_id": -1 }).toArray();
};

exports.findAllServers = (db_input, collection_input, input) => {
  const servers = Object.keys(SERVER_URLS);
  return new Promise((resolve) => {
    let pending = servers.length;
    let found = false;

    const done = () => {
      pending--;
      if (!found && pending === 0) resolve({ data: [], _server: null });
    };

    for (const server of servers) {
      getClient(server)
        .then(client => client.db(db_input).collection(collection_input).find(input).limit(0).sort({ "_id": -1 }).toArray())
        .then(docs => {
          if (!found && docs.length > 0) {
            found = true;
            resolve({ data: docs, _server: server });
          }
          done();
        })
        .catch(() => done());
    }
  });
};