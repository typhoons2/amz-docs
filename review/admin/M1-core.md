# Review M1-core — `lib/core` (app ADMIN Flutter)

> Ban code SAU FIX (commit 3e6d332, 07/06/2026). Danh gia khach quan theo code THUC TE — KHONG gia dinh loi cu con.
> So file .dart da doc: **24** (toan bo `lib/core/**`).
> Da kiem tra them cau hinh nen tang (checklist yeu cau): `android/app/src/main/AndroidManifest.xml`, `ios/Runner/Info.plist`.

## Ket luan nhanh — NHIEU loi cu DA HET

- **Token:** luu o `flutter_secure_storage` (Keychain/Keystore), KHONG con SharedPreferences plaintext. `init()` con chu dong xoa gia tri legacy. `logout()` xoa token o ca secure storage + prefs.
- **Mat khau remember-me:** KHONG con luu plaintext — `getRememberMePassword()` luon tra `null`, `saveRememberMe()` luon `remove(_rememberMePasswordKey)`. (Khac han ban cu).
- **Cleartext:** TAT ca 2 nen tang — Android `usesCleartextTraffic="false"`, iOS `NSAllowsArbitraryLoads=false`.
- **Cert pinning:** CO (`SecureHttpClient` + `http_certificate_pinning`), bat buoc `AMZ_CERT_SHA256` moi goi duoc portal (fail-closed).
- **Logger:** tat hoan toan o release (`kReleaseMode ? Level.off`). `debugPrint` trong storage deu boc `if (kDebugMode)`.
- **Secret/URL:** khong hardcode secret/token; base URL lay tu `String.fromEnvironment` co default.
- **responseCode:** `admin_api_response.dart` kiem dung `responseCode "00"` cho xanh-service + xu ly 401/403/token-expired → dung convention.

Cac van de CON LAI chu yeu la **on dinh** (crash/leak/nuot loi), khong con loi bao mat nghiem trong (CRITICAL) trong module core.

## Bang phat hien

