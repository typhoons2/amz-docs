# Danh sách lỗi cần sửa — 2 app Flutter (gửi đội outsource)

> ⚠️ **CẬP NHẬT 08/06/2026 — ĐỌC TRƯỚC:** Tài liệu này soạn trên bản code CŨ. Sau khi cập nhật đúng bản bàn giao mới nhất (admin `release` `3e6d332`, customer `temp`):
> - **APP ADMIN: phần lỗi bên dưới phần lớn ĐÃ ĐƯỢC SỬA.** Verify lại: CRITICAL **6/6 fixed**, tổng **24/28 fixed**; review bảo mật lại trên code mới: **0 CRITICAL, 0 HIGH** còn lại (chỉ vài MEDIUM/LOW). → **Mục A (admin) trong CẢ Phần 1 và Phần 2 coi như LỖI THỜI.** Trạng thái đúng: `docs/review/fix-verification/SUMMARY-admin-v2.md` + `docs/review/admin/SUMMARY.md`.
> - **APP KHÁCH: phần lớn còn hiệu lực** (verify `temp`: 29/37 fixed, còn lỗ + dư phát sinh). Mục B (customer) vẫn nên xử lý.
> - **Backend authz `xanh-service`** (gateway/8082, IDOR...) là việc nội bộ AMZ, KHÔNG gửi outsource.
>
> Đối chiếu API + nghiệp vụ với web chuẩn của AMZ. Chỉ liệt kê **CRITICAL** (phải sửa ngay) và **HIGH** (lệch nghiệp vụ rõ).
> Quy ước backend: `responseCode == "00"` (service xanh), `"200"` (service auth) — **mới là thành công**, KHÔNG được chỉ dựa HTTP 200.
> Chi tiết từng endpoint: xem `docs/api-parity/admin/*.md` và `docs/api-parity/customer/*.md`.

---

## A. APP ADMIN — `amz_xanh_admin_app`

### 🔴 CRITICAL

**A1. Đăng xuất — (ĐÍNH CHÍNH)** ~~gọi sai đường dẫn~~
- Đã xác minh lại ở vòng review code: `auth_service.logout` gọi **đúng** endpoint + kiểm responseCode `"200"`. **Không phải lỗi sai URL** (nghi vấn ban đầu ở parity SAI — đã đính chính).
- Vấn đề thật: (1) màn Cài đặt **thiếu nút đăng xuất** (logout không nối vào UI); (2) nếu API logout fail thì **không xóa token phía client**. → nối nút đăng xuất + luôn xóa token local kể cả khi API lỗi.

**A2. Giao xe (perform-delivery) — sai tên field tiền + không gửi ảnh**
- Vị trí: `lib/features/delivery_receive/widgets/delivery_dialog.dart:110`
- Hiện app gửi: `collectedDepositAmount`, `paidAmount`, `staffId`, `note`... và **không gửi ảnh** giấy tờ/tình trạng xe.
- Web gửi: `depositAmount`, `collectedPayAmount`, `mortgageAmount`, `customerAsset`, `customerDocumentImages`, `carConditionImages`, `currentKm`, `deliveryTime`, `mortgageType`.
- Sửa: dùng đúng tên field như web; gửi đủ ảnh giấy tờ + ảnh tình trạng xe (khu upload hiện chỉ là placeholder).
- Vì sao: backend có thể bỏ qua tiền cọc/tiền thuê thực thu → **sai số liệu tài chính**.

**A3. Nhận xe (perform-receive) — sai cấu trúc phụ phí + GỬI ẢNH GIẢ**
- Vị trí: `lib/features/delivery_receive/widgets/receive_dialog.dart:120` (`_receiveImages.add('dummy-image-url')`), `:149-150` (`remainingAmount`, `surchargeAmount`)
- Hiện app gửi: 1 số tổng `surchargeAmount`, và `receiveImages: ['dummy-image-url']` (**ảnh giả để qua ràng buộc backend**).
- Web gửi: `surcharges` là **mảng** `[{reasonId, amount}]`, `collectedAmount`, `refundAmount`, `receiveImages` (ảnh thật)...
- Sửa: gửi phụ phí dạng mảng `{reasonId, amount}`; **bỏ ảnh giả**, upload ảnh thật; dùng đúng tên field tiền.
- Vì sao: bẩn dữ liệu quyết toán + sai số tiền.

