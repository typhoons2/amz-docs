# So do trang thai Booking (State Machine)

> Cap nhat: 2026-05-25 | Reverse-engineered tu BookingServiceImpl.java + Booking.java

---

## 1. Bang trang thai

| Status | Int | Ten tieng Viet | Ten tieng Anh | Mo ta |
|--------|-----|----------------|---------------|-------|
| PENDING | 1 | Cho xac nhan | Pending | Moi tao, cho NV/Manager duyet |
| CONFIRMED | 2 | Da xac nhan | Confirmed | Da duyet, cho giao xe |
| ONGOING | 3 | Dang thue | Ongoing | Xe da giao cho khach |
| COMPLETED | 4 | Hoan thanh | Completed | Xe da nhan lai, da thanh toan xong |
| CANCELLED | 5 | Da huy | Cancelled | Da huy, co the la tu PENDING hoac CONFIRMED |
| REFUND_PENDING | 6 | Cho hoan coc | Refund Pending | Xe da nhan nhung con giu coc cho kiem tra phu thu |
| INCIDENT | 7 | Su co / Tai nan | Incident | Xe dang trong tinh trang su co / tai nan |
| SEIZED | 8 | Tich thu / Cam co | Seized | Xe dang bi tich thu hoac cam co |

---

## 2. Bang transition (day du, reverse-engineered tu code)

> **Chu y doc:** Cot "Method code" la method thuc thi chuyen trang thai.
> `updateBookingStatus` = endpoint chung. `performDelivery` / `performReceive` / `confirmRefund` / `cancelBooking` = endpoint rieng.

| Tu | Den | Role toi thieu | Dieu kien (Guard) | Action kem theo | Method code |
|----|-----|----------------|-------------------|-----------------|-------------|
| 1 (PENDING) | 2 (CONFIRMED) | Staff | Khong | Auto-approve KYC khach; Log STATUS_CHANGE | `updateBookingStatus` |
| 1 (PENDING) | 3 (ONGOING) | Staff | **Bat buoc qua dialog Giao xe** — khong the skip | Ghi staffId, thu coc, thu tien thue, tao PT DEPOSIT_COLLECT + PT RENTAL_PAYMENT, log DELIVERY | `performDelivery` |
| 1 (PENDING) | 5 (CANCELLED) | Staff | Bat buoc co cancelReasonId; note tuy chon | Ghi phi huy, hoan tien (neu co), log CANCEL | `cancelBooking` |
| 2 (CONFIRMED) | 3 (ONGOING) | Staff | **Bat buoc qua dialog Giao xe** — khong the skip | Ghi staffId, thu coc, thu tien thue, tao PT DEPOSIT_COLLECT + PT RENTAL_PAYMENT, log DELIVERY | `performDelivery` |
| 2 (CONFIRMED) | 5 (CANCELLED) | Staff | Bat buoc co cancelReasonId | Ghi phi huy, hoan tien (neu co), log CANCEL | `cancelBooking` hoac `updateBookingStatus` |
| 3 (ONGOING) | 4 (COMPLETED) | Staff | **Bat buoc qua dialog Nhan xe** — `isHoldDeposit=false`; paidAmount >= totalAmount | Ghi endKm, ghi hinh nhan xe, tao PT SURCHARGE_COLLECT (neu co phu thu), xac nhan hoan coc ngay, sync vi tri xe, log RECEIVE | `performReceive` |
| 3 (ONGOING) | 6 (REFUND_PENDING) | Staff | **Bat buoc qua dialog Nhan xe** — `isHoldDeposit=true`; co phu thu can kiem tra | Ghi endKm, ghi hinh nhan xe, tao PT SURCHARGE_COLLECT, set refundRequestedAt (lan dau), log RECEIVE | `performReceive` |
| 3 (ONGOING) | 7 (INCIDENT) | Staff | Khong | Log STATUS_CHANGE | `updateBookingStatus` |
| 3 (ONGOING) | 8 (SEIZED) | Staff | Khong | Log STATUS_CHANGE | `updateBookingStatus` |
| 6 (REFUND_PENDING) | 4 (COMPLETED) | Manager / Admin | Bat buoc co refundNote (khong duoc de trong); refundAmount >= 0 | Tao PC DEPOSIT_REFUND, clear collectedDeposit ve 0, log REFUND | `confirmRefund` |
| 6 (REFUND_PENDING) | 3 (ONGOING) | Manager / Admin | **Bat buoc co note ly do** (khong duoc de trong) | Clear refundRequestedAt + refundAmount + refundNote; tao SURCHARGE_REVERSE (neu co); log REVERT_STATUS | `updateBookingStatus` |
| 6 (REFUND_PENDING) | 5 (CANCELLED) | Staff | Khong | Log STATUS_CHANGE | `updateBookingStatus` |
| 7 (INCIDENT) | 3 (ONGOING) | Staff | Khong | Log STATUS_CHANGE | `updateBookingStatus` |
| 7 (INCIDENT) | 4 (COMPLETED) | Staff | Khong | Log STATUS_CHANGE | `updateBookingStatus` |
| 7 (INCIDENT) | 6 (REFUND_PENDING) | Staff | Khong | set refundRequestedAt (idempotent) | `updateBookingStatus` |
| 7 (INCIDENT) | 8 (SEIZED) | Staff | Khong | Log STATUS_CHANGE | `updateBookingStatus` |
| 8 (SEIZED) | 3 (ONGOING) | Staff | Khong | Log STATUS_CHANGE | `updateBookingStatus` |
| 8 (SEIZED) | 4 (COMPLETED) | Staff | Khong | Log STATUS_CHANGE | `updateBookingStatus` |
| 8 (SEIZED) | 6 (REFUND_PENDING) | Staff | Khong | set refundRequestedAt (idempotent) | `updateBookingStatus` |
| 8 (SEIZED) | 7 (INCIDENT) | Staff | Khong | Log STATUS_CHANGE | `updateBookingStatus` |
| 4 (COMPLETED) | 3 (ONGOING) | **Admin only** | Bat buoc co note ly do; KHONG phai luong thuong | Tao PT DEPOSIT_REFUND_REVERSE (neu co refund cu); cong lai collectedDeposit; log ADMIN_HARD_REVERT | `updateBookingStatus` |
| 5 (CANCELLED) | 1 (PENDING) | **Admin only** | Bat buoc co note ly do; admin chon targetStatus | Clear cancelReasonId + cancellationFee + refundAmount; paidAmount/collectedDeposit GIU NGUYEN; log ADMIN_HARD_REVERT | `updateBookingStatus` |
| 5 (CANCELLED) | 2 (CONFIRMED) | **Admin only** | Bat buoc co note ly do; admin chon targetStatus | Clear cancelReasonId + cancellationFee + refundAmount; paidAmount/collectedDeposit GIU NGUYEN; log ADMIN_HARD_REVERT | `updateBookingStatus` |
| 5 (CANCELLED) | 3 (ONGOING) | **Admin only** | Bat buoc co note ly do; admin chon targetStatus | Clear cancelReasonId + cancellationFee + refundAmount; paidAmount/collectedDeposit GIU NGUYEN; log ADMIN_HARD_REVERT | `updateBookingStatus` |

