# Bản đồ dòng tiền tổng thể — AMZ (xanh-service)

> Mục tiêu: nhìn 1 trang thấy mọi điểm tiền VÀO / RA / GIỮ HỘ, tiền được ghi ở sổ nào, và chỗ nào **không nối nhau** (lỗ hổng).
> Nguồn: quét cạn code `xanh-service` (workflow 15 agent, 162 + 19 điểm tiền, đối chiếu file:line) — 2026-06-09.

## TL;DR — Vì sao dòng tiền thấy rối

Tiền được ghi ở **4 sổ khác nhau, KHÔNG có sổ cái thống nhất**, và không có bước đối soát tự động:

1. **Sổ trong hợp đồng** (các field tiền trên `new_bookings`)
2. **Sổ phiếu thu–chi** (`transactions`)
3. **Sổ phiếu bảo dưỡng** (`maintenance_tickets`) — *tách rời, không nối*
4. **Con số tính động trên báo cáo** (`ReportServiceImpl`)

**Điểm chí mạng:** Báo cáo lấy **DOANH THU từ sổ 1** (giá thuê rải theo ngày) nhưng lấy **CHI PHÍ từ sổ 2** (phiếu chi). Hai vế **không bao giờ được so với tiền mặt thực thu** (`paidAmount`). Nhiều khoản tiền thật (sửa xe, phí hủy, hoa hồng, tịch thu cọc, treo đổi xe, gia hạn) chỉ nằm ở field hợp đồng mà **không sinh phiếu thu–chi** → vô hình với báo cáo. Ngược lại vài khoản hoàn/bù trừ (`RENTAL_REFUND`, `SURCHARGE_REVERSE`) lại **bị tính nhầm thành chi phí**.

---

## 1. Năm cuốn sổ tiền

| Sổ | Ghi gì | Vai trò |
|----|--------|---------|
| **1. Hợp đồng** (`new_bookings`) | `collectedDeposit`, `paidAmount`, `rentalPrice`, `totalAmount`, `surchargeAmount`, `refundAmount`, `changeCarPendingAmount`, `cancellationFee`, `commissionAmount`... | **Nguồn sự thật cho DOANH THU** (qua `rentalPrice` pro-rata). Nhiều field không có phiếu thu–chi tương ứng → lệch sổ 2. |
| **2. Phiếu thu–chi** (`transactions`) | Thu (type=1): `DEPOSIT_COLLECT`, `RENTAL_PAYMENT`, `REVENUE`, `SURCHARGE_COLLECT`, `OTHER_IN`... · Chi (type=2): `DEPOSIT_REFUND`, `RENTAL_REFUND`, `GAS_OUT`, `REPAIR_OUT`, `INSURANCE_OUT`, `OTHER_OUT`... | **Nguồn sự thật cho CHI PHÍ**. KHÔNG phải nguồn doanh thu (báo cáo bỏ qua thu type=1). `is_cash` phân biệt tiền mặt/CK. |
| **3. Phiếu bảo dưỡng** (`maintenance_tickets`) | `total_amount` (tiền sửa xe), `partner_id` (gara) | **G1: tự nối sang sổ 2** — phiếu COMPLETED sinh phiếu chi `MAINTENANCE_COST` (type=2), tự vào báo cáo. (Trước G1 là sổ độc lập, tiền sửa xe biến mất.) |
| **4. Báo cáo** (`ReportServiceImpl`) | DT = `rentalPrice` rải theo ngày · CP = `transactions` type=2 · Lợi nhuận = DT − CP | DT và CP lấy từ **2 sổ + 2 trục ngày khác nhau** → khó đối soát chéo. |
| **5. Ví/công nợ khách** (`customers.wallet_balance`, `debt_amount`) | `walletBalance`, `debtAmount` | **CỘT CHẾT** — không có code cập nhật tự động (chỉ khởi tạo =0). Công nợ thật chỉ tính động `remainingAmount` lúc query. |

---

## 2. Tiền VÀO quỹ

