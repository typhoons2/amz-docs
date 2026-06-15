# D3 — Ra soat lo lot du lieu qua log (logging-leak)

App: `booking-car-app` (Flutter, do outsource viet) — dung API he thong AMZ.
Concern: moi `print` / `debugPrint` / `log` lam lo **token**, **PII** (CCCD/GPLX/SDT/email/ten), hoac **body API nhay cam**.

## Ket luan tong quan (doc truoc)

- **Tin tot:** Gan nhu **toan bo** lenh log trong app deu duoc boc trong `if (kDebugMode) { ... }`. `kDebugMode` = `false` o ban release (ban dua len store / cho khach). Nghia la **o ban that su phat hanh, cac log nay KHONG chay** → token/PII khong bi in ra.
- **Tin xau / rui ro con lai:**
  1. **Noi dung bi in ra cuc ky nhay cam** (token dang nhap, ID token Google, ca cuc response chua refresh token, so CCCD/GPLX, ten + SDT khach, ca body API). Chi can ai do **xoa dong `if (kDebugMode)`**, hoac **gui ban debug/test cho khach/tester**, la token va PII se hien nguyen trong log dien thoai (logcat / Console) — bat ky app khac hoac nguoi cam may noi USB deu doc duoc.
  2. File `api_client.dart` co 1 cho dung `log()` (loai log khac, **mac dinh van in ca o ban release** neu khong co `kDebugMode` chan) — hien dang duoc `kDebugMode` chan, nhung viet kieu nay de gay nham va de "lot luoi" khi sua sau nay.
  3. Co **1 dong log bi bo quen, KHONG boc `kDebugMode`** → no in ca o ban release (noi dung dong nay vo hai, nhung chung to viec boc log khong dong nhat 100%).

> Khuyen nghi chung: thay tat ca `print`/`log` rai rac bang **1 ham log tap trung** tu dong tat o release VA tu dong an token/PII; cam in nguyen `Authorization`, `idToken`, `response.data`, so CCCD/GPLX.

## Bang chi tiet

