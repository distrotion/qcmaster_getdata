const express = require("express");
const router = express.Router();
// ครอบ async handler ทุกตัว: error จะตอบ 500 แทนการเงียบ (ซึ่งทำให้ frontend รอไม่มีกำหนด)
const _post = router.post.bind(router), _get = router.get.bind(router);
const _wrapH = (fn) => (typeof fn === 'function') ? async (req, res, next) => {
  try { await fn(req, res, next); }
  catch (e) { console.error('ROUTE ERROR', req.path, e); if (!res.headersSent) res.status(500).json({ error: e.message }); }
} : fn;
router.post = (path, ...h) => _post(path, ...h.map(_wrapH));
router.get = (path, ...h) => _get(path, ...h.map(_wrapH));

var mongodb = require('../../function/mongodb');
var mongodbs = require('../../function/mongodbs');
var mssql = require('../../function/mssql');

let masterDB_FN = "master_FN";
let masterDB_IC = "master_IC";
let masterDB_IP = "master_IP";
let PATTERN = "PATTERN";
//
let Auth = 'MASTER_QC_USER';
let user = 'USER';
//
let GRAPH_TABLE = "GRAPH_TABLE";
let TYPE = "TYPE";
let UNIT = "UNIT";
let ITEMs = "ITEMs";
let MACHINE = "MACHINE";
let METHOD = "METHOD";
let INSTRUMENTS = "INSTRUMENTS";
let RESULTFORMAT = "RESULTFORMAT";
let SPECIFICATION = "SPECIFICATION";
let TOLERANCE = "TOLERANCE";
let GRAPHTYPE = "GRAPHTYPE";
let CALCULATE = "CALCULATE";
let LOAD = "LOAD";
let CORETYPE = "CORETYPE";
let FREQUENCY = "FREQUENCY";
let PATTERN_01 = "PATTERN_01";






router.post('/GET_DATA_TEST', async (req, res) => {
  //-------------------------------------
  console.log("--GET_DATA_TEST--");
  let input = req.body;
  let headers = req.headers;
  let output = ''
  //-------------------------------------
  console.log(input);
  console.log(headers['server']);
  // output = serverret(headers['server'])


  return res.json(output);
});

