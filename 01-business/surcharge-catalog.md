# Danh muc phu thu

> Cap nhat: 2026-05-27 | Source: SELECT * FROM surcharge_catalogs ORDER BY id (query truc tiep DB prod)

---

## 1. Bang danh muc (19 muc hien hanh)

| ID | Code | Ten phu thu | Don vi | So tien mac dinh | Trang thai |
|----|------|------------|--------|------------------|-----------|
| 1 | `ROAD_TOLL` | Phi duong bo | Lan | 0 VND | Active |
| 2 | `OVER_TIME` | Phi qua gio | Gio | 0 VND | Active |
| 3 | `DELIVERY_FEE` | Phi giao nhan xe | Luot | 0 VND | Active |
| 4 | `OVER_KM` | Phi vuot KM | KM | 0 VND | Active |
| 5 | `REPAIR` | Phi sua chua | Lan | 0 VND | Active |
| 6 | `FUEL_SURCHARGE` | Phu thu xang | Lit | 0 VND | Active |
| 7 | `CLEANING` | Phi ve sinh | Lan | 0 VND | Active |
| 8 | `TRAFFIC_FINE` | Phi phat giao thong | Lan | 0 VND | Active |
| 9 | `DEODORIZE` | Phi khu mui | Lan | 0 VND | Active |
| 10 | `INVOICE` | Phi xuat hoa don | Lan | 0 VND | Active |
| 11 | `OVERNIGHT` | Phi chay qua dem | Dem | 0 VND | Active |
| 12 | `HOLIDAY` | Phi chay ngay le | Ngay | 0 VND | Active |
| 13 | `OTHER` | Phi khac | Lan | 0 VND | Active |
| 40 | `CROSS_REGION_FEE` | Phi chuyen vung | Lan | 0 VND | Active |
| 41 | `AIRPORT_PICKUP_FEE` | Phi giao san bay | Luot | **200.000 VND** | Active |
| 42 | `AIRPORT_RETURN_FEE` | Phi nhan san bay | Luot | **200.000 VND** | Active |
| 43 | `ETC_FEE` | Phu thu ETC | Lan | null (khong co mac dinh) | Active |
| 44 | `CHARGING_FEE` | Phu thu sac pin | Lan | null (khong co mac dinh) | Active |

---

## 2. Cach NV ap dung phu thu

### 2.1. Qua dialog Nhan xe (`performReceive`)

NV chon tung muc phu thu tu catalog, nhap so tien. He thong luu vao bang `booking_surcharges`:

| Column | Mo ta |
|--------|-------|
| `booking_id` | ID don hang |
| `reason_id` | ID tu `surcharge_catalogs` (co the null neu nhap tu do) |
| `reason_name` | Snapshot ten phu thu tai thoi diem nhan xe |
| `quantity` | So luong (mac dinh = 1) |
| `unit_price` | Don gia NV nhap |
| `amount` | Tong tien = quantity x unit_price |
| `note` | Ghi chu them |
| `created_by` | Ten day du NV tao |
| `deleted` | Soft delete flag |

**Luu tru: APPEND** — giu lai lich su, khong de trung.

### 2.2. Qua API them phu thu rieng (`addSurcharge`)

NV co the them phu thu bat ky luc trong qua trinh thue (status ONGOING). Cac muc nay also luu vao `booking_surcharges`.

### 2.3. NV co the nhap so tien tu do

- `default_value` chi la goi y — NV **duoc phep nhap so tien khac** khi ap dung.
- Hien tai tat ca 14/19 muc co `default_value = 0` (phai nhap thu cong).
- Chi AIRPORT_PICKUP_FEE (200.000) va AIRPORT_RETURN_FEE (200.000) co mac dinh co y nghia.
- ETC_FEE va CHARGING_FEE `default_value = null` → bat buoc nhap so tien.

---

## 3. Tong phu thu tren Booking

```
booking.surcharge_amount = SUM(booking_surcharges.amount WHERE deleted=false)
```

`surcharge_amount` duoc cap nhat moi lan NV bam "Nhan xe" (performReceive) hoac them/xoa phu thu qua API.

---

## 4. Phu thu tru vao coc vs thu rieng

| Che do | Flag | Mo ta |
|--------|------|-------|
| Thu tien mat rieng | `surchargeDeductedFromDeposit = false` | NV thu tien phu thu truc tiep tu khach, hoan toan bo coc |
| Tru vao coc | `surchargeDeductedFromDeposit = true` | Phu thu khau tru tu coc, hoan phan con lai |

Khi tru vao coc: `autoRefundAmount = depositAmount - surchargeAmount`
Dieu kien bat buoc: `surchargeAmount <= depositAmount`, neu khong → throw exception.

---

## 5. Phieu thu phu thu (SURCHARGE_COLLECT)

Khi NV bam "Nhan xe" va `surchargeAmount > 0`, he thong tu dong tao:
- **Loai:** Phieu Thu (type=1)
- **Category:** `SURCHARGE_COLLECT`
- **paymentMethodId = null** — but toan noi bo (tien da nam trong coc)
- **Khong bao try/catch:** neu fail → rollback @Transactional ca giao dich

---

## 6. [CAN LEAD XAC NHAN]

- **Phi giao nhan xe (DELIVERY_FEE, id=3)** co phai la `pickupFee`/`returnFee` trong booking khong, hay la phu thu rieng khi nhan xe?
- **Phi chay qua dem (OVERNIGHT) va ngay le (HOLIDAY):** NV can ap dung thu cong hay he thong tu dong phat hien?
- **So luong (quantity) > 1 co su dung khong?** Entity co field `quantity` nhung performReceive set cung = 1.
