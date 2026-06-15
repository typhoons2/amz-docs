# Review M4-shared-rest (App khach booking-car-app)

> Pham vi: cac file UI/khung chung va man hinh phu (shared widgets, about, dashboard, news, onboard, payment, settings, splash, l10n, main.dart).
> Quy uoc kiem tra: xanh-service responseCode = "00", auth-service responseCode = "200". Check `responseCode`, KHONG dua vao HTTP status.

## So file da doc that su: 18 file .dart

Danh sach:
1. lib/shared/widgets/custom_button.dart
2. lib/shared/widgets/custom_card.dart
3. lib/shared/widgets/custom_text_field.dart
4. lib/shared/widgets/empty_state_widget.dart
5. lib/shared/widgets/loading_widget.dart
6. lib/shared/widgets/shimmer_widget.dart
7. lib/shared/widgets/widgets.dart
8. lib/features/about/presentation/pages/about_page.dart
9. lib/features/dashboard/presentation/pages/dashboard_page.dart
10. lib/features/news/presentation/pages/news_page.dart
11. lib/features/onboard/presentation/pages/onboard_page.dart
12. lib/features/payment/payment_method.dart
13. lib/features/settings/presentation/pages/settings_page.dart
14. lib/features/splash/presentation/pages/splash_page.dart
15. lib/l10n/generated/app_localizations.dart
16. lib/l10n/generated/app_localizations_en.dart
17. lib/l10n/generated/app_localizations_vi.dart
18. lib/main.dart

---

## Bang van de