router.post('/GET_MATCP_DATA', async (req, res) => {
  //-------------------------------------
  console.log("--GET_MATCP_DATA--");
  let input = req.body;
  let headers = req.headers;
  let output = []
  //-------------------------------------
  console.log(input);




  // let findTYPE_IC = await mongodb.find(headers['server'],masterDB_IC, TYPE, {});
  // let findITEMs_IC = await mongodb.find(headers['server'],masterDB_IC, ITEMs, {});
  // let findCALCULATE_IC = await mongodb.find(headers['server'],masterDB_IC, CALCULATE, {});
  // let findMACHINE_IC = await mongodb.find(headers['server'],masterDB_IC, MACHINE, {});
  // let findUNIT_IC = await mongodb.find(headers['server'],masterDB_IC, UNIT, {});
  // let findSPECIFICATION_IC = await mongodb.find(headers['server'],masterDB_IC, SPECIFICATION, {});




  if (input['MATCP'] != undefined && input['MATCP'] != '' && input['MATCP'] != '-') {
    let find2 = await mongodb.find(headers['server'], PATTERN, PATTERN_01, { "CP": `${input['MATCP']}` });
    // console.log(find2);
    if (find2.length > 0) {
      output = find2;
    } else {
      // output = [{
      //   "CP": input['MATCP'],
      // }]
    }

    // console.log(find2[0]['reportset']);


    if (output.length > 0) {

      let findTYPE_FN = await mongodb.find(headers['server'], masterDB_FN, TYPE, {});
      let findITEMs_FN = await mongodb.find(headers['server'], masterDB_FN, ITEMs, {});
      let findCALCULATE_FN = await mongodb.find(headers['server'], masterDB_FN, CALCULATE, {});
      let findMACHINE_FN = await mongodb.find(headers['server'], masterDB_FN, MACHINE, {});
      let findUNIT_FN = await mongodb.find(headers['server'], masterDB_FN, UNIT, {});
      let findSPECIFICATION_FN = await mongodb.find(headers['server'], masterDB_FN, SPECIFICATION, {});

      let findTYPE_IC = await mongodb.find(headers['server'], masterDB_IC, TYPE, {});
      let findITEMs_IC = await mongodb.find(headers['server'], masterDB_IC, ITEMs, {});
      let findCALCULATE_IC = await mongodb.find(headers['server'], masterDB_IC, CALCULATE, {});
      let findMACHINE_IC = await mongodb.find(headers['server'], masterDB_IC, MACHINE, {});
      let findUNIT_IC = await mongodb.find(headers['server'], masterDB_IC, UNIT, {});
      let findSPECIFICATION_IC = await mongodb.find(headers['server'], masterDB_IC, SPECIFICATION, {});

      let findTYPE_IP = await mongodb.find(headers['server'], masterDB_IP, TYPE, {});
      let findITEMs_IP = await mongodb.find(headers['server'], masterDB_IP, ITEMs, {});
      let findCALCULATE_IP = await mongodb.find(headers['server'], masterDB_IP, CALCULATE, {});
      let findMACHINE_IP = await mongodb.find(headers['server'], masterDB_IP, MACHINE, {});
      let findUNIT_IP = await mongodb.find(headers['server'], masterDB_IP, UNIT, {});
      let findSPECIFICATION_IP = await mongodb.find(headers['server'], masterDB_IP, SPECIFICATION, {});

      output[0][`findTYPE_FN`] = findTYPE_FN;
      output[0][`findITEMs_FN`] = findITEMs_FN;
      output[0][`findCALCULATE_FN`] = findCALCULATE_FN;
      output[0][`findMACHINE_FN`] = findMACHINE_FN;
      output[0][`findUNIT_FN`] = findUNIT_FN;
      output[0][`findSPECIFICATION_FN`] = findSPECIFICATION_FN;

      output[0][`findTYPE_IC`] = findTYPE_IC;
      output[0][`findITEMs_IC`] = findITEMs_IC;
      output[0][`findCALCULATE_IC`] = findCALCULATE_IC;
      output[0][`findMACHINE_IC`] = findMACHINE_IC;
      output[0][`findUNIT_IC`] = findUNIT_IC;
      output[0][`findSPECIFICATION_IC`] = findSPECIFICATION_IC;

      output[0][`findTYPE_IP`] = findTYPE_IP;
      output[0][`findITEMs_IP`] = findITEMs_IP;
      output[0][`findCALCULATE_IP`] = findCALCULATE_IP;
      output[0][`findMACHINE_IP`] = findMACHINE_IP;
      output[0][`findUNIT_IP`] = findUNIT_IP;
      output[0][`findSPECIFICATION_IP`] = findSPECIFICATION_IP;
    }
  }



  // output[0][`findTYPE_IC`] = findTYPE_IC;
  // output[0][`findITEMs_IC`] = findITEMs_IC;
  // output[0][`findCALCULATE_IC`] = findCALCULATE_IC;
  // output[0][`findMACHINE_IC`] = findMACHINE_IC;
  // output[0][`findUNIT_IC`] = findUNIT_IC;
  // output[0][`findSPECIFICATION_IC`] = findSPECIFICATION_IC;
  // 

  return res.json(output);
});

