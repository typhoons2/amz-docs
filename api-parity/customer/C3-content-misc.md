# Đối chiếu API khách hàng — LÔ C3: Nội dung & linh tinh (landing, upload ảnh)

> Phạm vi WEB quét: 2 route.ts (`landing-content/[slug]`, `upload/presigned-url`).
> Phạm vi APP: news / about / settings / payment / dashboard + `api_service.dart` + `api_endpoints.dart`.

**Số route web đã quét: 2**
**CRITICAL: 0 — HIGH: 1**

Lưu ý khung nhìn: App khách là sản phẩm đầy đủ hơn web ở mảng nội dung tĩnh (about/services tự render trong app, không gọi API), nhưng web lại có thêm khu landing-page động (admin paste HTML) mà app không có. Đây là khác biệt định hướng sản phẩm, không phải lỗi.

| Hành động | Web (endpoint + method) | App (endpoint + method) | Trạng thái | Mức độ | Ghi chú |
|-----------|--------------------------|--------------------------|------------|--------|---------|
| Hiển thị trang landing động theo đường dẫn tùy biến (admin paste HTML, chèn schema JSON-LD, trả raw HTML) | POST `/api/v1/xanh/posts/detail` (body `{slug}`) qua BFF `/api/landing-content/{slug}` | — (app không có cơ chế render landing-page theo customUrl) | MISSING_IN_APP | HIGH | Web nhận diện post `isLandingPage=true` rồi render HTML thuần kèm JSON-LD. App khách không có màn hình tương đương; tin tức trong app chỉ là list từ `/news/available`, không có luồng landing/customUrl. Lệch nghiệp vụ nội dung marketing giữa 2 nền tảng. |
| Lấy presigned URL để upload ảnh lên S3 (KYC/giấy tờ/avatar) | POST `/api/v1/xanh/storage/presigned-url` (body `{documentType, fileName, contentType, size}`) qua BFF `/api/upload/presigned-url` | POST `/api/v1/xanh/storage/presigned-url` (body `{documentType, fileName, contentType, size}`) — `ApiService.getPresignedUrl` | MATCH | OK | Cùng endpoint, cùng method, cùng 4 field body. App KIỂM responseCode `"00"` (ở `s3_upload_service.dart`); Web BFF KHÔNG kiểm responseCode (chỉ forward, chỉ dựa `response.ok` HTTP). Caller web (`useUploadImage`) cũng không kiểm responseCode → thiếu validate phía web, xem dòng dưới. |
| (Chi tiết) Web kiểm tra kết quả presigned | Web BFF + hook chỉ dựa HTTP `response.ok`, KHÔNG đọc `response.responseCode` | App đọc `responseCode != "00"` → ném lỗi rõ ràng | LOGIC_MISMATCH | MEDIUM | Nếu BE trả HTTP 200 nhưng `responseCode != "00"` (vd lỗi nghiệp vụ), web vẫn coi là thành công và đẩy tiếp object rỗng → user có thể tưởng upload OK nhưng objectKey hỏng. App xử lý đúng. Nên web đọc thêm responseCode. |

## Ghi chú bổ sung (ngoài 2 route web nhưng liên quan lô nội dung/linh tinh trong app)

Các hành động sau CHỈ tồn tại / được dùng phía APP, nằm trong phạm vi feature được giao (news/about/settings/payment/dashboard). Liệt kê để đối soát, phần lớn là hợp lệ:

- **Trang Giới thiệu (about)**: App render hoàn toàn TĨNH trong `about_page.dart` (tầm nhìn, sứ mệnh, dịch vụ, thông tin công ty hardcode). KHÔNG gọi `getAboutInfo`/`getServices` dù 2 endpoint này có khai báo trong `api_endpoints.dart`. → endpoint `/about`, `/services` là code chết (declared nhưng không dùng).
- **Tin tức trên Dashboard (app)**: GET `/api/v1/xanh/news/available` (`getNews`), chỉ kiểm `statusCode==200`, KHÔNG kiểm responseCode. Web không có route BFF tương ứng trong lô này (web lấy tin qua `POSTS.*` ở lô khác).
- **Khuyến mãi trên Dashboard (app)**: GET `/api/v1/xanh/promotions` (`getPromotions`) — lưu ý dùng `getAuthDio` (base auth) thay vì booking; chỉ kiểm `statusCode==200`.
- **Phương thức thanh toán (payment)**: GET `/api/v1/xanh/payment-methods` (`getPaymentMethods`), CÓ kiểm responseCode `"00"` đúng chuẩn xanh-service.
- **Dashboard tổng hợp / thống kê**: `getDashboard` (GET `/dashboard`), `getStatistics` (GET `/statistics`) khai báo trong `api_service.dart` nhưng không thấy nơi gọi trong các page đã đọc → có thể là code chết.

> Các mục app-only/được-app-dùng trên đây nằm ngoài 2 route web của lô C3 nên không phán MISSING_IN_WEB ở đây; chúng thuộc các lô nội dung khác (tin tức/khuyến mãi/thanh toán). Chỉ ghi nhận để tránh bỏ sót khung nhìn.
