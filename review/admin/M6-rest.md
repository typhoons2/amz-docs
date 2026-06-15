# Review BAO MAT + ON DINH — Module M6-rest (Admin Flutter)

- Ban code: SAU FIX outsource, commit 3e6d332 (07/06/2026)
- So file .dart da doc: **20**
- Pham vi: features/{auth, banners, customers, drivers, news, payments, reports, settings, stations, traffic_violations}, widgets/, main.dart
- Ket luan nhanh: Nhieu loi cu DA HET (token vao secure storage, KHONG con luu plaintext password, co TLS cert pinning, KHONG con log token/credential). Loi CON LAI chu yeu la: mock data PII/credential hardcode trong man hinh, ro ri chi tiet loi (`e.toString()`) ra UI, mot so controller khong dispose, mot vai async race nho, va thieu kiem tra null o vai cho.

## Bang phat hien

| File:dong | Loai | Muc do | Van de | Cach sua |
|-----------|------|--------|--------|----------|
| features/settings/screens/settings_screen.dart:107-110 | secrets | LOW | Hardcode email/role admin trong UI ("Admin User", "admin@amazingxanh.vn", "Super Admin") — du lieu gia, khong lay tu StorageService. Lo email noi bo + gay nham lan quyen. | Lay ten/email/role tu `StorageService.getUserName()/getUserData()/getUserRoles()`, khong hardcode. |
| features/customers/screens/customers_screen.dart:14-65 | other | MEDIUM | Toan bo danh sach khach hang la MOCK hardcode (ten that, email, SDT, chi tieu). Man hinh khong goi `CustomerService` -> hien thi PII gia, nut Them/Sua/Export deu `onPressed: () {}` (no-op). | Goi API thuc (them list endpoint), xoa block mock; hoac an man hinh neu chua co backend. |
| features/drivers/screens/drivers_screen.dart:7-53 | other | MEDIUM | Danh sach tai xe la MOCK hardcode (ten, SDT, bien so). Khong co service goi API; cac nut deu no-op. | Tuong tu customers: noi API that hoac an chuc nang chua san sang. |
| features/customers/screens/customers_screen.dart:218 + drivers_screen.dart:249 | null-safety-crash | LOW | `(c['name'] as String)[0]` / `.substring(0,1)` crash neu name rong (`''`). Hien an toan vi mock, nhung khi doi sang data API thi de crash. | Guard: `name.isNotEmpty ? name[0] : '?'`. |
| features/auth/services/auth_service.dart:82 | logging-leak | MEDIUM | Tra `'Lỗi: ${e.toString()}'` thang ra UI (snackbar). `e` co the chua chi tiet ky thuat (host, exception noi bo) -> lo thong tin he thong. | Tra message chung; log chi tiet `e` qua logger (chi debug). Ap dung cho moi catch tra `e.toString()`. |
| features/banners/services/banner_service.dart:82,163,248,287 | logging-leak | MEDIUM | Cac catch tra `'Lỗi: ${e.toString()}'` ra UI. Lo chi tiet exception. | Message chung cho user, log chi tiet phia client. |
| features/news/services/news_service.dart:40,106,172,201 | logging-leak | MEDIUM | `'Đã xảy ra lỗi: $e'` tra ra UI. | Nhu tren. |
| features/stations/services/station_service.dart:63 | logging-leak | MEDIUM | `'Đã xảy ra lỗi: $e'` ra UI. | Nhu tren. |
| features/customers/services/customer_service.dart:61 | logging-leak | MEDIUM | `'Đã xảy ra lỗi: $e'` ra UI. | Nhu tren. |
| features/payments/services/payment_method_service.dart:69 | logging-leak | MEDIUM | `'Đã xảy ra lỗi: $e'` ra UI. | Nhu tren. |
| features/traffic_violations/services/traffic_violation_service.dart:63 | logging-leak | MEDIUM | `'Đã xảy ra lỗi: $e'` ra UI. | Nhu tren. |
| features/traffic_violations/screens/traffic_violations_screen.dart:133 | logging-leak | MEDIUM | `Text('Đã xảy ra lỗi: $e')` hien thang exception trong SnackBar. | Message chung; log chi tiet rieng. |
| features/payments/services/payment_method_service.dart:107 | logging-leak | LOW | `log("Fetch payment methods error: $e")` (dart:developer). Khong lo token nhung nen dung logger chung + guard debug. | Doi sang logger/guard `kDebugMode`. |
| features/news/services/news_service.dart:14-29,55,122,182 | auth-authz | HIGH | Khi `getAccessToken()` null, code VAN goi API voi header `'Bearer null'` (khong guard token nhu cac service khac). Request khong hop le, server tra 401 lap. | Guard dau moi method: token null/rong -> tra `{'success': false, 'message': 'Phien dang nhap het han...'}` truoc khi goi API. |
| features/traffic_violations/services/traffic_violation_service.dart:19,47 | auth-authz | HIGH | Cung loi: khong guard token, gui `'Bearer null'` khi chua dang nhap/token het han. | Guard token null/rong truoc khi goi `search()`. |
| features/banners/services/banner_service.dart:17-24 | auth-authz | LOW | `_getHeaders()` chi them Authorization neu token != null; khi token null se goi getBanners/deleteBanner KHONG co header auth (request an danh) thay vi bao loi som. | Khi token null tra failure som giong createBanner. |
| features/banners/screens/banners_screen.dart:700-985 | resource-leak | MEDIUM | `_showAddBannerDialog`: tao 4 TextEditingController (title, link, position, sortOrder) trong dialog nhung KHONG dispose khi dong -> ro ri controller moi lan mo dialog. | Dispose controller khi dialog dong (`showDialog(...).whenComplete(...)`) hoac dung StatefulWidget. |
| features/banners/screens/banners_screen.dart:987-1302 | resource-leak | MEDIUM | `_showEditBannerDialog`: 4 controller khong dispose. | Nhu tren. |
| features/news/screens/news_screen.dart:776-1112 | resource-leak | MEDIUM | `_showEditNewsDialog`: 3 controller (title, summary, content) khong dispose. | Dispose khi dialog dong. |
| features/news/screens/news_screen.dart:1114-1443 | resource-leak | MEDIUM | `_showCreateNewsDialog`: 3 controller khong dispose. | Nhu tren. |
| features/banners/screens/banners_screen.dart:954,1271,1361 | async-race | MEDIUM | Sau `await create/update/delete`, goi `_loadBanners()` KHONG await; `_loadBanners` chay `setState(_isLoading=true)` o dong dau truoc khi check mounted -> co the setState sau dispose neu user roi man hinh. | `if (mounted) await _loadBanners();` va them `if (!mounted) return;` truoc setState dau ham. |
| features/news/screens/news_screen.dart:765,1080,1411 | async-race | MEDIUM | Goi `_loadNews()` khong await sau create/update/delete; `_loadNews` set `setState(_isLoading=true)` dong bo dau ham truoc khi check mounted. | Guard mounted truoc khi goi; chuyen check mounted len truoc setState dau ham. |
| features/news/screens/news_screen.dart:58 + banners_screen.dart:44 | async-race | LOW | `_loadNews`/`_loadBanners` goi `setState(() => _isLoading = true)` o dong dau KHONG check mounted. | Them `if (!mounted) return;` truoc setState dau ham. |
| features/traffic_violations/screens/traffic_violations_screen.dart:142 | async-race | MEDIUM | `finally { setState(() => _isLoading=false); }` KHONG check mounted -> setState sau dispose neu user roi man hinh trong luc API chay. | `if (mounted) setState(...)` trong finally. |
| features/banners/models/banner_model.dart:68-74 | transport-tls | LOW | `fullImageUrl`: neu `imageUrl` bat dau `http://` van tra nguyen -> `Image.network` tai cleartext. Khac voi news (da chan http). | Chan/ep https giong `news_screen._getImageUrl`, validate scheme. |
| features/news/screens/news_screen.dart:120-129 | transport-tls | LOW | `_getImageUrl` chan http tot, nhung nhanh path tuong doi ghep `enochTechImageBaseUrl` (mac dinh https) — OK tru khi config doi base sang http. | Dam bao `imageBaseUrl` luon https trong config/CI. |
| features/auth/services/auth_service.dart:46-51,78-84 | error-handling | LOW | `jsonDecode(response.body)` khong bat FormatException rieng -> roi vao `catch (e)` tra `'Lỗi: ${e.toString()}'` (lo chi tiet). Cac service khac dung `AdminApiResponse` xu ly sach hon. | Cho login dung chung `AdminApiResponse.parseXanhResponse` hoac bat FormatException rieng voi message sach. |
| features/login_screen.dart:172-177 (auth) | async-race | LOW | Lock dang nhap (5 lan sai -> 30s) chi luu trong State (`_failedLoginAttempts`, `_lockedUntil`) -> kill app la reset, de bypass. Day la rate-limit client, khong phai bao mat that. | Coi la UX; rate-limit that phai o server. Khong ky vong bao mat tu day. |
| features/auth/screens/login_screen.dart:382-389 | input-validation | LOW | Truong email/username KHONG co validator (chi password co). Submit username rong se goi API thua. | Them validator kiem tra rong cho `_emailController`. |
| features/banners/services/banner_service.dart:122 + news_service.dart:88,155 | input-validation | LOW | Upload file: filename lay tu `path.basename`/`split('/').last` khong sanitize; khong kiem tra size/loai file phia client. | Validate content-type/size truoc khi gui; dua vao server validate la chinh. |
| features/banners/screens/banners_screen.dart:59 | null-safety-crash | LOW | `result['data'] as BannerListResponse` ep kieu cung; neu shape doi -> crash. Rui ro thap vi service dam bao shape. | `result['data'] is BannerListResponse ? ... : fallback`. |
| features/news/screens/news_screen.dart:749,1054 | error-handling | LOW | Id lay qua `news['_id'] ?? news['id'] ?? ''` -> neu ca hai null gui id rong, API xoa/sua loi mo ho. | Validate id khong rong truoc khi goi API, bao loi ro neu thieu. |
| features/reports/screens/reports_screen.dart:24,36 | other | LOW | Nut "Xuat bao cao" `onPressed: null`; toan bo so lieu la "Chua co du lieu" (placeholder). | Xac nhan day la trang thai mong muon truoc release. |
| features/settings/screens/settings_screen.dart:72,95,154-163,200,237 | other | LOW | Tat ca nut Settings (Chinh sua ho so, Doi mat khau, 2FA, Phan quyen, Cau hinh API, Sao luu, Kiem tra cap nhat) deu `onPressed: () {}` (no-op); khong co nut Dang xuat. | Noi chuc nang that hoac an muc chua san sang; can nhac them Dang xuat goi `StorageService.logout()` + `AuthService.logout`. |

## Diem TICH CUC (loi cu da het — xac nhan tren code thuc te)

- `StorageService`: token luu `FlutterSecureStorage`; `init()` chu dong xoa token cu khoi SharedPreferences; KHONG con luu plaintext password (`getRememberMePassword()` luon null, `saveRememberMe` luon remove key password). Remember Me chi luu email. (storage_service.dart:24-36,133-167)
- `logout()` xoa ca secure storage + SharedPreferences, reset token ve null. (storage_service.dart:170-205)
- `SecureHttpClient`: co TLS certificate pinning (SHA256) cho host portal, fail-close (thieu fingerprint -> nem exception, khong goi API). (secure_http_client.dart:85-115)
- `AdminApiResponse`: kiem dung `responseCode == '00'` cho xanh-service; auth_service kiem `'200'` dung convention auth; xu ly 401/403 -> session expired. Khong nuot loi am tham.
- Debug print trong StorageService deu boc `kDebugMode` -> khong lo o release. KHONG tim thay print/log token o cac file M6.
- Man hinh traffic_violations (StatefulWidget) dispose day du controller/scroll.