**A4. Thiếu quản lý vòng đời xe**
- Web có, app **không khai báo + không có hàm**: `cars/update` (sửa xe), `cars/delete` (xóa xe), `cars/update-legal-maintenance` (đăng kiểm/bảo hiểm/hạn).
- Sửa: bổ sung 3 endpoint + màn tương ứng (hoặc xác nhận với AMZ là cố ý bỏ).

### 🟠 HIGH (lệch nghiệp vụ — bổ sung)

**A5. Không kiểm `responseCode` (lỗi hệ thống)** — toàn app admin chỉ kiểm HTTP 200 (chỉ 7 chỗ có `responseCode` trên toàn bộ code). → backend báo lỗi nghiệp vụ mà app vẫn báo "thành công". **Chuẩn hóa: mọi response phải kiểm `responseCode == "00"`.**

**A6. Màn Báo cáo là SỐ GIẢ** — `features/reports/.../reports_screen.dart` không gọi API nào, mọi số (doanh thu, tỷ lệ, biểu đồ) là hardcode. → nối 7 API báo cáo thật (`reports/revenue`, `reports/customer-revenue`, `reports/rental-profit`, `reports/fill-rate`, `reports/revenue/expense`, `bookings/status-counts`, `bookings/search`) hoặc ẩn màn này.

**A7. Thiếu nghiệp vụ hợp đồng** — app không có: tạo HĐ, tạo HĐ kèm phụ thu, sửa thông tin chung, đổi trạng thái, pre-payment (thu trước), đổi xe (văn phòng + hiện trường), gợi ý phụ thu, upload tài liệu, in PDF/Google Doc. (Xem `admin/02a-contract.md`.)

**A8. Thiếu quản lý nhân viên** — không có tìm/tạo/sửa/khóa/mở/đổi mật khẩu nhân viên + gán role. (Xem `admin/06-staff-config-promo.md`.)

---

## B. APP KHÁCH — `booking-car-app`

### 🔴 CRITICAL

**B1. Hủy đơn đặt xe — bug ghép URL + báo thành công giả**
- Vị trí: `lib/core/api/api_service.dart:235-237` và `lib/features/booking/presentation/pages/booking_detail_page.dart:688`
- Bug: `ApiEndpoints.cancelBooking.replaceFirst('{id}', bookingId)` nhưng chuỗi `'/bookings/cancel'` **không có `{id}`** → POST đi **thiếu id, thiếu body**. Màn chi tiết hiện "Đã hủy đặt xe" mà **không kiểm response**.
- Sửa: gửi `bookingId` đúng (trong body hoặc path theo backend); `await` + kiểm `responseCode == "00"` trước khi báo thành công.

**B2. Khuyến mãi — gọi sai service (base-url)**
- Vị trí: `lib/core/api/api_endpoints.dart:55` (`getPromotions = '/promotions'`) + hàm dùng `getAuthDio()` trong `api_service.dart`
- Bug: gọi `GET /api/v1/auth/promotions` (service auth). Đúng phải `POST /api/v1/xanh/promotions/available` (service xanh).
- Sửa: dùng `getBookingDio()` (base xanh) + path `/promotions/available` + method POST + body envelope.

**B3. Tin tức — gọi sai service (base-url) + sai endpoint**
- Vị trí: `lib/core/api/api_endpoints.dart:44` (`getNews = '/news/available'`) + hàm dùng `getAuthDio()`
- Bug: gọi `GET /api/v1/auth/news/available`. Đúng phải `POST /api/v1/xanh/posts/get-all` (service xanh).
- Sửa: dùng `getBookingDio()` + path `/posts/get-all` + POST.

> **Gốc B2+B3:** chọn nhầm Dio base. Soát TẤT CẢ chỗ gọi `getAuthDio()` / `getBookingDio()` trong `api_service.dart` — API nghiệp vụ (booking, KM, tin, xe...) phải dùng base `xanh`; chỉ login/đăng ký/OTP mới dùng base `auth`.

### 🟠 HIGH

