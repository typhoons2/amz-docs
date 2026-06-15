# Inventory endpoint backend — APP admin (Flutter `amz_xanh_admin_app`)

> Nguon: `lib/core/api.dart` (class `ApiEndpoints`) + grep moi call-site `http.get/post/put/delete` + `MultipartRequest` trong `lib/features/**/services/*.dart`.
> Base URL: `ApiEndpoints.amzHoldings = https://api-portal.amzholdings.vn/api/v1` (qua API Gateway). `enochTech` = alias cua `amzHoldings`.
> App goi backend TRUC TIEP (khong qua BFF). Tat ca endpoint deu di qua gateway.
> Cot "Endpoint backend" da bo prefix `https://api-portal.amzholdings.vn/api/v1` cho gon (chinh la phan path that gateway forward xuong service).

## Bang endpoint (da loai trung)

| # | Endpoint backend (path) | Method | Feature | File nguon (call-site) |
|---|--------------------------|--------|---------|------------------------|
| 1 | `/auth/admin/login` | POST | auth | `features/auth/services/auth_service.dart:32` |
| 2 | `/auth/logout` | POST | auth | `features/auth/services/auth_service.dart:121` |
| 3 | `/xanh/admin/storage/presigned-url` | POST | core / vehicles | `core/services/image_service.dart:188`, `features/vehicles/services/storage_service.dart:30` |
| 4 | `/news` | GET | news | `features/news/services/news_service.dart:16` |
| 5 | `/news` | POST (multipart) | news | `features/news/services/news_service.dart:74` |
| 6 | `/news/{id}` | POST (multipart, update) | news | `features/news/services/news_service.dart:147` |
| 7 | `/news/{id}` | DELETE | news | `features/news/services/news_service.dart:205` |
| 8 | `/banners` | GET | banners | `features/banners/services/banner_service.dart:43` |
| 9 | `/banners` | POST (multipart) | banners | `features/banners/services/banner_service.dart:122` |
| 10 | `/banners/{id}` | PUT (multipart) | banners | `features/banners/services/banner_service.dart:214` |
| 11 | `/banners/{id}` | DELETE | banners | `features/banners/services/banner_service.dart:293` |
| 12 | `/xanh/admin/configs/bank-accounts` | GET | payments | `features/payments/services/payment_method_service.dart:23,81` |
| 13 | `/xanh/admin/configs/rent-services` | GET | contracts | `features/contracts/services/contract_service.dart:319` |
| 14 | `/xanh/admin/bookings/search` | POST | bookings / contracts | `features/bookings/services/booking_service.dart:56`, `features/contracts/services/contract_service.dart:48` |
| 15 | `/xanh/admin/bookings/search/delivery-receive` | POST | delivery_receive | `features/delivery_receive/services/delivery_receive_service.dart:47` |
| 16 | `/xanh/admin/bookings/detail` | POST | bookings / contracts | `features/bookings/services/booking_admin_service.dart:61`, `features/contracts/services/contract_service.dart:102` |
| 17 | `/xanh/admin/bookings/perform-delivery` | POST | bookings | `features/bookings/services/booking_admin_service.dart:85` |
| 18 | `/xanh/admin/bookings/perform-receive` | POST | bookings | `features/bookings/services/booking_admin_service.dart:90` |
| 19 | `/xanh/admin/bookings/add-surcharge` | POST | bookings | `features/bookings/services/booking_admin_service.dart:95` |
| 20 | `/xanh/admin/bookings/remove-surcharge` | POST | bookings | `features/bookings/services/booking_admin_service.dart:100` |
| 21 | `/xanh/admin/bookings/confirm-refund` | POST | bookings | `features/bookings/services/booking_admin_service.dart:105` |
| 22 | `/xanh/admin/bookings/extend` | POST | bookings | `features/bookings/services/booking_admin_service.dart:110` |
| 23 | `/xanh/admin/bookings/finish` | POST | bookings | `features/bookings/services/booking_admin_service.dart:115` |
| 24 | `/xanh/admin/cars/search` | POST | vehicles | `features/vehicles/services/vehicle_service.dart:64,126` |
| 25 | `/xanh/admin/cars/search/schedule` | POST | car_schedule | `features/car_schedule/services/car_schedule_service.dart:53` |
| 26 | `/xanh/admin/cars/detail` | POST | vehicles | `features/vehicles/services/vehicle_service.dart:173,226` |
| 27 | `/xanh/admin/cars/create` | POST | vehicles | `features/vehicles/services/vehicle_service.dart:270` |
| 28 | `/xanh/admin/configs/car-specifications` | GET | vehicles | `features/vehicles/services/vehicle_service.dart:357` |
| 29 | `/xanh/admin/stations/search` | POST | stations / vehicles / place | `features/stations/services/station_service.dart:38`, `features/vehicles/services/vehicle_service.dart:322`, `features/place/services/station_management_service.dart:36` |
| 30 | `/xanh/admin/customers/detail` | POST | customers | `features/customers/services/customer_service.dart:30` |
| 31 | `/xanh/admin/traffic-violations/search` | POST | traffic_violations | `features/traffic_violations/services/traffic_violation_service.dart:43` |
| 32 | `/xanh/admin/transactions/search` | POST | finance / contracts | `features/finance/services/financial_management_service.dart:80`, `features/contracts/services/contract_service.dart:175` |
| 33 | `/xanh/admin/configs/transaction-categories` | GET (query: type) | finance / contracts | `features/finance/services/financial_management_service.dart:24`, `features/contracts/services/contract_service.dart:222` |
| 34 | `/xanh/admin/configs/surcharges` | GET | contracts | `features/contracts/services/contract_service.dart:273` |
| 35 | `/xanh/admin/booking-logs/get` | POST | contracts | `features/contracts/services/contract_service.dart:388` |
| 36 | `/xanh/admin/transactions/create` | POST | finance | `features/finance/services/financial_management_service.dart:138` |
| 37 | `/xanh/admin/transactions/void` | POST | finance | `features/finance/services/financial_management_service.dart:172` |
| 38 | `/xanh/admin/maintenance/search` | POST | maintenance | `features/maintenance/services/maintenance_management_service.dart:104` |
| 39 | `/xanh/admin/maintenance/create` | POST | maintenance | `features/maintenance/services/maintenance_management_service.dart:164` |
| 40 | `/xanh/admin/maintenance/update` | POST | maintenance | `features/maintenance/services/maintenance_management_service.dart:217` |
| 41 | `/xanh/admin/maintenance/delete` | POST | maintenance | `features/maintenance/services/maintenance_management_service.dart:247` |
| 42 | `/xanh/admin/maintenance/configs/partners` | GET | maintenance | `features/maintenance/services/maintenance_management_service.dart:21` |
| 43 | `/xanh/admin/maintenance/configs/maintenance-categories` | GET | maintenance | `features/maintenance/services/maintenance_management_service.dart:52` |
| 44 | `/xanh/admin/promotions/search` | POST | promotion | `features/promotion/services/promotion_management_service.dart:36` |
| 45 | `/xanh/admin/promotions/create` | POST | promotion | `features/promotion/services/promotion_management_service.dart:96` |
| 46 | `/xanh/admin/promotions/update` | POST | promotion | `features/promotion/services/promotion_management_service.dart:152` |
| 47 | `/xanh/admin/promotions/delete` | POST | promotion | `features/promotion/services/promotion_management_service.dart:182` |
| 48 | `/xanh/admin/stations/create` | POST | place | `features/place/services/station_management_service.dart:86` |
| 49 | `/xanh/admin/stations/update` | POST | place | `features/place/services/station_management_service.dart:133` |
| 50 | `/xanh/admin/stations/delete` | POST | place | `features/place/services/station_management_service.dart:163` |
| 51 | `/xanh/admin/cities/search` | POST | place | `features/place/services/city_management_service.dart:34` |
| 52 | `/xanh/admin/cities/create` | POST | place | `features/place/services/city_management_service.dart:82` |
| 53 | `/xanh/admin/cities/update` | POST | place | `features/place/services/city_management_service.dart:127` |
| 54 | `/xanh/admin/cities/delete` | POST | place | `features/place/services/city_management_service.dart:157` |

