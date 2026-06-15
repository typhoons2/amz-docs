# Review M5 — delivery-schedule-dash (code SAU FIX, commit 3e6d332)

So file da doc: 12

Pham vi:
- lib/features/delivery_receive (4 file)
- lib/features/car_schedule (3 file)
- lib/features/dashboard (5 file)

Tham chieu chung: `lib/core/services/admin_api_response.dart` da check dung `responseCode == "00"` va xu ly 401/403 (session expired). Logout (main_layout + sidebar) co goi `StorageService.logout()` xoa token local du backend loi -> OK.

## Loi CU da HET tren ban moi (xac nhan theo code thuc te)

- Anh dummy `dummy-image-url`: HET. `receive_dialog.dart` nay dung `ImageService.pickImages()` + `ImageService.uploadImages()` that (dong 118-148), submit chan neu chua co anh that (dong 158-163).
- Khong kiem responseCode: HET. Cac service (`delivery_receive_service`, `car_schedule_service`) deu goi `AdminApiResponse.parseXanhResponse` -> check `responseCode == "00"` dung.
- Logout khong xoa token khi API fail: HET. `main_layout`/`sidebar_desktop` luon goi `StorageService.logout()` sau `AuthService.logout` bat ke ket qua.
- Hardcode secret/key/token: KHONG thay trong 12 file M5.
- `print`/`debugPrint` lo token/PII/body: KHONG thay trong 12 file M5.
- Dashboard so lieu bia: ban moi `dashboard_screen.dart` hien "-" / "Chua co du lieu" (khong con bia 1.234/245M/ten gia).

## Bang phat hien (loi CON LAI tren ban moi)

