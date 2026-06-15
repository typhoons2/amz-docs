# Doi chieu API + nghiep vu — LO 08-report (Bao cao)

## Tom tat

- **So route web da quet:** 7 (toan bo trong `amazing-xanh-admin-fe/src/app/api/report/`)
- **So dong CRITICAL:** 0
- **So dong HIGH:** 7 (toan bo chuc nang bao cao tren web KHONG ton tai tren app)
- **Ket luan chinh:** Man hinh "Bao cao & Thong ke" cua app Flutter (`reports_screen.dart`) hien la **giao dien tinh, du lieu gia (hardcode)** — khong goi bat ky API backend nao. Khong co file service nao trong `lib/features/reports/`, khong co endpoint bao cao nao trong `lib/core/api.dart`. Toan bo nghiep vu bao cao (doanh thu, trang thai booking, doanh thu khach, fill-rate, loi nhuan thue, chi phi) chi co tren web.

## Bang doi chieu

| Hanh dong | Web (endpoint + method) | App (endpoint + method) | Trang thai | Muc do | Ghi chu nghiep vu |
|-----------|-------------------------|-------------------------|------------|--------|-------------------|
| Bao cao danh sach booking (loc theo trang thai) | `POST /api/v1/xanh/admin/bookings/search` (qua `BOOKING.GET_ALL`) | (khong co) | MISSING_IN_APP | HIGH | Web nhan `status` dang chuoi roi map sang so (pending=1, confirmed=2, ongoing=3, completed=4, cancelled=5, refund_pending=6, incident=7, seized=8). Truong hop dac biet: `status="overdue"` -> xoa `status`, set `isOverdue=true` (backend khong co status overdue). App khong co man hinh nay -> mat hoan toan kha nang loc bao cao theo trang thai/qua han. |
| Dem so luong booking theo tung trang thai | `GET /api/v1/xanh/admin/bookings/status-counts` (qua `BOOKING.STATUS_COUNTS`) | (khong co) | MISSING_IN_APP | HIGH | Web chuyen tiep query string xuong backend de dem so booking moi trang thai. App hien thi so lieu chuyen di (1.234, hoan thanh 93.7%...) deu la so gia, khong goi API nay. |
| Bao cao doanh thu theo khach hang | `POST /api/v1/xanh/admin/reports/customer-revenue` (qua `REPORT.CUSTOMER_REVENUE`) | (khong co) | MISSING_IN_APP | HIGH | Web forward nguyen body (khoang ngay/loc) xuong backend. App khong co. |
| Bao cao chi phi (expense) | `POST /api/v1/xanh/admin/reports/revenue/expense` (ghep tu `REPORT.REVENUE` + "/expense") | (khong co) | MISSING_IN_APP | HIGH | Web forward nguyen body. App khong co muc chi phi nao that su goi API (chi hien "CO2 tiet kiem" gia). |
| Bao cao loi nhuan thue xe (rental profit) | `POST /api/v1/xanh/admin/reports/rental-profit` (chuoi literal trong route) | (khong co) | MISSING_IN_APP | HIGH | Endpoint hardcode truc tiep trong route.ts, khong qua hang so. Web forward nguyen body. App thieu toan bo bao cao loi nhuan -> dung canh bao trong de bai (app co the thieu toan bo). |
| Bao cao doanh thu (tong) | `POST /api/v1/xanh/admin/reports/revenue` (qua `REPORT.REVENUE`) | (khong co) | MISSING_IN_APP | HIGH | Web forward nguyen body (khoang ngay). App co "Bieu do doanh thu" nhung cac cot bieu do la gia tri co dinh (0.6/0.8/0.5...), khong goi API. |
| Bao cao ty le lap day xe (fill-rate) | `POST /api/v1/xanh/admin/reports/fill-rate` (qua `REPORT.FILL_RATE`) | (khong co) | MISSING_IN_APP | HIGH | Web forward nguyen body. App khong co. |

## Ghi chu ky thuat (responseCode)

- **Tat ca 7 route web:** chi kiem tra `response.ok` (HTTP status), **KHONG kiem tra `responseCode === "00"`** o lop BFF. Day la lop chuyen tiep (proxy) — viec verify responseCode duoc day cho phia FE component goi route. Khong phai loi nghiem trong o lop nay, nhung khac voi mot so route nghiep vu khac co check responseCode.
- **App:** khong co loi goi API nao -> khong co cho nao verify responseCode (vi khong goi backend).

## Khuyen nghi

App dang dung man hinh bao cao "trang tri" (UI demo). Neu can dong bo voi web, app phai bo sung toan bo 7 endpoint bao cao tren. Hien tat ca so lieu app hien thi la **gia**, de gay hieu nham cho nguoi dung (tuong day la so that). Day la rui ro nghiep vu HIGH: lanh dao xem app co the ra quyet dinh dua tren so lieu khong co that.
