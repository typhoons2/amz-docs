# Báo cáo lỗ hổng dòng tiền — gửi đội Backend (xanh-service)

> Phạm vi: `xanh-service` · Ngày: 2026-06-09 · Nguồn: quét cạn code (15 agent) + đào sâu từng lỗ hổng (11 agent) + đo dữ liệu **production** (read-only).
> Mục tiêu: liệt kê 10 lỗ hổng ghi nhận tiền, phân loại **bug / cố tình / cần BE quyết**, kèm số thật + đề xuất sửa tối thiểu + `file:line`.

## Tóm tắt cho lead (1 phút)

**Lỗi gốc lặp lại:** hệ thống ghi tiền thật lên **field của đơn** (`refund_amount` 527.9tr, `surcharge` 25.2tr, `cancellation_fee`, `commission`, `totalAmount` gia hạn) nhưng **không kết sổ thành phiếu thu/chi**. Bảng `transactions` lẽ ra phải là **sổ cái duy nhất** thì lại bị bỏ qua ở nhiều luồng.

**Thực tế production hiện tại:**
- 🔴 **Toàn bộ phiếu CHI = 0 đồng**, bảng `maintenance_tickets` **rỗng** → báo cáo chi phí = 0, **"lợi nhuận" = doanh thu chưa trừ một xu chi phí nào** → không dùng để ra quyết định được.
- **260/383 đơn (68%) kẹt ở "Chờ hoàn cọc"**, đang giữ **616.99tr cọc** nhưng **0 phiếu hoàn cọc** (tiền hoàn chỉ ghi trên `refund_amount` = 527.9tr).
- Doanh thu sổ HĐ **425.96tr** vs tiền thực thu **414.75tr** → lệch **11.2tr**, khớp gần đúng với **19 phiếu thu đã void (11.033tr)** vẫn lọt vào danh sách/export do thiếu lọc `deleted` (G10).

## Ảnh chụp số liệu production (2026-06-09)

| Chỉ số | Giá trị |
|--------|---------|
| Tổng đơn | 383 (PENDING 23 · CONFIRMED 8 · ONGOING 24 · COMPLETED 37 · CANCELLED 31 · **REFUND_PENDING 260**) |
| Đơn sự cố/tịch thu/đổi xe (status 7/8/9) | **0** (các lỗ hổng nhóm này chưa phát sinh thực tế) |
| Phiếu CHI (type=2) mọi loại | **0 phiếu / 0đ** |
| Phiếu bảo dưỡng | **bảng rỗng** |
| Cọc đang giữ (`collected_deposit`) | 616.99tr · phiếu hoàn cọc: **0** |
| `refund_amount` (field đơn) | 527.9tr |
| Doanh thu sổ HĐ vs đã thu | 425.96tr vs 414.75tr (lệch 11.2tr) |
| Phụ thu: field đơn vs phiếu | 25.2tr vs 6.88tr |
| Phiếu thu đã void | 19 phiếu / 11.033tr |
| Khách có ví≠0 / nợ≠0 | 0 / 0 (trên 2516 khách) |
| `cancellation_fee` / `commission` tổng | 0 / 0 |

---

## Danh sách lỗ hổng (xếp theo ưu tiên xử lý)

Chú thích: 🐞 **BUG** (sai rõ ràng) · ⚖️ **CẦN BE QUYẾT** (có thể là chủ đích nghiệp vụ) · 🔴/🟠/🟡 mức ảnh hưởng.

### 1. G10 🐞 🟠 — Phiếu đã void vẫn lọt vào danh sách / export / chi tiết đơn
**Đang xảy ra (19 phiếu void = 11.033tr).** Báo cáo tổng hợp có lọc `deleted`, nhưng 3 query KHÔNG lọc → phiếu đã hủy vẫn hiện ở màn danh sách giao dịch, file Excel export, và chi tiết hợp đồng. Người dùng tự cộng các dòng sẽ ra tổng cao hơn báo cáo (đúng mức lệch 11.2tr).
- **Sửa tối thiểu:** thêm `AND COALESCE(t.deleted,false)=false` vào 3 query trong `TransactionRepository.java`: `findTransactions` (:61) + countQuery (:84), `countTransactions` (:119), và `findByBookingIdAndTypeOrderByTransactionDateDesc` (:156 — đổi sang `@Query` JPQL).
- **Code:** `TransactionRepository.java:61,84,119,156`; `TransactionServiceImpl.java:287,388,550`; `BookingServiceImpl.java:5102`

