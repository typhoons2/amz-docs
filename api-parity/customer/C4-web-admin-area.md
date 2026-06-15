# C4 — Khu vực /admin trên web khách (đối chiếu với app khách)

> Lô: **C4-web-admin-area**
> Số route web đã quét: **13/13**
> CRITICAL: **0** — HIGH: **0**

## Bối cảnh

Web khách (`amazing-xanh-fe`) có một khu **mini-admin** dưới `/admin/*` dùng để quản trị nội dung (CMS): đăng nhập staff, quản lý bài viết/landing page, nội dung trang, cấu hình site, upload ảnh. Các route này gọi endpoint backend **dành cho staff/admin** (`/api/v1/auth/admin/*` và `/api/v1/xanh/admin/*`), yêu cầu JWT staff (role ADMIN/MANAGER/MARKETING).

App khách (`booking-car-app`, Flutter) là sản phẩm cho **người thuê xe** — **không có khu admin nào**. Đã grep `api_endpoints.dart` và toàn bộ `lib/`: app KHÔNG khai báo và KHÔNG gọi bất kỳ endpoint `/admin/*`, `page-contents`, `site-settings`, `posts/admin`, hay `auth/admin/*`. Đây là điều **đúng như mong đợi** — toàn bộ lô C4 là web-only/admin-only, không phải lỗi.

**Ngoại lệ cần lưu ý:** route web admin `upload/presigned-url` dùng endpoint admin `/api/v1/xanh/admin/storage/presigned-url`. App khách CÓ tính năng upload ảnh (CCCD/GPLX) nhưng dùng endpoint **customer** `/api/v1/xanh/storage/presigned-url` — endpoint khác nhau, mục đích khác nhau (admin upload ảnh bài viết vs khách upload ảnh giấy tờ). Đây là 2 luồng tách biệt hợp lệ, không phải lệch parity.

## Bảng đối chiếu

| Hành động | Web (endpoint+method) | App (endpoint+method) | Trạng thái | Mức độ | Ghi chú |
|---|---|---|---|---|---|
| Đăng nhập staff/admin (CMS) | `POST /api/v1/auth/admin/login` (auth-service) | — | MISSING_IN_APP | LOW | App khách không có đăng nhập admin. Web check `data.accessToken` + set cookie HttpOnly; không check `responseCode="200"` rõ ràng (dựa vào `responseApi.ok` + tồn tại `result.data.accessToken`). EXPECTED admin-only. |
| Đăng xuất staff/admin | `POST /api/v1/auth/admin/logout` (auth-service) | — | MISSING_IN_APP | LOW | Best-effort gọi BE rồi clear cookie; không check responseCode. EXPECTED admin-only. |
| Lấy profile staff/admin | `GET /api/v1/auth/admin/profile` (auth-service) | — | MISSING_IN_APP | LOW | Trả 401 nếu không có cookie; map user từ `result.data`. EXPECTED admin-only. |
| Liệt kê nội dung trang (page_contents) | `POST /api/v1/xanh/admin/page-contents/list` (xanh) | — | MISSING_IN_APP | LOW | Qua `localBeFetch`; passthrough body. Không tự check `responseCode="00"` ở route (forward nguyên json). EXPECTED admin-only (CMS). |
| Cập nhật nội dung trang | `POST /api/v1/xanh/admin/page-contents/update` (xanh) | — | MISSING_IN_APP | LOW | Passthrough body. EXPECTED admin-only (CMS). |
| Tạo bài viết | `POST /api/v1/xanh/admin/posts/create` (xanh) | — | MISSING_IN_APP | LOW | Qua `apiBackendFetch` (envelope + Bearer staff). Passthrough. EXPECTED admin-only. |
| Xóa bài viết | `POST /api/v1/xanh/admin/posts/delete` (xanh) | — | MISSING_IN_APP | LOW | Passthrough body (chứa id bài viết). EXPECTED admin-only. |
| Lấy danh sách landing page | `POST /api/v1/xanh/admin/posts/list` (xanh) | — | MISSING_IN_APP | LOW | Gọi list size=200 rồi filter `isLandingPage` client-side; chỉ trả id/title/slug/customUrl. EXPECTED admin-only. |
| Liệt kê bài viết (admin) | `POST /api/v1/xanh/admin/posts/list` (xanh) | — | MISSING_IN_APP | LOW | Passthrough body (page/size/status). EXPECTED admin-only. |
| Cập nhật bài viết | `POST /api/v1/xanh/admin/posts/update` (xanh) | — | MISSING_IN_APP | LOW | Passthrough. EXPECTED admin-only. |
| Liệt kê cấu hình site (site_settings) | `POST /api/v1/xanh/admin/site-settings/list` (xanh) | — | MISSING_IN_APP | LOW | Qua `localBeFetch`; body có thể rỗng. EXPECTED admin-only (CMS). |
| Cập nhật cấu hình site | `POST /api/v1/xanh/admin/site-settings/update` (xanh) | — | MISSING_IN_APP | LOW | Passthrough body. EXPECTED admin-only (CMS). |
| Lấy presigned URL upload (admin) | `POST /api/v1/xanh/admin/storage/presigned-url` (xanh) | `POST /api/v1/xanh/storage/presigned-url` (xanh) | MISSING_IN_APP | LOW | App CÓ upload ảnh nhưng dùng endpoint **customer** (`/storage/presigned-url`, không phải `/admin/...`) cho ảnh CCCD/GPLX. App check `responseCode` đúng (`s3_upload_service.dart`). Endpoint admin này EXPECTED admin-only. |

## Kết luận

- 13/13 route admin của web đều là **MISSING_IN_APP nhưng EXPECTED (LOW)**: app khách không có khu quản trị, đúng thiết kế.
- Không có CRITICAL/HIGH. Không phát hiện lệch nghiệp vụ hay vượt quyền.
- Lưu ý duy nhất (không phải lỗi): endpoint presigned-url admin vs customer là 2 luồng riêng — admin upload ảnh CMS, app khách upload ảnh giấy tờ. App check responseCode đúng ở luồng upload của mình.
- Quan sát phụ (không thuộc parity app, chỉ ghi nhận): các route admin web phần lớn **forward nguyên `json`** mà không tự kiểm `responseCode="00"`/`"200"` tại tầng BFF — dựa vào `response.ok` (HTTP status). Đây là pattern nhất quán của khu admin web, không ảnh hưởng app khách.
