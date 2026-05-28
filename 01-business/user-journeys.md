# Hanh trinh nguoi dung — Booking (User Journeys)

> Cap nhat: 2026-05-25 | Source: reverse-engineered tu BookingServiceImpl.java + CLAUDE.md
> Day la SKELETON — Lead can bo sung cac buoc nghiep vu thuc te con thieu.

---

## Flow 1: Khach dat xe moi — Happy Path

| Buoc | Actor | Hanh dong | Trang thai booking | Phieu tao |
|------|-------|-----------|--------------------|-----------|
| 1 | NV / Khach | Tao booking (nhap thong tin khach, xe, thoi gian) | PENDING (1) | — |
| 2 | NV / Manager | Xac nhan booking | CONFIRMED (2) | — |
| 3 | NV | Mo dialog **Giao xe**: ghi km bat dau, anh/video tinh trang xe, thu coc + tien thue | ONGOING (3) | PT DEPOSIT_COLLECT (neu co coc); PT RENTAL_PAYMENT (neu thu tien thue) |
| 4 | NV | Mo dialog **Nhan xe**: ghi km ket thuc, anh/video nhan xe, ghi phu thu (neu co), chon "Khong giu coc" | COMPLETED (4) | PT SURCHARGE_COLLECT (neu co phu thu); *(hoan coc xu ly noi bo trong `paidAmount`)* |
| 5 | He thong | Xe tu dong cap nhat vi tri ve ben tra | COMPLETED (4) | — |

**Ghi chu ke toan:**
- Neu KHONG co phu thu: coc duoc hoan thang noi bo (khau tru khoi `collectedDeposit`), khong can man hinh rieng.
- Neu CO phu thu va chon "tru phu thu vao coc": he thong tu tinh `refundAmount = depositAmount - surchargeAmount`.

> **Lead bo sung:** Khach dat qua kenh nao? (App khach hang / Hotline / Facebook / Truc tiep?)
> **Lead bo sung:** Thanh toan qua hinh thuc nao? (Chuyen khoan / Tien mat / VNPay / the?)
> **Lead bo sung:** NV hay Manager duyet o buoc 2?

---

## Flow 2: Huy booking

| Buoc | Actor | Hanh dong | Trang thai booking | Phieu tao |
|------|-------|-----------|--------------------|-----------|
| 1 | NV | Tao booking | PENDING (1) | — |
| 2 | NV / Manager | (Tuy chon) Xac nhan booking | CONFIRMED (2) | — |
| 3 | NV / Manager | Mo man hinh huy: chon ly do huy, nhap phi huy (neu co), nhap so tien hoan (neu da thu truoc) | CANCELLED (5) | *(he thong ghi nhan qua paidAmount / collectedDeposit — [CAN LEAD XAC NHAN: co tao PC Phieu Chi hoan tien khong?])* |

**Dieu kien:**
- Chi huy duoc khi PENDING (1) hoac CONFIRMED (2).
- Bat buoc chon ly do huy tu danh sach co san (`cancel_reasons`).
- Neu da thu tien coc/thue (vd tao CONFIRMED roi thu truoc), admin can vao tab Tai chinh xu ly hoan tien thu cong.

> **Lead bo sung:** Khach co the tu huy qua app khach hang khong? Hay chi NV moi duoc huy?
> **Lead bo sung:** Phi huy tinh theo bang gia nao? (phan tram? so ngay truoc?)
> **[CAN LEAD XAC NHAN]:** He thong hien tai co tu dong tao Phieu Chi hoan tien khi huy khong, hay admin phai tao thu cong?

---

## Flow 3: Doi xe giua chung (CHANGE_CAR)

| Buoc | Actor | Hanh dong | Trang thai booking | Phieu tao |
|------|-------|-----------|--------------------|-----------|
| 1 | NV | Tao + giao xe binh thuong | ONGOING (3) | PT DEPOSIT_COLLECT, PT RENTAL_PAYMENT |
| 2 | NV / Manager | Vao man hinh sua hop dong: doi `carId` sang xe moi, cap nhat gia neu can | ONGOING (3) (khong doi) | *(he thong ghi audit log CHANGE_CAR)* |
| 3 | NV | Nhan xe binh thuong khi het hanh trinh | COMPLETED (4) / REFUND_PENDING (6) | PT SURCHARGE_COLLECT (neu co) |

**Dieu kien:**
- Chi doi duoc `carId`, `startTime`, `endTime`, `rentalPrice`, `note` khi ONGOING.
- Gia thue co the tu dong tinh lai theo xe moi (neu thoi gian thay doi).
- NV can bao khach ve xe thay the.
- Audit log `CHANGE_CAR` ghi lai xe cu → xe moi.

> **Lead bo sung:** Quy trinh nao? (NV viet bien ban doi xe giay khong? Hay chi cap nhat he thong?)
> **Lead bo sung:** Co thu them phi doi xe khong? Xu ly the nao tren he thong?
> **Lead bo sung:** Tien coc da thu co doi theo xe moi khong?

---

## Flow 4: Giu coc de kiem tra phu thu — Revert (NV/Admin sua sai)

**Canh A: Giu coc binh thuong (isHoldDeposit=true)**

