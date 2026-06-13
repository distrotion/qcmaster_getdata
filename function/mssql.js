const sql = require('mssql');
const config = {
  user: "",
  password: "",
  database: "",
  server: '',
  pool: {
    // max: 10,
    // min: 0,
    idleTimeoutMillis: 30000
  },
  options: {
    encrypt: false, // for azure
    trustServerCertificate: true, // change to true for local dev / self-signed certs
  }
}

// ใช้ connection pool ตัวเดียวร่วมกัน (เดิม connect/close ต่อ query ทำให้ pool ถูกปิดกลางคันเมื่อมี request พร้อมกัน)
let poolPromise;
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect()
      .catch((err) => { poolPromise = null; throw err; });
  }
  return poolPromise;
}

exports.qurey = async (input) => {
  try {
    const pool = await getPool();
    return await pool.request().query(input);
  } catch (err) {
    return err;
  }
};

// query แบบ parameterized: ป้องกัน SQL injection
// params = { name: value, ... } -> ใช้ @name ใน queryText
exports.queryParams = async (queryText, params = {}) => {
  try {
    const pool = await getPool();
    const request = pool.request();
    for (const [key, value] of Object.entries(params)) request.input(key, value);
    return await request.query(queryText);
  } catch (err) {
    return err;
  }
};
