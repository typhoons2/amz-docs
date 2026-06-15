# D1 — Ra soat HARDCODE SECRET / KEY / TOKEN / URL (booking-car-app)

> Pham vi: quet xuyen suot toan app — `booking-car-app/lib`, `booking-car-app/android`, `booking-car-app/ios`.
> Tap trung: bi mat (secrets). Tieng Viet, mo ta de hieu cho lead.

## Ket luan nhanh

- **KHONG** tim thay API key / mat khau / token that su bi nhung cung trong code (khong co Google API key `AIza...`, khong co AWS key `AKIA...`, khong co `client_secret`, khong co token JWT cung).
- Cac gia tri nhay cam dung (Google Client ID, dia chi server auth/booking) deu lay tu **bien moi truong luc build** (`String.fromEnvironment`) — dung cach.
- `.gitignore` da loai dung cac file bi mat: `google-services.json`, `GoogleService-Info.plist`, `client_secret*.json`. Trong repo cung khong co cac file nay.
- Con vai cho **hardcode dia chi (URL)** trong code thay vi doc tu cau hinh — khong phai bi mat nhung de gay nham va kho doi server.

## Bang chi tiet

| File:dong | Muc do | Van de | Cach sua |
|---|---|---|---|
| `lib/core/constants/app_strings.dart:15` | LOW | Dia chi server la `https://api.cashflow.com/v1/` — la rac sot lai tu template app "Cash Flow Management" (cung ten app `appName = 'Cash Flow Management'`, `version` o dong 5-6). Day KHONG phai server AMZ, gay nham lan, va lo ra app duoc dung lai tu mau khac. Khong phai bi mat. | Xoa cac hang `baseUrl`, `loginEndpoint`, `registerEndpoint`, `transactionsEndpoint`, `categoriesEndpoint` neu khong dung; sua `appName`/`appVersion` cho dung ten app AMAZING. Server that nam o `api_endpoints.dart`. |
| `lib/core/utils/certificate_pinning.dart:5-7` | MEDIUM | Dau van tay chung chi (SHA-256 fingerprint) cua server bi nhung cung trong code. Day KHONG phai bi mat (van tay la cong khai), nhung neu server doi chung chi (vi du het han) ma quen cap nhat dong nay thi **toan bo app se khong goi duoc API** (moi request bi tu choi). Chi co 1 van tay, khong co van tay du phong (backup pin). | Them van tay du phong (backup pin) cho chung chi sap cap; ly tuong la doc tu cau hinh build thay vi hardcode; ghi chu lich het han chung chi de team chu dong cap nhat truoc. |
| `lib/features/booking/presentation/pages/booking_detail_page.dart:244,280` | LOW | Hardcode thang dia chi `https://api-portal.amzholdings.vn/api/v1/xanh/files/...` va `https://xanh-api-images.s3.ap-southeast-1.amazonaws.com/...` ngay trong man hinh, thay vi dung hang config chung. Khong phai bi mat (bucket S3 chi la ten public). Rui ro: doi domain/bucket phai sua nhieu cho, de sot. | Tap trung dia chi vao 1 noi (vi du `ApiEndpoints`) roi tham chieu; khong rai URL trong man hinh. |
| `lib/features/booking/presentation/widgets/booking_history.dart:138,170` | LOW | Tuong tu tren — hardcode URL file server va bucket S3 trong widget. | Nhu tren: dua ve config chung. |
| `lib/features/auth/data/remote/auth_api.dart:13` | LOW | URL server auth nam trong **comment code cu** (code da bi comment, khong chay). Khong gay hai nhung lam nhieu va lo cau truc server. | Xoa khoi comment cho gon. |

## Cac diem TOT (xac nhan dung)

- `lib/core/api/api_endpoints.dart:4-11` — `AUTH_BASE_URL` va `BOOKING_BASE_URL` lay qua `String.fromEnvironment(...)`, chi co default tro toi server AMZ that. Dung cach (cho phep doi server khi build ma khong sua code).
- `lib/core/api/google_auth_service.dart:11` — `GOOGLE_CLIENT_ID` lay qua `String.fromEnvironment('GOOGLE_CLIENT_ID')`, KHONG nhung cung trong code. Dung.
- `android/app/src/main/AndroidManifest.xml` — khong co API key Google Maps / key nao nhung cung; chi tham chieu `google_play_services_version` (binh thuong).
- `ios/Runner/Info.plist` — khong co API key; chi co mo ta quyen camera/thu vien anh.
- `android/app/build.gradle.kts:38` — release dang ky bang **debug keystore** (`signingConfigs.getByName("debug")`). Day la van de **ky ung dung khi phat hanh**, khong phai lo bi mat trong source — ghi chu de team cau hinh keystore release rieng truoc khi len store (khong thuoc pham vi secrets nhung lien quan).
- `.gitignore:50-52` — loai dung `client_secret*.json`, `google-services.json`, `GoogleService-Info.plist`.

## Pham vi da quet

- Toan bo `booking-car-app/lib/**/*.dart` (grep tu khoa: key/secret/password/token/bearer/authorization/aws/s3/credential + cac mau key dac trung `AIza`, `AKIA`, `sk_live`, `eyJ...`, `-----BEGIN`, `*.googleusercontent.com`).
- `booking-car-app/android/**` (manifest, gradle, network_security_config, styles, gradle.properties).
- `booking-car-app/ios/**` (Info.plist, xcconfig).
- Tai lieu kem theo: `AVATAR_UPLOAD_GUIDE.md`, `KYC_TROUBLESHOOTING.md` — khong lo credential.

So file da xem ky: 15.