| Khoản | Kích hoạt | Ghi vào | Vào báo cáo? |
|-------|-----------|---------|--------------|
| Thu trả trước (prePayment) | `prePayment()` | `paidAmount` + phiếu thu `RENTAL_PAYMENT` | Gián tiếp (qua rentalPrice) |
| Thu khi giao xe | `performDelivery()` collectedPayAmount>0 | `paidAmount` + `RENTAL_PAYMENT` | Gián tiếp |
| Thu khi nhận xe | `performReceive()` collectedAmount>0 | `paidAmount` + `REVENUE` | Gián tiếp |
| Thu khi chốt hợp đồng | `finishBooking()` | `paidAmount` + `REVENUE` | Gián tiếp |
| Chênh đổi xe — tại VP | `changeCar()` PAY_NOW+AT_OFFICE | `paidAmount` + `totalAmount` + `RENTAL_PAYMENT` | **Có** |
| Chênh đổi xe — tại hiện trường | `performChangeCarDelivery()` | `paidAmount` + `RENTAL_PAYMENT`, clear khoản treo | **Có** |
| Phiếu thu thủ công | `POST /admin/transactions/create` type=1 | `transactions` + sync `paidAmount`/`collectedDeposit` | Một phần (thu ngoài rental có thể KHÔNG hiện) |
| **Doanh thu thuê (rental pro-rata)** | Báo cáo `getRevenueReport` | Không ghi transaction — tính động | **Có (nguồn DT duy nhất)** |

> ⚠️ Tất cả khoản thu tiền thuê chỉ vào báo cáo **gián tiếp** qua `rentalPrice`, KHÔNG qua chính phiếu thu. Tiền thực thu (`paidAmount`) và doanh thu báo cáo là **2 con số độc lập, không bao giờ so khớp**.

---

## 3. Tiền RA quỹ

| Khoản | Kích hoạt | Ghi vào | Vào báo cáo? |
|-------|-----------|---------|--------------|
| Hoàn cọc | `confirmRefund()` | `DEPOSIT_REFUND` (type=2) + `collectedDeposit→0` | Không (đúng — cọc là tiền giữ hộ) |
| Hoàn tiền thuê khi hủy | `cancelBooking()` paidAmount>0 | `RENTAL_REFUND` (type=2) | ⚠️ **Bị tính thành chi phí (sai)** |
| Đảo phụ thu | revert 4→3 / 6→3 | `SURCHARGE_REVERSE` (type=2) | ⚠️ **Có thể bị tính thành chi phí** |
| Chi xăng | phiếu chi `GAS_OUT` | `transactions` type=2 | Có |
| Chi sửa chữa / bảo dưỡng | phiếu chi `MAINTENANCE_COST` (G1, tự tạo khi phiếu COMPLETED) | `transactions` type=2 | Có — tự vào báo cáo, không cần bấm tay |
| Chi bảo hiểm | phiếu chi `INSURANCE_OUT` | `transactions` type=2 | Có |
| Chi phí khác | phiếu chi `OTHER_OUT` | `transactions` type=2 | Có |
| Chi phí gắn lúc tạo đơn | `createBookingWithExtras()` expenses[] | `transactions` type=2 | Có (tự nối) |

---

## 4. Tiền GIỮ HỘ / nội bộ (không phải thu nhập/chi phí)

| Khoản | Ghi vào | Ghi chú |
|-------|---------|---------|
| Thu cọc | `collectedDeposit` + `DEPOSIT_COLLECT` | Giữ hộ, loại khỏi mọi báo cáo (đúng) |
| Thu phụ thu | `surchargeAmount` + `SURCHARGE_COLLECT` (paymentMethodId=null) | Bút toán nội bộ, thường lấy từ cọc — không có dòng tiền mới |
| Cọc giữ chờ thanh lý | status=6 + `refundRequestedAt` | Đếm ngược 7 ngày, chưa có phiếu chi tới khi confirmRefund |
| Khoản treo chênh đổi xe | `changeCarPendingAmount` | ⚠️ Nếu không giao xe mới → **treo vĩnh viễn** |
| Phí hủy đơn | `cancellationFee` (chỉ field) | ⚠️ KHÔNG tạo transaction → không vào thu nhập |
| Trừ chênh đổi xe vào cọc | `collectedDeposit` (giảm) | DEDUCT_FROM_DEPOSIT — không tạo transaction |
| Tiền trả trước bắt buộc | `requiredPrepayAmount` | Chỉ metadata chính sách, không phải tiền thật |
| Dùng mã khuyến mãi | `PromotionUsage` + `usedCount` | Giảm `discountValue` → giảm DT pro-rata gián tiếp |

---

## 5. ⚠️ Lỗ hổng (xếp theo mức ảnh hưởng) — trạng thái xử lý

> Mã G# theo `../03-reports/bao-cao-lo-hong-dong-tien-BE.md`; tiến độ + quyết định lead xem `../03-reports/backlog-dong-tien-BE.md`. G11 phát hiện sau khi đào sâu luồng hoàn cọc.

