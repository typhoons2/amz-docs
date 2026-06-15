# Đối chiếu API + nghiệp vụ — LÔ 05a: Quản lý xe (CRUD, trạng thái) + Bảo dưỡng

> Phạm vi Web (BFF Next.js): `src/app/api/management/car/**` + `src/app/api/management/maintenance/**`
> Phạm vi App (Flutter): `lib/features/vehicles/**` + `lib/features/maintenance/**`, endpoint khai báo ở `lib/core/api.dart`

## Tổng quan

- **Số route Web đã quét:** 13 (6 route Quản lý xe + 7 route Bảo dưỡng) — đọc đủ từng file route.ts, không bỏ sót.
- **Tổng số dòng đối chiếu:** 13.
- **CRITICAL:** 3 (App thiếu hẳn: Sửa xe, Xóa xe, Cập nhật pháp lý/bảo dưỡng xe — đều là chức năng ghi/sửa dữ liệu).
- **HIGH:** 2 (App không kiểm tra `responseCode = "00"` ở toàn bộ luồng tạo/sửa/xóa — chỉ dựa HTTP 200, dễ báo "thành công" sai; App khai báo endpoint chi tiết bảo dưỡng nhưng không hề gọi).

> Lưu ý chung về kiểm tra kết quả: Lớp BFF của Web chỉ forward nguyên JSON và chỉ kiểm tra `response.ok` (HTTP status); việc kiểm `responseCode = "00"` nằm ở tầng giao diện (ngoài phạm vi lô này). Phía App thì **không nơi nào** kiểm `responseCode`, chỉ kiểm `statusCode == 200`. Cùng yếu điểm nhưng App nguy hiểm hơn vì là điểm gọi backend cuối cùng.

## Bảng đối chiếu

