const express = require("express");
const router = express.Router();
var mongodb = require('../../function/mongodb');
var mssql = require('../../function/mssql');

let masterDB = "master_FN";
let PATTERN = "PATTERN";
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

let MAIN_DATA = 'MAIN_DATA';
let MAIN = 'MAIN';



router.get('/FINALMASTER', async (req, res) => {
  return res.json("READY");
});

router.post('/Inspected-sign', async (req, res) => {
  //-------------------------------------
  console.log('--Inspected-sign--');
  // console.log(req.body);
  let input = req.body;
  let headers = req.headers;
  //-------------------------------------
  let output = 'NOK'

  if (input['ID'] != undefined && input['PO'] != undefined) {
    let sign = {
      'dateInspected': `${Date.now()}`,
      'IDInspected': input['ID'],
    }
    let upd = await mongodb.update(headers['server'], MAIN_DATA, MAIN, { "PO": input['PO'] }, { $set: sign });
    output = 'OK'
  }

  //-------------------------------------
  res.json(output);
});


router.post('/Check-sign', async (req, res) => {
  //-------------------------------------
  console.log('--Check-sign--');
  // console.log(req.body);
  let input = req.body;
  let headers = req.headers;
  //-------------------------------------
  let output = 'NOK'

  if (input['ID'] != undefined && input['PO'] != undefined) {
    let sign = {
      'dateCheck': `${Date.now()}`,
      'IDCheck': input['ID'],
    }
    let upd = await mongodb.update(headers['server'], MAIN_DATA, MAIN, { "PO": input['PO'] }, { $set: sign });
    output = 'OK'
  }

  //-------------------------------------
  res.json(output);
});

router.post('/Approve-sign', async (req, res) => {
  //-------------------------------------
  console.log('--Check-sign--');
  // console.log(req.body);
  let input = req.body;
  let headers = req.headers;
  //-------------------------------------
  let output = 'NOK'

  if (input['ID'] != undefined && input['PO'] != undefined) {
    let sign = {
      'dateApprove': `${Date.now()}`,
      'IDApprove': input['ID'],
    }
    let upd = await mongodb.update(headers['server'], MAIN_DATA, MAIN, { "PO": input['PO'] }, { $set: sign });
    output = 'OK'
  }

  //-------------------------------------
  res.json(output);
});



module.exports = router;
