# Doi chieu API + nghiep vu — LO 05b: Dia diem/Tram (Station) + Tinh thanh (City)

> Web admin (Next.js) goi route BFF noi bo `src/app/api/management/{location,city}/**` → forward xuong backend `xanh-service`.
> App admin (Flutter) goi backend `xanh-service` TRUC TIEP qua `ApiEndpoints` trong `lib/core/api.dart`.

## Tom tat

- **So route web da quet: 12** (location: create, delete, detail, export-excel, search, update — 6 route; city: create, delete, detail, export-excel, search, update — 6 route).
- **CRITICAL: 0**
- **HIGH: 3** (App THIEU xuat Excel tram; App THIEU xuat Excel thanh pho; App khong kiem `responseCode` "00" cho ca create/update/delete/search → bao "thanh cong" sai khi BE tra loi nghiep vu nhung HTTP van 200).
- **MEDIUM: 2** (App khong goi API detail rieng cho tram/thanh pho — dung lai du lieu danh sach; web co route detail rieng).

**Luu y chung ve responseCode (anh huong nhieu dong):** Tat ca service trong app (`StationManagementService`, `CityManagementService`, `StationService`) chi kiem `response.statusCode == 200`, KHONG kiem `result.responseCode == "00"` theo convention xanh-service. Web (lop BFF) cung chi check `response.ok` (HTTP) roi tra nguyen body cho UI; viec kiem `responseCode` thuc su nam o tang UI/hook cua web (ngoai pham vi route.ts). Du vay, ben app khong co bat ky cho nao kiem `responseCode`, nen rui ro "bao thanh cong sai" cao hon han web.

## Bang doi chieu

