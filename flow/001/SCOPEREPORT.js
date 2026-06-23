const express = require("express");
const router = express.Router();
var mongodb = require('../../function/mongodb');
// reuse ฟอร์แมตตาราง (header/row) ตัวเดียวกับ TOBEREPOR/GETDATA
const { buildTable } = require('./TOBEREPORT');

let MAIN_DATA = 'MAIN_DATA';

let PATTERN = 'PATTERN';
let PATTERN_01 = 'PATTERN_01';

let master_FN = 'master_FN';
let ITEMs = 'ITEMs';

// ครอบ handler: error -> ตอบ 500 แทนการค้าง (เหมือน TOBEREPORT)
const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (err) { console.error('SCOPE ERROR', err); if (!res.headersSent) res.status(500).json({ error: err.message }); }
};

// ---------------------------------------------------------------------------
// SPECIFICATIONve: ตรวจว่าค่าหนึ่ง "อยู่ในช่วง spec" ไหม
//   BTW -> BTW_LOW <= v <= BTW_HI (เป็นช่วง)
//   LOL -> v <= LOL_H ("<")
//   HIM -> v >= HIM_L (">")
//   condition อื่น/ไม่มี spec -> ไม่กรอง (ผ่าน)
// ---------------------------------------------------------------------------
function inSpec(value, spec) {
  if (!spec || typeof spec !== 'object') return true;
  const c = spec['condition'];
  const v = Number(value);
  if (Number.isNaN(v)) return false; // มี spec แต่ค่าไม่ใช่ตัวเลข -> ไม่ผ่าน
  if (c === 'BTW') return v >= Number(spec['BTW_LOW']) && v <= Number(spec['BTW_HI']);
  if (c === 'LOL') return v <= Number(spec['LOL_H']);
  if (c === 'HIM') return v >= Number(spec['HIM_L']);
  return true;
}

// record ผ่าน spec ก็ต่อเมื่อ "ทุก item ที่ระบุ spec" มีอยู่และค่าอยู่ในช่วง
// (item ที่ไม่ได้ระบุ spec ไม่ถูกใช้กรอง ; item ที่ระบุ spec แต่หายจาก record -> ตัดทิ้ง)
function recordPassesSpec(obj, itemlist, specByItem, RESULTFORMATitem) {
  for (const code of itemlist) {
    const spec = specByItem[code];
    if (!spec || typeof spec !== 'object') continue;
    const cell = obj[code];
    if (cell == null) return false;
    if (RESULTFORMATitem[code] === 'Number') {
      if (!inSpec(cell['data_ans'], spec)) return false;
    }
    // Graph/OCR: spec แบบ min/max ใช้ไม่ได้ตรง ๆ -> ไม่กรอง (คงไว้)
  }
  return true;
}

