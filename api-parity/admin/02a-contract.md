# Doi chieu API + nghiep vu — LO 02a: Hop dong (Contract)

> Pham vi Web: tat ca route.ts trong `amazing-xanh-admin-fe/src/app/api/booking/contract/**`
> Pham vi App: `amz_xanh_admin_app/lib/features/contracts`, `.../features/bookings/services`, endpoint o `lib/core/api.dart`

## Tom tat

- **So route web da quet: 17** (create, create-with-extras, update-general, update-status, confirm-refund, finish, detail, get-all, print, print-contract-pdf, print-google-doc, suggested-surcharges, upload-document, pre-payment, change-car, change-car/deliver, export-excel)
- **CRITICAL: 0**
- **HIGH: 9** (cac hanh dong nghiep vu chinh app KHONG co: tao hop dong, tao kem phu thu, sua thong tin, doi trang thai, in PDF, in Google Doc, upload tai lieu, thu truoc - pre-payment, doi xe van phong, doi xe hien truong, goi y phu thu)
- **MEDIUM: 2** (in du lieu hop dong, xuat Excel — tien ich, app khong co)
- **OK / MATCH: 3** (detail, get-all/danh sach, confirm-refund)

### Ghi chu chung ve kien truc
- **Web (BFF):** Moi route.ts chi la lop trung gian, forward thang `body` xuong backend that, KHONG kiem `responseCode` o tang BFF (viec kiem `responseCode == "00"` lam o phia client/browser). Day la dung thiet ke.
- **App (Flutter):** Goi backend that TRUC TIEP. **App CHI kiem `response.statusCode == 200` (HTTP status), TUYET DOI KHONG kiem `responseCode == "00"`** o bat ky service hop dong/booking nao (chi auth + banners moi kiem responseCode). => Rui ro: backend tra HTTP 200 nhung `responseCode != "00"` (loi nghiep vu) thi app van coi la **thanh cong** → sai du lieu nguoi dung nhin thay. Day la lech he thong, danh dau MEDIUM tren cac dong app co goi.
- **Endpoint that** cua tat ca route web deu la `/api/v1/xanh/admin/bookings/...` (resolve qua hang so `BOOKING` trong `src/constants/api.ts`), tru change-car dung literal.

## Bang doi chieu

