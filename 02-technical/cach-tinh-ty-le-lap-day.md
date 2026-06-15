# Cách tính tỷ lệ lấp đầy (fill-rate)

> Cập nhật: 2026-06-09 · Nguồn: đã đọc `ReportFillRateServiceImpl.java` (xanh-service)
> Endpoint: `POST /xanh/admin/reports/fill-rate` · Dùng ở **F13** (báo cáo) + **F19** (dashboard) trong `01-business/luong-nghiep-vu-tong-hop.md`.

Tài liệu này tách riêng vì fill-rate là **logic tính toán** (không phải luồng thao tác khách→admin). Giống cách `state-machine.md` tách trạng thái booking.

---

## 1. Ý tưởng

Tỷ lệ lấp đầy = **số ngày-xe có khách thuê** / **tổng số ngày-xe khả dụng**, trong 1 kỳ. Tính cho **từng xe** rồi lấy **trung bình** cả đội.

---

## 2. Nguồn dữ liệu: đọc `booking_car_history`, KHÔNG đọc `booking.car_id`

- Sau khi đổi xe, `booking.car_id` chỉ lưu **xe cuối cùng**. Nếu đếm theo `car_id` thì xe cũ bị mất hết ngày đã chạy.
- Vì vậy đếm ngày thuê đọc từ bảng **`booking_car_history`** — mỗi dòng = 1 khoảng `[fromDate, toDate]` xe đó ở với khách.
- Chỉ tính booking ở trạng thái: **ONGOING (3), COMPLETED (4), REFUND_PENDING (6)**.

---

## 2b. Dữ liệu đổ vào `booking_car_history` thế nào

Bảng này được ghi ở **3 thời điểm** (`BookingServiceImpl` gọi `BookingCarHistoryService`):

| Thời điểm | Hàm | Ghi gì |
|-----------|-----|--------|
| **Tạo booking** (`createBooking`) | `createInitialRow` | 1 dòng `[startDate, endDate]` cho xe ban đầu (theo giờ bắt đầu/kết thúc **dự kiến** của đơn) |
| **Đổi xe — bước HIỆN TRƯỜNG** (`change-car/deliver`) | `closeAndOpenNew` | đóng dòng xe cũ (`toDate = hôm nay − 1`), mở dòng xe mới `[hôm nay, toDate cũ]`. Mốc = ngày giao thực tế (`LocalDate.now()`) |
| **Gia hạn** | `updateLatestToDate` | (đã định nghĩa) cập nhật `toDate` dòng mới nhất |

**Lưu ý quan trọng (đã đọc code 2026-06-09):**

- **① Ghi lúc tạo booking là "best-effort":** chạy trong `try/catch` + transaction riêng (`REQUIRES_NEW`). Nếu ghi history lỗi → **booking vẫn được tạo**, chỉ log cảnh báo → history thiếu, phải **backfill** sau. Booking thiếu dòng history sẽ **không được fill-rate đếm ngày thuê**.
- **② Chỉ bước "hiện trường" mới ghi đổi xe:** bước "văn phòng" (`change-car`) chốt xe mới nhưng **KHÔNG** ghi history. Mốc cắt history = **ngày giao xe mới thực tế** (hôm nay), không phải ngày quyết định ở văn phòng.
- **③ ✅ ĐÃ SỬA (2026-06-15) — gia hạn nay đồng bộ history:** trước đây `updateLatestToDate` có định nghĩa nhưng **không nơi nào gọi** → `extendBooking` chỉ đổi `new_bookings.end_time`, bỏ phần ngày gia hạn. Nay đã nối `updateLatestToDate` vào `extendBooking` (Step 7.5, cùng transaction) — khớp cả kéo dài lẫn rút ngắn, có guard chặn rút ngắn xuống trước ngày đổi xe. Branch `be/fillrate-extend-history-sync` (chờ merge + backfill 7 đơn / 52 ngày-xe). Chi tiết vòng đời: xem [`luong-nhat-ky-xe.md`](./luong-nhat-ky-xe.md). **Còn treo:** đơn hủy (`CANCELLED`) vẫn còn dòng → fill-rate **đếm dư** (prod 35 đơn).