### Cac transition BI KHOA (khong duoc skip)

| Tu | Den | Ly do bi khoa |
|----|-----|---------------|
| 2 (CONFIRMED) | 3 (ONGOING) | Phai qua dialog Giao xe (performDelivery) de dam bao co anh/video/coc/staffId |
| 3 (ONGOING) | 4 (COMPLETED) | Phai qua dialog Nhan xe (performReceive) de dam bao co anh/video/ODO/quyet toan |
| 3 (ONGOING) | 6 (REFUND_PENDING) | Phai qua dialog Nhan xe (performReceive) — phan isHoldDeposit=true |

---

## 3. So do ASCII — State Machine

```
                        [cancelBooking]
              +-------- PENDING (1) --------+
              |              |              |
              v         [performDelivery]   v
         CANCELLED (5)       |        CANCELLED (5)
              ^              v
              |         ONGOING (3) <-------+-------+-------+
              |         /         \         |       |       |
              |  [performReceive]  [performReceive]  |       |
              |  isHoldDeposit=F  isHoldDeposit=T  |       |
              |         |               |           |       |
              |         v               v      INCIDENT(7) SEIZED(8)
              |   COMPLETED (4)  REFUND_PENDING(6)  ^   ^   ^   ^
              |         |               |           |   |   |   |
              |  [ADMIN hard revert]  [confirmRefund]   |   |   |
              |         +----> ONGOING(3)  |             |   |   |
              |                      v     v             |   |   |
              |               COMPLETED(4) CANCELLED(5)  |   |   |
              |                                          |   |   |
              +-- [ADMIN hard revert: 5->1,2,3] --------+   |   |
                                                             |   |
              ONGOING(3) --[su co]--> INCIDENT(7) ----------+   |
              ONGOING(3) --[tich thu]--> SEIZED(8) -------------+
              CONFIRMED(2) --[performDelivery]--> ONGOING(3)
              PENDING(1) --[confirm]--> CONFIRMED(2)
```

**Ghi chu them:**
- COMPLETED (4) va CANCELLED (5) khong con la "terminal cung" — Admin co the hard revert
- Soft revert (NV, Manager): chi tu 6/7/8 ve 3 — khong co transaction nguoc
- Hard revert (Admin only): tu 4 hoac 5 — co the co transaction nguoc, phai audit
- `refundRequestedAt`: chi set lan dau khi chuyen vao trang thai 6, khong ghi de khi revert roi chuyen lai

---

> **[CAN LEAD XAC NHAN]** Quy trinh huy tu ONGOING (3) co duoc phep khong? Code hien tai chi cho phep huy tu PENDING/CONFIRMED qua `cancelBooking`. Chuyen 3->5 qua `updateBookingStatus` duong nhu khong duoc phep (khong co trong `validateStatusTransition`).
