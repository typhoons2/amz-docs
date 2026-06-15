# SUMMARY — Review code app khach "booking-car-app"

> App Flutter do OUTSOURCE viet, dung API he thong AMZ.
> Quy uoc responseCode: xanh-service = "00", auth-service = "200" (luon check responseCode, KHONG chi dua HTTP status).
> Tong hop tu 4 module (M1-M4) + 5 ra soat chuyen sau (D1-D5).

## 1. Tong quan

| Hang muc | Ket qua |
|---|---|
| Tong file .dart trong lib | 82 |
| File da co module review | 82 / 82 (100%) |
| File orphan (chua ai doc) | 0 |
| CRITICAL | 11 |
| HIGH | ~24 |
| Token luu o dau | FlutterSecureStorage (Keychain/Keystore) — DUNG, khong plaintext |
| Cleartext HTTP | Da chan (Android cleartextTrafficPermitted=false + iOS ATS mac dinh) |
| Hardcode secret/API key | KHONG co (Google Client ID + base URL qua String.fromEnvironment) |

Ket luan ngan: App khong lo secret va luu token dung cho. Nhung co nhieu loi nghiem trong ve luong nghiep vu va on dinh: 2 luong xac thuc (OTP, dat lai mat khau) vo rong (bao thanh cong nhung khong goi server), huy don bao thanh cong gia, 1 crash chac chan o man xem xe, token bi in ra log nhieu cho (chi an nho kDebugMode).

## 2. Do phu file (coverage)

| Module | Thu muc | So file | Trang thai |
|---|---|---|---|
| M1-core | lib/core | 25 | Da doc du |
| M2-booking | lib/features/booking | 28 | Da doc du |
| M3-auth-account | lib/features/auth (7) + lib/features/account (4) | 11 | Da doc du |
| M4-shared-rest | lib/shared, lib/l10n, lib/main.dart + man phu (about, dashboard, news, onboard, payment, settings, splash) | 18 | Da doc du |
| Tong | | 82 | Khong con file orphan |

Luu y: M1 ghi "24" va M2 ghi "27" la loi DEM (M1 gop 2 file 1 dong; M2 dem thieu 1 widget). Doi chieu tung file: moi file .dart deu duoc nhac trong bang/clean-section module tuong ung -> khong co file that su bi bo sot.

## 3. CRITICAL (11)

1. auth/.../otp_page.dart:189-200 — Man OTP: nhap du 6 so la cho qua, KHONG goi API verify OTP. Lo hong xac thuc.
2. auth/.../create_password_page.dart:194-198 — Dat lai mat khau: bam Xac nhan KHONG goi API nao, van bao thanh cong.
3. booking/.../booking_detail_page.dart:682-700 — Huy don: luon hien "Da huy", khong check responseCode, khong try/catch -> sai du lieu.
4. booking/.../booking_info_carousel.dart:18,24,44 — late final _car bi gan lai lan 2 -> LateInitializationError -> crash chac chan khi mo man xem xe.
5. splash/.../splash_page.dart:36-54 — parse responseCode khong guard + xu ly sai khi chua dang nhap -> da user dang dang nhap ra Login (mat phien oan).
6. core/api/api_client.dart:62 va 135 — Interceptor in nguyen access token ra log moi request -> chiem tai khoan.
7. core/api/api_service.dart:80-97 (googleLogin) — goi nham getBookingDio (server xanh) nhung check responseCode "200" (auth).
8. core/api/api_service.dart:611-635 (getPaymentMethods) — tao Dio() tho: bo qua cert pinning + bo qua gan token.
9. core/api/api_client.dart:239-272 (refresh token) — Dio() tho gui refresh+access token qua ket noi khong ghim chung chi.
10. core/api/api_client.dart:363-398 (onError refresh) — lap lai loi tren o nhanh 401: cloneDio.fetch() khong pin chung chi.
11. (he thong) nhieu man booking — chi check statusCode==200, KHONG check responseCode "00" -> don loi nghiep vu bi coi la thanh cong (search_cars, car_listing, booking_page, dashboard...).

## 4. HIGH chinh (~24)