router.post('/GET_MATCP_DATA_OTM01', async (req, res) => {
  //-------------------------------------
  console.log("--GET_MATCP_DATA_OTM01--");
  let input = req.body;
  let headers = req.headers;
  let output = []
  //-------------------------------------
  console.log(input);




  // let findTYPE_IC = await mongodb.find(headers['server'],masterDB_IC, TYPE, {});
  // let findITEMs_IC = await mongodb.find(headers['server'],masterDB_IC, ITEMs, {});
  // let findCALCULATE_IC = await mongodb.find(headers['server'],masterDB_IC, CALCULATE, {});
  // let findMACHINE_IC = await mongodb.find(headers['server'],masterDB_IC, MACHINE, {});
  // let findUNIT_IC = await mongodb.find(headers['server'],masterDB_IC, UNIT, {});
  // let findSPECIFICATION_IC = await mongodb.find(headers['server'],masterDB_IC, SPECIFICATION, {});




  if (input['MATCP'] != undefined && input['MATCP'] != '' && input['MATCP'] != '-') {
    let find2 = await mongodb.find(headers['server'], PATTERN, PATTERN_01, { "CP": `${input['MATCP']}` });
    // console.log(find2);
    if (find2.length > 0) {
      output = find2;
    } else {
      // output = [{
      //   "CP": input['MATCP'],
      // }]
    }

    // console.log(find2[0]['reportset']);


    if (output.length > 0) {

      // ยิงพร้อมกันทั้ง 5 ชุด (เดิมรอเรียงตัวต่อตัว)
      let [findTYPE_FN, findTYPE_IC, findTYPE_IP, GRAPH_STD, GRAPH_TABLE] = await Promise.all([
        mongodb.findallC(headers['server'], masterDB_FN, "x", {}),
        mongodb.findallC(headers['server'], masterDB_IC, "x", {}),
        mongodb.findallC(headers['server'], masterDB_IP, "x", {}),
        mongodb.find(headers['server'], PATTERN, "GRAPH_TABLE_CONTROL", {}),
        mongodb.find(headers['server'], PATTERN, "GRAPH_TABLE", {}),
      ]);


      output[0][`findTYPE_FN`] = findTYPE_FN['TYPE'];
      output[0][`findITEMs_FN`] = findTYPE_FN['ITEMs'];
      output[0][`findCALCULATE_FN`] = findTYPE_FN['CALCULATE'];
      output[0][`findMACHINE_FN`] = findTYPE_FN['MACHINE'];
      output[0][`findUNIT_FN`] = findTYPE_FN['UNIT'];
      output[0][`findSPECIFICATION_FN`] = findTYPE_FN['SPECIFICATION'];

      output[0][`findTYPE_IC`] = findTYPE_IC['TYPE'];
      output[0][`findITEMs_IC`] = findTYPE_IC['ITEMs'];
      output[0][`findCALCULATE_IC`] = findTYPE_IC['CALCULATE'];
      output[0][`findMACHINE_IC`] = findTYPE_IC['MACHINE'];
      output[0][`findUNIT_IC`] = findTYPE_IC['UNIT'];
      output[0][`findSPECIFICATION_IC`] = findTYPE_IC['SPECIFICATION'];

      output[0][`findTYPE_IP`] = findTYPE_IP['TYPE'];
      output[0][`findITEMs_IP`] = findTYPE_IP['ITEMs'];
      output[0][`findCALCULATE_IP`] = findTYPE_IP['CALCULATE'];
      output[0][`findMACHINE_IP`] = findTYPE_IP['MACHINE'];
      output[0][`findUNIT_IP`] = findTYPE_IP['UNIT'];
      output[0][`findSPECIFICATION_IP`] = findTYPE_IP['SPECIFICATION'];


      output[0][`GRAPH_STD`] = GRAPH_STD;
      output[0][`GRAPH_TABLE`] = GRAPH_TABLE;
    }
  }



  // output[0][`findTYPE_IC`] = findTYPE_IC;
  // output[0][`findITEMs_IC`] = findITEMs_IC;
  // output[0][`findCALCULATE_IC`] = findCALCULATE_IC;
  // output[0][`findMACHINE_IC`] = findMACHINE_IC;
  // output[0][`findUNIT_IC`] = findUNIT_IC;
  // output[0][`findSPECIFICATION_IC`] = findSPECIFICATION_IC;
  // 

  return res.json(output);
});

