# Danh muc endpoint backend — APP khach (booking-car-app, Flutter/Dio)

> App khach goi backend THAT TRUC TIEP (khong qua BFF).
> Base URL (api_endpoints.dart):
> - `authBaseUrl`    = `https://api-portal.amzholdings.vn/api/v1/auth`  (auth-service, responseCode chuan "200")
> - `bookingBaseUrl` = `https://api-portal.amzholdings.vn/api/v1/xanh`  (xanh-service, responseCode chuan "00")
>
> Endpoint that = base (theo Dio duoc chon o call-site) + path tuong doi (hang so trong class ApiEndpoints).
> Cot "Base" cho biet call-site dung `getAuthDio()` (auth) hay `getBookingDio()` (xanh).

## Bang endpoint

| Endpoint (day du) | Method | Base | Feature / Hanh dong | File call-site |
|---|---|---|---|---|
| https://api-portal.amzholdings.vn/api/v1/auth/login | POST | auth | Dang nhap | booking-car-app/lib/core/api/api_service.dart:49 |
| https://api-portal.amzholdings.vn/api/v1/auth/register | POST | auth | Dang ky tai khoan | booking-car-app/lib/core/api/api_service.dart:69 |
| https://api-portal.amzholdings.vn/api/v1/auth/logout | POST | auth | Dang xuat | booking-car-app/lib/core/api/api_service.dart:77 |
| https://api-portal.amzholdings.vn/api/v1/xanh/google-login | POST | xanh | Dang nhap Google | booking-car-app/lib/core/api/api_service.dart:96 |
| https://api-portal.amzholdings.vn/api/v1/auth/refresh-token | POST | auth | Lam moi token (ApiService) | booking-car-app/lib/core/api/api_service.dart:104 |
| https://api-portal.amzholdings.vn/api/v1/auth/refresh-token | POST | auth | Lam moi token (interceptor onResponse) | booking-car-app/lib/core/api/api_client.dart:253 |
| https://api-portal.amzholdings.vn/api/v1/auth/refresh-token | POST | auth | Lam moi token (interceptor onError) | booking-car-app/lib/core/api/api_client.dart:377 |
| https://api-portal.amzholdings.vn/api/v1/auth/verify-otp | POST | auth | Xac thuc OTP (phone+otp) | booking-car-app/lib/core/api/api_service.dart:109 |
| https://api-portal.amzholdings.vn/api/v1/auth/verify-otp | POST | auth | Xac thuc OTP (otpCode — quen mat khau) | booking-car-app/lib/core/api/api_service.dart:118 |
| https://api-portal.amzholdings.vn/api/v1/auth/resend-otp | POST | auth | Gui lai OTP | booking-car-app/lib/core/api/api_service.dart:123 |
| https://api-portal.amzholdings.vn/api/v1/auth/forgot-password | POST | auth | Quen mat khau | booking-car-app/lib/core/api/api_service.dart:131 |
| https://api-portal.amzholdings.vn/api/v1/auth/change-password | POST | auth | Doi mat khau | booking-car-app/lib/core/api/api_service.dart:349 |
| https://api-portal.amzholdings.vn/api/v1/auth/delete-account | POST | auth | Xoa tai khoan | booking-car-app/lib/core/api/api_service.dart:365 |
| https://api-portal.amzholdings.vn/api/v1/auth/user/profile | GET | auth | Lay ho so user (getUserProfile) | booking-car-app/lib/core/api/api_service.dart:301 |
| https://api-portal.amzholdings.vn/api/v1/xanh/customers/profile | GET | xanh | Lay ho so khach (getProfile) | booking-car-app/lib/core/api/api_service.dart:136 |
| https://api-portal.amzholdings.vn/api/v1/xanh/customers/profile | POST | xanh | Cap nhat ho so (updateProfile) | booking-car-app/lib/core/api/api_service.dart:319 |
| https://api-portal.amzholdings.vn/api/v1/xanh/customers/profile | POST | xanh | Cap nhat avatar (updateProfileAvatar) | booking-car-app/lib/core/api/api_service.dart:333 |
| https://api-portal.amzholdings.vn/api/v1/xanh/cars/detail | POST | xanh | Chi tiet xe | booking-car-app/lib/core/api/api_service.dart:20 |
| https://api-portal.amzholdings.vn/api/v1/xanh/cars/available-grouped | POST | xanh | Tim xe kha dung (gom nhom) | booking-car-app/lib/core/api/api_service.dart:294 |
| https://api-portal.amzholdings.vn/api/v1/xanh/bookings | GET | xanh | Danh sach booking (getBookings) | booking-car-app/lib/core/api/api_service.dart:143 |
| https://api-portal.amzholdings.vn/api/v1/xanh/bookings/my-history | POST | xanh | Lich su booking cua toi | booking-car-app/lib/core/api/api_service.dart:166 |
| https://api-portal.amzholdings.vn/api/v1/xanh/bookings/lookup | POST | xanh | Tra cuu booking (code+phone) | booking-car-app/lib/core/api/api_service.dart:178 |
| https://api-portal.amzholdings.vn/api/v1/xanh/bookings/detail | POST | xanh | Chi tiet booking | booking-car-app/lib/core/api/api_service.dart:188 |
| https://api-portal.amzholdings.vn/api/v1/xanh/bookings/create | POST | xanh | Tao booking | booking-car-app/lib/core/api/api_service.dart:232 |
| https://api-portal.amzholdings.vn/api/v1/xanh/bookings/cancel | POST | xanh | Huy booking | booking-car-app/lib/core/api/api_service.dart:238 |
| https://api-portal.amzholdings.vn/api/v1/xanh/bookings/calculate-price | POST | xanh | Tinh gia thue | booking-car-app/lib/core/api/api_service.dart:256 |
| https://api-portal.amzholdings.vn/api/v1/xanh/rides | GET | xanh | Danh sach chuyen (getRides) | booking-car-app/lib/core/api/api_service.dart:261 |
| https://api-portal.amzholdings.vn/api/v1/xanh/dashboard | GET | xanh | Dashboard | booking-car-app/lib/core/api/api_service.dart:375 |
| https://api-portal.amzholdings.vn/api/v1/xanh/statistics | GET | xanh | Thong ke | booking-car-app/lib/core/api/api_service.dart:380 |
| https://api-portal.amzholdings.vn/api/v1/auth/promotions | GET | auth | Khuyen mai | booking-car-app/lib/core/api/api_service.dart:385 |
| https://api-portal.amzholdings.vn/api/v1/auth/news/available | GET | auth | Tin tuc kha dung | booking-car-app/lib/core/api/api_service.dart:395 |
| https://api-portal.amzholdings.vn/api/v1/xanh/about | GET | xanh | Thong tin gioi thieu | booking-car-app/lib/core/api/api_service.dart:406 |
| https://api-portal.amzholdings.vn/api/v1/xanh/services | GET | xanh | Danh sach dich vu | booking-car-app/lib/core/api/api_service.dart:411 |
| https://api-portal.amzholdings.vn/api/v1/xanh/cities | GET | xanh | Danh sach thanh pho | booking-car-app/lib/core/api/api_service.dart:418 |
| https://api-portal.amzholdings.vn/api/v1/xanh/stations/search | POST | xanh | Tim tram (keyword+cityId) | booking-car-app/lib/core/api/api_service.dart:428 |
| https://api-portal.amzholdings.vn/api/v1/xanh/customers/license | GET | xanh | Lay GPLX (getLicense) | booking-car-app/lib/core/api/api_service.dart:436 |
| https://api-portal.amzholdings.vn/api/v1/xanh/customers/license | POST | xanh | Cap nhat/nop GPLX (updateLicense) | booking-car-app/lib/core/api/api_service.dart:510 |
| https://api-portal.amzholdings.vn/api/v1/xanh/customers/identity | GET | xanh | Lay CCCD/CMND (getIdentity) | booking-car-app/lib/core/api/api_service.dart:536 |
| https://api-portal.amzholdings.vn/api/v1/xanh/customers/identity | POST | xanh | Cap nhat/nop CCCD/CMND (updateIdentity) | booking-car-app/lib/core/api/api_service.dart:608 |
| https://api-portal.amzholdings.vn/api/v1/xanh/storage/presigned-url | POST | xanh | Lay presigned URL upload tai lieu | booking-car-app/lib/core/api/api_service.dart:530 |
| https://api-portal.amzholdings.vn/api/v1/xanh/payment-methods | GET | xanh | Danh sach phuong thuc thanh toan | booking-car-app/lib/core/api/api_service.dart:614 |

