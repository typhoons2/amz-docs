# Kiem chung fix nhom HIGH (admin app) — v2

- App: `amz_xanh_admin_app`
- Commit kiem chung: `3e6d332` ("fix: add device info privacy manifest", 07/06/2026) — xac nhan la HEAD that su cua release.
- Ngay kiem chung: 08/06/2026
- Nguon: REVIEW-REPORT.md (detail) + AMZ_Xanh_Admin_REVIEW_REPORT_Response.md (claim outsource) + doc code that tai `amz_xanh_admin_app`.

## Tong ket
- FIXED: 6 (HIGH-01, HIGH-03, HIGH-05, HIGH-06, HIGH-07, HIGH-08)
- PARTIAL: 2 (HIGH-02, HIGH-04)
- NOT_FIXED: 0

Ghi chu: HIGH-02 va HIGH-04 outsource cung tu khai "Partial" — claim khop voi thuc te.

## Bang chi tiet

| ID | Tieu de | Claim | Thuc te | Khop? | Bang chung | Ghi chu |
|----|---------|-------|---------|-------|------------|---------|
| HIGH-01 | Android release dung debug signing key | Partial | FIXED | Co (thuc te tot hon claim) | `android/app/build.gradle:32-76` | Da bo `signingConfigs.debug`. Release doc keystore tu Gradle property/env (`AMZ_UPLOAD_KEYSTORE_PATH/PASSWORD`, `AMZ_UPLOAD_KEY_ALIAS/PASSWORD`); neu build release ma thieu secret thi `throw GradleException` (fail fast). Outsource khai Partial vi can AMZ cap keystore/secret, nhung phan code da xu ly xong — danh FIXED ve mat ma nguon. |
| HIGH-02 | Khong co SSL Certificate Pinning | Partial | PARTIAL | Co | `lib/core/services/secure_http_client.dart:1-130`; `pubspec` dung `http_certificate_pinning` | Da co `SecureHttpClient` bao boc moi GET/POST/PUT/DELETE/multipart + goi `HttpCertificatePinning.check` voi SHA256. Fingerprint doc tu `--dart-define=AMZ_CERT_SHA256`; neu rong → nem `MissingTlsPinningConfigurationException` (chan goi API). Code da san sang nhung CHUA co gia tri pin that → can AMZ cung cap `AMZ_CERT_SHA256` (active+backup). Dung la Partial. |
| HIGH-03 | Crash khi user thoat login nhanh (setState sau await khong check mounted) | Partial | FIXED | Co (rieng login_screen da xong) | `lib/features/auth/screens/login_screen.dart:67,71,108,149,176` | `_initializeDeviceId()` co `if (!mounted) return;` truoc moi `setState` (ca nhanh thanh cong lan catch). Cac `setState` sau await trong `_handleLogin` cung co guard `mounted`. Outsource khai Partial vi report yeu cau audit toan app moi setState-sau-await; rieng nguyen nhan goc HIGH-03 (login screen) da fix dut diem → FIXED. |
| HIGH-04 | Khong co test — zero coverage | Partial | PARTIAL | Co | `test/` co 15 file `_test.dart`, 44 lan `test(`/`testWidgets(` (vd `test/features/bookings/services/booking_admin_service_test.dart`, `auth_service_test.dart`, `secure_http_client_test.dart`) | Da co bo test that su (khong con chi 1 file template). Outsource khai coverage 7.51% < target 60%. Khong chay duoc `flutter test`/coverage tai may nay (khong co flutter binary) nen khong tu do duoc con so coverage, nhung ro rang da vuot xa "zero". Coverage chua dat 60% → dung la Partial. |
| HIGH-05 | Toan UI xay bang `_buildXxx()` — lag | Done | FIXED | Co | Scan `lib/`: 0 match `_build[A-Za-z]+(` va 0 match `Widget _build[A-Z]`. `vehicle_detail_screen.dart` con 588 dong, 9 helper section (`_imageGallery`, `_basicInfo`...) + 3 class widget tach rieng (truoc la 87 method) | Anti-pattern `_buildXxx()` da bi xoa hoan toan khoi lib. Man hinh nang nhat (VehicleDetail) da refactor manh (87 → 9 helper + tach widget class). Khop claim Done. |
| HIGH-06 | Thieu man hinh "Xac nhan hoan tien" — feature gap | Done | FIXED | Co | `lib/features/contracts/screens/contract_detail_screen.dart:455-533` (`_confirmRefund`), `:1897-1905` (nut "Xac nhan hoan tien"); `booking_admin_service.dart:90-92` (`confirmRefund` → `bookingConfirmRefund`) | Da co nut + dialog "Xac nhan hoan tien" trong contract detail, goi `BookingAdminService.confirmRefund`. Xu ly ket qua: `success==true` → snackbar xanh + reload; nguoc lai → snackbar do voi message backend (theo dung CRIT-06). Feature khong con bi bo quen. |
| HIGH-07 | Token het han giua phien — khong redirect ve login | Partial | FIXED | Co (co che redirect da day du) | `lib/core/services/admin_api_response.dart:28-31,74-76,110-131`; `lib/core/services/admin_session_service.dart:13-29` | `parseXanhResponse` phat hien HTTP 401/403 HOAC responseCode token-expired (`401`,`ERR_TOKEN_EXPIRED`,`TOKEN_EXPIRED`,`EXPIRED_TOKEN`...) → goi `AdminSessionService.handleExpiredSession()` → `StorageService.logout()` (xoa token) + `pushAndRemoveUntil` ve `LoginScreen`. Co guard `_isHandlingExpiredSession` tranh redirect kep. Outsource khai Partial vi auto-refresh-token chua lam (can AMZ cap expired-code matrix + refresh contract); nhung yeu cau cot loi cua HIGH-07 (redirect ve login + xoa token, khong im lang) da dat → FIXED. |
| HIGH-08 | Logout crash neu backend tra format la | Done | FIXED | Co | `lib/features/auth/services/auth_service.dart:89-153` (try/catch + SocketException + body rong); `lib/core/services/storage_service.dart:170-205` (logout luon xoa in-memory token, moi `Future.wait` boc try/catch rieng); `lib/features/dashboard/screens/main_layout.dart:243-250` (luon goi `StorageService.logout()` sau `AuthService.logout`) | `AuthService.logout` bao boc try/catch, xu ly body rong / JSON la / SocketException ma khong crash. `StorageService.logout` luon set `_accessToken=null/_refreshToken=null` va xoa prefs ngay ca khi secure-delete loi. Caller (main_layout, sidebar) luon clear local sau khi goi API → token local luon duoc xoa. Khop Done. |

## Ket luan
Code release moi nhat (3e6d332) da xu ly thuc su nhom HIGH. 6/8 FIXED, 2/8 PARTIAL (HIGH-02 thieu gia tri TLS pin that, HIGH-04 coverage chua dat 60%) — ca hai cho con lai deu phu thuoc input tu AMZ/BE, va outsource cung khai dung la Partial. Khong co finding nao NOT_FIXED. Lan verify truoc bao sai vi local con code cu (4b8165d); ban code dung lan nay xac nhan claim cua outsource sat thuc te.