// แปลง 1 record (datamaster) -> dataobject เฉพาะ item ที่เลือก (โครงเดียวกับ GETDATA)
// คืน null ถ้า record นี้ไม่มี item ที่เลือกเลย
function buildRecord(datamaster, itemlist, itemobject, RESULTFORMATitem, specByItem) {
  const FINAL = datamaster['FINAL'] || {};
  const FINAL_ANS = datamaster['FINAL_ANS'] || {};
  const inslist = Object.keys(FINAL);
  let obj = {};
  let any = false;
  const setBase = () => {
    obj['PO'] = datamaster['PO'];
    obj['itemlist'] = itemlist;
    obj['itemobject'] = itemobject;
    obj['MATCP'] = datamaster['MATCP'];
    obj['CUSTOMER'] = datamaster['CUSTNAME'] || datamaster['CUSTNAME_s'] || datamaster['CUSTOMER'];   // ชื่อลูกค้าจริง (เดิมดึง CUSTOMER=lot ref ลูกค้า · CUSTNAME=ชื่อบริษัท)
    obj['PART'] = datamaster['PART'];
    obj['PARTNAME'] = datamaster['PARTNAME'];
    obj['FG_CHARG'] = datamaster['FG_CHARG'];
    obj['dateG'] = datamaster['dateG'];
  };

  for (let i = 0; i < inslist.length; i++) {
    const insData = FINAL[inslist[i]];
    if (insData == null) continue;
    for (let j = 0; j < itemlist.length; j++) {
      const code = itemlist[j];
      const fmt = RESULTFORMATitem[code];
      if (fmt == null || fmt === 'Text') continue;
      const cellRaw = insData[code];
      if (cellRaw == null) continue;
      setBase();
      any = true;

      if (fmt === 'Number') {
        const subkeys = Object.keys(cellRaw);
        const datasetraw = subkeys.map(sk => (cellRaw[sk] || []).map(x => x['PO3']));
        // หน่วยวัด: ฝังใน PO2 = "<จุด>:<หน่วย>" เช่น "1:HMV" → เอาส่วนหลัง ":" (จุดแรกที่เจอ)
        let unit = '';
        for (const sk of subkeys) {
          for (const x of (cellRaw[sk] || [])) {
            const p2 = `${x && x['PO2'] != null ? x['PO2'] : ''}`;
            const ci = p2.indexOf(':');
            if (ci >= 0) { const u = p2.slice(ci + 1).trim(); if (u) { unit = u; break; } }
          }
          if (unit) break;
        }
        obj[code] = {
          "name": itemobject[code],
          "itemcode": code,
          'RESULTFORMAT': fmt,
          'SPECIFICATIONve': specByItem,
          "data": datasetraw,
          "data_ans": FINAL_ANS[code],
          "unit": unit,
        };
      } else if (fmt === 'Graph') {
        const subkeys = Object.keys(cellRaw);
        const datasetraw = subkeys.map(sk => (cellRaw[sk] || []).map(x => x['PO3']));
        obj[code] = {
          "name": itemobject[code],
          "itemcode": code,
          'RESULTFORMAT': fmt,
          'SPECIFICATIONve': specByItem,
          "data": datasetraw,
          "data_ans": FINAL_ANS[code + '_point'],
        };
      } else if (fmt === 'OCR') {
        // fix จาก GETDATA เดิม: ไม่วนซ้ำ subpic (เดิม push datasetraw ซ้ำตาม subkeys.length)
        const psc1 = cellRaw['PSC1'] || [];
        const datasetrawin = [];
        for (let v = 0; v < psc1.length; v++) {
          datasetrawin.push(psc1[v]['PIC1data']);
          datasetrawin.push(psc1[v]['PIC2data']);
          datasetrawin.push(psc1[v]['PIC3data']);
          datasetrawin.push(psc1[v]['PIC4data']);
        }
        obj[code] = {
          "name": itemobject[code],
          "itemcode": code,
          'RESULTFORMAT': fmt,
          'SPECIFICATIONve': specByItem,
          "data": [datasetrawin],
        };
      }
    }
  }
  return any ? obj : null;
}

// ===========================================================================
// helper: แปลง items[] (จาก body) -> { itemlist, specByItem }
// ===========================================================================
function parseItems(items) {
  const list = Array.isArray(items) ? items : [];
  const itemlist = list.map(it => `${it['masterID']}`).filter(x => x !== 'undefined' && x !== '');
  const specByItem = {};
  for (const it of list) specByItem[`${it['masterID']}`] = it['SPECIFICATIONve'] || null;
  return { itemlist, specByItem };
}

// helper: แปลง customers (array หรือ comma-string) -> Set ของชื่อ (ว่าง = ไม่กรอง)
function parseCustomers(input) {
  let raw = input;
  if (typeof raw === 'string') raw = raw.split(',');
  const set = new Set((Array.isArray(raw) ? raw : []).map(c => `${c}`.trim()).filter(Boolean));
  return set;
}

// helper: หา CP ใน PATTERN_01 ที่ "มี item ที่เลือกครบทุกตัว (ALL)"
async function findScopeCPs(server, selectedIDs) {
  if (selectedIDs.length === 0) return [];
  const findPATTERN = await mongodb.find(server, PATTERN, PATTERN_01, {});
  const CPs = [];
  for (const doc of findPATTERN) {
    const final = Array.isArray(doc['FINAL']) ? doc['FINAL'] : [];
    const ids = new Set(final.map(f => `${f['ITEMs']}`));
    if (selectedIDs.every(id => ids.has(id))) CPs.push(`${doc['CP']}`);
  }
  return Array.from(new Set(CPs));
}