## Ghi chu / Diem can doi soat

- **google-login dung sai base?** Hanh dong dang nhap nhung goi qua `getBookingDio()` → ra `.../xanh/google-login` thay vi `.../auth/google-login`. Cac dang nhap khac (login/register/logout/refresh) deu dung base `auth`. Can xac nhan backend co route `/xanh/google-login` hay day la nham base. (api_service.dart:84)
- **profile bi tach 2 backend khac nhau:** `getUserProfile` (GET) goi `.../auth/user/profile`, con `getProfile`/`updateProfile`/`updateProfileAvatar` goi `.../xanh/customers/profile`. Hai nguon ho so khac nhau — can doi soat dung cho moi man hinh dung cai nao.
- **verify-otp 2 body khac nhau, cung 1 endpoint:** `verifyOtp` gui `{phone, otp}` (KHONG boc trong `data`, cung khong co requestId), con `verifyOtpByCode` gui `{data:{otpCode}}`. Body khong dong nhat.
- **cancelBooking:** path hang so `/bookings/cancel` co `replaceFirst('{id}', bookingId)` nhung chuoi khong chua `{id}` → thuc te luon goi `.../xanh/bookings/cancel` (khong gan id vao URL, khong co body). Co the la bug (id khong duoc gui len). (api_service.dart:235-238)
- **delete-account** goi qua `getDio(baseUrl: authBaseUrl)` (deprecated helper) → tra ve cung `_authDio`, base `auth`. (api_service.dart:363)
- **responseCode kiem tra:** Chi `getPaymentMethods` (api_service.dart:616-618) tu kiem `responseCode == "00"`. Cac call con lai tra `Response` tho, viec kiem responseCode nam o lop goi (bloc/service/UI) — chua kiem o day. Interceptor (api_client.dart) chi xu ly responseCode 400/401 de refresh token, khong xac nhan thanh cong.
- **File khong sinh endpoint moi:**
  - `auth_api.dart`: toan bo bi comment (khong active).
  - `booking_cars_service.dart`, `search_cars_service.dart`, `account_service.dart`: chi goi lai `ApiService`, khong tu goi Dio truc tiep.
  - `s3_upload_service.dart:69`, `file_picker_fallback.dart:39`: PUT len presigned URL S3 (ha tang luu tru ngoai, KHONG phai endpoint backend AMZ).

## Tong ket

- Tong so endpoint backend rieng biet (path+method): **39 call-site**, gop theo (endpoint+method) duy nhat: **37** (refresh-token xuat hien 3 lan, verify-otp 2 lan).
