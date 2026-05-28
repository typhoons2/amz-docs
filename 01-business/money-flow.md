# Dong tien (Money Flow)

> Cap nhat: 2026-05-27 | Source: reverse-engineered tu BookingServiceImpl.java + TransactionServiceImpl.java

---

## 1. Vong doi trang thai booking

```
PENDING (1) → CONFIRMED (2) → ONGOING (3) → COMPLETED (4)
                                           ↘ REFUND_PENDING (6) → COMPLETED (4)
PENDING/CONFIRMED → CANCELLED (5)
ONGOING → INCIDENT (7) / SEIZED (8)
```

---

## 2. Bang dong tien theo tung action

| Action | Trigger | Phieu tao | Category code | Loai phieu | paymentMethodId | Note pattern | Method |
|--------|---------|-----------|---------------|-----------|-----------------|-------------|--------|
| Giao xe - thu coc | NV bam "Giao xe" (depositAmount > 0) | PT DEPOSIT_COLLECT | `DEPOSIT_COLLECT` | Phieu Thu (type=1) | NV chon TK ngan hang | `"Thu tien coc hop dong: TX..."` | `performDelivery` |
| Giao xe - thu tien thue | NV bam "Giao xe" (collectedPayAmount > 0) | PT RENTAL_PAYMENT | `RENTAL_PAYMENT` | Phieu Thu (type=1) | NV chon TK ngan hang | `"Thu tien thue xe hop dong: TX..."` | `performDelivery` |
| Nhan xe - thu phu thu | NV bam "Nhan xe" (surchargeAmount > 0) | PT SURCHARGE_COLLECT | `SURCHARGE_COLLECT` | Phieu Thu (type=1) | **null** (but toan noi bo) | `"Thu phu thu hop dong: TX..."` | `performReceive` |
| Nhan xe - thu them tien | NV bam "Nhan xe" (collectedAmount > 0) | PT REVENUE | `REVENUE` | Phieu Thu (type=1) | NV chon TK ngan hang | `"Thu tien tai thoi diem nhan xe"` | `performReceive` |
| Hoan coc | Admin/Manager bam "Xac nhan hoan coc" (refundAmount > 0) | PC DEPOSIT_REFUND | `DEPOSIT_REFUND` | Phieu Chi (type=2) | NV chon TK ngan hang | `"Hoan coc hop dong: TX..."` | `confirmRefund` |
| Revert 4→3 - reverse refund | Admin hard revert Hoan thanh → Dang thue (co DEPOSIT_REFUND cu) | PT DEPOSIT_REFUND_REVERSE | `DEPOSIT_REFUND_REVERSE` | Phieu Thu (type=1) | null (tu dong tao) | `"Hoan tac hoan coc (revert 4->3): TX..."` | `updateBookingStatus` |
| Revert 4→3 hoac 6→3 - reverse phu thu | Admin/Manager revert (co SURCHARGE_COLLECT cu) | PC SURCHARGE_REVERSE | `SURCHARGE_REVERSE` | Phieu Chi (type=2) | null (tu dong tao) | `"Reverse phu thu khi revert booking: TX..."` | `updateBookingStatus` |

> **Luu y code phieu:**
> - Phieu Thu (PT): prefix `PT` + `yyyyMMdd` + 4 so ngau nhien (vd: PT202505271234)
> - Phieu Chi (PC): prefix `PC` + `yyyyMMdd` + 4 so ngau nhien (vd: PC202505271234)

---

## 3. Dong tien chi tiet tung buoc

### 3.1. Giao xe — `performDelivery`

Dieu kien: booking o trang thai PENDING (1) hoac CONFIRMED (2).

**Buoc tao phieu tu dong:**

1. **Neu depositAmount > 0:**
   - Tao PT DEPOSIT_COLLECT
   - `booking.collectedDeposit = depositAmount` (ghi de, khong cong don)
   - `booking.depositMethodId = paymentMethodId`

2. **Neu collectedPayAmount > 0:**
   - Tao PT RENTAL_PAYMENT
   - `booking.paidAmount += collectedPayAmount` (cong don)
   - `booking.paymentMethodId = paymentMethodId`

3. **Chuyen trang thai:** PENDING/CONFIRMED → **ONGOING (3)**

