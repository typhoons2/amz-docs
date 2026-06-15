# Backlog xử lý lỗ hổng dòng tiền — xanh-service

> Theo dõi tiến độ xử lý 10 lỗ hổng trong `bao-cao-lo-hong-dong-tien-BE.md`.
> Cập nhật: **2026-06-15** · Số liệu prod đo read-only.
> Trạng thái: ✅ Đã merge main · 🔧 Đang làm · ⏳ Chờ lead quyết · ⬜ Chưa bắt đầu

## Quyết định lead (2026-06-15)

- **Nguyên tắc xuyên suốt: AMZ KHÔNG cho khách nợ.** Mọi điểm quyết toán thu đủ tại chỗ → chi phối G4, G9, và câu V4.
- **G1:** ghi nhận chi phí bảo dưỡng lúc **COMPLETED** → 🔧 đang code.
- **G3:** cọc tính riêng, không vào doanh thu (xác nhận nguyên tắc) → còn cần làm rõ phần hoàn TIỀN THUÊ (xem G3 bên dưới).
- **G4:** gia hạn **luôn thu ngay, không cho nợ** → sẵn sàng code.
- **G6:** phần hoa hồng hiện chưa dùng → hoãn.
- **G8:** SEIZED chưa có hướng → để sau.
- **G9:** không cho khách nợ → cột ví/nợ là cột chết, ẩn đi → sẵn sàng (đụng FE).
- **G2 / G5 / G7:** lead chưa rõ câu hỏi → cần giải thích lại bằng ví dụ số (xem ghi chú từng mục).

---

## Ảnh chụp số liệu production (2026-06-15)

| Chỉ số | 09/06 (báo cáo gốc) | 15/06 (hiện tại) | Xu hướng |
|--------|---------------------|------------------|----------|
| Tổng đơn | 383 | **434** | +51 |
| Đơn "Chờ hoàn cọc" (status 6) | 260 | **303** | +43 (phình) |
| └ trong đó quá 30 ngày chưa hoàn | 110 | **128** | +18 |
| Cọc đang giữ ở đơn chờ hoàn | 616.99tr | **598.99tr** | — |
| Đơn ĐÃ ĐÓNG (status 4) còn treo cọc | 29 / 58tr | **29 / 58tr** | đứng yên |
| Phiếu CHI (type=2) | 0 | **0** | chưa phát sinh sau deploy |
| Phiếu bảo dưỡng | bảng rỗng | **bảng rỗng** | G1 chưa làm |
| Khách có ví≠0 / nợ≠0 (trên ~2500) | 0 | **0** | cột chết |

> ⚠️ Đơn "Chờ hoàn cọc" tăng 260→303 trong 6 ngày. Đây là **backlog vận hành** (nhân viên chưa bấm Xác nhận hoàn cọc), không phải bug code — nút đã có sẵn ở FE+BE.

---

## ĐÃ XỬ LÝ (đã merge vào main)

### ✅ G10 — Phiếu đã hủy lọt vào Excel export · `PR #513` (commit d36937d)
**Bug đang gây thiệt hại.** File Excel Sổ quỹ không có cột trạng thái → 19 phiếu thu đã hủy (11.033.000đ) lẫn vào làm kế toán cộng dư — đúng khoản lệch 11,2tr báo cáo gốc.
- Thêm cờ `excludeDeleted`: màn danh sách giữ nguyên (FE gạch ngang xem được), Excel export loại phiếu hủy.
- File: `TransactionRepository.java` (findTransactions + countTransactions), `TransactionServiceImpl.java` (getTransactions=false, export=true + early-return khi 0 dòng).
- Test: `ExportExcludeVoidedTest` (3 test). Đã qua code review.

### ✅ Sửa 69 test đỏ sẵn · (commit 18090c5, vào main qua PR #514)
Bộ test trên main đỏ 8 fail + 61 error từ commit `b0b2304` (đổi cột bến NOT NULL, quên sửa test). Không phải bug runtime (prod sạch) nhưng làm mọi PR mất cổng test tin cậy.
- 12 file, **toàn bộ `src/test`, không đụng production.** Suite: 8+61 lỗi → **684/0/0**.
- 3 nhóm: thêm pickup/returnStationId; seed category SURCHARGE_COLLECT + chèn booking_car_history; cập nhật test theo 3 thay đổi nghiệp vụ có chủ đích (68dfe80 / 2d8efb6 / b6f7545).