**Tong: 54 endpoint backend duy nhat (da loai trung).**

## Ghi chu / phat hien

- `ApiEndpoints.detailStations`, `detailCities` (POST `/xanh/admin/stations/detail`, `/xanh/admin/cities/detail`) co KHAI BAO trong api.dart nhung KHONG co call-site nao goi → khong tinh vao bang tren.
- `ApiEndpoints.getAllContracts` (POST `/xanh/admin/booking/contract/get-all`) co KHAI BAO nhung KHONG duoc goi o dau (dead constant).
- Cac duong dan KHONG phai endpoint backend (da loai khoi bang):
  - `presigned-url` tra ve mot `uploadUrl` ben ngoai (storage/S3) — `storage_service.dart:69` va `image_service.dart:226` PUT len URL do, KHONG phai gateway backend.
  - `enochTechImageBaseUrl` chi de ghep URL hien anh (banner/news), khong phai API call.
  - `station_management_service.dart:182 openMapUrl` chi mo URL ban do ngoai (Google Maps), khong phai backend.
- responseCode: app dung pattern check `response.statusCode == 200` (HTTP status) o nhieu service (vd `booking_admin_service.dart`), CHUA verify `responseCode == "00"` cua xanh-service o moi noi → can ra soat rieng khi lam parity (rui ro: app coi HTTP 200 la thanh cong du body co responseCode loi).
- Tat ca endpoint `/xanh/admin/**` thuoc xanh-service (success code `"00"`); `/auth/**` thuoc auth-service (success code `"200"`); `/news`, `/banners` la nhom Enoch Tech (cung gateway).
