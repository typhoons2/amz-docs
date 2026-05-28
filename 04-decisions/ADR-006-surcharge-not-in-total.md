# ADR-006: Phi giao nhan / chuyen vung nhap qua surcharge — KHONG cong total_amount

> Cap nhat: 2026-05-28 | Status: **Accepted (tam thoi)** — se duoc thay the boi task "Phan loai surcharge" trong tuong lai

---

## Boi canh (Context)

Phat hien khi review booking **TX202605260349** (2026-05-28):

| Field | Gia tri |
|-------|---------|
| `total_amount` | 1.000.000 (chi tien thue) |
| `pickup_fee` / `return_fee` (field rieng) | 0 |
| `surcharge_amount` | 279.000 |
| BookingSurcharge | "Phi giao nhan xe" 279.000 — note "GIAO XE DUC TRONG" |

NV nhap phi giao nhan 279k duoi dang **BookingSurcharge (phu thu)**, KHONG dung field `pickup_fee`/`return_fee`.

## Van de (Problem)

He thong co **2 cho** nhap phi giao nhan:

| Cach | Field | Cong vao total_amount? |
|------|-------|------------------------|
| Cach 1 | `pickup_fee` / `return_fee` (field rieng) | CO (total = rental + pickup + return - discount + VAT) |
| Cach 2 | BookingSurcharge ly do "Phi giao nhan xe" → `surcharge_amount` | KHONG |

NV thuong dung Cach 2 → phi giao nhan "an" khoi `total_amount`.

**Sau xa hon:** Phu thu (surcharge) thuc te co **2 loai khac nhau** bi gop lam 1:

| Loai | Vi du | Thoi diem thu | Co nen cong total? |
|------|-------|---------------|---------------------|
| **A. Phi biet truoc khi dat** | Giao nhan xe, chuyen vung | Thu khi GIAO xe | NEN — khach phai tra ngay |
| **B. Phu thu phat sinh khi tra** | Tre gio, hu hong, vuot km | Thu khi NHAN xe | KHONG — phat sinh sau |

Code hien gop ca A + B vao `surcharge_amount` + KHONG cong `total_amount` → loai A bi an.

## He qua (Consequences)

- Cot "Tong tien" tren danh sach booking = `total_amount` → KHONG bao gom phi giao nhan loai A
- Vi du TX202605260349: cot "Tong tien" hien 1.000.000, nhung khach thuc te phai tra 1.279.000
- **Root cause** cua vu 6 booking NV thu thieu phieu (session 25/5): phi giao nhan/chuyen vung nhap qua surcharge → an khoi tong tien → NV thu thieu hoac khach khong biet
- NV phai TU NHO thu phan phi giao nhan thu cong → de sai sot

## Quyet dinh (Decision)

**Tam thoi (2026-05-28):** GIU NGUYEN code. KHONG fix thiet ke ngay. Thay vao do:
1. Ghi nhan van de nay vao `business-rules.md` (BR moi) + `money-flow.md` (canh bao)
2. Canh bao NV: phi giao nhan/chuyen vung nhap qua surcharge se KHONG vao "Tong tien" → phai nho thu them khi giao xe

**Ly do chon tam thoi thay vi fix ngay:**
- Fix thiet ke (phan loai surcharge) la task lon, dung nhieu cho: entity, mapper, FE form, bao cao
- Nen gom chung voi cum "fix flow tai chinh" (ONGOING-EDIT, pre-payment, thu phu thu luc DELIVERY)
- Tranh branch dai + risk regression khi he thong dang chay production

## Huong tuong lai (Future — se thay the ADR nay)

Task "Phan loai surcharge":
- Tach surcharge thanh 2 nhom: **thu-khi-giao** (cong total_amount) vs **thu-khi-nhan** (giu rieng)
- Nhom thu-khi-giao (giao nhan, chuyen vung) → cong vao `total_amount` → "Tong tien" hien dung
- Co the them field `surcharge_type` hoac flag tren SurchargeCatalog
- Khi co task nay → cap nhat ADR nay thanh "Superseded by ADR-00X"

## Lien quan

- `docs/01-business/money-flow.md` — dong tien surcharge
- `docs/01-business/surcharge-catalog.md` — danh muc phu thu
- `docs/01-business/business-rules.md` — BR ve total_amount
- Session 25/5: vu 6 booking NV thu thieu Phieu Thu phu thu
