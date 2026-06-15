# Review M3 — Auth & Account (booking-car-app)

> Module khach hang, dung API he thong AMZ. responseCode dung: xanh-service "00", auth-service "200".
> Bao cao bang tieng Viet, mo ta de hieu cho lead khong ranh code.

## So file da doc: 11 / 11

Thu muc `lib/features/auth` (7 file):
1. `auth/data/remote/auth_api.dart` — **toan bo bi comment (code chet)**, khong dung
2. `auth/presentation/pages/create_password_page.dart`
3. `auth/presentation/pages/email_register_page.dart`
4. `auth/presentation/pages/forgot_password_page.dart`
5. `auth/presentation/pages/login_page.dart`
6. `auth/presentation/pages/otp_page.dart`
7. `auth/presentation/pages/register_page.dart`

Thu muc `lib/features/account` (4 file):
8. `account/presentation/pages/account_page.dart`
9. `account/presentation/pages/identity_page.dart`
10. `account/presentation/pages/license_page.dart`
11. `account/presentation/services/account_service.dart`

---

## Bang phat hien

| File:dong | Loai | Muc do | Van de | Cach sua |
|-----------|------|--------|--------|----------|
| create_password_page.dart:194-198 | error-handling | CRITICAL | Man hinh "Dat lai mat khau": bam Xac nhan KHONG goi API nao (chi co `// TODO: call register API`), nhung van bao thanh cong va chuyen ve trang dang nhap. User tuong da doi mat khau nhung that ra KHONG co gi xay ra. Day la luong dat lai mat khau (quen mat khau) -> bao mat. | Goi API dat lai mat khau (kem email + OTP truyen tu man OTP) va kiem `responseCode == "200"` truoc khi bao thanh cong. Truoc khi hoan thien API: KHONG cho chuyen man, hien thong bao "chuc nang chua hoat dong". |
| otp_page.dart:189-200, 224-229 | error-handling | CRITICAL | Man hinh OTP: bam Tiep tuc chi can du 6 chu so la cho qua, KHONG he goi API xac thuc OTP voi server (chi `// TODO: resend OTP`). Nghia la nhap 6 so bat ky cung qua duoc buoc OTP. Lo hong xac thuc. | Goi API verify OTP, chi cho di tiep khi server tra responseCode dung. Nut "Gui lai ma" cung phai goi API gui lai OTP that. |
| email_register_page.dart:135 | null-safety-crash | HIGH | Khi dang ky loi (DioException), code doc `e.response?.data["response"]["responseMessage"]` — neu server tra body khac dinh dang (vd HTML loi 500, hoac `data` la null) se nem loi tiep ngay trong khoi catch -> co the crash hoac nuot mat thong bao. | Doc an toan: `final r = e.response?.data; final msg = (r is Map) ? r['response']?['responseMessage'] : null;` roi fallback "Co loi xay ra". |
| login_page.dart:107 | null-safety-crash | HIGH | Y het tren: khi dang nhap loi, doc `e.response?.data["response"]["responseMessage"]` khong guard kieu — body loi khong phai Map se crash trong catch. | Kiem `data is Map` truoc khi truy cap; fallback thong bao mac dinh. |
| login_page.dart:82-92 | null-safety-crash | HIGH | Sau khi dang nhap, doc `result?['accessToken']` ep thang sang `String?` va luu. Neu server doi cau truc (token nam cho khac, hoac null) thi token luu rong, app van vao dashboard nhung moi API sau do se 401 ma user khong hieu vi sao. | Kiem accessToken null/rong -> bao loi dang nhap, KHONG dieu huong vao dashboard. |
| account_page.dart:1310-1316 | logging-leak | HIGH | Trong "Doi mat khau", doc token tu storage roi `print('DEBUG: Token from SharedPreferences: $token')` — in nguyen access token ra log (du chi o debug mode). Lo token. Doan doc token nay con thua, khong dung vao viec gi. | Xoa han doan doc token + print debug nay. |
| login_page.dart:99-100,119-120,123-125,133-134,144-145,157-158 | logging-leak | MEDIUM | Nhieu `print` debug con sot: in exception dang nhap, log dieu huong, log Google. Co the lo thong tin loi/he thong. Deu trong `kDebugMode` nen chi anh huong ban debug, nhung la rac. | Go bo cac print debug truoc khi phat hanh, hoac thay bang logger co kiem soat. |
| account_page.dart:62,72,409,898,1315,1341 + 1703 | logging-leak | MEDIUM | Rai rac nhieu `print(...)` (loi tai profile, "_showProfileDialog called", log loi). Rieng dong 898 va 1703 `print` KHONG boc trong `kDebugMode` -> in ca tren ban release. | Boc tat ca trong `kDebugMode` hoac dung logger; tot nhat go bo. |
| identity_page.dart:64-65,83-84,120,135,305,335,346,361,426 ... | logging-leak | MEDIUM | Rat nhieu print debug in `response.data` (co the chua so CCCD, ho ten, ngay sinh — PII) va duong dan anh. Deu trong kDebugMode nhung in nguyen PII ra log. | Khong in nguyen body/PII; chi log status code. Go truoc khi release. |
| license_page.dart:73-74,92-94,153-155,346,374,400,468 ... | logging-leak | MEDIUM | Y het identity_page: print nguyen `response.data` (so bang lai, ho ten, dob) va path anh. | Tuong tu: bo in PII, chi giu log toi thieu. |
| account_page.dart:1384-1405 | error-handling | HIGH | Luong "Xoa tai khoan": sau khi xoa tai khoan THANH CONG lai hien thong bao "**Cap nhat thong tin thanh cong**" (sai noi dung — copy nham). User xoa tai khoan ma thay chu "cap nhat" -> roi. | Doi text thanh "Xoa tai khoan thanh cong". |
| account_page.dart:1391-1393 | null-safety-crash | HIGH | `deleteAccount()` co the nem loi mang (timeout, mat mang). O day KHONG co try/catch — neu API loi, dialog loading da mo (dong 1390) se KHONG bao gio dong, app treo man hinh xoay vong. | Boc trong try/catch/finally; `hideLoadingDialog` dat trong finally de luon dong. |
| account_page.dart:350-353, 840-843, 1329-1332, 1395-1397 | async-race | MEDIUM | Sau khi goi API trong cac dialog, goi `ScaffoldMessenger.of(context)` / `Navigator.pop(context)` ma KHONG kiem `mounted` o nhanh thanh cong (chi kiem o nhanh catch). Neu user dong sheet trong luc cho API, co the dung context da huy -> loi runtime. | Them kiem `if (!mounted) return;` truoc khi dung context o nhanh thanh cong. |
| account_page.dart:79-92,428,932-934,1858-1892 | resource-leak | MEDIUM | Cac `TextEditingController` tao trong `_showProfileDialog`, `_showAccountDialog`, `_showChangePasswordDialog` (fullName, address, dob, displayName, old/new/confirm password) KHONG bao gio duoc `dispose()`. Moi lan mo dialog tao moi -> ro ri bo nho theo so lan mo. | Chuyen sang StatefulWidget rieng cho moi sheet va dispose controller, hoac dispose thu cong khi dong sheet. |
| identity_page.dart:688-695 | resource-leak | MEDIUM | O field "Ngay het han" tao `TextEditingController(...)` ngay trong `build()` — moi lan ve lai man hinh tao controller moi khong dispose. Ro ri va de sinh bug. | Khai bao controller o cap State + dispose; cap nhat text qua controller co san. |
| identity_page.dart:341-356 ; license_page.dart:380-395 | error-handling | HIGH | Buoc "cap nhat profile truoc khi gui ho so": neu updateProfile NEM LOI thi code `return` lang le (chi print). User da chon anh, bam Gui ho so, roi... khong co gi xay ra, khong thong bao loi. Im lang. | O nhanh catch: hien SnackBar loi ro rang ("Khong cap nhat duoc thong tin, vui long thu lai") thay vi return im. |
| identity_page.dart:341-356 ; license_page.dart:380-395 | error-handling | MEDIUM | updateProfile chi bat exception, KHONG kiem `responseCode` cua phan hoi. Neu server tra HTTP 200 nhung responseCode != "00"/"200" (cap nhat that bai mem) thi van di tiep gui ho so voi du lieu chua luu. | Kiem responseCode cua updateProfile truoc khi sang buoc gui ho so. |
| identity_page.dart:103,108,391-392 ; license_page.dart:113,117,431-432 | error-handling | MEDIUM | Tot: co kiem `responseCode == '00'` (dung cho xanh-service). Nhung khi `responseCode` KHAC '00' o luong tai (getIdentity/getLicense) thi chi `return` lang le, khong bao user (vd token het han se im). | Phan biet "chua co ho so" voi "loi/het phien"; truong hop loi thuc su nen bao user. |
| identity_page.dart:57-58 ; license_page.dart:66-67 | null-safety-crash | MEDIUM | `_loadUserProfile` doc `response.data['result']['data']` truy cap chuoi key truc tiep (khong `?.`). Neu `result` null se crash; dang trong try/catch nen bi nuot, profile khong load ma khong ai biet. | Dung truy cap an toan `response.data?['result']?['data']` + log/bao khi thieu. |
| identity_page.dart:366, 376 ; license_page.dart:406, 417 | input-validation | MEDIUM | Gui ho so voi `cardSerialNumber = '1234567890'` cung (gia tri gia/hardcode) cho moi user, ke ca khi chon "The cung". Du lieu so the gui len server la gia. | Cho user nhap so the that khi chon "The cung", hoac xac nhan voi BE truong nay co bat buoc khong. |
| account_page.dart:1240-1306 | async-race | LOW | Trong "Doi mat khau": dat `isChangingPassword = true` (hien loading) NGAY truoc cac buoc validate rong. Neu validate fail, phai set lai false o tung nhanh (da lam) — de quen, de ket loading. | Validate truoc, chi set loading=true sau khi qua het validate. |
| account_page.dart:1291-1292 | input-validation | LOW | Doi mat khau: chi kiem "moi == xac nhan" va khong rong, KHONG ap "nguyen tac mat khau" (8 ky tu, hoa/thuong/so/dac biet) du da hien huong dan tren UI. User co the dat mat khau yeu, doi server tu choi. | Validate do manh mat khau o client khop voi quy tac hien thi. |
| account_page.dart:795-802 | input-validation | LOW | Nut "Lien ket ngay" (lien ket email) chi la Text trang tri, khong co hanh dong gan vao -> bam khong lam gi. Gay hieu nham. | An nut hoac gan chuc nang lien ket email; neu chua lam thi khong hien. |
| forgot_password_page.dart:87-91 | logging-leak | LOW | Khi loi, hien thang `'Loi: $e'` len SnackBar cho user — lo chi tiet ky thuat (vd loi Dio, URL) ra giao dien nguoi dung. | Hien thong bao than thien ("Khong gui duoc yeu cau, thu lai"), log chi tiet rieng. |
| identity_page.dart:431, 473 ; license_page.dart:473 | logging-leak | LOW | Hien `'Loi: $e'` truc tiep len SnackBar — lo chi tiet ky thuat cho user. | Thong bao than thien; log $e rieng trong kDebugMode. |
| login_page.dart:130-179 | other | LOW | Ham `_handleGoogleLogin` con day du nhung nut Google da bi comment het (dong 454-530). Code va bien `_googleLoading`/`_googleAuthService` thanh code chet, gay nham lan. | Bo code chet hoac kich hoat lai nut Google. |
| auth_api.dart:1-85 | other | LOW | Toan bo file la code bi comment (mot AuthApi cu co interceptor in nguyen request/response body — neu mo lai se lo PII). Code chet. | Xoa file hoac dua vao lich su git; tuyet doi khong mo lai interceptor in body. |
| register_page.dart:13, otp_page.dart toan trang | other | LOW | `register_page.dart` nhan SDT nhung khong dung (nut deu chuyen sang dang ky email). `otp_page.dart` khong nhan/khong dung SDT thuc su tu API. Cac man co ve la khung chua noi day. | Lam ro luong: hoac noi API OTP/SDT, hoac go man thua de tranh hieu nham luong da chay. |
| account_service.dart:10-36 | error-handling | LOW (tot) | Logout: co goi API logout (boc try/catch, loi van xoa local), va XOA day du token + thong tin user khoi secure storage. Diem tot. Luu y nho: refreshToken lay tu storage co the rong "" van goi API — khong nguy hiem. | Khong bat buoc sua; co the bo qua goi API neu refreshToken rong. |
| login_page.dart:87-92, account_service.dart:11-24 | token-storage | LOW (tot) | Token/refresh token luu bang `flutter_secure_storage` (dung, khong phai SharedPreferences plaintext). Logout xoa sach. Diem tot. Luu y: comment dong 1315 ghi nham "from SharedPreferences" trong khi thuc te la secure storage. | Khong sua bao mat; chi sua comment/go print. |