| File:dong | Loai | Muc do | Van de | Cach sua |
|-----------|------|--------|--------|----------|
| utils/widgets/date_time_field.dart:77-84 | async-race | HIGH | `_DateFieldState`: sau `await showDatePicker(...)` goi `setState` ma KHONG kiem `mounted`. Neu nguoi dung roi man hinh khi dialog dang mo → `setState() called after dispose` (exception/crash). | Them `if (!mounted) return;` ngay sau `await showDatePicker`. |
| utils/widgets/date_time_field.dart:128-133 | async-race | HIGH | `_TimeFieldState`: sau `await showTimePicker(...)` goi `widget.onSelected` + `setState` khong kiem `mounted`. | Them `if (!mounted) return;` sau `await showTimePicker`. |
| utils/widgets/date_time_field.dart:36-43 | async-race | MEDIUM | Callback `onSelected` cua TimeField dung `ScaffoldMessenger.of(context)` (chay sau await o tang con) ma khong dam bao context con mounted → co the throw khi context da bi go. | Capture `ScaffoldMessenger` truoc await hoac guard `mounted` truoc khi show SnackBar. |
| utils/widgets/searchable_dropdown.dart:25 | resource-leak | HIGH | `_controller = TextEditingController()` tao trong `StatelessWidget` → KHONG bao gio `dispose()`. Moi lan dung dropdown ro ri 1 controller. | Doi sang `StatefulWidget` va dispose `_controller` trong `dispose()`, hoac de `DropdownSearch` tu quan ly (bo `_controller`). |
| services/image_service.dart:25; utils/widgets/image_widget.dart:21 | null-safety-crash | HIGH | `Image.network(imageUrl)` khong co `errorBuilder`/`loadingBuilder`. URL anh tu API; URL hong/loi mang → widget nem exception (o do hoac man hinh trong), khong co placeholder. | Them `errorBuilder: (_, __, ___) => Icon(Icons.broken_image)` + `loadingBuilder` cho moi `Image.network`. |
| services/image_service.dart:90-111 | error-handling | MEDIUM | `uploadImages` chi `log()` khi loi (dong 107) va luon tra `List<String>` (co the rong) → loi upload bi nuot, UI tuong thanh cong nhung mat anh. Khong phan biet "khong co anh" voi "upload that bai". | Tra ve ket qua co `success`/thong bao loi; neu 1 anh that bai phai bao len UI thay vi chi `log`. |
| services/image_service.dart:251 | error-handling | MEDIUM | `_uploadFileToS3` chi coi `statusCode == 200` la thanh cong; presigned S3 PUT co the tra `204`/`201` → bao that bai sai. | Chap nhan dai 2xx: `statusCode >= 200 && statusCode < 300`. |
| services/storage_service.dart:19 | null-safety-crash | MEDIUM | `static late SharedPreferences _prefs;` — neu getter bat ky (vd `getUserId`, `isRememberMeEnabled`) duoc goi TRUOC khi `init()` xong → `LateInitializationError` (crash). Khong co guard. | Dam bao `await StorageService.init()` truoc `runApp` o `main.dart`; hoac doi nullable + tra default an toan khi chua init. |
| services/admin_session_service.dart:13-29 | async-race | MEDIUM | Co `_isHandlingExpiredSession` chong vao lai nhung `finally` reset `false` ngay sau `pushAndRemoveUntil` (truoc khi dieu huong hoan tat) → 2 response 401 gan nhau van co the push login 2 lan. Ngoai ra neu `navigator == null` thi session het han bi bo qua AM THAM. | Giu co `true` cho den khi ve login xong (reset o `LoginScreen.initState`); xu ly `navigator == null` (queue/retry) thay vi return im lang. |
| utils/input_formatter.dart:16 | null-safety-crash | MEDIUM | `int.parse(digits)` voi chuoi so rat dai (dan 19+ chu so) vuot pham vi `int` 64-bit → nem `FormatException`, khung o nhap khi go/dan. Khong gioi han do dai dau vao. | Dung `int.tryParse` + guard null, hoac `LengthLimitingTextInputFormatter`/`BigInt`. |
| services/secure_http_client.dart:111-115 | transport-tls | MEDIUM | `_requiresPinning` chi pin host = portalHost. Goi toi host khac (vd presigned S3 trong `_uploadFileToS3`) KHONG duoc pin (chi yeu cau https). Hop ly vi URL S3 dong, nhung neu backend doi sang CDN/domain anh co dinh khac portal thi traffic do khong duoc bao ve pinning. | Xac nhan chu y; neu co CDN co dinh, them host do vao danh sach pin. |
| services/image_service.dart:118 | input-validation | LOW | `file.path.split('/').last` chi tach theo `/`; tren Windows/desktop path dung `\` → `fileName` sai (mobile thi OK). | Dung `p.basename(file.path)` (package `path`). |
| services/image_service.dart:68,85,107 | logging-leak | LOW | `log("...error: $e")` (dart:developer) chay CA o release (khong bi gat boi `kReleaseMode`). Loi co the lo path file/PII trong log thiet bi. | Boc `if (kDebugMode)` hoac dung `logger` (da tat o release) thay cho `log`. |
| services/storage_service.dart:115-124 | logging-leak | LOW | `getUserData()` gom ca `accessToken`/`refreshToken` vao 1 Map → neu tang goi `print`/log Map nay se lo token. Core khong log nhung API nay tao rui ro o tang goi. | Cho `getUserData()` KHONG kem token (chi profile); token lay rieng qua getter. |
| services/secure_http_client.dart:30-37,93-96 | secrets | LOW | Pin lay tu `AMZ_CERT_SHA256` luc compile. Neu build release QUEN truyen `--dart-define` → `_fingerprints` rong → moi goi portal nem `MissingTlsPinningConfigurationException` (app "chet im", khong goi duoc API). Fail-safe tot nhung de gay su co neu CI thieu bien. | Dam bao pipeline luon truyen `AMZ_CERT_SHA256`; can nhac thong bao than thien khi thieu pin. |
| services/admin_api_response.dart:55-63 | error-handling | LOW | Nhanh non-success: neu body JSON nhung thieu `response.responseCode` thi `errorCode = null` (mat thong tin ma loi). | Fallback `errorCode` ve `statusCode.toString()` khi `_responseCodeFrom` tra null. |
| utils/widgets/text_field_plus.dart:13-22 | resource-leak | LOW | `_controller = _textField.controller ?? TextEditingController()` — neu fallback tu tao controller thi khong duoc dispose. Thuc te luon co controller truyen vao nen it xay ra. | Neu tu tao thi dispose trong `dispose()`; hoac bat buoc co controller. |
| utils/app_utils.dart:24-38 | other | LOW | `formatMoney` dung `amount.abs()` → so tien AM (hoan tien/cong no) hien thanh so duong, de hieu nham nghiep vu. | Giu dau am: them tien to `-` khi `amount < 0`. |

## Muc da kiem — KHONG co van de

- **secrets:** khong co API key/token/mat khau cung trong source; base URL public lay tu env.
- **token-storage:** token o `flutter_secure_storage`; logout xoa ca secure + prefs; remember-me KHONG luu mat khau.
- **auth-authz:** `image_service` gan `Authorization: Bearer $token` dung cho presigned URL; khong thay goi endpoint vuot quyen trong core.
- **transport-tls (nen tang):** Android `usesCleartextTraffic="false"`, iOS `NSAllowsArbitraryLoads=false`, co cert pinning → dat yeu cau.
- **error-handling (responseCode):** `admin_api_response.dart` kiem dung `"00"` + xu ly 401/403/token-expired theo convention xanh-service.
- **logger:** tat o release; `Random.secure()` cho requestId.
- **File thuan UI/du lieu tinh:** app_colors, app_strings, key_value, models, core.dart, app_theme, text_edit_widget, money_text_field, date_formatter, widgets.dart — khong co logic IO nhay cam, khong phat hien loi dang ke.