- core/api/api_service.dart:383-402 — getPromotions/getNews dung nham getAuthDio (phai getBookingDio). Bug parity XAC NHAN.
- core/api/api_service.dart:249 — bug chuoi "req-price-$_generateRequestId()" thieu {} -> requestId sai.
- core/api/api_client.dart:226-420 — refresh token thieu queue: nhieu 401 song song chi 1 cai refresh.
- core/api/api_client.dart:59,75,133,149,167 — in nguyen request/response body (password, OTP, CCCD, GPLX, token).
- core/utils/certificate_pinning.dart:5-7 — chi 1 fingerprint, khong backup -> doi SSL la brick app.
- core/utils/widgets/text_field_plus.dart:21 — TextEditingController khong dispose -> ro ri.
- core/api/google_auth_service.dart:48,70-75,92 — in ID token + response; throw nguyen object.
- core/user/bloc/user_bloc.dart:46-69 — getProfile chi check HTTP 200, khong check responseCode "00".
- auth/.../login_page.dart:107 & email_register_page.dart:135 — doc e.response.data[...] khong guard -> crash trong catch khi server tra non-JSON.
- auth/.../login_page.dart:82-92 — luu accessToken khong kiem null, van vao dashboard.
- account/.../account_page.dart:1311-1316 — in nguyen token doc tu storage (DEBUG).
- account/.../account_page.dart:1384-1405 — xoa tai khoan thieu try/catch -> treo loading; text "Cap nhat thanh cong" (sai).
- account/.../identity_page.dart & license_page.dart — in nguyen response.data (CCCD/GPLX/ten); loi updateProfile bi nuot im.
- booking/data/models/booking.dart:145,146,164 — DateTime.parse bat buoc -> 1 don sai ngay lam ca lich su trong.
- booking/data/models/license.dart:111,112 — as String non-null cho uploadUrl/objectKey.
- booking/.../booking_history_page.dart:47-48,128-152 — khong check responseCode; _loadMore thieu try/catch+mounted.
- booking/.../car_listing_page.dart:138-145,501-524 — sau await dung context/Navigator khong kiem mounted.
- booking/.../booking_confirm_page.dart:548-563 — parse JSON khong guard tung tang; id co the rong.
- booking/.../search_cars_service.dart:48-81 — khong check responseCode "00".
- booking/.../booking_info_promotion.dart:188-409 — voucher DU LIEU GIA hardcode, khong goi API/validate -> lech tien.
- features/dashboard/.../dashboard_page.dart:71,96 — check HTTP status thay responseCode; promotions/news nham base auth; parse JSON dong khong guard.
- splash/.../splash_page.dart:44,53-67 — in response refresh (lo token); luu token TRUOC khi check responseCode "200"; thieu mounted.

## 5. GAPS — Completeness critic

1. booking_cars_service.dart 0 finding — file thuan tinh toan, sach hop ly (KHONG dang nghi).
2. l10n/generated/* 0 finding — auto-sinh, hop ly. (Phu: appTitle con "Cash Flow Management" — sai ten app.)
3. IDOR con MONG: app khong the ket luan; CAN bao BE enforce ownership /bookings/detail + /bookings/cancel.
4. lookupBooking (bookingCode+phone, khong login) — can BE xac nhan rate-limit + bookingCode du ngau nhien.
5. Cau hinh native da soi nhung: android/app/build.gradle.kts:38 release ky bang DEBUG keystore (can keystore release rieng truoc khi len store); chua co <pin-set> tang OS.
6. Anh CCCD/GPLX tai qua Image.network/CachedNetworkImage KHONG qua kenh pin chung chi (PII - dang nghi).
7. Hai ham profile dung 2 server khac nhau (getProfile->bookingDio /customers/profile vs getUserProfile->authDio /user/profile) — can BE xac nhan nguon dung.
8. Chua test thuc te tren thiet bi: carousel crash, OTP bypass, cancelBooking fake success nen lead test tay xac nhan tac dong.

## 6. Khuyen nghi uu tien sua

1. Bit 2 luong xac thuc vo rong: OTP + dat lai mat khau (goi API + check responseCode).
2. Sua cancelBooking (try/catch + responseCode "00" + mounted).
3. Sua crash carousel (late final -> late).
4. Go SACH moi print co token/body/PII; tao AppLogger tap trung tu redact.
5. Sua chon nham Dio: promotions/news->bookingDio; googleLogin->authDio; getPaymentMethods+retry->dio da pin.
6. Chuan hoa check responseCode "00"/"200" o tang service.
7. Backup pin chung chi + quy trinh xoay cert.
8. Bao BE: enforce ownership chong IDOR; rate-limit lookupBooking.
