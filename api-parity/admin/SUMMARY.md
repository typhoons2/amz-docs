# Tổng hợp đối chiếu API + nghiệp vụ — ADMIN

**Cặp:** Web admin `amazing-xanh-admin-fe` (chuẩn) ↔ App admin Flutter `amz_xanh_admin_app`
**Ngày:** 2026-06-07 · 14 agent song song · nguồn chi tiet: các file `docs/api-parity/admin/*.md`

## 1. Độ bao phủ (đã đủ chưa?)

- **105** endpoint backend web admin thực sự dùng — **100% đều được đối chiếu**, không sót (`orphanWeb` rỗng).
- **54** endpoint app admin gọi.
- Nguồn danh mục: web = `route.ts` + `src/constants/api.ts`; app = `core/api.dart` + call-site `http.*`.
- **Kết luận:** ✅ bao phủ đủ. App dùng ~½ số API của web.

Mức độ theo lô: CRITICAL **7** · HIGH **41** (tổng).

| Lô | CRITICAL | HIGH |
|----|----------|------|
| 01 auth-account | 1 | 4 |
| 02a contract | 0 | 11 |
| 02b booking-aux | 2 | 2 |
| 03 customer-kyc | 0 | 0 (mục thiếu xếp MEDIUM/LOW) |
| 04 finance | 0 | 2 |
| 05a car-maintenance | 3 | 1 |
| 05b location-city | 0 | 3 |
| 06 staff-config-promo | 0 | 8 |
| 07 setting-notif | 0 | 0 |
| 08 report | 0 | 7 |
| 09 aux | 0 | 4 |

## 2. Hai vấn đề HỆ THỐNG (xuyên suốt, nguy hiểm nhất)

### 2.1. App gần như KHÔNG kiểm `responseCode`
Hầu hết service app (hợp đồng, booking, tài chính, khách hàng) **chỉ kiểm HTTP status == 200**, không kiểm `responseCode == "00"`. Hậu quả: backend trả HTTP 200 nhưng `responseCode` báo lỗi nghiệp vụ → **app vẫn coi là thành công** → người dùng tưởng đã xong (giao xe/quyết toán/refund "thành công" trong khi backend từ chối). Chỉ `auth` + `banners` mới kiểm responseCode.

### 2.2. Màn hình Báo cáo của app là SỐ GIẢ (hardcode)
Toàn bộ màn "Báo cáo & Thống kê" app (`reports_screen.dart`) **không gọi API nào** — doanh thu, tỷ lệ hoàn thành, biểu đồ... đều là số cố định. Lãnh đạo xem app có thể ra quyết định trên **số liệu không có thật**.

## 3. 7 lỗi CRITICAL (sai dữ liệu / sai chức năng cốt lõi)

1. **Đăng xuất sai đường dẫn** — app gọi `/auth/logout`, đúng phải `/auth/admin/logout`. Phiên admin có thể **không bị thu hồi** dù đã bấm đăng xuất (refreshToken vẫn sống). *(lô 01)*
2. **Giao xe (perform-delivery) — sai tên field tiền** — web gửi `depositAmount/collectedPayAmount/mortgageAmount`, app gửi `collectedDepositAmount/paidAmount`... + **không gửi ảnh giấy tờ/ảnh tình trạng xe**. Backend có thể bỏ qua tiền cọc/tiền thuê thực thu → **sai số liệu tài chính**, mất ảnh bàn giao. *(lô 02b)*
3. **Nhận xe (perform-receive) — sai cấu trúc phụ phí + ảnh giả** — web gửi `surcharges[{reasonId,amount}]`, app gửi 1 số tổng `surchargeAmount`; app còn gửi `receiveImages:['dummy-image-url']` (**ảnh giả để qua ràng buộc backend**) → bẩn dữ liệu quyết toán. *(lô 02b)*
4. **Sửa thông tin xe** — app không có `cars/update`. Admin trên app **không sửa được xe**. *(lô 05a)*
5. **Xóa xe** — app không có `cars/delete`. *(lô 05a)*
6. **Cập nhật pháp lý/bảo dưỡng xe** (đăng kiểm, bảo hiểm, hạn) — app không có `cars/update-legal-maintenance`. *(lô 05a)*
7. *(gộp nhóm 4-6: app thiếu toàn bộ quản lý vòng đời xe phía admin)*

## 4. App gọi API web KHÔNG dùng (app-only — nghi sai/thừa)

- `POST /auth/logout` — **sai path** (thiếu `/admin`), xem CRITICAL #1.
- `news` CRUD (`GET/POST/POST{id}/DELETE`) — app có quản lý tin tức, web admin không có route này.
- `banners` CRUD (`GET/POST/PUT{id}/DELETE`) — tương tự.
→ Cần xác nhận: news/banners là API hợp lệ của backend mà web chưa làm, hay app tự gọi sai?

## 5. Chức năng web CÓ mà app THIẾU (phân loại)

**Nhóm A — thiếu gây lệch nghiệp vụ (HIGH, nên bổ sung):**
- Hợp đồng: tạo, tạo kèm phụ thu, sửa thông tin, đổi trạng thái, pre-payment, đổi xe (văn phòng + hiện trường), gợi ý phụ thu, upload tài liệu, in PDF/Google Doc. *(lô 02a — 11 mục)*
- Nhân sự: tìm/tạo/sửa/khóa/mở/đổi mật khẩu nhân viên, gán role. *(lô 06)*
- Báo cáo: cả 7 loại (đang là số giả). *(lô 08)*
- Cài đặt: mẫu hợp đồng, phí liên vùng, kết nối Google, thông báo sinh nhật/bảo dưỡng. *(lô 07)*

**Nhóm B — có thể CỐ Ý không làm trên app (cần xác nhận nghiệp vụ, không phải bug):**
- Khách hàng CRUD + duyệt/từ chối KYC (CCCD/GPLX) + OCR — lô 03 đánh giá app cố ý chỉ xem chi tiết khách trong luồng booking, không quản lý KYC. **Cần lead xác nhận đây là đúng ý đồ.**

## 6. Khuyến nghị ưu tiên xử lý

1. **Sửa ngay (CRITICAL):** path logout; field tiền + ảnh của perform-delivery/perform-receive; bỏ ảnh giả `dummy-image-url`.
2. **Sửa hệ thống:** thêm kiểm `responseCode == "00"` cho mọi service app (hiện chỉ kiểm HTTP 200).
3. **Quyết định sản phẩm:** màn báo cáo số giả — nối API thật hoặc ẩn đi.
4. **Làm rõ phạm vi:** chốt với lead những nhóm B (KYC, customer CRUD) là cố ý hay thiếu; news/banners app-only là đúng hay sai.

> Chi tiết từng dòng: xem `01-*.md` … `09-*.md`. Danh mục gốc: `_inventory-web.md`, `_inventory-app.md`.
