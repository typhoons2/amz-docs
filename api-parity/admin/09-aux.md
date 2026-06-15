# Đối chiếu API + nghiệp vụ — LÔ 09-aux (Phụ trợ: OnlyOffice, Lịch xe, Upload ảnh)

**Số route web đã quét:** 5 route.ts
- `src/app/api/onlyoffice/callback/route.ts`
- `src/app/api/onlyoffice/config/route.ts`
- `src/app/api/onlyoffice/prepare/route.ts`
- `src/app/api/schedule/get/route.ts`
- `src/app/api/upload/presigned-url/route.ts`

**Tóm tắt mức độ:**
- CRITICAL: 0
- HIGH: 3 (OnlyOffice callback/config/prepare là chức năng soạn thảo hợp đồng chỉ có trên web, app không có; nhưng đây là tính năng desktop nên xếp HIGH)
- MEDIUM: 2 (web schedule + web presigned KHÔNG verify responseCode "00", app cũng KHÔNG verify → cả hai chỉ dựa HTTP status)
- LOW: 1

> Lưu ý nghiệp vụ chung: Cụm OnlyOffice (soạn thảo file hợp đồng .docx ngay trên trình duyệt) là tính năng riêng của web admin, App Flutter không có màn hình soạn thảo tài liệu. Lịch xe và Upload ảnh (presigned-url) thì App CÓ gọi tương ứng.

| Hành động | Web (endpoint + method) | App (endpoint + method) | Trạng thái | Mức độ | Ghi chú nghiệp vụ |
|-----------|-------------------------|--------------------------|-----------|--------|-------------------|
| Lấy danh sách lịch xe (theo khoảng ngày, trạm, model, trạng thái booking) | `POST /api/v1/xanh/admin/cars/search/schedule` (qua `SCHEDULE.GET`, gọi qua `apiBackendFetch`) | `POST /api/v1/xanh/admin/cars/search/schedule` (`ApiEndpoints.getCarSchedule`, `CarScheduleService.getCarSchedule`) | MATCH | OK | Cùng endpoint + method. Body cùng cấu trúc `{requestId, requestTime, data:{startDate, endDate, page, size, ...filter}}`. App gửi thêm nhiều filter tùy chọn (stationId, keyword, carModel, seatNumber, ownerType, carStatus, filterBookingStatuses, availabilityStatus); web chỉ forward nguyên `body` từ UI nên tập field phụ thuộc UI. Cả hai chỉ kiểm HTTP status, KHÔNG verify `responseCode="00"` → xem dòng dưới. |
| Verify responseCode cho lịch xe | Web: chỉ check `response.ok` (HTTP), KHÔNG check `responseCode="00"` | App: chỉ check `statusCode==200`, KHÔNG check `responseCode="00"` | MATCH | MEDIUM | Cả hai cùng thiếu kiểm `responseCode` đúng convention xanh-service. Hành vi giống nhau (không lệch giữa 2 nền tảng) nhưng cùng tiềm ẩn rủi ro: BE trả HTTP 200 + responseCode lỗi vẫn bị coi là thành công. |
| Xin presigned URL để upload file lên S3 (ảnh / tài liệu) | `POST /api/v1/xanh/admin/storage/presigned-url` (qua `UPLOAD_IMAGE.PRESIGNED`, gọi qua `apiBackendFetch`) | `POST /api/v1/xanh/admin/storage/presigned-url` (`ApiEndpoints.presignedUrl`, `VehicleStorageService.getPresignedUrl`) | MATCH | OK | Cùng endpoint + method. Body cùng field `{fileName, folderName, contentType, size}`. Web forward nguyên body từ UI; app build body với folder mặc định `cars`. |
| Verify responseCode cho presigned URL | Web: chỉ check `response.ok`, KHÔNG check `responseCode="00"` | App: chỉ check `statusCode==200`, KHÔNG check `responseCode="00"` | MATCH | MEDIUM | Cả hai cùng thiếu verify `responseCode`. Hành vi đồng nhất giữa 2 nền tảng. |
| Upload file thật lên S3 bằng presigned URL (PUT trực tiếp lên S3, không qua backend) | PUT thẳng lên `uploadUrl` (S3), header `Content-Type` theo loại file (thực hiện trong `onlyoffice/callback` và phía client upload ảnh) | App: PUT thẳng lên `uploadUrl` S3 (`VehicleStorageService.uploadToS3`), check `statusCode==200` | MATCH | LOW | Cùng cơ chế: xin presigned rồi PUT trực tiếp lên S3. Endpoint S3 là URL ký sẵn (không phải API backend). |
| Lấy config OnlyOffice để mở trình soạn thảo .docx hợp đồng (sinh JWT, callbackUrl, fileUrl) | `GET /api/onlyoffice/config?templateId=...` (route nội bộ Next.js, KHÔNG gọi backend — chỉ ký JWT bằng `ONLYOFFICE_JWT_SECRET` và trả config) | (không có) | MISSING_IN_APP | HIGH | Chức năng soạn thảo tài liệu trên trình duyệt qua OnlyOffice Document Server. App Flutter không có màn soạn thảo .docx. Route này không chạm backend nghiệp vụ (chỉ tạo cấu hình + token cho editor). |
| Tải file .docx mẫu về public server để OnlyOffice mở (prepare) | `POST /api/onlyoffice/prepare` body `{templateId, fileUrl}` — tải `fileUrl` về thư mục `public/uploads/templates/{templateId}.docx` (ghi file cục bộ, KHÔNG gọi backend) | (không có) | MISSING_IN_APP | HIGH | Bước chuẩn bị file cho editor OnlyOffice. Thuần thao tác file hệ thống trên server web; app không có. Lưu ý bảo mật: tải file từ `fileUrl` do client truyền vào và ghi xuống đĩa (tiềm ẩn SSRF/path, nhưng ngoài phạm vi so-parity). |
| OnlyOffice callback: sau khi sửa xong file, tải bản đã sửa, xin presigned, PUT lên S3 rồi cập nhật template | `POST /api/onlyoffice/callback?templateId=...&sig=...` → kiểm `sig`, nếu `status==2\|\|6` thì: (1) tải file đã sửa, (2) `POST /api/v1/xanh/admin/storage/presigned-url`, (3) PUT lên S3, (4) `POST /api/v1/xanh/admin/contract-templates/update` (qua `TEMPLATE.UPDATE`) | (không có) | MISSING_IN_APP | HIGH | Luồng lưu file hợp đồng đã soạn vào template. Backend that được gọi cuối luồng là `contract-templates/update`. App không có chức năng soạn/cập nhật file template hợp đồng. Web dùng `BACKEND_SERVICE_TOKEN` (service token) thay vì token user; KHÔNG verify `responseCode` (chỉ check `updateRes.ok`). Update payload chỉ gửi `{id, fileKey}`, comment trong code cảnh báo có thể thiếu các field khác (name/code/description/isActive) nếu backend yêu cầu — rủi ro mất dữ liệu field khác khi update. |
| Cập nhật contract-template (endpoint backend that dùng bởi callback) | `POST /api/v1/xanh/admin/contract-templates/update` (`TEMPLATE.UPDATE`) | (không có) | MISSING_IN_APP | HIGH | App không gọi `contract-templates/update`. Toàn bộ quản lý mẫu hợp đồng + soạn thảo là web-only. |