| Hành động | Web (endpoint + method) | App (endpoint + method) | Trạng thái | Mức độ | Ghi chú nghiệp vụ |
|-----------|-------------------------|--------------------------|------------|--------|-------------------|
| Tìm/lọc danh sách xe | POST `/api/v1/xanh/admin/cars/search` | POST `/api/v1/xanh/admin/cars/search` (`getCars`/`fetchCars`) | MATCH | OK | Cùng endpoint, cùng method. Body App gửi qua `data{}`: keyword, brand, stationId, status, startTime, endTime, availableOnly, seatNumber, page, size — đủ field lọc. Cả 2 chỉ kiểm HTTP 200, không kiểm responseCode. |
| Xem chi tiết xe | POST `/api/v1/xanh/admin/cars/detail` | POST `/api/v1/xanh/admin/cars/detail` (`fetchCarDetail`/`getCarDetail`) | MATCH | OK | Cùng endpoint/method. Body `data{ id, startTime, endTime }` khớp. App chỉ kiểm HTTP 200. |
| Tạo xe mới | POST `/api/v1/xanh/admin/cars/create` | POST `/api/v1/xanh/admin/cars/create` (`createCar`) | MATCH | LOW | Cùng endpoint/method. App bọc toàn bộ `carData` vào `data`. App chỉ kiểm HTTP 200 (không kiểm responseCode "00") → nếu backend trả 200 nhưng responseCode lỗi, App vẫn báo tạo thành công. |
| Sửa thông tin xe | POST `/api/v1/xanh/admin/cars/update` | (không có) | MISSING_IN_APP | CRITICAL | Web có chức năng sửa xe; App KHÔNG khai báo endpoint `cars/update` và không có hàm `updateCar` nào. Quản trị viên dùng App không sửa được thông tin xe → lệch chức năng nghiệp vụ quan trọng. |
| Xóa xe | POST `/api/v1/xanh/admin/cars/delete` | (không có) | MISSING_IN_APP | CRITICAL | Web có xóa xe; App không khai báo `cars/delete`, không có hàm xóa xe. App không xóa được xe. |
| Cập nhật pháp lý / bảo dưỡng của xe (đăng kiểm, bảo hiểm, hạn...) | POST `/api/v1/xanh/admin/cars/update-legal-maintenance` | (không có) | MISSING_IN_APP | CRITICAL | Web có cập nhật thông tin pháp lý/bảo dưỡng gắn với xe; App không có endpoint `cars/update-legal-maintenance` lẫn hàm tương ứng. Đây là nghiệp vụ riêng (khác với phiếu bảo dưỡng bên dưới) — App thiếu hoàn toàn. |
| Tìm/lọc danh sách phiếu bảo dưỡng | POST `/api/v1/xanh/admin/maintenance/search` | POST `/api/v1/xanh/admin/maintenance/search` (`fetchMaintenances`) | MATCH | OK | Cùng endpoint/method. Body `data{}`: keyword, carId, partnerId, status, startDate, endDate, page, size — khớp tham số lọc. App chỉ kiểm HTTP 200. |
| Xem chi tiết phiếu bảo dưỡng | POST `/api/v1/xanh/admin/maintenance/detail` | POST `/api/v1/xanh/admin/maintenance/detail` (`detailMaintenance` khai báo trong api.dart nhưng KHÔNG được gọi) | MISSING_IN_APP | HIGH | Web có route chi tiết bảo dưỡng. App khai báo hằng `detailMaintenance` nhưng không service/màn hình nào gọi — màn chi tiết App dựng từ dữ liệu danh sách sẵn có. Trên thực tế App không lấy chi tiết từ server → có thể thiếu field chỉ trả ở API detail. |
| Tạo phiếu bảo dưỡng | POST `/api/v1/xanh/admin/maintenance/create` | POST `/api/v1/xanh/admin/maintenance/create` (`createMaintenance`) | BODY_MISMATCH | LOW | Cùng endpoint/method. App gửi `data{}`: carId, currentKm, categoryId, partnerId, partnerName, startDate, endDate, totalAmount, status, note, images. Cần đối chiếu lại field bắt buộc với backend (App đặt carId/currentKm/categoryId/startDate là bắt buộc); chênh lệch field nhỏ. App chỉ kiểm HTTP 200, không kiểm responseCode. |
| Sửa phiếu bảo dưỡng | POST `/api/v1/xanh/admin/maintenance/update` | POST `/api/v1/xanh/admin/maintenance/update` (`updateMaintenance`) | MATCH | LOW | Cùng endpoint/method. Body `data{ id, currentKm, categoryId, partnerId, partnerName, startDate, endDate, totalAmount, status, note, images }`. App KHÔNG chặn theo trạng thái (vd đã COMPLETED/CANCELLED vẫn cho sửa) — cần xác nhận Web có chặn không. App chỉ kiểm HTTP 200. |
| Xóa phiếu bảo dưỡng | POST `/api/v1/xanh/admin/maintenance/delete` | POST `/api/v1/xanh/admin/maintenance/delete` (`deleteMaintenance`) | MATCH | LOW | Cùng endpoint/method, body `data{ id }`. App chỉ kiểm HTTP 200, không kiểm responseCode. |
| Lấy danh mục loại bảo dưỡng (cấu hình) | GET `/api/v1/xanh/admin/maintenance/configs/maintenance-categories` | GET `/api/v1/xanh/admin/maintenance/configs/maintenance-categories` (`fetchMaintenanceCategories`) | MATCH | OK | Cùng endpoint/method GET. App map `result[] → {id, name}`. Chỉ kiểm HTTP 200. |
| Lấy danh sách đối tác bảo dưỡng (cấu hình) | GET `/api/v1/xanh/admin/maintenance/configs/partners` | GET `/api/v1/xanh/admin/maintenance/configs/partners` (`fetchMaintenancePartners`) | MATCH | OK | Cùng endpoint/method GET. App map `result[] → {id, name}`. Chỉ kiểm HTTP 200. |

## Điểm cần lưu ý cho lead (mô tả nghiệp vụ)

1. **App thiếu 3 chức năng quản lý xe quan trọng (CRITICAL):** trên App, người quản trị KHÔNG sửa được thông tin xe, KHÔNG xóa được xe, và KHÔNG cập nhật được thông tin pháp lý/bảo dưỡng của xe (đăng kiểm, bảo hiểm...). Trên Web đều làm được. App hiện chỉ xem danh sách, xem chi tiết và tạo xe mới.

2. **Phiếu bảo dưỡng: App gần như đầy đủ** (tạo / sửa / xóa / tìm kiếm / lấy danh mục loại + đối tác đều khớp Web). Hai khác biệt nhỏ: (a) App không thật sự gọi API "xem chi tiết phiếu bảo dưỡng" (dùng lại dữ liệu danh sách), (b) khi sửa phiếu, App không thấy chặn theo trạng thái — cần xác nhận quy tắc với backend/Web.

3. **Toàn bộ luồng App chỉ kiểm tra "máy chủ trả về 200" chứ không kiểm mã nghiệp vụ `responseCode = "00"`.** Hệ quả: nếu backend trả HTTP 200 nhưng nội dung báo lỗi (vd trùng dữ liệu, sai điều kiện), App vẫn hiển thị "thành công" cho người dùng — rủi ro báo nhầm trạng thái.
