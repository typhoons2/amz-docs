# D5 — Crash / Null-safety (app Flutter `amz_xanh_admin_app`)

- Commit review: `3e6d332` (07/06/2026) — bản code SAU FIX outsource
- Phạm vi D5: điểm CRASH nguy hiểm — force-unwrap `!`, `late` chưa init, parse JSON/ngày không guard
- Ngày review: 2026-06-08
- Diễn giải cho người không rành code: "khi server trả dữ liệu hơi khác bình thường (ngày sai định dạng, số là chuỗi, thiếu field), màn hình này VĂNG/TRẮNG thay vì hiện lỗi nhẹ".

> LƯU Ý: bản này đã được làm cứng KHÁ TỐT. Nhiều lỗi cũ (DateTime.parse trong vehicle_detail, force-unwrap path file ảnh tin tức, ép số tiền cứng, truy cập lồng nhau không guard ở model car/station/city) ĐÃ ĐƯỢC SỬA ở commit này. Báo cáo dưới chỉ liệt kê lỗi CÒN LẠI trên code thực tế.

## Tóm tắt nhanh

- **CRITICAL còn sót:** 2 hộp thoại Nhận xe / Giao xe vẫn parse ngày bằng `DateTime.parse(...)` (KHÔNG phải `tryParse`) ngay trong lúc vẽ, không try/catch → server trả ngày sai định dạng = **trắng/đơ hộp thoại**, nhân viên không giao/nhận xe được.
- **HIGH:** vài màn hình ép kiểu cứng `as int` / `as num` trên dữ liệu Map từ API trong vòng build danh sách → 1 bản ghi xấu (status/tiền là chuỗi) làm **sập cả danh sách**.
- **MEDIUM:** `setState` trong `finally` không kiểm tra `mounted` (rời màn hình giữa chừng → lỗi setState-after-dispose).

## Bảng chi tiết

| File:dòng | Mức độ | Vấn đề | Cách sửa |
|---|---|---|---|
| features/delivery_receive/widgets/receive_dialog.dart:306-307 | CRITICAL | Trong lúc VẼ hộp thoại "Nhận xe": `DateFormat(...).format(DateTime.parse(_asString(summary['startTime'])!))` và `endTime`. Chỉ guard `!= null` (dòng 302-303), KHÔNG kiểm định dạng; `DateTime.parse` (không phải tryParse) + `!` không try/catch. Ngày lạ → **trắng hộp thoại nhận xe ngay khi mở**. Lưu ý: phần tiền NGAY BÊN DƯỚI đã được sửa an toàn (`_asNum(...) ?? 0`), riêng ngày bị bỏ sót. | Dùng `DateTime.tryParse(_asString(summary['startTime']) ?? '')` rồi kiểm null; parse lỗi thì hiện text gốc. Có thể tái dùng mẫu `format()` an toàn ở `delivery_receive_screen.dart:461-470`. |
| features/delivery_receive/widgets/delivery_dialog.dart:340-341 | CRITICAL | Y hệt trên, ở hộp thoại "Giao xe": `DateTime.parse(_asString(summary['startTime'])!)` / `endTime` trong build, không try/catch. Server trả ngày lạ → **trắng hộp thoại giao xe**. | Như trên: chuyển sang `tryParse` + kiểm null / hàm format an toàn. |
| features/vehicles/screens/create_vehicle_screen.dart:538,565,566 | HIGH | `station['id'] as int`, `spec['id'] as int`, `spec['name'] as String` khi build dropdown. `_stations`/`_specifications` nạp qua `_asMapList` (chỉ ép Map, KHÔNG chuẩn hóa id về int). Nếu backend trả `id` kiểu num/double/chuỗi hoặc `name` null → `_TypeError` khi build → **sập màn tạo xe**. Trái ngược với `car.dart` đã dùng `_asInt`. | Dùng helper phòng thủ: `_asInt(station['id'])` (bỏ qua item null), `(spec['name'] ?? '').toString()`. |
| features/contracts/screens/contracts_screen.dart:526,574 | HIGH | `(c['status'] ?? 0) as int` trong row builder của bảng & list hợp đồng. `?? 0` chỉ xử lý null; nếu `status` là String `"3"`/double → `as int` ném lỗi → **sập cả danh sách hợp đồng** (1 bản ghi xấu hỏng toàn bộ). | `final status = c['status'] is int ? c['status'] as int : int.tryParse('${c['status']}') ?? 0;` |
| features/contracts/screens/contracts_screen.dart:522-525 | MEDIUM | `(c['totalAmount'] ?? 0) as num` (và paid/remain/deposit) trong row builder. `as num` vẫn ném nếu tiền trả về dạng chuỗi → sập danh sách. | `num.tryParse('${c['totalAmount']}') ?? 0`. |
| features/contracts/screens/contract_detail_screen.dart:537 | HIGH | `(_detail!['status'] ?? 1) as int` trong `_openEditStatusDialog`. `_detail!` đã guard (return nếu null) nên `!` an toàn; nhưng `as int` không guard kiểu → status là chuỗi/double → **văng khi mở dialog sửa trạng thái**. | Parse phòng thủ như mục contracts_screen:526. |
| features/contracts/screens/contract_detail_screen.dart:1662 | MEDIUM | `(d['status'] ?? 0) as int` khi build chip trạng thái list con — cùng rủi ro kiểu. | Parse phòng thủ. |
| features/car_schedule/screens/car_schedule_screen.dart:457 | MEDIUM | `booking['status'] as int?` trong `_bookingBar`. `as int?` chỉ chịu được null, vẫn ném nếu status là String/double → **sập 1 hàng lịch xe**. | `_asInt(booking['status'])` (port helper từ model). |
| features/vehicles/screens/vehicle_detail_screen.dart:71 | MEDIUM | `finally { setState(() => _isLoading = false); }` không kiểm `mounted`. Rời màn hình khi API chưa xong → **setState sau khi widget đã hủy** → văng. (Các nhánh khác trong hàm đã kiểm `mounted`, riêng finally bị sót.) | `if (mounted) setState(() => _isLoading = false);`. |
| features/car_schedule/screens/car_schedule_screen.dart:397-398 | LOW | `(car['bookings'] as List? ?? []).map((e) => e as Map<String, dynamic>)`. Phần tử không phải Map → ném lỗi. Rủi ro thấp nhưng nên dùng `whereType<Map<String,dynamic>>()` cho nhất quán. | Thay `.map((e)=>e as Map..)` bằng `.whereType<Map<String,dynamic>>()`. |

