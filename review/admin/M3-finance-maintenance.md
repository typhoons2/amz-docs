# Review M3 — Finance & Maintenance (Admin Flutter)

> Ban code SAU FIX (commit 3e6d332, 07/06/2026). Danh gia KHACH QUAN theo code thuc te — KHONG gia dinh loi cu con.
> So file .dart da doc that su: **18 / 18**

## Pham vi
Finance (9): enums/transaction_type.dart, models/transaction.dart, models/transaction_category.dart, screens/financial_management_screen.dart, screens/transaction_create_screen.dart, services/financial_management_service.dart, widgets/transaction_detail_widget.dart, widgets/transaction_filter_widget.dart, widgets/transaction_widget.dart
Maintenance (9): enums/maintenance_status.dart, models/maintenance.dart, screens/maintenance_create_screen.dart, screens/maintenance_management_screen.dart, screens/maintenance_update_screen.dart, services/maintenance_management_service.dart, widgets/maintenance_detail_widget.dart, widgets/maintenance_filter_widget.dart, widgets/maintenance_widget.dart

> Tham chieu ngoai module: `core/services/admin_api_response.dart` (da doc de xac minh viec kiem responseCode).

## Cac loi CU da duoc FIX (xac nhan tren ban moi)
- **responseCode "00"**: CA HAI service dung `AdminApiResponse.parseXanhResponse()` -> ham nay kiem `response.responseCode == '00'`, xu ly HTTP status, FormatException, 401/403 het phien. Service chi coi thanh cong khi `parsed['success'] == true`. -> Loi cu "chi kiem HTTP 200, bo qua responseCode" KHONG con.
- **totalItems = totalPages**: `addOther` o ca transaction.dart va maintenance.dart nay gan dung `totalItems = ...totalItems`. -> Da fix.
- **Kiem mounted sau await trong dialog xoa**: financial_management_screen.dart:376-377 va maintenance_management_screen.dart:329-330 da co `if (!context.mounted) return; if (!mounted) return;`. -> Da fix.
- **Parse JSON khong guard**: model dung `_asMap/_asList/_asInt/_asString/_asDate/_asBool` co guard kieu, khong con force-unwrap `!` nguy hiem khi parse.
- **Bao mat**: khong hardcode secret/URL; token lay tu `StorageService.getAccessToken()`; moi request co header `Authorization: Bearer`; dung `SecureHttpClient`; khong print/log token/PII/body. `log($e)` chi log object exception (rui ro thap).

## Bang van de CON LAI / MOI