**B4. Google login dùng sai base** — `api_service.dart:84` dùng `getBookingDio()` (xanh) cho `/google-login`; phải là `getAuthDio()` (auth).

**B5. Thiếu áp mã khuyến mãi** — web có `POST /xanh/promotions/check`; app không có → khách không nhập được mã giảm khi đặt xe.

**B6. Thiếu tin HOT** — web có `POST /xanh/posts/hot-news`; app gộp hết vào 1 call tin tức (đang sai base ở B3).

**B7. Đăng ký / Quên mật khẩu lệch nền** — app có `/auth/register`, `/auth/forgot-password` nhưng **web khách thiếu route tương ứng**. Cần AMZ xác nhận luồng đúng (web không cho đăng ký?).

**B8. Không kiểm `responseCode` nhất quán** — nhiều endpoint (tin tức, KM...) app chỉ kiểm HTTP 200. Chuẩn hóa kiểm `responseCode`.

### 🧹 Dọn dẹp (không chặn nhưng nên làm)
Code chết khai báo nhưng không gọi: `about`, `services`, `dashboard`, `statistics` trong `api_endpoints.dart`.

---

## Tổng hợp số lượng

| App | CRITICAL | HIGH |
|-----|----------|------|
| Admin (`amz_xanh_admin_app`) | 4 nhóm (A1-A4) | A5-A8 + (41 mục chi tiet) |
| Khách (`booking-car-app`) | 3 (B1-B3) | B4-B8 |

**Ưu tiên tuyệt đối:** A1, A2, A3 (sai tiền/ảnh giả/phiên) và B1, B2, B3 (hủy đơn giả + sai service) — đây là nhóm gây sai dữ liệu thật/hỏng tính năng.

---

# PHẦN 2 — Bảo mật & Ổn định (review toàn bộ code, phủ 107/107 + 82/82 file)

> Tổng: App admin **14 CRITICAL / 22 HIGH** · App khách **11 CRITICAL / 24 HIGH**. Chi tiết từng dòng: `docs/review/admin/*.md`, `docs/review/customer/*.md`. Dưới đây gom theo nhóm.

## 🔴 BẢO MẬT — CRITICAL

**SEC-1. Lộ mật khẩu & token ra log** (cả 2 app — nhiều chỗ)
- Admin: `auth_service.dart:33-35,51-52` in body login (có password) + response (có access/refresh token); `booking_admin_service.dart:63-78` in PII khách (tên/SĐT/CCCD/GPLX); `payment_method_service.dart:41-42` in danh sách tài khoản ngân hàng công ty.
- Khách: `api_client.dart:62,136` in `Authorization: Bearer <token>` mỗi request; `splash_page.dart:44` in refresh token; `account_page.dart:1315` in token; `api_service.dart:92`, `google_auth_service.dart:48` in Google ID token.
- Sửa: **xóa hết** lệnh print/debugPrint in token/password/PII/response. Cần debug chỉ log status code.

**SEC-2. Lưu mật khẩu admin PLAINTEXT** (admin) — `storage_service.dart:115-116,134` + `login_screen.dart:111-115`. "Ghi nhớ đăng nhập" lưu mật khẩu thô vào SharedPreferences (không mã hóa). → bỏ lưu mật khẩu; chỉ lưu refresh token trong `flutter_secure_storage` (Keychain/Keystore).

**SEC-3. Token lưu SharedPreferences (không mã hóa)** (cả 2 app) — `storage_service.dart`. access/refresh token để plaintext. → chuyển sang `flutter_secure_storage`.

**SEC-4. Cho phép HTTP không mã hóa** (admin) — `AndroidManifest.xml:12` `usesCleartextTraffic="true"`. → bỏ/đặt `false` (mọi API đều HTTPS).

**SEC-5. Luồng refresh token gửi qua kết nối KHÔNG ghim chứng chỉ** (khách) — `api_client.dart:239,253,269-272` và `:363,377,397-398`. Tạo `Dio()` trần để gửi refresh/access token → kẻ giả mạo server bắt được token (MITM). `getPaymentMethods` (`api_service.dart:611-636`) cũng dùng `Dio()` trần (thiếu auth + pinning). → dùng lại Dio đã có pinning.

