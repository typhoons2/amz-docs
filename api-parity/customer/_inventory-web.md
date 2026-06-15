# Danh muc endpoint backend - WEB khach (amazing-xanh-fe)

> Nguon quet: `amazing-xanh-fe/src/app/api/**/route.ts` (BFF, da resolve endpoint that qua `apiPathProduction(CONST.X)` + `constants/api.ts`) VA cac service goi backend TRUC TIEP qua `axiosInstance` (base = gateway `https://api-portal.amzholdings.vn`).
> Ngay quet: 2026-06-07. responseCode dung: xanh-service = "00", auth-service = "200".
>
> 2 kieu goi:
> - **BFF**: UI -> route Next.js `/api/...` -> backend that (cot "File" tro vao route.ts). Method o cot la method UI->backend that.
> - **Truc tiep**: UI -> backend that (qua `axiosInstance`/`fetch`), khong qua BFF (cot "File" tro vao service/component).
>
> Cac endpoint admin (khu /admin trong web khach) la **web-only** (app khach khong co). Danh dau ro o cot Hanh dong.

## A. Endpoint goi qua BFF route (UI -> /api/... -> backend)

| Endpoint that (backend) | Method | Hanh dong nghiep vu | File (route BFF) |
|---|---|---|---|
| /api/v1/auth/login | POST | Khach dang nhap (email/mat khau) | src/app/api/auth/login/route.ts |
| /api/v1/auth/google-login | POST | Khach dang nhap bang Google | src/app/api/auth/login-google/route.ts |
| /api/v1/auth/logout | POST | Khach dang xuat | src/app/api/auth/logout/route.ts |
| /api/v1/auth/refresh-token | POST | Lam moi access token (khach) | src/app/api/auth/refresh/route.ts |
| /api/v1/auth/profile | GET | Lay thong tin tai khoan dang dang nhap (khach) | src/app/api/auth/me/route.ts |
| /api/v1/auth/change-password | POST | Khach doi mat khau | src/app/api/auth/change-password/route.ts |
| /api/v1/xanh/bookings/create | POST | Khach tao don thue xe | src/app/api/booking/route.ts |
| /api/v1/xanh/bookings/my-history | POST | Khach xem lich su don thue cua minh | src/app/api/profile/booking-history/list/route.ts |
| /api/v1/xanh/bookings/detail | POST | Khach xem chi tiet 1 don thue | src/app/api/profile/booking-history/detail/route.ts |
| /api/v1/xanh/customers/profile | GET | Lay thong tin ho so khach | src/app/api/profile/profile-information/route.ts |
| /api/v1/xanh/customers/profile | POST | Cap nhat thong tin ho so khach | src/app/api/profile/update-profile-information/route.ts |
| /api/v1/xanh/customers/identity | GET | Lay thong tin CCCD/CMND khach | src/app/api/profile/identity/get/route.ts |
| /api/v1/xanh/customers/identity | POST | Cap nhat CCCD/CMND khach | src/app/api/profile/identity/update/route.ts |
| /api/v1/xanh/customers/license | GET | Lay thong tin GPLX khach | src/app/api/profile/license/get/route.ts |
| /api/v1/xanh/customers/license | POST | Cap nhat GPLX khach | src/app/api/profile/license/update/route.ts |
| /api/v1/xanh/customer/bank-accounts | GET | Lay tai khoan ngan hang da luu | src/app/api/profile/bank-account/route.ts |
| /api/v1/xanh/customer/bank-accounts | POST | Luu/cap nhat tai khoan ngan hang | src/app/api/profile/bank-account/route.ts |
| /api/v1/xanh/customer/bank-accounts/delete | POST | Xoa tai khoan ngan hang (UI dung verb DELETE, backend nhan POST) | src/app/api/profile/bank-account/route.ts |
| /api/v1/xanh/storage/presigned-url | POST | Xin URL upload anh (khach) | src/app/api/upload/presigned-url/route.ts |

## B. Endpoint admin (web-only) goi qua BFF route

> Khu /admin cua web khach. App khach KHONG co cac hanh dong nay. Dung JWT staff (admin login khac customer login).

| Endpoint that (backend) | Method | Hanh dong nghiep vu | File (route BFF) |
|---|---|---|---|
| /api/v1/auth/admin/login | POST | [web-only] Staff/admin dang nhap | src/app/api/admin/auth/login/route.ts |
| /api/v1/auth/admin/logout | POST | [web-only] Staff/admin dang xuat | src/app/api/admin/auth/logout/route.ts |
| /api/v1/auth/admin/profile | GET | [web-only] Lay ho so staff dang dang nhap | src/app/api/admin/auth/me/route.ts |
| /api/v1/xanh/admin/posts/create | POST | [web-only] Tao bai viet/landing page | src/app/api/admin/posts/create/route.ts |
| /api/v1/xanh/admin/posts/update | POST | [web-only] Sua bai viet/landing page | src/app/api/admin/posts/update/route.ts |
| /api/v1/xanh/admin/posts/delete | POST | [web-only] Xoa bai viet | src/app/api/admin/posts/delete/route.ts |
| /api/v1/xanh/admin/posts/list | POST | [web-only] Danh sach bai viet (admin) | src/app/api/admin/posts/list/route.ts |
| /api/v1/xanh/admin/posts/list | POST | [web-only] Lay danh sach landing page (loc client-side tu posts/list) | src/app/api/admin/posts/landing-pages/route.ts |
| /api/v1/xanh/admin/page-contents/list | POST | [web-only] Lay noi dung trang (home/about) de sua | src/app/api/admin/page-contents/list/route.ts |
| /api/v1/xanh/admin/page-contents/update | POST | [web-only] Cap nhat noi dung section trang | src/app/api/admin/page-contents/update/route.ts |
| /api/v1/xanh/admin/site-settings/list | POST | [web-only] Lay cai dat site | src/app/api/admin/site-settings/list/route.ts |
| /api/v1/xanh/admin/site-settings/update | POST | [web-only] Cap nhat 1 cai dat site | src/app/api/admin/site-settings/update/route.ts |
| /api/v1/xanh/admin/storage/presigned-url | POST | [web-only] Xin URL upload anh (admin) | src/app/api/admin/upload/presigned-url/route.ts |