---

## 3. Chia ngày khi ĐỔI XE (câu hỏi hay gặp)

Khi đổi xe ở ngày `swapDate` (xem F08/F24):

| Xe | Khoảng được tính lấp đầy |
|----|--------------------------|
| **Xe cũ** | đóng dòng lịch sử: `toDate = swapDate − 1` |
| **Xe mới** | mở dòng mới: `fromDate = swapDate` → `toDate` = ngày kết thúc |

→ **KHÔNG chia đôi đều.** Mỗi xe gánh **đúng số ngày thực tế** nó chạy. Ranh giới sạch, **không tính trùng** ngày đổi cho cả hai.

**Ví dụ** đơn 10 ngày (ngày 1→10):
- Đổi xe ngày 6 → xe cũ: ngày 1–5 (**5 ngày**), xe mới: ngày 6–10 (**5 ngày**).
- Đổi xe ngày 3 → xe cũ: ngày 1–2 (**2 ngày**), xe mới: ngày 3–10 (**8 ngày**).

Tổng luôn đúng = số ngày của đơn, không cộng dư.

---

## 4. Đơn vị tính = NGÀY (không theo giờ)

Mỗi ngày của 1 xe có 3 trạng thái: **0 = trống, 1 = thuê, 2 = bảo dưỡng**. **Bảo dưỡng ghi đè thuê** (một ngày vừa thuê vừa bảo dưỡng → tính là bảo dưỡng).

**Hệ quả:** đổi xe lúc giữa ngày (vd 14h) → **cả ngày đổi tính cho xe mới**; xe cũ chỉ tới hết `swapDate − 1`. Không ai bị tính trùng, nhưng xe cũ "mất" phần ngày đổi.

---

## 5. Công thức GROSS vs NET

Tỷ lệ 1 xe = `số ngày thuê / mẫu số × 100`.

| Công thức | Mẫu số | Ý nghĩa |
|-----------|--------|---------|
| **GROSS** (mặc định) | tổng số ngày trong kỳ | tính cả ngày xe nằm xưởng |
| **NET** | tổng ngày trong kỳ − số ngày bảo dưỡng (tối thiểu 1) | bỏ ngày bảo dưỡng → tỷ lệ cao hơn |

**Tỷ lệ trung bình đội = trung bình cộng tỷ lệ từng xe** (không phải tổng ngày thuê / tổng ngày khả dụng).

---

## 6. Loại trừ & bộ lọc

- **Xe ký gửi (CONSIGNED) mặc định KHÔNG tính** (không thuộc đội xe công ty). Bật bằng `includeConsigned=true`.
- Có thể **ẩn xe INACTIVE** (`hideInactive`), **lọc theo bến hiện tại** (`stationId` thực tế của xe, không dùng `home_station_id`), **lọc biển số** (`plateKeyword`).
- Kỳ báo cáo **tối đa 366 ngày**.

---

## 7. Các lát cắt báo cáo trả về

- **KPI:** tỷ lệ TB, tổng ngày-xe thuê, tổng ngày-xe khả dụng, số xe đang bảo dưỡng, số hợp đồng trong kỳ, **xu hướng so kỳ trước** (kỳ liền trước cùng độ dài).
- **Theo thứ trong tuần** (T2→CN), **theo ngày** (series), **theo bến** (groups).

---

## Lưu ý kiểm chứng

- Toàn bộ ở trên đọc trực tiếp từ `ReportFillRateServiceImpl.java` ngày 2026-06-09.
- **Cảnh báo công thức trung bình:** "TB đội = trung bình cộng tỷ lệ từng xe" → xe ít ngày khả dụng vẫn cân **1 phiếu** như xe nhiều ngày (không trọng số theo số ngày). Nếu sau này muốn trọng số (xe nào khả dụng nhiều thì ảnh hưởng lớn hơn), phải đổi công thức ở `buildKpi`.
- Bảng DB thật: `booking_car_history`, `new_bookings`, `new_cars`, `maintenance_tickets`, `new_station_locations`.
