# D3 — Review Rò Rỉ Qua Logging (logging-leak) — BẢN SAU FIX

> Scope: Toàn bộ `lib/**` của app Flutter ADMIN `amz_xanh_admin_app`
> Bản code: SAU FIX outsource — commit `3e6d332` (07/06/2026)
> Mục tiêu chuyên sâu: Mọi `print`/`debugPrint`/`log`/`logger.*` có lộ token / PII / body response không?
> Ngày review: 08/06/2026
> (Bản này GHI ĐÈ review cũ — review cũ mô tả tình trạng TRƯỚC FIX.)

## Kết luận nhanh (cho lead)

Tin tốt: các lỗi rò rỉ log cũ ĐÃ ĐƯỢC FIX. Cụ thể, bản mới KHÔNG còn:
- In mật khẩu khi đăng nhập (luồng login giờ không log gì cả).
- In toàn bộ response đăng nhập (token access/refresh).
- In chi tiết booking (tên KH, SĐT, CCCD, GPLX).
- In danh sách tài khoản ngân hàng.

Sau khi quét toàn bộ `lib/**`: KHÔNG tìm thấy chỗ nào log ra **token**, **mật khẩu**, **body response**, hay **PII**. Tất cả lời gọi log còn lại chỉ in **đối tượng lỗi `$e`** trong khối `catch` (ví dụ "Fetch cars error: lỗi mạng..."), là thông điệp kỹ thuật, không có dữ liệu khách hàng.

Còn duy nhất **1 vấn đề tồn đọng mức LOW**: 14 lời gọi `log()` (kiểu `dart:developer`) KHÔNG tự tắt khi build bản thật (release). Hiện nội dung chúng in ra không nhạy cảm nên rủi ro thấp, nhưng để "im lặng" hoàn toàn trong production thì nên gom về cơ chế `logger` (đã tự tắt ở release).

## Hạ tầng logging (đã đánh giá)

- `lib/core/services/logger.dart`: biến `logger` đặt `level: kReleaseMode ? Level.off : Level.trace`. Nghĩa là TRONG BẢN THẬT, mọi `logger.d/e/i/w/...` đều bị TẮT. → An toàn.
- `debugPrint(...)` trong `storage_service.dart`: đều bọc trong `if (kDebugMode)` → không chạy trong bản thật. → An toàn.
- `log(...)` (`dart:developer`) trong các service nghiệp vụ: KHÔNG có cơ chế tắt ở bản thật → điểm tồn đọng (bảng dưới).

## Liệt kê TỪNG chỗ logging còn lại

| # | File:Dòng | Lệnh | Nội dung log | Lộ token/PII/body? | Severity |
|---|-----------|------|--------------|--------------------|----------|
| 1 | `lib/features/vehicles/services/vehicle_service.dart:143` | `log("Fetch cars error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 2 | `lib/features/vehicles/services/vehicle_service.dart:198` | `log("Fetch car detail error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 3 | `lib/core/services/image_service.dart:68` | `log("Pick images error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 4 | `lib/core/services/image_service.dart:84` | `log("Pick images error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 5 | `lib/core/services/image_service.dart:107` | `log("Upload images error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 6 | `lib/features/maintenance/services/maintenance_management_service.dart:45` | `log("Fetch maintenance categories error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 7 | `lib/features/maintenance/services/maintenance_management_service.dart:83` | `log("Fetch maintenance categories error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 8 | `lib/features/maintenance/services/maintenance_management_service.dart:137` | `log("Fetch maintenances error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 9 | `lib/features/finance/services/financial_management_service.dart:46` | `log("Fetch transaction categories error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 10 | `lib/features/promotion/services/promotion_management_service.dart:55` | `log("Fetch promotions error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 11 | `lib/features/promotion/services/promotion_management_service.dart:195` | `log("Delete promotion error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 12 | `lib/features/payments/services/payment_method_service.dart:107` | `log("Fetch payment methods error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 13 | `lib/features/place/services/city_management_service.dart:52` | `log("Fetch cities error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 14 | `lib/features/place/services/station_management_service.dart:58` | `log("Fetch station error: $e")` | Chỉ exception | KHÔNG | LOW (không tắt ở release) |
| 15 | `lib/features/banners/screens/banners_screen.dart:853` | `logger.e('Error picking image file: ...')` | Thông điệp lỗi chọn ảnh | KHÔNG (tắt ở release) | OK |
| 16 | `lib/features/banners/screens/banners_screen.dart:1173` | `logger.e('Error picking image file: ...')` | Thông điệp lỗi chọn ảnh | KHÔNG (tắt ở release) | OK |
| 17 | `lib/core/services/storage_service.dart:64,108,149,181,200` | `debugPrint('Error ...: $e')` (trong `if (kDebugMode)`) | Chỉ exception | KHÔNG (tắt ở debug) | OK |

> Lưu ý dòng 181/200 `storage_service.dart`: câu mô tả có CHỮ "secure tokens"/"local data" nhưng KHÔNG in giá trị token. Đều bọc `if (kDebugMode)`.

## Phân tích rủi ro (đã kiểm chứng)

- Grep toàn bộ pattern `log/debugPrint/print` kết hợp `token|Bearer|body|response|password|Authorization` → **0 kết quả** lộ dữ liệu nhạy cảm.
- Luồng login/logout (`auth_service.dart`): KHÔNG có lệnh log nào. → Tốt.
- `parseXanhResponse` (`admin_api_response.dart`): KHÔNG log body khi parse lỗi, chỉ trả message tiếng Việt. → Tốt.
- Token lưu trong `flutter_secure_storage`, không in ra log. Remember-me KHÔNG lưu/không log mật khẩu (`getRememberMePassword()` luôn trả `null`). → Tốt.

## Khuyến nghị (LOW — không chặn release)

Gom 14 lời gọi `log(...)` (`dart:developer`) về `logger` package để chúng tự tắt ở bản thật:
- Thay `import 'dart:developer';` + `log("... error: $e")` bằng `logger.e("... error: $e")` (`logger` đã export sẵn qua `core.dart`).
- Lý do: `dart:developer log()` vẫn ghi ra log hệ thống khi build release. Hiện nội dung chỉ là đối tượng lỗi (không nhạy cảm), nhưng nếu sau này lỡ thêm dữ liệu (vd `$response`) vào chuỗi log thì sẽ rò rỉ ngầm mà không ai để ý. Đưa về `logger` để có một điểm kiểm soát thống nhất + tự tắt ở release.

## Tổng kết

- File đã review: 87 file `.dart` trong `lib/**` (grep toàn bộ + đọc chi tiết hạ tầng logging, auth, storage, api-response, image, services).
- Số chỗ logging còn lại: 22 (14 `log`, 2 `logger.e`, ~6 `debugPrint` trong `if(kDebugMode)`).
- Số chỗ lộ token/PII/body: **0**.
- Severity cao nhất hạng mục logging-leak: **LOW** (chỉ vì `dart:developer log()` không tắt ở release).
- Các lỗi rò rỉ log cũ (mật khẩu, token, booking PII, bank list): **ĐÃ FIX**.