| Buoc | Actor | Hanh dong | Trang thai booking | Phieu tao |
|------|-------|-----------|--------------------|-----------|
| 1 | NV | Tao + giao xe binh thuong | ONGOING (3) | PT DEPOSIT_COLLECT, PT RENTAL_PAYMENT |
| 2 | NV | Nhan xe, chon "Giu coc cho kiem tra", ghi phu thu (neu co) | REFUND_PENDING (6) | PT SURCHARGE_COLLECT (neu co phu thu) |
| 3 | Manager / Admin | Xem xet, xac nhan so tien hoan, nhap ghi chu | COMPLETED (4) | PC DEPOSIT_REFUND (neu refundAmount > 0) |

**Canh B: Revert REFUND_PENDING ve ONGOING (NV lam sai)**

| Buoc | Actor | Hanh dong | Trang thai booking | Phieu tao |
|------|-------|-----------|--------------------|-----------|
| 1-2 | (nhu Canh A) | — | REFUND_PENDING (6) | — |
| 3 | Manager / Admin | Revert ve ONGOING (nhap ly do bat buoc) | ONGOING (3) | PT SURCHARGE_REVERSE (neu co phu thu truoc do) |
| 4 | NV | Nhan xe lai, dien lai thong tin | COMPLETED (4) / REFUND_PENDING (6) | (nhu Canh A) |

**Canh C: Admin hard revert COMPLETED ve ONGOING**

| Buoc | Actor | Hanh dong | Trang thai booking | Phieu tao |
|------|-------|-----------|--------------------|-----------|
| 1-3 | (nhu Canh A, da hoan thanh) | — | COMPLETED (4) | — |
| 4 | **Admin only** | Hard revert ve ONGOING (nhap ly do bat buoc) | ONGOING (3) | PT DEPOSIT_REFUND_REVERSE (neu truoc do co DEPOSIT_REFUND) |
| 5 | NV / Manager | Xu ly lai tu buoc nhan xe | COMPLETED (4) / REFUND_PENDING (6) | — |

> **Lead bo sung:** Deadline hoan coc la 7 ngay lam viec ke tu `refundRequestedAt` — co hien countdown tren giao dien admin khong?
> **Lead bo sung:** Manager hay Admin moi duoc `confirmRefund`?
> **[CAN LEAD XAC NHAN]:** Manager co quyen `confirmRefund` khong? Code hien tai chi check dang nhap, khong check role o buoc nay.

---

## Flow 5: Su co / Tich thu xe (INCIDENT / SEIZED)

| Buoc | Actor | Hanh dong | Trang thai booking | Phieu tao |
|------|-------|-----------|--------------------|-----------|
| 1 | NV | Tao + giao xe binh thuong | ONGOING (3) | PT DEPOSIT_COLLECT, PT RENTAL_PAYMENT |
| 2 | NV / Manager | Cap nhat trang thai su co: chuyen sang INCIDENT (7) hoac SEIZED (8) | INCIDENT (7) / SEIZED (8) | — |
| 3a | NV / Manager | (Neu giai quyet xong) Chuyen ve ONGOING (3) | ONGOING (3) | — |
| 3b | NV / Manager | (Neu bi tich thu — khong nhan lai duoc) Chuyen sang COMPLETED (4) | COMPLETED (4) | — |
| 3c | NV / Manager | (Neu con phu thu / can hoan coc) Chuyen sang REFUND_PENDING (6) | REFUND_PENDING (6) | — |
| 4 | NV / Manager / Admin | (Neu REFUND_PENDING) Xac nhan hoan coc | COMPLETED (4) | PC DEPOSIT_REFUND (neu co) |

**Luu y:**
- INCIDENT (7) va SEIZED (8) khong co truong du lieu rieng — chi la trang thai de NV biet.
- Co the di lai nhieu lan: INCIDENT <-> SEIZED (7<->8) duoc phep.
- Chuyen 7->3 hoac 8->3 la "soft revert" — khong can note, khong tao transaction nguoc.

> **Lead bo sung:** Quy trinh xu ly su co: bao hiem, cam co co quy trinh rieng khong?
> **Lead bo sung:** Ai duoc phep chuyen sang INCIDENT/SEIZED? (NV thuong hay Manager tro len?)
> **[CAN LEAD XAC NHAN]:** Booking bi SEIZED co bao gio chuyen sang CANCELLED khong, hay luon ve COMPLETED?

---

## Phan anh chung tu tu cac Flow

| Loai phieu | Ma | Khi nao tao | Loai |
|------------|-----|-------------|------|
| Thu tien coc | DEPOSIT_COLLECT | Giao xe co thu coc | Phieu Thu (PT) |
| Thu tien thue xe | RENTAL_PAYMENT | Giao xe co thu tien thue truoc | Phieu Thu (PT) |
| Thu phu thu | SURCHARGE_COLLECT | Nhan xe co phu thu > 0 | Phieu Thu (PT) |
| Thu them khi nhan xe | REVENUE | Nhan xe co `collectedAmount > 0` | Phieu Thu (PT) |
| Hoan coc | DEPOSIT_REFUND | `confirmRefund` co `refundAmount > 0` | Phieu Chi (PC) |
| Dao nguoc phu thu | SURCHARGE_REVERSE | Revert tu REFUND_PENDING hoac COMPLETED ve ONGOING | Phieu Chi (PC) |
| Dao nguoc hoan coc | DEPOSIT_REFUND_REVERSE | Hard revert COMPLETED (4) -> ONGOING (3) | Phieu Thu (PT) |
