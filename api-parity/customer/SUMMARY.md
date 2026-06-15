# Tổng hợp đối chiếu API + nghiệp vụ — KHÁCH HÀNG

**Cặp:** Web khách `amazing-xanh-fe` (chuẩn) ↔ App khách Flutter `booking-car-app`
**Ngày:** 2026-06-07 · 7 agent + 1 lô bù (C5) · chi tiết: `docs/api-parity/customer/*.md`

## 1. Độ bao phủ

- **44** endpoint backend web khách. Lần chia lô đầu chỉ phủ 32 → agent đối soát **bắt được 12 endpoint lọt** (bank-accounts, promotions, posts, page-contents, site-settings). Đã chạy **lô bù C5** phủ nốt → **44/44, đủ.**
- **39** endpoint app khách.
- ⚠️ Bài học: lần chia lô đầu thiếu — chốt chặn "đối soát ngược" đã cứu. Đây là lý do phải có bước quét ngược, không tin vào số lô.

**Khung nhìn:** App khách là sản phẩm ĐẦY ĐỦ hơn web (web chỉ là trang đặt xe + landing + khu /admin). Nên "chỉ app có" phần lớn là tính năng hợp lệ. Trọng tâm = vùng CHUNG có gọi đúng không.

## 2. 3 lỗi CRITICAL (đều ở APP)

1. **Hủy đơn đặt xe** — hàm `cancelBooking` dùng `replaceFirst('{id}', bookingId)` nhưng chuỗi endpoint **không có `{id}`** → POST `/bookings/cancel` đi **thiếu id, thiếu body**. Màn chi tiết còn hiện "Đã hủy đặt xe" mà **không await/kiểm kết quả** → **báo thành công giả**, đơn không hủy được nhưng khách tưởng đã hủy. *(C2)*
2. **Khuyến mãi** — `getPromotions` dùng nhầm `getAuthDio()` → gọi `GET /api/v1/auth/promotions` thay vì `POST /api/v1/xanh/promotions/available`. **Sai base-url (auth thay vì xanh) + sai path + sai method** → màn khuyến mãi app hỏng. *(C5)*
3. **Tin tức/blog** — `getNews` dùng nhầm `getAuthDio()` → `GET /api/v1/auth/news/available` thay vì `POST /api/v1/xanh/posts/get-all`. **Sai base-url + endpoint hoàn toàn khác** → màn tin tức app hỏng. *(C5)*

> **Nguyên nhân gốc của #2 #3:** app gọi sai **base url** — dùng `authBaseUrl` (auth) cho API vốn thuộc `bookingBaseUrl` (xanh). Cần soát toàn bộ chỗ chọn Dio base.

## 3. Lỗi HIGH (8)

- **Áp mã khuyến mãi** (`promotions/check`) — app thiếu, khách không nhập được mã giảm khi đặt xe.
- **Tin HOT** (`posts/hot-news`) — app gộp hết vào 1 call tin tức (đang sai base).
- **Google login** — app dùng base `xanh` thay vì `auth` (lỗi base ngược chiều với #2/#3). *(C1)*
- **Đăng ký / Quên mật khẩu** — **web khách THIẾU route BFF** (`/auth/register`, `/auth/forgot-password`); app có. Lệch giữa 2 nền (web không cho đăng ký?). Cần xác nhận.
- Còn lại: xem `C1/C2/C3/C5.md`.

## 4. Vấn đề hệ thống

Phần lớn endpoint **cả web lẫn app đều không kiểm `responseCode == "00"`** (web dựa HTTP status/đọc thẳng `result`; app chỉ kiểm `statusCode == 200`). App khách có kiểm responseCode ở vài chỗ (api_service.dart) nhưng không nhất quán. Rủi ro: backend báo lỗi nghiệp vụ mà 2 bên vẫn coi thành công.

## 5. App-only (đa số HỢP LỆ — app đầy đủ hơn)

Tra cứu đơn khách vãng lai (`bookings/lookup`), OTP (`verify-otp`/`resend-otp`), xóa tài khoản, phương thức thanh toán (`payment-methods`), lịch sử đặt xe... → tính năng thật của app, không phải lỗi. **Code chết** cần dọn: `about`, `services`, `dashboard`, `statistics` (khai báo nhưng không gọi).

## 6. Web-only — EXPECTED (không phải lỗi)

13 endpoint khu `/admin` trên web khách, bản đồ TrackAsia, Google Sheet booking, landing động (`posts/detail`). App khách không có là đúng thiết kế.

## 7. Khuyến nghị ưu tiên (bắt outsource sửa)

1. **CRITICAL:** sửa `cancelBooking` (chèn id + await + kiểm responseCode); sửa base-url của `getPromotions` và `getNews` (dùng `bookingBaseUrl` + đúng path `/promotions/available`, `/posts/get-all` + method POST).
2. **Soát toàn bộ chọn Dio base** (auth vs xanh) — đã có 3 chỗ sai 2 chiều.
3. **HIGH:** bổ sung áp mã KM, tin HOT; làm rõ đăng ký/quên mật khẩu (web thiếu route).
4. **Hệ thống:** chuẩn hóa kiểm `responseCode` ở app.
5. Dọn code chết (about/services/dashboard/statistics).

> Chi tiết từng dòng: `C1-*.md` … `C5-orphans.md`. Danh mục gốc: `_inventory-web.md`, `_inventory-app.md`.
