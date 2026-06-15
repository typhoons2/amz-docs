# Cách tính Doanh thu — trang `/report/revenue`

> Trang: `https://admin.amazingxanh.com.vn/report/revenue`
> Nguồn code (đã đối chiếu 2026-06-09): `ReportServiceImpl.getRevenueReport`, `BookingRevenueCalculator.calcByDay`, `BookingRepository.findForRevenueReport`, `TransactionRepository.findTransactionsForReport`.

## 0. Trang hiển thị gì

- **Tổng doanh thu**, **Tổng chi phí**, **Lợi nhuận** (= Doanh thu − Chi phí).
- **Biểu đồ** theo **ngày** hoặc **tháng** (tham số `groupBy = DAY | MONTH`, mặc định DAY).
- Bộ lọc: **khoảng ngày** (từ–đến) và **bến xe** (station, có thể bỏ trống = tất cả bến).

Công thức gốc: **Lợi nhuận = Tổng doanh thu − Tổng chi phí**. Hai vế tính từ **2 nguồn khác nhau** (doanh thu từ hợp đồng, chi phí từ phiếu chi) — xem dưới.

---

## 1. DOANH THU — tính theo HỢP ĐỒNG, rải đều theo ngày (pro-rata)

> ⚠️ **Điểm dễ hiểu nhầm nhất:** Doanh thu ở đây **KHÔNG phải tiền đã thu thực tế**. Nó là **tiền thuê của hợp đồng, chia đều ra từng ngày thuê**, rồi cộng những ngày rơi vào khoảng lọc.

### Công thức

```
Tiền thuê / ngày   = Tổng tiền thuê hợp đồng (rental_price) ÷ Tổng số ngày thuê
Tổng số ngày thuê  = (ngày trả − ngày nhận) + 1   (tối thiểu 1)
Doanh thu trong khoảng = (Tiền thuê / ngày) × (số ngày hợp đồng nằm trong khoảng lọc)
```

- `rental_price` trong DB là **TỔNG tiền thuê cả kỳ** (không phải giá/ngày).
- Mỗi ngày thuê được gán đúng `rental_price / tổng ngày`. Báo cáo cộng các ngày này lại.

### Ví dụ bằng số

Hợp đồng thuê **01/06 → 10/06** (10 ngày), tổng tiền thuê **10.000.000đ** → **1.000.000đ/ngày**.

| Khoảng lọc báo cáo | Số ngày HĐ nằm trong | Doanh thu hiện ra |
|--------------------|----------------------|-------------------|
| 01/06 – 30/06 (cả tháng 6) | 10 | **10.000.000đ** |
| 01/06 – 05/06 | 5 | **5.000.000đ** |
| 06/06 – 10/06 | 5 | **5.000.000đ** |
| 01/07 – 31/07 (không trùng) | 0 | **0đ** |

→ Dù khách đã trả đủ 10tr ngay từ đầu, nếu lọc 01–05/06 thì báo cáo chỉ hiện **5tr** (phần doanh thu "thuộc về" 5 ngày đó).

### Hợp đồng nào được tính

Query lấy đơn **status NOT IN (1, 2)** + có giao nhau với khoảng lọc:

| Trạng thái đơn | Có tính doanh thu? |
|----------------|--------------------|
| PENDING (1), CONFIRMED (2) | ❌ Không (chưa giao xe) |
| CANCELLED (5) **chưa thu đồng nào** (đã trả=0 và cọc=0) | ❌ Không (hủy trước khi giao) |
| CANCELLED (5) **đã thu tiền** (đã trả>0 hoặc cọc>0) | ✅ Có (hủy sau khi giao, đã phát sinh) |
| ONGOING (3), COMPLETED (4), REFUND_PENDING (6), INCIDENT (7), SEIZED (8), CHANGING_CAR (9) | ✅ Có |

Điều kiện trùng khoảng: `ngày nhận ≤ cuối khoảng` **và** `ngày trả ≥ đầu khoảng`.

### Lưu ý quan trọng về doanh thu

