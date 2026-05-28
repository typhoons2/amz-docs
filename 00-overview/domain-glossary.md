# Tu dien thuat ngu AMZ

> Cap nhat: 2026-05-28 | Source: reverse-engineered tu code entity Booking.java, Transaction.java, BookingServiceImpl.java + CLAUDE.md

---

## Thuc the trung tam

| Thuat ngu | Dinh nghia | Vi du / Ghi chu |
|-----------|-----------|-----------------|
| **Booking / Hop dong** | 1 don thue xe, tu luc tao den khi tra xe + quyet toan. Luu trong bang `new_bookings`. | Ma: `TX202605192570` |
| **Booking Code** | Ma hop dong duy nhat, tu dong sinh. Format: `TX` + so thu tu. | `TX202605247518` |
| **Car / Xe** | Xe cho thue, luu trong bang `new_cars`. | Bien so, hang xe, gia thue/ngay/km/gio |
| **StationLocation / Tram** | Diem giao/nhan xe cua cong ty. | Da Lat, Nha Trang |
| **Customer / Khach hang** | Nguoi thue xe (dang nhap qua customer-auth-service). | Luu tren bang `customers` |
| **`users` (bang)** | Do internal-auth-service SO HUU. Chua thong tin dang nhap: username, password, role, company. La nguon goc xac thuc noi bo. | Quan ly boi internal-auth-service |
| **StaffProfile / Nhan vien** | Entity NGHIEP VU trong xanh-service (bang `staff_profiles`). Tach rieng khoi `users`. Chua: `user_id` (tham chieu logic toi users, KHONG phai FK vat ly), `station_id` (ben xe phan cong), va cached copy: fullName, phoneNumber, email, userCode tu auth. Ly do tach: moi service co entity rieng du chung DB, KHONG import cross-service entity. | Quan ly boi xanh-service |
| **Company** | Cong ty/chi nhanh (dung de phan tach da nha hang). | `AMZ_XANH`, code = `app.company-code` |
| **Transaction / Phieu** | Phieu thu/chi tien, luu tren `transactions`. | PT = Phieu Thu (type=1), PC = Phieu Chi (type=2) |
| **SurchargeCatalog / Danh muc phu phi** | Bang dinh nghia ly do phu phi (thieu xang, hu hong...). | `surcharge_catalog` |
| **BookingSurcharge / Phu phi** | 1 khoan phu phi gan vao booking, luu `booking_surcharges`. | Thieu xang 200k, hu kinh chieu hau |
| **Maintenance / Bao duong** | Phieu bao duong xe, luu `maintenance_tickets`. | Thay dau may, 10.000km |
| **TrafficViolation / Phat nguoi** | Phieu phat nguoi lien ket voi booking/xe. | Phat toc do, dang ky qua han |
| **Promotion / Khuyen mai** | Ma giam gia ap dung vao booking. | Giam 200k, discount 10% |

---

## Trang thai Booking (Status)

| So | Ten tieng Anh | Mo ta hanh vi nhin thay duoc | Chuyen tiep hop le |
|----|--------------|-----------------------------|--------------------|
| **1** | PENDING | Moi tao, cho duyet | → 2 (Confirm), → 5 (Cancel) |
| **2** | CONFIRMED | Da duyet, cho giao xe | → 3 (Giao xe), → 5 (Cancel) |
| **3** | ONGOING | Dang cho thue (da giao xe) | → 4 (Nhan xe xong), → 6 (Hold deposit), → 7 (Incident), → 8 (Seized) |
| **4** | COMPLETED | Da hoan tat quyet toan | → 3 (Hard revert, chi ADMIN) |
| **5** | CANCELLED | Da huy | → 3 (Hard revert, chi ADMIN) |
| **6** | REFUND_PENDING | Da tra xe nhung giu coc cho kiem tra phat nguoi | → 4 (Confirm refund), → 3 (Soft revert, ADMIN+MANAGER) |
| **7** | INCIDENT | Xe dang tai nan | → 3 (Hard revert, chi ADMIN) |
| **8** | SEIZED | Xe bi cam co | → 3 (Hard revert, chi ADMIN) |