### 2. G3 🐞 🟠 — Hoàn tiền thuê & đảo phụ thu bị tính NHẦM thành chi phí (trừ kép)
`RENTAL_REFUND` và `SURCHARGE_REVERSE` là phiếu chi (type=2) nhưng bản chất là **hoàn/đảo chiều thu**, không phải chi phí vận hành. Bộ lọc báo cáo chỉ loại `DEPOSIT_COLLECT`/`DEPOSIT_REFUND` → 2 loại này lọt vào tổng chi phí. Doanh thu vẫn ghi đủ tiền thuê + tiền hoàn lại bị trừ như chi phí → **lợi nhuận sai gấp đôi số tiền hoàn**.
- **Hiện chưa phát sinh** (2 category này chưa tồn tại trên prod), nhưng sẽ nổ ngay lần đầu hủy đơn đã thu tiền / revert đơn có phụ thu.
- **Sửa tối thiểu:** thêm `RENTAL_REFUND`, `SURCHARGE_REVERSE` vào exclude-list của **cả 2** query `findExpenseTransactions` (:233) và `findTransactionsForReport` (:209). Nên gom thành 1 hằng số dùng chung.
- **Code:** `TransactionRepository.java:209,233`; `BookingServiceImpl.java:5916-5962,3282-3330`; `ReportServiceImpl.java:91-106,182-194`

### 3. G2 ⚖️ 🔴 — Doanh thu tính từ `rentalPrice` gộp, không đối chiếu tiền thực thu
Báo cáo lấy doanh thu = `rental_price` rải pro-rata cho mọi đơn status ≠ 1,2 (kể cả 260 đơn REFUND_PENDING tính full), **không bao giờ so với `paid_amount`/phiếu thu**. Sửa giá sau khi đã thu (gia hạn/chốt đơn/đổi xe) → doanh thu lệch tiền thực thu âm thầm. Đây là nền tảng của mọi báo cáo tài chính.
- **Đang xảy ra:** lệch 11.2tr; 260 đơn REFUND_PENDING vẫn cộng full doanh thu.
- **Đề xuất:** thêm cột `totalCollected` + `collectionGap` (lệch ghi nhận vs thực thu) vào báo cáo doanh thu; chốt cách xử lý doanh thu cho status 6 REFUND_PENDING.
- **Code:** `ReportServiceImpl.java:71-88`; `BookingRevenueCalculator.java:47-137`; `BookingRepository.java:535-548`

### 4. G1 ⚖️ 🔴 — Phí bảo dưỡng không sinh phiếu chi → chi phí = 0
`MaintenanceServiceImpl` lưu chi phí vào `maintenance_tickets.total_amount` nhưng **không inject `TransactionService`**, không tạo phiếu chi `MAINTENANCE_COST`. Báo cáo chi phí chỉ đọc bảng `transactions` → tiền sửa xe "mồ côi", không vào báo cáo. **Đây là nguyên nhân trực tiếp khiến chi phí = 0.**
- **Latent** (bảng rỗng) nhưng nổ ngay khi nhập phiếu bảo dưỡng đầu tiên → cần sửa **trước khi** vận hành bắt đầu nhập.
- **Sửa tối thiểu:** trong `createMaintenanceTicket` (sau khi save, nếu `total_amount>0`) → tạo `Transaction` type=2 category `MAINTENANCE_COST`, `refId`=ticket.id, cùng `@Transactional`; tương tự cho update/delete (đảo phiếu).
- **Cần BE quyết:** (a) ghi nhận lúc tạo phiếu hay lúc COMPLETED; (b) xác nhận category prod chuẩn là `MAINTENANCE_COST` (code test tham chiếu `REPAIR_OUT/GAS_OUT/INSURANCE_OUT` — KHÁC).
- **Code:** `MaintenanceServiceImpl.java:140-160,319-322,683-740`; `MaintenanceTicket.java:86-91`

