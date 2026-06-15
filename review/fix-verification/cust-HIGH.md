# Kiểm chứng fix — CUSTOMER app (booking-car-app) — nhóm HIGH-01..HIGH-11

- Nhánh code kiểm tra: `temp` (theo chỉ định lead)
- Đường dẫn code: `C:/Users/it/OneDrive/Desktop/Project/booking-car-app`
- Báo cáo gốc: `docs/REVIEW-REPORT-CUSTOMER-APP.md`
- Lưu ý: Outsource CHƯA gửi response report cho app customer → cột "Claim" ghi "(không có response)". `claimMatch = true` chỉ khi thực tế là FIXED.

## Tổng hợp
- FIXED: 9
- PARTIAL: 1 (HIGH-03)
- NOT_FIXED: 1 (HIGH-11)
- Claim-mismatch: 2 (HIGH-03, HIGH-11 — không phải FIXED trong khi mặc định coi như "đã xử lý")

| ID | Tiêu đề | Claim | Thực tế | Khớp claim? | Bằng chứng | Ghi chú |
|----|---------|-------|---------|-------------|------------|---------|
| HIGH-01 | Lịch sử / tìm xe / trang chủ hiện "rỗng" khi API lỗi | (không có response) | FIXED | true | booking_history_page.dart:47-51,72-88 (lỗi → `_bookingList=null` → hiện "Không tải được lịch sử" + nút "Tải lại"); search_cars_service.dart:82-91 (lỗi → snackbar "Hệ thống xảy ra sự cố" khác với empty); dashboard_page.dart:82-87,341-358 (lỗi → set null → "Không tải được ưu đãi" + "Tải lại") | Cả 3 màn hình đã phân biệt trạng thái lỗi vs rỗng, có nút thử lại. |
| HIGH-02 | Chi tiết booking crash khi data null | (không có response) | FIXED | true | booking_detail_page.dart:42-52 (check `bookingData == null` → set `_error` "Không tìm thấy thông tin đặt xe" trước khi cast); có thêm bắt DioException + catch chung | Đã null-check trước khi cast, không còn crash. |
| HIGH-03 | Thiếu màn hình "Hủy booking" | (không có response) | PARTIAL | false | booking_detail_page.dart:610-712 (đã có `_confirmCancel` + dialog + gọi `cancelBooking`) NHƯNG nút bấm bị comment ở dòng 540-548; grep `_confirmCancel` chỉ thấy ở dòng comment 542 và định nghĩa 610 → KHÔNG có UI sống nào gọi | Code hủy đã viết nhưng nút "HỦY ĐẶT XE" bị comment → khách VẪN không hủy được. Ngoài ra handler hủy (dòng 688-699) luôn báo "Đã hủy đặt xe", không check responseCode. |
| HIGH-04 | Không có SSL Certificate Pinning | (không có response) | FIXED | true | pubspec.yaml:47 (`http_certificate_pinning: ^3.0.1`); certificate_pinning.dart:5-22 (fingerprint SHA256 thật, `HttpCertificatePinning.check`); api_client.dart:40,114 (gọi `CertificatePinning.check` trong cả authDio + bookingDio) | Đã pin thật, có fingerprint cụ thể, wired vào interceptor. (Report gợi ý ^4.0.0 nhưng ^3.0.1 vẫn đạt mục tiêu.) |
| HIGH-05 | Android thiếu Network Security Config | (không có response) | FIXED | true | android/app/src/main/res/xml/network_security_config.xml (cleartext=false, domain api-portal.amzholdings.vn); AndroidManifest.xml:10 (`android:networkSecurityConfig="@xml/network_security_config"`) | Đã tạo file config + khai báo trong manifest. |
| HIGH-06 | booking_info_page.dart 2.954 dòng | (không có response) | FIXED | true | `wc -l booking_info_page.dart` = 394 dòng (trước 2954) | File đã tách nhỏ còn 394 dòng, dưới ngưỡng 800. |
| HIGH-07 | Lịch sử hardcap 50 đơn, không phân trang | (không có response) | FIXED | true | booking_history_page.dart:18-19 (`_size=10`,`_page=0`), 27-32 (scroll listener gọi `_loadMore`), 39 (gọi `getMyBookingHistory(page:_page,size:_size)`) | Đã chuyển sang size 10 + infinite scroll (load more khi cuộn). |
| HIGH-08 | Phí giao nhận hardcode 80.000đ | (không có response) | FIXED | true | booking_confirm_page.dart:86 và 493-494: `deliveryFee = locationType==0 ? 0 : (widget.pickupFee ?? 80000)` | Đã dùng `pickupFee` từ API, 80000 chỉ còn là fallback. |
| HIGH-09 | Sau đặt xe quay về tab "Đặt xe" | (không có response) | FIXED | true | booking_confirm_page.dart:561-563: `pushAndRemoveUntil(... BookingDetailPage(bookingId: bookingId))` | Đã điều hướng tới chi tiết đơn vừa tạo thay vì tab form trống. |
| HIGH-10 | Flow KYC không atomic | (không có response) | FIXED | true | identity_page.dart:341-356 (catch updateProfile → `return;` dừng flow, không nộp CCCD); license_page.dart:381-394 (cùng pattern, `return;` dòng 394) | Đã dừng khi profile lỗi. Comment cũ ("continuing...") còn sót nhưng hành vi thực đã đúng atomic. |
| HIGH-11 | Zero test coverage | (không có response) | NOT_FIXED | false | `find` không thấy file `*_test.dart`; không có thư mục `test/` hay `integration_test/` | Vẫn chưa có test nào. |
