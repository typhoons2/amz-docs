# D4 — Transport Security (amz_xanh_admin_app)

App: `amz_xanh_admin_app` (Flutter ADMIN)
Commit review: `3e6d332` (ban code SAU FIX outsource, 07/06/2026)
Ngay review: 08/06/2026
Pham vi: an toan duong truyen (HTTP cleartext, TLS, certificate pinning) + cau hinh Android/iOS + toan bo network path trong `lib/`.

> LUU Y: Day la review tren ban code MOI. Cac loi cu (cleartext=true, khong pinning, log token, mat khau plaintext) **DA DUOC FIX** — danh gia duoi day theo dung code thuc te hien tai.

---

## 1. Tom tat nhanh (de lead hieu)

- **Tin tot:** Phan duong truyen da duoc lam **DUNG**. Android da CHAN ket noi HTTP khong ma hoa (`usesCleartextTraffic="false"`), iOS cung chan (ATS bat). App da co "ghim chung chi" (certificate pinning) cho server chinh, va neu cau hinh ghim bi thieu thi app tu chan ket noi (an toan, khong am tham bo qua).
- **Khong tim thay loi nghiem trong (CRITICAL/HIGH) ve transport** tren ban nay.
- Tat ca dia chi API deu la HTTPS; moi request mang deu di qua 1 lop chung `SecureHttpClient` co kiem tra pinning truoc khi gui. Khong cho nao tu y bo qua kiem tra chung chi.
- Con lai vai khuyen nghi nho (MEDIUM/LOW) ve van hanh va validate URL.

---

## 2. Cau hinh nen tang (platform config)

### Android — `android/app/src/main/AndroidManifest.xml`
- Dong 12: `android:usesCleartextTraffic="false"` → OS CHAN HTTP plaintext toan app. TOT (loi cu da fix).
- `android/app/src/debug/AndroidManifest.xml` + `profile/AndroidManifest.xml`: chi them quyen `INTERNET`, **KHONG bat lai cleartext**. An toan (mot bay thuong gap la dev bat cleartext o debug manifest — o day KHONG bi).
- Khong co `res/xml/network_security_config.xml` — chap nhan duoc vi da set `cleartext=false` truc tiep va pinning lam o tang Dart.

### iOS — `ios/Runner/Info.plist`
- Dong 5-9: `NSAppTransportSecurity > NSAllowsArbitraryLoads = false` → ATS bat day du, ep HTTPS. TOT.
- Khong co exception domain noi long ATS.

---

## 3. Certificate Pinning — `lib/core/services/secure_http_client.dart`

- Dung package `http_certificate_pinning: ^3.0.1` (co trong `pubspec.yaml:41`), thuat toan SHA256.
- Fingerprint doc tu env compile-time `AMZ_CERT_SHA256` (`String.fromEnvironment`) — **KHONG hardcode** SHA trong source. TOT.
- Fail-closed: neu host yeu cau pinning ma danh sach fingerprint rong → nem `MissingTlsPinningConfigurationException`; neu check khong tra ve `CONNECTION_SECURE` → nem `TlsPinningException`. Khong am tham bo qua. TOT.
- Pinning ap cho host portal (`api-portal.amzholdings.vn`). Host khac (S3 presigned upload, host dong) khong pin nhung van bat buoc HTTPS.
- Moi method `get/post/put/delete/sendMultipart` deu goi `_checkPinning(url)` TRUOC khi gui. Khong co duong vong qua mat pinning.

---

## 4. Bao phu network path (grep toan repo)

Khong tim thay `http.get/post/...` truc tiep, khong co `HttpClient()` thuan, khong co `badCertificateCallback`/`SecurityContext` tu chap nhan cert sai. Tat ca di qua `SecureHttpClient`:
- `auth_service.dart` (login/logout) → `SecureHttpClient.post`
- `image_service.dart` + `features/vehicles/services/storage_service.dart` (presigned + upload S3) → `SecureHttpClient.post/put`
- `banner_service.dart`, `news_service.dart` (multipart upload anh) → `SecureHttpClient.sendMultipart`

Log: cac service chi log object loi (`log("... error: $e")`) — **KHONG log token/body/PII**. `storage_service.dart` chi `debugPrint` thong bao loi chung trong `kDebugMode`, khong in token.

Token storage: token o `flutter_secure_storage`; `shared_preferences` chi giu user info + remember-me email (mat khau KHONG luu — `getRememberMePassword()` luon tra `null`). `logout()` xoa ca secure token lan prefs.

---

## 5. Findings (theo checklist)

### MEDIUM
- **[transport-tls] Pinning phu thuoc env `AMZ_CERT_SHA256` luc build.** (`secure_http_client.dart:30-37`) Neu pipeline release quen truyen `--dart-define=AMZ_CERT_SHA256=<sha>`, app se nem exception o MOI request toi portal → app khong dung duoc (fail-closed: an toan ve bao mat nhung de gay su co release im lang). Khuyen nghi: them buoc CI assert bien nay co gia tri truoc khi build release.

### LOW
- **[input-validation] `launchUrl` mo URL tu API ma chua kiem tra scheme.** (`station_management_service.dart:174-184 > openMapUrl`) Neu API tra ve scheme la (`javascript:`, `file:`...), `launchUrl(mode: externalApplication)` co the mo ngoai y muon. Khuyen nghi: chi cho phep `https`/`http`/`geo` truoc khi launch.
- **[transport-tls] Upload S3 (presigned `uploadUrl`) khong duoc cert-pin.** (`image_service.dart:243`, `vehicles/services/storage_service.dart:68`) Do host S3 dong nen pin SHA cu the khong kha thi; van duoc bao ve boi TLS + ATS/cleartext=false. Chap nhan duoc, ghi nhan de biet.

---

## 6. Ket luan

Transport security cua ban code MOI **DAT yeu cau**: cleartext bi chan ca Android lan iOS, ATS bat, cert pinning co va fail-closed, khong hardcode SHA/secret, khong log token/body. Cac loi cu da het. Chi con khuyen nghi van hanh (dam bao truyen env pinning khi build release) + validate scheme URL deeplink. **Khong co blocker ve transport truoc release.**