| File:dong | Loai | Muc do | Van de | Cach sua |
|-----------|------|--------|--------|----------|
| car_schedule/screens/booking_contract_update_screen.dart:261-274 | error-handling | HIGH | `_submit()` GIA: chi `await Future.delayed(300ms)` roi bao "Da cap nhat tren giao dien. API cap nhat khach se noi o buoc tiep theo" + `Navigator.pop(context,true)`. KHONG goi API nao. Nhan vien sua hop dong (dich vu/giam gia/coc/dia chi giao-nhan/phi/ghi chu) bam CAP NHAT tuong da luu nhung du lieu MAT HOAN TOAN. | Noi API cap nhat that, kiem responseCode "00", chi pop(true) khi luu thanh cong. Truoc khi noi xong nen an nut hoac ghi ro "chua luu duoc". |
| delivery_receive/widgets/delivery_dialog.dart:340-341 | null-safety-crash | HIGH | `DateTime.parse(_asString(summary['startTime'])!)` va `endTime` — force-unwrap `!` + `DateTime.parse` khong try/catch trong build(). Neu startTime/endTime sai dinh dang (khong ISO, chuoi rong) -> nem FormatException lam vo dialog giao xe, man hinh trang. | Dung `DateTime.tryParse(...)` + kiem null truoc khi `format`; chi hien dong thoi gian khi parse thanh cong. |
| delivery_receive/widgets/receive_dialog.dart:306-307 | null-safety-crash | HIGH | Y het tren: `DateTime.parse(_asString(summary['startTime'])!)` / `endTime` force-unwrap + parse khong guard trong build() -> vo dialog nhan xe. | Dung `DateTime.tryParse` + guard null. |
| car_schedule/screens/car_schedule_screen.dart:60-72 | async-race | HIGH | `_loadStations`: SAU `await getStations` goi thang `setState` (dong 64) ma KHONG co `if(!mounted) return`. Neu user roi man trong luc tai -> `setState after dispose` nem exception. (So sanh: `_loadSchedule` co guard mounted dong 88.) | Them `if (!mounted) return;` ngay sau dong 61. |
| delivery_receive/services/delivery_receive_service.dart:22-54 | auth-authz | MEDIUM | Khong guard token null/rong nhu `car_schedule_service`. Token null -> gui header `Authorization: Bearer null` toi server (request rac). Parser bat 401 nen khong crash nhung sai pattern. | Them `if (token == null || token.isEmpty) return {success:false, message:'Phien dang nhap het han...'}` truoc khi goi (giong car_schedule_service.dart:26-31). |
| delivery_receive/widgets/delivery_dialog.dart:89 | null-safety-crash | MEDIUM | `result['items'] as List<Map<String, dynamic>>?` cast cung. `?? []` chi cuu null, KHONG cuu khi `items` la List nhung phan tu khong dung kieu `Map<String,dynamic>` -> CastError. | Ep mem: `(result['items'] as List?)?.whereType<Map>().map((e)=>Map<String,dynamic>.from(e)).toList() ?? []` (nhu booking_contract_update_screen.dart:149-152). |
| delivery_receive/widgets/receive_dialog.dart:108 | null-safety-crash | MEDIUM | Y het tren: `result['items'] as List<Map<String, dynamic>>?` cast cung. | Ep mem nhu tren. |
| delivery_receive/screens/delivery_receive_screen.dart:481-489 | null-safety-crash | MEDIUM | `_loadBookingDetail`: `final data = result['data'];` (dynamic) roi `data['result']?['data'] ?? data['data']`. Neu `data` khong phai Map (null/List) -> nem loi khi index `['result']`. | Guard: `final data = _asMap(result['data']); if (data == null) return null;` truoc khi index (helper `_asMap` da co o cuoi file). |
| car_schedule/screens/car_schedule_screen.dart:397-399 | null-safety-crash | MEDIUM | `_carRow`: `(car['bookings'] as List).map((e) => e as Map<String,dynamic>)` ep cung tung phan tu. Phan tu sai kieu -> CastError lam vo row. | Dung `.whereType<Map>().map((e)=>Map<String,dynamic>.from(e))`. |
| car_schedule/screens/booking_contract_update_screen.dart:163-166 | async-race | MEDIUM | `_loadData`: `setState(()=>_isLoading=false)` cuoi (dong 166) khong co `if(!mounted) return` ngay truoc. Dua vao cac guard mounted o tren, nhung await cuoi (getCustomerDetail) co the hoan tat sau dispose -> con khe race. | Them `if(!mounted) return;` truoc dong 166. |
| car_schedule/screens/booking_contract_update_screen.dart:586-587 | error-handling | MEDIUM | `onChanged: (v) => _discountValue = int.tryParse(v) ?? 0` cap nhat ngoai `setState` -> gia tri doi nhung UI/tinh toan khong refresh (vd hien thi giam gia). | Bao trong `setState` neu can phan anh ngay, hoac xac nhan chu y. |
| delivery_receive/widgets/delivery_dialog.dart:237-256, 475-500 | input-validation | LOW | Khu upload anh giay to khach (CMND/GPLX) + tinh trang xe khi GIAO chi la placeholder tinh (`_uploadPlaceholder`), khong upload that, khong gui API. Giao xe khong luu duoc anh -> thieu bang chung. Khong phai loi bao mat code. | Noi API upload that (ImageService da co), hoac an khoi neu chua lam de tranh hieu nham. |
| delivery_receive/widgets/receive_dialog.dart:476-489 | error-handling | LOW | Nut "+ Them" phu thu chi co `// TODO` rong. `_surchargeTotalController` khong xuat hien o UI nhap nao -> `surchargeAmount` luon = 0 gui len API. Nghiep vu thieu. | Hoan thien form phu phi hoac an nut neu chua lam. |
| car_schedule/screens/car_schedule_screen.dart:380-383 | other | LOW | Nhan thu sai: `'THU ${day.weekday + 1}'`. Thu Hai (weekday=1) -> hien "THU 2"? Thuc te 1+1=2 nhung Thu Ba (weekday=2)->"THU 3"... lech nhan (nen la "THU 2".."THU 7"/"CN" theo weekday truc tiep). | Map dung theo `day.weekday` (1=Thu 2) khong cong them. |
| car_schedule/screens/booking_contract_update_screen.dart:415-422 | other | LOW | Nut "Thay doi khach hang" `onPressed: () {}` rong — chuc nang chua lam. | Hoan thien hoac an nut. |
| dashboard/widgets/sidebar_desktop.dart:233-286 | other | LOW | `_handleLogout` TRUNG LAP ~100% voi main_layout.dart:211-264 (copy-paste) -> kho bao tri. | Tach 1 ham/service logout dung chung. |
| dashboard/widgets/stat_card.dart (toan file) | other | LOW | `StatCard` khong duoc tham chieu trong M5 (dashboard_screen dung `DashboardStatCard` rieng) -> co the la dead code. | Xac nhan va xoa neu khong dung. |
| dashboard/screens/main_layout.dart:21 | other | LOW | `bool get _hasUnreadNotifications => false` hardcode, chuong thong bao khong bao gio sang + `_showNotifications` luon "Chua co thong bao". Tinh nang chua noi API. | Noi API thong bao hoac giu nguyen co y. |

## Tom tat muc do

- CRITICAL: 0
- HIGH: 4
  - booking_contract_update_screen.dart:261-274 nut CAP NHAT gia (khong goi API, bao thanh cong -> mat du lieu)
  - delivery_dialog.dart:340-341 force-unwrap DateTime.parse (crash dialog giao xe)
  - receive_dialog.dart:306-307 force-unwrap DateTime.parse (crash dialog nhan xe)
  - car_schedule_screen.dart:60-72 setState sau await thieu mounted guard
- MEDIUM: 6 (token null khong guard; cast cung List/Map o 3 cho; _loadBookingDetail thieu guard Map; _isLoading=false thieu mounted; _discountValue ngoai setState)
- LOW: 6 (upload placeholder giao xe, nut phu thu TODO, nhan thu sai, nut rong, logout trung lap, dead code stat_card, chuong thong bao tinh)
