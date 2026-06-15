# Doi chieu API + nghiep vu — LO 04-finance

**Pham vi web da quet:** 8 route.ts
- `src/app/api/finance/surcharge/`: create, delete, get (3 route)
- `src/app/api/finance/transaction/`: category, create, delete, export-excel, search (5 route)

**Tom tat muc do:**
- CRITICAL: 1 dong (responseCode khong duoc kiem o ca 2 ben — rui ro coi giao dich loi la thanh cong)
- HIGH: 2 dong (App THIEU xuat Excel giao dich; App THIEU mot so field body khi tao giao dich)

> Ghi chu chung ve responseCode: Ca web (lop BFF route.ts) va app deu CHI kiem HTTP status (`response.ok` / `statusCode == 200`), KHONG kiem `response.responseCode == "00"` cua xanh-service. Web co the kiem responseCode o tang giao dien (ngoai pham vi route.ts); app thi tang service tra `success=true` ngay khi HTTP 200 -> neu backend tra HTTP 200 kem responseCode loi, app coi nhu thanh cong. Day la rui ro nghiep vu chung cho ca lo, danh dau o dong tao giao dich (anh huong tien).

## Bang doi chieu

| Hanh dong | Web (endpoint + method) | App (endpoint + method) | Trang thai | Muc do | Ghi chu nghiep vu |
|-----------|-------------------------|--------------------------|------------|--------|-------------------|
| Them phu phi vao hop dong | POST /api/v1/xanh/admin/bookings/add-surcharge (SURCHARGE.ADD) | POST /api/v1/xanh/admin/bookings/add-surcharge (`BookingAdminService.addSurcharge`) | MATCH | OK | Cung endpoint+method. Web forward nguyen body (passthrough), app boc `{requestId, requestTime, data}`. Dieu kien cho phep them phu phi (trang thai hop dong) do backend kiem, ca 2 ben khong chan o client. |
| Xoa phu phi khoi hop dong | POST /api/v1/xanh/admin/bookings/remove-surcharge (SURCHARGE.REMOVE) | POST /api/v1/xanh/admin/bookings/remove-surcharge (`BookingAdminService.removeSurcharge`) | MATCH | OK | Cung endpoint+method. App boc data chuan, web passthrough body. |
| Lay danh sach ly do/cau hinh phu phi (active) | GET /api/v1/xanh/admin/configs/surcharges (SURCHARGE.GET_ACTIVE) | GET /api/v1/xanh/admin/configs/surcharges (`ContractService.getSurchargeConfigs`) | MATCH | OK | Cung endpoint+method GET. App nam o feature contracts chu khong phai finance, nhung goi dung API phu phi. |
| Lay danh muc giao dich (theo type) | GET /api/v1/xanh/admin/configs/transaction-categories?type= (TRANSACTION.CATEGORY) | GET /api/v1/xanh/admin/configs/transaction-categories?type= (`FinancialManagementService.fetchTransactionCategories`) | MATCH | OK | Ca 2 truyen query `type` (so). Khop. |
| Tao giao dich tai chinh (thu/chi) | POST /api/v1/xanh/admin/transactions/create (TRANSACTION.CREATE) | POST /api/v1/xanh/admin/transactions/create (`FinancialManagementService.createTransaction`) | BODY_MISMATCH | HIGH | Web la passthrough nen than body do giao dien quyet dinh (linh hoat). App gui co dinh: type, categoryId, amount, transactionDate (app tu set = thoi diem hien tai), paymentMethodId, targetType, targetId, targetName, bookingId, carId, note. App ep `transactionDate = now` -> khong cho phep ghi nhan giao dich lui ngay (web co the gui ngay khac neu giao dien ho tro). Can xac nhan giao dien web co cho chon ngay khong; neu co -> app thieu kha nang nay. Quan trong hon: ca 2 ben KHONG kiem responseCode "00" -> neu BE tra HTTP 200 + responseCode loi, app bao "thanh cong" sai (anh huong so lieu tien). |
| Xoa/huy (void) giao dich | POST /api/v1/xanh/admin/transactions/void (TRANSACTION.DELETE) | POST /api/v1/xanh/admin/transactions/void (`FinancialManagementService.deleteTransaction`) | MATCH | LOW | Cung endpoint+method. Body app: `{transactionId, reason}`. Web passthrough. Khop nghiep vu (huy giao dich co kem ly do). Chi luu y app coi HTTP 200 = thanh cong, khong doc responseCode. |
| Tim/loc giao dich (phan trang) | POST /api/v1/xanh/admin/transactions/search (TRANSACTION.SEARCH) | POST /api/v1/xanh/admin/transactions/search (`FinancialManagementService.fetchTransactions`) | MATCH | LOW | App gui: keyword, type, categoryId, bookingId, stationId, startDate, endDate, page, size. Web passthrough body. Bo loc khop pham vi co ban. |
| Xuat Excel danh sach giao dich | POST /api/v1/xanh/admin/transactions/export-excel (TRANSACTION.EXPORT_EXCEL, qua localBeFetch — tra ve file nhi phan) | (khong co) | MISSING_IN_APP | HIGH | Web co chuc nang tai file Excel giao dich (route tra ArrayBuffer + Content-Disposition). App KHONG co endpoint export-excel trong `core/api.dart` va khong co code goi tai Excel trong feature finance. Nhan vien dung app khong xuat duoc bao cao giao dich. |

## Ghi chu bo sung

- Web route export-excel dung `localBeFetch` (uu tien BE local neu `XANH_LOCAL_URL` set, nguoc lai qua gateway), khac voi cac route con lai dung `apiBackendFetch` (luon qua gateway production). Khong anh huong endpoint backend that.
- App khong co lop BFF: tat ca service goi thang `https://api-portal.amzholdings.vn/api/v1/...` (gateway staging) qua `ApiEndpoints`.
- Khong phat hien endpoint finance nao app goi ma web khong co (khong co dong APP_ONLY).
