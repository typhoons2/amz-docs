# Quy tac nghiep vu Booking (Business Rules)

> Cap nhat: 2026-05-28 | Source: reverse-engineered tu BookingServiceImpl.java + Booking.java + CLAUDE.md

---

### BR-001: Giao xe bat buoc qua dialog rieng — khong the skip
- **Mo ta:** Chuyen tu CONFIRMED (2) hoac PENDING (1) sang ONGOING (3) PHAI di qua endpoint `performDelivery`. Khong the chuyen trang thai truc tiep qua `updateBookingStatus`.
- **Ly do:** Dam bao he thong ghi nhan du: anh/video tinh trang xe, km bat dau, staffId, thu coc, thu tien thue.
- **Code:** `BookingServiceImpl.validateStatusTransition()` — block 2->3; `performDelivery()` Step 2
- **Ap dung:** Moi booking chuyen sang ONGOING

---

### BR-002: Nhan xe bat buoc qua dialog rieng — khong the skip
- **Mo ta:** Chuyen tu ONGOING (3) sang COMPLETED (4) hoac REFUND_PENDING (6) PHAI di qua endpoint `performReceive`. Khong the skip qua `updateBookingStatus`.
- **Ly do:** Dam bao co anh/video nhan xe, km ket thuc (ODO), quyet toan coc, phu thu theo dung quy trinh.
- **Code:** `BookingServiceImpl.validateStatusTransition()` — block 3->4 va 3->6
- **Ap dung:** Moi booking ket thuc hanh trinh thue

---

### BR-003: Phu thu ghi phieu thu ngay khi nhan xe
- **Mo ta:** Khi nhan xe co phu thu > 0, he thong tao Phieu Thu `SURCHARGE_COLLECT` ngay lap tuc — khong cho phep hoan doi sau. Khong bao trong try/catch de dam bao rollback neu loi.
- **Ly do:** Dam bao doanh thu ghi dung ky ke toan, khong de lech so sau khi booking hoan thanh.
- **Code:** `BookingServiceImpl.performReceive()` Step 8.1 (dong ~4390)
- **Ap dung:** Moi booking co `surchargeAmount > 0` khi RECEIVE

---

### BR-004: Hoan coc ghi phieu chi DEPOSIT_REFUND — KHONG bao try/catch
- **Mo ta:** Khi `confirmRefund` duoc goi, he thong tao Phieu Chi `DEPOSIT_REFUND`. Neu insert fail phai rollback toan bo `@Transactional`.
- **Ly do:** Tranh truong hop so sach ghi "da hoan coc" nhung transaction khong ton tai — lech so am tham.
- **Code:** `BookingServiceImpl.confirmRefund()` Step 9 (dong ~4603)
- **Ap dung:** Moi `confirmRefund` co `refundAmount > 0`

---

### BR-005: BE tu tinh refundAmount — khong doc tu FE
- **Mo ta:** `refundAmount` duoc BE tu dong tinh bang cong thuc `depositAmount - totalSurcharge` (neu surchargeDeductFromDeposit=true) hoac `depositAmount` (mac dinh). FE khong duoc truyen refundAmount — he thong bo qua.
- **Ly do:** Tranh nhan vien nhap 0 lam mat tien hoan khach.
- **Code:** `BookingServiceImpl.performReceive()` dong ~4215-4238
- **Ap dung:** Moi luong `performReceive`

---

### BR-006: Phu thu khaur tru vao coc — validate truoc khi thuc hien
- **Mo ta:** Neu `surchargeDeductFromDeposit=true`, tong phu thu khong duoc vuot qua so tien coc da thu. He thong throw loi ngay neu vi pham.
- **Ly do:** Bao ve khach, dam bao so tien hoan = coc - phu thu >= 0.
- **Code:** `BookingServiceImpl.performReceive()` dong ~4221-4227
- **Ap dung:** Khi nhan vien chon "tru phu thu vao coc"

---

### BR-007: Coc du thi moi cho hoan thanh — validateFullPayment
- **Mo ta:** Truoc khi chuyen sang COMPLETED (4), he thong kiem tra `paidAmount >= totalAmount`. Neu thieu tien → throw loi voi so du can tra.
- **Ly do:** Cong ty khong cho phep no — khach phai tra du truoc khi dong hop dong.
- **Code:** `BookingServiceImpl.validateFullPayment()` (dong ~2920), goi tu `performReceive` khi `isHoldDeposit=false`
- **Ap dung:** Moi booking chuyen sang COMPLETED

---