**SEC-6. OTP BYPASS** (khách) — `otp_page.dart:189-200`. Bấm Tiếp tục chỉ cần đủ 6 chữ số, **KHÔNG gọi API xác thực** → nhập 6 số bất kỳ cũng qua. Lỗ hổng xác thực. → gọi API verify OTP, chỉ qua khi server xác nhận.

## 🔴 ỔN ĐỊNH / SAI DỮ LIỆU — CRITICAL

**STB-1. Màn hình "giả" — bấm Lưu nhưng KHÔNG gọi API** (mất dữ liệu/hiểu nhầm)
- Admin: `booking_contract_update_screen.dart:242-254` — sửa hợp đồng chỉ `Future.delayed(300ms)` rồi báo thành công, **không lưu gì**.
- Khách: `create_password_page.dart:194-198` — đặt lại mật khẩu (quên MK) không gọi API, vẫn báo thành công.
- Sửa: nối API thật, kiểm responseCode; chưa nối xong thì chặn nút + báo "chưa hoạt động".

**STB-2. Không kiểm `responseCode == "00"` → báo thành công giả** (admin — hệ thống, rất nhiều service)
- `financial_management_service`, `maintenance_management_service`, `contract_service`, `booking_service`, `booking_admin_service`, `delivery_receive_service`, `vehicle_service`, `city/station_management_service`, `image_service`, `promotion_management_service` — tất cả chỉ kiểm HTTP 200.
- → chuẩn hóa: mọi response đọc `responseCode`, chỉ thành công khi `"00"` (xanh) / `"200"` (auth). Đặc biệt nguy hiểm ở tài chính + bảo dưỡng (khóa lịch xe) + giao/nhận xe.

**STB-3. Crash khi mở màn (parse ngày / late final / ép kiểu null)**
- Admin: `receive_dialog.dart:249-250`, `delivery_dialog.dart:316-317` — `DateTime.parse` không try/catch → hộp thoại giao/nhận xe trắng màn nếu ngày sai định dạng. `station_update_screen.dart:80-82` `firstWhere` thiếu `orElse` → crash. `bookings_screen.dart:109-115` ép kiểu JSON không guard.
- Khách: `booking_info_carousel.dart:18,24,44` — `late final` gán lại lần 2 → `LateInitializationError` văng app khi mở chi tiết xe. `splash_page.dart:46-47` truy cập null không guard → đá user về login oan.
- Sửa: `tryParse` + kiểm null, `orElse`, bỏ `final`, đọc JSON an toàn.

**STB-4. Copy-paste sai controller** (admin)
- `station_update_screen.dart:130` ô Địa chỉ gắn nhầm `_nameController` → địa chỉ sai. `promotion_update_screen.dart:261` ô "Giới hạn/khách" gắn nhầm `_usageLimitController` → không cập nhật được khuyến mãi.

**STB-5. Dữ liệu test cứng trong form thật** (admin) — `create_vehicle_screen.dart:120,123-170` `_setTestingData()` đổ sẵn biển số/giá/ngày vào form tạo xe → dễ tạo xe rác. → xóa trước khi phát hành.

## 🟠 HIGH & dọn dẹp (trích — chi tiết trong file review)
- Khách: `build.gradle.kts:38` ký bản release bằng **DEBUG keystore** — phải tạo keystore release riêng trước khi lên store.
- Khách: còn rác template cũ — tên app "Cash Flow Management", URL `https://api.cashflow.com/v1/` trong `app_strings.dart`.
- Cả 2: ảnh CCCD/GPLX (PII) tải qua kênh không ghim chứng chỉ; thiếu cert pinning iOS.

## ⚠️ Cần BACKEND xác nhận (app không tự bảo vệ được)
- **IDOR**: `/customers/detail`, `/bookings/detail`, `/bookings/cancel` nhận id do client truyền → xanh-service PHẢI kiểm quyền sở hữu/role từng endpoint.
- `lookupBooking` (tra cứu không cần login): backend cần rate-limit + bookingCode đủ ngẫu nhiên.

> Lưu ý: kết luận dựa trên đọc code tĩnh (repo không có test tự động). Các mục CRITICAL nên test tay trên thiết bị để xác nhận runtime.
