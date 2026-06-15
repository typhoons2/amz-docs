# Review M2-booking (app khach booking-car-app)

**So file .dart da doc that su: 27/27**

Pham vi: `booking-car-app/lib/features/booking` (toan bo: 5 model, 7 page, 2 service, 13 widget).

Ngon ngu: tieng Viet, mo ta de hieu cho lead khong ranh code.

---

## Tom tat nhanh (uu tien sua)

| # | Van de gon | Muc do |
|---|-----------|--------|
| 1 | Huy don xe: bao "Da huy" du API that bai (khong check responseCode) | CRITICAL |
| 2 | Nhieu man hinh KHONG check responseCode "00", chi nhin "result" → don loi van coi nhu thanh cong | CRITICAL |
| 3 | Parse ngay thang khong an toan (DateTime.parse) → de crash khi API tra ngay xau/null | HIGH |
| 4 | Lo URL anh + thong tin xe ra log (print) o ban release neu kDebugMode bi tat sai | MEDIUM |
| 5 | Hardcode URL S3/gateway trong code FE | MEDIUM |
| 6 | Nhieu cho dung `context`/`setState` sau `await` thieu kiem tra con song (mounted) → de crash | HIGH |
| 7 | Ro ri bo nho: nhieu o nhap lieu (TextEditingController) tao roi khong don | MEDIUM |
| 8 | Voucher/khuyen mai la du lieu gia (hardcode), khong goi API that | HIGH |

---

## Bang chi tiet