| Hanh dong | Web (endpoint + method) | App (endpoint + method) | Trang thai | Muc do | Ghi chu nghiep vu |
|-----------|--------------------------|--------------------------|------------|--------|-------------------|
| Xem danh sach hop dong | POST `/api/v1/xanh/admin/bookings/search` (BOOKING.GET_ALL) | POST `/api/v1/xanh/admin/bookings/search` (ApiEndpoints.getBooking) | MATCH | OK | App goi dung endpoint+method. Body deu boc `{requestId, requestTime, data:{page,size,keyword,status,carId,startDate,endDate,...}}`. App them filter `isOverdue` (web get-all chi forward body tho). App chi kiem HTTP 200, khong kiem responseCode. |
| Xem chi tiet hop dong | POST `/api/v1/xanh/admin/bookings/detail` (BOOKING.DETAIL) | POST `/api/v1/xanh/admin/bookings/detail` (ApiEndpoints.contractDetail) | MATCH | OK | Khop endpoint+method. Body `{data:{id}}`. Luu y app `ContractService` gui `id` la **int**, con `BookingAdminService.getDetail` gui `id` la **String** (bookingId) — khac kieu nhung cung field; backend thuong nhan ca hai. App khong kiem responseCode. |
| Tao hop dong moi | POST `/api/v1/xanh/admin/bookings/create` (BOOKING.CREATE) | (khong co) | MISSING_IN_APP | HIGH | Web cho tao hop dong moi; app khong co man tao hop dong. |
| Tao hop dong kem phu thu + chi phi (atomic) | POST `/api/v1/xanh/admin/bookings/create-with-surcharges` (BOOKING.CREATE_WITH_SURCHARGES) | (khong co) | MISSING_IN_APP | HIGH | Web tao hop dong + surcharges + expenses trong 1 request. App khong co. |
| Sua thong tin chung hop dong | POST `/api/v1/xanh/admin/bookings/update-general` (BOOKING.UPDATE_GENERAL) | (khong co) | MISSING_IN_APP | HIGH | Web cho sua thong tin chung. App khong co chuc nang sua hop dong. |
| Doi trang thai hop dong | POST `/api/v1/xanh/admin/bookings/update-status` (BOOKING.UPDATE_STATUS) | (khong co) | MISSING_IN_APP | HIGH | Web cho chuyen trang thai don. App khong co goi update-status (luu y: app van co perform-delivery/perform-receive/finish/extend la cac hanh dong chuyen trang thai chuyen biet, nhung khong co update-status tong quat). |
| Xac nhan hoan coc (refund) | POST `/api/v1/xanh/admin/bookings/confirm-refund` (BOOKING.CONFIRM_REFUND) | POST `/api/v1/xanh/admin/bookings/confirm-refund` (ApiEndpoints.bookingConfirmRefund) | MATCH | MEDIUM | Khop endpoint+method. App `BookingAdminService.confirmRefund(payload)` boc `{data: payload}`. Web forward body tho. Khac biet duy nhat: app khong kiem responseCode (chi HTTP 200) → neu BE tra 200 + loi nghiep vu, app bao "thanh cong" sai. La tien lien quan (refund) nen nang len MEDIUM. |
| Quyet toan / dong hop dong (finish) | POST `/api/v1/xanh/admin/bookings/finish` (BOOKING.FINISH) | POST `/api/v1/xanh/admin/bookings/finish` (ApiEndpoints.bookingFinish) | MATCH | MEDIUM | Khop endpoint+method. App `BookingAdminService.finish(payload)` boc `{data: payload}`. App khong kiem responseCode (chi HTTP 200). Day la buoc tat toan tien — neu BE tra 200 + responseCode loi, app coi nham la xong. |
| Goi y phu thu (suggested surcharges) | POST `/api/v1/xanh/admin/bookings/suggested-surcharges` (BOOKING.SUGGESTED_SURCHARGES) | (khong co) | MISSING_IN_APP | HIGH | Web co API goi y phu thu khi tao/quyet toan. App khong goi suggested-surcharges. App co getSurchargeConfigs (GET `/configs/surcharges`) — la danh muc ly do phu thu, KHAC voi goi y phu thu theo booking. |
| Tai len tai lieu hop dong | POST `/api/v1/xanh/admin/bookings/update-documents` (BOOKING.UPLOAD_DOCUMENT) | (khong co) | MISSING_IN_APP | HIGH | Web cho upload tai lieu (cap nhat documents cua booking). App khong co. |
| Thu truoc (pre-payment) | POST `/api/v1/xanh/admin/bookings/pre-payment` (BOOKING.PRE_PAYMENT) | (khong co) | MISSING_IN_APP | HIGH | Web cho ghi nhan thanh toan truoc. App khong co goi pre-payment. |
| Doi xe (van phong) | POST `/api/v1/xanh/admin/bookings/change-car` (literal) | (khong co) | MISSING_IN_APP | HIGH | Web co flow doi xe tai van phong. App khong co goi change-car. |
| Doi xe (hien truong / giao xe) | POST `/api/v1/xanh/admin/bookings/change-car/deliver` (literal) | (khong co) | MISSING_IN_APP | HIGH | Web co flow doi xe hien truong. App `delivery_receive` chi co perform-delivery/perform-receive, KHONG co change-car/deliver. |
| In hop dong (lay du lieu in) | POST `/api/v1/xanh/admin/bookings/print-data` (BOOKING.PRINT_DATA) | (khong co) | MISSING_IN_APP | MEDIUM | Web lay du lieu de render ban in. App khong co chuc nang in. Tien ich → MEDIUM. |
| In hop dong PDF (Google Docs template) | POST `/api/v1/xanh/admin/bookings/print-contract-pdf` (BOOKING.PRINT_CONTRACT_PDF) | (khong co) | MISSING_IN_APP | HIGH | Web tao PDF hop dong tu template Google Docs (tra binary PDF). App khong co. La ban in hop dong chinh thuc → HIGH. |
| In hop dong qua Google Doc | POST `/api/v1/xanh/admin/bookings/print-google-doc` (BOOKING.PRINT_GOOGLE_DOC) | (khong co) | MISSING_IN_APP | HIGH | Web xuat hop dong sang Google Doc. App khong co. |
| Xuat Excel danh sach hop dong | POST `/api/v1/xanh/admin/bookings/export-excel` (BOOKING.EXPORT_EXCEL, qua localBeFetch) | (khong co) | MISSING_IN_APP | MEDIUM | Web xuat file .xlsx danh sach. App khong co. Tien ich bao cao → MEDIUM. |

## Cac hanh dong APP CO ma thuoc nghiep vu hop dong nhung KHONG nam trong pham vi web "contract" (tham khao)

| Hanh dong (app) | App endpoint + method | Ghi chu |
|-----------------|------------------------|---------|
| Them phu phi vao hop dong | POST `/api/v1/xanh/admin/bookings/add-surcharge` (bookingAddSurcharge) | Web co o lo khac (SURCHARGE.ADD), khong thuoc folder contract. App co. App khong kiem responseCode. |
| Xoa phu phi | POST `/api/v1/xanh/admin/bookings/remove-surcharge` (bookingRemoveSurcharge) | Tuong tu, ngoai pham vi folder contract. |
| Gia han don | POST `/api/v1/xanh/admin/bookings/extend` (bookingExtend) | Web co BOOKING.EXTEND nhung route nam ngoai folder contract. |
| Giao xe / Nhan xe | POST `/perform-delivery`, `/perform-receive` | Thuoc lo delivery-receive, khong phai contract. |
| Nhat ky booking | POST `/api/v1/xanh/admin/booking-logs/get` (bookingLogsGet) | Tien ich xem log, khong thuoc folder contract. |

> Luu y ky thuat: `lib/core/api.dart` co khai bao `getAllContracts = ".../xanh/admin/booking/contract/get-all"` (sai duong dan, khong khop BE that) nhung **khong service nao goi** — `ContractService.getContracts` thuc te goi `ApiEndpoints.getBooking` (`/bookings/search`). Hang so chet, khong gay anh huong.
