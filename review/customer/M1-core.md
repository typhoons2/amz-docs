# Review M1-core (booking-car-app/lib/core)

**So file .dart da doc that su: 24 / 24**

Danh sach file da doc:
1. constants/app_dimensions.dart
2. constants/app_strings.dart
3. constants/app_colors.dart
4. constants/app_config.dart
5. theme/app_theme.dart
6. theme/theme_cubit.dart
7. theme/language_cubit.dart
8. api/api.dart
9. api/api_client.dart
10. api/api_endpoints.dart
11. api/api_service.dart
12. api/google_auth_service.dart
13. core.dart
14. extensions/extensions.dart
15. extensions/time_extension.dart
16. services/file_picker_fallback.dart
17. services/s3_upload_service.dart
18. user/bloc/user_bloc.dart
19. user/bloc/user_event.dart
20. user/bloc/user_state.dart
21. user/data/models/user_model.dart
22. utils/app_utils.dart
23. utils/certificate_pinning.dart
24. utils/widgets/text_field_plus.dart + widgets/widgets.dart

---

## Bang van de

| File:dong | Loai | Muc do | Van de | Cach sua |
|-----------|------|--------|--------|----------|
| api_client.dart:62 | logging-leak | CRITICAL | In NGUYEN access token ra log: `print('Authorization: ${options.headers['Authorization']}')`. Token in vao console, ai xem log/logcat deu lay duoc token dang nhap cua khach. | Bo dong nay, hoac chi in `Bearer ***`. Khong bao gio in token that. |
| api_client.dart:135-137 | logging-leak | CRITICAL | Lap lai loi tren cho bookingDio: in nguyen Authorization token. | Bo / mask token. |
| api_client.dart:59,75,133,149,167 | logging-leak | HIGH | In nguyen request body + response body (chua mat khau, OTP, CCCD, so GPLX, thong tin ca nhan) ra log. Du chi chay o kDebugMode nhung van lo PII khi debug tren may that. | Khong in body chua truong nhay cam; neu can debug thi loc bo password/otp/identityNumber/licenseNumber truoc khi in. |
| api_client.dart:269,272,397-398 | auth-authz | HIGH | Khi refresh token, dung `Dio()` moi (cloneDio) khong interceptor de retry request — nhung header Authorization moi co set tay nen tam on; van de la cloneDio KHONG qua cert pinning, bo qua kiem tra chung chi cho request da retry. | Retry qua dio co interceptor cert-pinning, hoac goi lai CertificatePinning.check truoc khi fetch. |
| api_client.dart:226-420 | async-race | HIGH | Co 2 luong refresh token (onResponse va onError) dung chung co `_isRefreshing` nhung KHONG co hang doi (queue). Nhieu request 401 song song: chi 1 cai refresh, cac cai con lai bi tra ve loi (handler.next) thay vi cho token moi roi retry → user gap loi rai rac dù da co token moi. | Implement queue: cac request trong khi dang refresh phai cho, sau khi co token moi thi retry tat ca. |
| api_client.dart:178-201 | auth-authz | MEDIUM | `getDio()` voi baseUrl la (deprecated): nhanh else tao Dio moi CHI co AuthInterceptor, THIEU cert-pinning interceptor → request qua duong nay khong duoc pin chung chi. deleteAccount dang dung duong nay. | Bo han getDio, ep dung getAuthDio/getBookingDio; hoac them cert-pinning vao nhanh else. |
| api_client.dart:236,287,326,360,412 | resource-leak | LOW | Tao `FlutterSecureStorage()` moi nhieu lan rai rac (khong leak nghiem trong nhung lap lai). | Tao 1 instance dung chung trong interceptor. |
| api_service.dart:80-97 | error-handling | CRITICAL | `googleLogin` dung `getBookingDio()` (base xanh-service) NHUNG google_auth_service.dart:73 lai check responseCode `'200'` (chuan auth-service). Sai Dio + sai convention → dang nhap Google co the luon bao that bai hoac goi nham service. | Doi sang `getAuthDio()` (vi day la nghiep vu auth). Xac nhan endpoint google-login thuoc auth-service. |
| api_service.dart:383-389 | error-handling | HIGH | `getPromotions` dung `getAuthDio()` nhung promotions la nghiep vu xanh-service. Goi nham base URL → 404/loi. | Doi sang `getBookingDio()`. |
| api_service.dart:393-402 | error-handling | HIGH | `getNews` dung `getAuthDio()` (endpoint `/news/available`) — news thuoc nghiep vu, nen o xanh-service. Goi nham base. | Doi sang `getBookingDio()` (xac nhan voi BE news o service nao). |
| api_service.dart:249 | null-safety-crash | HIGH | Bug chuoi: `'requestId': "req-price-$_generateRequestId()"` — Dart KHONG goi ham trong chuoi kieu nay; ket qua la chuoi literal `"req-price-Instance of...()"` hoac `req-price-<toString cua method>()`. requestId sai dinh dang. | Sua thanh `"req-price-${_generateRequestId()}"`. |
| api_service.dart:611-636 | transport-tls | CRITICAL | `getPaymentMethods` tao `Dio()` tho: KHONG qua AuthInterceptor (thieu header Authorization) VA KHONG qua cert-pinning → request khong duoc bao ve TLS pinning, va co the bi 401 do thieu token. | Dung `_apiClient.getBookingDio()` thay vi `Dio()`. |
| api_service.dart:616 | null-safety-crash | HIGH | `final String responseCode = data["response"]?["responseCode"];` ep kieu non-null tu gia tri co the null → neu body thieu field se crash (hoac throw bat boi catch, tra null im lang). | Khai bao `String?` va guard: `if (responseCode != "00") return null;`. |
| api_service.dart:622-627 | null-safety-crash | MEDIUM | `data["result"]` ep `List<dynamic>` khong guard null/sai kieu → crash neu result null. (Duoc catch nuot thanh null nhung che giau loi that.) | Guard kieu truoc khi cast/loop. |
| api_service.dart:353-369 | error-handling | MEDIUM | `deleteAccount` bao boc try/catch tra `null` khi loi → noi goi khong phan biet duoc "xoa that bai" hay "khong co response". Nuot loi. | Nem loi hoac tra ket qua co trang thai ro rang; log chi tiet phia trong. |
| api_service.dart:14-21,107-110,121-124 | error-handling | LOW | Cac ham return `Future<Response>` truc tiep, khong check responseCode "00"/"200" tai tang service — viec check day het cho UI/bloc. De sai sot. | Can nhac wrapper kiem responseCode tap trung. |
| api_service.dart:1-10 | other | LOW | Import `dart:math`, `payment_method`, `auth_api`, `shared_preferences` nhung nhieu cai khong dung trong file → rac. | Don import thua. |
| google_auth_service.dart:48,92 | logging-leak | HIGH | In 50 ky tu dau cua Google ID token + do dai token ra log. ID token la bi mat; 50 ky tu dau van la phan header nhung khong nen in token that ra log. | Bo in token; chi log "da nhan id token" khong kem noi dung. |
| google_auth_service.dart:73-75 | error-handling | HIGH | `throw Exception(responseData)` nem nguyen ca object response (chua message + co the field nhay cam) lam noi dung exception → loi hien thi/log lo du lieu, va message UI khong than thien. | Nem Exception voi message ngan tu responseMessage. |
| google_auth_service.dart:11 | auth-authz | MEDIUM | `_serverClientId = String.fromEnvironment('GOOGLE_CLIENT_ID')` khong co defaultValue; neu quen truyen `--dart-define` thi serverClientId rong → Google sign-in se sai cau hinh ma khong canh bao. | Validate startup: neu rong thi log/throw ro rang. |
| google_auth_service.dart:107-118 | error-handling | MEDIUM | Catch tong roi `rethrow` nhung khoi if `result != null` (dong 77-106): neu `result == null` (response 200 nhung khong co data) thi ham KHONG return gi → tra ve `null` ngam, noi goi khong biet dang nhap that bai hay thanh cong. | Them nhanh else: throw/return ro rang khi result null. |
| certificate_pinning.dart:5-7 | transport-tls | HIGH | CHI co 1 SHA256 fingerprint cung (hardcode), khong co pin du phong (backup pin). Khi server doi chung chi (gia han SSL) ma chua release app moi → TOAN BO app khong goi duoc API (brick). | Them >=2 fingerprint (chung chi hien tai + chung chi backup/intermediate CA). Co quy trinh xoay pin. |
| certificate_pinning.dart:20-22 | error-handling | MEDIUM | `catch (e) return false` — moi loi (vd timeout mang) deu coi la "khong an toan" va chan request. Nhung dong thoi nuot loi that, kho phan biet "pin sai" voi "mat mang". | Phan biet loi mang vs loi pin; log chi tiet; can nhac cho retry mang. |
| s3_upload_service.dart:46-48 | null-safety-crash | MEDIUM | `presignedResponse.data['response']['responseCode']` truy cap chuoi index khong guard (neu data null/khong phai Map se crash). Duoc bao boi try/catch ben ngoai nhung che loi that. | Guard kieu/null truoc khi truy cap. |
| s3_upload_service.dart:27-31,57-63,86-117 | logging-leak | LOW | In ten file, kich thuoc, mot phan presigned URL (chua chu ky tam) ra log debug. Presigned URL co token tam thoi. | Han che in URL; chi log objectKey. |
| s3_upload_service.dart:139-152 | async-race | LOW | `Future.wait` upload 2 anh song song — neu 1 cai fail, cai con lai van chay nhung ket qua bi bo; khong huy. Chap nhan duoc nhung lang phi. | Co the dung try per-item; minor. |
| file_picker_fallback.dart:8-26 | error-handling | LOW | `pickImageFile` luon throw roi catch tra null → ham nay thuc te khong lam gi (dead/placeholder code). | Xoa neu khong dung, hoac implement that. |
| file_picker_fallback.dart:29-64 | other | LOW | `testS3Upload` la code test/debug con sot trong source production, in URL presigned ra log. | Xoa code test khoi ban release. |
| user_bloc.dart:46-69 | error-handling | HIGH | `getProfile()` chi check `response.statusCode == 200`, KHONG check responseCode "00" (xanh-service). HTTP 200 nhung body bao loi (vd token het han responseCode 400) van bi coi la thanh cong → hien thi data cu/rong sai. | Check `response.data['response']['responseCode'] == '00'` truoc khi parse. |
| user_bloc.dart:48-49 | null-safety-crash | MEDIUM | `response.data?['result']?['data']` co guard nhung sau do `UserModel.fromJson(data)` — neu `data` khong phai Map se crash (duoc catch). Tam on. | Guard `data is Map` truoc fromJson. |
| user_bloc.dart:23,80,86 | resource-leak | LOW | Tao `FlutterSecureStorage()` moi tung handler. Minor. | Dung 1 field dung chung. |
| theme_cubit.dart:5 | other | LOW | Tu dinh nghia enum `ThemeMode` trung ten voi `ThemeMode` cua Flutter → de nham lan khi import. | Doi ten (vd AppThemeMode) hoac dung ThemeMode cua Flutter. |
| theme_cubit.dart:12-16 | null-safety-crash | MEDIUM | `ThemeMode.values[themeIndex]` — neu prefs luu index ngoai range (vd app cu luu gia tri khac) se crash IndexOutOfRange. | Clamp/guard index trong [0, values.length). |
| language_cubit.dart:14-16 | input-validation | LOW | `Locale(languageCode)` lay tu prefs khong validate co thuoc supportedLocales khong → co the set locale khong ho tro. | Guard: neu khong nam trong supportedLocales thi fallback 'vi'. |
| text_field_plus.dart:21,12-24 | resource-leak | HIGH | `_controller = _textField.controller ?? TextEditingController()` tao controller moi nhung KHONG co `dispose()` → moi lan widget bi huy se ro ri TextEditingController (memory leak), nhat la khi tao moi (controller != cua cha). | Them `@override dispose()`: chi dispose controller neu tu tao (khi `_textField.controller == null`). |
| text_field_plus.dart:43-112 | other | LOW | Build TextField moi truyen `controller: _textField.controller` (controller goc) thay vi `_controller` da tao → khi cha khong truyen controller, nut clear (dong 133 `_controller.clear()`) thao tac tren controller KHAC voi controller dang gan vao TextField → nut xoa khong hoat dong. | Dung `_controller` cho ca TextField va nut clear. |
| app_strings.dart:5,15-19 | other | MEDIUM | Hang so rac tu template khac: appName='Cash Flow Management', baseUrl='https://api.cashflow.com/v1/' va cac endpoint auth/transactions khong lien quan app thue xe. Gay nham lan; baseUrl la URL la khong dung den nhung de hieu lam. | Xoa cac hang so khong dung; sua appName dung. |
| app_utils.dart:24 | input-validation | LOW | Regex email yeu (`{2,4}` TLD, khong ho tro TLD dai/ten mien moi). | Dung regex chuan hon hoac package validator. |
| app_endpoints / chung | secrets | OK | KHONG hardcode secret/key/password. Base URL la URL cong khai cua gateway (qua String.fromEnvironment, co default) — chap nhan duoc. |
| transport (cleartext) | transport-tls | OK | Tat ca base URL deu `https://`. Khong thay http cleartext trong module core. (Luu y: can kiem tra rieng AndroidManifest/network_security_config/Info.plist o module khac.) |

