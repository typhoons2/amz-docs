# Doi chieu API + nghiep vu — LO 03: Khach hang CRUD + KYC

Pham vi: Khach hang CRUD (tao/sua/xoa/tim/chi tiet) + KYC (duyet/tu choi CCCD/GPLX, cap nhat identity & license, OCR CCCD).

- So route Web da quet: **13** (toan bo `amazing-xanh-admin-fe/src/app/api/list/customer/**/route.ts`)
- So hanh dong App (Flutter) lien quan khach hang: **1** (`CustomerService.getCustomerDetail`)
- Tong ket muc do: **CRITICAL = 0**, **HIGH = 0**, **MEDIUM = 1** (detail App khong verify responseCode), con lai la MISSING_IN_APP severity MEDIUM/LOW (chuc nang quan tri chi co tren Web, App khong co man hinh tuong ung).

## Ghi chu kien truc quan trong

- Tat ca route Web la **BFF proxy thuan** (`amazing-xanh-admin-fe/src/hooks/apiBackendFetch.ts`): chi kiem `response.ok` (HTTP status), **KHONG** kiem `responseCode` o tang BFF. Viec verify `responseCode = "00"` (xanh-service) do tang UI/client lam (ngoai pham vi route.ts). Vi vay cot "check responseCode" cua Web la "chi HTTP status (BFF)".
- App: `customer_service.dart` cung **chi kiem `statusCode == 200`**, doc `decoded['result']`, KHONG kiem `responseCode = "00"`. Day la lech nho (MEDIUM) — neu BE tra HTTP 200 nhung responseCode != "00" thi App van coi la thanh cong.
- App **KHONG** co bat ky man hinh quan ly khach hang/KYC nao. Endpoint khach hang duy nhat trong App la `customerDetail`, dung trong luong cap nhat hop dong booking (`booking_contract_update_screen.dart`) de lay thong tin khach, khong phai man hinh CRUD/KYC.

## Bang doi chieu

| Hanh dong | Web (endpoint + method) | App (endpoint + method) | Trang thai | Muc do | Ghi chu nghiep vu |
|-----------|-------------------------|--------------------------|------------|--------|-------------------|
| Tim kiem khach hang | POST /api/v1/xanh/admin/customers/search | (khong co) | MISSING_IN_APP | MEDIUM | Web co man hinh danh sach/tim khach. App khong co man hinh danh sach khach hang. |
| Chi tiet khach hang | POST /api/v1/xanh/admin/customers/detail | POST /api/v1/xanh/admin/customers/detail | MATCH | MEDIUM | Cung endpoint+method. Body App gui `data.userId`. Lech nho: App chi kiem HTTP 200, KHONG verify responseCode="00" (Web BFF cung chi kiem HTTP, nhung App doc thang result nen rui ro hon). |
| Tao khach hang | POST /api/v1/xanh/admin/customers/create | (khong co) | MISSING_IN_APP | MEDIUM | Tao moi khach hang chi co tren Web. App khong tao khach. |
| Cap nhat khach hang | POST /api/v1/xanh/admin/customers/update | (khong co) | MISSING_IN_APP | MEDIUM | Sua thong tin khach chi co tren Web. |
| Xoa khach hang | POST /api/v1/xanh/admin/customers/delete | (khong co) | MISSING_IN_APP | MEDIUM | Xoa khach chi co tren Web. (Hanh dong nhay cam — App khong cho phep, hop ly ve quyen.) |
| Danh sach KYC cho duyet | POST /api/v1/xanh/admin/customers/kyc/pending | (khong co) | MISSING_IN_APP | MEDIUM | Hang doi ho so KYC cho duyet chi co tren Web. App khong co luong duyet KYC. |
| Chi tiet CCCD (identity) | POST /api/v1/xanh/admin/customers/identity/detail | (khong co) | MISSING_IN_APP | MEDIUM | Xem chi tiet ho so CCCD de duyet — chi Web. |
| Cap nhat/duyet CCCD (identity) | POST /api/v1/xanh/admin/customers/identity/update | (khong co) | MISSING_IN_APP | MEDIUM | Cap nhat/duyet thong tin CCCD (gui key anh S3 sau OCR) — chi Web. |
| Tu choi CCCD (identity) | POST /api/v1/xanh/admin/customers/identity/reject | (khong co) | MISSING_IN_APP | MEDIUM | Tu choi ho so CCCD — chi Web. |
| Chi tiet GPLX (license) | POST /api/v1/xanh/admin/customers/license/detail | (khong co) | MISSING_IN_APP | MEDIUM | Xem chi tiet ho so GPLX de duyet — chi Web. |
| Cap nhat/duyet GPLX (license) | POST /api/v1/xanh/admin/customers/license/update | (khong co) | MISSING_IN_APP | MEDIUM | Cap nhat/duyet thong tin GPLX (gui key anh S3 sau OCR) — chi Web. |
| Tu choi GPLX (license) | POST /api/v1/xanh/admin/customers/license/reject | (khong co) | MISSING_IN_APP | MEDIUM | Tu choi ho so GPLX — chi Web. |
| OCR quet CCCD | POST /api/v1/xanh/admin/customers/ocr/cccd (multipart) | (khong co) | MISSING_IN_APP | LOW | Quet OCR CCCD (multipart upload, chi OCR khong luu) — chi Web. App khong co tinh nang quet CCCD. |

## Ket luan

- Khong co sai lech endpoint/method/body gay rui ro du lieu giua Web va App o lo nay.
- Hanh dong duy nhat App va Web cung lam (chi tiet khach hang) la **MATCH** ve endpoint/method/body; chi co lech nho ve cach kiem ket qua (App nen verify `responseCode="00"` thay vi chi HTTP 200).
- Toan bo nghiep vu KYC (duyet/tu choi CCCD/GPLX) va CRUD khach hang **khong ton tai tren App** — day la quyet dinh thiet ke (App admin chi xem chi tiet khach trong luong booking, khong quan ly KYC). Khong phai bug, nhung can xac nhan voi nghiep vu rang viec duyet KYC chi lam tren Web la dung y do.