> **Vi du so:**
> Khach thue xe, coc 3.000.000 VND, thu truoc tien thue 2.000.000 VND, qua VietcomBank.
> - PT DEPOSIT_COLLECT: 3.000.000 VND — TK VCB
> - PT RENTAL_PAYMENT: 2.000.000 VND — TK VCB
> - `collectedDeposit = 3.000.000`, `paidAmount = 2.000.000`

---

### 3.2. Nhan xe — `performReceive`

Dieu kien: booking o trang thai ONGOING (3).

**Tinh refundAmount tu dong (BE tu tinh, FE khong duoc gui):**

- **Neu `surchargeDeductFromDeposit = false` (mac dinh):**
  `autoRefundAmount = depositAmount` (hoan toan bo coc)

- **Neu `surchargeDeductFromDeposit = true` (tru phu thu vao coc):**
  `autoRefundAmount = depositAmount - surchargeAmount`
  Dieu kien: `surchargeAmount <= depositAmount` (neu lon hon → throw exception)

**Buoc tao phieu tu dong:**

1. **Neu surchargeAmount > 0:**
   - Tao PT SURCHARGE_COLLECT, `paymentMethodId = null` (but toan noi bo — tien phu thu da nam trong coc khach dat truoc)

2. **Neu collectedAmount > 0 (thu them tai nhan xe):**
   - Tao PT REVENUE, paymentMethodId = NV chon

3. **Chuyen trang thai:**
   - `isHoldDeposit = false` → **COMPLETED (4)**
   - `isHoldDeposit = true` → **REFUND_PENDING (6)**, set `refundRequestedAt = now`

> **Vi du so:**
> Xe tra ve co phu thu qua gio 500.000 VND, tru vao coc 3.000.000 VND.
> - PT SURCHARGE_COLLECT: 500.000 VND — paymentMethodId null
> - `autoRefundAmount = 3.000.000 - 500.000 = 2.500.000 VND`
> - `surchargeDeductedFromDeposit = true`

---

### 3.3. Xac nhan hoan coc — `confirmRefund`

Dieu kien: booking o trang thai REFUND_PENDING (6).
Quyen: bat ky NV dang nhap (staffId lay tu token, khong cho override).

**Logic tai chinh:**

```
totalCashPool = paidAmount + collectedDeposit + oldRefund
Validate: newRefund <= totalCashPool
```

Ap dung refund: tru vao `collectedDeposit` truoc, neu con du moi tru `paidAmount`.

**Sau khi save:**
- `collectedDeposit = 0` (xoa het liability coc)
- Tao PC DEPOSIT_REFUND (neu refundAmount > 0)
- Chuyen trang thai → **COMPLETED (4)**

> **Vi du so:**
> `collectedDeposit = 2.500.000`, `paidAmount = 2.000.000`, oldRefund = 0.
> Admin hoan 2.500.000 VND cho khach.
> - PC DEPOSIT_REFUND: 2.500.000 VND — TK chuyen khoan.
> - `collectedDeposit = 0`, `paidAmount = 2.000.000`

---

### 3.4. Huy don — `cancelBooking`

Dieu kien: booking o trang thai PENDING (1) hoac CONFIRMED (2).

**Khong tao phieu thu/chi tu dong.**

Logic tai chinh:
```
totalHolding = paidAmount + collectedDeposit
newPaidAmount = totalHolding - refundAmount
booking.paidAmount = newPaidAmount
booking.collectedDeposit = 0  (xoa liability)
```

> Cancellation fee duoc luu vao `booking.cancellationFee` nhung KHONG tao phieu rieng — admin tu ra soat qua tab Tai chinh neu can.

---

## 4. Dong tien khi REVERT

### 4.1. Hard revert: 4 (Hoan thanh) → 3 (Dang thue) — Chi ADMIN

Thuc hien boi: `updateBookingStatus` → `createHardRevertReverseTransaction`

| Buoc | Hanh dong |
|------|-----------|
| 1 | Doc `oldRefund = booking.refundAmount` truoc khi clear |
| 2 | `booking.collectedDeposit += oldRefund` (cong lai coc) |
| 3 | `booking.refundAmount = null`, `booking.refundNote = null` |
| 4 | Luu booking |
| 5 | Neu co DEPOSIT_REFUND cu → tao PT **DEPOSIT_REFUND_REVERSE** (type=1, amount=oldRefund) |
| 6 | Neu co SURCHARGE_COLLECT cu → tao PC **SURCHARGE_REVERSE** (type=2, amount=surchargeAmount) |