### ✅ G11 — Tiền hoàn cọc ra khỏi quỹ không ghi sổ · `PR #514` (commit bb8109b)
**Giải mã vì sao prod có 0 phiếu hoàn cọc.** Tiền hoàn rò qua **3 cửa** không sinh phiếu chi `DEPOSIT_REFUND`:

| Cửa | Trước | Sau |
|---|---|---|
| Nhận xe không giữ cọc (`performReceive`) | hoàn tại chỗ, không phiếu | tự tạo phiếu CHI "Hoàn trả tiền cọc", cùng @Transactional |
| Đổi trạng thái tay 6→4 (`updateBookingStatus`) | cho qua, không bút toán | chặn, bắt đi qua dialog Xác nhận hoàn cọc |
| Nút Đóng hợp đồng từ đơn chờ hoàn cọc (`finishBooking`) | cho qua, không bút toán | chặn (review bắt được, suýt sót) |

- Từ giờ **chỉ còn 1 đường** ra khỏi "Chờ hoàn cọc" → Hoàn thành: dialog `confirmRefund` — nơi duy nhất quyết toán cọc + sinh phiếu.
- Test: `PerformReceiveDepositRefundLedgerTest` + TC-G11-05 (5 test). Qua 2 vòng review. Suite **689/0/0**.
- ⚠️ Lưu ý sau deploy: dropdown FE vẫn hiện lựa chọn "Hoàn thành" cho đơn chờ hoàn cọc (bấm sẽ ăn lỗi BE) → task FE nhỏ ẩn lựa chọn.

---

## CHỜ LEAD QUYẾT (chưa code được)

### 🔧 G1 🔴 — Phí bảo dưỡng không sinh phiếu chi → chi phí = 0  · ĐANG CODE (`feat/g1-maintenance-expense`)
**Nguyên nhân trực tiếp "chi phí = 0, lợi nhuận = doanh thu chưa trừ xu nào".** `MaintenanceServiceImpl` lưu tiền vào `maintenance_tickets.total_amount` nhưng không tạo phiếu chi; báo cáo chỉ đọc bảng `transactions`. Bảng đang rỗng → chưa thiệt hại, nhưng nổ ngay khi nhập phiếu đầu tiên.
- **✅ Lead chốt 15/06:** ghi nhận chi phí lúc phiếu **COMPLETED**.
- **Đang làm:** inject TransactionRepository, tạo phiếu chi `MAINTENANCE_COST` (đã có sẵn prod, id=6 type=2) khi ticket COMPLETED, cùng @Transactional; sửa amount → void+tạo lại; hủy/revert → đảo. Liên kết qua cột mới `expense_transaction_id` trên `maintenance_tickets` (bảng rỗng → migration zero-risk, lead apply tay).

### ⏳ G3 🟠 — Hoàn tiền thuê & đảo phụ thu bị tính nhầm thành chi phí
`RENTAL_REFUND`/`SURCHARGE_REVERSE` là phiếu chi nhưng bản chất là hoàn/đảo thu, không nằm trong exclude-list 2 query báo cáo chi phí → bị tính như chi phí vận hành. Chưa phát sinh trên prod (2 category chưa tồn tại) nhưng nổ ngay lần đầu hủy đơn đã thu tiền.
- **Lead 15/06:** "cọc tính riêng không cho vào doanh thu" — đúng, và CỌC thì code đã loại sẵn (DEPOSIT_COLLECT/DEPOSIT_REFUND). Nhưng G3 nói về hoàn **TIỀN THUÊ** (tiền thuê LÀ doanh thu), không phải cọc → câu hỏi gốc vẫn treo.
- **❓ Câu chờ chốt (ví dụ số):** khách thuê 3tr đã trả, hủy đơn hoàn lại 1tr. (A) doanh thu = 2tr (giảm doanh thu); (B) doanh thu vẫn 3tr, 1tr ghi thành chi phí (sai gấp đôi); (C) doanh thu vẫn 3tr, 1tr không tính vào đâu cả (loại khỏi chi phí). Latent — không gấp.

