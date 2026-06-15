# Trạng thái audit app outsource + việc tiếp theo (cập nhật 08/06/2026)

## Đã xác minh (trên CODE ĐÚNG — đã đồng bộ remote)
- **App ADMIN** (`amz_xanh_admin_app`, nhánh `release` `3e6d332`): CRITICAL **6/6 fixed**, tổng **24/28**, review bảo mật lại **0 CRIT / 0 HIGH**. → đạt gate CRITICAL.
- **App KHÁCH** (`booking-car-app`, nhánh `temp` `250f5bd`): còn **3 CRITICAL** = (1) debug signing key `build.gradle.kts:38`, (2) OTP không verify server `otp_page.dart:189`, (3) crash `late final _car` `booking_info_carousel.dart`. + vài HIGH (hủy đơn nút comment, sai base-url google/promo/news, refresh pinning, create_password TODO).
- **Backend authz `xanh-service`**: lỗ auth-bypass (gateway KHÔNG strip `X-User-*` + route catch-all `/xanh/**` không có AuthenticationFilter + cổng 8082 publish ra host) — CRITICAL, độc lập app. Chi tiết: `xanh-service/docs/review/authz-xanh/GATEWAY-CONFIRMED.md`.

## Tài liệu chính (đã ghi)
- `docs/api-parity/EMAIL-TO-OUTSOURCE.md` — **email sẵn sàng gửi** (admin pass + 3 CRIT khách + 3 đáp án + quy trình nghiệm thu).
- `docs/api-parity/OUTSOURCE-ANSWERS.md` *(đang ở `amz_xanh_admin_app/docs/api-parity/`)* — đáp án 3 câu hỏi kèm JSON, gửi kèm email.
- `docs/api-parity/OUTSOURCE-FIXES.md` — có banner đính chính (phần admin đã lỗi thời).
- `docs/review/fix-verification/` — verify từng finding (SUMMARY-admin-v2, cust-*, cust-CRITICAL-recheck).
- `docs/review/admin/SUMMARY.md` — review bảo mật admin trên code mới.

## Việc tiếp theo của LEAD
1. **NGAY:** gửi `EMAIL-TO-OUTSOURCE.md` + đính kèm `OUTSOURCE-ANSWERS.md`.
2. **Giao nội bộ AMZ (gói input outsource đang chờ):** keystore release + secret ký; TLS pin SHA256; endpoint API dashboard; contract `verify-otp`; quyết+làm endpoint hủy đơn cho khách (`/xanh/bookings/cancel` role CUSTOMER).
3. **Hỏi DevOps:** cổng 8082 có mở ra Internet không → quyết vá auth-bypass gấp hay xếp lịch (patch nhỏ: gateway `RemoveRequestHeader=X-User-*` + bỏ publish 8082).
4. **Quyết định (hoãn được):** rotate OAuth credential (app vẫn chạy nếu không đổi — chỉ là nợ bảo mật); làm tính năng khách tự hủy đơn?; chấp nhận nghiệm thu admin GĐ1 có điều kiện.

## Việc còn treo cho Claude (sau compact)
- Gom `OUTSOURCE-ANSWERS.md` về `docs/api-parity/` cho gọn (đang chờ lead OK).
- Soạn **checklist nội bộ AMZ** (mục 2+3 ở trên).
- (Tùy chọn) mở `client_secret_*.json` xác định có secret thật → chốt có cần rotate.
- Khi outsource push bản sửa tiếp → verify lại (workflow `fix-verification`).

## Bài học (đã lưu memory)
Repo outsource ở `gitlab.com/company-enochtech`. PHẢI `git fetch` + đồng bộ local lên đúng SHA remote TRƯỚC khi verify — local từng kẹt bản cũ 19/04 gây kết luận sai.
