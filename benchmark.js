// benchmark.js — วัดเวลา + เก็บ response ของ endpoint ที่หน้า 04/06 ใช้
// ใช้: node benchmark.js <SERVER> <CP> <outfile.json>
// จำลองพฤติกรรม frontend จริง: หน้า 04 (GET_MATCPLIST), หน้า 06 (OTM01 + N+1 DOCUMENT/COMMENT)
'use strict';
const fs = require('fs');
const BASE = 'http://127.0.0.1:14750/';
const SERVER = process.argv[2] || 'HES-ISN';
const CP = process.argv[3] || '24010269';
const OUT = process.argv[4] || 'perf-baseline.json';

async function call(path, body) {
  const t0 = process.hrtime.bigint();
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'server': SERVER },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  return { path, ms: Math.round(ms), bytes: Buffer.byteLength(text), status: res.status, data: JSON.parse(text) };
}

(async () => {
  const results = {};
  const timings = [];
  const record = (label, r) => {
    results[label] = r.data;
    timings.push({ label, ms: r.ms, kb: Math.round(r.bytes / 1024), status: r.status });
  };

  // ---- หน้า 04 ----
  record('GET_MATCPLIST', await call('GET_MATCPLIST'));

  // ---- หน้า 06: เปิดหน้า ----
  const otm = await call('GET_MATCP_DATA_OTM01', { MATCP: CP });
  record('GET_MATCP_DATA_OTM01', otm);

  // ---- หน้า 06: N+1 loop เหมือน frontend (DOCUMENT+COMMENT ต่อ item) ----
  const pattern = otm.data[0] || {};
  const finals = Array.isArray(pattern.FINAL) ? pattern.FINAL : [];
  const incs = Array.isArray(pattern.INCOMMING) ? pattern.INCOMMING : [];
  let n1ms = 0, n1count = 0;
  for (const it of finals) {
    const d = await call('GET_FINAL_DOCUMENT', { METHODid: it.METHOD, ITEMs: it.ITEMs });
    const cm = await call('GET_FINAL_COMMENT', { masterID: it.COMMENT || it.ITEMs });
    n1ms += d.ms + cm.ms; n1count += 2;
  }
  for (const it of incs) {
    const d = await call('GET_INCOMMING_DOCUMENT', { METHODid: it.METHOD, ITEMs: it.ITEMs });
    const cm = await call('GET_INCOMMING_COMMENT', { masterID: it.COMMENT || it.ITEMs });
    n1ms += d.ms + cm.ms; n1count += 2;
  }
  timings.push({ label: `N+1 DOC/COMMENT x${n1count} (FN=${finals.length},IC=${incs.length})`, ms: Math.round(n1ms), kb: 0, status: 200 });

  // ---- หน้า 06: STEP1/STEP2 ทั้ง 3 สาย ----
  for (const flow of ['FINAL', 'INCOMMING', 'INPROCESS']) {
    const s1 = await call(`INSPECTION_${flow}_GET_STEP1`, {});
    record(`STEP1_${flow}`, s1);
    const items = (s1.data.ITEMs || []);
    if (items.length > 0) {
      const s2 = await call(`INSPECTION_${flow}_GET_STEP2`, { ITEMs: items[0].masterID });
      record(`STEP2_${flow}`, s2);
    }
  }

  fs.writeFileSync(OUT, JSON.stringify(results, null, 1));
  console.log(`server=${SERVER} CP=${CP}`);
  console.log('label'.padEnd(46) + 'ms'.padStart(8) + 'KB'.padStart(8));
  let total = 0;
  for (const t of timings) {
    console.log(t.label.padEnd(46) + String(t.ms).padStart(8) + String(t.kb).padStart(8) + (t.status !== 200 ? '  !! ' + t.status : ''));
    total += t.ms;
  }
  console.log('TOTAL'.padEnd(46) + String(total).padStart(8));
  console.log('saved -> ' + OUT);
})().catch(e => { console.error('BENCH FAILED:', e.message); process.exit(1); });
