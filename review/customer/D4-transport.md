# D4 — Review bao mat duong truyen (Transport Security / TLS / Cert Pinning)

App: **booking-car-app** (Flutter, app khach hang AMZ)
Pham vi quet: `lib/`, `android/`, `ios/`
Trong tam: transport-tls (HTTP cleartext, TLS, certificate pinning, cleartext config tren Android/iOS)

## Tom tat nhanh (cho lead)

Diem TOT da lam dung:
- Tat ca URL backend deu dung **HTTPS** (`https://api-portal.amzholdings.vn/...`). KHONG co URL `http://` (cleartext) nao trong code.
- Android da CHAN cleartext: file `network_security_config.xml` dat `cleartextTrafficPermitted="false"` cho toan app. Tot.
- iOS dung mac dinh an toan cua Apple (ATS bat, khong co `NSAllowsArbitraryLoads`). Tot.
- Co lam **certificate pinning** (ghim chung chi server) cho 2 luong API chinh.

Van de chinh (rui ro): certificate pinning bi **bo qua** o nhieu cho — luong lam moi token, luong fallback, va tat ca anh tai ve. Nghia la o nhung cho do, neu mang bi nguoi xau chen giua (gia mao chung chi), app van ket noi binh thuong va co the lam lo token dang nhap. Ngoai ra chi ghim **1 dau van tay duy nhat** — neu server doi chung chi (het han / gia han) ma app chua kip cap nhat thi **toan bo app khong vao mang duoc** (chet app voi nguoi dung).

## Bang chi tiet

