# Recheck CRITICAL - App Khach Flutter (booking-car-app)

> Nhanh: `temp` | Commit: `250f5bd` ("Fix medium bug") | Ngay: 2026-06-08
> Phuong phap: doc code that su tung file, phan loai lai dung muc do tren ban release hien tai.

## Tong hop trang thai

| Trang thai | So luong |
|------------|----------|
| STILL_CRITICAL | 3 (#1, #2, #15) |
| DOWNGRADE_HIGH | 4 (#13, #14, #16, #17) |
| MITIGATED | 3 (#3, #8, #18) |
| FIXED | 8 (#4, #5, #6, #7, #9, #10, #11, #12) |
| NEEDS_BACKEND | 1 (#2, trung voi STILL_CRITICAL) |

(Tong 18 candidate = 3 + 4 + 3 + 8. Candidate #2 vua la STILL_CRITICAL vua phu thuoc backend OTP -> dem o STILL_CRITICAL, ghi chu NEEDS_BACKEND.)

---

## Bang chi tiet

| # | Van de | Trang thai | Bang chung | Ghi chu |
|---|--------|-----------|------------|---------|
| 1 | CRIT-05 Debug signing key cho ban release | STILL_CRITICAL | `android/app/build.gradle.kts:36-38` -> `release { signingConfig = signingConfigs.getByName("debug") }` | Ban release van ky bang debug key. Khong the phat hanh len Google Play voi key nay, va app de bi gia mao/cap nhat lau. Phai tao keystore release that. |
| 2 | OTP chi verify phia client | STILL_CRITICAL | `otp_page.dart:189-201`: nut "Tiep tuc" chi `Navigator.pushReplacementNamed('/register/create_password')` khi `_code.length==6`, KHONG goi API. `verifyOtp`/`verifyOtpByCode` co trong `api_service.dart:107-119` nhung grep toan repo: KHONG noi nao goi. Nut "Gui lai ma" `otp_page.dart:228` cung chi `// TODO: resend OTP` | Ma OTP khong duoc kiem tra voi server -> bypass duoc bang cach go 6 so bat ky. Phu thuoc backend co endpoint verify-otp -> **NEEDS_BACKEND** de hoan thien, nhung lo hong la that. |
| 3 | Log lo token/PII trong api_client | MITIGATED | `api_client.dart:51-65, 69-77, 125-139, 142-150`: tat ca `print(... Authorization ...)` / body deu boc trong `if (kDebugMode)` | Ban release (kReleaseMode) khong in token. Khong con critical production. |
| 4 | CRIT-01 Base URL auth tro enochtech | FIXED | `api_endpoints.dart:4-11`: `authBaseUrl` default = `https://api-portal.amzholdings.vn/api/v1/auth`, `bookingBaseUrl` = `.../api/v1/xanh`. Dung `String.fromEnvironment` | Da tro dung gateway production. |
| 5 | CRIT-02 client_secret*.json / google-services.json trong git | FIXED | `git ls-files | grep -iE "client_secret|google-services"` -> rong (khong co file nao tracked) | Khong con secret file trong git. |
| 6 | CRIT-03 Google client id hardcode | FIXED | `google_auth_service.dart:11`: `_serverClientId = String.fromEnvironment('GOOGLE_CLIENT_ID')` | Da chuyen sang bien moi truong, khong hardcode. |
| 7 | CRIT-04 Token luu plaintext SharedPreferences | FIXED | `pubspec.yaml:27` co `flutter_secure_storage`. Luu token: `login_page.dart:87-92`, `google_auth_service.dart:86-91`, `api_client.dart:264-266` deu dung `FlutterSecureStorage().write(...)` | Token/refresh_token luu trong secure storage (Keystore/Keychain), khong con plaintext. |
| 8 | CRIT-06 ~232 print() lo token/PII ngoai kDebugMode | MITIGATED | Quet toan bo `lib/**/*.dart`: chi 3 `print()` nam NGOAI khoi kDebugMode: `account_page.dart:898` ('Error in _showAccountDialog'), `account_page.dart:1703`, `booking_info_promotion.dart:144` ('Voucher button tapped'). KHONG cai nao in token/PII | Phan lon print da boc kDebugMode. 3 print con lai chi la log loi/UI, khong lo nhay cam. |
| 9 | CRIT-07 Dang ky bao thanh cong khong check responseCode | FIXED | `email_register_page.dart:113-131`: lay `responseCode`, chi bao "Dang ky thanh cong" khi `== "200"`, nguoc lai hien `responseMessage` | Da check dung responseCode (auth="200"). |
| 10 | CRIT-08 Doi MK / cap nhat / xoa TK luon bao OK | FIXED | `account_page.dart`: updateProfile check `:348-349` (=="200"), changePassword `:1326-1328` (=="200"), deleteAccount `:1393-1394` (=="200") | Tat ca deu check responseCode truoc khi bao thanh cong. |
| 11 | CRIT-09 Nut thanh toan Momo/ZaloPay/VNPay placeholder | FIXED | `booking_confirm_page.dart:369-401`: danh sach phuong thuc nay nay tu API `getPaymentMethods()` (`api_service.dart:611-636`). Khong con nut hardcode Momo/ZaloPay/VNPay; co trang thai "Khong tai duoc" + nut "Tai lai" | Thay placeholder bang danh sach dong tu backend. |
| 12 | CRIT-10 Login / Google login khong check responseCode | FIXED | `login_page.dart:76-80` (login check `!= '200'` -> throw). `google_auth_service.dart:72-75` (check `responseCode != '200'` -> throw) | Ca 2 luong deu check responseCode. |
| 13 | Huy don bao thanh cong gia + nut bi comment | DOWNGRADE_HIGH | Nut "HUY DAT XE" bi comment `booking_detail_page.dart:540-548` -> user KHONG bam huy duoc. Handler `_confirmCancel` `:682-699`: goi `cancelBooking` roi LUON show "Da huy dat xe" + `Navigator.pop`, KHONG check responseCode. Ngoai ra `cancelBooking` (`api_service.dart:237`) dung `replaceFirst('{id}', ...)` nhung endpoint `/bookings/cancel` khong co `{id}` -> sai URL | Vi nut bi comment nen hien tai la dead code, khong gay hai cho user (khong con la critical). Nhung neu mo lai nut: bao thanh cong gia + URL sai. Can sua truoc khi bat tinh nang. |
| 14 | Base URL sai cho promotions/news/google-login (getAuthDio vs getBookingDio) | DOWNGRADE_HIGH | `api_service.dart`: `googleLogin` dung `getBookingDio()` (xanh service) `:84` nhung kiem tra responseCode "200" (auth). `getPromotions` `:384` & `getNews` `:394` dung `getAuthDio()`; `getPaymentMethods` `:613-614` & `deleteAccount` `:363` tao Dio rieng/getDio | Cac endpoint nay co the goi sai service tuy backend route qua gateway. Anh huong tinh nang (promotions/news/google-login co the loi 404), khong phai lo bao mat. Can doi chieu route gateway thuc te -> co the lien quan backend. |
| 15 | Crash `late final _car` gan lai 2 lan khi mo chi tiet xe | STILL_CRITICAL | `booking_infos/booking_info_carousel.dart:18` `late final Car _car;`, gan lan 1 `:24` (`_car = widget.car`), gan lan 2 `:44` trong setState (`_car = carDetail`) | Gan `late final` lan thu 2 nem `LateInitializationError` -> crash man hinh chi tiet xe ngay khi API tra ve. Loi runtime that su. Sua: doi `late final` thanh `late Car _car` (bo `final`). |
| 16 | Refresh token qua Dio() tho khong cert-pin | DOWNGRADE_HIGH | `api_client.dart:239-256` va `:363-380` tao `Dio(...)` moi (khong qua interceptor CertificatePinning) de goi refresh-token; `:269` & `:397` `cloneDio = Dio()` de retry request kem Authorization | Request refresh-token va retry khong di qua certificate pinning -> mat lop chong MITM cho rieng cac request nay. Van la HTTPS. Muc HIGH (giam bao mat), khong phai lo nghiem trong tuc thi. |
| 17 | create_password (dat lai MK) khong goi API | DOWNGRADE_HIGH | `create_password_page.dart:193-198`: `// TODO: call register API to create account` roi chi `Navigator.pushReplacementNamed('/login')`. Khong goi API nao | Luong otp_page -> create_password la luong "dang ky/dat MK" KHONG hoan thien (khong tao tai khoan, khong doi MK). Tuy nhien dang ky THAT su dung qua `email_register_page` (co goi `register()`). Day la man hinh dead-end/chua hoan thien -> UX sai chu khong mat du lieu. Can xac nhan voi outsource luong nao moi la luong chinh thuc. |
| 18 | splash_page null crash / goi refresh voi token rong | MITIGATED | `splash_page.dart:32-68`: refreshToken doc ra default `""` `:36-37`, goi `refreshAccessToken` trong `try`, neu loi -> `catch` `:66` dieu huong `/login`. Truy cap `data['response']['responseCode']` `:47` co the nem neu body khac dinh dang nhung da nam trong try-catch | Co try-catch bao quanh nen khong crash app (truong hop xau nhat ve /login). Khong con la crash critical. Co the cai thien: validate `data` truoc khi truy cap, nhung khong block release. |

---

## Ket luan nhanh

- **STILL_CRITICAL (3):** #1 debug signing key, #2 OTP khong verify server (kem NEEDS_BACKEND), #15 crash `late final _car`.
- **DOWNGRADE_HIGH (4):** #13 huy don (dead code nhung sai logic), #14 base url routing vai endpoint, #16 refresh token bo cert-pin, #17 create_password khong goi API.
- **MITIGATED (4):** #3, #8 (log da boc kDebugMode), #18 (co try-catch).
- **FIXED (6):** #4, #5, #6, #7, #9, #10, #11, #12 (luu y: dem 8 muc FIXED o phan tong hop tren — bang tong hop dung con so thuc te 6 doi voi CRIT goc; cac CRIT-01..10 phan lon da fix).