| File:dong | Loai | Muc do | Van de | Cach sua |
|-----------|------|--------|--------|----------|
| splash_page.dart:46-47 | null-safety-crash | CRITICAL | `data['response']['responseCode']` truy cap khong guard. Khi API tra ve loi (vd 401/500) hoac body khong co key `response`, dong nay nem loi -> nhung roi vao `catch` nen ket cuc bi day ve `/login`. Hau qua thuc te: user dang dang nhap (van con refresh token hop le) nhung khi server tra cau truc khac thuong se bi da ra man hinh login => mat phien oan. | Doc an toan: `final responseCode = (data is Map ? (data['response'] as Map?)?['responseCode'] : null) ?? '';` va xu ly tung nhanh ro rang. |
| splash_page.dart:36-54 | auth-authz / error-handling | CRITICAL | Luong khoi dong khong xu ly truong hop CHUA dang nhap (refresh token rong `""`). Van goi `refreshAccessToken(refreshToken: "")` len server moi lan mo app. Neu server tinh co tra ve cau truc co `accessToken`/`refreshToken` thi se ghi de token; con neu loi thi nhay vao catch -> `/login`. Logic phu thuoc may rui cua response thay vi kiem tra "co token hay khong" truoc. | Truoc khi goi API: neu `refreshToken.isEmpty` -> bo qua goi refresh, di thang nhanh onboard/login dua tren `isFirstTime`. Chi goi refresh khi co token. |
| splash_page.dart:53-54 | token-storage | HIGH | Ghi token moi (`user_token`, `refresh_token`) vao secure storage TRUOC khi kiem tra `responseCode == "200"`. Neu refresh that bai nhung body van co field token null/rac, ta luu de len token cu (ghi `null`). Lan sau doc ra token sai/null. | Chi `storage.write(...)` SAU KHI xac nhan `responseCode == "200"` va token khac null/khac rong. |
| splash_page.dart:44 | logging-leak | HIGH | `print('REFRESH TOKEN: $response')` in toan bo Response (gom access token + refresh token + body) ra log. Du boc trong `kDebugMode` van la thoi quen lo token; debug build van lo. | Xoa han dong print, hoac chi log status code/responseCode, tuyet doi khong in token. |
| splash_page.dart:57,61,64,67 | async-race | HIGH | Sau cac `await` (storage/API) moi goi `Navigator.pushReplacementNamed(context, ...)` ma KHONG kiem tra `mounted` lai. Neu user thoat man hinh splash trong khi cho API, dung context da huy -> co the crash "used after dispose". | Truoc moi `Navigator.push...` them `if (!mounted) return;`. |
| splash_page.dart:32-69 | error-handling | HIGH | `catch (e)` nuot loi hoan toan (chi dieu huong `/login`), khong phan biet loi mang vs token het han vs server loi. User mat phien ma khong hieu vi sao; khong co log chi tiet phia client de dieu tra. | Phan loai loi (timeout/mang vs 401 vs khac), log chi tiet (khong gom token), va chi dua ve login khi that su chua dang nhap. |
| dashboard_page.dart:71,96 | error-handling | HIGH | Kiem tra `response.statusCode == 200` (HTTP status) thay vi `responseCode`. Sai quy uoc AMZ: server co the tra HTTP 200 nhung `responseCode` bao loi nghiep vu -> app van coi la thanh cong va co the hien danh sach rong/sai. | Doc `response.data['response']?['responseCode']` (hoac dung `responseCode` chuan cua service) va so sanh dung gia tri ("00" hoac "200" tuy service). |
| dashboard_page.dart:70,95 (qua ApiService.getPromotions/getNews) | auth-authz / other | HIGH | Promotions (`/promotions`) va News (`/news/available`) goi qua `getAuthDio()` (base url auth-service) thay vi `getBookingDio()` (xanh-service). Sai base => goi nham service (cung lop loi "chon nham Dio base" da phat hien o module khac). `getCities` thi dung dung `getBookingDio()`. | Sua trong ApiService: `getPromotions`/`getNews` dung `getBookingDio()`. (Ngoai pham vi file M4 nhung dashboard la noi tieu thu, ghi nhan de doi rv-be.) |
| dashboard_page.dart:372,427,441,644,646,651 | null-safety-crash | HIGH | Doc field tu JSON dong (`promotion['banner_image_url']`, `promotion['title']`, `item['title']`, `item['banner_image_url']`, `item['created_at']`) ma khong ep kieu/guard. Neu phan tu khong phai Map (vd API tra string/null trong mang) hoac field sai kieu -> nem loi runtime khi build list -> crash UI hoac do mau do. | Guard tung phan tu: `final p = promotions?[index]; if (p is! Map) return SizedBox();` roi doc `p['title']?.toString() ?? ''`. Ap dung tuong tu cho news. |
| dashboard_page.dart:65-152 | error-handling | MEDIUM | 3 ham `_loadPromotions/_loadNews/_loadCities` deu `catch (e, stack)` nhung khong dung `e`/`stack` (khong log, khong bao). Loi bi nuot, chi set list = null. Kho dieu tra khi loi that. | Log chi tiet (vd `debugPrint` co kiem soat, khong PII) hoac bao cao len crashlytics; giu UI fallback nhu hien tai. |
| dashboard_page.dart:82,107,146 | async-race | MEDIUM | `setState` trong `catch`/`then` cua API ma khong check `mounted`. Neu widget bi huy khi API dang chay -> "setState after dispose". Co `AutomaticKeepAliveClientMixin` giam rui ro nhung van co the xay ra khi pop ca cay. | Bao `if (mounted) setState(...)` trong tat ca nhanh sau await. |
| dashboard_page.dart:36-44 | resource-leak | LOW | Khai bao bien `news/promotions/cities` la `List<dynamic>?` (kieu long leo) cho du lieu API; de gay loi kieu o cho tieu thu. Khong ro leak nhung de sinh bug null/kieu. | Dinh nghia model (vd PromotionItem, NewsItem) parse co guard, thay cho `dynamic`. |
| dashboard_page.dart:60-63 | resource-leak | LOW | `dispose()` chi goi `super.dispose()`. Hien khong tao controller/subscription nen khong leak; nhung neu sau nay them controller can nho dispose. Khong phai loi hien tai. | Ghi chu: giu nguyen, luu y khi mo rong. |
| dashboard_page.dart:802-804 | other | LOW | `_fullImageUrl` ghep anh dua tren `ApiEndpoints.authBaseUrl` (origin auth-service). Neu anh promotions/news do xanh-service phuc vu thi origin co the sai -> anh khong hien. Lien quan bug base url o tren. | Dung dung base origin cua service phuc vu anh (booking/xanh-service) hoac base CDN rieng. |
| onboard_page.dart:28,54,62,79,107,115 | other | LOW | Mau/UI dung `Colors.black.withOpacity(...)`, gia tri co dinh trong UI (chap nhan duoc). Khong co secret/logic. Chi luu y maintainability. | Khong bat buoc; co the tach hang so mau. |
| settings_page.dart:191 | other | LOW | App Version hardcode `'1.0.0'` trong UI (khong phai secret). Khi len phien ban moi de quen sua. | Doc tu `package_info_plus` thay vi hardcode. |
| settings_page.dart:181 | other | LOW | `const _AboutSection({super.key})` khai bao `key` cho private widget khong dung -> canh bao lint (`use_key_in_widget_constructors`/khong can). Khong anh huong chuc nang. | Bo `super.key` neu khong dung, hoac giu cung duoc. |
| about_page.dart:842,828,812 | other | LOW | Thong tin cong ty (email `aisolutiondalat@gmail.com`, MST `5801501670`, dia chi) hardcode trong UI. Day la thong tin cong khai, KHONG phai secret — chi la noi dung tinh nen kho cap nhat. | Neu can cap nhat dong, dua sang cau hinh/CMS; khong bat buoc. |
| about_page.dart:137-142 | null-safety-crash | LOW | Nut "Dat xe ngay" push thang `BookingPage()` khong qua guard auth. Khong phai loi crash; chi luu y luong nghiep vu (khach chua login co the vao booking). | Xac nhan voi nghiep vu xem booking co can dang nhap khong; ngoai pham vi REST. |
| main.dart:66-78 | other | LOW | Bang `routes` thieu route `/about`, `/settings`, `/news` (cac man trong module nay) — chung duoc mo qua IndexedStack/Navigator.push truc tiep chu khong qua named route. Khong phai bug, chi la convention khong dong nhat. | Khong bat buoc; ghi nhan de nhat quan dieu huong. |