| File:dong | Loai | Muc do | Van de | Cach sua |
|-----------|------|--------|--------|----------|
| financial_management_screen.dart:20-23 | resource-leak | HIGH | Khong co `dispose()` override. `_searchController`, `_deleteReasonController`, `_scrollController` khong bao gio dispose -> ro bo nho moi lan mo/dong man hinh | Them `@override void dispose() { _searchController.dispose(); _deleteReasonController.dispose(); _scrollController.dispose(); super.dispose(); }` |
| financial_management_screen.dart:73-78 | async-race | HIGH | `_scrollController.addListener(...)` nam TRONG `_fetchInitialData()` -> goi lai moi lan doi filter/chip/loc -> dang ky listener chong chat -> `_loadMore` ban nhieu lan, goi API trung, nhay trang sai | Dang ky listener 1 lan duy nhat trong `initState`; hoac `removeListener` truoc khi add |
| financial_management_screen.dart:386-388 | async-race | MEDIUM | `setState(() { _fetchInitialData(); })` — goi ham async ben trong callback setState (phai dong bo); Future bi fire-and-forget | Goi `_fetchInitialData();` ngoai setState (ham tu setState ben trong) |
| financial_management_screen.dart:368-388 | error-handling | MEDIUM | Sau khi xoa khong clear `_deleteReasonController` -> mo dialog xoa phieu khac van con ly do cu | `_deleteReasonController.clear()` sau khi xoa / khi mo dialog |
| financial_management_screen.dart:101-104 | error-handling | LOW | Khi fetch tra null (loi mang/API) FutureBuilder ve `SizedBox()` trong, KHONG bao loi -> user tuong man hinh rong | Hien thong bao loi + nut "Thu lai" thay vi SizedBox rong |
| financial_management_service.dart:101-103 | error-handling | LOW | `fetchTransactions` catch nuot loi tra null, KHONG `log()` (khac cac ham khac trong file co log) -> kho debug | Them `log("Fetch transactions error: $e")` cho dong bo |
| financial_management_service.dart:143-152, 171-180 | error-handling | LOW | `createTransaction` / `deleteTransaction` catch nuot loi tra false, khong log | Them `log(...)` trong catch |
| financial_management_service.dart:18 | input-validation | LOW | `queryParameters = {"type": type?.toString()}` — khi `type` null se gui key `type=null` | Chi them key `type` khi `type != null` |
| transaction_create_screen.dart:54-56 | resource-leak | HIGH | `_moneyController`, `_noteController`, `_otherController` khong dispose (khong co `dispose()`) | Them `dispose()` cho ca 3 controller |
| transaction_create_screen.dart:310-312 | error-handling | MEDIUM | `_validate()` catch nuot moi loi tra `false` -> loi parse/upload/API deu hien chung "that bai", khong phan biet, khong log | Log `e`; phan biet loi nhap lieu vs loi he thong |
| transaction_create_screen.dart:283,286-287 | other | LOW | `final String? targetId = null;`/`bookingId = null`/`carId = null` — bien hang gan null vo nghia (code thua) | Bo bien thua, truyen null truc tiep vao service |
| transaction.dart:80,111 | null-safety-crash | LOW | `amount` parse `_asInt` (int) trong khi `createTransaction` gui `double amount` -> tien le se bi cat phan thap phan khi hien thi lai | Cho `amount` dung `num?`/`double?` neu tien co phan le |
| transaction.dart:34-44 / maintenance.dart:34-44 | other | LOW | `addOther` mutate `items` truc tiep (`items?.addAll(...)`) — vi pham immutability (coding-style), khong gay crash trong single-thread Flutter | Tao list moi thay vi mutate |
| transaction_widget.dart:122 | error-handling | LOW | `if (transaction.note != "--")` so sanh magic string "--" cung; neu note that su la "--" hop le se bi an | Dung `note != null && note!.isNotEmpty` |
| maintenance_management_screen.dart:22-23 | resource-leak | HIGH | Khong co `dispose()`. `_searchController`, `_scrollController` khong dispose | Them `dispose()` cho ca 2 |
| maintenance_management_screen.dart:69-74 | async-race | HIGH | Giong finance: `_scrollController.addListener` nam trong `_fetchInitialData()` -> listener trung lap -> `_loadMore` ban nhieu lan | Dang ky listener 1 lan trong `initState` |
| maintenance_management_screen.dart:339-341 | async-race | MEDIUM | `setState(() { _fetchInitialData(); })` — goi async trong setState | Goi `_fetchInitialData();` ngoai setState |
| maintenance_management_screen.dart:99-101 | error-handling | LOW | Fetch tra null -> ve `SizedBox()` trong, khong bao loi | Hien trang thai loi + nut thu lai |
| maintenance_create_screen.dart:51-54 | resource-leak | HIGH | `_kmController`, `_newPartnerController`, `_moneyController`, `_noteController` khong dispose | Them `dispose()` cho ca 4 |
| maintenance_create_screen.dart:413-417 | input-validation | MEDIUM | Logic validate doi tac if/else long sai: `if (!_isNewPartner && partnerId == null) return null; else if (partnerName.isEmpty) return null;`. Khi `_isNewPartner=false` VA da chon doi tac (partnerId != null) thi nhanh `else if` (kiem ten rong) khong chay; nhanh dau/sau de bo sot truong hop | Tach 2 dieu kien doc lap: `if (_isNewPartner) { if (partnerName.isEmpty) return null; } else { if (partnerId == null) return null; }` |
| maintenance_create_screen.dart:425-426 | error-handling | MEDIUM | `ImageService.uploadImages(...)` await; neu upload anh that bai (throw/tra rong) bi catch ngoai nuot thanh `false`, user khong biet anh loi hay API loi -> co the tao phieu voi list anh sai/rong | Bat rieng loi upload, bao "Tai anh that bai" va dung luong |
| maintenance_create_screen.dart:441-443 | error-handling | MEDIUM | `catch (e) return false` nuot toan bo loi, khong log | Log `e`, phan biet loi |
| maintenance_create_screen.dart:392-393 | input-validation | LOW | `int.tryParse(...replaceAll(RegExp(r'[^0-9]'),''))` co guard `currentKm == null` (OK) nhung khong chan km am/qua lon | Them gioi han hop ly cho km |
| maintenance_update_screen.dart:58-61 | resource-leak | HIGH | 4 controller (`_kmController`, `_newPartnerController`, `_moneyController`, `_noteController`) khong dispose | Them `dispose()` cho ca 4 |
| maintenance_update_screen.dart:87-95 | async-race | MEDIUM | `_loadInitialData` await nhieu API + `_initData` (con `fetchCarDetail`) roi `setState` (line 92) ma KHONG kiem `mounted` -> setState after dispose neu user thoat giua chung | Them `if (!mounted) return;` truoc `setState` |
| maintenance_update_screen.dart:88-89,104-105 | input-validation | MEDIUM | KHONG goi `fetchMaintenancePartners()` (khac create) -> `_maintenancePartners` luon null; dropdown "Doi tac/Gara" o man hinh cap nhat se RONG, khong doi duoc doi tac cu da chon | Goi `fetchMaintenancePartners()` trong `_loadInitialData` cua update |
| maintenance_update_screen.dart:440-444 | input-validation | MEDIUM | Lap lai bug logic if/else validate doi tac nhu create:413-417 | Tach 2 dieu kien doc lap |
| maintenance_update_screen.dart:113 | input-validation | LOW | `_imageUrls = _maintenance.images` — dung `images` (ten file) thay vi `imageUrls` (URL day du) de hien anh -> co the khong tai duoc anh | Dung `_maintenance.imageUrls` de hien anh |
| maintenance_update_screen.dart:378-414 | error-handling | LOW | Khac create (pop sau khi snackbar dong), update sau khi thanh cong KHONG `Navigator.pop` -> o lai man hinh, danh sach khong refresh, hanh vi khong nhat quan | Sau update thanh cong nen pop ve danh sach + refresh |
| maintenance_update_screen.dart:56,82 | null-safety-crash | LOW | `late final Maintenance _maintenance` gan trong initState — an toan nhung dung `late` khong can thiet | Co the bo `late` (khong bat buoc) |

