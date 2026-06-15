# Kiểm chứng fix — App ADMIN, nhóm HIGH (HIGH-01..HIGH-08)

- Nhánh code kiểm chứng: `release` (đúng theo chỉ định lead)
- Thư mục code: `C:/Users/it/OneDrive/Desktop/Project/amz_xanh_admin_app`
- Ngày kiểm chứng: 2026-06-08

## Tổng hợp

- FIXED: **0/8**
- PARTIAL: **1/8** (HIGH-08)
- NOT_FIXED: **7/8** (HIGH-01, 02, 03, 04, 05, 06, 07)
- Claim sai (outsource báo Done/Partial nhưng thực tế không có trên nhánh release): **8/8**

> CẢNH BÁO QUAN TRỌNG: Toàn bộ "Evidence" trong report phản hồi của outsource (các class `AdminApiResponse.parseXanhResponse()`, `SecureHttpClient`, `http_certificate_pinning`, `scripts/build_release.sh`, 37/37 tests, applicationId `vn.amzholdings.xanh.admin`, signing từ env...) **KHÔNG TỒN TẠI** trong code nhánh `release`. Git log nhánh `release` không có commit remediation nào (commit cuối: "Fix build release"). Có vẻ outsource mô tả một nhánh/bản khác chưa được merge vào `release`. Trên nhánh `release` mà lead chỉ định, code gần như còn nguyên trạng như report gốc.

## Bảng chi tiết

| ID | Tiêu đề | Claim (outsource) | Thực tế | Khớp claim? | Bằng chứng | Ghi chú |
|----|---------|-------------------|---------|-------------|------------|---------|
| HIGH-01 | Android release dùng debug signing key | Partial (đọc signing từ env/Gradle, không dùng debug) | NOT_FIXED | Không | `android/app/build.gradle:37` vẫn `signingConfig = signingConfigs.debug`; không có `key.properties`, không có `signingConfigs.release` | applicationId vẫn `com.example.*` (dòng 24). Không có cơ chế signing production nào. |
| HIGH-02 | Không có SSL Certificate Pinning | Partial (SecureHttpClient + http_certificate_pinning) | NOT_FIXED | Không | `pubspec.yaml` dependencies không có `http_certificate_pinning`; grep `SecureHttpClient`/`SecurityContext`/`setCertificate` trong `lib` = 0 kết quả | Class `SecureHttpClient` không tồn tại trên nhánh release. |
| HIGH-03 | Crash khi user thoát login nhanh (setState sau await không check mounted) | Partial (đã thêm mounted check ở async paths chính) | NOT_FIXED | Không | `lib/features/auth/screens/login_screen.dart:58` và `:61` gọi `setState(() => _deviceId = ...)` trong `_initializeDeviceId()` KHÔNG có `if (!mounted) return;` trước đó | Đây chính là hàm report gốc chỉ ra. Vẫn nguyên trạng. (`_handleLogin` có mounted check nhưng không phải chỗ report nêu.) |
| HIGH-04 | Không có test — zero coverage | Partial (đã có tests, flutter test 37/37) | NOT_FIXED | Không | `test/` chỉ có 1 file `widget_test.dart` là template Flutter mặc định (counter smoke test, body còn comment) | Không có unit test cho AuthService/BookingAdminService. Coverage thực tế ~0. |
| HIGH-05 | Toàn bộ UI dùng `_buildXxx()` — lag | Done (đã tách widget, không còn `_buildXxx`) | NOT_FIXED | Không | grep `_build[A-Z]` trong `lib` = **491** lần (report gốc 482); `vehicle_detail_screen.dart` vẫn 11+ `Widget _build` | Không hề tách widget class. Claim "Done" hoàn toàn sai. |
| HIGH-06 | Thiếu màn hình "Xác nhận hoàn tiền" — feature gap | Done (Contract detail có action/dialog gọi confirmRefund) | NOT_FIXED | Không | `confirmRefund()` chỉ được ĐỊNH NGHĨA tại `booking_admin_service.dart:104`, grep toàn `lib` không có nơi nào GỌI nó; không có file/màn hình refund nào | Các match "Hoàn tiền/Hoàn cọc" trong screen chỉ là nhãn trạng thái + dòng info, không phải nút/dialog xác nhận hoàn tiền. |
| HIGH-07 | Token hết hạn giữa phiên — không redirect login | Partial (parser/session redirect khi 401/403/expired) | NOT_FIXED | Không | `booking_admin_service.dart:_post()` chỉ check `statusCode==200`, không có logic refresh/redirect; "Phiên đăng nhập hết hạn" tại dòng 29 chỉ chạy khi token RỖNG TRƯỚC khi gọi, không phải khi backend trả expired | Không có session service/redirect mid-session. Chỉ AuthService có code liên quan token. |
| HIGH-08 | Logout crash nếu backend trả format lạ | Done (logout bắt empty/invalid/network; StorageService.logout luôn clear token) | PARTIAL | Một phần | `auth_service.dart:134` parse `jsonDecode(response.body)['response']` rồi `res['responseCode']` (sẽ NoSuchMethod nếu res null) NHƯNG nằm trong try/catch nên KHÔNG crash app; tuy nhiên `main_layout.dart:261` & `sidebar_desktop.dart:354` chỉ gọi `StorageService.logout()` khi `result['success']==true` → khi API lỗi token KHÔNG bị xóa, KHÔNG redirect | Không crash app (đạt 1 phần), nhưng nguyên tắc "token local luôn xóa trong finally" KHÔNG đạt — ngược lại yêu cầu report. Claim "Done" sai. |

## Phụ chú kỹ thuật

- `booking_admin_service.dart:40` `_post()` vẫn `if (response.statusCode == 200) return {'success': true}` — không check `responseCode` (gốc CRIT-05). Vì vậy dù dialog giao/nhận xe (`receive_dialog.dart:163`) có hiển thị banner đỏ khi `success==false`, nhánh đỏ này gần như không bao giờ kích hoạt với lỗi nghiệp vụ — ảnh hưởng gián tiếp HIGH-06/HIGH-08.
- `booking_admin_service.dart:1` và `:4` còn `import 'dart:convert';` trùng (LOW-02 cũng chưa fix) — thêm bằng chứng nhánh release chưa nhận remediation.
