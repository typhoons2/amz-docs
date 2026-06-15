# Kiểm chứng fix — App KHÁCH HÀNG (booking-car-app) — nhóm CRIT-01..CRIT-10

- Nhánh kiểm chứng: `temp` (theo chỉ định lead)
- Repo code thực tế: `C:/Users/it/OneDrive/Desktop/Project/booking-car-app`
- Báo cáo gốc: `C:/Users/it/OneDrive/Desktop/Project/docs/REVIEW-REPORT-CUSTOMER-APP.md`
- Lưu ý: Outsource CHƯA gửi response report cho app customer => cột "Claim" ghi "(không có response)". claimMatch=true nếu thực tế là FIXED.

## Tổng kết
- FIXED: 9
- PARTIAL: 0
- NOT_FIXED: 1 (CRIT-05)
- claim-mismatch: 1 (CRIT-05 — không có response nhưng thực tế chưa sửa, đánh dấu mismatch để lead chú ý)

| ID | Tiêu đề | Claim | Thực tế | Khớp claim? | Bằng chứng | Ghi chú |
|----|---------|-------|---------|-------------|-----------|---------|
| CRIT-01 | Auth gọi BE riêng outsource thay vì AMZ | (không có response) | FIXED | Có | api_endpoints.dart:4-11 | authBaseUrl giờ trỏ `api-portal.amzholdings.vn/api/v1/auth` (qua String.fromEnvironment, default đúng). Bỏ tiền tố `/xanh/auth`, endpoint refresh đổi thành `/refresh-token`. Hết gọi enochtech. |
| CRIT-02 | File bí mật OAuth (client_secret_*.json, google-services.json) bị commit git | (không có response) | FIXED | Có | `git ls-files` không còn file secret; .gitignore đã thêm `client_secret*.json`, `android/app/google-services.json`, `ios/Runner/GoogleService-Info.plist` | App-side đã xử lý. CẢNH BÁO: việc xóa khỏi git history + ROTATE credential trên Google Cloud là việc AMZ phải tự xác nhận (không kiểm tra được từ working tree). |
| CRIT-03 | Google OAuth Client ID hardcode trong source | (không có response) | FIXED | Có | google_auth_service.dart:11 | `_serverClientId = String.fromEnvironment('GOOGLE_CLIENT_ID')` — không còn chuỗi hardcode, inject lúc build. |
| CRIT-04 | Token JWT + thông tin KH lưu SharedPreferences không mã hóa | (không có response) | FIXED | Có | login_page.dart:87-92 + google_auth_service.dart:86-91 | Cả 2 luồng (phone/password và Google) đã chuyển sang FlutterSecureStorage (Keychain/Keystore). |
| CRIT-05 | Android release build ký bằng debug key | (không có response) | NOT_FIXED | Không | build.gradle.kts:35-38 | Vẫn `signingConfig = signingConfigs.getByName("debug")`, comment TODO còn nguyên. CHƯA tạo signingConfigs release / key.properties. Vẫn block release lên Play Store. |
| CRIT-06 | 232 lệnh print() in token & PII ra console | (không có response) | FIXED | Có | api_client.dart:51-92,125-169 (tất cả bọc `if(kDebugMode)`); login_page.dart:99-101,119-124; google_auth_service.dart:30-118 | 228/231 print đã bọc kDebugMode. Các print PII gốc (Authorization header, Response Body, ID token, user_token) đều đã guard. Còn 3 print KHÔNG guard nhưng vô hại (không phải PII): account_page.dart:898 (error msg), account_page.dart:1703 ('History card tapped'), booking_info_promotion.dart:144 ('Voucher button tapped'). Không lộ token/PII. |
| CRIT-07 | Đăng ký báo THÀNH CÔNG dù BE từ chối | (không có response) | FIXED | Có | email_register_page.dart:113-131 | Đã check `responseCode == "200"` trước khi báo thành công + điều hướng login; nhánh else hiện responseMessage. (Convention "200" đúng vì đã chuyển sang customer-auth-service ở CRIT-01.) |
| CRIT-08 | Đổi MK / Cập nhật profile / Xóa tài khoản LUÔN báo OK | (không có response) | FIXED | Có | account_page.dart: updateProfile dialog 348-359, updateProfile tên hiển thị 838-..., changePassword 1326-1338, deleteAccount 1393-1404 | Cả 4 operation đều check `responseCode == "200"`, có nhánh else hiện lỗi đỏ, chỉ pop/logout khi thành công. (Toast deleteAccount ghi nhầm "Cập nhật thông tin thành công" — lỗi text cosmetic, logic đúng.) |
| CRIT-09 | Nút Momo/ZaloPay/VNPay placeholder — khách tưởng đã trả tiền | (không có response) | FIXED | Có | booking_confirm_page.dart:68-71,386-401,625-727 | Đã gỡ bỏ hoàn toàn nút Momo/ZaloPay/VNPay hardcode. Giờ load danh sách phương thức từ API `/payment-methods` (`_loadPaymentMethodData`), có state loading/error/empty + nút "Tải lại". depositMethodId dùng bankCode (chuỗi) từ BE, mặc định 'CASH'. (Param `comingSoon` còn trong `_paymentOption` nhưng không dùng tới — dead code nhẹ, không ảnh hưởng.) |
| CRIT-10 | Login & Google login không check responseCode | (không có response) | FIXED | Có | login_page.dart:76-80 + google_auth_service.dart:72-75 | Cả 2 đều check `responseCode != '200'` → throw trước khi lưu token. |
