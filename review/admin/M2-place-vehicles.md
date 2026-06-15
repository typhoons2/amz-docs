# Review Bảo mật + Ổn định — Module M2 (place + vehicles)

> App: amz_xanh_admin_app (Flutter ADMIN) — bản code SAU FIX (commit 3e6d332, 07/06/2026)
> Phạm vi: `lib/features/place/**` + `lib/features/vehicles/**`
> Số file .dart đã đọc: **22**
> Ngày review: 08/06/2026

## Tổng quan nhanh

- Các service (city/station/vehicle/storage) đều dùng `SecureHttpClient` + `AdminApiResponse.parseXanhResponse` + đọc URL từ `ApiEndpoints` → KHÔNG còn hardcode secret/URL, KHÔNG còn log token. Token đọc qua `StorageService.getAccessToken()`. Đây là điểm tốt so với bản cũ.
- Vấn đề CÒN LẠI tập trung vào **ổn định** (1 bug nghiêm trọng copy-paste controller, crash do `firstWhere` không `orElse`, `setState` sau await thiếu guard, resource leak controller) và **dữ liệu test giả còn sót trong production** (form tạo xe). Bảo mật còn vài điểm MEDIUM/LOW (mở URL bản đồ không validate scheme, chỉ dựa `success` của helper).

## Bảng phát hiện