---

## Tom tat theo muc do

- **CRITICAL (4):**
  1. In nguyen access token ra log (api_client.dart:62, 135) — lo token dang nhap.
  2. googleLogin sai Dio (booking) + sai responseCode ("200") — dang nhap Google co the hong hoac goi nham service.
  3. getPaymentMethods dung Dio tho — thieu auth + thieu cert pinning.

- **HIGH (10):** parity getPromotions/getNews dung nham getAuthDio; user_bloc khong check responseCode "00"; cert pinning chi 1 fingerprint (rui ro brick app khi xoay SSL); TextFieldPlus ro ri controller; in token/PII/body khi debug; bug chuoi requestId calculatePrice; queue refresh token thieu; google ID token in ra log; throw nguyen response object; refresh-token retry bo qua cert pinning.

- **MEDIUM/LOW:** nhieu cho parse JSON khong guard kieu (duoc try/catch che giau), nuot loi tra null im lang, code test/placeholder con sot, hang so rac tu template "Cash Flow", enum ThemeMode trung ten, validate input yeu.

## Cho SACH (khong co van de dang ke)
- constants/app_dimensions.dart, constants/app_colors.dart: chi dinh nghia hang so, sach.
- extensions/time_extension.dart, extensions/extensions.dart, core.dart, api/api.dart, widgets/widgets.dart: file export/extension don gian, sach.
- user_event.dart, user_state.dart, user_model.dart: model/state immutable dung chuan, sach (user_model fromJson khong guard nhung input la data noi bo da parse).
- app_theme.dart: chi cau hinh theme, sach.
