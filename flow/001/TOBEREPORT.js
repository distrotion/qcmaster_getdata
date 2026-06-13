const express = require("express");
const router = express.Router();
var mssql = require('../../function/mssql');
var mongodb = require('../../function/mongodb');
var httpreq = require('../../function/axios');
var axios = require('axios');


let MAIN_DATA = 'MAIN_DATA';
let MAIN = 'MAIN';
// let MAIN = 'MAIN_210624';

let PATTERN = 'PATTERN';
let PATTERN_01 = 'PATTERN_01';

let master_FN = 'master_FN';
let ITEMs = 'ITEMs';







// ครอบ handler: error -> ตอบ 500 แทนการค้าง (เช่น record ไม่มี FINAL_ANS / OCR ไม่มี PSC1)
const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (err) { console.error('GETDATA ERROR', err); if (!res.headersSent) res.status(500).json({ error: err.message }); }
};

// mode "table": แปลง dataolist -> array ของ object { ชื่อฟิว(header): ค่า(value) }
// header: Number -> PIC{k}-POINT{n}/MEAN + ALL-MEAN, Graph -> X/Y, OCR -> P1..P4 (อิงจาก record แรก)
// _conv = ConverstStr ฝั่ง frontend: เป็นตัวเลข (parse double ได้) -> ค่าเดิม, ไม่ใช่ -> '0'
const _isNumeric = (s) => { if (s === null || s === undefined) return false; const x = `${s}`.trim(); return x !== '' && !isNaN(Number(x)); };
const _conv = (v) => (_isNumeric(v) ? `${v}` : '0');
function buildTable(input) {
  if (!Array.isArray(input) || input.length === 0) return [];

  let itemlist = input[0]['itemlist'] || [];

  // 1) รายชื่อคอลัมน์ (header) จาก record แรก
  let header = ['PO', 'CUSTOMER', 'PART', 'PARTNAME', 'FG_CHARG', 'dateG'];
  for (let j = 0; j < itemlist.length; j++) {
    let code = `${itemlist[j]}`;
    let cell = input[0][code];
    if (cell != null) {
      let fmt = `${cell['RESULTFORMAT']}`;
      if (fmt === 'Number') {
        for (let k = 0; k < cell['data'].length; k++) {
          let num = 1;
          for (let v = 0; v < cell['data'][k].length; v++) {
            if (v !== cell['data'][k].length - 1) header.push(`${cell['name']}(PIC${k + 1}-POINT${num})`);
            else header.push(`${cell['name']}(PIC${k + 1}-MEAN)`);
            num++;
          }
        }
        header.push(`${cell['name']}(ALL-MEAN)`);
        // SPECIFICATIONve เฉพาะ condition BTW -> เพิ่มคอลัมน์ max/min
        let _sp = cell['SPECIFICATIONve'] && cell['SPECIFICATIONve'][code];
        if (_sp && typeof _sp === 'object' && _sp['condition'] === 'BTW') {
          header.push(`${cell['name']}-max`);
          header.push(`${cell['name']}-min`);
        }
      } else if (fmt === 'Graph') {
        header.push(`${cell['name']}(X)`);
        header.push(`${cell['name']}(Y)`);
      } else if (fmt === 'OCR') {
        header.push(`${cell['name']}-P1`);
        header.push(`${cell['name']}-P2`);
        header.push(`${cell['name']}-P3`);
        header.push(`${cell['name']}-P4`);
      }
    }
  }

  // 2) แต่ละ record -> เก็บค่าตามลำดับ แล้ว map เข้ากับ header เป็น object
  let out = [];
  for (let i = 0; i < input.length; i++) {
    let row = [
      `${input[i]['PO']}`, `${input[i]['CUSTOMER']}`, `${input[i]['PART']}`,
      `${input[i]['PARTNAME']}`, `${input[i]['FG_CHARG']}`, `${input[i]['dateG']}`,
    ];
    for (let j = 0; j < itemlist.length; j++) {
      let code = `${itemlist[j]}`;
      let cell = input[i][code];
      if (cell != null) {
        let fmt = `${cell['RESULTFORMAT']}`;
        if (fmt === 'Number') {
          for (let k = 0; k < cell['data'].length; k++)
            for (let v = 0; v < cell['data'][k].length; v++)
              row.push(_conv(`${cell['data'][k][v]}`));
          row.push(`${cell['data_ans']}`);
          // SPECIFICATIONve BTW -> ค่า max/min (ลำดับตรงกับ header)
          let _sp = cell['SPECIFICATIONve'] && cell['SPECIFICATIONve'][code];
          if (_sp && typeof _sp === 'object' && _sp['condition'] === 'BTW') {
            row.push(`${_sp['BTW_HI']}`);
            row.push(`${_sp['BTW_LOW']}`);
          }
        } else if (fmt === 'Graph') {
          row.push(_conv(`${cell['data_ans'] ? cell['data_ans']['x'] : undefined}`));
          row.push(_conv(`${cell['data_ans'] ? cell['data_ans']['y'] : undefined}`));
        } else if (fmt === 'OCR') {
          for (let k = 0; k < cell['data'].length; k++)
            for (let v = 0; v < cell['data'][k].length; v++)
              row.push(_conv(`${cell['data'][k][v]}`));
        }
      }
    }
    let obj = {};
    for (let k = 0; k < header.length; k++) obj[header[k]] = row[k];
    out.push(obj);
  }
  return out;
}

