const express = require("express");
const router = express.Router();
var mongodb = require('../../function/mongodb');
var mssql = require('../../function/mssql');

let masterDB = "master_FN";
let PATTERN = "PATTERN";
//
let GRAPH_TABLE = "GRAPH_TABLE";
let GRAPH_TABLE_CONTROL = "GRAPH_TABLE_CONTROL";
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

const wrap = fn => async (req, res) => {
  try {
    await fn(req, res);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



router.get('/FINALMASTER', wrap(async (req, res) => {
  return res.json("READY");
}));

router.post('/INSPECTION_FINAL_GET_STEP1', wrap(async (req, res) => {
  //-------------------------------------
  console.log("--INSPECTION_FINAL_GET_STEP1--");
  let input = req.body;
  let headers = req.headers;
  //-------------------------------------
  let output2 = [];
  //-------------------------------------

  let find2 = await mongodb.find(headers['server'], masterDB, ITEMs, { "activeid": "active_id" });
  if (find2.length > 0) {
    for (let i = 0; i < find2.length; i++) {
      output2.push({ "ITEMs": find2[i]['ITEMs'], "RESULTFORMAT": find2[i]['RESULTFORMAT'], "TYPE": find2[i]['TYPE'], "GRAPHTYPE": find2[i]['GRAPHTYPE'], "INTERSECTION": find2[i]['INTERSECTION'], "masterID": find2[i]['masterID'] })
    }
  }
  // console.log("------------");
  // console.log(find2);
  // console.log("------------");


  return res.json({ "ITEMs": output2 });
}));

router.post('/GET_MATCPLIST', wrap(async (req, res) => {
  //-------------------------------------
  console.log("--GET_MATCPLIST--");
  let input = req.body;
  let headers = req.headers;
  //-------------------------------------
  let output = []
  //-------------------------------------



  let find2 = await mongodb.find(`${headers['server']}`, "ERP_data", "ERP_AUTO", {});
  if (find2.length > 0) {
    output = find2[0][`data`];
  }

  // ดึงเฉพาะ field CP (ไม่เอาเอกสารเต็มที่มีรูป base64) แล้วเทียบด้วย Set
  let findP = await mongodb.find(`${headers['server']}`, PATTERN, PATTERN_01, {}, { "CP": 1 });

  const cpSet = new Set();
  for (let j = 0; j < findP.length; j++) {
    cpSet.add(findP[j]['CP']);
  }

  for (let i = 0; i < output.length; i++) {
    if (cpSet.has(output[i]['CP'])) {
      output[i]['STATUS'] = 'Prepare';
    }
  }


  return res.json(output);
}));


router.post('/graph_list', wrap(async (req, res) => {
  //-------------------------------------
  console.log("--graph_list--");
  let input = req.body;
  let headers = req.headers;
  //-------------------------------------
  let output = []
  //-------------------------------------
  //${headers['server']}
  let find1 = await mongodb.find(`${headers['server']}`, PATTERN, GRAPH_TABLE, {});

  output = find1;


  // console.log(output);

  return res.json(output);
}));

router.post('/NEW_GRAPH', wrap(async (req, res) => {
  //-------------------------------------
  console.log("--NEW_GRAPH--");
  let input = req.body;
  let headers = req.headers;
  //-------------------------------------
  let output = "NOK"
  //-------------------------------------

  if (input['NO'] != undefined) {
    //${headers['server']}
    let find1 = await mongodb.find(`${headers['server']}`, PATTERN, GRAPH_TABLE, { "NO": input['NO'] });
    if (find1.length > 0) {
      //
      // console.log("---------1");

      let out1 = { "NO": input['NO'] }

      // let out = [out1, { $set: out2 }];

      let updatePATTERN = await mongodb.update(`${headers['server']}`, PATTERN, GRAPH_TABLE, { "NO": input['NO'] }, {
        $set: {
          'GT1': input['GT1'] ?? "",
          'GT2': input['GT2'] ?? "",
          'GT3': input['GT3'] ?? "",
          'GT4': input['GT4'] ?? "",
          'GT5': input['GT5'] ?? "",
          'GT6': input['GT6'] ?? "",
          'GT7': input['GT7'] ?? "",
          'GT8': input['GT8'] ?? "",
          'GT9': input['GT9'] ?? "",
          'GT10': input['GT10'] ?? "",
          'GT11': input['GT11'] ?? "",
          'GT12': input['GT12'] ?? "",
          'GT13': input['GT13'] ?? "",
          'GT14': input['GT14'] ?? "",
          'GT15': input['GT15'] ?? "",
          'GT16': input['GT16'] ?? "",
          'GT17': input['GT17'] ?? "",
          'GT18': input['GT18'] ?? "",
          'GT19': input['GT19'] ?? "",
          'GT20': input['GT20'] ?? "",
        }
      });
      output = "OK"
    } else {
      //
      console.log("---------2");
      let neworder = {
        "NO": input['NO'],
        'GT1': input['GT1'] ?? "",
        'GT2': input['GT2'] ?? "",
        'GT3': input['GT3'] ?? "",
        'GT4': input['GT4'] ?? "",
        'GT5': input['GT5'] ?? "",
        'GT6': input['GT6'] ?? "",
        'GT7': input['GT7'] ?? "",
        'GT8': input['GT8'] ?? "",
        'GT9': input['GT9'] ?? "",
        'GT10': input['GT10'] ?? "",
        'GT11': input['GT11'] ?? "",
        'GT12': input['GT12'] ?? "",
        'GT13': input['GT13'] ?? "",
        'GT14': input['GT14'] ?? "",
        'GT15': input['GT15'] ?? "",
        'GT16': input['GT16'] ?? "",
        'GT17': input['GT17'] ?? "",
        'GT18': input['GT18'] ?? "",
        'GT19': input['GT19'] ?? "",
        'GT20': input['GT20'] ?? "",
      };
      let updatePATTERN = await mongodb.insertMany(`${headers['server']}`, PATTERN, GRAPH_TABLE, [neworder]);
      output = "OK"
    }
  }



  return res.json(output);
}));


router.post('/NEW_GRAPH_CONTROL', wrap(async (req, res) => {
  //-------------------------------------
  console.log("--NEW_GRAPH_CONTROL--");
  let input = req.body;
  let headers = req.headers;
  //-------------------------------------
  let output = "NOK"
  //-------------------------------------

  if (input['NO'] != undefined) {
    //${headers['server']}
    let find1 = await mongodb.find(`${headers['server']}`, PATTERN, GRAPH_TABLE_CONTROL, { "NO": input['NO'] });
    if (find1.length > 0) {
      //
      // console.log("---------1");

      let out1 = { "NO": input['NO'] }

      // let out = [out1, { $set: out2 }];

      let updatePATTERN = await mongodb.update(`${headers['server']}`, PATTERN, GRAPH_TABLE_CONTROL, { "NO": input['NO'] }, {
        $set: {
          'GT01H': input['GT01H'] ?? "",
          'GT02H': input['GT02H'] ?? "",
          'GT03H': input['GT03H'] ?? "",
          'GT04H': input['GT04H'] ?? "",
          'GT05H': input['GT05H'] ?? "",
          'GT06H': input['GT06H'] ?? "",
          'GT07H': input['GT07H'] ?? "",
          'GT08H': input['GT08H'] ?? "",
          'GT09H': input['GT09H'] ?? "",
          'GT10H': input['GT10H'] ?? "",
          'GT11H': input['GT11H'] ?? "",
          'GT12H': input['GT12H'] ?? "",
          'GT13H': input['GT13H'] ?? "",
          'GT14H': input['GT14H'] ?? "",
          'GT15H': input['GT15H'] ?? "",
          'GT16H': input['GT16H'] ?? "",
          'GT17H': input['GT17H'] ?? "",
          'GT18H': input['GT18H'] ?? "",
          'GT19H': input['GT19H'] ?? "",
          'GT20H': input['GT20H'] ?? "",
          //
          'GT01L': input['GT01L'] ?? "",
          'GT02L': input['GT02L'] ?? "",
          'GT03L': input['GT03L'] ?? "",
          'GT04L': input['GT04L'] ?? "",
          'GT05L': input['GT05L'] ?? "",
          'GT06L': input['GT06L'] ?? "",
          'GT07L': input['GT07L'] ?? "",
          'GT08L': input['GT08L'] ?? "",
          'GT09L': input['GT09L'] ?? "",
          'GT10L': input['GT10L'] ?? "",
          'GT11L': input['GT11L'] ?? "",
          'GT12L': input['GT12L'] ?? "",
          'GT13L': input['GT13L'] ?? "",
          'GT14L': input['GT14L'] ?? "",
          'GT15L': input['GT15L'] ?? "",
          'GT16L': input['GT16L'] ?? "",
          'GT17L': input['GT17L'] ?? "",
          'GT18L': input['GT18L'] ?? "",
          'GT19L': input['GT19L'] ?? "",
          'GT20L': input['GT20L'] ?? "",
          //
          'GT01POINT': input['GT01POINT'] ?? "",
          'GT02POINT': input['GT02POINT'] ?? "",
          'GT03POINT': input['GT03POINT'] ?? "",
          'GT04POINT': input['GT04POINT'] ?? "",
          'GT05POINT': input['GT05POINT'] ?? "",
          'GT06POINT': input['GT06POINT'] ?? "",
          'GT07POINT': input['GT07POINT'] ?? "",
          'GT08POINT': input['GT08POINT'] ?? "",
          'GT09POINT': input['GT09POINT'] ?? "",
          'GT10POINT': input['GT10POINT'] ?? "",
          'GT11POINT': input['GT11POINT'] ?? "",
          'GT12POINT': input['GT12POINT'] ?? "",
          'GT13POINT': input['GT13POINT'] ?? "",
          'GT14POINT': input['GT14POINT'] ?? "",
          'GT15POINT': input['GT15POINT'] ?? "",
          'GT16POINT': input['GT16POINT'] ?? "",
          'GT17POINT': input['GT17POINT'] ?? "",
          'GT18POINT': input['GT18POINT'] ?? "",
          'GT19POINT': input['GT19POINT'] ?? "",
          'GT20POINT': input['GT20POINT'] ?? "",

        }
      });
      output = "OK"
    } else {
      //
      console.log("---------2");
      let neworder = {
        "NO": input['NO'],
        'GT01H': input['GT01H'] ?? "",
        'GT02H': input['GT02H'] ?? "",
        'GT03H': input['GT03H'] ?? "",
        'GT04H': input['GT04H'] ?? "",
        'GT05H': input['GT05H'] ?? "",
        'GT06H': input['GT06H'] ?? "",
        'GT07H': input['GT07H'] ?? "",
        'GT08H': input['GT08H'] ?? "",
        'GT09H': input['GT09H'] ?? "",
        'GT10H': input['GT10H'] ?? "",
        'GT11H': input['GT11H'] ?? "",
        'GT12H': input['GT12H'] ?? "",
        'GT13H': input['GT13H'] ?? "",
        'GT14H': input['GT14H'] ?? "",
        'GT15H': input['GT15H'] ?? "",
        'GT16H': input['GT16H'] ?? "",
        'GT17H': input['GT17H'] ?? "",
        'GT18H': input['GT18H'] ?? "",
        'GT19H': input['GT19H'] ?? "",
        'GT20H': input['GT20H'] ?? "",
        //
        'GT01L': input['GT01L'] ?? "",
        'GT02L': input['GT02L'] ?? "",
        'GT03L': input['GT03L'] ?? "",
        'GT04L': input['GT04L'] ?? "",
        'GT05L': input['GT05L'] ?? "",
        'GT06L': input['GT06L'] ?? "",
        'GT07L': input['GT07L'] ?? "",
        'GT08L': input['GT08L'] ?? "",
        'GT09L': input['GT09L'] ?? "",
        'GT10L': input['GT10L'] ?? "",
        'GT11L': input['GT11L'] ?? "",
        'GT12L': input['GT12L'] ?? "",
        'GT13L': input['GT13L'] ?? "",
        'GT14L': input['GT14L'] ?? "",
        'GT15L': input['GT15L'] ?? "",
        'GT16L': input['GT16L'] ?? "",
        'GT17L': input['GT17L'] ?? "",
        'GT18L': input['GT18L'] ?? "",
        'GT19L': input['GT19L'] ?? "",
        'GT20L': input['GT20L'] ?? "",
        //
        'GT01POINT': input['GT01POINT'] ?? "",
        'GT02POINT': input['GT02POINT'] ?? "",
        'GT03POINT': input['GT03POINT'] ?? "",
        'GT04POINT': input['GT04POINT'] ?? "",
        'GT05POINT': input['GT05POINT'] ?? "",
        'GT06POINT': input['GT06POINT'] ?? "",
        'GT07POINT': input['GT07POINT'] ?? "",
        'GT08POINT': input['GT08POINT'] ?? "",
        'GT09POINT': input['GT09POINT'] ?? "",
        'GT10POINT': input['GT10POINT'] ?? "",
        'GT11POINT': input['GT11POINT'] ?? "",
        'GT12POINT': input['GT12POINT'] ?? "",
        'GT13POINT': input['GT13POINT'] ?? "",
        'GT14POINT': input['GT14POINT'] ?? "",
        'GT15POINT': input['GT15POINT'] ?? "",
        'GT16POINT': input['GT16POINT'] ?? "",
        'GT17POINT': input['GT17POINT'] ?? "",
        'GT18POINT': input['GT18POINT'] ?? "",
        'GT19POINT': input['GT19POINT'] ?? "",
        'GT20POINT': input['GT20POINT'] ?? "",
      };
      let updatePATTERN = await mongodb.insertMany(`${headers['server']}`, PATTERN, GRAPH_TABLE_CONTROL, [neworder]);
      output = "OK"
    }
  }



  return res.json(output);
}));


router.post('/GRAPHcontrol_list', wrap(async (req, res) => {
  //-------------------------------------
  console.log("--GRAPHcontrol_list--");
  let input = req.body;
  let headers = req.headers;
  //-------------------------------------
  let output = []
  //-------------------------------------
  //${headers['server']}
  let find1 = await mongodb.find(`${headers['server']}`, PATTERN, GRAPH_TABLE_CONTROL, {});

  output = find1;


  // console.log(output);

  return res.json(output);
}));


module.exports = router;