### ⬜ G4 🔴 — Gia hạn tăng tiền nhưng không thu, không tạo phiếu thu  · SẴN SÀNG CODE
`extendBooking` đổi `manualTotalAmount`/`rentalPrice` nhưng không đụng `paidAmount`, không tạo phiếu (khác hẳn changeCar có nhánh PAY_NOW/PAY_LATER) → nợ ngầm; NV thu tiền mặt không có chỗ ghi.
- **✅ Lead chốt 15/06:** gia hạn **LUÔN THU NGAY, không cho nợ** (đúng chính sách không-nợ).
- **Hướng:** extendBooking khi tăng tiền → tạo phiếu THU phần chênh + cộng paidAmount ngay (tái dùng createRentalPaymentReceipt như changeCar PAY_NOW); không có nhánh ghi nợ. Việc tiếp theo sau G1.

### ⏳ G8 🟠 — Tịch thu cọc khi SEIZED không sinh phiếu/doanh thu
Chuyển SEIZED chỉ đổi status + Telegram, không bút toán → cọc tịch thu vẫn nằm "tiền giữ hộ". Latent (0 đơn SEIZED).
- **Lead 15/06: chưa có hướng xử lý → ĐỂ SAU.** Khi nào nghiệp vụ rõ (tịch thu toàn bộ/một phần, category) thì làm.

### ⏳ G5 🟡 — Hai báo cáo chi phí dùng hai trục ngày khác nhau
`/report/revenue` tính chi phí theo ngày giao xe (`start_time`), `/report/expense` theo ngày lập phiếu (`transaction_date`). **Đã xác minh đây là CHỦ ĐÍCH** (comment code), không phải bug. Latent (chi phí=0).
- **Lead 15/06: chưa hiểu** → giải thích lại: có 2 màn cùng hiện "chi phí". Cùng 1 khoản chi, màn Báo-cáo-doanh-thu xếp vào tháng theo **ngày giao xe của HĐ**, màn Báo-cáo-chi-phí xếp theo **ngày lập phiếu**. Lọc cùng 1 khoảng ngày → tổng chi phí 2 màn lệch nhau. (Lưu ý: chi phí bảo dưỡng G1 KHÔNG gắn booking nên rơi vào transaction_date ở cả 2 màn → G1 không kích hoạt lệch này; lệch chỉ với phiếu gắn HĐ.)
- **❓ Câu chờ chốt:** chọn 1 trục chung cho cả 2 màn — đề xuất theo **ngày lập phiếu** (tiền ra ngày nào tính ngày đó, dễ đối soát két). Không gấp.

### ⏳ G2 🔴 — Doanh thu tính từ rentalPrice, không đối chiếu tiền thực thu
Báo cáo lấy doanh thu = rental_price pro-rata cho mọi đơn status≠1,2 (kể cả 303 đơn chờ hoàn cọc), không bao giờ so paid_amount/phiếu thu.
- **Lead 15/06: chưa hiểu** → giải thích lại bằng số: đơn thuê giá 3tr, báo cáo ghi doanh thu 3tr theo GIÁ trên đơn, bất kể khách thực đưa bao nhiêu / đã hoàn lại bao nhiêu. Không màn nào cho thấy "doanh thu ghi" lệch "tiền thực vào két". (Chính sách không-nợ giảm bớt phần lệch do thiếu thu, nhưng 303 đơn chờ hoàn cọc vẫn cộng full doanh thu trong khi đang giữ tiền sẽ trả lại.)
- **Đề xuất (ít rủi ro):** thêm cột "đã thu thực tế" + "chênh lệch" cạnh "doanh thu ghi nhận" để lệch tự nổi, KHÔNG đổi cách tính. **❓** 303 đơn chờ hoàn cọc tính full hay trừ phần sẽ hoàn?

### ⏳ G6 🟠 — Phí hủy & hoa hồng chỉ ghi field, không vào sổ
`cancellationFee` (doanh thu giữ lại) và `commissionAmount` (chi phí trả người giới thiệu) chỉ set field, không sinh phiếu. Cả 2 = 0 trên prod (tính năng chưa dùng).
- **Lead 15/06: phần hoa hồng (commission) hiện chưa dùng → HOÃN.** Phí hủy (cancellationFee) cũng = 0/chưa dùng → hoãn cả mục. Khi nào bật tính năng thì làm: cancelBooking phí hủy>0 → phiếu THU `CANCELLATION_FEE`.

