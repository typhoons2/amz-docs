# Email gửi đội outsource — kết quả review bản bàn giao mới + việc còn lại

Chào team,

Bên AMZ đã review lại trên **đúng bản mới nhất** các bạn bàn giao (admin nhánh `release` commit `3e6d332`, khách nhánh `temp`). Cảm ơn các bạn đã xử lý — kết quả tốt. Dưới đây là trạng thái và phần còn lại.

---

## 1. App ADMIN (`amz_xanh_admin_app`) — ĐẠT gate CRITICAL ✅

- **6/6 lỗi CRITICAL đã sửa** (secure storage, tắt cleartext, bỏ log credential, kiểm `responseCode "00"`, UI báo lỗi đúng khi backend từ chối).
- Review bảo mật lại trên code mới: **0 CRITICAL, 0 HIGH**. Tổng **24/28 finding** đã đóng.
- → AMZ chấp nhận **nghiệm thu giai đoạn 1 có điều kiện** cho admin.

**Phần còn lại của các bạn (admin):**
- **HIGH-04**: test coverage hiện ~7,5%, cần đạt **≥60%**.
- (Tùy chọn, nên làm trước production) vài MEDIUM/LOW: ẩn/disable menu theo role ở client, chuyển `dart:developer log()` ở các service sang logger đã tắt ở release, đổi tên file `storage_service.dart` trùng.

**Các mục đang chờ AMZ cung cấp (bên mình sẽ gửi riêng — không phải lỗi của các bạn):**
- HIGH-02: giá trị TLS pin `AMZ_CERT_SHA256` (active + backup).
- HIGH-01: keystore release + secret ký.
- MED-06: endpoint API thống kê cho Dashboard.
- MED-09: xác nhận format `responseCode` cho banner/news (Enoch Tech gateway).

---

## 2. App KHÁCH (`booking-car-app`) — đã sửa tốt nhiều phần, còn 3 CRITICAL

Ghi nhận: phần lớn lỗi nặng cũ đã xử lý (base URL về AMZ, token vào secure storage, Google client id qua env, file secret đã gỡ khỏi git, các màn đăng ký/đăng nhập/tài khoản đã kiểm `responseCode`...). **Còn 2 mục CRITICAL phải đóng trước khi nghiệm thu:**

**🔴 CRITICAL (bắt buộc):**
1. **Ký bằng debug key** (`build.gradle.kts:36-38`) → release không lên Google Play được, dễ bị giả mạo. Cần keystore release thật. (AMZ sẽ cấp keystore/secret.)
2. **Crash màn chi tiết xe** (`booking_info_carousel.dart:18,24,44`): `late final _car` bị gán lại lần 2 → `LateInitializationError` văng app ngay khi mở chi tiết xe. Sửa: bỏ `final`.

**🟠 HIGH / cần làm:**
- **Màn OTP đăng ký (tạm ẩn)**: màn OTP (`otp_page.dart`) hiện nhập 6 số bất kỳ cũng qua, lại ghi "mã đã gửi đến số điện thoại" trong khi **backend chưa có OTP đăng ký** (chỉ có OTP cho *quên mật khẩu*), nút "Gửi lại mã" còn `// TODO`. → Khách thật ngồi chờ mã không bao giờ tới rồi bỏ đăng ký. **Yêu cầu: TẠM ẨN màn OTP** (đăng ký đi thẳng nhập thông tin → tạo mật khẩu; API `register` vốn không cần `otp`), **giữ nguyên code màn OTP** để bật lại khi AMZ bổ sung API OTP đăng ký. Xem mục 3.4.
- **Hủy đơn**: nút "HỦY ĐẶT XE" đang bị comment (`booking_detail_page.dart:540-548`) + handler báo "Đã hủy" giả, chưa kiểm `responseCode`. *(Backend chưa có endpoint hủy cho khách — xem mục 3.3, khoan bật nút.)*
- **Gọi sai service**: `googleLogin` qua `getBookingDio` (phải `getAuthDio`); Ưu đãi/Tin tức qua `getAuthDio` (phải `getBookingDio` — xem mục 3.2).
- **Refresh token** tạo `Dio()` trần, bỏ qua cert pinning.
- **Đặt lại mật khẩu** (`create_password_page.dart:196`) còn `// TODO`, chưa gọi API.
- **Chưa có test** (HIGH-11); cập nhật avatar chưa kiểm `responseCode` (`account_page.dart:663`).

**🟡 Nhẹ:** bật `--obfuscate` khi build; strict mode `analysis_options.yaml`; `deleteAccount()` đang nuốt lỗi; siết email regex; thêm `FlutterError.onError`.