### 5. G6 ⚖️ 🟠 — Phí hủy & hoa hồng chỉ ghi field, không vào sổ phiếu
`cancellationFee` (tiền giữ lại của khách = doanh thu) và `commissionAmount` (phải trả người giới thiệu = chi phí) chỉ set field trên đơn, không sinh phiếu thu/chi → vô hình với báo cáo.
- **Hiện chưa thiệt hại** (cả 2 field = 0 trên prod — tính năng chưa dùng).
- **Sửa tối thiểu:** trong `cancelBooking`, nếu `cancellationFee>0` → tạo phiếu THU category mới `CANCELLATION_FEE`; nơi quyết toán nếu `commissionAmount>0` → tạo phiếu CHI `COMMISSION`.
- **Code:** `BookingServiceImpl.java:5827-5831,668,2247-2248`; `Booking.java:185-186`

### 6. G4 ⚖️ 🟠 — Gia hạn tăng tiền nhưng không thu, không tạo phiếu thu
`extendBooking` set `manualTotalAmount`/`rentalPrice` mới nhưng **không đụng `paidAmount`, không tạo phiếu thu** (khác hẳn luồng đổi xe vốn có nhánh PAY_NOW/PAY_LATER rõ ràng). → tạo nợ ngầm phình `remainingAmount`; nếu NV đã thu tiền mặt thì không có chỗ ghi.
- **Đang xảy ra:** góp vào lệch 11.2tr; 24 ONGOING + 260 REFUND_PENDING đều cho phép gia hạn.
- **Cần BE quyết:** gia hạn **thu ngay** (tạo phiếu thu + cộng paidAmount) hay **ghi nợ** (giữ paidAmount, log rõ khoản treo)?
- **Code:** `BookingServiceImpl.java:4878-4935,4965-5036,6823-6845,6962-7030`

### 7. G8 ⚖️ 🟠 — Tịch thu cọc khi SEIZED không sinh phiếu thu/doanh thu
Chuyển sang SEIZED chỉ đổi status + bắn Telegram, **không bút toán**: cọc bị tịch thu vẫn nằm ở "tiền giữ hộ", không bao giờ thành thu nhập.
- **Latent** (0 đơn SEIZED) nhưng khi phát sinh, tiền tịch thu (trong 616.99tr cọc) thiếu khỏi doanh thu.
- **Cần BE quyết:** SEIZED là **trung gian** (chưa chốt tiền) hay **đã tịch thu**? Nếu tịch thu: toàn bộ hay một phần, category nào (`REVENUE` sẵn có hay thêm `DEPOSIT_FORFEIT`)?
- **Code:** `BookingServiceImpl.java:1745,1961-1962,2949-2956`; `TransactionServiceImpl.java:480-507`

### 8. G5 ⚖️ 🟡 — Hai báo cáo chi phí dùng hai trục ngày khác nhau
`/report/revenue` tính chi phí theo `start_time` (ngày giao xe); `/report/expense` theo `transaction_date` (ngày bấm phiếu) → cùng khoảng lọc, tổng chi phí 2 màn lệch nhau với phiếu gắn booking.
- **Latent** (chi phí=0 nên chưa lộ).
- **Cần BE quyết:** chi phí theo **CASH** (transaction_date) hay **ACCRUAL** (start_time)? Hai báo cáo có cần khớp tuyệt đối không? (Nếu cố ý khác → ghi rõ định nghĩa trên UI.)
- **Code:** `TransactionRepository.java:196-214,226-238`; `ReportServiceImpl.java:91-104,182-268`

### 9. G7 ⚖️ 🟡 — Đơn có thể kẹt vĩnh viễn ở CHANGING_CAR
Từ CHANGING_CAR (9) chỉ có lối ra 9→3 qua `performChangeCarDelivery`; không hủy/revert được. Nếu không giao xe mới → đơn kẹt mãi, `changeCarPendingAmount` thành dữ liệu mồ côi. *(Không rò rỉ tiền — khoản treo chưa từng vào paidAmount.)*
- **Latent** (0 đơn status 9).
- **Sửa:** cho phép 9→5 (hủy) hoặc 9→7 (revert) + clear khoản treo; lưu ý `changeCar` đã cộng `priceDiff` vào `totalAmount` nên revert phải trừ lại.
- **Code:** `BookingServiceImpl.java:6833-6839,6921-6937,2977-2980,1657-1662,5806-5813`