## Đã kiểm chứng là KHÔNG còn lỗi (đối chứng, đừng báo trùng)

- `vehicle_detail_screen.dart` truy cập lồng nhau (`result['data']['result']['data']`) → ĐÃ SỬA dùng `_asMap` phòng thủ (dòng 46-48); các `DateTime.parse` (89,99) đã bọc try/catch.
- `news_screen.dart` chọn file ảnh → ĐÃ SỬA: kiểm `result.files.single.path != null` trước khi `path!` (dòng 952/954, 1287/1289).
- `car.dart` / `station.dart` / `city.dart` model → ĐÃ dùng helper `_asInt/_asNum/_asMap/_asDate` + `whereType`, không còn `json["items"]!.map(...item["data"])` không guard.
- `receive_dialog.dart` / `delivery_dialog.dart` phần TIỀN → ĐÃ SỬA (`_asNum(...) ?? 0`). Chỉ phần NGÀY còn lỗi (xem 2 dòng CRITICAL ở trên).
- `receive_dialog.dart:108` / `delivery_dialog.dart:89` `as List<Map<String,dynamic>>?` → AN TOÀN: producer `PaymentMethodService.getPaymentMethods()` đã dựng đúng `List<Map<String,dynamic>>` (dòng 49-55).
- `customers_screen.dart` / `drivers_screen.dart` `as String`/`as int` → AN TOÀN: dữ liệu là literal hardcode tại chỗ (dummy, chưa nối API).
- `delivery_receive_screen.dart:465` và `bookings_screen.dart:228` `DateTime.parse` → đã bọc try/catch.
- `late final` (`_tabController`, `_maintenance`, `_promotion`, `_station`, `_city`, `_controller`, `_textField`) → đều init trong `initState`/khai báo, không có đường đọc trước init.
- `StorageService._prefs` (`static late`) → AN TOÀN: `main()` await `StorageService.init()` trước `runApp` (main.dart:9). (Vẫn phụ thuộc thứ tự khởi động — rủi ro LOW.)
- Các `options[i]?.title != null ? options[i]!.title : ...`, `_selectedDate!`, `_formKey.currentState!.validate()`, `login_screen` `_lockedUntil!` → đều có guard null hoặc context an toàn.

## Khuyến nghị

1. **Sửa ngay 2 dòng CRITICAL** (receive_dialog.dart:306-307, delivery_dialog.dart:340-341) — đây là điểm trắng-màn-hình nghiêm trọng nhất còn sót.
2. Tách bộ helper parse phòng thủ (đã có trong `car.dart`/`payment_method_service.dart`) ra file dùng chung `core/utils/json_parse.dart`, rồi thay TẤT CẢ `as int`/`as num`/`as String`/`DateTime.parse` đọc trực tiếp Map API ở tầng screen bằng helper. Đây là nguồn crash chính còn lại.
