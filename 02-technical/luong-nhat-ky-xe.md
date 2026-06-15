# Luồng nhật ký xe (`booking_car_history`)

> Cập nhật: 2026-06-15 · Nguồn: đã đọc `BookingCarHistoryServiceImpl.java`, `BookingServiceImpl.java`, `ReportFillRateServiceImpl.java` (xanh-service) + đo dữ liệu prod.
> Liên quan: [`cach-tinh-ty-le-lap-day.md`](./cach-tinh-ty-le-lap-day.md) — bảng này là **nguồn dữ liệu** cho tỉ lệ lấp đầy (F5).

Tài liệu này mô tả **vòng đời** của bảng `booking_car_history` (nhật ký xe): nó là gì, ghi ở đâu, và ảnh hưởng thế nào tới báo cáo tỉ lệ lấp đầy.

---

## 1. Bảng này để làm gì

`booking_car_history` là bảng **soi gương** của đơn thuê, ghi lại **từng khoảng thời gian một chiếc xe ở với khách** của 1 đơn. Mỗi dòng (row) trả lời đúng 1 câu:

> "Đơn X — xe Y — ở với khách từ `fromDate` đến `toDate`."

**Vì sao cần bảng riêng, không đọc thẳng `booking.car_id`?**
Sau khi **đổi xe**, `new_bookings.car_id` chỉ còn lưu **xe cuối cùng**. Nếu đếm theo `car_id` thì những ngày xe cũ đã chạy bị mất sạch. Bảng nhật ký giữ lại đầy đủ từng chặng → tỉ lệ lấp đầy tính đúng cho **từng xe**.

**Quy tắc:** 1 đơn = **ít nhất 1 dòng**. Đơn có đổi xe → nhiều dòng nối tiếp nhau, không chồng ngày.

### Cấu trúc dòng

| Cột | Ý nghĩa |
|-----|---------|
| `booking_id` | thuộc đơn nào (trỏ `new_bookings.id`) |
| `car_id` | xe nào (trỏ `new_cars.id`) |
| `from_date` | ngày bắt đầu chặng (chỉ ngày, không giờ) |
| `to_date` | ngày kết thúc chặng |
| `reason` | lý do đổi xe (nếu là dòng mở khi đổi xe) |
| `created_by` | user tạo dòng |

> Bảng **không có cột trạng thái đơn**. Tỉ lệ lấp đầy tự lọc trạng thái ở tầng truy vấn (xem mục 5).

---

## 2. Ba thời điểm GHI nhật ký

Toàn bộ việc ghi nằm ở `BookingCarHistoryService`, được `BookingServiceImpl` gọi tại **3 thời điểm**:

| # | Thời điểm | Hàm | Ghi gì | Transaction |
|---|-----------|-----|--------|-------------|
| 1 | **Tạo đơn** (`createBooking`) | `createInitialRow` | 1 dòng `[startDate, endDate]` cho xe ban đầu | `REQUIRES_NEW` + try/catch (best-effort) |
| 2 | **Đổi xe — bước hiện trường** (`change-car/deliver`) | `closeAndOpenNew` | đóng dòng xe cũ (`to_date = ngày đổi − 1`), mở dòng xe mới `[ngày đổi, to_date cũ]` | cùng transaction (nguyên tử) |
| 3 | **Gia hạn / rút ngắn** (`extendBooking`) | `updateLatestToDate` | đồng bộ `to_date` của **dòng mới nhất** = ngày kết thúc mới | cùng transaction (nguyên tử) |

### 2.1 Tạo đơn — best-effort
Ghi dòng đầu chạy trong transaction riêng (`REQUIRES_NEW`) + bọc `try/catch`. Nếu ghi lỗi → **đơn vẫn được tạo**, chỉ log cảnh báo. Mục đích: lỗi nhật ký không được làm hỏng việc tạo đơn (vốn nhiều bước). Hệ quả: đơn có thể **thiếu dòng nhật ký** → phải backfill (xem mục 4).

### 2.2 Đổi xe — chia ngày sạch
Khi đổi xe ở `swapDate`:

| Xe | Khoảng nhật ký |
|----|----------------|
| Xe cũ | đóng: `to_date = swapDate − 1` |
| Xe mới | mở: `from_date = swapDate` → `to_date` = ngày kết thúc cũ |

→ **Không chia đôi đều, không tính trùng.** Mỗi xe gánh đúng số ngày thực chạy. Mốc cắt = **ngày giao xe mới thực tế** (`LocalDate.now()`), không phải ngày quyết định ở văn phòng. Lưu ý: chỉ bước **hiện trường** mới ghi nhật ký; bước **văn phòng** chốt xe mới nhưng KHÔNG ghi.

### 2.3 Gia hạn / rút ngắn — đồng bộ dòng mới nhất *(fix 2026-06-15)*
`extendBooking` đổi `new_bookings.end_time` **và** đồng bộ `to_date` của dòng nhật ký **mới nhất** cho khớp, **trong cùng 1 transaction** (hoặc cùng thành công, hoặc cùng rollback).