1. **Chỉ là tiền thuê gốc của hợp đồng** (`rental_price`). **KHÔNG** gồm phụ thu, phí giao xe tận nơi, dịch vụ thêm... → con số doanh thu này có thể **thấp hơn** tổng tiền khách thực trả.
2. **Doanh thu ≠ tiền thực thu trong kỳ.** Hợp đồng đang thuê kéo dài sang tháng sau sẽ "rải" doanh thu sang các ngày tương lai, kể cả khi khách đã trả hết tiền từ đầu.
3. **Đổi xe:** nếu giá thuê đổi khi đổi xe, cả kỳ dùng giá `rental_price` hiện tại của đơn (không tách giá cũ/mới theo đoạn).

---

## 2. CHI PHÍ — tính theo PHIẾU CHI thực tế

Lấy các **phiếu chi** (`transactions` có `type = 2`), **loại trừ** phiếu cọc (`DEPOSIT_COLLECT`, `DEPOSIT_REFUND`) vì cọc không phải chi phí kinh doanh.

Các danh mục chi (hệ thống) gồm: **Chi xăng dầu** (`GAS_OUT`), **Chi sửa chữa** (`REPAIR_OUT`), **Chi bảo hiểm** (`INSURANCE_OUT`), **Chi phí khác** (`OTHER_OUT`)...

### Ngày tính chi phí

- Phiếu chi **gắn với 1 hợp đồng** → tính vào **ngày BẮT ĐẦU hợp đồng** (`booking.start_time`), KHÔNG phải ngày bấm phiếu.
- Phiếu chi **không gắn hợp đồng** → tính vào **ngày bấm phiếu** (`transaction_date`).

---

## 3. LỢI NHUẬN & biểu đồ

```
Tổng doanh thu  = Σ doanh thu pro-rata của mọi hợp đồng (mục 1)
Tổng chi phí    = Σ phiếu chi type=2, trừ cọc (mục 2)
Lợi nhuận       = Tổng doanh thu − Tổng chi phí
```

- Biểu đồ chia theo **ngày** (mỗi cột 1 ngày) hoặc **tháng** (gộp cả tháng).
- Mỗi cột hiển thị: doanh thu, chi phí, lợi nhuận của kỳ đó.
- Kỳ nào không có dữ liệu vẫn hiện cột = 0 (không bị nhảy cách).

---

## 4. ⚠️ Liên quan: phí bảo dưỡng KHÔNG tự vào chi phí

Phí ở **phiếu bảo dưỡng** (`maintenance_tickets.total_amount`) **không tự sinh phiếu chi** → **không** lọt vào "Tổng chi phí" của báo cáo này. Chỉ vào báo cáo khi admin **tự tạo phiếu chi "Chi sửa chữa" (`REPAIR_OUT`)** cho khoản thực chi.

→ Nếu chỉ nhập phiếu bảo dưỡng mà quên tạo phiếu chi, **Lợi nhuận bị báo cao hơn thực tế** đúng bằng tiền sửa xe. (Đang chờ BE xác nhận đây là chủ đích hay sót — xem ghi chú trong tài liệu luồng bảo dưỡng.)

---

## 5. Bảng tham chiếu nhanh

| Thành phần | Nguồn dữ liệu | Ghi chú |
|------------|---------------|---------|
| Doanh thu | `new_bookings.rental_price` rải theo ngày | Chỉ tiền thuê gốc; không gồm phụ thu/phí giao |
| Đơn được tính | `findForRevenueReport`: status NOT IN (1,2), trùng khoảng | CANCELLED chỉ tính nếu đã thu tiền |
| Chi phí | `transactions` type=2, trừ cọc | Phí bảo dưỡng chỉ vào nếu có phiếu chi REPAIR_OUT |
| Ngày của chi phí | ngày bắt đầu HĐ (nếu gắn đơn) / ngày bấm phiếu | |
| Lợi nhuận | Doanh thu − Chi phí | |
| Lọc bến | `pickup_station_id` → `return_station_id` → bến của xe → bến NV bấm phiếu | 3–4 tầng fallback |