### BR-008: Soft revert tu REFUND_PENDING — chi Manager/Admin
- **Mo ta:** Chuyen 6 (REFUND_PENDING) -> 3 (ONGOING) chi duoc phep boi ROLE_MANAGER hoac ROLE_ADMIN. Bat buoc nhap ly do. He thong clear `refundRequestedAt`, `refundAmount`, `refundNote` va tao SURCHARGE_REVERSE neu co.
- **Ly do:** Tranh NV thuong vo tinh huy quy trinh hoan coc da ghi so.
- **Code:** `BookingServiceImpl.updateBookingStatus()` dong ~1619-1646
- **Ap dung:** Transition 6->3

---

### BR-009: Hard revert — chi Admin
- **Mo ta:** Revert tu COMPLETED (4) hoac CANCELLED (5) chi duoc phep boi ROLE_ADMIN. Phai nhap ly do. He thong tu dong tao Phieu Thu `DEPOSIT_REFUND_REVERSE` (neu revert tu 4->3) va cong lai `collectedDeposit`.
- **Hard revert la gi:** Hoan tac (revert) booking DA DONG SO — tu COMPLETED (4, da hoan thanh) hoac CANCELLED (5, da huy) quay nguoc ve trang thai truoc do. Day la hanh dong cao cap vi cham vao du lieu da chot so.
- **Khac soft revert the nao:** Soft revert (6→3, REFUND_PENDING → ONGOING) chi hoan tac booking CHUA dong so, cho phep ca Manager + Admin thuc hien. Hard revert (4→3, 5→1/2/3) tac dong vao booking DA dong so — rui ro cao hon, chi ADMIN duoc phep.
- **Tai sao chi ADMIN:** Vi dung toi booking da dong so (da hoan coc / da huy chinh thuc) → rui ro ke toan cao, can quyen cao nhat kiem soat. Vi du: revert 4→3 bat buoc tao Phieu Thu `DEPOSIT_REFUND_REVERSE` de can bang lai so tien da hoan truoc do.
- **Vi du cu the:** Booking da COMPLETED, phat hien da hoan coc nham cho khach → ADMIN hard revert 4→3 → he thong tu dong tao phieu dao nguoc + booking quay ve ONGOING cho phep xu ly lai.
- **Ly do:** Hard revert anh huong den so sach — can audit trail va nguoi co tham quyen cao nhat phe duyet.
- **Code:** `BookingServiceImpl.updateBookingStatus()` dong ~1611-1646
- **Ap dung:** Transition 4->3, 5->1, 5->2, 5->3

---

### BR-010: Huy booking chi tu PENDING hoac CONFIRMED
- **Mo ta:** `cancelBooking` chi chap nhan booking o trang thai PENDING (1) hoac CONFIRMED (2). Khong cho huy khi dang ONGOING, COMPLETED, hay cac trang thai khac.
- **Ly do:** Khi da giao xe cho khach (ONGOING) — khong the "huy" nua, phai nhan xe roi moi xu ly.
- **Code:** `BookingServiceImpl.cancelBooking()` dong ~5586-5594
- **Ap dung:** Endpoint huy booking

---

### BR-011: Huy booking bat buoc co cancelReasonId
- **Mo ta:** Khi huy, bat buoc truyen `cancelReasonId` tro den ban ghi co san trong `cancel_reasons`. Khong the huy voi ly do tuy y.
- **Ly do:** Phan tich nguyen nhan huy de cai thien dich vu.
- **Code:** `BookingServiceImpl.cancelBooking()` dong ~5597-5603
- **Ap dung:** Moi luong huy booking

---

### BR-012: Revert tu CANCELLED phai co note va targetStatus
- **Mo ta:** Khi revert tu CANCELLED (5), admin phai chi ro trang thai dich qua `targetStatus` (1=PENDING, 2=CONFIRMED, 3=ONGOING) va phai nhap note. He thong khong mac dinh ve PENDING.
- **Ly do:** Admin phai chu dong quyet dinh — tranh revert nham sang sai trang thai.
- **Code:** `BookingServiceImpl.updateBookingStatus()` dong ~1572-1591, 1651-1659
- **Ap dung:** Transition 5->1, 5->2, 5->3

---

### BR-013: refundRequestedAt chi set lan dau — khong ghi de
- **Mo ta:** Khi booking chuyen vao REFUND_PENDING (6) lan dau, he thong ghi `refundRequestedAt`. Neu booking bi revert roi chuyen lai 6 lan nua, `refundRequestedAt` cu KHONG bi ghi de.
- **Ly do:** Dung de tinh han hoan coc 7 ngay lam viec — phai dem tu lan dau khach yeu cau, khong phai lan revert.
- **Code:** `BookingServiceImpl.setRefundRequestedAtIfNeeded()` — helper idempotent
- **Ap dung:** Moi lan chuyen sang REFUND_PENDING

