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

// connection pool แยกของตัวเอง (เดิมใช้ sql.connect/sql.close global ร่วมกับ mssql.js ทำให้ชนกัน)
let poolPromise;
function getPool() {
  if (!poolPromise) {
    poolPromise = new sql.ConnectionPool(config).connect()
      .catch((err) => { poolPromise = null; throw err; });
  }
  return poolPromise;
}

exports.qureyR = async (input) => {
  try {
    const pool = await getPool();
    return await pool.request().query(input);
  } catch (err) {
    return err;
  }
};
