# Doi chieu API + nghiep vu — LO 07: Cai dat he thong, phi lien vung, Google config, thong bao

**Pham vi quet (Web BFF):** 15 route.ts
- `src/app/api/setting/` : 12 route (create, update, delete, detail, get-all, get-category, cross-region-fee/{create,update,delete,search}, google/{connect,status})
- `src/app/api/notification/` : 3 route (birthday, maintenance-due, traffic-violation)

**Tom tat muc do:**
- CRITICAL: 0
- HIGH: 0
- Phan con lai: chu yeu **MISSING_IN_APP** (app Flutter khong co cac chuc nang nay) + **APP_ONLY** (app co News/Banners ma web lo nay khong co).

**Ket luan tong:** Toan bo cac chuc nang cua web trong lo 07 (mau hop dong, phi lien vung, ket noi Google, 3 loai thong bao) **KHONG co tuong ung trong app Flutter** — app khong goi backend that cho bat ky chuc nang nao trong lo nay. Man hinh "Cai dat" cua app chi la cong tac giao dien cuc bo (ngon ngu, che do toi, bat/tat thong bao email/push) — KHONG luu xuong server, KHONG goi API. App lai co rieng News va Banners ma web lo nay khong dong (APP_ONLY).

> Luu y "responseCode": cac route web chi la lop trung chuyen (BFF) — chuyen tiep nguyen ven JSON tu backend ve client, khong tu kiem responseCode tai route (viec kiem `responseCode == "00"` nam o tang giao dien/client). Day la pattern chung cua admin FE, khong phai loi.

| Hanh dong | Web (endpoint + method) | App (endpoint + method) | Trang thai | Muc do | Ghi chu nghiep vu |
|-----------|-------------------------|-------------------------|------------|--------|-------------------|
| Tao mau hop dong | POST `/api/v1/xanh/admin/contract-templates/create` | (khong co) | MISSING_IN_APP | MEDIUM | Web tao mau hop dong (contract-template). App khong co man hinh/goi API nao. |
| Cap nhat mau hop dong | POST `/api/v1/xanh/admin/contract-templates/update` | (khong co) | MISSING_IN_APP | MEDIUM | App khong co. |
| Xoa mau hop dong | POST `/api/v1/xanh/admin/contract-templates/delete` | (khong co) | MISSING_IN_APP | MEDIUM | App khong co. |
| Chi tiet mau hop dong | POST `/api/v1/xanh/admin/contract-templates/detail` | (khong co) | MISSING_IN_APP | LOW | App khong co. |
| Danh sach mau hop dong | GET `/api/v1/xanh/admin/contract-templates/list` (query: type, isActive) | (khong co) | MISSING_IN_APP | MEDIUM | Web loc theo `type` (so) va `isActive` (bool). App khong co. |
| Danh muc loai mau hop dong | GET `/api/v1/xanh/admin/configs/contract-template-types` (query: type) | (khong co) | MISSING_IN_APP | LOW | App khong co. |
| Tim kiem phi lien vung | POST `/api/v1/xanh/admin/configs/cross-region-fees/search` | (khong co) | MISSING_IN_APP | MEDIUM | Quan ly phi lien vung — app khong co. |
| Tao phi lien vung | POST `/api/v1/xanh/admin/configs/cross-region-fees/create` | (khong co) | MISSING_IN_APP | MEDIUM | App khong co. |
| Cap nhat phi lien vung | POST `/api/v1/xanh/admin/configs/cross-region-fees/update` | (khong co) | MISSING_IN_APP | MEDIUM | App khong co. |
| Xoa phi lien vung | POST `/api/v1/xanh/admin/configs/cross-region-fees/delete` | (khong co) | MISSING_IN_APP | MEDIUM | App khong co. |
| Lay trang thai ket noi Google | GET `/api/v1/xanh/admin/google/status` | (khong co) | MISSING_IN_APP | LOW | Cau hinh Google (Drive/Docs). App khong co. |
| Ket noi Google (lay link OAuth) | GET `/api/v1/xanh/admin/google/connect` | (khong co) | MISSING_IN_APP | LOW | App khong co. |
| Thong bao: sinh nhat khach hang | GET `/api/v1/xanh/admin/notifications/birthdays` | (khong co) | MISSING_IN_APP | MEDIUM | Web co man hinh thong bao sinh nhat. App khong goi endpoint nay. |
| Thong bao: xe den han bao duong | GET `/api/v1/xanh/admin/notifications/maintenance-due` | (khong co) | MISSING_IN_APP | MEDIUM | Web co thong bao bao duong sap toi. App khong co endpoint nay (app CO goi maintenance/search nhung khac nghiep vu — la danh sach phieu bao duong, khong phai canh bao den han). |
| Thong bao: vi pham giao thong (7 ngay gan nhat) | POST `/api/v1/xanh/admin/traffic-violations/search` (body: `startDate`=7 ngay truoc, `page=0`, `size=50`) | POST `/api/v1/xanh/admin/traffic-violations/search` (`ApiEndpoints.trafficViolationsSearch`) | LOGIC_MISMATCH | MEDIUM | Cung endpoint+method. Web route lo thong bao tu dong dat `startDate` = 7 ngay gan nhat, `size=50` (muc dich: dem vi pham moi de bao thong bao). App goi cung API nhung cho man hinh tra cuu vi pham binh thuong (filter do nguoi dung chon), khong phai logic "thong bao 7 ngay". Khac muc dich su dung, khong sai du lieu. |

## Ghi chu APP_ONLY (app co, web lo 07 khong co)

| Hanh dong (app) | App (endpoint + method) | Ghi chu |
|-----------------|-------------------------|---------|
| Danh sach tin tuc (News) | GET `/api/v1/news` (query: page, limit) | App co feature News. Web trong pham vi lo 07 khong dong tin tuc. Nghiep vu News dung `status` draft/published/archived; response KHONG kiem `responseCode` (chi dua HTTP 200) — luu y rieng. |
| Tao tin tuc | POST `/api/v1/news` (multipart: title, summary, content, status, file) | App-only. Khong kiem responseCode (chi HTTP 200/201). |
| Cap nhat tin tuc | PUT `/api/v1/news/{id}` (multipart) | App-only. Khong kiem responseCode. |
| Xoa tin tuc | DELETE `/api/v1/news/{id}` | App-only. Khong kiem responseCode. |
| Danh sach banner | GET `/api/v1/banners` (query: page, pageSize, position, is_active) | App-only. CO kiem `responseCode == "00"`. |
| Tao banner | POST `/api/v1/banners` (multipart: title, link_url, position, sort_order, is_active, file) | App-only. CO kiem `responseCode == "00"`. |
| Cap nhat banner | PUT `/api/v1/banners/{id}` (multipart) | App-only. CO kiem `responseCode == "00"`. |
| Xoa banner | DELETE `/api/v1/banners/{id}` | App-only. CO kiem `responseCode == "00"`. |

## Ghi chu man hinh "Cai dat" cua app

`settings_screen.dart` chi co cong tac giao dien cuc bo: chon ngon ngu, che do toi, bat/tat thong bao email & push, va cac muc bam-khong-lam-gi (doi mat khau, phan quyen, cau hinh API...). **Khong goi API nao**, khong luu xuong server. Day khong phai tuong ung cua bat ky chuc nang web lo 07.
