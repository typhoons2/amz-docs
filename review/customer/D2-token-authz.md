# D2 — Review Token / Credential & Phan quyen (booking-car-app)

> Pham vi: token luu o dau (an toan khong), header Authorization, goi endpoint vuot quyen, IDOR.
> Tap trung: token-storage + auth-authz. Quet xuyen suot `booking-car-app/lib` + `android` + `ios`.

## Tom tat nhanh (cho lead)

- **Token luu O DUNG CHO an toan**: app dung `FlutterSecureStorage` (kho ma hoa cua he dieu hanh — Keychain iOS / Keystore Android), KHONG luu token kieu text tho. Day la diem TOT.
- **Van de lon nhat**: token (access + refresh) bi **IN RA LOG** o nhieu cho khi chay che do debug. Neu ban build nham ban debug giao cho khach / tester, ai xem log dien thoai se thay nguyen token va dang nhap thay khach.
- **Mot so API goi sai "cong"** (chon nham server auth vs server nghiep vu) — khop voi bug parity da biet, gay loi 401/sai du lieu.
- **Vai API tu tao ket noi rieng, BO QUA kiem tra chung chi (certificate pinning) va BO QUA gan token** — diem yeu bao mat duong truyen + co the goi thieu quyen.

---

## Bang chi tiet

