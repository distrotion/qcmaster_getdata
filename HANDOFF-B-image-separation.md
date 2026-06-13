# HANDOFF — งาน B: แยกรูปภาพออกจาก MAIN_DATA.MAIN (ทำช่วงสิ้นปี)

> สถานะ: **ยังไม่ทำ** — งาน A (ลด payload ฝั่งอ่าน) ทำเป็น interim ไปแล้ว (ดูท้ายเอกสาร)
> ผู้เขียน handoff: ช่วงปรับปรุง performance รายงาน `/TOBEREPOR/GETDATA`

---

## 1. ปัญหา (ต้นตอจริง)

document ใน `MAIN_DATA.MAIN` ทุกตัวมีขนาด ~0.5MB โดย **94% เป็นรูป base64 ฝังใน field `FINAL`**
- `FINAL[instrument][item].PSC1[].PIC1..PIC4` = รูปถ่ายดิบจากการตรวจ (base64)
- ค่าตัวเลขจริงที่รายงานใช้ (`PO1..PO10`) เล็กมาก (~2KB/doc)

ผลคือทุก query ที่ดึง `MAIN_DATA.MAIN` ต้องขนรูปทั้งหมดมาด้วย แม้รายงานส่วนใหญ่ (Number/Graph) ไม่ใช้รูปเลย

วัดจริง (BP12-GAS, CP 24012719): 1 CP = 122 docs ~61MB

## 2. เป้าหมายงาน B

ย้ายรูป base64 ออกจาก document หลัก ไปเก็บ collection แยก (หรือ GridFS) แล้วอ้างอิงด้วย id
→ document หลักเล็กลง ~15-20 เท่า, query เร็วขึ้นถาวร, รูปโหลดเฉพาะตอนที่ต้องใช้จริง

โครงสร้างที่เสนอ:
```
MAIN_DATA.MAIN        : เก็บค่าตัวเลข/metadata (ไม่มี base64) + ref id ของรูป
MAIN_DATA.MAIN_IMAGES : { _id, PO, instrument, item, slot:'PIC1'/'PSC1...', data:<base64> }
```
หรือใช้ GridFS ถ้าไฟล์ใหญ่

## 3. จุดที่ต้องแก้ (เป็น schema change — กระทบทั้ง writer + reader)

### Writer (per-site backend ที่ insert/update MAIN_DATA.MAIN)
repo เหล่านี้ (branch main, github.com/distrotion/*):
- `BACK-QC-GAS-BP12`, `BACK-QC-GAS-GW`, `BACK-QC-GAS-HES`, `BACK-QC-ISN-HES`,
  `BACK-QC-PAL-HES-UI`, `BACK-QC-PH-BP12-USER`, `BACK-QC-PH-HES-INF`,
  `UI-QC-PVD-BP12-BACK-`, `UI-QC-KNG-BP12-BACK`
- จุด insert/update รูป: ไฟล์ `flow/001/*.js` (เช่น INSFINISH.js, 1-APPGAS12.js ฯลฯ)
  ตอนเขียน FINAL ให้แยก base64 ไปเก็บ collection รูป แล้วเก็บแค่ ref ใน FINAL

### Reader (รายงาน)
- `qcmaster_getdata` / `flow/001/TOBEREPORT.js`
  - ปัจจุบันใช้ `mongodb.findReport()` ที่ strip `PIC\d+` ออก (งาน A)
  - หลังย้ายรูปแล้ว: เปลี่ยน loop OCR ให้ไปดึงรูปจาก collection รูปด้วย ref (lazy load)

### Migration
- เขียนสคริปต์ย้ายข้อมูลเดิม: อ่าน MAIN ทุก collection ทุก server → แตก base64 ออกไป collection รูป → update document ให้เหลือ ref
- ทำ off-peak, ทีละ server, มี rollback plan
- server ทั้งหมดอยู่ใน `SERVER_URLS` (ดู `qcmaster_getdata/function/mongodb.js`)

## 4. ความเสี่ยง / ข้อควรระวัง
- เป็นการ **แก้ข้อมูลใน DB จริง** (migration) — ต้อง backup ก่อน, ทำทีละ server
- ต้อง deploy writer + reader พร้อมกัน (หรือทำ backward-compatible: reader อ่านได้ทั้งแบบเก่า/ใหม่)
- ตรวจว่าทุกหน้าที่อ่าน MAIN_DATA.MAIN (ไม่ใช่แค่ TOBEREPORT) รองรับโครงสร้างใหม่

## 5. วิธีทดสอบ (เหมือนที่ใช้ตอนทำ A)
- เทียบ output ของรายงานก่อน/หลัง ต้องเหมือนเดิม (PO3 + รูป OCR ครบ)
- วัด payload + เวลา query ต่อ CP

---

## ภาคผนวก — งาน A ที่ทำไปแล้ว (interim, read-only ไม่แตะ DB)

1. **Index** (`{MATCP,ALL_DONE,dateG}` + `{PO}`) — สร้างครบทุก collection ทุก server แล้ว
   - writer ทุกตัวมี idempotent `createIndex` ใน `function/mongodb.js` (MAIN ใหม่ได้ index อัตโนมัติ)
2. **findReport()** ใน `qcmaster_getdata/function/mongodb.js` — aggregation `$function` strip `PIC\d+` (รูปดิบที่รายงานไม่ใช้) ออกฝั่ง server
   - TOBEREPORT ใช้ `findReport` แทน `find` แล้ว
   - ผลวัด BP12-GAS CP 24012719: payload 61.6MB → 3.9MB, เวลา ~126s → 1.75s, output เท่าเดิม (PO3 + PICxdata ครบ)
3. socketTimeoutMS ใน reader 5000 → 120000 (กัน query ใหญ่ถูกตัดก่อนเสร็จ)

> งาน A ลด payload ได้เพราะตัด `PIC\d+` (รูปดิบไม่ได้ใช้) แต่ **รูป OCR (`PIC\d+data`) ยังขนอยู่** — งาน B จะแก้ส่วนนั้นถาวรด้วยการแยก storage
