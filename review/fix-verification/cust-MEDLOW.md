# Kiểm chứng fix CUSTOMER app — nhóm MEDIUM + LOW

Phạm vi: `booking-car-app` nhánh `temp` (HEAD `250f5bd Fix medium bug`).
Lưu ý: KHÔNG có response report riêng của outsource cho app customer → cột "Claim" để "(không có response)". `Khớp claim?` = true khi thực tế là FIXED (đúng kỳ vọng phải sửa), còn lại đánh giá trung thực theo code.

**Tổng kết:** FIXED = 11 | PARTIAL = 1 | NOT_FIXED = 4 | claim-mismatch = 4

(claim-mismatch tính theo: outsource không gửi response nhưng các finding NOT_FIXED/PARTIAL nghĩa là chưa hoàn thành theo điều kiện nghiệm thu — đánh dấu để lead biết còn nợ.)

| ID | Tiêu đề | Claim | Thực tế | Khớp claim? | Bằng chứng | Ghi chú |
|----|---------|-------|---------|-------------|------------|---------|
| MED-01 | Release build không bật code obfuscation | (không có response) | NOT_FIXED | Không | Không tìm thấy flag `--obfuscate`/`--split-debug-info` trong repo; không có build script (chỉ có README.md, AVATAR/KYC guide) | Vẫn cần thêm bước build obfuscate khi phát hành |
| MED-02 | Hardcode 3 base URL — không có cấu hình env | (không có response) | FIXED | Có | api_endpoints.dart:4-11 dùng `String.fromEnvironment('AUTH_BASE_URL'/'BOOKING_BASE_URL')` có defaultValue | Đã có cơ chế env; mặc định trỏ về `api-portal.amzholdings.vn` (AMZ) |
| MED-03 | iOS thiếu NSCameraUsageDescription + NSPhotoLibraryUsageDescription | (không có response) | FIXED | Có | ios/Runner/Info.plist:50-53 đã có `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription` | Thiếu `NSPhotoLibraryAddUsageDescription` (chỉ optional); 2 key gây crash KYC đã có → hết crash |
| MED-04 | Refresh token logic phụ thuộc string match tiếng Việt | (không có response) | FIXED | Có | api_client.dart:302-312 kiểm `responseCode == 400 \|\| '400'` thay vì `message.contains('Token')` | Đã chuyển sang check responseCode; dùng mã 400 (không phải 401 như đề xuất) nhưng đã hết phụ thuộc chuỗi tiếng Việt |
| MED-05 | Update avatar chỉ check HTTP statusCode, không check responseCode | (không có response) | NOT_FIXED | Không | account_page.dart:663-665 vẫn `if (updateResponse.statusCode == 200)` rồi báo "Cập nhật avatar thành công" | Chưa kiểm responseCode trong body → BE từ chối (vd quota S3) app vẫn báo OK |
| MED-06 | depositMethodId hardcode (Momo=1/ZaloPay=2/VNPay=3) | (không có response) | FIXED | Có | booking_confirm_page.dart:69 `getPaymentMethods()`, :396-397 render từ list API theo `bankCode`, :56/:530 `_selectedPayment` là String bankCode (mặc định 'CASH') | Đã lấy phương thức + mã từ BE, map theo chuỗi code thay vì số nguyên cứng |
| MED-07 | Tên app vẫn là template "Cash Flow Management" | (không có response) | FIXED | Có | pubspec.yaml:1-2 `name: amazing`, `description: "Amazing Xanh - Thuê xe"`; main.dart:47 `title: 'Amazing Xanh'` | Đã đổi tên app |
| MED-08 | Số điện thoại placeholder fake khi profile null | (không có response) | FIXED | Có | account_page.dart:1683 `_profileData?['phoneNumber'] ?? '(Chưa cập nhật)'` (số fake `+0134 455 890` đã biến mất) | Đã thay placeholder fake bằng '(Chưa cập nhật)' |
| MED-09 | Kiểm token hợp lệ bằng token.length > 10 | (không có response) | FIXED | Có | splash_page.dart:32-65 viết lại: gọi `refreshAccessToken` rồi check `responseCode == "200"`; không còn `token.length > 10` | Đã bỏ check độ dài, dùng refresh + responseCode thực |
| MED-10 | 52 hàm _buildXxx() trả widget — app giật lag | (không có response) | PARTIAL | Không | `grep "Widget _build" lib/` còn 10 hàm (giảm mạnh từ 52 nêu trong report) nhưng pattern vẫn tồn tại, chưa tách hết thành widget class | Đã giảm đáng kể nhưng chưa triệt để |
| MED-11 | requestTime/startTime không có timezone indicator | (không có response) | FIXED | Có | api_service.dart:219-220,252-253,285-286 dùng `dateFormatter.format(startTime.toUtc())` (trước đây format giờ local) | Đã chuyển sang UTC nhất quán → hết lệch 7h; format string vẫn thiếu hậu tố 'Z' literal nhưng giá trị đã là UTC |
| MED-12 | MediaQuery.of(context).size khai báo không dùng — thừa rebuild | (không có response) | FIXED | Có | grep `MediaQuery` trong login_page.dart → No matches; dòng `final media = MediaQuery...` đã bị xóa | Đã xóa khai báo thừa |
| LOW-01 | analysis_options.yaml thiếu strict mode | (không có response) | NOT_FIXED | Không | analysis_options.yaml chỉ có 1 dòng `include: package:flutter_lints/flutter.yaml`; không có `strict-casts/strict-inference/strict-raw-types` | Chưa bật strict mode |
| LOW-02 | deleteAccount() nuốt exception im lặng | (không có response) | NOT_FIXED | Không | api_service.dart:353-369 vẫn `try { ... } catch (e) { return null; }` | Caller vẫn không phân biệt lỗi mạng vs lỗi logic |
| LOW-03 | Email regex yếu, chấp nhận a@b.c | (không có response) | NOT_FIXED | Không | forgot_password_page.dart:31 `RegExp(r"^[^@\s]+@[^@\s]+\.[^@\s]+")` — vẫn chấp nhận a@b.c | Chưa siết regex / chưa dùng email_validator |
| LOW-04 | Thiếu FlutterError.onError + ErrorWidget.builder | (không có response) | NOT_FIXED | Không | main.dart:24-26 `void main() { runApp(const MainApp()); }` — không có FlutterError.onError/ErrorWidget.builder | Crash vẫn hiện màn hình đỏ mặc định |
