# Doi chieu API + nghiep vu — LO 06: Nhan vien, Khuyen mai, Ngan hang, Cau hinh, Dich vu thue, Vi pham giao thong

> So route web da quet: **18** route.ts
> (staff: 10, promotion: 5, bank: 1, config: 1, service: 1, traffic-violation: 1)
>
> Tom tat muc do: **CRITICAL = 0**, **HIGH = 8**, MEDIUM = 3, LOW/OK = 7
>
> Ket luan nhanh: Toan bo nhom **Nhan vien (staff)** — tao/sua/xoa quyen/doi mat khau/phan quyen — **app KHONG co** (man hinh "Tai xe" cua app chi la du lieu gia, khong goi API nao). Nhom **Khuyen mai** app co gan day du (tru xem chi tiet goi rieng). **Ngan hang / Cau hinh xe / Dich vu thue / Phat nguoi** app co goi dung endpoint nhung nam o feature folder khac (payments, vehicles, contracts).
>
> Luu y chung ve responseCode: Cac route.ts web chi la lop trung chuyen (BFF), khong tu kiem responseCode — viec kiem "00" nam o tang giao dien. Ben app, cac service cua lo nay (promotion, traffic, bank, rent-services) phan lon **chi kiem HTTP 200**, KHONG kiem `responseCode == "00"` cua xanh-service → rui ro coi la thanh cong khi backend tra loi nghiep vu (HTTP 200 nhung responseCode khac "00").

| Hanh dong | Web (endpoint + method) | App (endpoint + method) | Trang thai | Muc do | Ghi chu nghiep vu |
|-----------|--------------------------|--------------------------|------------|--------|--------------------|
| Tim kiem / danh sach nhan vien | POST /api/v1/xanh/admin/users/search (sau do POST /api/v1/auth/admin/users/batch-roles de ghep vai tro) | (khong co) | MISSING_IN_APP | HIGH | Web goi 2 API: lay user tu xanh-service roi ghep role tu auth-service. App khong co man hinh nhan vien thuc — "Tai xe" la du lieu cung. |
| Xem chi tiet nhan vien | POST /api/v1/xanh/admin/users/detail | (khong co) | MISSING_IN_APP | MEDIUM | App khong co. |
| Tao nhan vien moi | POST /api/v1/auth/admin/create-user -> POST /api/v1/auth/admin/assign-company -> POST /api/v1/xanh/admin/users/create (3 buoc tuan tu) | (khong co) | MISSING_IN_APP | HIGH | Web chay 3 buoc: tao user auth, gan cong ty AMZ_XANH, tao profile o xanh-service. Body: username=phoneNumber, fullName, password, email, roles, stationId, userCode. App khong co. |
| Cap nhat nhan vien | POST /api/v1/xanh/admin/users/update | (khong co) | MISSING_IN_APP | HIGH | App khong co. |
| Ngung kich hoat nhan vien | POST /api/v1/xanh/admin/users/deactivate | (khong co) | MISSING_IN_APP | HIGH | App khong co. Lien quan quyen truy cap nhan su. |
| Kich hoat lai nhan vien | POST /api/v1/xanh/admin/users/reactivate | (khong co) | MISSING_IN_APP | HIGH | App khong co. |
| Doi mat khau nhan vien (admin reset) | POST /api/v1/auth/admin/admin-reset-password (body: userId, newPassword) | (khong co) | MISSING_IN_APP | HIGH | Goi vao internal-auth-service (noi giu mat khau). App khong co — thieu chuc nang bao mat. |
| Lay danh sach vai tro (roles) | GET /api/v1/auth/admin/roles?requestId=... | (khong co) | MISSING_IN_APP | MEDIUM | Phuc vu form phan quyen. App khong co. |
| Gan 1 vai tro (set-role) | POST /api/v1/auth/admin/set-role (body: username, role) | (khong co) | MISSING_IN_APP | HIGH | App khong co. Lien quan phan quyen → nhay cam. |
| Cap nhat nhieu vai tro (grant/update-role) | POST /api/v1/auth/admin/grant-role (body: username, roleNames[]) | (khong co) | MISSING_IN_APP | HIGH | Web map role (string) -> roleNames[]. App khong co. |
| Tim kiem / danh sach khuyen mai | POST /api/v1/xanh/admin/promotions/search | POST /api/v1/xanh/admin/promotions/search | MATCH | LOW | Body khop (keyword, status, page, size trong "data"). App chi kiem HTTP 200, khong kiem responseCode "00". |
| Tao khuyen mai | POST /api/v1/xanh/admin/promotions/create | POST /api/v1/xanh/admin/promotions/create | MATCH | LOW | Body app gui day du (code, name, discountType/Value, max/minOrderValue, startDate, endDate, usageLimit, usageLimitPerUser). Khop. Chi kiem HTTP 200. |
| Cap nhat khuyen mai | POST /api/v1/xanh/admin/promotions/update | POST /api/v1/xanh/admin/promotions/update | MATCH | LOW | App them id + status trong "data". Khop. Chi kiem HTTP 200. |
| Xoa khuyen mai | POST /api/v1/xanh/admin/promotions/delete (body phang: requestId, requestTime, id) | POST /api/v1/xanh/admin/promotions/delete (body: requestId, requestTime, id) | MATCH | LOW | Ca 2 dat id o cap ngoai (khong boc trong "data"). Khop. Chi kiem HTTP 200. |
| Xem chi tiet khuyen mai | POST /api/v1/xanh/admin/promotions/detail (body phang: requestId, requestTime, id) | (khong goi — endpoint detailPromotions co khai bao trong api.dart nhung khong service nao goi; widget chi tiet render tu du lieu danh sach) | MISSING_IN_APP | MEDIUM | App KHONG goi API detail; man chi tiet dung lai object da co tu list → thieu field chi co o API detail. |
| Danh sach tai khoan ngan hang | GET /api/v1/xanh/admin/configs/bank-accounts | GET /api/v1/xanh/admin/configs/bank-accounts (o features/payments/services/payment_method_service.dart) | MATCH | LOW | Cung endpoint+method. App chi kiem HTTP 200 + co field result, khong kiem responseCode "00". |
| Cau hinh thong so xe (car-specifications) | GET /api/v1/xanh/admin/configs/car-specifications | GET /api/v1/xanh/admin/configs/car-specifications (o features/vehicles/services/vehicle_service.dart) | MATCH | OK | Cung endpoint+method. |
| Danh sach dich vu thue (rent-services) | GET /api/v1/xanh/admin/configs/rent-services | GET /api/v1/xanh/admin/configs/rent-services (o features/contracts/services/contract_service.dart) | MATCH | OK | Cung endpoint+method. |
| Tra cuu phat nguoi (vi pham giao thong) | POST /api/v1/xanh/admin/traffic-violations/search | POST /api/v1/xanh/admin/traffic-violations/search | MATCH | LOW | Body khop (page, size, licensePlate/keyword, status, startDate, endDate trong "data"). App chi kiem HTTP 200, khong kiem responseCode "00". |

## Ghi chu bo sung (APP_ONLY / ngoai pham vi)

- App co quan ly **Banner** (features/banners) goi `GET/POST/PUT/DELETE .../banners` (he Enoch/news, KHONG phai xanh-service). Web trong lo nay KHONG co route banner tuong ung. → APP_ONLY (severity LOW, nam ngoai 6 thu muc web duoc giao). Day la cum API rieng, kiem responseCode "00" cua he banner.
- App "Tai xe" (features/drivers) la **man hinh demo du lieu cung**, khong goi API → khong tinh la doi chieu.