## C. Endpoint goi TRUC TIEP backend (khong qua BFF, qua axiosInstance/fetch)

> UI goi thang gateway. Khong co route.ts trung gian. Hang so trong `constants/api.ts`.

| Endpoint that (backend) | Method | Hanh dong nghiep vu | File (service/component) |
|---|---|---|---|
| /api/v1/auth/register | POST | Khach dang ky tai khoan | src/services/useAuth.ts |
| /api/v1/auth/forgot-password | POST | Khach yeu cau quen mat khau (gui OTP) | src/services/useAuth.ts |
| /api/v1/auth/verify-otp | POST | Khach xac thuc OTP | src/services/useAuth.ts |
| /api/v1/auth/reset-password | POST | Khach dat lai mat khau | src/services/useAuth.ts |
| /api/v1/xanh/cars/available | POST | Tim xe con trong (danh sach) | src/services/useCar.ts |
| /api/v1/xanh/cars/available-grouped | POST | Tim xe con trong (gom nhom) | src/services/useCar.ts |
| /api/v1/xanh/cars/detail | POST | Xem chi tiet xe theo id | src/services/useCar.ts |
| /api/v1/xanh/cars/check-group-availability | POST | Kiem tra ton kho theo nhom xe | src/services/useCar.ts |
| /api/v1/xanh/bookings/calculate-price | POST | Tinh gia thue xe | src/services/usePrice.ts |
| /api/v1/xanh/stations/search | POST | Lay danh sach diem/tram thue xe | src/services/useLocation.ts |
| /api/v1/xanh/cities | GET | Lay danh sach thanh pho dang hoat dong | src/services/useCity.ts |
| /api/v1/xanh/promotions/available | POST | Lay khuyen mai dang co | src/services/usePromotion.ts |
| /api/v1/xanh/promotions/check | POST | Kiem tra/tinh ma khuyen mai | src/services/usePromotion.ts |
| /api/v1/xanh/posts/get-all | POST | Lay tat ca bai viet (cong khai) + lay related + lay categories | src/services/useBlog.ts, src/services/useCategories.ts |
| /api/v1/xanh/posts/hot-news | POST | Lay bai viet hot | src/services/useBlog.ts |
| /api/v1/xanh/posts/latest | POST | Lay bai viet moi nhat | src/services/useBlog.ts |
| /api/v1/xanh/posts/pinned | POST | Lay bai viet ghim | src/app/components/News.tsx |
| /api/v1/xanh/posts/detail | POST | Lay chi tiet bai viet theo slug (+ render landing page) | src/services/useBlog.ts, src/app/api/landing-content/[slug]/route.ts |
| /api/v1/xanh/posts/by-path | POST | Resolve customUrl/url_history -> slug (middleware SEO rewrite/redirect) | src/middleware.ts |
| /api/v1/xanh/page-contents/list | POST | Lay noi dung trang cong khai (home/about) | src/services/usePageContent.ts |
| /api/v1/xanh/site-settings/list | POST | Lay cai dat site cong khai | src/services/useSiteSettings.ts |

## D. Endpoint KHONG phai backend AMZ (loai khoi doi soat parity)

| URL | Muc dich | File |
|---|---|---|
| https://maps.track-asia.com/api/v2/place/autocomplete/json | Goi y dia chi (ben thu 3 TrackAsia) | src/app/api/map/autocomplete/route.ts |
| https://maps.track-asia.com/api/v2/place/textsearch/json | Tim dia diem (TrackAsia) | src/app/api/map/search/route.ts |
| https://maps.track-asia.com/route/v2/directions/json | Tinh duong di/khoang cach (TrackAsia) | src/app/api/map/directions/route.ts |
| https://api.vietqr.io/v2/banks | Danh sach ngan hang (VietQR) | src/services/useBank.ts |
| Google Apps Script (env BOOKING_SHEET_URL) | Day du lieu booking sang Google Sheet | src/app/api/booking-sheet/route.ts |

## Ghi chu doi soat
- `posts/detail` duoc dung o CA service (`useBlog`) lan route BFF rieng (`landing-content/[slug]`) — cung 1 endpoint, 2 noi goi.
- `customer/bank-accounts/delete`: UI expose method DELETE nhung backend nhan **POST**.
- Cac endpoint trong `constants/api.ts` deu da co noi goi; khong con hang so "mo cua" (khai bao nhung khong dung).