### ⏳ G7 🟡 — Đơn kẹt vĩnh viễn ở CHANGING_CAR
Từ status 9 chỉ có lối ra 9→3 qua performChangeCarDelivery; không hủy/revert được. Latent (0 đơn status 9). Không rò tiền (khoản treo chưa vào paidAmount).
- **Lead 15/06: chưa hiểu** → giải thích lại: "Đang đổi xe" (status 9) là lúc xe gặp sự cố, đang chờ giao xe khác cho khách. Hiện chỉ có 1 đường ra: giao được xe mới. Nếu không giao được (khách hủy, hết xe thay) → đơn **kẹt mãi ở "Đang đổi xe"**, không hủy/quay lại được, khoản chênh tiền treo thành dữ liệu rác. Chưa xảy ra (0 đơn).
- **❓ Câu chờ chốt:** cho phép hủy / quay lại đơn đang kẹt "Đang đổi xe" không? Không gấp.

### ⬜ G9 🟡 — Ví / công nợ khách là cột chết  · SẴN SÀNG (đụng FE)
`wallet_balance`, `debt_amount` chỉ khởi tạo 0, không code nào ghi, nhưng API admin vẫn trả về (số giả). 0/2500 khách có giá trị.
- **✅ Lead chốt 15/06:** AMZ không cho khách nợ → feature công nợ không cần → **ẩn 2 field**. Không xóa cột DB.
- **Hướng:** bỏ 2 field khỏi response chi tiết khách (BE) + ẩn chỗ hiển thị trên panel admin (FE). Cần kịch bản test tay cho lead. Việc nhỏ, làm sau G1/G4.

---

## VIỆC NGOÀI CODE (lead/đội vận hành)

| # | Việc | Quy mô | Ghi chú |
|---|------|--------|---------|
| V1 | Rà 128 đơn "Chờ hoàn cọc" quá 30 ngày | tiền thật | Đơn nào đã trả khách → bấm Xác nhận hoàn cọc cho đúng sổ. Sửa code xong mà không ai bấm thì sổ vẫn rỗng. |
| V2 | Đối chiếu 29 đơn đã đóng treo 58tr cọc | tiền thật | Xác minh đã trả khách chưa → backfill phiếu + đưa collected_deposit về 0 bằng SQL một lần (agent sinh file, lead apply tay). |
| V3 | Backfill phiếu cho đơn cũ có refund_amount | dữ liệu | 37 đơn COMPLETED có refund_amount 19.5tr nhưng 0 phiếu (G11 chỉ đúng từ giờ, không hồi tố). Làm/bỏ? |
| V4 | confirmRefund có nên enforce thu đủ? | nghiệp vụ | Sau G11 khóa 6→4, đường duy nhất `confirmRefund` KHÔNG gọi validateFullPayment. Theo chính sách KHÔNG-NỢ (15/06), nên thêm check thu đủ vào confirmRefund — **chờ lead xác nhận** vì là thay đổi nghiệp vụ. |
| V5 | Seed master-data category hệ thống | hạ tầng | Nên có migration seed SURCHARGE_COLLECT/REVENUE/DEPOSIT_REFUND để môi trường dựng mới không vấp orElseThrow. |

---

## Đề xuất gốc (xử lý nhiều lỗ hổng cùng khuôn)

`transactions` là **sổ cái duy nhất** cho mọi dòng tiền; field tiền trên Booking/MaintenanceTicket chỉ là đầu vào, không đọc độc lập. Làm 3 việc này gom gọn G1/G3/G4/G6/G8:
1. Chốt sổ trong @Transactional cho từng sự kiện — mỗi sự kiện sinh/đảo đúng 1 phiếu gắn refType+refId, tái dùng generateTransactionCode. *(G11 đã áp dụng đúng khuôn này — tham chiếu mẫu.)*
2. Chuẩn hóa dùng chung: 1 hằng "code không phải thu/chi thực" cho các query báo cáo (vá G3); 1 trục ngày + quy tắc lọc bến chung (vá G5).
3. Thêm đối soát định kỳ: so SUM(rental_price) vs SUM(paid_amount) vs SUM(phiếu thu) — lệch phải nổi lên báo cáo (vá G2, G4).