// helper: สร้าง query วันที่จาก body (คืน {} ถ้าไม่ส่งครบ)
//   fix จาก GETDATA เดิม: ตัดเวลาเป็น 00:00:00 + ครอบทั้งวันสุดท้าย ($lt = วันถัดไป 00:00:00)
function buildDateQuery(input) {
  const hasDate = input['STARTyear'] != undefined && input['STARTmonth'] != undefined && input['STARTday'] != undefined
    && input['ENDyear'] != undefined && input['ENDmonth'] != undefined && input['ENDday'] != undefined;
  if (!hasDate) return {};
  let d = new Date(); d.setHours(0, 0, 0, 0);
  d.setFullYear(Number(input['STARTyear']), Number(input['STARTmonth']) - 1, Number(input['STARTday']));
  let dc = new Date(); dc.setHours(0, 0, 0, 0);
  dc.setFullYear(Number(input['ENDyear']), Number(input['ENDmonth']) - 1, Number(input['ENDday']));
  dc.setDate(dc.getDate() + 1);
  return { "dateG": { "$gte": d, "$lt": dc } };
}

// helper: ดึง data ของ cpList เฉพาะ item ที่เลือก + กรองแถวด้วย spec -> คืน dataolist
async function fetchScopeData(server, cpList, itemlist, specByItem, dateQuery, limitInput, customers) {
  if (cpList.length === 0 || itemlist.length === 0) return [];
  const custSet = customers instanceof Set ? customers : parseCustomers(customers);

  const query = Object.assign({ "MATCP": { "$in": cpList }, "ALL_DONE": "DONE" }, dateQuery);

  // item meta (name + RESULTFORMAT) เฉพาะที่เลือก
  const findITEMs = await mongodb.find(server, master_FN, ITEMs, {});
  const itemobject = {};
  const RESULTFORMATitem = {};
  for (const code of itemlist) {
    const m = findITEMs.find(d => d['masterID'] === code);
    if (m) { itemobject[code] = m['ITEMs']; RESULTFORMATitem[code] = m['RESULTFORMAT']; }
  }

  // หา collection ทั้งหมดใน MAIN_DATA แบบ dynamic แล้ว findReport พร้อมกัน (ตัดรูปดิบ PIC\d+ ฝั่ง server)
  let limit = parseInt(limitInput);
  if (!(limit > 0)) limit = 0;
  const collections = await mongodb.listCollections(server, MAIN_DATA);
  const perColl = await Promise.all(collections.map((coll) =>
    mongodb.findReport(server, MAIN_DATA, coll, query, limit)
  ));
  const allMATCP = perColl.flat();

  // dedup ด้วย PO: PO ซ้ำข้าม collection เก็บ _id ใหม่สุด (ObjectId ใหญ่กว่า = ใหม่กว่า)
  const byPO = new Map();
  for (let i = 0; i < allMATCP.length; i++) {
    const doc = allMATCP[i];
    const key = (doc.PO !== undefined && doc.PO !== null) ? doc.PO : `__noPO_${doc._id}`;
    const existing = byPO.get(key);
    if (!existing || String(doc._id) > String(existing._id)) byPO.set(key, doc);
  }
  let findMATCP = Array.from(byPO.values());

  // limit mode: หลัง dedup เรียง _id ใหม่->เก่า แล้วเอา N ตัวแรก
  if (limit > 0) {
    findMATCP.sort((a, b) => (String(a._id) < String(b._id) ? 1 : -1));
    findMATCP = findMATCP.slice(0, limit);
  }

  // build records (เฉพาะ item ที่เลือก) + กรองแถวด้วย spec
  const dataolist = [];
  for (let M = 0; M < findMATCP.length; M++) {
    const obj = buildRecord(findMATCP[M], itemlist, itemobject, RESULTFORMATitem, specByItem);
    if (obj == null) continue;
    if (custSet.size && !custSet.has(`${obj['CUSTOMER'] || ''}`.trim())) continue;   // กรอง customer (ว่าง=ทุกราย)
    if (!recordPassesSpec(obj, itemlist, specByItem, RESULTFORMATitem)) continue;
    dataolist.push(obj);
  }
  return dataolist;
}