router.post('/GET_MATCP_SETDATA', async (req, res) => {
  //-------------------------------------
  console.log("--GET_MATCP_SETDATA--");
  let input = req.body;
  let headers = req.headers;
  let output = {}
  //-------------------------------------
  console.log(input);
  if (input['CPorder'] != undefined) {
    let PATTERNfindDATA = await mongodb.find(headers['server'], PATTERN, PATTERN_01, { "CP": `${input['CPorder']}` });
    // console.log(find2);
    // output = find2;



    if (PATTERNfindDATA.length === 0) {

      out = input.CPorder;

      input[`FINAL`] = [{
        'SEQ': 1,
        'TYPE': input.MASTERdatalist.TYPE,
        'ITEMs': input.editedItem_FN.ITEMs,
        'RESULTFORMAT': input.MASTERdatalist.RESULTFORMAT,
        'GRAPHTYPE': input.MASTERdatalist.GRAPHTYPE,
        'INTERSECTION': input.MASTERdatalist.INTERSECTION,
        'DOCUMENT': input.editedItem_FN.DOCUMENT,
        'SCMARK': input.editedItem_FN.SCMARK,
        'METHOD': input.editedItem_FN.METHOD,
        'INSTRUMENTS': input.editedItem_FN.INSTRUMENTS,
        'SPECIFICATION': input.editedItem_FN.SPECIFICATION,
        'SPECIFICATIONve': input.editedItem_FN.SPECIFICATIONve,
        'UNIT': input.editedItem_FN.UNIT,
        'POINTPCS': input.editedItem_FN.POINTPCS,
        'POINT': input.editedItem_FN.POINT,
        'PCS': input.editedItem_FN.PCS,
        'FREQUENCY': input.editedItem_FN.FREQUENCY,
        'MODE': input.editedItem_FN.MODE,
        'REMARK': input.editedItem_FN.REMARK,
        'LOAD': input.editedItem_FN.LOAD,
        'CONVERSE': input.editedItem_FN.CONVERSE,
        'GRAPH_TABLE_FN': input.editedItem_FN.GRAPH_TABLE_FN
      }]
    } else {
      //
    }


  }

  return res.json(output);
});



router.post('/PIC_UPLOAD', async (req, res) => {
  //-------------------------------------
  console.log("--PIC_UPLOAD--");
  let input = req.body;
  let headers = req.headers;
  let output = {}
  //-------------------------------------
  console.log(input);
  if (input['CPorder'] != null && input['PIC'] != null) {

    let findPATTERN = await mongodb.find(headers['server'], PATTERN, PATTERN_01, { "CP": input[`CPorder`]['CP'] });
    console.log(findPATTERN);
    if (findPATTERN.length == 0) {

      return res.json("nok");

    } else {

      let input2 = findPATTERN;
      let out = input['CPorder'];
      let CP = input2[0].CP;

      let updatePATTERN = await mongodb.update(headers['server'], PATTERN, PATTERN_01, { 'CP': CP }, { $set: { 'Pimg': { "P1": input['PIC'] } } });
      return res.json("ok");
    }

  }

  return res.json("output");
});