| Hanh dong | Web (endpoint + method) | App (endpoint + method) | Trang thai | Muc do | Ghi chu nghiep vu |
|-----------|-------------------------|--------------------------|------------|--------|-------------------|
| Tim/danh sach tram (Station) | POST `/api/v1/xanh/admin/stations/search` (LOCATION.GET_ALL) | POST `/api/v1/xanh/admin/stations/search` (`searchStations`, qua `StationManagementService.fetchStations` & `StationService.getStations`) | MATCH | LOW | Body khop: `data.keyword/status/cityId/page/size`. App co loc theo `cityId` va `status` giong web. App chi check HTTP 200, khong check responseCode "00". |
| Xem chi tiet tram (Station) | POST `/api/v1/xanh/admin/stations/detail` (LOCATION.DEATIL) | Endpoint `detailStations` CO khai bao trong `api.dart` nhung KHONG service nao goi; app dung lai du lieu tu danh sach de hien chi tiet (`station_detail_widget.dart`) | LOGIC_MISMATCH | MEDIUM | Web goi API detail rieng (lay du lieu moi nhat). App khong goi → hien thi du lieu cu tu list, co the lech neu ban ghi vua doi. Khong sai data ghi, chi rui ro hien thi cu. |
| Tao tram (Station) | POST `/api/v1/xanh/admin/stations/create` (LOCATION.CREATE) | POST `/api/v1/xanh/admin/stations/create` (`createStations`) | MATCH | LOW | Body khop: `name, address, city, cityId, hotline, googleMapUrl`. App chi check HTTP 200 → neu BE tra responseCode loi nghiep vu (vd trung ten) ma HTTP 200, app van bao "tao thanh cong". |
| Cap nhat tram (Station) | POST `/api/v1/xanh/admin/stations/update` (LOCATION.UPDATE) | POST `/api/v1/xanh/admin/stations/update` (`updateStations`) | MATCH | LOW | Body khop: them `id` + `status`. App gui `status` (bat/tat tram) giong web. Chi check HTTP 200, khong check responseCode. |
| Xoa tram (Station) | POST `/api/v1/xanh/admin/stations/delete` (LOCATION.DELETE) | POST `/api/v1/xanh/admin/stations/delete` (`deleteStations`) | MATCH | LOW | Body chi gui `data.id`. App chi check HTTP 200 → neu BE chan xoa (vd tram dang gan xe/booking) bang responseCode loi nhung HTTP 200, app bao "xoa thanh cong" sai. |
| Xuat Excel danh sach tram | POST `/api/v1/xanh/admin/stations/export-excel` (LOCATION.EXPORT_EXCEL) | (khong co) | MISSING_IN_APP | HIGH | App khong co chuc nang xuat Excel tram. Endpoint khong khai bao trong `api.dart`, khong service nao goi. |
| Kiem `responseCode` "00" khi thao tac tram | (Web: route BFF tra body, UI/hook kiem responseCode) | App: KHONG kiem responseCode o bat ky service tram nao | LOGIC_MISMATCH | HIGH | App chi tin HTTP 200 → moi truong hop BE tra loi nghiep vu kem HTTP 200 deu bi hieu nham la thanh cong. Anh huong create/update/delete/search tram. |
| Tim/danh sach thanh pho (City) | POST `/api/v1/xanh/admin/cities/search` (CITY.GET_ALL) | POST `/api/v1/xanh/admin/cities/search` (`searchCities`, qua `CityManagementService.fetchCities`) | MATCH | LOW | Body khop: `data.keyword/status/page/size`. App chi check HTTP 200, khong check responseCode "00". |
| Xem chi tiet thanh pho (City) | POST `/api/v1/xanh/admin/cities/detail` (CITY.DETAIL) | Endpoint `detailCities` CO khai bao nhung KHONG service nao goi; app dung lai du lieu danh sach (`city_detail_widget.dart`) | LOGIC_MISMATCH | MEDIUM | Giong tram: web goi detail rieng, app hien du lieu cu tu list. |
| Tao thanh pho (City) | POST `/api/v1/xanh/admin/cities/create` (CITY.CREATE) | POST `/api/v1/xanh/admin/cities/create` (`createCities`) | MATCH | LOW | Body app gui: `name, code, imageUrl, priority, color`. Khop voi cau truc tao thanh pho. Chi check HTTP 200. |
| Cap nhat thanh pho (City) | POST `/api/v1/xanh/admin/cities/update` (CITY.UPDATE) | POST `/api/v1/xanh/admin/cities/update` (`updateCities`) | MATCH | LOW | Body app: them `id` + `status` + `color`. Khop. App gui `status` (bat/tat) giong web. Chi check HTTP 200. |
| Xoa thanh pho (City) | POST `/api/v1/xanh/admin/cities/delete` (CITY.DELETE) | POST `/api/v1/xanh/admin/cities/delete` (`deleteCities`) | MATCH | LOW | Body chi gui `data.id`. App chi check HTTP 200 → neu BE chan xoa (vd thanh pho con tram con) bang responseCode loi kem HTTP 200, app bao thanh cong sai. |
| Xuat Excel danh sach thanh pho | POST `/api/v1/xanh/admin/cities/export-excel` (CITY.EXPORT_EXCEL) | (khong co) | MISSING_IN_APP | HIGH | App khong co chuc nang xuat Excel thanh pho. Endpoint khong khai bao, khong service nao goi. |

## Ket luan nghiep vu (cho lead)

- **Tat ca cac thao tac chinh (tim, tao, sua, xoa) tram va thanh pho: app va web goi DUNG cung 1 API, cung phuong thuc, body khop.** Khong co sai lech gay sai/vuot quyen.
- **Khac biet 1 — App thieu 2 chuc nang xuat Excel** (xuat danh sach tram, xuat danh sach thanh pho). Web co, app khong. Neu nhan vien quen dung app de xuat bao cao Excel thi se khong lam duoc tren app.
- **Khac biet 2 — App khong kiem "ma ket qua nghiep vu" cua backend.** App chi nhin "may chu co tra loi khong" (HTTP 200). Neu backend tra ve HTTP 200 nhung kem ma loi nghiep vu (vd: xoa khong duoc vi tram con dang dung, ten bi trung), app van bao "Thanh cong". Web cung chua check o tang route nhung con tang giao dien xu ly tiep; app thi khong co cho nao xu ly → rui ro bao thanh cong sai cao hon. Day la diem nen sua trong app.
- **Khac biet 3 (nho) — App khong tai lai chi tiet tu may chu khi mo 1 tram/thanh pho**, ma hien lai du lieu da co trong danh sach. Web tai lai chi tiet moi. It anh huong nhung neu ai do vua sua ban ghi, app co the hien so cu cho den khi tai lai danh sach.
