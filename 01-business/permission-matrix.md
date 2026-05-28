# Ma tran quyen han (Permission Matrix)

> Cap nhat: 2026-05-27 | Source: reverse-engineered tu @PreAuthorize trong controller + SecurityContextHolder check trong BookingServiceImpl.java

**Ghi chu:**
- `✓` = co quyen
- `✗` = khong co quyen
- `?` = khong co role check trong code — bat ky role nao cung lam duoc (tiep can qua gateway sau khi auth thanh cong)
- `[LO HONG]` = action nhay cam nhung khong co role check

---

## 1. Booking (Hop dong)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Tao booking (`/create`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.createBooking` | Tat ca role tao duoc |
| Tao booking kem phu phi (`/create-with-surcharges`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.createBookingWithExtras` | Atomic 1 transaction |
| Tim kiem danh sach booking (`/search`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.searchBookings` | |
| Xuat Excel booking (`/export-excel`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.exportBookingsExcel` | Toi da 50.000 dong |
| Xem chi tiet booking (`/detail`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.getBookingDetail` | |
| Cap nhat trang thai booking (`/update-status`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.updateBookingStatus` | Revert co them kiem tra trong service |
| **Soft revert 6→3 (REFUND_PENDING → ONGOING)** | ✗ | ✗ | ✓ | ✓ | `BookingServiceImpl.updateBookingStatus` (line 1626) | Kiem tra trong service, khong controller |
| **Hard revert 4→3 (COMPLETED → ONGOING)** | ✗ | ✗ | ✗ | ✓ | `BookingServiceImpl.updateBookingStatus` (line 1638) | Chi ADMIN, kiem tra trong service |
| **Hard revert 5→3 (CANCELLED → ONGOING)** | ✗ | ✗ | ✗ | ✓ | `BookingServiceImpl.updateBookingStatus` | Chi ADMIN |
| **Hard revert 7,8→3 (INCIDENT/SEIZED → ONGOING)** | ✗ | ✗ | ✗ | ✓ | `BookingServiceImpl.updateBookingStatus` | Chi ADMIN |
| Cap nhat thong tin tong quan booking (`/update-general`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.updateBookingGeneral` | Chi khi PENDING(1) hoac CONFIRMED(2) |
| Cap nhat tai lieu booking (`/update-documents`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.updateBookingDocuments` | |
| Xem danh sach giao/nhan xe (`/search/delivery-receive`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.searchDeliveryReceive` | |
| Giao xe (`/perform-delivery`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.performDelivery` | CONFIRMED(2) → ONGOING(3) |
| Nhan xe (`/perform-receive`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.performReceive` | ONGOING(3) → COMPLETED(4) hoac REFUND_PENDING(6) |
| Xac nhan hoan coc (`/confirm-refund`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.confirmRefund` | REFUND_PENDING(6) → COMPLETED(4) |
| Gia han booking (`/extend`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.extendBooking` | Chi ONGOING(3) |
| Xem thong ke booking theo trang thai (`/status-counts`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.getBookingStatusCounts` | Dashboard counter |
| Them phu phi vao booking (`/add-surcharge`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.addSurcharge` | |
| Xoa phu phi khoi booking (`/remove-surcharge`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.removeSurcharge` | Soft delete |
| Huy booking (`/cancel`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.cancelBooking` | Chi PENDING(1) hoac CONFIRMED(2) |
| Dong hop dong quyet toan (`/finish`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.finishBooking` | |
| Lay du lieu hop dong de in (`/print-data`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.getContractData` | |
| In hop dong qua Google Docs (`/print-google-doc`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.printGoogleDoc` | |
| In hop dong PDF binary (`/print-contract-pdf`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.printContractPdf` | |
| Lay goi y phu phi (`/suggested-surcharges`) | ✓ | ✓ | ✓ | ✓ | `BookingAdminController.getSuggestedSurcharges` | |

> **Ghi chu quan trong:** Endpoint `/update-status` controller cho phep tat ca role (✓✓✓✓), nhung logic revert nam trong `BookingServiceImpl` kiem tra role bang `SecurityContextHolder.getContext().getAuthentication()`. STAFF + XANH se bi `FORBIDDEN` neu goi revert.

---

## 2. Xe (Car)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Tao xe moi | ✗ | ✗ | ✓ | ✓ | `CarAdminController.createCar` `@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")` | |
| Cap nhat thong tin xe | ✗ | ✗ | ✓ | ✓ | `CarAdminController.updateCar` | |
| Cap nhat phap ly + bao duong xe | ✓ | ✓ | ✓ | ✓ | `CarAdminController.updateCarLegalMaintenance` | XANH + STAFF duoc phep |
| Tim kiem danh sach xe | ✓ | ✓ | ✓ | ✓ | `CarAdminController.getAdminCars` | |
| Xem chi tiet xe | ✓ | ✓ | ✓ | ✓ | `CarAdminController.getCarDetail` | |
| Xoa xe (hard delete) | ✗ | ✗ | ✓ | ✓ | `CarAdminController.deleteCar` | Xoa ca anh tren S3 |
| Xem lich trinh xe (Gantt) | ? | ? | ? | ? | [CAN LEAD XAC NHAN] `CarAdminController.getCarSchedule` | Chua kiem tra trong code |

---

## 3. Tram (Station / Location)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Tao tram moi | ✗ | ✗ | ✓ | ✓ | `LocationAdminController` — line 141 `hasAnyRole('ADMIN','MANAGER')` | |
| Cap nhat tram | ✗ | ? | ✓ | ✓ | `LocationAdminController` — [CAN LEAD XAC NHAN line cu the] | Theo pattern ADMIN+MANAGER |
| Tim kiem danh sach tram | ✓ | ✓ | ✓ | ✓ | `LocationAdminController` — line 51 `hasAnyRole('ADMIN','XANH','MANAGER','STAFF')` | |
| Xem chi tiet tram | ✓ | ✓ | ✓ | ✓ | `LocationAdminController` — `hasAnyRole('ADMIN','XANH','MANAGER','STAFF')` | |
| Xoa tram | ✗ | ✗ | ✓ | ✓ | `LocationAdminController` — `hasAnyRole('ADMIN','MANAGER')` | |
| Xuat Excel tram | ✓ | ✓ | ✓ | ✓ | `LocationAdminController` — `hasAnyRole('ADMIN','XANH','MANAGER','STAFF')` | |

---

## 4. Nhan vien (User/Staff)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Tao nhan vien moi | ✗ | ✗ | ✓ | ✓ | `UserAdminController.createUser` `hasAnyRole('ADMIN','MANAGER')` | |
| Cap nhat nhan vien | ✗ | ✗ | ✓ | ✓ | `UserAdminController.updateUser` | |
| Tim kiem nhan vien | ✗ | ✗ | ✓ | ✓ | `UserAdminController.searchUsers` | XANH + STAFF khong xem duoc list NV |
| Xem chi tiet nhan vien | ✗ | ✗ | ✓ | ✓ | `UserAdminController.getUserDetail` | |
| Vo hieu hoa nhan vien | ✗ | ✗ | ✓ | ✓ | `UserAdminController.deactivateUser` | Soft delete, co confirmation neu con booking active |
| Kich hoat lai nhan vien | ✗ | ✗ | ✓ | ✓ | `UserAdminController.reactivateUser` | |

---

## 5. Khach hang (Customer)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Xem KYC cho duyet | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.getPendingKycRequests` | |
| Xem chi tiet KYC | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.getKycDetail` | |
| Duyet/cap nhat CCCD (Identity) | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.adminUpdateIdentity` | |
| Tu choi CCCD | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.adminRejectIdentity` | |
| Duyet/cap nhat Bang lai (License) | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.adminUpdateLicense` | |
| Tu choi Bang lai | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.adminRejectLicense` | |
| Tao khach hang moi | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.createCustomer` | |
| Cap nhat khach hang | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.updateCustomer` | |
| Tim kiem khach hang | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.searchCustomers` | |
| Xem chi tiet khach hang | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.getCustomerDetail` | |
| **Xoa khach hang (hard delete)** | ✗ | ✗ | ✗ | ✓ | `CustomerAdminController.deleteCustomer` `hasRole('ADMIN')` | Chi ADMIN. Khong xoa neu con booking/transaction |
| Xem tai khoan ngan hang KH | ✓ | ✓ | ✓ | ✓ | `CustomerAdminController.getCustomerBankAccount` | |
| Scan OCR CCCD | ? | ? | ? | ? | `CustomerAdminController.scanCccd` — [CAN LEAD XAC NHAN quyen] | [LO HONG: can xac nhan co role check khong] |

---

## 6. Giao dich Thu/Chi (Transaction / Cashbook)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Xem danh muc giao dich | ✓ | ✓ | ✓ | ✓ | `TransactionAdminController.getCategories` | |
| Tao phieu thu/chi | ✓ | ✓ | ✓ | ✓ | `TransactionAdminController.createTransaction` | |
| Tim kiem giao dich | ✓ | ✓ | ✓ | ✓ | `TransactionAdminController.searchTransactions` | |
| Xem chi tiet giao dich | ✓ | ✓ | ✓ | ✓ | `TransactionAdminController.getTransactionDetail` | |
| **Huy giao dich (`/void`)** | ✗ | ✗ | ✓ | ✓ | `TransactionAdminController.voidTransaction` `hasAnyRole('ADMIN','MANAGER')` | Soft delete, khong tinh vao bao cao |

---

## 7. Bao cao (Report)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Bao cao doanh thu | ✓ | ✓ | ✓ | ✓ | `ReportAdminController` line 55 | |
| Bao cao chi phi | ✓ | ✓ | ✓ | ✓ | `ReportAdminController` line 79 | |
| Bao cao fill rate | ✓ | ✓ | ✓ | ✓ | `ReportAdminController` line 103 | |
| Bao cao loi nhuan | ✓ | ✓ | ✓ | ✓ | `ReportAdminController` line 126 | |
| Xuat Excel bao cao | ✗ | ✗ | ✓ | ✓ | `ReportAdminController` line 147 `hasAnyRole('ADMIN','MANAGER')` | |
| Bao cao doanh thu khach hang | ✓ | ✓ | ✓ | ✓ | `ReportAdminController` line 196 | |

---

## 8. Bao duong (Maintenance)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Tao phieu bao duong | ✗ | ✓ | ✓ | ✓ | `MaintenanceAdminController` line 62 `hasAnyRole('ADMIN','XANH','MANAGER','STAFF')` | Theo code la tat ca role, Swagger chi ghi Admin/Manager/Xanh |
| Cap nhat phieu bao duong | ✓ | ✓ | ✓ | ✓ | `MaintenanceAdminController` line 91 | |
| Xem danh sach bao duong | ✓ | ✓ | ✓ | ✓ | `MaintenanceAdminController` line 120 | |
| Xem chi tiet phieu bao duong | ✓ | ✓ | ✓ | ✓ | `MaintenanceAdminController` line 146 | |
| **Xoa phieu bao duong** | ✗ | ✗ | ✓ | ✓ | `MaintenanceAdminController` line 174 `hasAnyRole('ADMIN','MANAGER')` | |
| Xem danh sach doi tac bao duong | ✓ | ✓ | ✓ | ✓ | `MaintenanceAdminController` line 197 | |
| Xem danh muc bao duong | ✓ | ✓ | ✓ | ✓ | `MaintenanceAdminController` line 218 | |

---

## 9. Vi pham giao thong (Traffic Violation)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Xem danh sach vi pham | ✓ | ✓ | ✓ | ✓ | `TrafficViolationAdminController` line 40 `hasAnyRole('ADMIN','XANH','MANAGER','STAFF')` | |

---

## 10. Khuyen mai (Promotion)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Tao khuyen mai | ✗ | ✗ | ✓ | ✓ | `PromotionAdminController` line 48 `hasAnyRole('ADMIN','MANAGER','MARKETING')` | Co role MARKETING chua thay trong enum chinh |
| Cap nhat khuyen mai | ✗ | ✗ | ✓ | ✓ | `PromotionAdminController` line 73 | |
| Xem danh sach khuyen mai | ✗ | ✗ | ✓ | ✓ | `PromotionAdminController` line 98 | |
| Xem chi tiet khuyen mai | ✗ | ✗ | ✓ | ✓ | `PromotionAdminController` line 123 | |
| Xoa khuyen mai | ✗ | ✗ | ✓ | ✓ | `PromotionAdminController` line 148 | |

---

## 11. Cau hinh he thong (Config / Settings)

| Action | STAFF | XANH | MANAGER | ADMIN | Controller / Method | Ghi chu |
|--------|-------|------|---------|-------|---------------------|---------|
| Xem cau hinh (catalog, cross-region fee...) | ✓ | ✓ | ✓ | ✓ | `ConfigAdminController` lines 49,73,96,120,143,166 | |
| Cap nhat cau hinh | ✓ | ✓ | ✓ | ✓ | `ConfigAdminController` — [CAN LEAD XAC NHAN] | |
| Cap nhat Site Settings (CMS) | ✗ | ✗ | ✓ | ✓ | `SiteSettingAdminController` line 25 `hasAnyRole('ADMIN','MARKETING','MANAGER')` | |
| Cau hinh Google OAuth (ket noi Google Drive) | ✗ | ✗ | ✗ | ✓ | `GoogleOAuthAdminController` lines 65, 162 `hasRole('ADMIN')` | Chi ADMIN ket noi Google |
| Migration scripts | ✗ | ✗ | ✗ | ✓ | `MigrationAdminController` line 32 `hasAnyRole('ADMIN')` | |

---

## Tong ket phan quyen theo role

| Role | Quyen tong ket |
|------|---------------|
| **ADMIN** | Toan quyen. Duy nhat role hard-revert hop dong da hoan/da huy/tai nan/cam co. Duy nhat xoa khach hang, keo Google OAuth, chay migration. |
| **MANAGER** | Gan nhu toan quyen tru hard-revert. Duoc soft-revert 6→3. Xoa xe, tram, bao duong. Huy giao dich. Xuat Excel. |
| **XANH** | Booking CRUD day du, giao/nhan xe, phu phi, bao duong phap ly xe. Khong tao/xoa xe/tram/nhan vien moi. |
| **STAFF** | Tuong tu XANH. Khong xem danh sach nhan vien. Mot so endpoint loai ra (bao cao xuat Excel). |
| **MARKETING** | Chi Promotion + SiteSettings. Khong thay trong SecurityContextHelper test — co the la role phu su dung it. |

---

## Luu y bao mat phat hien

- `[LO HONG: endpoint update-status controller]` Tao `hasAnyRole` cho tat ca 4 role o controller, nhung role check thuc su nam trong service. Neu service thay doi logic ma controller khong cap nhat → kho detect bang static analysis.
- `[LO HONG: CustomerAdminController.scanCccd]` Can xac nhan endpoint scan OCR co @PreAuthorize hay khong — [CAN LEAD XAC NHAN]
- `ROLE_MARKETING` ton tai trong `PromotionAdminController` va `SiteSettingAdminController` nhung khong co trong `SecurityContextHelper` test helper → co the la role chua duoc dung hoac chi dung tren FE