| File:dong | Loai | Muc do | Van de | Cach sua |
|-----------|------|--------|--------|----------|
| presentation/pages/booking_detail_page.dart:682-700 | error-handling | CRITICAL | Huy don (`cancelBooking`): goi API xong la luon hien "Da huy dat xe" va dong man hinh, KHONG kiem `responseCode`, KHONG bat loi (try/catch). Neu server tra loi (het han huy, sai trang thai) user van tuong da huy thanh cong → sai du lieu nghiem trong. | Boc try/catch; chi bao thanh cong khi `responseCode == "00"`; neu khac thi hien thong bao loi tra ve; them `mounted` check truoc khi dung context. |
| presentation/pages/booking_detail_page.dart:683-686 | input-validation | MEDIUM | Ly do huy (`reason`) duoc nhap nhung KHONG gui len API va validate (`if reason.isEmpty` da bi comment), dau `*` bat buoc nhung khong ep. | Truyen `reason` vao `cancelBooking`; bat buoc nhap truoc khi goi. |
| presentation/pages/booking_detail_page.dart:610-612 | resource-leak | MEDIUM | `cancelReasonController` (TextEditingController) tao trong `_confirmCancel` nhung khong bao gio `dispose()` → ro ri bo nho moi lan mo dialog huy. | Chuyen sang StatefulWidget dialog va dispose, hoac dung `.dispose()` sau khi dialog dong. |
| presentation/pages/booking_detail_page.dart:692-699 | async-race | HIGH | Sau `await cancelBooking` goi `ScaffoldMessenger.of(context)` va `Navigator.pop(context)` ma khong kiem `mounted` → neu man hinh da bi dong se crash. | Them `if (!mounted) return;` ngay sau await. |
| presentation/pages/booking_detail_page.dart:244, 280 | transport-tls / secrets | MEDIUM | Hardcode URL gateway `api-portal.amzholdings.vn/.../files/` va bucket S3 `xanh-api-images.s3.ap-southeast-1.amazonaws.com` thang trong widget. Doi domain phai sua nhieu noi. | Dua vao file config (ApiEndpoints), khong rai rac. |
| presentation/pages/booking_detail_page.dart:246-250 | logging-leak | LOW | `print('Loading image URL (detail): ...')` lo URL anh trong log (chi khi kDebugMode). | Bo print debug truoc khi release. |
| presentation/pages/booking_detail_page.dart:62 | error-handling | LOW | Khi loi mang chi hien thong bao chung, dung; nhung cac path khong-Dio tra "Da xay ra loi!" khong ro nguyen nhan. Chap nhan duoc. | (tuy chon) Phan loai loi ro hon. |
| presentation/pages/booking_confirm_page.dart:512-516, 542-544 | logging-leak | MEDIUM | `print` debug lo thong tin don (carId, ten khach, phuong thuc tt) va toan bo body response. Chi an khi kDebugMode = false; rui ro lo PII neu build sai che do. | Xoa cac print debug nay; neu can log thi dung logger co kiem soat, khong in body/PII. |
| presentation/pages/booking_confirm_page.dart:86, 90, 494 | input-validation | MEDIUM | Phi giao xe mac dinh hardcode `80000` khi API khong tra `pickupFee`. So tien co the sai lech so voi he thong. | Khong dat gia tri tien mac dinh tuy y; neu thieu thi bao loi/chan dat, hoac lay tu API. |
| presentation/pages/booking_confirm_page.dart:548-552 | null-safety-crash | HIGH | Doc `response.data['response']['responseCode']`, `response.data['result']['data']`, `bookingData['id']` truc tiep — neu cau truc khac (vd `result` null) se crash. Co check `statusCode==200` nhung khong guard tung tang map. | Dung `?[]` an toan tung cap; kiem null truoc khi doc `bookingData`. |
| presentation/pages/booking_confirm_page.dart:563 | null-safety-crash | MEDIUM | `bookingId` lay `bookingData['id'] ?? ''` (co the la String rong) roi truyen vao `BookingDetailPage(bookingId: ...)` yeu cau `int`. Neu id thieu → kieu sai. | Ep ve int an toan, kiem >0 truoc khi mo trang chi tiet. |
| presentation/pages/booking_confirm_page.dart:59 | (auth) | LOW | Tao `ApiService()` moi trong State (giong cac trang khac). Khong loi nhung lap lai; token lay tu dau can xac nhan o core (ngoai pham vi module). | (tuy chon) Dung 1 instance dung chung. |
| presentation/pages/booking_info_page.dart:89-258 | logging-leak | MEDIUM | Rat nhieu `print` debug in URL API, body response, gia tinh duoc. An khi kDebugMode. | Don bot print debug truoc release. |
| presentation/pages/booking_info_page.dart:126-128 | null-safety-crash | HIGH | `response.data['response']['responseCode']` va `response.data['result']['data']` doc truc tiep — neu `response` hoac `result` null se crash (chi co check statusCode). | Dung truy cap an toan `?[]` + gia tri mac dinh. |
| presentation/pages/booking_info_page.dart:99 | error-handling | LOW | `carModel ?? 'VF3'` — fallback ten model cung (VF3) co the tinh gia sai xe khac. | Neu thieu carModel thi bao loi thay vi doan VF3. |
| presentation/pages/booking_history_page.dart:47-48 | error-handling | HIGH | `_loadBookingHistory` catch nuot loi: chi set list = null, KHONG check responseCode, khong phan biet loi mang vs khong co don. User chi thay "Khong tai duoc" du loi gi. | Check responseCode "00"; log/phan loai loi; thong bao ro hon. |
| presentation/pages/booking_history_page.dart:128-152 | async-race | HIGH | `_loadMore` KHONG co try/catch quanh `await getMyBookingHistory` → loi mang khi cuon se crash. Cung khong kiem `mounted` truoc `setState` sau await. | Boc try/catch; them `if(!mounted) return;`; reset `_isLoadMore=false` trong finally. |
| presentation/pages/booking_history_page.dart:45-46 | null-safety-crash | LOW | `addOther` gan `totalItems = bookingList.totalPages` (sai field — gan nham totalPages vao totalItems). Loi logic phan trang. | Sua thanh `totalItems = bookingList.totalItems`. |
| presentation/pages/booking_page.dart:60-66 | error-handling | MEDIUM | `_loadBookingHistory` khong check responseCode; loi thi chi set list rong (coi nhu "chua co chuyen"). User co don nhung mang loi se thay man hinh trong. | Phan biet loi vs rong; check responseCode. |
| presentation/pages/car_listing_page.dart:501-524 | async-race | HIGH | `_onCarTap`: sau `await getCarDetail` dung `Navigator.push(context...)` va `ScaffoldMessenger.of(context)` ma KHONG kiem `mounted` → de crash neu user da thoat. Cung khong check responseCode. | Them `if(!mounted) return;` sau await; check responseCode "00". |
| presentation/pages/car_listing_page.dart:138-145 | async-race | HIGH | `_applySeatFilter`: trong catch goi `ScaffoldMessenger.of(context)` sau await khong kiem `mounted`. | Them `mounted` check. |
| presentation/pages/car_listing_page.dart:82-84 | error-handling | MEDIUM | Loc theo so cho: chi check `statusCode==200`, KHONG check responseCode "00". Don loi nghiep vu van duoc coi la OK. | Them check responseCode. |
| presentation/pages/car_detail_page.dart:11-18 | null-safety-crash | LOW | Nhan `Map<String,dynamic> carDetail` thang tu API, ep kieu cac field con — co dung `as ... ?? {}` nen tuong doi an toan. `specs['depositAmount']`, `driveType`, `maxSpeed`... co the khong ton tai (hien rong) — chap nhan duoc. | (tuy chon) Dung model Car thay vi map tho. |
| presentation/services/search_cars_service.dart:48-81 | error-handling | HIGH | `searchAvailableCars` chi check `data['result']['items'] is List`, KHONG check responseCode "00". Neu API tra loi nghiep vu (vd het xe, sai tham so) ma van co cau truc → coi nhu thanh cong / hoac bao "khong tim thay" sai. | Check `responseCode == "00"` truoc khi doc items. |
| presentation/services/search_cars_service.dart:82-91 | error-handling | MEDIUM | Catch nuot het loi, chi bao "He thong xay ra su co" — khong phan biet mang/nghiep vu. Chap nhan o muc UI nhung mat thong tin. | Log chi tiet phia trong; giu thong bao chung cho user. |
| presentation/services/search_cars_service.dart:35-37 | logging-leak | LOW | `print('Searching Cars...')` debug. | Bo truoc release. |
| presentation/widgets/booking_history.dart:140-141 | logging-leak | LOW | `print('Loading image URL (history): ...')` lo URL anh. | Bo print. |
| presentation/widgets/booking_history.dart:138, 170 | secrets | MEDIUM | Lap lai hardcode URL gateway + bucket S3 (giong booking_detail). | Tap trung vao config. |
| presentation/widgets/booking_infos/booking_info_price.dart:245-254 | resource-leak | MEDIUM | `_showAddressSearch`: tao `TextEditingController` trong builder modal, KHONG dispose → ro ri moi lan mo. | Tach modal thanh StatefulWidget va dispose controller. |
| presentation/widgets/booking_infos/booking_info_price.dart:333-335 | async-race | MEDIUM | Sau `await showModalBottomSheet`, goi `setState` ma khong kiem `mounted`. | Them `if(!mounted) return;`. |
| presentation/widgets/booking_infos/booking_info_price.dart:343-345 | null-safety-crash | MEDIUM | `_checkLicenseVerification`: `response.data['response']['responseCode']` va `['result']['data']` doc truc tiep, chi co check statusCode. Neu cau truc khac → crash; loi → tra false (chan dat xe nham). | Dung truy cap an toan; phan biet "chua co GPLX" vs "loi mang". |
| presentation/widgets/booking_infos/booking_info_price.dart:154-186 | auth-authz | LOW | Logic chan dat xe khi GPLX chua duyet la dung; nhung neu `_checkLicenseVerification` loi mang se tra false → chan oan user da co GPLX. | Phan biet loi mang (cho thu lai) vs that su chua duyet. |
| presentation/widgets/booking_infos/booking_info_receiving_place.dart:376-466 | resource-leak | MEDIUM | `_showAddressSearch`: tao `_modalAddressController` trong builder, khong dispose. | Dispose controller khi modal dong. |
| presentation/widgets/booking_infos/booking_info_receiving_place.dart:464-465 | async-race | LOW | Sau await modal, `setState` khong kiem `mounted`. | Them `mounted` check. |
| presentation/widgets/booking_infos/booking_info_receiving_place.dart:33 | resource-leak | LOW | `_addressController` cua state KHONG duoc dispose trong `dispose()` (khong co override dispose). | Override dispose va goi `_addressController.dispose()`. |
| presentation/widgets/booking_infos/booking_info_promotion.dart:188-409 | input-validation | HIGH | Danh sach voucher la DU LIEU GIA hardcode ('TENVOUCHER', amount 80000...). Khong goi API that, khong validate ma. User co the ap "khuyen mai" khong ton tai → lech tien don. | Goi API voucher that; validate ma; bo data gia. |
| presentation/widgets/booking_infos/booking_info_promotion.dart:144 | logging-leak | LOW | `print('Voucher button tapped')` debug khong bao kDebugMode → in ca o release. | Bo print. |
| presentation/widgets/booking_infos/booking_info_promotion.dart:28-31 | input-validation | MEDIUM | Khuyen mai "lan dau" hardcode `120000` o FE — so tien giam quyet dinh boi FE, khong phai server. De bi lech/gian lan. | Lay so tien giam tu server. |
| presentation/widgets/booking_infos/booking_info_overview.dart:43 | (other) | LOW | Mo ta xe hardcode "VinFast ${carModel}..." — gan cung hang VinFast, sai neu xe hang khac. | Lay mo ta tu API hoac bo cau gan hang. |
| presentation/widgets/booking_infos/booking_info_overview.dart:68, booking_info_car n/a | (other) | LOW | "500 luot", "12 luot" la so lieu gia hardcode hien cho user. | Lay so that hoac an di. |
| presentation/widgets/booking_infos/booking_info_carousel.dart:54-61 | error-handling | MEDIUM | `_loadData` (chi tiet xe): khong check responseCode chuan (co check "00" o tang trong nhung neu statusCode != 200 hoac responseCode != "00" thi `_isLoading` van true → vong xoay mai). Nhanh that bai khong tat loading dung cach o moi truong hop. | Dam bao `_isLoading=false` o moi nhanh; check `mounted` truoc setState. |
| presentation/widgets/booking_infos/booking_info_carousel.dart:43, 58 | async-race | MEDIUM | `setState` sau `await getCarDetail` khong kiem `mounted`. | Them `if(!mounted) return;`. |
| presentation/widgets/booking_infos/booking_info_renter.dart:386-429 | async-race | MEDIUM | `_fillRenterFromProfile`: sau `await getProfile` goi `setState` ghi controller ma khong kiem `mounted`; dung `Future.delayed` set `_isApplyingProfile` khong kiem mounted. | Them `mounted` check; huy timer khi dispose. |
| presentation/widgets/booking_infos/booking_info_renter.dart:386-391 | error-handling | LOW | `getProfile` khong check responseCode; doc nhieu key fallback (an toan tuong doi). | Check responseCode "00". |
| presentation/widgets/booking_infos/booking_info_similar.dart:44-49 | error-handling | MEDIUM | `_loadSimilarCars` khong check responseCode; loi → list rong (an section). Chap nhan duoc nhung mat thong tin loi. | Check responseCode; log loi. |
| presentation/widgets/booking_infos/booking_info_similar.dart:51-143 | logging-leak | LOW | Nhieu print debug in body response (kDebugMode). | Don bot. |
| presentation/widgets/search_cars_widget.dart:84-167 | error-handling | MEDIUM | `_loadCities` va `_fetchStations` khong check responseCode "00"; catch nuot loi (set list rong). User khong biet loi mang. | Check responseCode; thong bao loi tai dia diem/ben. |
| presentation/widgets/search_cars_widget.dart:84-122 | async-race | LOW | `setState` sau await trong `_loadCities`/`_fetchStations` khong kiem `mounted` (co finally setState). | Them `mounted` check. |
| data/models/booking.dart:145-146, 164 | null-safety-crash | HIGH | `DateTime.parse(json['startTime'])`, `endTime`, `createdAt` — neu API tra null hoac chuoi sai dinh dang se NEM loi → ca trang chi tiet/lich su crash. (updatedAt da guard, 3 cai kia thi khong). | Dung `DateTime.tryParse` + gia tri mac dinh, hoac guard null truoc khi parse. |
| data/models/booking.dart:37-47 | null-safety-crash | LOW | `addOther` mutate `items` trong-place (vi pham immutability) va gan nham field (xem tren). | Tao list moi; sua field. |
| data/models/car.dart:27-45 | error-handling | LOW | `Car.fromJson` defensive tot (deu co `?? default`). Khong loi. | — |
| data/models/license.dart, station.dart, city.dart | (other) | — | SACH: parse co `tryParse`/guard null, co default. Khong phat hien van de. | — |
| presentation/services/booking_cars_service.dart | (other) | — | SACH: thuan tinh toan khung gio, khong I/O, khong null nguy hiem. | — |
| presentation/widgets/stations_sheet.dart, search_card.dart, car_item_widget.dart, time_picker_sheet.dart, booking_info_car.dart, booking_info_overview.dart | (other) | LOW/— | Chu yeu UI thuan. time_picker_sheet co dispose controller dung. car_item_widget/booking_info_car SACH ve an toan. | — |

