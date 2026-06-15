# D5 — Rà soát điểm crash / null-safety (app khách booking-car-app)

> Phạm vi: `booking-car-app/lib` (toàn bộ), có liên hệ `android`/`ios` khi cần.
> Tập trung: nguy cơ **crash do null** — force-unwrap `!`, `late` chưa init, ép kiểu null, parse JSON không guard.
> Quy ước responseCode: xanh-service = `"00"`, auth-service = `"200"`.

## Tóm tắt nhanh (cho lead)

- Có **1 lỗi crash chắc chắn** (carousel ảnh xe): khi tải xong chi tiết xe, app gán lại 1 biến "chỉ-được-gán-1-lần" → văng app ngay tại màn xem ảnh xe.
- Phần lớn các chỗ đọc JSON kiểu `data['response']['responseCode']` **không kiểm tra null từng tầng**. Đa số nằm trong `try/catch` nên không văng app, nhưng khi server trả về dạng lạ (lỗi gateway, HTML, body rỗng) thì **màn hình im lặng / mất dữ liệu** thay vì báo lỗi rõ.
- Có **2 chỗ chính ngay trong phần xử lý lỗi của Đăng nhập / Đăng ký** lại có thể tự văng lỗi khi server trả body không phải JSON → người dùng bấm đăng nhập lúc server lỗi sẽ **không thấy thông báo gì**.
- Model `Booking` parse ngày bằng `DateTime.parse` **bắt buộc có giá trị**: chỉ cần 1 đơn thiếu/sai ngày là **toàn bộ danh sách lịch sử đặt xe trống** (không phải lỗi 1 dòng).

## Bảng chi tiết