| File:dòng | Loại | Mức độ | Vấn đề | Cách sửa |
|-----------|------|--------|--------|----------|
| place/screen/station/station_update_screen.dart:130 | null-safety-crash / error-handling | CRITICAL | Trường "Địa chỉ" gán nhầm `controller: _nameController` (copy-paste từ trường Tên). Người dùng gõ Tên thì Địa chỉ cũng đổi theo; `_addressController` không bao giờ nhận input → khi cập nhật, địa chỉ luôn bằng tên xe, sai dữ liệu nghiệp vụ. | Đổi `controller: _nameController` ở trường Địa chỉ thành `controller: _addressController`. |
| place/screen/station/station_update_screen.dart:80-82 | null-safety-crash | HIGH | `widget.cityList?.items?.firstWhere((item) => _station.cityId == item.id)` KHÔNG có `orElse`. Nếu cityId của trạm không nằm trong danh sách city (đã xóa/đổi) → ném `StateError`, màn cập nhật crash ngay khi mở. | Thêm `orElse: () => null` hoặc dùng `firstWhereOrNull` (package collection). |
| vehicles/screens/create_vehicle_screen.dart:120,123-170 | input-validation / error-handling | HIGH | `_setTestingData()` được gọi trong `initState` màn TẠO XE thật, fill sẵn dữ liệu giả (VinFast VF8, biển 30H-123.45, số khung/máy giả, giá, ngày hết hạn...). Code test còn sót trong bản release → admin dễ bấm "Tạo xe" tạo bản ghi rác lên hệ thống. | Xóa lời gọi `_setTestingData()` (dòng 120) và hàm; hoặc bọc `if (kDebugMode)`. |
| vehicles/screens/create_vehicle_screen.dart:357-358 | null-safety-crash | MEDIUM | `'stationId': _selectedStationId!`, `'specificationId': _selectedSpecificationId!` force-unwrap. Hiện validator Form chặn, nhưng nếu luồng submit đổi sẽ ném null-check error. | Guard tường minh đầu `_submitForm`: `if (_selectedStationId == null || _selectedSpecificationId == null) return;`. |
| vehicles/screens/create_vehicle_screen.dart:538,565,566 | null-safety-crash | MEDIUM | Dropdown ép kiểu cứng JSON: `station['id'] as int`, `spec['id'] as int`, `spec['name'] as String`. Nếu API trả id dạng num/double, hoặc null → `TypeError` crash khi build dropdown. | Dùng `_asInt(station['id'])` / `_asString(spec['name']) ?? ''` thay `as int`/`as String`. |
| vehicles/screens/create_vehicle_screen.dart:352-356,378-444 | error-handling / input-validation | MEDIUM | Hàng loạt `int.parse`/`double.parse` cho field số; nếu chuỗi rỗng/không hợp lệ lọt qua → `FormatException`. Có try/catch ngoài nhưng chỉ snackbar chung, không chỉ rõ field. | Dùng `int.tryParse(...) ?? 0` / `double.tryParse(...)`; validate số tại `validator`. |
| vehicles/screens/vehicles_screen.dart:108-116,134-136 | async-race | MEDIUM | `_loadVehicles`: nhánh success (108) và khối `finally` (135) gọi `setState` KHÔNG kiểm tra `mounted`. Rời màn khi request chạy → setState sau dispose, ném exception. | Bọc `if (mounted) setState(...)` ở cả 2 chỗ. |
| place/screen/city/city_management_screen.dart:281 | async-race | MEDIUM | `_loadMore()` gọi `setState` sau `await fetchCities` không guard `mounted`. | Thêm `if (!mounted) return;` trước `setState`. |
| place/screen/station/station_management_screen.dart:303 | async-race | MEDIUM | `_loadMore()` gọi `setState` sau await không guard `mounted` (giống city). | Thêm `if (!mounted) return;` trước `setState`. |
| place/screen/city/city_management_screen.dart:20-21 | resource-leak | MEDIUM | `_searchController` và `_scrollController` KHÔNG được dispose (thiếu hẳn override `dispose`). Mở/đóng màn rò controller + listener. | Thêm `dispose()` giải phóng cả 2 controller. |
| place/screen/station/station_management_screen.dart:23-24 | resource-leak | MEDIUM | `_searchController`, `_scrollController` không dispose (không có override `dispose`). | Thêm `dispose()` giải phóng cả 2 controller. |
| place/screen/city/city_management_screen.dart:56-61 | resource-leak / async-race | MEDIUM | `_scrollController.addListener(...)` gọi lại MỖI lần `_fetchInitialData` chạy (kể cả khi đổi filter/xóa) → listener cộng dồn, `_loadMore` bị gọi trùng nhiều lần; listener không gỡ khi dispose. | Đăng ký listener 1 lần trong `initState`; gỡ bằng dispose. |
| place/screen/station/station_management_screen.dart:67-72 | resource-leak / async-race | MEDIUM | Giống city: `addListener` gọi lặp trong `_fetchInitialData` mỗi lần filter → listener chồng chất, load-more chạy trùng. | Đăng ký listener 1 lần trong `initState`. |
| place/services/station_management_service.dart:174-184 | input-validation / transport-tls | MEDIUM | `openMapUrl` nhận `googleMapUrl` từ API rồi `launchUrl(Uri.parse(url), externalApplication)` KHÔNG validate scheme, KHÔNG `canLaunchUrl`. URL độc hại (`javascript:`, `intent:`, scheme lạ) từ dữ liệu trạm có thể mở luồng ngoài ý muốn; `Uri.parse` lỗi cũng ném exception không bắt. | `final uri = Uri.tryParse(url); if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) return;` và bọc try/catch quanh `launchUrl`. |
| place/services/city_management_service.dart:40 ; station_management_service.dart:46 ; vehicles/services/vehicle_service.dart:131 | error-handling | LOW | Tầng feature chỉ kiểm `parsed['success'] != true`, phụ thuộc hoàn toàn `AdminApiResponse` map đúng `responseCode=="00"`. Nếu helper map sai code thành công, feature không phát hiện. | Xác nhận `parseXanhResponse` map đúng `responseCode=="00"`→success (kiểm tra core); cân nhắc đối chiếu code khi cần. |
| place/screen/station/station_update_screen.dart:74-85 | async-race | LOW | `_initData` khai báo `Future<void>` nhưng KHÔNG await gì, gọi đồng bộ trong `initState`. Vô hại hiện tại nhưng kiểu trả về gây hiểu nhầm; thêm await sau này sẽ chạy ngoài kiểm soát build. | Đổi `_initData` thành hàm `void` đồng bộ. |
| place/screen/city/city_management_screen.dart:326-328 ; station_management_screen.dart:349-351 | async-race | LOW | Dialog xóa: sau await đã guard `mounted` tốt, nhưng `setState(() { _fetchInitialData(); })` gọi hàm async bên trong `setState` (không await) → rebuild thừa. | Gọi `_fetchInitialData();` NGOÀI `setState` (nó tự setState bên trong). |
| place/screen/city/city_create_screen.dart:206-208 ; city_update_screen.dart:251-253 ; station_create_screen.dart:275-277 ; station_update_screen.dart:319-321 | error-handling | LOW | `_validate()` `catch (e) { return false; }` nuốt lỗi không log → upload/tạo thất bại do exception, admin chỉ thấy "thất bại" không chẩn đoán được. | Log `e` (server-side/console dev) trước khi `return false`. |
| vehicles/screens/vehicle_detail_screen.dart:272-274,328-335 ; vehicles_screen.dart:626-629 | null-safety-crash | LOW | Nhiều chỗ nội suy trực tiếp `'${attributes['seatNumber']}'`, `'${specs['power']}'`... in `null` thành chuỗi "null" hiển thị xấu (không crash). | Dùng `?? '-'` cho giá trị hiển thị thay vì nội suy Object null. |
| vehicles/services/storage_service.dart:103 | input-validation | LOW | `file.path.split('/').last` lấy tên file — path Windows dùng `\`; contentType chỉ suy từ đuôi file, không kiểm magic bytes (chấp nhận được cho admin). | Dùng `package:path` `basename(file.path)` cho chắc đa nền tảng. |

## Ghi chú tích cực (đã fix tốt ở bản mới)

- Không còn hardcode token/secret/URL trong module; tất cả qua `ApiEndpoints` + `StorageService`.
- Không còn `print/debugPrint` lộ token hay body; chỉ `log("...error: $e")` (không chứa token/PII nhạy cảm).
- Parse JSON dùng helper `_asInt/_asString/_asMap/_asDate` guard kỹ, hầu hết tránh crash do kiểu dữ liệu (trừ các chỗ `as int`/`as String` trong create_vehicle_screen đã nêu).
- `vehicle_service`/`storage_service` bắt riêng `SocketException` → trả `networkFailure()` thân thiện.

## Khuyến nghị ưu tiên xử lý

1. CRITICAL: sửa nhầm controller địa chỉ (station_update_screen.dart:130) — sai dữ liệu nghiệp vụ.
2. HIGH: thêm `orElse` cho `firstWhere` (station_update_screen.dart:80) — chống crash.
3. HIGH: bỏ `_setTestingData()` khỏi màn tạo xe — chống tạo bản ghi rác.
4. MEDIUM: bổ sung `dispose()` + đăng ký scroll listener 1 lần (2 màn management) — chống rò tài nguyên + load-more trùng.
5. MEDIUM: validate scheme URL bản đồ trước `launchUrl`.
