# Danh muc endpoint backend — WEB Admin (amazing-xanh-admin-fe)

> Thuoc do bao phu (coverage baseline). Web admin dung kien truc BFF: UI goi route noi bo
> Next.js (`src/app/api/**/route.ts`), route do moi forward xuong backend that.
> Cot "Endpoint backend that" la URL backend thuc su (resolve qua `apiPathProduction` +
> hang so trong `src/constants/api.ts` hoac chuoi literal trong route).
>
> Sinh tu: quet toan bo `src/app/api/**/route.ts` + `src/constants/api.ts` +
> grep call truc tiep ngoai `app/api`. Cap nhat: 2026-06-07.

## A. Endpoint backend co route BFF goi (dang dung that)

| Endpoint backend that | Method | Hanh dong (business) | File nguon (route BFF) |
|---|---|---|---|
| /api/v1/auth/admin/login | POST | Dang nhap admin | src/app/api/auth/login/route.ts |
| /api/v1/auth/admin/logout | POST | Dang xuat admin | src/app/api/auth/logout/route.ts |
| /api/v1/auth/admin/refresh-token | POST | Lam moi token (refresh) | src/app/api/auth/refresh/route.ts |
| /api/v1/auth/admin/refresh-token | POST | Lam moi token (redirect flow) | src/app/api/auth/refresh-redirect/route.ts |
| /api/v1/auth/admin/profile | GET | Lay thong tin tai khoan dang nhap | src/app/api/auth/me/route.ts |
| /api/v1/auth/admin/profile/update | POST | Cap nhat ho so ca nhan | src/app/api/account/update-profile/route.ts |
| /api/v1/auth/admin/change-password | POST | Doi mat khau (tu doi) | src/app/api/account/change-password/route.ts |
| /api/v1/auth/admin/admin-reset-password | POST | Admin dat lai mat khau nhan vien | src/app/api/management/staff/change-password/route.ts |
| /api/v1/auth/admin/create-user | POST | Tao tai khoan nhan vien (buoc 1) | src/app/api/management/staff/create/route.ts |
| /api/v1/auth/admin/assign-company | POST | Gan cong ty cho nhan vien (buoc 2) | src/app/api/management/staff/create/route.ts |
| /api/v1/auth/admin/grant-role | POST | Cap quyen/role cho nhan vien | src/app/api/management/staff/update-role/route.ts |
| /api/v1/auth/admin/set-role | POST | Dat role cho nhan vien | src/app/api/management/staff/set-role/route.ts |
| /api/v1/auth/admin/roles | GET | Lay danh sach role | src/app/api/management/staff/roles/route.ts |
| /api/v1/auth/admin/users/batch-roles | POST | Lay role hang loat cho danh sach nhan vien | src/app/api/management/staff/search/route.ts |
| /api/v1/xanh/admin/storage/presigned-url | POST | Xin URL upload anh len S3 (presigned) | src/app/api/upload/presigned-url/route.ts |
| /api/v1/xanh/admin/storage/presigned-url | POST | Xin URL upload (luong onlyoffice) | src/app/api/onlyoffice/callback/route.ts |
| /api/v1/xanh/admin/stations/search | POST | Tim/liet ke ben xe (station) | src/app/api/management/location/search/route.ts |
| /api/v1/xanh/admin/stations/detail | POST | Chi tiet ben xe | src/app/api/management/location/detail/route.ts |
| /api/v1/xanh/admin/stations/create | POST | Tao ben xe | src/app/api/management/location/create/route.ts |
| /api/v1/xanh/admin/stations/update | POST | Cap nhat ben xe | src/app/api/management/location/update/route.ts |
| /api/v1/xanh/admin/stations/delete | POST | Xoa ben xe | src/app/api/management/location/delete/route.ts |
| /api/v1/xanh/admin/stations/export-excel | POST | Xuat Excel danh sach ben xe | src/app/api/management/location/export-excel/route.ts |
| /api/v1/xanh/admin/cities/search | POST | Tim/liet ke thanh pho | src/app/api/management/city/search/route.ts |
| /api/v1/xanh/admin/cities/detail | POST | Chi tiet thanh pho | src/app/api/management/city/detail/route.ts |
| /api/v1/xanh/admin/cities/create | POST | Tao thanh pho | src/app/api/management/city/create/route.ts |
| /api/v1/xanh/admin/cities/update | POST | Cap nhat thanh pho | src/app/api/management/city/update/route.ts |
| /api/v1/xanh/admin/cities/delete | POST | Xoa thanh pho | src/app/api/management/city/delete/route.ts |
| /api/v1/xanh/admin/cities/export-excel | POST | Xuat Excel thanh pho | src/app/api/management/city/export-excel/route.ts |
| /api/v1/xanh/admin/cars/search | POST | Tim/liet ke xe | src/app/api/management/car/search/route.ts |
| /api/v1/xanh/admin/cars/detail | POST | Chi tiet xe | src/app/api/management/car/detail/route.ts |
| /api/v1/xanh/admin/cars/create | POST | Tao xe | src/app/api/management/car/create/route.ts |
| /api/v1/xanh/admin/cars/update | POST | Cap nhat xe | src/app/api/management/car/update/route.ts |
| /api/v1/xanh/admin/cars/update-legal-maintenance | POST | Cap nhat phap ly/bao duong cua xe | src/app/api/management/car/update-legal-maintenance/route.ts |
| /api/v1/xanh/admin/cars/delete | POST | Xoa xe | src/app/api/management/car/delete/route.ts |
| /api/v1/xanh/admin/cars/search/schedule | POST | Lay lich su dung xe (schedule) | src/app/api/schedule/get/route.ts |
| /api/v1/xanh/admin/bookings/search | POST | Tim/liet ke hop dong thue | src/app/api/booking/contract/get-all/route.ts |
| /api/v1/xanh/admin/bookings/search | POST | Lay danh sach booking cho bao cao | src/app/api/report/booking-list/route.ts |
| /api/v1/xanh/admin/bookings/detail | POST | Chi tiet hop dong | src/app/api/booking/contract/detail/route.ts |
| /api/v1/xanh/admin/bookings/detail | POST | Lay chi tiet booking (luong tai khoan ngan hang KH) | src/app/api/booking/customer-bank-account/route.ts |
| /api/v1/xanh/admin/bookings/create | POST | Tao hop dong | src/app/api/booking/contract/create/route.ts |
| /api/v1/xanh/admin/bookings/create-with-surcharges | POST | Tao hop dong kem phu phi | src/app/api/booking/contract/create-with-extras/route.ts |
| /api/v1/xanh/admin/bookings/update-status | POST | Cap nhat trang thai hop dong | src/app/api/booking/contract/update-status/route.ts |
| /api/v1/xanh/admin/bookings/update-general | POST | Cap nhat thong tin chung hop dong | src/app/api/booking/contract/update-general/route.ts |
| /api/v1/xanh/admin/booking-logs/get | POST | Lay nhat ky thao tac hop dong | src/app/api/booking/booking-logs/get/route.ts |
| /api/v1/xanh/admin/bookings/finish | POST | Ket thuc/tat toan hop dong | src/app/api/booking/contract/finish/route.ts |
| /api/v1/xanh/admin/bookings/update-documents | POST | Upload chung tu hop dong | src/app/api/booking/contract/upload-document/route.ts |
| /api/v1/xanh/admin/bookings/search/delivery-receive | POST | Tim hop dong de giao/nhan xe | src/app/api/booking/delivery/search/route.ts |
| /api/v1/xanh/admin/bookings/perform-delivery | POST | Thuc hien giao xe | src/app/api/booking/delivery/perform/route.ts |
| /api/v1/xanh/admin/bookings/perform-receive | POST | Thuc hien nhan xe | src/app/api/booking/receive/perform/route.ts |
| /api/v1/xanh/admin/bookings/extend | POST | Gia han hop dong | src/app/api/booking/extend/create/route.ts |
| /api/v1/xanh/admin/bookings/confirm-refund | POST | Xac nhan hoan tien | src/app/api/booking/contract/confirm-refund/route.ts |
| /api/v1/xanh/admin/bookings/pre-payment | POST | Thanh toan truoc (dat coc/tra truoc) | src/app/api/booking/contract/pre-payment/route.ts |
| /api/v1/xanh/admin/bookings/print-data | POST | Lay du lieu in hop dong | src/app/api/booking/contract/print/route.ts |
| /api/v1/xanh/admin/bookings/print-google-doc | POST | In hop dong qua Google Doc | src/app/api/booking/contract/print-google-doc/route.ts |
| /api/v1/xanh/admin/bookings/print-contract-pdf | POST | In hop dong PDF | src/app/api/booking/contract/print-contract-pdf/route.ts |
| /api/v1/xanh/admin/bookings/status-counts | GET | Dem so luong hop dong theo trang thai | src/app/api/report/booking-status/route.ts |
| /api/v1/xanh/admin/bookings/suggested-surcharges | POST | Goi y phu phi cho hop dong | src/app/api/booking/contract/suggested-surcharges/route.ts |
| /api/v1/xanh/admin/bookings/export-excel | POST | Xuat Excel danh sach hop dong | src/app/api/booking/contract/export-excel/route.ts |
| /api/v1/xanh/admin/bookings/change-car | POST | Doi xe trong hop dong | src/app/api/booking/contract/change-car/route.ts |
| /api/v1/xanh/admin/bookings/change-car/deliver | POST | Giao xe sau khi doi xe | src/app/api/booking/contract/change-car/deliver/route.ts |
| /api/v1/xanh/admin/bookings/add-surcharge | POST | Them phu phi vao hop dong | src/app/api/finance/surcharge/create/route.ts |
| /api/v1/xanh/admin/bookings/remove-surcharge | POST | Xoa phu phi khoi hop dong | src/app/api/finance/surcharge/delete/route.ts |
| /api/v1/xanh/admin/configs/surcharges | GET | Lay danh sach phu phi dang ap dung | src/app/api/finance/surcharge/get/route.ts |
| /api/v1/xanh/admin/customers/search | POST | Tim/liet ke khach hang | src/app/api/list/customer/search/route.ts |
| /api/v1/xanh/admin/customers/detail | POST | Chi tiet khach hang | src/app/api/list/customer/detail/route.ts |
| /api/v1/xanh/admin/customers/create | POST | Tao khach hang | src/app/api/list/customer/create/route.ts |
| /api/v1/xanh/admin/customers/update | POST | Cap nhat khach hang | src/app/api/list/customer/update/route.ts |
| /api/v1/xanh/admin/customers/delete | POST | Xoa khach hang | src/app/api/list/customer/delete/route.ts |
| /api/v1/xanh/admin/customers/identity/update | POST | Cap nhat CCCD khach hang | src/app/api/list/customer/identity/update/route.ts |
| /api/v1/xanh/admin/customers/identity/detail | POST | Chi tiet CCCD khach hang | src/app/api/list/customer/identity/detail/route.ts |
| /api/v1/xanh/admin/customers/identity/reject | POST | Tu choi xet duyet CCCD | src/app/api/list/customer/identity/reject/route.ts |
| /api/v1/xanh/admin/customers/license/update | POST | Cap nhat GPLX khach hang | src/app/api/list/customer/license/update/route.ts |
| /api/v1/xanh/admin/customers/license/detail | POST | Chi tiet GPLX khach hang | src/app/api/list/customer/license/detail/route.ts |
| /api/v1/xanh/admin/customers/license/reject | POST | Tu choi xet duyet GPLX | src/app/api/list/customer/license/reject/route.ts |
| /api/v1/xanh/admin/customers/kyc/pending | POST | Danh sach KYC cho duyet | src/app/api/list/customer/kyc/pending/route.ts |
| /api/v1/xanh/admin/customers/ocr/cccd | POST | Quet CCCD (OCR, khong luu) | src/app/api/list/customer/ocr/cccd/route.ts |
| /api/v1/xanh/admin/customers/bank-accounts/detail | POST | Chi tiet tai khoan ngan hang khach hang | src/app/api/booking/customer-bank-account/route.ts |
| /api/v1/xanh/admin/configs/rent-services | GET | Lay danh sach dich vu thue | src/app/api/management/service/get-all/route.ts |
| /api/v1/xanh/admin/users/search | POST | Tim/liet ke nhan vien | src/app/api/management/staff/search/route.ts |
| /api/v1/xanh/admin/users/detail | POST | Chi tiet nhan vien | src/app/api/management/staff/detail/route.ts |
| /api/v1/xanh/admin/users/create | POST | Tao ho so nhan vien (xanh-service, buoc 3) | src/app/api/management/staff/create/route.ts |
| /api/v1/xanh/admin/users/update | POST | Cap nhat nhan vien | src/app/api/management/staff/update/route.ts |
| /api/v1/xanh/admin/users/deactivate | POST | Vo hieu hoa nhan vien | src/app/api/management/staff/deactivate/route.ts |
| /api/v1/xanh/admin/users/reactivate | POST | Kich hoat lai nhan vien | src/app/api/management/staff/reactivate/route.ts |
| /api/v1/xanh/admin/configs/bank-accounts | GET | Lay danh sach tai khoan ngan hang cong ty | src/app/api/management/bank/get-all/route.ts |
| /api/v1/xanh/admin/transactions/create | POST | Tao phieu thu/chi | src/app/api/finance/transaction/create/route.ts |
| /api/v1/xanh/admin/configs/transaction-categories | GET | Lay danh muc loai giao dich | src/app/api/finance/transaction/category/route.ts |
| /api/v1/xanh/admin/transactions/search | POST | Tim/liet ke giao dich | src/app/api/finance/transaction/search/route.ts |
| /api/v1/xanh/admin/transactions/void | POST | Huy/xoa giao dich | src/app/api/finance/transaction/delete/route.ts |
| /api/v1/xanh/admin/transactions/export-excel | POST | Xuat Excel giao dich | src/app/api/finance/transaction/export-excel/route.ts |
| /api/v1/xanh/admin/configs/car-specifications | GET | Lay thong so ky thuat xe (config) | src/app/api/management/config/car-specifications/route.ts |
| /api/v1/xanh/admin/traffic-violations/search | POST | Tim/liet ke vi pham giao thong | src/app/api/management/traffic-violation/search/route.ts |
| /api/v1/xanh/admin/traffic-violations/search | POST | Thong bao vi pham giao thong (notification) | src/app/api/notification/traffic-violation/route.ts |
| /api/v1/xanh/admin/maintenance/search | POST | Tim/liet ke bao duong | src/app/api/management/maintenance/search/route.ts |
| /api/v1/xanh/admin/maintenance/create | POST | Tao phieu bao duong | src/app/api/management/maintenance/create/route.ts |
| /api/v1/xanh/admin/maintenance/update | POST | Cap nhat bao duong | src/app/api/management/maintenance/update/route.ts |
| /api/v1/xanh/admin/maintenance/delete | POST | Xoa bao duong | src/app/api/management/maintenance/delete/route.ts |
| /api/v1/xanh/admin/maintenance/detail | POST | Chi tiet bao duong | src/app/api/management/maintenance/detail/route.ts |
| /api/v1/xanh/admin/maintenance/configs/partners | GET | Lay danh sach doi tac bao duong | src/app/api/management/maintenance/configs/partners/route.ts |
| /api/v1/xanh/admin/maintenance/configs/maintenance-categories | GET | Lay danh muc loai bao duong | src/app/api/management/maintenance/configs/maintenance-categories/route.ts |
| /api/v1/xanh/admin/promotions/search | POST | Tim/liet ke khuyen mai | src/app/api/management/promotion/search/route.ts |
| /api/v1/xanh/admin/promotions/create | POST | Tao khuyen mai | src/app/api/management/promotion/create/route.ts |
| /api/v1/xanh/admin/promotions/update | POST | Cap nhat khuyen mai | src/app/api/management/promotion/update/route.ts |
| /api/v1/xanh/admin/promotions/delete | POST | Xoa khuyen mai | src/app/api/management/promotion/delete/route.ts |
| /api/v1/xanh/admin/promotions/detail | POST | Chi tiet khuyen mai | src/app/api/management/promotion/detail/route.ts |
| /api/v1/xanh/admin/reports/revenue | POST | Bao cao doanh thu | src/app/api/report/revenue/route.ts |
| /api/v1/xanh/admin/reports/revenue/expense | POST | Bao cao chi phi (revenue + /expense) | src/app/api/report/expense/route.ts |
| /api/v1/xanh/admin/reports/customer-revenue | POST | Bao cao doanh thu theo khach hang | src/app/api/report/customer-revenue/route.ts |
| /api/v1/xanh/admin/reports/fill-rate | POST | Bao cao ty le lap day (fill-rate) | src/app/api/report/fill-rate/route.ts |
| /api/v1/xanh/admin/reports/rental-profit | POST | Bao cao loi nhuan cho thue | src/app/api/report/rental-profit/route.ts |
| /api/v1/xanh/admin/contract-templates/list | GET | Lay danh sach mau hop dong | src/app/api/setting/get-all/route.ts |
| /api/v1/xanh/admin/contract-templates/create | POST | Tao mau hop dong | src/app/api/setting/create/route.ts |
| /api/v1/xanh/admin/contract-templates/update | POST | Cap nhat mau hop dong | src/app/api/setting/update/route.ts |
| /api/v1/xanh/admin/contract-templates/update | POST | Cap nhat mau (luong onlyoffice callback) | src/app/api/onlyoffice/callback/route.ts |
| /api/v1/xanh/admin/contract-templates/delete | POST | Xoa mau hop dong | src/app/api/setting/delete/route.ts |
| /api/v1/xanh/admin/contract-templates/detail | POST | Chi tiet mau hop dong | src/app/api/setting/detail/route.ts |
| /api/v1/xanh/admin/configs/contract-template-types | GET | Lay loai mau hop dong | src/app/api/setting/get-category/route.ts |
| /api/v1/xanh/admin/google/status | GET | Trang thai ket noi Google | src/app/api/setting/google/status/route.ts |
| /api/v1/xanh/admin/google/connect | GET | Ket noi Google (OAuth) | src/app/api/setting/google/connect/route.ts |
| /api/v1/xanh/admin/configs/cross-region-fees/search | POST | Tim phi lien vung | src/app/api/setting/cross-region-fee/search/route.ts |
| /api/v1/xanh/admin/configs/cross-region-fees/create | POST | Tao phi lien vung | src/app/api/setting/cross-region-fee/create/route.ts |
| /api/v1/xanh/admin/configs/cross-region-fees/update | POST | Cap nhat phi lien vung | src/app/api/setting/cross-region-fee/update/route.ts |
| /api/v1/xanh/admin/configs/cross-region-fees/delete | POST | Xoa phi lien vung | src/app/api/setting/cross-region-fee/delete/route.ts |
| /api/v1/xanh/admin/notifications/birthdays | GET | Thong bao sinh nhat khach hang | src/app/api/notification/birthday/route.ts |
| /api/v1/xanh/admin/notifications/maintenance-due | GET | Thong bao xe den han bao duong | src/app/api/notification/maintenance-due/route.ts |

## B. Endpoint khai bao trong constants/api.ts NHUNG chua thay route BFF goi

| Endpoint backend that | Hang so | Ghi chu |
|---|---|---|
| /api/v1/xanh/bookings/lookup | BOOKING.BOOKING_LOCKUP | Da comment trong constants, khong dung |

## C. Route BFF KHONG goi backend that (chi xu ly noi bo)

| File nguon | Ghi chu |
|---|---|
| src/app/api/onlyoffice/prepare/route.ts | Tai file template ve `public/uploads` (luu local), khong goi backend xanh |
| src/app/api/onlyoffice/config/route.ts | Sinh config + JWT cho OnlyOffice editor, khong goi backend xanh |

## Ket luan

- Tong endpoint backend that (loai trung, da nhom o muc A): 105
- Tat ca call backend deu di qua lop BFF (`src/app/api/**`). Khong tim thay call truc tiep
  `/api/v1` tu `features/components/hooks/services` (chi co dinh nghia helper `apiBackendFetch`,
  `localBeFetch`).
- Endpoint auth dung `/api/v1/auth/admin/**` (internal-auth-service, success code "200");
  endpoint nghiep vu dung `/api/v1/xanh/admin/**` (xanh-service, success code "00").