| # | Lỗ hổng | Ảnh hưởng | Mức | Trạng thái |
|---|---------|-----------|-----|------------|
| G1 | **Phí sửa xe không tự nối sang phiếu chi** | Chi phí thật biến mất, lợi nhuận thổi phồng (báo cáo chi phí = 0) | 🔴 CAO | ✅ **Đã sửa** — phiếu COMPLETED tự tạo phiếu chi `MAINTENANCE_COST` (chờ merge/deploy + migration) |
| G2 | **Doanh thu lấy từ rentalPrice, không đối chiếu phiếu thu** | Sửa `rentalPrice` sau khi đã thu → DT báo cáo lệch tiền thực thu, không cảnh báo | 🔴 CAO | ⏳ chờ — đề xuất thêm cột "đã thu thực tế" + "chênh lệch" |
| G3 | **RENTAL_REFUND & SURCHARGE_REVERSE bị tính là chi phí** | Hoàn tiền thuê / đảo phụ thu cộng nhầm vào chi phí | 🔴 CAO | ⏳ chờ quyết (latent — chưa phát sinh) |
| G4 | **Gia hạn tăng tiền nhưng không bắt tạo phiếu thu** | DT tăng nhưng paidAmount không đổi → ghi nhận tiền chưa thu | 🔴 CAO | 🔧 sắp làm — lead chốt **thu ngay, không cho nợ** |
| G5 | **Hai báo cáo chi phí dùng hai trục ngày khác nhau** | Tổng chi phí 2 màn lệch nhau | 🟠 VỪA | ⏳ chờ — đã rõ là chủ đích, latent (chi phí=0) |
| G6 | **Phí hủy & hoa hồng không có phiếu thu–chi** | `cancellationFee`, `commissionAmount` vô hình với báo cáo | 🟠 VỪA | ⏸ hoãn — hoa hồng chưa dùng (lead 15/06) |
| G7 | **Khoản treo đổi xe có thể kẹt vĩnh viễn** | `changeCarPendingAmount` treo mãi nếu không giao xe mới | 🟠 VỪA | ⏳ chờ quyết (latent — 0 đơn) |
| G8 | **Tịch thu cọc (SEIZED) không tự ghi thu nhập** | Admin phải ghi tay, dễ sót | 🟠 VỪA | ⏸ để sau — chưa có hướng nghiệp vụ (lead 15/06) |
| G9 | **Ví/công nợ khách là cột chết** | Nếu UI hiển thị là công nợ thật thì luôn sai | 🟠 VỪA | 🔧 sắp làm — ẩn cột (AMZ không cho khách nợ) |
| G10 | **Phiếu đã hủy (soft-delete) cần lọc nhất quán** | Query quên lọc `deleted` → tính cả phiếu hủy (lệch 11tr export Excel) | 🟡 THẤP | ✅ **Đã merge** (#513) — export loại phiếu hủy |
| **G11** | **Hoàn cọc ra quỹ qua 3 cửa không bút toán** *(phát hiện sau)* | 0 phiếu hoàn cọc dù tiền đã ra; 29 đơn đóng treo 58tr cọc | 🔴 CAO | ✅ **Đã merge** (#514) — chặn 6→4 + tự tạo phiếu chi khi nhận xe |

---

## 6. Đối soát giữa các sổ (vì sao không khớp)

Các sổ **không tự đối soát với nhau** và hệ thống **không có bước reconcile**:

1. **Doanh thu (sổ HĐ) ≠ Tiền thực thu (sổ phiếu thu):** độc lập hoàn toàn; sửa `rentalPrice` sau khi thu → lệch âm thầm.
2. **Chi phí màn doanh thu ≠ chi phí màn chi phí:** cùng nguồn type=2 nhưng khác trục ngày.
3. **Sổ bảo dưỡng ≠ phiếu chi:** ~~không nối → chi phí sửa xe biến mất khỏi báo cáo~~ → **G1 đã nối**: phiếu COMPLETED tự sinh phiếu chi `MAINTENANCE_COST`.
4. **Bút toán nội bộ** (SURCHARGE_COLLECT/REVERSE, DEPOSIT_REFUND_REVERSE, RENTAL_REFUND) chỉ triệt tiêu nếu cặp thu–chi cùng kỳ + cùng trục ngày; bộ lọc chỉ loại DEPOSIT_COLLECT/DEPOSIT_REFUND nên một số cặp đảo vẫn lọt.
5. **Ví/công nợ khách** không được duy trì → không đối soát được công nợ.

---

> Liên quan: `cach-tinh-doanh-thu.html` (chi tiết công thức doanh thu), `../01-business/luong-bao-duong-chi-tiet.html` (phí sửa xe), `cach-tinh-ty-le-lap-day.html`.
