# Kiem chung fix outsource — amz_xanh_admin_app (nhom MED + LOW)

- Ban code: commit `3e6d332` "fix: add device info privacy manifest" (HEAD that su cua release).
- Pham vi: MED-01..MED-10 + LOW-01..LOW-04.
- Ngay kiem chung: 08/06/2026.

## Tong ket

- FIXED: 12
- PARTIAL: 1 (MED-06)
- NOT_FIXED: 0
- NEEDS_AMZ: 1 (MED-09)

> Ghi chu: LOW-01 outsource khai "Open" nhung THUC TE da implement day du (claim under-report). MED-06 dung claim "Partial". MED-09 dung claim "Need AMZ/BE".

## Bang chi tiet

| ID | Tieu de | Claim | Thuc te | Khop? | Bang chung | Ghi chu |
|----|---------|-------|---------|-------|-----------|---------|
| MED-01 | Application ID placeholder com.example.* | Done | FIXED | Co | android/app/build.gradle:9,23 `namespace`/`applicationId = "vn.amzholdings.xanh.admin"` | Doi sang namespace AMZ dung de xuat |
| MED-02 | iOS thieu khai bao App Transport Security | Done | FIXED | Co | ios/Runner/Info.plist:5-9 `NSAppTransportSecurity` + `NSAllowsArbitraryLoads=false` | Khai bao tuong minh chan HTTP |
| MED-03 | Release build khong bat code obfuscation | Done | FIXED | Co | scripts/build_release.sh:42,45,48 `--obfuscate --split-debug-info` cho apk/appbundle/ipa | Da co script build chuan |
| MED-04 | print() trong production code | Done | FIXED | Co | grep `print(` trong lib/ = 0 ket qua; station_create_screen het print(city/cityId); debugPrint con lai deu trong `if (kDebugMode)` o error path (storage_service.dart:63,107,148,180,199) | Sach print, debugPrint co guard |
| MED-05 | requestTime sai timezone (auth vs booking lech) | Done | FIXED | Co | app_utils.dart:20-22 `generateRequestTime()` chung; auth_service.dart:17,96 va booking_admin_service.dart:28 deu goi helper nay | Da thong nhat 1 helper, het lech format |
| MED-06 | Dashboard hien so lieu gia — khong goi API that | Partial | PARTIAL | Co | dashboard_screen.dart: het '1,234'/'VND 245M'; stat card hien '-' (dong 137), empty panel "Chua co du lieu" (dong 195); chua co API call that | Da bo so gia nhung chua noi API thong ke — dung claim Partial, can AMZ cung cap endpoint |
| MED-07 | Static analysis yeu — thieu strict mode | Done | FIXED | Co | analysis_options.yaml:12-16 bat `strict-casts`, `strict-inference`, `strict-raw-types` | Da bat strict mode day du |
| MED-08 | Bottom navigation mapping de vo | Done | FIXED | Co | main_layout.dart:437-465 dung `AdminNavigation.bottomNavIndexes`; model admin_navigation_item.dart:131-136 sinh index tu co `showInBottomNav`, khong con if-else 4 tang hardcode | Mapping coherent theo model |
| MED-09 | Banner/News endpoint Enoch Tech chua verify format | Need AMZ/BE | NEEDS_AMZ | Co | banner_service.dart va news_service.dart dung `AdminApiResponse.parseXanhResponse` (guard responseCode "00" + FormatException + type guard + SocketException). Code da co guard parse | Code-side da xu ly guard; format production gateway Enoch Tech van can AMZ/BE xac nhan — dung claim |
| MED-10 | _post() khong catch SocketException rieng | Done | FIXED | Co | admin_api_response.dart:14-20 `networkFailure()` message than thien; booking_admin_service.dart:50-51, news_service.dart:35,101..., banner_service.dart:77,153... deu `on SocketException` rieng | Da tach SocketException, message tieng Viet de hieu |
| LOW-01 | Khong gioi han so lan dang nhap sai phia client | Open | FIXED | KHONG (code tot hon claim) | login_screen.dart:27-31 (`_failedLoginAttempts`, `_lockedUntil`, `_isLoginLocked`), :89 guard chan submit, :171-178 lock 30s sau 5 lan sai, :452 disable nut khi lock | Outsource khai "Open" nhung THUC TE da lam day du lockout 30s/5 lan — claim under-report |
| LOW-02 | Import trung lap trong BookingAdminService | Done | FIXED | Co | booking_admin_service.dart: `import 'dart:convert'` chi con 1 lan (dong 1) | Da xoa import trung |
| LOW-03 | _generateRequestId khong unique | Done | FIXED | Co | app_utils.dart:13-18 `generateRequestId()` = microsecondsSinceEpoch + counter (0xFFFFFF) + Random.secure() hex | Du manh chong trung double-tap |
| LOW-04 | Hardcoded URL base | Done | FIXED | Co | api_config.dart:1-18 `ApiConfig` voi `String.fromEnvironment` (AMZ_PORTAL_BASE_URL/AMZ_API_BASE_URL/AMZ_IMAGE_BASE_URL); api.dart:6 `amzHoldings = ApiConfig.apiBaseUrl` | URL tap trung + ho tro --dart-define |