// ===========================================================================
// STEP 1: ดึง ITEMs ทั้งหมดใน master_FN -> list [{ masterID, ITEMs, RESULTFORMAT }]
//   header: server (plant) เหมือนเดิม
// ===========================================================================
router.post('/SCOPE/ITEMS', wrap(async (req, res) => {
  const server = req.headers['server'];
  if (server === undefined) return res.status(400).json({ error: 'missing header: server' });

  const findITEMs = await mongodb.find(server, master_FN, ITEMs, {});
  const list = findITEMs.map(d => ({
    masterID: d['masterID'],
    ITEMs: d['ITEMs'],
    RESULTFORMAT: d['RESULTFORMAT'],
  }));
  res.json(list);
}));

// ===========================================================================
// STEP 2: เลือก items (จาก step1) + spec -> หา CP ใน PATTERN_01 ที่ "มี items ครบทุกตัว"
//   body: { items: [ { masterID, SPECIFICATIONve? }, ... ] }
//   คืน: { CPs: [...], items: [...] }  (echo items+spec ไว้ให้ส่งต่อ step3 ได้เลย)
//   *** ถ้าอยากรวบ step2+3 ในครั้งเดียว ใช้ /SCOPE/REPORT แทน ***
// ===========================================================================
router.post('/SCOPE/CP', wrap(async (req, res) => {
  const server = req.headers['server'];
  if (server === undefined) return res.status(400).json({ error: 'missing header: server' });

  const { itemlist } = parseItems(req.body['items']);
  if (itemlist.length === 0) return res.json({ CPs: [], items: req.body['items'] || [] });

  const CPs = await findScopeCPs(server, itemlist);
  res.json({ CPs, items: req.body['items'] });
}));

// ===========================================================================
// STEP 3: ดึง data ของ list MATCP (เฉพาะ items ที่เลือก) + กรองแถวด้วย spec
//   body: { MATCP: [cp...]|cp, items:[{masterID,SPECIFICATIONve?}], วันที่(optional), limit?, requst? }
//   header: server เหมือนเดิม
// ===========================================================================
router.post('/SCOPE/GETDATA', wrap(async (req, res) => {
  const input = req.body;
  const server = req.headers['server'];
  if (server === undefined) return res.status(400).json({ error: 'missing header: server' });

  const cpList = Array.isArray(input['MATCP'])
    ? input['MATCP'].map(c => `${c}`)
    : (input['MATCP'] != null ? [`${input['MATCP']}`] : []);
  const { itemlist, specByItem } = parseItems(input['items']);

  const dataolist = await fetchScopeData(server, cpList, itemlist, specByItem, buildDateQuery(input), input['limit'], input['customers']);

  if (input['requst'] === 'table') return res.json(buildTable(dataolist));
  res.json(dataolist);
}));

// ===========================================================================
// STEP 2+3 รวบเป็นครั้งเดียว: หา CP จาก items เอง แล้วดึง data ต่อทันที
//   body: { items:[{masterID,SPECIFICATIONve?}], วันที่(optional), limit?, requst? }
//   header: server เหมือนเดิม
//   requst:"table" -> array ตาราง ; ไม่ส่ง -> dataolist
//   (อยากได้ CP ที่ใช้ด้วย ส่ง debug:true -> คืน { CPs, data })
// ===========================================================================
router.post('/SCOPE/REPORT', wrap(async (req, res) => {
  const input = req.body;
  const server = req.headers['server'];
  if (server === undefined) return res.status(400).json({ error: 'missing header: server' });

  const { itemlist, specByItem } = parseItems(input['items']);
  if (itemlist.length === 0) return res.json(input['requst'] === 'table' ? [] : []);

  // step2: หา CP ที่มี item ครบทุกตัว
  const cpList = await findScopeCPs(server, itemlist);

  // step3: ดึง data ของ CP เหล่านั้น เฉพาะ item ที่เลือก + กรองแถวด้วย spec
  const dataolist = await fetchScopeData(server, cpList, itemlist, specByItem, buildDateQuery(input), input['limit'], input['customers']);

  const out = input['requst'] === 'table' ? buildTable(dataolist) : dataolist;
  if (input['debug'] === true || input['debug'] === 'true') return res.json({ CPs: cpList, data: out });
  res.json(out);
}));

// (เลิกใช้ /SCOPE/CUSTOMERS — distinct ข้ามทุก collection หนักเกิน/แขวน · widget ดึงรายชื่อลูกค้า
//  จากคอลัมน์ CUSTOMER ใน buffer ที่ Run มาแล้วแทน · server กรองด้วย customers ใน REPORT พอ)

module.exports = router;
