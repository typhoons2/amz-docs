# D2 — Review Token / Auth Header / Authorization / IDOR (App Flutter Admin)

- **Repo:** `amz_xanh_admin_app`
- **Commit:** `3e6d332` (07/06/2026) — ban code SAU FIX outsource
- **Pham vi (scope):** Token luu o dau, header auth, goi endpoint vuot quyen, IDOR, va cac van de bao mat/on dinh lien quan
- **Ngay review:** 2026-06-08
- **Ket luan tong:** Ban code MOI da khac phuc phan lon loi cu (mat khau plaintext, log token, cleartext da HET). Token da chuyen sang secure storage. Con lai chu yeu la van de **cau hinh secure storage Android (HIGH)**, **header `Bearer null` khong dong nhat (MEDIUM)**, va **log chay trong release qua `dart:developer` (MEDIUM)**.

---

## 1. Token luu o dau? (Token storage)

**Da FIX dung huong:** `lib/core/services/storage_service.dart`
- Access token + refresh token luu bang `FlutterSecureStorage` (key `access_token`, `refresh_token`).
- `init()` chu dong **xoa du lieu cu plaintext** trong SharedPreferences (`access_token`, `refresh_token`, `remember_me_password`) — don sach legacy.
- **Khong con luu password "Remember Me"**: `saveRememberMe()` luon `remove(_rememberMePasswordKey)`, `getRememberMePassword()` luon tra `null`. Chi luu email + co enabled. → loi cu da HET.
- `logout()` xoa token o ca secure storage va SharedPreferences (userId, userName, phone, roles). Co bat loi tung phan.
- `AdminSessionService.handleExpiredSession()` goi `logout()` roi day ve `LoginScreen` khi 401/403/token expired — co co che chong goi trung (`_isHandlingExpiredSession`).

**VAN DE CON LAI:**

### [HIGH] secure storage Android KHONG bat `encryptedSharedPreferences`
- `StorageService` khoi tao `FlutterSecureStorage()` **khong truyen `AndroidOptions(encryptedSharedPreferences: true)`**.
- `pubspec.lock`: `flutter_secure_storage: 9.2.4`. O dong 9.x, **mac dinh `encryptedSharedPreferences = false`** → token tren Android luu bang co che cu (yeu hon EncryptedSharedPreferences/Keystore-AES). Tren may da root / co backup co the de bi doc hon.
- **Fix:** truyen `aOptions: const AndroidOptions(encryptedSharedPreferences: true)` (hoac nang len v10 noi day la mac dinh). Luu y: doi che do luu se mat token cu → user phai dang nhap lai (chap nhan duoc).

---

## 2. Header Auth

**Pattern chuan (TOT):** `booking_admin_service`, `contract_service`, `customer_service`, `payment_method_service`, `station_service`, `car_schedule_service` — deu lay token, **check `null/empty` truoc**, neu thieu thi tra loi "Phien dang nhap het han" va KHONG goi API.

### [MEDIUM] Header `Bearer null` o nhieu service (khong dong nhat)
Cac service sau lay token nhung **KHONG check null** → khi token null se gui literal `'Bearer null'` len server:
- `lib/features/vehicles/services/vehicle_service.dart` (7 cho)
- `lib/features/vehicles/services/storage_service.dart` (VehicleStorageService.getPresignedUrl)
- `lib/core/services/image_service.dart` (_getPresignedUrl)
- `lib/features/news/services/news_service.dart` (4 cho)
- `lib/features/place/services/city_management_service.dart` (4 cho)
- `lib/features/place/services/station_management_service.dart` (4 cho)
- `lib/features/maintenance/services/maintenance_management_service.dart` (6 cho)
- `lib/features/promotion/services/promotion_management_service.dart` (4 cho)
- `lib/features/finance/services/financial_management_service.dart` (4 cho)
- `lib/features/traffic_violations/services/traffic_violation_service.dart`
- `lib/features/delivery_receive/services/delivery_receive_service.dart`

Tac dong: khong phai lo bao mat lon (server tra 401), nhung gay loi mo ho cho user thay vi thong bao "het phien" ro rang; va `Bearer null` co the lot vao access log server. **Fix:** ap dung guard `if (token == null || token.isEmpty)` dong nhat nhu cac service da fix.

### [LOW] `banner_service._getHeaders()` bo han header Authorization khi token null
- `if (token != null) 'Authorization': ...` → khi chua dang nhap, request banner di **khong co header auth** (request an danh) thay vi bao loi het phien. Hanh vi khong nhat quan voi cac man hinh khac.

---

## 3. Goi endpoint vuot quyen / IDOR

- Toan bo endpoint nghiep vu dung prefix `/xanh/admin/...` va **deu dinh kem `Authorization: Bearer <token>`** (xem `lib/core/api.dart` + cac service). Phan quyen thuc su nam o **backend** — app chi gui token, khong tu suy luan quyen.
- **IDOR:** cac API nhan `id`/`userId`/`bookingId`/`carId` truc tiep tu client (vd `CustomerService.getCustomerDetail(userId)`, `BookingAdminService.getDetail(bookingId)`). Day la pattern admin binh thuong; **rui ro IDOR phu thuoc backend co kiem tra pham vi quyen cua admin hay khong** — KHONG the danh gia tu phia app. → **Khuyen nghi:** xac nhan backend `xanh-service` enforce scope/role tren tung admin endpoint (ngoai pham vi app nay).
- Khong phat hien endpoint nao goi vuot prefix `/admin` hay goi nham endpoint customer-facing.
- Khong co hardcode secret/key/token trong `lib/` (da grep — sach).