---

## 3. Trả lời 3 câu hỏi của các bạn

### 3.1. OAuth Google credentials
- Credential do **AMZ** tạo (project `amz-auth-485610`). Bên mình sẽ **rotate** (vì bản cũ đã lộ do commit git) và gửi lại **Web OAuth Client ID mới** + `google-services.json` mới.
- ⚠️ **Bên mình KHÔNG gửi `client_secret_*.json` cho app** — đó là bí mật phía server, chỉ nằm ở `customer-auth-service`. App **chỉ cần `serverClientId`** (Client ID), inject lúc build:
  `flutter build apk --dart-define=GOOGLE_CLIENT_ID=<client_id>.apps.googleusercontent.com`

### 3.2. Ưu đãi + Tin tức lấy từ API nào (vì sao vỡ sau khi đổi base)
Cả 2 thuộc **`xanh-service`** (base `/api/v1/xanh`), **public, không cần token**, method **POST**, `responseCode` thành công = **`"00"`** (KHÔNG phải `"200"`):
- Ưu đãi: `POST /api/v1/xanh/promotions/available`, `POST /api/v1/xanh/promotions/check`
- Tin tức: `POST /api/v1/xanh/posts/get-all`, `/posts/hot-news`, `/posts/latest`, `/posts/pinned`, `/posts/detail`, `/posts/by-path`
- App cũ vỡ do gọi sai base (`auth`) + endpoint cũ (`/news/available`) + check sai `responseCode`.
- **Ví dụ request/response JSON đầy đủ + vị trí dữ liệu lồng nhau:** xem file đính kèm `OUTSOURCE-ANSWERS.md` (mục Câu 2).

### 3.3. Hủy đơn — API nào + điều kiện hiện nút
- ❗ **Hiện backend CHƯA có endpoint hủy cho KHÁCH.** Chỉ có endpoint **admin** (`/xanh/admin/bookings/cancel`, khách gọi sẽ **403**). Web khách của AMZ cũng chưa cho khách tự hủy.
- **AMZ sẽ bổ sung endpoint public** `POST /api/v1/xanh/bookings/cancel` (role CUSTOMER, kiểm đơn thuộc khách đang đăng nhập) và gửi contract cho các bạn. **Khoan bật nút hủy** cho tới khi có endpoint này.
- **Điều kiện hiện nút** (theo business rule backend): chỉ khi `booking.status ∈ {1 PENDING, 2 CONFIRMED}` (chưa giao xe). Các trạng thái khác không cho hủy.

### 3.4. OTP đăng ký — làm rõ (quan trọng)
Sau khi rà lại backend, bên mình xác nhận:
- **Backend HIỆN KHÔNG có OTP cho đăng ký.** API `register` tạo tài khoản ngay, không cần và không nhận `otp`. OTP/ZNS chỉ tồn tại cho luồng **quên mật khẩu** (`/auth/verify-otp` + `/auth/forgot-password`), gắn riêng cho reset password — không dùng cho đăng ký.
- Vì vậy màn OTP lúc đăng ký **không thể verify được** (không có mã nào được gửi để mà kiểm), và contract cũng lệch (app gửi `{phone, otp}`, backend đợi `{data:{email, otpCode}}`).
- **Hành động trước mắt: TẠM ẨN màn OTP đăng ký** (giữ nguyên code), cho khách đăng ký thẳng. Không cần nối `verify-otp` cho đăng ký lúc này.
- **Về sau:** nếu AMZ quyết làm OTP đăng ký thật, bên mình sẽ bổ sung API (gửi OTP qua Zalo/ZNS + email dự phòng cho khách không có Zalo) và gửi contract đầy đủ để các bạn bật lại màn OTP. Sẽ báo các bạn khi sẵn sàng.

---

## 4. Quy trình nghiệm thu

1. Các bạn push các bản sửa tiếp theo lên **đúng nhánh trên repo AMZ** (`release` cho admin, `temp` cho khách) như đã làm — để bên mình verify được.
2. AMZ review lại trong vòng 2 ngày làm việc và phản hồi.
3. Nghiệm thu hoàn tất khi **toàn bộ CRITICAL + HIGH đóng** và AMZ xác nhận. (Việc bàn giao **chưa được coi là hoàn tất** cho tới bước này.)
4. Bên mình sẽ gửi riêng các input AMZ cần cung cấp (keystore, TLS pin, dashboard endpoint, OAuth client id mới, contract API hủy đơn).

Trân trọng,
AMZ Holdings — Phòng kỹ thuật