---

### BR-014: StaffId tu dong resolve tu SecurityContext — khong tin FE
- **Mo ta:** Tai `performReceive` va `confirmRefund`, `staffId` luon duoc lay tu token (SecurityContext). FE khong the truyen staffId de override (confirmRefund bat buoc; performDelivery cho phep override neu co data.staffId — Admin override).
- **Ly do:** Dam bao trach nhiem tai chinh — nguoi thuc hien phai la nguoi dang nhap.
- **Code:** `confirmRefund()` dong ~4505 "SECURITY: Always use currentUserId from token, ignore data.getStaffId()"; `performReceive()` dong ~3976
- **Ap dung:** Moi hanh dong tai chinh

---

### BR-015: Tao khach hang tu dong neu khong co customerId
- **Mo ta:** Khi tao booking, neu `customerId` null, he thong tim khach hang theo so dien thoai. Neu khong tim thay, tu dong tao khach hang moi. Race condition duoc xu ly bang retry.
- **Ly do:** NV co the tao booking ngay cho khach moi ma khong can tao profile truoc.
- **Code:** `BookingServiceImpl.createBooking()` dong ~225-284
- **Ap dung:** Endpoint tao booking admin

---

### BR-016: Tao booking PENDING khong can kiem tra trung lich — CONFIRMED thi kiem tra
- **Mo ta:** Khi tao booking voi status=PENDING, he thong KHONG kiem tra overlap lich xe. Chi khi tao ACTIVE (CONFIRMED/ONGOING/INCIDENT/SEIZED) moi chan trung.
- **Ly do:** Cho phep dat dong coc (PENDING) thoai mai, confirm sau se tu dong huy cac PENDING trung slot.
- **Code:** `BookingServiceImpl.createBooking()` dong ~333-348
- **Ap dung:** Endpoint tao booking

---

### BR-017: totalAmount KHONG cong surchargeAmount
- **Mo ta:** `total_amount` chi bao gom: `rentalPrice + pickupFee + returnFee`, sau do ap dung discount va VAT. Phu thu (`surcharge_amount`) la khoan tach biet, KHONG cong vao `total_amount`.
- **Ly do:** Phu thu phat sinh sau khi ket thuc hanh trinh — khong the biet truoc luc tao hop dong.
- **Code:** `BookingServiceImpl.performDelivery()` comment dong ~4055 "QUY UOC: total_amount KHONG cong surchargeAmount"
- **Ap dung:** Moi tinh toan gia va hien thi tren giao dien
- **Xem them:** Dinh nghia `total_amount` trong `docs/00-overview/domain-glossary.md` — da dong bo: total_amount = chi tien thue, phu thu la field rieng. Evidence: TX202605260349 xac nhan.

---

### BR-018: Phuong thuc thanh toan bat buoc khi thu tien
- **Mo ta:** Neu `depositAmount > 0` hoac `collectedPayAmount > 0` tai giao xe, bat buoc phai co `paymentMethodId`. Tuong tu tai nhan xe, neu `collectedAmount > 0` thi bat buoc co `paymentMethodId`.
- **Ly do:** Moi dong tien thu vao phai gan voi phuong thuc thanh toan de doi soat.
- **Code:** `performDelivery()` dong ~3520-3527; `performReceive()` dong ~3950-3955
- **Ap dung:** Moi thao tac thu tien

---

### BR-019: Moi action phai co booking_logs
- **Mo ta:** Moi thao tac trang thai (STATUS_CHANGE, DELIVERY, RECEIVE, REFUND, CANCEL, CHANGE_CAR, REVERT_STATUS, ADMIN_HARD_REVERT) phai tao mot ban ghi trong `booking_logs` thong qua `bookingLogService.createLog()`.
- **Ly do:** Audit trail day du de truy van tranh chap khach hang va doi soat noi bo.
- **Code:** Tat ca cac method chinh trong `BookingServiceImpl` deu goi `bookingLogService.createLog()` o cuoi
- **Ap dung:** Toan bo luong booking

---

### BR-020: Xe doi khi ONGOING — chi duoc doi xe, cac field khac bi khoa
- **Mo ta:** Khi booking dang ONGOING (3), chi duoc phep sua: `carId` (doi xe), `startTime`, `endTime`, `rentalPrice`, `note`. Cac field khac (khach hang, ben, coc, giam gia, VAT, hoa hong...) neu gui gia tri khac cu se bi reject.
- **Ly do:** Hop dong da thuc hien — chi cho phep dieu chinh toi thieu de tranh gian lan.
- **Code:** `BookingServiceImpl.validateOngoingEditWhitelist()` dong ~2945
- **Ap dung:** Endpoint cap nhat booking general khi status=ONGOING