**Ghi chu:**
- **Soft revert** (6→3): ADMIN + MANAGER duoc phep
- **Hard revert** (4→3, 5→3, 7→3, 8→3): Chi ADMIN
- Logic kiem tra nam trong `BookingServiceImpl.updateBookingStatus()` — check `SecurityContextHolder` truc tiep

---

## Cac buoc trong vong doi Booking

| Buoc | Ten | Action | Trang thai chuyen |
|------|-----|--------|-------------------|
| **DELIVERY** | Giao xe | Admin ghi km dau, anh hien trang, thu coc + tien thue | 2 → 3 |
| **RECEIVE** | Nhan xe | Admin ghi km cuoi, anh, cong phu phi, quyet dinh giu/hoan coc | 3 → 4 hoac 3 → 6 |
| **CONFIRM_REFUND** | Xac nhan hoan coc | Admin xac nhan so tien hoan coc sau khi kiem tra phat nguoi | 6 → 4 |
| **REVERT** | Hoan tac | Admin hoan tac status (soft hoac hard), bat buoc nhap ly do | theo bang tren |
| **CANCEL** | Huy don | Chi duoc huy o PENDING (1) hoac CONFIRMED (2) | 1,2 → 5 |
| **FINISH** | Quyet toan | Admin dong hop dong, ghi nhan thanh toan cuoi, chuyen COMPLETED | 3,6,4 → 4 |
| **EXTEND** | Gia han | Admin gia han thoi gian thue (ONGOING), tinh lai gia moi | 3 (khong doi status) |

---

## Cac loai Phieu Thu/Chi (Transaction Type + Category)

| Loai | type | Danh muc thuong gap | Y nghia |
|------|------|---------------------|---------|
| Phieu Thu (PT) | 1 | DEPOSIT_COLLECT | Thu tien coc tu khach |
| Phieu Thu (PT) | 1 | RENTAL_COLLECT | Thu tien thue xe |
| Phieu Thu (PT) | 1 | SURCHARGE_COLLECT | Thu phu phi (co the la but toan noi bo) |
| Phieu Thu (PT) | 1 | PREPAY_COLLECT | Thu tien giu cho (prepay) |
| Phieu Chi (PC) | 2 | DEPOSIT_REFUND | Hoan tien coc cho khach |
| Phieu Chi (PC) | 2 | SURCHARGE_DEDUCT | Tru phu phi vao coc (but toan noi bo) |

**But toan noi bo:** Phieu Thu/Chi co `payment_method_id = NULL`. Khong co dong tien ngan hang thuc su. Vi du: "Tru phu phi vao coc" sinh 1 PT SURCHARGE_COLLECT (`paymentMethodId=null`) de offset tien coc, khong thu them tien tu khach.

---

## Cac field tai chinh quan trong

| Field | Ten bang | Y nghia | Don vi |
|-------|---------|---------|--------|
| `total_amount` | new_bookings | Tien thue thuan = rentalPrice + pickupFee + returnFee - discount + VAT. **KHONG cong surcharge_amount.** Tong tien khach phai tra thuc te = total_amount + surcharge_amount (surcharge la field rieng). Evidence: TX202605260349 — total_amount=1.000.000 = rental_price=1.000.000, surcharge_amount=279.000 rieng biet. | VND |
| `rental_price` | new_bookings | Gia thue thuan (tinh theo ngay/km/gio, tu car pricing) | VND |
| `pickup_fee` | new_bookings | Phi giao xe | VND |
| `return_fee` | new_bookings | Phi nhan xe tra | VND |
| `surcharge_amount` | new_bookings | Tong phu phi (tu bang booking_surcharges) | VND |
| `paid_amount` | new_bookings | Tong tien khach da tra vao luong Revenue (thue + prepay) | VND |
| `collected_deposit` | new_bookings | Tong tien coc da thu (luong Liability rieng) | VND |
| `deposit_amount` | new_bookings | So tien coc thua thuan (tu CarSpecification hoac admin nhap tay) | VND |
| `refund_amount` | new_bookings | So tien coc hoan lai cho khach | VND |
| `cancellation_fee` | new_bookings | Phi huy don | VND |
| `surcharge_deducted_from_deposit` | new_bookings | `true` = phu phi da duoc tru vao coc, khong thu them khach | Boolean |
| `remaining_amount` | Tinh toan | So tien khach con no = total - paid (hoac co surcharge) | VND |

