# Kiem chung fix nhom CRITICAL — App ADMIN (amz_xanh_admin_app)

**Nhanh kiem tra:** `release` (theo chi dinh cua lead)
**Ngay kiem chung:** 2026-06-08
**Source code:** `C:/Users/it/OneDrive/Desktop/Project/amz_xanh_admin_app/lib`

## Tong ket

- **FIXED:** 0 / 6
- **NOT_FIXED:** 6 / 6
- **Claim sai (outsource bao "Done" nhung thuc te chua sua):** 6 / 6

> CANH BAO LON: Toan bo claim "Done" cho CRIT-01..CRIT-06 trong file Response cua outsource KHONG KHOP voi code tren nhanh `release`.
> - KHONG co package `flutter_secure_storage` trong `pubspec.yaml` (kiem tra ca 6 nhanh: main, dev, release, lichxe, newfunction — deu khong co).
> - KHONG ton tai class `AdminApiResponse` / ham `parseXanhResponse()` nhu Response mo ta.
> - Lich su commit nhanh `release` khong co commit fix bao mat nao.
> => Cac ban va ma outsource mo ta hoac nam o codebase khac, hoac chua bao gio duoc commit vao repo nay. Tren nhanh `release` ma lead chi dinh, code van nguyen trang nhu report goc.

## Bang chi tiet

| ID | Tieu de | Claim (outsource) | Thuc te | Khop claim? | Bang chung (file:dong) | Ghi chu |
|----|---------|-------------------|---------|-------------|------------------------|---------|
| CRIT-01 | Mat khau admin luu plaintext | Done — khong luu password, dung secure storage | NOT_FIXED | `lib/core/services/storage_service.dart:116` van `_prefs.setString(_rememberMePasswordKey, password)`; ham `getRememberMePassword()` (dong 134) van tra ve gia tri tu SharedPreferences, khong tra null | KHONG | Van luu password thuc vao SharedPreferences (plaintext). Khong co flutter_secure_storage trong pubspec. Claim sai. |
| CRIT-02 | Token JWT luu khong ma hoa | Done — token cache tu FlutterSecureStorage | NOT_FIXED | `lib/core/services/storage_service.dart:36-37` van `_prefs.setString(_accessTokenKey/...refreshTokenKey)` | KHONG | Token van luu plaintext bang SharedPreferences. Khong he co FlutterSecureStorage. Claim sai. |
| CRIT-03 | Android cho phep HTTP cleartext | Done — usesCleartextTraffic="false" | NOT_FIXED | `android/app/src/main/AndroidManifest.xml:12` van `android:usesCleartextTraffic="true"` | KHONG | Gia tri van la "true", trai nguoc hoan toan claim. Claim sai. |
| CRIT-04 | Log credential (user+pass) ra console | Done — khong con debugPrint body login | NOT_FIXED | `lib/features/auth/services/auth_service.dart:33-35` van `debugPrint('Body: ${jsonEncode(requestBody)}')` (body chua password), khong co guard kDebugMode | KHONG | Van in nguyen body dang nhap (gom password) ra console, ca dong 51-52 in response. Claim sai. |
| CRIT-05 | 12/14 service admin khong check responseCode | Done — AdminApiResponse.parseXanhResponse() bat buoc responseCode=="00" | NOT_FIXED | `lib/features/bookings/services/booking_admin_service.dart:40` van `if (response.statusCode == 200) { return {'success': true, ...} }` khong check responseCode. Grep `responseCode` chi thay o auth_service + banner_service (von da dung); 12 service con lai van dung `statusCode == 200` | KHONG | Khong ton tai `AdminApiResponse`/`parseXanhResponse`. Root cause nghiep vu nghiem trong nhat van nguyen. Import trung `dart:convert` (dong 2 & 4) cung con (LOW-02). Claim sai. |
| CRIT-06 | UI bao "thanh cong" xanh khi BE tu choi | Done — chi show success khi result['success']==true, failure show banner do | NOT_FIXED | `lib/features/delivery_receive/widgets/delivery_dialog.dart:125-140` va `receive_dialog.dart:163-178`: van dung `if (result['success']==true){green}else{red}` | KHONG | Nhanh red/green nay la code CU da co tu truoc (report goc trich dong 125-132). Vi CRIT-05 chua sua, `_post` luon tra `success:true` khi HTTP 200 du BE tra responseCode "98" => banner xanh van hien khi BE tu choi. Khong them check `errorCode`. Phu thuoc CRIT-05 => thuc te van loi. Claim sai. |

## Ghi chu bo sung

- Mau tham chieu dung (`banner_service.dart`) va `auth_service.dart` (responseCode "200") van dung dan — nhung 2 file nay von DA dung tu truoc theo report goc, khong phai do outsource sua.
- `delivery_receive_service.dart` cung nam trong nhom 12 service van dung `statusCode == 200` (chua sua).
- De ket luan FIXED cho CRIT-05/06, can: ham `_post` chung doc `data['response']['responseCode']` va so sanh "00"; UI doc them `errorCode`/`message`. Hien tat ca chua co.