| File:dong | Muc do | Van de | Cach sua |
|-----------|--------|--------|----------|
| lib/core/api/api_client.dart:62 | CRITICAL | In nguyen **token dang nhap** (`Authorization: Bearer ...`) cua moi request (authDio). Du dang boc `kDebugMode`, day la du lieu nguy hiem nhat — lo token = chiem tai khoan. | Khong bao gio in header Authorization. Neu can debug, chi in `"Authorization: present"`. |
| lib/core/api/api_client.dart:136 | CRITICAL | Giong tren, nhung cho bookingDio — in nguyen **token** moi request. | Nhu tren: bo han, hoac thay bang co `present/absent`. |
| lib/core/api/api_client.dart:59, 133 | HIGH | In nguyen **Request Body** moi request — body co the chua mat khau (doi mat khau), OTP, SDT, CCCD... | Khong in body, hoac chi in ten endpoint. Neu can, loc bo cac field nhay cam. |
| lib/core/api/api_client.dart:75 | HIGH | In nguyen **Response Body** (authDio) — chua accessToken/refreshToken khi login/refresh, va PII profile. | Khong in body response; chi in status code. |
| lib/core/api/api_client.dart:149 | HIGH | In nguyen **Response Body** (bookingDio) bang `log()` (dart:developer). Luu y: `log()` **khong tu tat o release** nhu `print()`; hien chi nho `kDebugMode` chan. Viet le loi (chen 1 `log` giua cac `print`) de gay nham, de lot. | Doi `log()` thanh dung 1 co che log thong nhat, va tuyet doi khong in body response. |
| lib/core/api/api_client.dart:90, 167 | HIGH | In nguyen body loi tra ve tu server (co the chua PII / chi tiet noi bo). | Chi in responseCode + message ngan, khong in `error.response.data`. |
| lib/core/api/api_service.dart:92 | CRITICAL | In **ID Token Google** (50 ky tu dau). Du cat bot, 50 ky tu dau token JWT van chua header+phan dau payload — khong nen lo. | Khong in token (ke ca 1 phan). |
| lib/core/api/api_service.dart:94 | HIGH | In nguyen `payload` login Google — ben trong co `idToken` day du + deviceId. | Khong in payload chua token. |
| lib/core/api/google_auth_service.dart:48 | CRITICAL | In **ID Token Google** (50 ky tu dau). | Bo han. |
| lib/core/api/google_auth_service.dart:70, 115 | HIGH | In nguyen **response login Google** (`responseData`) va `Full error` — chua accessToken/refreshToken/userId/SDT/ten. | Chi in responseCode; khong in ca cuc response. |
| lib/features/splash/presentation/pages/splash_page.dart:44 | CRITICAL | In **REFRESH TOKEN: $response** — `response` la ca cuc tra ve cua API refresh, chua **accessToken moi + refreshToken moi**. Lo refresh token = chiem phien dang nhap dai han. | Bo han dong nay. |
| lib/features/account/presentation/pages/account_page.dart:1315 | CRITICAL | In **token nguoi dung** doc tu storage (`DEBUG: Token from SharedPreferences: $token`). | Bo han; khong bao gio in token. |
| lib/features/account/presentation/pages/identity_page.dart:84, 120 | HIGH | In nguyen **response.data** va **Raw identity data** — chua **so CCCD/CMND**, ngay het han, anh giay to. | Khong in du lieu CCCD; neu can chi in "da tai duoc / loi". |
| lib/features/account/presentation/pages/identity_page.dart:135 | MEDIUM | In **so CCCD** (`Identity loaded: ...identityNumber`). | Bo, hoac che (vd chi 4 so cuoi). |
| lib/features/account/presentation/pages/identity_page.dart:305, 319 | MEDIUM | In **duong dan file anh CCCD** trong may (path local). | Bo; khong can in path anh giay to. |
| lib/features/account/presentation/pages/license_page.dart:93-94 | HIGH | In nguyen **response.data** GPLX — chua so giay phep lai xe + chi tiet. | Khong in body; chi in trang thai. |
| lib/features/account/presentation/pages/license_page.dart:153 | MEDIUM | In **so GPLX** (`License loaded: ...licenseNumber`). | Bo, hoac che. |
| lib/features/account/presentation/pages/license_page.dart:346, 360, 374 | MEDIUM | In **path file anh GPLX** va objectKey anh. | Bo. |
| lib/features/booking/presentation/pages/booking_confirm_page.dart:515 | HIGH | In **ten khach** (`customerName=${widget.name}`). PII. | Bo, hoac chi in carId. |
| lib/features/booking/presentation/pages/booking_confirm_page.dart:544, 584 | HIGH | In nguyen **response.data / DioException response** khi tao booking — chua thong tin don + co the PII. | Chi in responseCode + message. |
| lib/features/booking/presentation/pages/booking_info_page.dart:123, 231 | MEDIUM | In nguyen body API tinh gia + body loi. | Chi in status/responseCode. |
| lib/features/booking/presentation/widgets/booking_infos/booking_info_similar.dart:52, 113 | LOW | In nguyen body API "xe tuong tu" (khong co PII khach, nhung lo cau truc API). | Bo khi xong debug. |
| lib/features/auth/presentation/pages/forgot_password_page.dart:43-44 | HIGH | In nguyen **body response** quen mat khau — co the chua email / token reset. | Chi in status; khong in body. |
| lib/features/auth/presentation/pages/login_page.dart:120, 158 | MEDIUM | In nguyen exception khi login (co the loi tu DioException chua body/PII). | Chi in message ngan. |
| lib/core/services/s3_upload_service.dart:58-63 | LOW | In 1 phan presigned URL + objectKey anh giay to. Presigned URL co chu ky tam thoi (het han 10 phut) nhung van la link truy cap file. | Bo khi xong debug; khong in presigned URL. |
| lib/core/services/file_picker_fallback.dart:37 | LOW | In 100 ky tu dau presigned URL. | Bo. |
| lib/features/account/presentation/pages/account_page.dart:1703 | LOW | `print(...)` **KHONG boc `kDebugMode`** → in ca o ban release. Noi dung vo hai ("History card tapped"), nhung chung to viec boc log khong dong nhat → de co cho khac bi bo quen va lo that. | Boc `kDebugMode` hoac bo han; ra soat lai toan bo de bao dam khong con `print` tran o release. |
| lib/core/api/api_client.dart:281,285,310,406,410; api_service.dart:632; cac `print('Error ...: $e')` rai rac | LOW | In `$e` (exception) co the keo theo body/PII tu DioException trong mot so truong hop. Da boc `kDebugMode`. | Khi log loi chi nen in `e.type`/message, tranh in nguyen object loi. |

## Ghi chu ky thuat cho rv-be

- `print()` trong Flutter: o **release** bi framework bo qua (khong xuat). `debugPrint()` tuong tu. `log()` (dart:developer): **van xuat o release** tru khi tu chan → day la diem can sua o `api_client.dart:149`.
- Toan bo log nhay cam hien **dua hoan toan vao `kDebugMode`** lam "lan chan". Day la mitigation hop le cho release, nhung **khong boc PII/token o tang ung dung** → rui ro nguoi bao tri xoa nham guard, hoac phat ban debug cho tester/khach. Vi vay van xep nhieu cho la CRITICAL/HIGH theo **gia tri du lieu bi in**, du dang co guard.
- De xuat: tao `AppLogger` tap trung (1) tu tat o release, (2) tu redact `Authorization`, `idToken`, `accessToken`, `refreshToken`, `identityNumber`, `licenseNumber`, `password`, `otp` truoc khi in.