---

## Loai giu cho (Deposit Type / deposit_type)

**Giai thich:** `deposit_type` = loai tien KHACH TRA TRUOC de GIU CHO (prepay mot phan tien thue), KHAC voi `deposit_amount` (coc xe bao dam, mac dinh 2 trieu). `required_prepay_amount` = so tien giu cho phai tra truoc, tinh theo deposit_type. Khi giao xe, so da tra truoc duoc tru vao tien thue con lai.

**Luu y thuc te:** Hien 283/283 booking deu deposit_type=0 — tinh nang nay chua duoc su dung trong thuc te.

| So | Ten Enum | Mo ta |
|----|----------|-------|
| 0 | NONE | Khong tra truoc — khach thanh toan toan bo khi giao/nhan xe |
| 1 | 1_DAY | Giu cho bang gia 1 ngay thue |
| 2 | HALF_DAY | Giu cho bang 50% gia 1 ngay thue |
| 3 | CUSTOM | Tuy chinh — admin nhap tay so tien giu cho |

---

## Roles (Phan quyen noi bo)

| Role | Ten hien thi | Quyen chung |
|------|-------------|-------------|
| **ROLE_ADMIN** | Admin | Toan quyen. Duoc revert hard (4→3, 5→3, 7→3, 8→3). Xoa entity. |
| **ROLE_MANAGER** | Quan ly | Gan nhu toan quyen tru hard revert. Duoc soft revert 6→3. |
| **ROLE_XANH** | Nhan vien Xanh | Tao booking, giao/nhan xe, them phu phi, in hop dong. Khong tao xe/tram moi. |
| **ROLE_STAFF** | Nhan vien | Tuong tu XANH — xem, giao/nhan xe, them phu phi. Khong tao xe/tram. |

**Luu y:** Internal-auth-service luu role trong bang `roles` (field `name`). JWT tra ve authorities duoi dang `ROLE_ADMIN`, `ROLE_MANAGER`, v.v.

---

## Loai the chap (Mortgage Type)

| So | Y nghia |
|----|---------|
| Tai san | Khach de lai tai san (xe may, xe o to...) |
| Tien mat | Khach de lai tien mat |
| Ca hai | Vua tai san vua tien mat |

---

## Thuat ngu ky thuat nhanh

| Thuat ngu | Giai thich nhanh |
|-----------|-----------------|
| **BFF Route** | `src/app/api/**/route.ts` trong admin FE — proxy request tu Next.js den BE, them header auth |
| **Request Wrapper** | Pattern trong xanh-service: moi request la 1 class extend `BasicRequest`, chua field `data` la DTO thuc su |
| **ResponseCode** | Field `responseCode` trong body JSON, khong phai HTTP status. xanh="00", auth="200" |
| **MapStruct** | Lib Java mapping DTO <-> Entity, ten class `*Mapper` |
| **@Transactional** | Annotation Spring dat tren moi method update nhieu bang |
| **Soft delete** | Xoa bang cach danh dau `deleted=true` hoac `deleted_at=now()`, KHONG xoa row |
| **Presigned URL** | URL S3 tam thoi de upload/download anh, co TTL |
| **Worktree** | Git worktree rieng cho moi task song song, ten: `<repo>-<task-slug>` |
| **Mesoft** | He thong cu ma AMZ dong bo du lieu (third-party-api.url trong application.yml) |
| **KYC** | Xac minh danh tinh khach hang — CCCD (Identity) va Bang lai xe (License) |
| **OCR** | Quet CCCD tu anh, dung Python PaddleOCR sidecar (`ocr.service.base-url`) |