- **Kéo dài:** `to_date` nới ra theo ngày kết thúc mới.
- **Rút ngắn:** `to_date` cắt vào theo.
- **Sau khi đã đổi xe:** dòng mới nhất là dòng **xe mới** (xe khách đang giữ) → nới đúng dòng đó, dòng xe cũ giữ nguyên.

**Guard an toàn:** nếu ngày kết thúc mới `< from_date` của dòng mới nhất (vd rút ngắn xuống **trước ngày đổi xe gần nhất** — dữ liệu mâu thuẫn) → **ném lỗi `INVALID_REQUEST`**, cả thao tác gia hạn rollback, không tạo dòng có `to_date < from_date`.

> Trước fix (≤ 2026-06-14): `updateLatestToDate` có định nghĩa nhưng **không nơi nào gọi** → gia hạn chỉ đổi `end_time`, nhật ký kẹt nguyên → tỉ lệ lấp đầy **bỏ phần ngày gia hạn**.

---

## 3. Ví dụ vòng đời 1 đơn

Đơn TX001, thuê 01/06 → 10/06, xe A:

```
[Tạo đơn]            A: [01/06 .. 10/06]                          (1 dòng)

[Đổi sang xe B ngày 06/06]
                     A: [01/06 .. 05/06]   (đóng)
                     B: [06/06 .. 10/06]   (mở)                   (2 dòng)

[Gia hạn đến 15/06]
                     A: [01/06 .. 05/06]   (giữ nguyên)
                     B: [06/06 .. 15/06]   (dòng mới nhất nới ra) (2 dòng)
```

Tỉ lệ lấp đầy đọc 2 dòng này → xe A tính 5 ngày, xe B tính 10 ngày. Tổng đúng = số ngày đơn, không trùng, không thiếu.

---

## 4. Đơn THIẾU dòng nhật ký (backfill)

Vì nhật ký là tính năng mới (đầu 06/2026), đơn cũ tạo trước đó không có dòng → phải **backfill** (sinh dòng bù từ dữ liệu đơn). Đơn thiếu dòng sẽ **không được tỉ lệ lấp đầy đếm ngày thuê** (coi như xe trống cả kỳ) và **đổi xe sẽ lỗi** (`closeAndOpenNew` không tìm thấy dòng).

**Trạng thái prod 2026-06-15:** 435 đơn, **0 đơn thiếu dòng** (đã backfill xong). Câu kiểm:

```sql
SELECT COUNT(*) FILTER (WHERE bch.booking_id IS NULL) AS thieu_row
FROM new_bookings b
LEFT JOIN booking_car_history bch ON bch.booking_id = b.id;
```

---

## 5. Quan hệ với tỉ lệ lấp đầy (F5)

Báo cáo tỉ lệ lấp đầy **gom các dòng nhật ký** có overlap kỳ rồi tô lịch từng xe (0 = trống, 1 = thuê, 2 = bảo dưỡng). Vài điểm cần nhớ:

- Chỉ tính đơn ở trạng thái **ONGOING (3), COMPLETED (4), REFUND_PENDING (6)** — lọc ở tầng truy vấn của F5 (bảng nhật ký không tự lọc).
- Đếm theo **NGÀY**, không theo giờ: thuê vài tiếng vẫn tính cả ngày.
- Chi tiết công thức, GROSS/NET, bộ lọc: xem [`cach-tinh-ty-le-lap-day.md`](./cach-tinh-ty-le-lap-day.md).

---

## 6. Các lỗ hổng còn lại (tính tới 2026-06-15)

| Gap | Mô tả | Trạng thái |
|-----|-------|-----------|
| Đơn thiếu dòng | đơn không có dòng → đếm 0 | ✅ **Đã đóng** (0/435 đơn) |
| Gia hạn không đồng bộ | `to_date` kẹt ở ngày cũ | ✅ **Đã sửa** (branch `be/fillrate-extend-history-sync`, chờ merge + backfill 7 đơn / 52 ngày-xe) |
| **Đơn hủy còn dòng** | đơn `CANCELLED (5)` vẫn còn dòng → F5 **đếm dư** | ❌ **Treo** — prod 35 đơn. Cần quyết: tính tới ngày trả thật hay bỏ trắng? |
| Đếm theo ngày | thuê vài giờ tính cả ngày | ⚠️ **Thiết kế** — để nguyên trừ khi đổi yêu cầu |

---

## Lưu ý kiểm chứng

- Code đọc trực tiếp 2026-06-15: `BookingCarHistoryServiceImpl.java` (3 hàm ghi), `BookingServiceImpl.extendBooking` (Step 7.5), `ReportFillRateServiceImpl.java`.
- Số liệu prod (435 đơn / 0 thiếu / 7 đơn gia hạn lệch 52 ngày / 35 đơn hủy còn dòng) đo bằng query read-only ngày 2026-06-15.
- Bảng DB thật: `booking_car_history`, `new_bookings`, `new_cars`, `maintenance_tickets`, `new_station_locations`.
- File backfill gia hạn: `migration-backfill-fillrate-extend-history-2026-06-15.sql` (worktree `xanh-service-fillrate-extend`) — chờ lead apply tay.