---

## Tom tat theo muc do

- **CRITICAL (2):** OTP khong xac thuc voi server (otp_page) + Dat lai mat khau khong goi API nhung bao thanh cong (create_password_page). Hai luong xac thuc nay dang la "vo rong" — nguy hiem nhat.
- **HIGH (6):** doc `e.response.data[...]` khong guard de crash (login + email_register); luu accessToken khong kiem null van vao dashboard; print token ra log (doi mat khau); xoa tai khoan thieu try/catch -> ket loading; text "xoa tai khoan" hien nham "cap nhat thanh cong"; loi updateProfile truoc khi gui ho so bi nuot im.
- **MEDIUM:** nhieu print lo PII (CCCD/bang lai/ten/dob), thieu kiem `mounted` sau await trong dialog, ro ri TextEditingController trong cac bottom sheet, hardcode cardSerialNumber gia, thieu kiem responseCode mot so cho.
- **LOW:** thong bao loi ky thuat lo cho user, code chet (auth_api, Google login, register/otp khung), validate mat khau client chua khop quy tac, nut "Lien ket email" khong hoat dong.

## Diem tot ghi nhan
- Token luu bang `flutter_secure_storage` (khong plaintext), logout xoa sach token + user info.
- Da kiem `responseCode` dung convention: account/auth dung "200", identity/license (xanh-service) dung "00".
- Khong phat hien hardcode secret/API key/URL trong cac file module nay (URL/base do `core/api` xu ly).
- Cac controller chinh o cap State (login, email_register, forgot, otp, identity/license number) deu co dispose.