> **Ly do:** can bang ledger voi phieu chi DEPOSIT_REFUND da tao trong confirmRefund.

---

### 4.2. Soft revert: 6 (REFUND_PENDING) → 3 (Dang thue) — ADMIN hoac MANAGER

| Buoc | Hanh dong |
|------|-----------|
| 1 | Clear `refundRequestedAt`, `refundAmount`, `refundNote` |
| 2 | Luu booking |
| 3 | Neu co SURCHARGE_COLLECT cu → tao PC **SURCHARGE_REVERSE** (type=2, amount=surchargeAmount) |
| 4 | Khong tao DEPOSIT_REFUND_REVERSE (vi chua confirmRefund, chua co DEPOSIT_REFUND) |

---

### 4.3. Hard revert: 5 (Cancelled) → {1/2/3} — Chi ADMIN

- Clear `cancelReasonId`, `cancellationFee`, `refundAmount`
- `paidAmount` va `collectedDeposit` GIU NGUYEN — admin tu dieu chinh qua tab Tai chinh
- Khong tao phieu thu/chi tu dong

---

## 5. Flag `surchargeDeductedFromDeposit` — anh huong "Con lai"

**Cong thuc `remainingAmount` (hien thi giao dien):**

```
remainingAmount = totalAmount + surchargeAmount - paidAmount

Neu surchargeDeductedFromDeposit = true:
  remainingAmount = remainingAmount - surchargeAmount
  (= totalAmount - paidAmount)
```

| Truong hop | Vi du so | Con lai hien thi |
|-----------|---------|------------------|
| flag = false (phu thu thu rieng bang tien mat) | totalAmount=5tr, surcharge=500k, paid=5tr | 500.000 VND (con phai thu phu thu) |
| flag = true (phu thu da tru vao coc) | totalAmount=5tr, surcharge=500k, paid=5tr | 0 VND (da thanh toan het) |

> **Giai thich:** Khi flag=true, phu thu da duoc "thanh toan" bang cach giu lai tu coc — khach khong can tra them. Do do offset lai surcharge de khong dem trung.

> **[CANH BAO] `total_amount` KHONG bao gom surcharge.** Cot "Tong tien" tren danh sach booking = `total_amount` = chi tien thue (rental + pickup_fee + return_fee - discount + VAT). Phi giao nhan / chuyen vung neu nhap qua **surcharge** (BookingSurcharge) se KHONG vao "Tong tien" → bi "an". Tong tien khach phai tra THUC TE = `total_amount + surcharge_amount`. Xem [ADR-004](../04-decisions/ADR-004-surcharge-not-in-total.md) ve van de phan loai surcharge va huong fix tuong lai.

---

## 6. Tong hop category codes

| Code | Ten | Type | Is System | Tao boi |
|------|-----|------|-----------|---------|
| `DEPOSIT_COLLECT` | Thu tien coc | Thu (1) | true | `performDelivery` |
| `RENTAL_PAYMENT` | Thu tien thue xe | Thu (1) | true | `performDelivery` |
| `SURCHARGE_COLLECT` | Thu phu phi | Thu (1) | true | `performReceive` |
| `REVENUE` | Thu tien tai thoi diem nhan xe | Thu (1) | true | `performReceive` |
| `DEPOSIT_REFUND` | Hoan tra tien coc | Chi (2) | true | `confirmRefund` |
| `DEPOSIT_REFUND_REVERSE` | Hoan tac hoan tra coc (revert 4→3) | Thu (1) | true | `updateBookingStatus` |
| `SURCHARGE_REVERSE` | Hoan lai phu thu (Revert) | Chi (2) | true | `updateBookingStatus` |
| `OTHER_IN` | Thu khac | Thu (1) | false | NV tao thu cong |
| `RENTAL_COLLECT` | Thu tien thue xe (cu) | Thu (1) | true | (legacy) |
| `MAINTENANCE_COST` | Chi sua chua/Bao duong | Chi (2) | false | NV tao thu cong |
| `OPERATION_COST` | Chi phi van hanh | Chi (2) | false | NV tao thu cong |
| `OTHER_OUT` | Chi khac | Chi (2) | false | NV tao thu cong |
