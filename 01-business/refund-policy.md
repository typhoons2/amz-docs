# Chinh sach hoan coc

> Cap nhat: 2026-05-27 | Source: reverse-engineered tu BookingServiceImpl.confirmRefund + performReceive

---

## 1. Quy trinh hoan coc

### Luong A: Hoan coc ngay (khong giu lai kiem tra)

```
performReceive(isHoldDeposit=false)
→ autoRefundAmount = depositAmount [hoac depositAmount - surchargeAmount]
→ Booking → COMPLETED (4)
→ KHONG tao Phieu Chi (phu thu noi bo da xu ly qua SURCHARGE_COLLECT)
→ NV tra coc truc tiep cho khach ngoai he thong
```

> Luong nay **khong tao DEPOSIT_REFUND**. Refund duoc ghi nhan qua truong `booking.refundAmount` nhung khong co phieu chi tren so sach.

### Luong B: Giu coc kiem tra phat (hold deposit)

```
performReceive(isHoldDeposit=true)
→ Booking → REFUND_PENDING (6)
→ set refundRequestedAt = now
→ Cho Admin/Manager confirmRefund
```

```
confirmRefund(refundAmount, paymentMethodId, refundNote)
→ Kiem tra quyen: bat ky NV dang nhap (staffId tu token)
→ Validate: refundAmount <= totalCashPool
→ Tao PC DEPOSIT_REFUND
→ Booking → COMPLETED (4)
→ booking.collectedDeposit = 0
```

---

## 2. Dieu kien de hoan coc (confirmRefund)

| Dieu kien | Gia tri |
|-----------|---------|
| Trang thai booking | Phai la **REFUND_PENDING (6)** — neu khac → throw exception |
| refundAmount | `>= 0` (co the hoan 0 neu giu toan bo lam phu phi) |
| refundNote | Bat buoc khong trong |
| paymentMethodId | Optional, NV chon TK ngan hang de chuyen |
| StaffId | **Luon lay tu SecurityContext (token)** — khong cho client override |

---

## 3. Cong thuc tinh so tien hoan

### 3.1. Tinh `autoRefundAmount` tai `performReceive`

| Truong hop | Cong thuc | Vi du so |
|-----------|-----------|---------|
| Khong tru phu thu vao coc | `refundAmount = depositAmount` | Coc 3tr, phu thu 500k thu rieng → hoan het 3tr |
| Tru phu thu vao coc | `refundAmount = depositAmount - surchargeAmount` | Coc 3tr, phu thu 500k → hoan 2.500.000 VND |

### 3.2. Tinh tai `confirmRefund` (Luong B)

```
totalCashPool = paidAmount + collectedDeposit + oldRefund
Validate: newRefundVal <= totalCashPool

Ap dung refund (theo thu tu):
  1. Tru vao collectedDeposit truoc
  2. Neu con du → tru tiep vao paidAmount
```

> `totalCashPool` tinh lai theo thuc te — dam bao khong hoan qua so tien dang giu.

**Vi du so day du (Luong B):**
- Khach thue 5 ngay, tong = 4.000.000 VND
- Da thu tien thue: paidAmount = 4.000.000 VND
- Da thu coc: collectedDeposit = 3.000.000 VND
- NV giu lai kiem tra → REFUND_PENDING
- Admin hoan 2.000.000 VND cho khach
- `totalCashPool = 4.000.000 + 3.000.000 + 0 = 7.000.000`
- Ap dung: collectedDeposit - 2.000.000 = 1.000.000 (con lai trong coc)
- Tao PC DEPOSIT_REFUND: 2.000.000 VND
- `booking.collectedDeposit = 0` (sau khi save)

---

## 4. Phuong thuc hoan

- NV chon `paymentMethodId` (TK ngan hang) khi confirmRefund
- Neu khong chon → field null, PC DEPOSIT_REFUND van duoc tao nhung khong co thong tin TK
- Hoan tien thuc te ra ngoai he thong → NV tu thuc hien chuyen khoan/tra tien mat

---

## 5. Edge cases

### 5.1. Hoan 0 VND (giu toan bo coc lam phu phi)

- `refundAmount = 0`
- **Khong tao** PC DEPOSIT_REFUND (code check `refundAmount > 0` moi tao phieu)
- `booking.refundAmount = 0`, status → COMPLETED (4)
- Tien coc giu lai → duoc ghi nhan noi bo qua SURCHARGE_COLLECT

### 5.2. Hoan 100% coc (khong co phu thu)

- `refundAmount = depositAmount` (vi du 3.000.000 VND)
- Tao PC DEPOSIT_REFUND: 3.000.000 VND
- `collectedDeposit = 0`

### 5.3. Hoan nhieu lan

- He thong **KHONG co co che chan hoan nhieu lan** trong code.
- confirmRefund chi check trang thai REFUND_PENDING → neu admin revert 4→3 (COMPLETED ve ONGOING) roi lai chay qua REFUND_PENDING → co the chay confirmRefund lan 2.
- Moi lan confirmRefund deu tao 1 PC DEPOSIT_REFUND moi.
- [CAN LEAD XAC NHAN] — nghiep vu co cho phep hoan nhieu lan khong?

### 5.4. Hoan qua so tien dang giu

- `refundAmount > totalCashPool` → throw BusinessException "So tien hoan vuot qua tong tien dang giu"

---

## 6. Thoi gian hoan

- `refundRequestedAt` duoc set tu dong = `now()` khi booking chuyen sang REFUND_PENDING.
- **Khong co logic enforce 7 ngay** trong code — khong co job tu dong / deadline.
- [CAN LEAD XAC NHAN] — co quy dinh nghiep vu hoan trong 7 ngay lam viec khong? Neu co can implement reminder hoac auto-escalate.

---

## 7. Quyen han

| Hanh dong | Quyen can |
|-----------|-----------|
| Dat `isHoldDeposit=true` (chuyen sang REFUND_PENDING) | NV bat ky |
| `confirmRefund` (xac nhan hoan) | NV bat ky dang nhap (staffId tu token) |
| Revert REFUND_PENDING (6) → ONGOING (3) | **ADMIN hoac MANAGER** |
| Revert COMPLETED (4) → ONGOING (3) | **Chi ADMIN** |

---

## 8. [CAN LEAD XAC NHAN]

- **Thoi gian hoan 7 ngay:** Co dung khong? Code hien tai chi luu `refundRequestedAt`, khong enforce deadline.
- **Hoan nhieu lan:** Nghiep vu co cho phep hay khong? Can block o tang service neu khong cho phep.
- **Truong hop giu 100% coc:** Khi nao NV duoc phep giu het coc? Co can ghi ro ly do bat buoc khong?
- **Khach co duoc khieu nai phu thu khong?** He thong hien khong co flow khieu nai — neu co can them trang thai moi.
- **Xac nhan hoan: bat ky NV hay phai MANAGER tro len?** Hien tai code cho phep bat ky NV dang nhap (lay staffId tu token). Lead co muon gioi han quyen khong?