---

## Nhan xet ve cac diem da biet tu review parity

1. **cancelBooking bao thanh cong gia** — XAC NHAN. Tai `booking_detail_page.dart:682-700`: huy xong luon hien "Da huy dat xe", khong check responseCode, khong try/catch. Day la loi nghiem trong nhat module. (Luu y: nut huy hien dang bi comment o dong 540-548 nen chua dung tren UI, nhung ham `_confirmCancel` van con va se dung neu mo lai → can sua truoc khi bat lai.)
2. **chon nham Dio base / endpoint sai (promotions/news/google-login)** — cac endpoint do o module khac (core/api_service, features khac), KHONG nam trong `features/booking`. Trong module nay khong thay goi truc tiep getAuthDio/getBookingDio (deu qua ApiService). Voucher trong booking la data GIA hardcode (chua noi API) — xem dong booking_info_promotion.
3. **print("Endpoint...") debug** — XAC NHAN co rat nhieu print debug rai khap (booking_info_page, booking_confirm_page, booking_info_similar, search_cars_service, booking_history widget...). Da phan lon boc trong `kDebugMode` (an o release), RIENG `booking_info_promotion.dart:144` in KHONG bao kDebugMode → lo ca o release.

## Diem he thong lap lai (nen sua 1 lan, ap nhieu file)

- **Khong check responseCode "00"**: hau het cac noi goi xanh-service trong module chi dua vao `statusCode==200` + su ton tai cua `result`. Don loi nghiep vu (server tra HTTP 200 + responseCode != "00") se bi coi la thanh cong → day la pattern nguy hiem lan rong toan module.
- **Thieu `mounted` check sau await**: lap lai o gan 10 cho → de crash khi user thoat man hinh nhanh.
- **TextEditingController tao trong builder modal khong dispose**: 3 cho (booking_info_price, booking_info_receiving_place x1 state-level + 1 modal, booking_detail dialog).
- **Hardcode URL gateway/S3**: 2 file (booking_detail, booking_history).
- **Du lieu gia hardcode hien cho user/tinh tien**: voucher, phi 80k, giam 120k, "500 luot" → rui ro lech tien va hieu nham.