### 10. G9 ⚖️ 🟡 — Ví / công nợ khách là cột chết
`wallet_balance`, `debt_amount` chỉ khởi tạo = 0, **không có code ghi**. Panel admin đọc & hiển thị → mọi khách luôn Ví=0, Nợ=0 (số liệu giả gây hiểu nhầm).
- **Đang xảy ra:** 0/2516 khách có giá trị ≠ 0.
- **Sửa tối thiểu:** ẩn 2 field khỏi màn chi tiết khách (hoặc đánh dấu chưa dùng), trừ khi sắp làm tính năng ví/công nợ thật.
- **Code:** `Customer.java:139-151`; `CustomerServiceImpl.java:2052-2053`; `CustomerAdminDetailResponseData.java:127-133`

---

## Đề xuất GỐC (xử lý nhiều lỗ hổng cùng lúc)

`transactions` phải là **sổ cái duy nhất** cho mọi dòng tiền; field tiền trên `Booking`/`MaintenanceTicket` chỉ là đầu vào, không đọc độc lập.

1. **Chốt sổ trong `@Transactional` cho từng sự kiện:** tạo/sửa/xóa phiếu bảo dưỡng (G1), hủy đơn có phí hủy (G6), gia hạn tăng tiền (G4), tịch thu cọc SEIZED (G8) — mỗi sự kiện sinh/đảo đúng 1 phiếu gắn `refType`+`refId`, tái dùng `generateTransactionCode`.
2. **Chuẩn hóa dùng chung:** 1 danh sách hằng "code không phải thu/chi thực" (DEPOSIT_COLLECT, DEPOSIT_REFUND, RENTAL_REFUND, SURCHARGE_REVERSE) cho 4 query báo cáo (vá G3); 1 bộ lọc `deleted` (vá G10); 1 trục ngày + 1 quy tắc lọc bến chung giữa revenue/expense (vá G5).
3. **Thêm bước đối soát định kỳ:** so `SUM(rental_price)` vs `SUM(paid_amount)` vs `SUM(phiếu thu)` — lệch nào (như 11.2tr) phải nổi lên báo cáo thay vì chìm (vá G2, G4).

→ Làm 3 việc này xử lý gọn **G1/G3/G4/G5/G6/G8/G10** cùng một khuôn.

---

## Câu hỏi cần BE/lead chốt trước khi code

1. **G3:** hoàn tiền thuê nên **giảm doanh thu** (đúng kế toán) hay chỉ **loại khỏi chi phí**? (bug, cần hướng sửa)
2. **G1:** mốc ghi nhận chi phí bảo dưỡng = lúc tạo phiếu hay lúc COMPLETED? Category chuẩn `MAINTENANCE_COST`? Có backfill không?
3. **G4:** gia hạn **thu ngay** hay **ghi nợ**? Cho NV thu tiền mặt tại chỗ khi gia hạn không?
4. **G8:** SEIZED là **trung gian** hay đã **tịch thu** cọc? Tịch thu toàn bộ hay một phần, category nào?
5. **G6:** phí hủy đã gộp vào `paid_amount` chưa (tránh đếm trùng)? Hoa hồng tính sổ lúc nào? Tính năng đã dùng chưa?
6. **G2:** 260 đơn REFUND_PENDING nên tính full doanh thu hay trừ phần sẽ hoàn? Thêm cột `totalCollected`/`collectionGap`?
7. **G5:** báo cáo chi phí theo **CASH** hay **ACCRUAL**? Hai báo cáo revenue/expense cần khớp tuyệt đối?
8. **G10:** màn danh sách giao dịch có cần chế độ xem cả phiếu void (audit) không, hay luôn ẩn?
9. **G7:** cho phép hủy/revert đơn đang CHANGING_CAR không? Revert có trừ lại `totalAmount` đã cộng không?
10. **G9:** tính năng ví/công nợ có trong roadmap gần không? Nếu không, ẩn 2 cột khỏi màn chi tiết khách?

---

> ⚠️ **Đây là báo cáo phát hiện — chưa sửa code.** Mọi đề xuất sửa là tối thiểu, không phá kiến trúc. Cần lead/BE chốt các câu hỏi trên trước khi triển khai. Số production đo read-only ngày 2026-06-09 (sẽ thay đổi theo thời gian).
