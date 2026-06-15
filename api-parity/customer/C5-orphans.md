# C5 — Lô bù 12 endpoint backend WEB (đối chiếu Web khách vs App khách)

> Đối chiếu cấp KHÁCH HÀNG giữa web `amazing-xanh-fe` (chuẩn) và app Flutter `booking-car-app`.
> Web gọi qua BFF Next.js (`apiBackendFetch`) hoặc gọi thẳng BE qua `callApi`/`axiosInstance`; endpoint thật resolve qua `apiPathProduction(CONST)`.
> App gọi BE thẳng: `authBaseUrl=.../api/v1/auth`, `bookingBaseUrl=.../api/v1/xanh`.
> responseCode đúng: xanh-service `"00"`.

## Tổng quan

- **Số endpoint quét:** 12 (đủ 12/12).
- **CRITICAL:** 2
- **HIGH:** 3
- **MEDIUM:** 4
- **LOW/OK:** 3

## Bảng đối chiếu

| Hành động | Web (endpoint+method) | App (endpoint+method) | Trạng thái | Mức độ | Ghi chú nghiệp vụ |
|---|---|---|---|---|---|
| Lấy danh sách tài khoản ngân hàng KH | `GET /api/v1/xanh/customer/bank-accounts` (qua BFF `GET /api/profile/bank-account`) | — (không có) | MISSING_IN_APP | MEDIUM | App hoàn toàn không có chức năng tài khoản ngân hàng. Web: `useBankAccount.getMyBankAccount` coi HTTP 404 = chưa đăng ký (empty state), **không kiểm `responseCode`** chỉ dựa HTTP status → thiếu validate responseCode "00". |
| Tạo / lưu tài khoản ngân hàng KH | `POST /api/v1/xanh/customer/bank-accounts` (qua BFF `POST /api/profile/bank-account`, body = `BankAccountRequest`) | — (không có) | MISSING_IN_APP | MEDIUM | Web BFF nhận body object rồi `apiBackendFetch` bọc envelope forward BE. `saveBankAccount` đọc `json.result`, **không kiểm `responseCode`**. App thiếu hẳn. |
| Xoá tài khoản ngân hàng KH | `POST /api/v1/xanh/customer/bank-accounts/delete` (qua BFF `DELETE /api/profile/bank-account`, **không body**) | — (không có) | MISSING_IN_APP | MEDIUM | BFF map HTTP DELETE → BE `POST /delete` không gửi body. `deleteBankAccount` không kiểm `responseCode`. App thiếu. |
| Lấy danh sách khuyến mãi khả dụng | `POST /api/v1/xanh/promotions/available` (envelope `createRequestPayload(data)`, đọc `result.items` + paging) | `GET /promotions` trên **authBaseUrl** → thật ra gọi `GET /api/v1/auth/promotions` (`getAuthDio()`, query `page/limit`) | ENDPOINT_MISMATCH + METHOD_MISMATCH + BODY_MISMATCH (sai base-url) | CRITICAL | App gọi **sai base** (auth thay vì xanh), **sai path** (`/promotions` vs `/promotions/available`), **sai method** (GET+query vs POST+envelope). Endpoint này gần như chắc chắn 404/lỗi trên app → màn KM hỏng. App chỉ kiểm `statusCode==200`, không kiểm `responseCode`. |
| Kiểm tra / áp mã khuyến mãi | `POST /api/v1/xanh/promotions/check` (envelope `PromotionCheckRequest`, đọc `result`) | — (không có) | MISSING_IN_APP | HIGH | App không có luồng kiểm/áp mã giảm giá khi đặt xe → KH app không dùng được mã KM. Web không kiểm `responseCode` (chỉ đọc `result`). |
| Lấy tất cả bài viết (blog) | `POST /api/v1/xanh/posts/get-all` (envelope `BlogRequest`, đọc `result.items[].data` + paging) | `GET /news/available` trên **authBaseUrl** → `GET /api/v1/auth/news/available` (`getAuthDio()`) | ENDPOINT_MISMATCH + METHOD_MISMATCH (sai base-url) | CRITICAL | App dùng MỘT endpoint tin tức cũ `/news/available` sai base (auth) cho toàn bộ tin tức, không khớp bất kỳ endpoint `/posts/*` nào của web. Chắc chắn lỗi → màn tin tức app hỏng. Web đọc `result.items[].data`, không kiểm `responseCode`. |
| Lấy bài viết HOT | `POST /api/v1/xanh/posts/hot-news` (envelope, đọc `result.data[].data`) | — (app gộp tất cả vào `getNews`) | ENDPOINT_MISMATCH | HIGH | App không có endpoint hot riêng; web tách hot/latest/pinned. App chỉ 1 lời gọi tin tức sai base (xem dòng get-all). |
| Lấy bài viết mới nhất | `POST /api/v1/xanh/posts/latest` (envelope, đọc `result[].data`) | — (app gộp vào `getNews`) | ENDPOINT_MISMATCH | MEDIUM | Web có endpoint latest riêng (News.tsx fallback khi không có pinned). App không có endpoint tương ứng. |
| Lấy bài viết đang ghim (pinned) | `POST /api/v1/xanh/posts/pinned` (envelope `{}`, đọc `result[].data`) — gọi qua `axiosInstance` trong `News.tsx` | — (không có) | MISSING_IN_APP | LOW | Tính năng ghim bài trang chủ chỉ web có; app không có khái niệm pinned. Web `News.tsx` fallback sang `/latest` nếu pinned rỗng. |
| Lấy bài viết theo path (SEO custom URL) | `POST /api/v1/xanh/posts/by-path` (gọi thẳng BE trong `middleware.ts`, body `{ data: { path } }`, đọc `result.post`) | — (không có) | MISSING_IN_APP | LOW | Dùng cho rewrite/redirect SEO của web (middleware). App không có routing custom URL → không cần. Web không kiểm `responseCode`, chỉ `res.ok`. |
| Lấy nội dung trang công khai (page_contents) | `POST /api/v1/xanh/page-contents/list` (public, envelope `{ pageKey }`, đọc `result[]`) | — (không có) | MISSING_IN_APP | MEDIUM | App không lấy nội dung động trang (home/about) từ page_contents. Web `getPublicPageContent` nuốt lỗi trả `[]`, không kiểm `responseCode`. |
| Lấy cấu hình site công khai (site_settings) | `POST /api/v1/xanh/site-settings/list` (public, envelope `{}`, đọc `result[]`) | — (không có) | MISSING_IN_APP | MEDIUM | App không đọc site_settings (hotline, mạng xã hội, cấu hình hiển thị...) từ BE. Web `getPublicSiteSettings` nuốt lỗi trả `[]`, không kiểm `responseCode`. |

## Ghi chú chung

- **Không phía nào (web hay app) kiểm `responseCode == "00"`** cho 12 endpoint này: web đọc thẳng `result`/dựa HTTP status; app chỉ kiểm `statusCode == 200`. → rủi ro MEDIUM xuyên suốt: BE trả HTTP 200 nhưng `responseCode` lỗi vẫn bị coi là thành công.
- **Hai lỗi CRITICAL** đều do app gọi **sai base-url (`authBaseUrl` thay vì `bookingBaseUrl`)** cộng sai path/method cho khuyến mãi và tin tức (`getPromotions`, `getNews` đều dùng `getAuthDio()`).
- Toàn bộ nhóm bank-accounts, promotions/check, page-contents, site-settings **thiếu hẳn trong app**.
</content>
</invoke>
