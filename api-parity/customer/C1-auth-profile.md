# Đối chiếu API + nghiệp vụ — LÔ C1: Auth & Profile (cấp KHÁCH HÀNG)

> Web khách `amazing-xanh-fe` gọi route nội bộ Next.js (BFF) tại `src/app/api/**/route.ts`, BFF forward xuống gateway thật qua `apiPathProduction(CONST)` (hằng số ở `src/constants/api.ts`).
> App khách `booking-car-app` (Flutter/Dio) gọi gateway TRỰC TIẾP: `authBaseUrl = https://api-portal.amzholdings.vn/api/v1/auth`, `bookingBaseUrl = https://api-portal.amzholdings.vn/api/v1/xanh`.
> responseCode: xanh-service = `"00"`, auth-service = `"200"`.

## Tổng quan
- **Số route web quét:** 15 (6 trong `api/auth`, 9 trong `api/profile`).
- **CRITICAL:** 1
- **HIGH:** 3

---

## Bảng đối chiếu

| Hành động | Web (endpoint + method) | App (endpoint + method) | Trạng thái | Mức độ | Ghi chú |
|---|---|---|---|---|---|
| Đăng nhập (username/password) | `POST /api/v1/auth/login` (BFF `api/auth/login`) | `POST /api/v1/auth/login` (api_service.login) | MATCH | MEDIUM | Endpoint/method/body (`username,password,deviceId`) khớp. **Web KHÔNG kiểm `responseCode`** (chỉ dựa `responseApi.ok` = HTTP status); App có kiểm `responseCode != '200'` (login_page:78). Login auth-service dùng "200" → web bỏ sót, có thể nhận nhầm body lỗi mức ứng dụng là thành công. |
| Đăng nhập Google | `POST /api/v1/auth/google-login` (BFF `api/auth/login-google`) | `POST /api/v1/auth/google-login` (api_service.googleLogin) | BODY_MISMATCH | MEDIUM | Cùng endpoint. Web forward nguyên body client (chưa thấy field cố định); App gửi `{idToken, deviceId}`. **Lưu ý lệch hạ tầng:** App gọi google-login qua `getBookingDio()` (bookingBaseUrl /xanh) thay vì authBaseUrl → URL thật thành `/api/v1/xanh/google-login` (khác web `/api/v1/auth/google-login`). Cần xác nhận gateway route — nếu app trỏ sai prefix là lỗi app. |
| Đăng xuất | `POST /api/v1/auth/logout` + Bearer, body `{refreshToken}` (BFF `api/auth/logout`) | `POST /api/v1/auth/logout` body `{refreshToken}` (api_service.logout) | MATCH | LOW | Khớp endpoint/method/body. Web đọc accessToken từ cookie gắn Bearer; App gắn Bearer qua interceptor. Cả hai không bắt buộc kiểm responseCode (logout best-effort) — chấp nhận được. |
| Refresh token | `POST /api/v1/auth/refresh-token` body `{refreshToken}` (BFF `api/auth/refresh`) | `POST /api/v1/auth/refresh-token` body `{refreshToken}` (api_service.refreshAccessToken) | MATCH | LOW | Khớp. Web validate có `accessToken/refreshToken` mới trong `result.data`, set cookie. |
| Lấy hồ sơ phiên đăng nhập (me) | `GET /api/v1/auth/profile` (BFF `api/auth/me`) | `GET /api/v1/auth/profile`? — App **không gọi** `/auth/profile`; `getProfile()` gọi `GET /api/v1/xanh/customers/profile` | ENDPOINT_MISMATCH | MEDIUM | Web "me" dùng auth-service `/auth/profile` để lấy danh tính phiên (id, roles...). App lấy thông tin user qua `/xanh/customers/profile`. Hai nguồn dữ liệu khác nhau; không có hành vi App tương ứng dùng `/auth/profile`. Đánh giá: khác cách lấy "user hiện tại" — cần thống nhất nguồn. |
| Đổi mật khẩu | `POST /api/v1/auth/change-password` (BFF `api/auth/change-password`) | `POST /api/v1/auth/change-password` body `{oldPassword,newPassword,confirmPassword}` (api_service.changePassword) | MATCH | LOW | Khớp endpoint/method. Web forward nguyên body client (không validate field), không kiểm responseCode (chỉ HTTP ok). App kiểm `responseCode == '200'` (account_page:1328) — đúng auth-service. |
| Xem thông tin cá nhân | `GET /api/v1/xanh/customers/profile` (BFF `api/profile/profile-information`) | `GET /api/v1/xanh/customers/profile` (api_service.getProfile) | MATCH | OK | Khớp endpoint/method (GET, xanh-service). |
| Cập nhật thông tin cá nhân | `POST /api/v1/xanh/customers/profile` (BFF `api/profile/update-profile-information`) | `POST /api/v1/xanh/customers/profile` body `{fullName,address,gender,dateOfBirth}` (api_service.updateProfile) | LOGIC_MISMATCH | HIGH | Endpoint/method khớp (xanh-service, dùng POST cho update). **App kiểm sai responseCode:** `updateProfile` gọi qua bookingDio (xanh → success = "00") nhưng account_page:349 kiểm `responseCode == "200"` → khi BE trả "00" thành công, app coi là THẤT BẠI (hiện toast lỗi dù đã lưu). Web forward nguyên body, không kiểm responseCode. |
| Cập nhật avatar | (web không có route riêng — dùng chung update profile) | `POST /api/v1/xanh/customers/profile` body `{avatar}` (api_service.updateProfileAvatar) | APP_ONLY | LOW | Hành vi hợp lệ của app; cùng endpoint update profile, chỉ khác field `avatar`. |
| Lấy thông tin CCCD (identity) | `GET /api/v1/xanh/customers/identity` (BFF `api/profile/identity/get`) | `GET /api/v1/xanh/customers/identity` (api_service.getIdentity) | MATCH | OK | Khớp endpoint/method. |
| Cập nhật/nộp CCCD (identity) | `POST /api/v1/xanh/customers/identity` (BFF `api/profile/identity/update`) | `POST /api/v1/xanh/customers/identity` (api_service.updateIdentity) | MATCH | LOW | Endpoint/method khớp. App gửi field chi tiết (`type,identityNumber,expiryDate,frontImage,backImage,cardSerialNumber,relatedImages,fullName,dateOfBirth,note`) + kiểm `responseCode == '00'` (identity_page) đúng xanh. Web forward nguyên body client (BFF không validate field) — phụ thuộc UI web gửi đủ. |
| Lấy thông tin GPLX (license) | `GET /api/v1/xanh/customers/license` (BFF `api/profile/license/get`) | `GET /api/v1/xanh/customers/license` (api_service.getLicense) | MATCH | OK | Khớp endpoint/method. |
| Cập nhật/nộp GPLX (license) | `POST /api/v1/xanh/customers/license` (BFF `api/profile/license/update`) | `POST /api/v1/xanh/customers/license` (api_service.updateLicense) | MATCH | LOW | Endpoint/method khớp. App gửi `type,licenseNumber,licenseClass,expiryDate,frontImage,backImage,cardSerialNumber,fullName,dateOfBirth,note` + kiểm `responseCode == '00'` (license_page) đúng. Web forward nguyên body client. |
| Đăng ký tài khoản (register) | **KHÔNG có route web** (hằng `AUTH.REGISTER` khai báo nhưng không route.ts nào dùng) | `POST /api/v1/auth/register` body `{fullName,phoneNumber,email,password}` (api_service.register), kiểm `responseCode == "200"` | MISSING_IN_APP→thực chất WEB-ONLY thiếu | HIGH | Web khách KHÔNG expose luồng đăng ký qua BFF (không có `api/auth/register`). App có đăng ký đầy đủ. Đây là web thiếu hành vi chuẩn (web là sản phẩm rút gọn hơn app). |
| Quên mật khẩu (forgot-password) | **KHÔNG có route web** | `POST /api/v1/auth/forgot-password` body `{email}` (api_service.forgotPassword), kiểm `responseCode == '200'` | MISSING_IN_APP→WEB-ONLY thiếu | HIGH | Web không có route quên mật khẩu qua BFF. App có. Web thiếu hành vi chuẩn. |
| Xác thực OTP (verify-otp) | **KHÔNG có route web** | `POST /api/v1/auth/verify-otp` body `{otpCode}` (api_service.verifyOtpByCode) | APP_ONLY | LOW | Thuộc luồng quên mật khẩu/đăng ký của app. Web không có. |
| Gửi lại OTP (resend-otp) | **KHÔNG có route web** | `POST /api/v1/auth/resend-otp` body `{phone}` (api_service.resendOtp) | APP_ONLY | LOW | App-only, hợp lệ. |
| Đặt lại mật khẩu (reset-password) | **KHÔNG có route web** (hằng `AUTH.RESET_PASSWORD` khai báo, không dùng) | App có UI `create_password_page` nhưng **không thấy gọi API** reset-password (không có method `resetPassword` trong api_service) | APP_ONLY | MEDIUM | Cả hai bên đều CHƯA hoàn chỉnh nghiệp vụ đặt lại mật khẩu qua API: web thiếu route, app có màn hình nhưng chưa nối API. Cần xác nhận luồng reset thực tế. |
| Xóa tài khoản (delete-account) | **KHÔNG có route web** | `POST /api/v1/auth/delete-account` body `{reason}` (api_service.deleteAccount), kiểm `responseCode == "200"` | APP_ONLY | LOW | App-only, hợp lệ (app là sản phẩm đầy đủ hơn). App kiểm "200" đúng (gọi authBaseUrl). |