---

## 4. Transport / TLS (da FIX tot)

- **Android** `usesCleartextTraffic="false"` + **iOS** `NSAllowsArbitraryLoads=false` → loi cleartext cu da HET.
- **Cert pinning** implement trong `lib/core/services/secure_http_client.dart`: pin SHA256 cho host portal (`AMZ_CERT_SHA256` qua dart-define). Neu thieu fingerprint khi goi host portal → nem `MissingTlsPinningConfigurationException` (fail-closed, tot).
  - **Luu y van hanh [INFO]:** pinning chi kich hoat khi `AMZ_CERT_SHA256` duoc set luc build. Neu build release **quen truyen** `--dart-define=AMZ_CERT_SHA256=...` thi MOI request toi portal se **fail** (fail-closed — an toan nhung de gay "app khong goi duoc API" neu CI quen). Can ghi vao tai lieu build.

---

## 5. Logging / Lo lot thong tin

- `logger` (`lib/core/services/logger.dart`): `level = kReleaseMode ? Level.off : Level.trace` → **tat hoan toan o release**. Tot.
- `debugPrint` trong `storage_service` deu boc `if (kDebugMode)`. Tot. Khong in token/PII (chi in `$e`).

### [MEDIUM] `dart:developer` `log()` CHAY CA TRONG RELEASE
- Cac file dung `import 'dart:developer'; log("... error: $e")`: `vehicle_service`, `promotion_management_service`, `city_management_service`, `station_management_service`, `finance/financial_management_service`, `maintenance_management_service`, `payment_method_service`, `image_service`.
- `dart:developer log()` **KHONG bi strip o release** (khac voi `logger` da tat). Hien tai chi log chuoi loi `$e` (chua thay log body/token), nen rui ro lo PII THAP, nhung khong nhat quan voi chinh sach "tat log o release". **Fix:** thay bang `logger.e(...)` (da tat o release) hoac boc `if (kDebugMode)`.

---

## 6. Input validation (deeplink / webview / file upload / URL)

- **Khong co webview, khong co deeplink intake** (khong dung `uni_links`/`app_links`, manifest khong co intent-filter scheme tuy chinh). Be mat tan cong nay khong ton tai → tot.

### [LOW] `StationManagementService.openMapUrl(String? url)` mo URL tu server khong validate scheme
- `lib/features/place/services/station_management_service.dart:174` — `Uri.parse(url)` (co the **nem FormatException khong bat** → crash nho) roi `launchUrl(uri, mode: externalApplication)` **khong kiem tra `uri.scheme` la http/https**.
- URL den tu data tram (server). Neu data bi chen URL scheme la (vd `intent://`, `tel:`, scheme app khac) → co the kich hoat hanh vi ngoai y muon. **Fix:** validate `uri.scheme == 'http' || 'https'` + boc try/catch quanh `Uri.parse`.

---

## 7. On dinh (Stability) — quan sat phu

- `login_screen.dart`: co **rate-limit dang nhap** (5 lan sai → khoa 30s), dung `Random.secure()` cho fallback deviceId, co check `mounted` truoc moi `setState`/navigate sau `await`. Tot.
- `parseXanhResponse` (admin_api_response): guard `FormatException`, check kieu `Map`, map HTTP 401/403 + responseCode token-expired → tu logout. Xu ly loi kha day du.
- Cac management service (`city/station/finance/maintenance/promotion`) **nuot loi tra `null`** trong `catch` (chi log). Khong crash, nhung UI co the kho phan biet "loi" vs "khong co du lieu" — chap nhan duoc, theo doi them.

---

## Tong hop muc do

| # | Muc | Severity | File |
|---|-----|----------|------|
| 1 | secure storage Android khong bat encryptedSharedPreferences (v9.2.4 default false) | **HIGH** | `core/services/storage_service.dart` |
| 2 | Header `Bearer null` (~11 service khong guard token) | **MEDIUM** | `vehicle_service`, `news_service`, `city/station_management`, `maintenance/promotion/finance`, `image_service`, ... |
| 3 | `dart:developer log()` chay trong release | **MEDIUM** | 8 service files |
| 4 | `openMapUrl` khong validate scheme + Uri.parse khong try/catch | **LOW** | `place/services/station_management_service.dart` |
| 5 | `banner_service` bo header auth khi token null (an danh) | **LOW** | `banners/services/banner_service.dart` |
| 6 | Pinning fail-closed phu thuoc AMZ_CERT_SHA256 luc build (rui ro van hanh) | **INFO** | `core/services/secure_http_client.dart` |

**Khong tim thay:** hardcode secret/key/token; mat khau plaintext; log token/PII; cleartext traffic; goi endpoint vuot prefix admin. Cac loi cu da duoc fix.
