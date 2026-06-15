# Kiem chung fix — Admin app — Nhom MEDIUM + LOW

Pham vi: app ADMIN (`amz_xanh_admin_app`), nhanh **release** (nhanh hien dang checkout, theo chi dinh lead).
Ngay kiem chung: 2026-06-08.

## Tong ket

- **FIXED: 0 / 14**
- **PARTIAL: 0**
- **NOT_FIXED: 12** (MED-01..MED-08, MED-10, LOW-02, LOW-03, LOW-04)
- **NEEDS_AMZ: 1** (MED-09 — outsource khai bao trung thuc "Need AMZ/BE")
- **CANT_VERIFY / Open dung thuc te: 1** (LOW-01 — outsource khai "Open", khop)
- **Claim sai (claimMismatch): 11** (cac ID outsource khai "Done" nhung code that su CHUA SUA)

> CANH BAO QUAN TRONG: Nhanh `release` (va tat ca nhanh khac: main/dev/lichxe/newfunction) KHONG chua bat ky commit remediation nao. `git log` dung lai o "Fix build release", khong co thay doi nao khop voi "Remediation Response Report" cua outsource. Cac bang chung ho dua ra (secure storage, strict mode, build_release.sh, ApiConfig, uuid, applicationId moi...) KHONG TON TAI trong repo. Report phan hoi cua outsource phan lon la **khai khong dung voi code thuc te tren cac nhanh hien co**.

## Bang chi tiet

| ID | Tieu de | Claim | Thuc te | Khop claim? | Bang chung | Ghi chu |
|----|---------|-------|---------|-------------|------------|---------|
| MED-01 | Application ID con placeholder com.example.* | Done — doi sang vn.amzholdings.xanh.admin | NOT_FIXED | KHONG | android/app/build.gradle:9,24 van `com.example.amz_xanh_admin_app` | Kiem ca 5 nhanh deu con com.example. Claim sai |
| MED-02 | iOS thieu khai bao App Transport Security | Done — Info.plist co NSAppTransportSecurity=false | NOT_FIXED | KHONG | ios/Runner/Info.plist (toan file) khong co key NSAppTransportSecurity | Claim sai |
| MED-03 | Release build khong bat code obfuscation | Done — scripts/build_release.sh bat --obfuscate/--split-debug-info | NOT_FIXED | KHONG | Khong ton tai file build_release.sh; khong co tu khoa `obfuscate` trong repo | Thu muc scripts/ khong ton tai. Claim sai |
| MED-04 | print() trong production code | Done — lib khong con print(); debugPrint nam trong kDebugMode | NOT_FIXED | KHONG | storage_service.dart:45,84,124,156 + station_create_screen.dart:259,260 (`print(city); print(cityId);`) — tong 6 print() | Claim sai |
| MED-05 | requestTime sai timezone, lech 2 service | Done — dung AppUtils.generateRequestTime() chung | NOT_FIXED | KHONG | booking_admin_service.dart:19 `DateTime.now().toIso8601String()` vs auth_service.dart:20 `now.toUtc().add(Duration(hours:7))`; helper AppUtils ton tai nhung service KHONG goi | Helper co san nhung khong duoc dung → van lech. Claim sai |
| MED-06 | Dashboard hien so lieu gia | Partial — bo so fake, hien placeholder/empty | NOT_FIXED | KHONG | dashboard_screen.dart:79 `'1,234'`, :99 `'₫245M'`, :84 `'48'`, :93 `'56'`; khong co API call | So lieu hardcode nguyen ven. Claim sai |
| MED-07 | Static analysis yeu — thieu strict mode | Done — bat strict-casts/inference/raw-types | NOT_FIXED | KHONG | analysis_options.yaml chi co `include: package:flutter_lints/flutter.yaml`, khong co block `analyzer: language: strict-*` | Claim sai |
| MED-08 | Bottom navigation mapping de vo | Done — model/test giu mapping coherent | NOT_FIXED | KHONG | main_layout.dart:450-458 ternary long + so hardcode; :464-469 switch hardcode index, khong dung enum | Van hardcode/de vo. Claim sai |
| MED-09 | Banner/News endpoint Enoch Tech chua verify format | Need AMZ/BE | NEEDS_AMZ | CO | news_service.dart:31-43 chi check statusCode==200, khong co guard responseCode | Outsource khai trung thuc "Need AMZ/BE"; thuc te news_service van chua co guard, phu thuoc AMZ xac nhan format |
| MED-10 | _post() khong catch SocketException rieng | Done — shared parser co SocketException handling | NOT_FIXED | KHONG | booking_admin_service.dart:51-56 chi `catch (e)` chung, khong `on SocketException`; khong co AdminApiResponse.networkFailure() trong repo | Claim sai |
| LOW-01 | Khong gioi han so lan dang nhap sai phia client | Open | NOT_FIXED | CO | login_screen.dart khong co lockout/attempt/countdown | Outsource khai "Open" — khop thuc te |
| LOW-02 | Import trung lap trong BookingAdminService | Done — khong con import dart:convert trung | NOT_FIXED | KHONG | booking_admin_service.dart:1 va :4 deu `import 'dart:convert';` | Van trung. Claim sai |
| LOW-03 | _generateRequestId khong unique | Done — dung microseconds + counter + random, test 100 ids | NOT_FIXED | KHONG | app_utils.dart:8-11 va auth_service.dart:166-169 van `millisecondsSinceEpoch + microsecond % 1000`; pubspec khong co uuid | Pattern non-unique nguyen ven. Claim sai |
| LOW-04 | Hardcoded URL base | Done — tap trung trong ApiConfig + ho tro --dart-define | NOT_FIXED | KHONG | api.dart:3 van hardcode `https://api-portal.amzholdings.vn/api/v1`; khong co class ApiConfig, khong co String.fromEnvironment | Claim sai |

## Ket luan

12/14 finding van NGUYEN trang (chua sua). Chi MED-09 (Need AMZ) va LOW-01 (Open) la outsource khai dung. 11 finding outsource ghi "Done"/"Partial" deu KHONG khop code thuc te tren nhanh release — day la khai sai hang loat. Nhieu kha nang cac fix duoc lam o repo/branch khac chua merge ve, hoac report phan hoi khong duoc verify lai tren source ban giao.