| File:dòng | Mức độ | Vấn đề | Cách sửa |
|-----------|--------|--------|----------|
| `lib/features/booking/presentation/widgets/booking_infos/booking_info_carousel.dart:18,24,44` | CRITICAL | `late final Car _car;` được gán ở `initState` (dòng 24) rồi **gán lại** sau khi tải chi tiết xe (dòng 44). Biến `late final` chỉ cho gán **1 lần** → lần gán thứ 2 ném `LateInitializationError` → **văng app** ngay khi mở phần ảnh/chi tiết xe và API trả về thành công. | Bỏ `final`: đổi thành `late Car _car;` (cho phép gán lại). |
| `lib/features/auth/presentation/pages/login_page.dart:107` | HIGH | Trong khối bắt lỗi đăng nhập: `e.response?.data["response"]["responseMessage"]`. Nếu server trả body **không phải Map** (HTML lỗi 502, text, body rỗng) thì `data["response"]` là null/sai kiểu → `["responseMessage"]` ném lỗi **ngay trong chính chỗ xử lý lỗi**, không có catch bao ngoài → lỗi async không ai bắt. Người dùng **không thấy thông báo** khi server đang lỗi. | Đọc an toàn từng tầng: `(e.response?.data is Map) ? e.response?.data["response"]?["responseMessage"] : null`, fallback chuỗi mặc định. |
| `lib/features/auth/presentation/pages/email_register_page.dart:135` | HIGH | Giống hệt trên: `e.response?.data["response"]["responseMessage"]` trong xử lý lỗi đăng ký → văng khi body lỗi không phải JSON, người dùng không thấy báo lỗi. | Như trên: kiểm tra `data is Map` và dùng `?[...]` từng tầng. |
| `lib/features/booking/data/models/booking.dart:145,146,164` | HIGH | `DateTime.parse(json['startTime'])`, `endTime`, `createdAt` — parse **bắt buộc**, không guard. Nếu 1 đơn thiếu/sai 1 trong các ngày này → ném lỗi. Vì `BookingList.fromJson` được gọi trong `try/catch` ở màn lịch sử nên **không văng app**, nhưng **toàn bộ danh sách đặt xe biến mất** chỉ vì 1 đơn lỗi. | Dùng `DateTime.tryParse(...) ?? DateTime.now()` (hoặc bỏ qua/đánh dấu đơn lỗi) thay cho `DateTime.parse`; ưu tiên parse từng đơn trong `try` để 1 đơn hỏng không làm hỏng cả danh sách. |
| `lib/features/booking/data/models/license.dart:111,112` | HIGH | `PresignedUrlResponse.fromJson`: `uploadUrl: json['uploadUrl'] as String`, `objectKey: json['objectKey'] as String` — ép kiểu **non-null**. Nếu API thiếu field (hoặc trả null) → ném lỗi khi xin link upload ảnh CCCD/GPLX. Hiện được bọc `try/catch` ở `s3_upload_service` nên thành "upload thất bại" thay vì crash, nhưng vẫn dễ vỡ. | Đổi sang `as String?` + kiểm tra null, hoặc `?? ''` rồi validate trước khi dùng. |
| `lib/core/services/s3_upload_service.dart:47,50,55` | MEDIUM | `presignedResponse.data['response']['responseCode']` và `['result']['data']` đọc lồng nhau không guard từng tầng; `data` ở dòng 55 truyền thẳng vào `PresignedUrlResponse.fromJson` (chỗ ép `as String` ở trên). Nằm trong `try/catch` nên không văng, nhưng thông báo lỗi mơ hồ. | Kiểm tra `presignedResponse.data is Map` và `result?['data'] is Map` trước khi dùng; báo lỗi rõ "API trả dữ liệu không hợp lệ". |
| `lib/features/splash/presentation/pages/splash_page.dart:47` | MEDIUM | `data['response']['responseCode']` không guard tầng `['response']`. Có `try/catch` (rơi về màn Login khi lỗi) nên không crash, nhưng mọi lỗi đều âm thầm về Login. | `(data is Map) ? data['response']?['responseCode'] : null`. |
| `lib/features/splash/presentation/pages/splash_page.dart:53-54,57,61,64` | MEDIUM | Ghi token vào secure storage với giá trị **có thể null** (`newAccessToken`/`newRefreshToken` từ `as String?`), và gọi `Navigator` sau `await` mà **không kiểm tra `mounted` lại** (context dùng qua async gap). | Chỉ ghi khi token khác null; thêm `if (!mounted) return;` trước mỗi lần `Navigator.pushReplacementNamed`. |
| `lib/features/booking/presentation/pages/booking_info_page.dart:127,128` | MEDIUM | `response.data['response']['responseCode']` và `['result']['data']` không guard từng tầng. Nằm trong `try/catch` + có check `mounted` nên không crash, nhưng nếu server trả khác kỳ vọng thì nhảy vào catch và **tính giá im lặng thất bại**. | Guard `response.data is Map` + `?[...]` từng tầng; phân biệt rõ "lỗi mạng" vs "API sai định dạng". |
| `lib/features/booking/presentation/pages/booking_confirm_page.dart:548,550,551,552,570` | MEDIUM | Tạo đơn: `response.data['response']['responseCode']`, `['result']['data']`, rồi `bookingData['bookingCode']`/`['id']` không guard. Có `catch (e)` bao ngoài (dòng 604) nên không văng app, nhưng nếu shape khác → nhảy catch, người dùng thấy lỗi chung dù **đơn có thể đã tạo**. | Guard từng tầng + kiểm tra `bookingData is Map` trước khi đọc `bookingCode`/`id`; nếu thiếu `id` thì không điều hướng sang trang chi tiết với id rỗng. |
| `lib/features/booking/presentation/widgets/booking_infos/booking_info_price.dart:343,345` | LOW | `response.data['response']['responseCode']`, `['result']['data']` không guard. Có `try/catch` (dòng 353, trả `false`) nên an toàn về crash. | Guard cho gọn, tránh nuốt lỗi nhầm thành "chưa có GPLX". |
| `lib/features/account/presentation/pages/identity_page.dart:58` | LOW | `response.data['result']['data']` không guard; nằm trong hàm load có `try/catch`. | Guard `data is Map` trước khi đọc. |
| `lib/features/account/presentation/pages/license_page.dart:67` | LOW | `response.data['result']['data']` không guard; có `try/catch`. | Như trên. |
| `lib/features/booking/presentation/pages/car_listing_page.dart:88-89,507,511` | LOW | `data['result']['items']` / `data['result']['data']` đọc lồng; có check `data is Map && data['result'] != null` ở trên (dòng 86-87) nên tương đối an toàn, nhưng `data['result']['items']` vẫn có thể null nếu `result` không phải Map. | Thêm `data['result'] is Map` trước khi đọc `['items']`/`['data']`. |

## Ghi chú thêm (đã kiểm tra — KHÔNG phải lỗi)

- `time_picker_sheet.dart`, `main.dart`, `booking_info_page.dart` (`late _carDetail`), `booking_info_car.dart` (`late final _car`): các `late` đều được gán đúng 1 lần trong `initState`/khởi tạo → an toàn (chỉ carousel bị gán 2 lần).
- `identity_page.dart` / `license_page.dart`: các `_currentIdentity!` / `_currentLicense!` / `_expiryDate!` / `_frontImage!` đều có kiểm tra null trước đó (validate ở `_submit...`) → an toàn.
- `user_bloc.dart:30` (`jsonDecode` cache user) và `dashboard_page.dart:785` (`DateTime.parse` trong `_formatDate`): đã bọc `try/catch` → an toàn.
- `otp_page.dart:68`: dùng `as Map<String, dynamic>?` (nullable) → an toàn.
- `car_detail_page.dart:11-15`: dùng `as Map<String, dynamic>? ?? {}` → an toàn.

## Khuyến nghị ưu tiên

1. **Sửa ngay** carousel (`booking_info_carousel.dart`) — đây là crash chắc chắn người dùng gặp khi xem xe.
2. **Sửa sớm** 2 chỗ xử lý lỗi đăng nhập/đăng ký — vì rơi đúng lúc server lỗi, người dùng mất phương hướng.
3. Chuyển toàn bộ pattern `data['a']['b']` sang đọc an toàn từng tầng (`?[...]` + kiểm tra `is Map`) và `DateTime.parse` → `tryParse`.