router.post('/copy_cp', async (req, res) => {
  //-------------------------------------
  console.log("--copy_cp--");
  let input = req.body;
  let headers = req.headers;
  console.log(input)
  //-------------------------------------

  if (input['CP_MASTER'] != undefined && input['CP_NEW'] != undefined) {

    let masterdata = await mongodb.find(headers['server'], PATTERN, PATTERN_01, { "CP": `${input['CP_MASTER']}` });

    if (masterdata.length > 0) {

      let copy_from_fn = masterdata[0]['FINAL'] ?? {};
      let copy_from_ic = masterdata[0]['INCOMMING'] ?? {};

      let newdata = await mongodb.find(headers['server'], PATTERN, PATTERN_01, { "CP": `${input['CP_NEW']}` });
      if (newdata.length > 0) {
        let updatePATTERN = await mongodb.update(headers['server'], PATTERN, PATTERN_01, { 'CP': `${input['CP_NEW']}` }, { $set: { 'FINAL': copy_from_fn, 'INCOMMING': copy_from_ic } });
        return res.json({ "msg": "OK" });
      } else {

        let find2 = await mongodb.find(headers['server'], "ERP_data", "ERP_AUTO", {});

        let ERP_data = find2[0][`data`];


        for (let i = 0; i < ERP_data.length; i++) {

          if (`${input['CP_NEW']}` === ERP_data[i]['CP']) {
            // console.log(ERP_data[i]['CP']);
            let neworder = ERP_data[i];
            neworder['FINAL'] = copy_from_fn;
            neworder['INCOMMING'] = copy_from_ic;
            neworder['mass'] = 'NOMASS';
            neworder['massstatus'] = 'NOPASS';
            let updatePATTERN = await mongodb.insertMany(headers['server'], PATTERN, PATTERN_01, [neworder]);
            // break;
            return res.json({ "msg": "OK" });
          }
        }



      }



    } else {
      return res.json({ "msg": "NOK" });
    }
  }
  // console.log("------------");
  // console.log(find2);
  // console.log("------------");


  return res.json({ "msg": "NOK" });
});



router.post('/SIGNATURE_UPLOAD', async (req, res) => {
  //-------------------------------------
  console.log("--SIGNATURE_UPLOAD--");
  let input = req.body;
  let headers = req.headers;
  let output = {}
  //-------------------------------------
  console.log(input);
  if (input['ID'] != null && input['SIGNATURE'] != null) {

    let findPATTERN = await mongodbs.find(Auth, user, { "ID": input['ID'] });
    console.log(findPATTERN);
    if (findPATTERN.length == 0) {

      return res.json("nok");

    } else {
      let updatePATTERN = await mongodbs.update('mongodb://172.23.10.50:27017',Auth, user, { "ID": input['ID'] }, { $set: { 'SIGNATURE': input['SIGNATURE'] } });
      return res.json("ok");
    }

  }

  return res.json("output");
});


router.post('/SIGNATURE_GET', async (req, res) => {
  //-------------------------------------
  console.log("--SIGNATURE_GET--");
  let input = req.body;
  let headers = req.headers;
  let output = {}
  //-------------------------------------
  console.log(input);

  if (input['ID'] != null) {

    let findPATTERN = await mongodbs.find(Auth, user, { "ID": input['ID'] });

    if (findPATTERN.length == 0) {

      return res.json("nok");

    } else {
      output = {
        "SIGNATURE": findPATTERN[0]['SIGNATURE'],
      }
    }

  }

  return res.json(output);
});


router.post('/reportset_UPLOAD', async (req, res) => {
  //-------------------------------------
  console.log("--ReportSet_UPLOAD--");
  let input = req.body;
  let headers = req.headers;
  let output = 'NOK'
  //-------------------------------------
  console.log(input);

  if (input['CP'] != null && input['reportset'] != null) {

    let updatePATTERN = await mongodb.update(headers['server'], PATTERN, PATTERN_01, { 'CP': input['CP'] }, { $set: { 'reportset': input['reportset'] } });
    output = 'OK'

  }

  return res.json(output);
});

router.post('/logoset_UPLOAD', async (req, res) => {
  //-------------------------------------
  console.log("--logoset_UPLOAD--");
  let input = req.body;
  let headers = req.headers;
  let output = 'NOK'
  //-------------------------------------
  console.log(input);

  if (input['CP'] != null && input['logoset'] != null) {

    let updatePATTERN = await mongodb.update(headers['server'], PATTERN, PATTERN_01, { 'CP': input['CP'] }, { $set: { 'logoset': input['logoset'] } });
    output = 'OK'

  }

  return res.json(output);
});


module.exports = router;