---

## Ghi chú trọng yếu (CRITICAL / HIGH)

1. **[CRITICAL/được nâng do ảnh hưởng dữ liệu] Cập nhật thông tin cá nhân — App kiểm sai responseCode:** `api_service.updateProfile` gọi `POST /api/v1/xanh/customers/profile` qua `getBookingDio()` (xanh-service → success = `"00"`), nhưng `account_page.dart:349` kiểm `responseCode == "200"`. Hậu quả: cập nhật thành công thật (BE trả "00") nhưng app hiển thị "Thất bại" → user bấm lại nhiều lần, trải nghiệm sai. (Xem severity HIGH ở bảng; nâng chú ý vì gây hiểu nhầm trạng thái dữ liệu.)
2. **[HIGH] Web không kiểm responseCode ở login/change-password/update-profile:** Các BFF route chỉ dựa `responseApi.ok` (HTTP status). Nếu gateway trả HTTP 200 kèm body lỗi mức ứng dụng (responseCode != "200"/"00"), web sẽ coi là thành công. App có kiểm responseCode ở các luồng này.
3. **[HIGH] Web thiếu luồng đăng ký & quên mật khẩu qua BFF:** Hằng số `REGISTER`, `FORGOT_PASSWORD`, `VERIFY_OTP`, `RESET_PASSWORD` có khai báo trong `constants/api.ts` nhưng KHÔNG route.ts nào sử dụng. App có đầy đủ. Web khách hiện không cho đăng ký/khôi phục mật khẩu qua tầng BFF chuẩn.
4. **[MEDIUM] Lệch nguồn "user hiện tại":** Web `api/auth/me` dùng `/api/v1/auth/profile` (auth-service); App `getProfile()` dùng `/api/v1/xanh/customers/profile` (xanh-service). Hai nguồn khác nhau, cần thống nhất.
5. **[MEDIUM] Google login app trỏ prefix /xanh:** App gọi google-login qua `getBookingDio()` → URL thật `/api/v1/xanh/google-login`, trong khi web dùng `/api/v1/auth/google-login`. Cần kiểm tra gateway có chấp nhận cả hai không; nếu không, đây là lỗi cấu hình bên app.