| File:dong | Muc do | Van de | Cach sua |
|-----------|--------|--------|----------|
| lib/core/api/api_client.dart:239, 253, 269-272 | CRITICAL | Luong lam moi token (refresh) trong `_handleTokenError` tao moi `Dio()` "tran" (khong gan kiem tra chung chi). Khi gui refresh token va khi gui lai request cu kem `Bearer` token qua `cloneDio.fetch()`, ket noi nay **khong duoc ghim chung chi** → ke tan cong gia mao server co the bat duoc refresh token + access token. Day la luong xu ly token nhay cam nhat. | Dung lai dio da co interceptor pinning (vd `getAuthDio()`), hoac chen lai buoc `CertificatePinning.check()` truoc khi goi `dio.post(refreshToken...)` va truoc `cloneDio.fetch()`. Khong dung `Dio()` tran cho request mang token. |
| lib/core/api/api_client.dart:363, 377, 397-398 | CRITICAL | Lap lai y het loi tren trong `onError` (luong refresh khi gap 401). Tao `Dio()` tran + `cloneDio.fetch()` gui token qua ket noi khong ghim chung chi. | Nhu tren: tai su dung dio da pin hoac chen `CertificatePinning.check()` truoc moi request co token. |
| lib/core/api/api_client.dart:186-200 (`getDio` nhanh else) | HIGH | Ham `getDio` (danh dau deprecated) khi nhan baseUrl la la (khac auth/booking) tao Dio **chi co AuthInterceptor, KHONG co kiem tra chung chi**. Bat ky cho nao con goi nhanh nay deu mat lop bao ve pinning. | Bo han nhanh else nay (chi cho phep auth/booking dio da pin), hoac them buoc `CertificatePinning.check()` vao interceptor cua dio tao moi. Ra soat moi noi goi `getDio(...)`. |
| lib/core/utils/certificate_pinning.dart:5-7 | HIGH | Chi ghim **1 dau van tay (fingerprint) duy nhat**, khong co pin du phong (backup). Khi server gia han / doi chung chi TLS (dieu xay ra dinh ky), app cu se **khong vao mang duoc cho toan bo API** → loi diem (kha nang chet app voi nguoi dung dang dung ban cu). | Them it nhat 1 pin du phong (chung chi sap cap / chung chi cap trung gian CA). Ket hop quy trinh: cap nhat pin truoc khi doi cert server. Can canh bao team van hanh ve lich het han cert. |
| lib/core/utils/certificate_pinning.dart:9-23 | MEDIUM | `check()` thuc hien mot **request mang RIENG** (`HttpCertificatePinning.check`) trong moi `onRequest` cua moi API call → moi request that ra goi mang 2 lan (1 lan check, 1 lan that). Ton bang thong / cham, va khi mang yeu/timeout (60s) se chan toan bo API. | Can nhac chuyen sang ghim chung chi bang `IOHttpClientAdapter` + `badCertificateCallback` so khop SHA-256 (ghim ngay trong ket noi that, khong goi mang phu), hoac cache ket qua check theo host trong vong doi phien. |
| lib/core/utils/certificate_pinning.dart:20-22 | LOW | `catch (e) { return false; }` → fail-closed (an toan, chan khi nghi ngo) NHUNG nuot loi: khong phan biet "chung chi sai" voi "mat mang/timeout". Nguoi dung chi thay request fail chung chung. | Giu fail-closed nhung log/phan loai ly do (mat mang vs cert sai) de chan doan, va hien thong bao than thien khac nhau cho 2 truong hop. |
| lib/features/booking/presentation/pages/booking_detail_page.dart:251, 281 (S3: ...amazonaws.com); booking_history.dart:171; va cac `Image.network`/`NetworkImage`/`CachedNetworkImage` khac | MEDIUM | Anh tai qua `Image.network` / `NetworkImage` / `CachedNetworkImage` (api-portal/files va `xanh-api-images.s3.ap-southeast-1.amazonaws.com`) dung HttpClient mac dinh cua Flutter → **KHONG ap dung certificate pinning**. Van la HTTPS (Android base-config chan cleartext nen khong tut xuong http) nhung khong duoc ghim. Voi anh CCCD/GPLX (PII) thi anh co the bi xem trom neu chung chi bi gia mao. | Anh CCCD/GPLX nen tai qua tang API da pin (Dio) roi hien tu bytes, thay vi `Image.network` truc tiep. Voi anh quang cao/khong nhay cam thi chap nhan duoc. Toi thieu them domain S3 vao `domain-config` de chac chan khong cleartext. |
| android/app/src/main/res/xml/network_security_config.xml:4-6 | LOW | `domain-config` chi liet ke `api-portal.amzholdings.vn`. Domain anh S3 (`xanh-api-images.s3.ap-southeast-1.amazonaws.com`) khong nam trong domain-config (nhung da duoc `base-config cleartextTrafficPermitted="false"` bao ve nen van bi chan cleartext). Khong co `<pin-set>` (pinning o tang manifest) → pinning hoan toan phu thuoc code Dart. | Khong bat buoc. Neu muon pinning manh hon o tang he dieu hanh, them `<pin-set>` cho domain trong network_security_config (Android) cung voi backup pin. |
| ios/Runner/Info.plist (toan file) | LOW (xac nhan TOT) | Da kiem tra: **KHONG co** `NSAppTransportSecurity` / `NSAllowsArbitraryLoads`. iOS dung ATS mac dinh (chan cleartext, yeu cau TLS hop le). Khong co pinning o tang Info.plist nhung do code Dart dam nhan. | Khong can sua. Neu muon pinning tang he thong tren iOS, cau hinh ATS pinned domains — nhung uu tien sua pinning trong code Dart truoc. |
| lib/core/constants/app_strings.dart:5, 15-19 | LOW | `appName = 'Cash Flow Management'`, `baseUrl = 'https://api.cashflow.com/v1/'` — code rac tu template, KHONG dung that (app that doc URL tu `ApiEndpoints`). Khong gay lo cleartext (van https) nhung gay nham lan va co the bi dung nham. | Xoa cac hang sot lai cua template (`baseUrl`, `loginEndpoint`... trong app_strings.dart) de tranh dung nham mot URL khong phai he thong AMZ. |

## Ket luan transport-tls

- Cleartext HTTP: **DA CHAN dung** (Android config + iOS ATS mac dinh, khong co URL http trong code). Khong co loi cleartext.
- Certificate pinning: **CO LAM nhung CO LO HONG**. Hai luong lam moi token (CRITICAL) va nhanh fallback `getDio` (HIGH) gui token qua ket noi khong ghim chung chi. Anh PII tai khong qua kenh pin (MEDIUM).
- Tinh on dinh: chi 1 pin, khong backup → rui ro **chet app dien rong** khi server doi chung chi (HIGH). Can quy trinh van hanh + backup pin.

Uu tien sua: (1) hai cho CRITICAL trong api_client.dart luong refresh token, (2) backup pin, (3) nhanh `getDio` else.