## Tom tat theo muc do
- **CRITICAL: 0.** Khong con loi bao mat hay sai du lieu nghiem trong. Cac loi cu (plaintext, log token, cleartext, responseCode, totalItems sai, thieu mounted) deu da fix tren ban moi.
- **HIGH (lap lai o moi man hinh):**
  1. **Thieu `dispose()` controller** o ca 6 StatefulWidget (4 form create/update + 2 management) -> ro bo nho.
  2. **Add scroll-listener trung lap** o 2 management screen (listener dat trong ham fetch goi lai nhieu lan) -> `_loadMore` ban thua, goi API trung, nhay trang.
- **MEDIUM:** logic validate doi tac maintenance (create:413-417 & update:440-444) de bo sot; nuot loi upload anh khong chan luong; `setState` boc ham async; update screen thieu fetch danh sach doi tac + thieu kiem `mounted` + khong pop sau khi luu.
- **LOW:** magic string "--", bien gan null thua, amount int mat phan le, immutability, query param null, khong bao loi khi fetch null.

**Diem he thong:** Hai cap loi HIGH (dispose + listener trung lap) lap y het o moi man hinh -> nen sua dong loat: tao base StatefulWidget co `dispose()` chuan, va chuyen `addListener` ra initState (goi 1 lan).