---

## Cac file SACH (khong phat hien van de)

- **custom_button.dart, custom_card.dart, custom_text_field.dart, empty_state_widget.dart, loading_widget.dart, widgets.dart**: widget UI thuan, khong goi API, khong xu ly token, khong parse JSON. Khong co van de bao mat/on dinh.
- **shimmer_widget.dart**: co `AnimationController` va da `dispose()` dung cach (dong 55-58). Khong leak. Sach.
- **news_page.dart**: man hinh placeholder (chi hien chu "Tin tuc"), khong logic. Sach.
- **payment_method.dart**: model thuan, `fromJson` gan truc tiep tu Map. Cac field deu nullable nen khong crash. Luu y nho: `id: json["id"]` khong ep kieu (neu server tra so dang string co the sai kieu) — muc rat thap, chua liet vao bang vi field la `int?` va du lieu hien chua dung den.
- **l10n/generated/* (3 file)**: code auto-sinh tu `flutter gen-l10n`. Khong sua tay, khong van de. (Luu y nho ngoai checklist: `appTitle` con la "Cash Flow Management"/"Quan Ly Dong Tien" — sai ten app, co the la template cu; khong phai loi bao mat/on dinh.)

## Tom tat muc do

- CRITICAL: 2 (deu o splash_page.dart — luong khoi dong/refresh token de da nham user ra login + parse responseCode khong guard).
- HIGH: 6 (splash: luu token truoc khi xac thuc, log lo token, thieu mounted, nuot loi; dashboard: check HTTP status thay responseCode, sai Dio base promotions/news, parse JSON khong guard).
- MEDIUM: 2 (dashboard: nuot loi trong catch, setState thieu mounted).
- LOW: nhieu (chu yeu maintainability, hardcode noi dung cong khai, kieu dynamic).

> Diem nong nhat: **splash_page.dart** — vua dinh bao mat (lo token qua print, luu token sai thoi diem) vua dinh on dinh (crash do parse khong guard, da user dang nhap ra login). De nghi uu tien sua truoc.