| File:dong | Muc do | Van de | Cach sua |
|-----------|--------|--------|----------|
| core/api/api_client.dart:61-63, 135-137 | CRITICAL | Interceptor IN RA NGUYEN header `Authorization: Bearer <token>` (ca authDio va bookingDio) khi debug. Token lo qua log thiet bi/console. | Khong bao gio in token. Bo han 2 doan `print('Authorization: ...')`. Neu can debug chi in do dai token. |
| core/api/api_client.dart:75, 149, 167 | HIGH | In nguyen `Response Body` / `Error Response` cua moi API (gom profile, license, CCCD/CMND, refreshToken response co accessToken+refreshToken) ra log. Lo PII (so CCCD, GPLX, so DT) va token moi. | Bo in body, hoac chi in khi that su can va loc bo cac field nhay cam (token, identityNumber, licenseNumber...). |
| core/api/google_auth_service.dart:48-49, 70-71, 92-93 | HIGH | In ID token Google (50 ky tu dau + do dai) va toan bo response data (chua accessToken/refreshToken) ra log. | Bo cac dong print token + response data. |
| core/api/api_service.dart:91-94 | HIGH | `googleLogin` in ID token (50 ky tu dau) + nguyen payload ra log. | Bo doan `if (kDebugMode) print(...)` in token/payload. |
| features/account/presentation/pages/account_page.dart:1311-1316 | HIGH | Doc token tu secure storage chi de `print('DEBUG: Token from SharedPreferences: $token')` — in nguyen access token ra log. Day la code debug bo quen. | Xoa han doan doc token + print nay (khong dung den o cho khac). |
| splash/presentation/pages/splash_page.dart:44 | MEDIUM | `print('REFRESH TOKEN: $response')` — in nguyen response refresh (co the chua token moi). | Bo dong print nay. |
| core/api/api_client.dart:329-330 (onRequest), 204-217 | CRITICAL (xac nhan parity) | Header Authorization duoc gan dung trong `AuthInterceptor.onRequest` (doc `user_token` tu secure storage, them `Bearer`). NHUNG mot so API chon nham instance Dio nen di sai cong/sai token context — xem cac dong duoi. Co che gan header thi DUNG, van de la chon nham Dio. | Xem cac dong getProfile/getPromotions/getNews/googleLogin ben duoi. |
| core/api/api_service.dart:383-389 (getPromotions), 393-402 (getNews) | HIGH (parity) | `getPromotions` va `getNews` goi `getAuthDio()` (server AUTH) trong khi day la noi dung nghiep vu (server XANH). Sai base URL → de loi 404/401, hoac neu server auth co route khac se tra sai du lieu. | Doi sang `getBookingDio()` cho dung server nghiep vu (giong cac API news/promotion ben he thong xanh). |
| core/api/api_service.dart:80-97 (googleLogin) | HIGH (parity) | `googleLogin` goi `getBookingDio()` (server XANH) nhung day la chuc nang AUTH (dang nhap), responseCode mong doi la "200" (auth). Goi nham server. | Doi sang `getAuthDio()` cho dung server auth. |
| core/api/api_service.dart:134-137 (getProfile) | MEDIUM | `getProfile` (key dung khi load user) goi `getBookingDio()` voi path `/customers/profile`; trong khi `getUserProfile` (dong 299-302) lai goi `getAuthDio()` path `/user/profile`. Hai ham profile dung 2 server khac nhau — de gay nham, can xac nhan dung 1 nguon. | Xac nhan voi BE profile khach nam o server nao roi thong nhat 1 ham + 1 Dio. |
| core/api/api_service.dart:611-635 (getPaymentMethods) | HIGH | Tao `Dio()` MOI tho (`final Dio dio = Dio()`), KHONG qua ApiClient → **bo qua certificate pinning** va **bo qua AuthInterceptor (khong gan token)**. Neu endpoint payment-methods can quyen → goi thieu Authorization; va ket noi khong duoc pin chung chi. | Dung `_apiClient.getBookingDio()` thay vi `Dio()` moi de huong cert pinning + auto gan token. |
| core/services/s3_upload_service.dart:13, 69 | LOW | `_uploadDio = Dio()` rieng cho upload S3 (PUT len presigned URL) — khong cert pinning, khong token. O DAY CHAP NHAN DUOC vi S3 dung presigned URL (da ky san, khong can Bearer token cua app) va host la S3 khong phai api-portal. Chi luu y: khong nen dung instance nay cho API noi bo. | Giu nguyen cho S3; tuyet doi khong tai su dung `_uploadDio` cho endpoint api-portal. |
| core/api/api_service.dart:353-369 (deleteAccount) | MEDIUM | Dung `_apiClient.getDio(baseUrl: ...)` — ham `getDio` (api_client.dart:179-201) da bi danh dau "deprecated". Voi base URL khop auth thi van tra `_authDio` (co interceptor) nen on; nhung neu truyen base URL la (vd S3/khac) se tao Dio KHONG cert pinning. | Doi sang `getAuthDio()` truc tiep cho ro rang va tranh nhanh fallback tao Dio tho. |
| core/api/api_client.dart:269-272, 397-398 (retry sau refresh) | MEDIUM | Khi refresh token thanh cong, retry request bang `Dio()` tho (`cloneDio`) → request retry KHONG di qua cert pinning va KHONG qua interceptor (chi gan thu cong Authorization). Mat lop bao ve duong truyen cho dung request da tung 401. | Retry bang `getAuthDio()`/`getBookingDio()` tuong ung, hoac it nhat goi `CertificatePinning.check` truoc khi fetch. |
| features/booking/.../booking_detail_page + api_service.dart:181-189 (getBookingDetail), 235-239 (cancelBooking) | MEDIUM (IDOR — phia server quyet dinh) | App gui thang `bookingId` do client giu de xem/huy booking. Phia CLIENT khong the chong IDOR; rui ro nam o BE: phai kiem tra booking do CO thuoc ve khach dang dang nhap khong. App khong lo id nguoi khac mot cach chu dong, nhung can BE enforce ownership. | KHONG sua o app. Ghi chu cho team BE (xanh-service): endpoint `/bookings/detail` va `/bookings/cancel` PHAI verify booking thuoc ve customer trong JWT. |
| features/booking/.../lookup + api_service.dart:169-179 (lookupBooking) | LOW (auth-authz design) | `lookupBooking` cho tra cuu booking bang `bookingCode` + `customerPhone` (khong can dang nhap). Day la tinh nang co y (tra cuu khach vang lai), nhung neu bookingCode de doan + khong rate-limit thi co the do thong tin booking nguoi khac. | Xac nhan BE co rate-limit + bookingCode du ngau nhien. App khong can sua. |
| android/.../network_security_config.xml + AndroidManifest.xml | OK (khong phai loi) | `cleartextTrafficPermitted="false"` (base + domain) → chan HTTP tho. Manifest tro dung config. Tot. | Khong can sua. |
| ios/Runner/Info.plist | OK (khong phai loi) | Khong khai bao `NSAppTransportSecurity` cho phep arbitrary loads → mac dinh iOS chi cho HTTPS. Tot. | Khong can sua. |
| core/utils/certificate_pinning.dart:5-7 | LOW | Cert pinning chi co 1 fingerprint duy nhat, khong co backup pin. Neu server doi chung chi (renew) ma chua cap nhat app → app chet toan bo API. | Them pin du phong (intermediate CA hoac chung chi sap renew) de tranh ket app khi doi cert. |
| Tong the storage keys | LOW | Token luu bang `FlutterSecureStorage` (Keychain/Keystore) — AN TOAN. Logout (account_service.dart:20-24) co xoa user_token, refresh_token, user_id, full_name, phone_number; user_bloc ClearUser xoa cache profile. Day du. | Khong can sua. Luu y: ham `reset()` chi tao lai Dio, khong xoa token — logout that su nam o `AccountService.doLogout` (da xoa du). |

---

## Ket luan muc do

- **CRITICAL**: 2 (in token Authorization ra log; getPaymentMethods + retry bo qua cert pinning/auth — gop nhom transport+authz).
- **HIGH**: 6 (lo token/PII qua log; chon nham Dio cho promotions/news/googleLogin).
- **MEDIUM**: 5.
- **LOW**: 4.
- **Diem TOT**: token luu trong secure storage (khong plaintext), cleartext HTTP bi chan ca Android/iOS, co certificate pinning, logout xoa sach credential.

## Khuyen nghi uu tien
1. Xoa het cac dong `print` co token / response body / PII trong toan bo `lib` (du la `kDebugMode`).
2. Sua `getPaymentMethods` va cac doan retry-after-refresh de di qua `getBookingDio()/getAuthDio()` (co cert pinning + token).
3. Sua chon nham Dio: promotions/news → bookingDio; googleLogin → authDio (khop bug parity da biet).
4. Bao team BE: bat buoc enforce ownership cho `/bookings/detail` + `/bookings/cancel` (chong IDOR).