---

### BR-021: Thong tin xe va khach la snapshot — luu cung booking
- **Mo ta:** Khi tao booking, `customerName`, `customerPhone`, `carName`, `licensePlate` duoc copy vao bang `new_bookings` nhu snapshot. Du thong tin khach/xe thay doi sau, lich su hop dong van chinh xac.
- **Ly do:** Tranh mat du lieu lich su khi cap nhat thong tin chu the.
- **Code:** `Booking.java` — cac column snapshot (dong ~60-80)
- **Ap dung:** Toan bo he thong

---

### BR-022: Phuong thuc thanh toan tach biet — coc va tien thue rieng biet
- **Mo ta:** He thong tach biet "Tien thue" (`paidAmount` / revenue stream) va "Tien coc" (`collectedDeposit` / liability stream). Khi hoan tien, he thong giam `collectedDeposit` truoc, neu vuot moi giam `paidAmount`.
- **Ly do:** Ke toan can phan biet doanh thu (tien thue) va cong no (tien coc) de bao cao dung.
- **Code:** `performReceive()` dong ~4282-4303; `confirmRefund()` dong ~4555-4576
- **Ap dung:** Moi tinh toan hoan tien

---

### BR-023: KHONG hardcode URL, secret, token
- **Mo ta:** Moi URL service, secret key, token phai doc tu `application.yml` hoac bien moi truong. Khong duoc hardcode trong code.
- **Ly do:** Bao mat, de cau hinh lai khi doi moi truong.
- **Code:** CLAUDE.md — DON'T section
- **Ap dung:** Toan bo codebase

---

### BR-024: KHONG import entity cheo giua cac service
- **Mo ta:** Moi service chi duoc import entity cua chinh minh. `xanh-service` khong duoc import entity tu `internal-auth-service` hay `customer-auth-service` du chung dung chung DB.
- **Ly do:** Tach biet domain, tranh coupling — moi service phai co entity doc lap.
- **Code:** CLAUDE.md — DON'T section
- **Ap dung:** Toan bo codebase

---

### BR-025: @Transactional bat buoc cho moi method update nhieu bang
- **Mo ta:** Moi method update nhieu bang (booking + transaction + log) phai duoc danh dau `@Transactional`. Neu insert Transaction fail → rollback ca booking de tranh lech so.
- **Ly do:** Toan ven du lieu ke toan — khong cho phep trang thai "booking hoan thanh nhung khong co phieu thu".
- **Code:** `BookingServiceImpl` — annotation `@Transactional` o class level; cac method rieng co `@Transactional` rieng
- **Ap dung:** Moi method thay doi du lieu tai chinh

---

### BR-026: [CANH BAO] Phi giao nhan / chuyen vung nhap qua surcharge KHONG cong vao "Tong tien"
- **Mo ta:** Khi NV nhap phi giao nhan xe / chuyen vung duoi dang **phu thu (BookingSurcharge)**, so tien vao `surcharge_amount` — **KHONG cong vao `total_amount`**. Cot "Tong tien" tren danh sach booking chi hien `total_amount` (tien thue), nen phi giao nhan bi "an".
- **Ly do (van de thiet ke):** He thong gop 2 loai phu thu khac nhau lam 1: (A) phi biet truoc khi dat — giao nhan, chuyen vung — nen thu khi GIAO xe; (B) phu thu phat sinh — tre gio, hu hong — thu khi NHAN xe. Ca 2 deu vao `surcharge_amount` va deu khong cong total.
- **He qua:** NV phai TU NHO thu phan phi giao nhan thu cong khi giao xe. Vd booking TX202605260349: total_amount=1.000.000 nhung khach thuc te phai tra 1.279.000 (+ 279k phi giao nhan).
- **Cach lam dung tam thoi:** NV nhin ca `total_amount` VA `surcharge_amount` → tong tien khach phai tra = total_amount + surcharge_amount. KHONG chi nhin cot "Tong tien".
- **Co field rieng `pickup_fee`/`return_fee`** cong vao total — nhung NV thuong khong dung, nhap qua surcharge thay vi.
- **Huong fix tuong lai:** Xem [ADR-004](../04-decisions/ADR-004-surcharge-not-in-total.md) — task phan loai surcharge (thu-khi-giao cong total).
- **Code:** `BookingServiceImpl` mapper `setRemainingAmount` + tinh `total_amount` (KHONG cong surcharge)
- **Ap dung:** Moi booking co phu thu loai "phi biet truoc" (giao nhan, chuyen vung)