router.post('/TOBEREPOR/GETDATA', wrap(async (req, res) => {
  //-------------------------------------
  console.log(req.body);
   console.log(req.headers);
  let input = req.body;
  let headers = req.headers;
  //-------------------------------------

  let output = {};
  let itemlist = [];
  // let inslist = [];
  let itemobject = {};
  // let dataobject = {};
  let dataolist = [];
  let RESULTFORMATitem = {};
  let SPECIFICATIONve = {};


  if (headers['server'] !== undefined && input['MATCP'] != undefined) {



    // auto-detect mode: ส่งช่วงวันที่ครบ -> กรองด้วย dateG ; ไม่ส่งวันที่ -> ข้ามตัวกรองวันที่ (ใช้ limit เอา N ล่าสุดแทน)
    let query = { "MATCP": input['MATCP'], "ALL_DONE": "DONE" };
    let hasDate = input['STARTyear'] != undefined && input['STARTmonth'] != undefined && input['STARTday'] != undefined
      && input['ENDyear'] != undefined && input['ENDmonth'] != undefined && input['ENDday'] != undefined;
    if (hasDate) {
      let d = new Date();
      d.setFullYear(input['STARTyear'], `${parseInt(input['STARTmonth']) - 1}`, input['STARTday']);
      let dc = new Date();
      dc.setFullYear(input['ENDyear'], `${parseInt(input['ENDmonth']) - 1}`, input['ENDday']);
      query["dateG"] = { "$gte": d, "$lt": dc };
    }

    let findITEMs = await mongodb.find(headers['server'],master_FN, ITEMs, {});
    let findPATTERN = await mongodb.find(headers['server'],PATTERN, PATTERN_01, { "CP": input['MATCP'] });


    // หา collection ทั้งหมดใน MAIN_DATA แบบ dynamic แล้ว find ทุกตัวพร้อมกันด้วยเงื่อนไขเดียวกัน
    // (เดิมฮาร์ดโค้ด MAIN + MAIN_271025 — งวดใหม่ต้องมาแก้โค้ดเอง)
    let collections = await mongodb.listCollections(headers['server'], MAIN_DATA);
    // optional limit: ส่ง input.limit (จำนวน) -> เอาเฉพาะ N รายการล่าสุด ; ไม่ส่ง/<=0 = ทั้งหมด (เหมือนเดิม)
    let limit = parseInt(input['limit']);
    if (!(limit > 0)) limit = 0;
    // findReport = find + ตัดรูปดิบ PIC\d+ ออกฝั่ง server (payload เล็กลง ~15 เท่า, output เท่าเดิม)
    let perColl = await Promise.all(collections.map((coll) =>
      mongodb.findReport(headers['server'], MAIN_DATA, coll, query, limit)
    ));
    let allMATCP = perColl.flat();

    // dedup ด้วย PO: ถ้า PO ซ้ำข้าม collection ให้เก็บ doc ที่ _id ใหม่สุดเสมอ
    // (ObjectId เรียงตามเวลาที่สร้าง — _id มากกว่า = ใหม่กว่า) ผลลัพธ์ PO จึงไม่ซ้ำกัน
    let byPO = new Map();
    for (let i = 0; i < allMATCP.length; i++) {
      let doc = allMATCP[i];
      // ถ้า PO undefined/null ใช้ _id เป็น key กันถูกยุบรวมเหลือตัวเดียว
      let key = (doc.PO !== undefined && doc.PO !== null) ? doc.PO : `__noPO_${doc._id}`;
      let existing = byPO.get(key);
      if (!existing || String(doc._id) > String(existing._id)) {
        byPO.set(key, doc);
      }
    }
    let findMATCP = Array.from(byPO.values());

    // limit mode: หลัง dedup เรียง _id ใหม่->เก่า แล้วเอา N ตัวแรก (ล่าสุดจริงทั้งชุด)
    if (limit > 0) {
      findMATCP.sort((a, b) => (String(a._id) < String(b._id) ? 1 : -1));
      findMATCP = findMATCP.slice(0, limit);
    }

    if (findPATTERN.length > 0) {
      let data = findPATTERN[0]['FINAL'];
      for (let i = 0; i < data.length; i++) {
        itemlist.push(data[i]['ITEMs']);

        SPECIFICATIONve[data[i]['ITEMs']] = data[i]['SPECIFICATIONve'] || '{}';

      }


      for (let i = 0; i < itemlist.length; i++) {
        for (let j = 0; j < findITEMs.length; j++) {
          if (itemlist[i] === findITEMs[j]['masterID']) {
            itemobject[itemlist[i]] = findITEMs[j]['ITEMs'];
            RESULTFORMATitem[itemlist[i]] = findITEMs[j]['RESULTFORMAT'];




            //SPECIFICATIONve
            //RESULTFORMATitem
            break;
          }

        }


      }



      if (findMATCP.length > 0) {

        // inslist = Object.keys(findMATCP[0]['FINAL']);

        for (let M = 0; M < findMATCP.length; M++) {
          let inslist = Object.keys(findMATCP[M]['FINAL']);
          let dataobject = {};
          let datamaster = findMATCP[M];
          for (let i = 0; i < inslist.length; i++) {

            for (let j = 0; j < itemlist.length; j++) {

              if (datamaster['FINAL'][inslist[i]] != undefined) {




                if (datamaster['FINAL'][inslist[i]][itemlist[j]] != undefined) {
                  if (RESULTFORMATitem[itemlist[j]] !== 'Text') {

                    //----------------------------------------------------------------------------------------

                    if (RESULTFORMATitem[itemlist[j]] === 'Number') {

                      dataobject['PO'] = datamaster['PO'];
                      dataobject["itemlist"] = itemlist,
                        dataobject["itemobject"] = itemobject,

                        dataobject['MATCP'] = datamaster['MATCP'];
                      dataobject['CUSTOMER'] = datamaster['CUSTOMER'];
                      dataobject['PART'] = datamaster['PART'];
                      dataobject['PARTNAME'] = datamaster['PARTNAME'];
                      dataobject['FG_CHARG'] = datamaster['FG_CHARG'];
                      dataobject['dateG'] = datamaster['dateG'];

                      //FG_CHARG

                      let subpicdata = Object.keys(datamaster['FINAL'][inslist[i]][itemlist[j]])
                      let datasetraw = [];
                      if (subpicdata.length > 0) {

                        for (let k = 0; k < subpicdata.length; k++) {
                          let datainside = datamaster['FINAL'][inslist[i]][itemlist[j]][subpicdata[k]];
                          let datasetrawin = [];
                          for (let v = 0; v < datainside.length; v++) {
                            // datasetrawin.push(datainside[v]['PO3'].replace("\n", "").replace("\r", ""));
                            datasetrawin.push(datainside[v]['PO3']);

                            // console.log(datainside)

                          }
                          datasetraw.push(datasetrawin);
                        }
                      }

                      dataobject[itemlist[j]] = {
                        "name": itemobject[itemlist[j]],
                        "itemcode": itemlist[j],
                        'RESULTFORMAT': RESULTFORMATitem[itemlist[j]],
                        'SPECIFICATIONve': SPECIFICATIONve,
                        // "data": datamaster['FINAL'][inslist[i]][itemlist[j]],
                        "data": datasetraw,
                        "data_ans": datamaster['FINAL_ANS'][itemlist[j]],
                      }

                    } else if (RESULTFORMATitem[itemlist[j]] === 'Graph') {

                      dataobject['PO'] = datamaster['PO'];
                      dataobject["itemlist"] = itemlist,

                        dataobject['MATCP'] = datamaster['MATCP'];
                      dataobject['CUSTOMER'] = datamaster['CUSTOMER'];
                      dataobject['PART'] = datamaster['PART'];
                      dataobject['PARTNAME'] = datamaster['PARTNAME'];
                      dataobject['FG_CHARG'] = datamaster['FG_CHARG'];
                      dataobject['dateG'] = datamaster['dateG'];

                      let subpicdata = Object.keys(datamaster['FINAL'][inslist[i]][itemlist[j]])
                      let datasetraw = [];
                      if (subpicdata.length > 0) {

                        for (let k = 0; k < subpicdata.length; k++) {
                          let datainside = datamaster['FINAL'][inslist[i]][itemlist[j]][subpicdata[k]];
                          let datasetrawin = [];
                          for (let v = 0; v < datainside.length; v++) {
                            // datasetrawin.push(datainside[v]['PO3'].replace("\n", "").replace("\r", ""));
                            datasetrawin.push(datainside[v]['PO3']);
                            // console.log(datainside)

                          }
                          datasetraw.push(datasetrawin);
                        }
                      }

                      dataobject[itemlist[j]] = {
                        "name": itemobject[itemlist[j]],
                        "itemcode": itemlist[j],
                        'RESULTFORMAT': RESULTFORMATitem[itemlist[j]],
                        "data": datasetraw,
                        "data_ans": datamaster['FINAL_ANS'][itemlist[j] + '_point'],

                      }

                    } else if (RESULTFORMATitem[itemlist[j]] === 'OCR') {

                      dataobject['PO'] = datamaster['PO'];
                      dataobject["itemlist"] = itemlist,

                        dataobject['MATCP'] = datamaster['MATCP'];
                      dataobject['CUSTOMER'] = datamaster['CUSTOMER'];
                      dataobject['PART'] = datamaster['PART'];
                      dataobject['PARTNAME'] = datamaster['PARTNAME'];
                      dataobject['FG_CHARG'] = datamaster['FG_CHARG'];
                      dataobject['dateG'] = datamaster['dateG'];
                      let subpicdata = Object.keys(datamaster['FINAL'][inslist[i]][itemlist[j]])

                      let datasetraw = [];
                      if (subpicdata.length > 0) {

                        for (let k = 0; k < subpicdata.length; k++) {
                          let datainside = datamaster['FINAL'][inslist[i]][itemlist[j]];
                          // console.log("--------------")
                          // console.log(datainside['PSC1'])
                          // console.log("--------------")
                          let datasetrawin = [];
                          // // console.log(datainside['PIC1data']);
                          // // console.log(datainside['PIC2data']);
                          // // console.log(datainside['PIC3data']);
                          // // console.log(datainside['PIC4data']);

                          for (let v = 0; v < datainside['PSC1'].length; v++) {
                            // datasetrawin.push(datainside[v]['PO3'].replace("\n", "").replace("\r", ""));
                            datasetrawin.push(datainside['PSC1'][v]['PIC1data']);
                            datasetrawin.push(datainside['PSC1'][v]['PIC2data']);
                            datasetrawin.push(datainside['PSC1'][v]['PIC3data']);
                            datasetrawin.push(datainside['PSC1'][v]['PIC4data']);

                            // console.log(datainside['PSC1'][v]['PIC1data'])

                          }
                          datasetraw.push(datasetrawin);


                        }
                      }

                      dataobject[itemlist[j]] = {
                        "name": itemobject[itemlist[j]],
                        "itemcode": itemlist[j],
                        'RESULTFORMAT': RESULTFORMATitem[itemlist[j]],
                        "data": datasetraw,
                        // "data_ans": datamaster['FINAL_ANS'][itemlist[j] + '_point'],

                      }


                    }



                    //----------------------------------------------------------------------------------------
                  }



                }
              }


            }

          }
          dataolist.push(dataobject)
        }
      }

    }

    console.log(findMATCP.length);
  }

  // mode "table": คืน array ของ object { ชื่อฟิว: ค่า } ; ไม่ส่ง requst = คืน dataolist เหมือนเดิม
  if (input['requst'] === 'table') {
    return res.json(buildTable(dataolist));
  }

  output = dataolist


  //-------------------------------------
  res.json(output);
}));


module.exports = router;
