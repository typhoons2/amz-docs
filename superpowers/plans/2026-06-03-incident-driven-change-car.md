# Đổi xe / Kết thúc HĐ theo Sự cố — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thiết kế lại F3 — đổi xe chỉ khi xe ở trạng thái Sự cố (lỗi kỹ thuật / tai nạn), thêm nhánh Kết thúc HĐ, và bổ sung chỗ xem lại ảnh giao/nhận/chứng từ.

**Architecture:** Cùng 1 hợp đồng (không tạo đơn mới). Tận dụng status `INCIDENT (7)` + thêm trường phân loại `incidentType`; thêm status `CHANGING_CAR (9)`. Đổi xe = 2 bước (văn phòng chốt xe+tiền → hiện trường thu cũ/giao mới). Kết thúc HĐ tái dùng `performReceive` → `REFUND_PENDING (6)`. Nhật ký xe lưu ở `booking_car_history`.

**Tech Stack:** BE Spring Boot (xanh-service, Java, JPA, JUnit5 + AssertJ + Mockito), DB PostgreSQL (lead apply migration tay), FE Next.js App Router (amazing-xanh-admin-fe, TypeScript).

> **Spec nguồn:** `docs/superpowers/specs/2026-06-03-incident-driven-change-car-design.md`. Đọc spec trước khi làm.
> **Quy ước repo (CLAUDE.md):** mỗi task = 1 git worktree riêng; ResponseCode xanh = `"00"`; comment tiếng Việt, tên method tiếng Anh; KHÔNG tự apply SQL — sinh file `migration-*.sql`, lead apply tay; KHÔNG merge/push thẳng main.

---

## Phạm vi & cách chia wave

Tính năng đụng 2 repo (BE `xanh-service`, FE `amazing-xanh-admin-fe`), nhiều file → chia 4 wave theo phụ thuộc. **Wave 0 (researcher) bắt buộc chạy trước** để ghim chữ ký/đường dẫn còn ẩn (đúng rule "grep trước, không đoán").

| Wave | Nội dung | Repo | Phụ thuộc |
|------|----------|------|-----------|
| 0 | Researcher điều tra | cả 2 | — |
| 1 | BE nền: migration + status + incidentType + báo sự cố + booking_car_history | xanh-service | Wave 0 |
| 2 | BE: đổi xe (2 endpoint) + kết thúc HĐ (mở rộng performReceive) | xanh-service | Wave 1 |
| 3 | FE: báo sự cố + đổi xe (2 dialog) + kết thúc HĐ + status label/filter + xem ảnh | amazing-xanh-admin-fe | Wave 1 contract (chạy song song Wave 2 sau khi chốt contract) |

---

## File Structure (đường dẫn thật)

### BE — `xanh-service`
| File | Trách nhiệm | New/Modify |
|------|-------------|-----------|
| `.../infrastructure/entity/Booking.java` | Thêm `STATUS_CHANGING_CAR=9`, `incidentType` + hằng `INCIDENT_TYPE_*` | Modify |
| `.../infrastructure/entity/BookingCarHistory.java` | Entity nhật ký xe | New |
| `.../infrastructure/repository/BookingCarHistoryRepository.java` | Repo nhật ký xe | New |
| `.../domain/service/BookingCarHistoryService.java` (+ `impl/BookingCarHistoryServiceImpl.java`) | Ghi/đóng/mở row nhật ký xe | New |
| `.../domain/service/impl/BookingServiceImpl.java` | Luật chuyển trạng thái + `changeCar()` + `performChangeCarDelivery()` + mở rộng `performReceive` nguồn INCIDENT + báo sự cố set `incidentType` | Modify |
| `.../domain/service/BookingService.java` | Khai báo method mới | Modify |
| `.../application/controller/admin/BookingAdminController.java` | 2 endpoint `/change-car`, `/change-car/deliver` | Modify |
| `.../application/resource/request/wrapper/ChangeCarRequest.java` + `.../data/booking/ChangeCarRequestData.java` | DTO đổi xe (văn phòng) | New |
| `.../application/resource/request/wrapper/ChangeCarDeliverRequest.java` + `.../data/booking/ChangeCarDeliverRequestData.java` | DTO đổi xe tại chỗ (hiện trường) | New |
| `migration-incident-change-car-<date>.sql` | ALTER new_bookings + CREATE booking_car_history + BACKFILL | New (lead apply tay) |
| `src/test/java/.../group3_business/change_car/*.java` | Test BE | New |

### FE — `amazing-xanh-admin-fe`
| File | Trách nhiệm | New/Modify |
|------|-------------|-----------|
| `.../contract/components/dialog/IncidentReportDialog.tsx` | Dialog "Báo sự cố" (chọn loại + ghi chú) | New |
| `.../contract/components/dialog/changecar/ChangeCarOfficeDialog.tsx` | Dialog đổi xe (văn phòng) | New |
| `.../contract/components/dialog/changecar/ChangeCarDeliverDialog.tsx` | Màn đổi xe tại chỗ (thu cũ + giao mới) | New |
| `.../contract/components/detail/tab/DocumentTab.tsx` (hoặc tab phù hợp) | Khu ảnh giao/nhận cố định (4.1) | Modify |
| `.../contract/components/detail/tab/ExpenseTab.tsx` | Ảnh chứng từ theo từng Phiếu Thu (4.3) — chỉ nếu chưa có | Modify |
| `.../delivery-receive/components/dialog/ReceiveDialog.tsx` | Cho mở từ INCIDENT (Kết thúc HĐ) + xem ảnh giao (4.2) | Modify |
| `.../contract/types/status/contract.status.ts` | Thêm label `CHANGING_CAR` + nhãn loại sự cố | Modify |
| `.../contract/components/filter/ContractFilter.tsx` | Thêm option lọc `CHANGING_CAR` | Modify |
| `.../contract/services/useContract.ts` | Hook `reportIncident()`, `changeCar()`, `changeCarDeliver()` | Modify |
| `.../contract/types/contract.request.ts` | Type request mới | Modify |
| `src/app/api/booking/contract/change-car/route.ts` + `.../change-car/deliver/route.ts` | BFF | New |
| nút action top trang chi tiết (researcher ghim file) | "Báo sự cố" / "Đổi xe" / "Kết thúc HĐ" theo trạng thái | Modify |

---

## Wave 0 — Researcher (1 agent, ~30–45 phút)

**Mục tiêu:** ghim các điểm còn ẩn, KHÔNG code. Xuất 1 file `docs/superpowers/research/2026-06-03-change-car-findings.md`.

- [ ] **Điều tra BE:**
  1. Trong `BookingServiceImpl.java`: tên method validate chuyển trạng thái (vd `validateStatusTransition`) + cấu trúc (map/switch) để biết thêm transition `7→9`, `9→3`, `7→6` ở đâu.
  2. `performReceive` hiện guard nguồn từ status nào (chỉ ONGOING?) → chỗ cần nới cho INCIDENT.
  3. `performDelivery` ghi `deliveryImages`/`startKm` thế nào → tái dùng cho phần "giao xe mới".
  4. Cách tạo Phiếu Thu RENTAL_PAYMENT (service/method) khi gia hạn (F2 `extendBooking`) để tái dùng cho tiền chênh đổi xe.
  5. Cách `updateBookingStatus` nhận field phụ (note) → chỗ nhét `incidentType` khi báo sự cố.
- [ ] **Điều tra FE:**
  1. File chứa **nút action top** trang chi tiết hợp đồng (đặt nút Báo sự cố/Đổi xe/Kết thúc HĐ) + cách ẩn/hiện theo `status`.
  2. `ExpenseTab.tsx`: danh sách Phiếu Thu **đã hiển thị ảnh chứng từ** chưa (quyết 4.3 có cần làm không).
  3. Tab nào hợp lý để đặt khu ảnh giao/nhận cố định (4.1) — `DocumentTab` hay `OverviewTab`.
  4. Mẫu gọi API + store của `ExtendCreateDialog.tsx` + `useExtend.ts` để nhái cho đổi xe.
- [ ] **Xác nhận tên cột DB** cho `booking_car_history` (FK trỏ `new_bookings(id)` + `new_cars(id)` — grep entity Car để lấy tên bảng xe thật).
- [ ] **Báo lead** danh sách nơi đang dùng `booking.car_id` cho report/export (grep `getCarId`/`car_id`) — để biết F5/Excel có bị ảnh hưởng.

> Gate: researcher xong → lead/team-lead review findings → mới spawn Wave 1.

---

## Wave 1 — BE nền (1 agent `be-incident-foundation`)

### Task 1.1 — Migration SQL (lead apply tay)

**Files:** Create `migration-incident-change-car-<date>.sql`

- [ ] **Step 1: Viết file SQL** (tên bảng thật `new_bookings`; tên bảng xe lấy từ Wave 0):

```sql
-- 1. Thêm cột phân loại sự cố vào booking
ALTER TABLE new_bookings ADD COLUMN IF NOT EXISTS incident_type VARCHAR(20);
-- incident_type: 'TECHNICAL_FAULT' | 'ACCIDENT' | NULL

-- 1b. Khoản thu treo khi đổi xe chọn "thu khi giao xe mới" (lưu trên đơn — Wave 0 chốt dùng cột mới)
ALTER TABLE new_bookings ADD COLUMN IF NOT EXISTS change_car_pending_amount NUMERIC(19,2);
ALTER TABLE new_bookings ADD COLUMN IF NOT EXISTS change_car_pending_mode VARCHAR(30);
-- change_car_pending_mode: phương thức thu sẽ dùng khi giao xe mới (PAY_NOW...). NULL = không có khoản treo.

-- 2. Bảng nhật ký xe của booking (tên bảng xe thật = new_cars — Wave 0 xác nhận)
CREATE TABLE IF NOT EXISTS booking_car_history (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES new_bookings(id),
    car_id BIGINT NOT NULL REFERENCES new_cars(id),
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    reason VARCHAR(500),
    created_by UUID,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bch_booking_id ON booking_car_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_bch_car_id_dates ON booking_car_history(car_id, from_date, to_date);

-- 3. Backfill: mỗi booking hiện có -> 1 row nhật ký (car_id của new_bookings NOT NULL)
INSERT INTO booking_car_history (booking_id, car_id, from_date, to_date, created_at)
SELECT id, car_id, start_time::date, end_time::date, created_at
FROM new_bookings;
```

- [ ] **Step 2: Commit** file SQL (KHÔNG apply). `git add migration-incident-change-car-*.sql && git commit -m "chore: migration incident_type + booking_car_history"`

### Task 1.2 — Entity: status + incidentType

**Files:** Modify `.../infrastructure/entity/Booking.java`

- [ ] **Step 1:** Thêm sau `STATUS_SEIZED`:

```java
// 9 = CHANGING_CAR (Đổi xe - chờ giao xe mới)
public static final int STATUS_CHANGING_CAR = 9;

// Phân loại sự cố (incident_type)
public static final String INCIDENT_TYPE_TECHNICAL_FAULT = "TECHNICAL_FAULT";
public static final String INCIDENT_TYPE_ACCIDENT = "ACCIDENT";
```

- [ ] **Step 2:** Thêm field:

```java
/** Loại sự cố khi status = INCIDENT: TECHNICAL_FAULT | ACCIDENT | null. */
@Column(name = "incident_type", length = 20)
private String incidentType;
```

- [ ] **Step 3:** Compile. `./mvnw -q compile` → PASS. **Commit.**

### Task 1.3 — Entity + Repository nhật ký xe

**Files:** Create `BookingCarHistory.java`, `BookingCarHistoryRepository.java`

- [ ] **Step 1:** Viết entity `BookingCarHistory` map bảng `booking_car_history` (theo mẫu `Booking.java`: `@Entity @Table(name="booking_car_history")`, các field `bookingId, carId, fromDate(LocalDate), toDate(LocalDate), reason, createdBy(UUID), createdAt`).
- [ ] **Step 2:** Repository `extends JpaRepository<BookingCarHistory, Long>` + method `Optional<BookingCarHistory> findTopByBookingIdOrderByFromDateDesc(Long bookingId)` (lấy row mới nhất) + `List<BookingCarHistory> findByBookingIdOrderByFromDateAsc(Long bookingId)`.
- [ ] **Step 3:** Compile → PASS. **Commit.**

### Task 1.4 — Service nhật ký xe (TDD)

**Files:** Create `BookingCarHistoryService.java` + impl; Test `.../group3_business/change_car/BookingCarHistoryServiceTest.java`

- [ ] **Step 1: Test trước** — `createInitialRow` tạo 1 row [start,end]; `closeAndOpenNew(bookingId, swapDate, newCarId, reason, by)` đóng row cũ `to_date=swapDate-1` và mở row mới `[swapDate, oldToDate]`; `updateLatestToDate(bookingId, newToDate)` (cho F2 tương lai).

```java
@Test @DisplayName("đổi xe: đóng row cũ ở ngày đổi-1, mở row mới từ ngày đổi")
void changeCar_closesOldOpensNew() {
    // given booking history [1/6..5/6] car=10; đổi sang car=20 ngày 3/6
    // when closeAndOpenNew(bId, 2026-06-03, 20, "lỗi", by)
    // then row cũ to_date=2/6; row mới car=20 [3/6..5/6]
}
```

- [ ] **Step 2:** Chạy test → FAIL. **Step 3:** Viết impl tối thiểu. **Step 4:** Test → PASS. **Step 5: Commit.**

### Task 1.5 — Báo sự cố set incidentType (TDD)

**Files:** Modify `BookingServiceImpl.java` (`updateBookingStatus`), Test `.../group3_business/change_car/ReportIncidentTest.java`

- [ ] **Step 1: Test** — ONGOING(3) → INCIDENT(7) kèm `incidentType=TECHNICAL_FAULT` → booking.status=7, incidentType set, log STATUS_CHANGE. Thiếu incidentType khi vào INCIDENT → throw `BusinessException("Phải chọn loại sự cố")`. INCIDENT→ONGOING clear incidentType.
- [ ] **Step 2:** Test → FAIL. **Step 3:** Sửa `updateBookingStatus` set/clear `incidentType` (chỗ chính xác lấy từ Wave 0). **Step 4:** Test → PASS. **Step 5: Commit.**

### Task 1.6 — Tạo row nhật ký khi createBooking

**Files:** Modify `BookingServiceImpl.java` (createBooking), Test bổ sung.

- [ ] **Step 1: Test** — tạo booking mới → có đúng 1 row `booking_car_history` [start..end]. **Step 2:** FAIL. **Step 3:** Gọi `bookingCarHistoryService.createInitialRow(...)` trong createBooking. **Step 4:** PASS. **Step 5: Commit.**

---

## Wave 2 — BE đổi xe + kết thúc HĐ (1 agent `be-change-car`)

> Gửi contract API (mục dưới) cho team trước khi code để FE chạy song song.

### Task 2.1 — Transition matrix mở rộng (TDD)

**Files:** Modify `BookingServiceImpl.java` (validate transition), Test `.../group3_business/status_transition/` (bổ sung).

- [ ] **Step 1: Test** — cho phép `7→9` (đổi xe), `9→3` (giao xe mới), `7→6` (kết thúc HĐ qua receive). Chặn `3→9` (không được đổi xe khi chưa sự cố) → throw.
- [ ] **Step 2:** FAIL. **Step 3:** Thêm transition vào matrix (vị trí từ Wave 0). **Step 4:** PASS. **Step 5: Commit.**

### Task 2.2 — DTO đổi xe (văn phòng + hiện trường)

**Files:** Create `ChangeCarRequest/Data.java`, `ChangeCarDeliverRequest/Data.java`

- [ ] **Step 1:** `ChangeCarRequestData`: `bookingId, newCarId, newRentalPrice, priceDiffAmount, paymentMode(PAY_NOW|DEDUCT_FROM_DEPOSIT|PAY_LATER), collectTiming(AT_OFFICE|AT_DELIVERY), ck*, cash*, reason`. `ChangeCarDeliverRequestData`: `bookingId, oldCarEndKm, oldCarReturnImages, newCarStartKm, newCarDeliveryImages, signatureImage, ck*, cash*` (ck/cash chỉ khi khoản treo AT_DELIVERY). Validate cơ bản như spec mục 6.2/6.3.
- [ ] **Step 2:** Compile → PASS. **Commit.**

### Task 2.3 — changeCar() văn phòng (TDD theo spec test 3–7)

**Files:** Modify `BookingService.java` + `BookingServiceImpl.java`; Test `.../group3_business/change_car/ChangeCarOfficeTest.java`

- [ ] **Step 1: Test** (mỗi case 1 `@Test`, theo spec mục 8):
  - chênh +600k, PAY_NOW + AT_OFFICE → tạo Phiếu Thu 600k, paidAmount tăng, status=CHANGING_CAR, **history CHƯA đổi**.
  - chênh +600k, PAY_NOW + AT_DELIVERY → CHƯA tạo phiếu thu, lưu khoản treo, status=CHANGING_CAR.
  - chênh −300k → không thu, totalAmount giảm, status=CHANGING_CAR.
  - DEDUCT cọc không đủ → throw `"Cọc không đủ để trừ"`.
  - reason trống → throw.
- [ ] **Step 2:** FAIL. **Step 3:** Impl `changeCar()`: set `carId/carName/licensePlate/rentalPrice` xe mới, `totalAmount += priceDiff`, xử lý tiền theo bảng spec 3.2, lưu khoản treo nếu AT_DELIVERY (cách lưu: field tạm trên booking hoặc bản ghi — chốt theo Wave 0), status→CHANGING_CAR, audit. **KHÔNG** đụng history. **Step 4:** PASS. **Step 5: Commit.**

### Task 2.4 — performChangeCarDelivery() hiện trường (TDD theo spec test 8–11)

**Files:** Modify `BookingServiceImpl.java`; Test `ChangeCarDeliverTest.java`

- [ ] **Step 1: Test:**
  - có khoản treo AT_DELIVERY → thu tại hiện trường → tạo Phiếu Thu + xóa khoản treo + status=ONGOING.
  - không khoản treo → chỉ ghi nhận xe (deliveryImages/startKm = xe mới) → status=ONGOING.
  - sau bước này: `booking_car_history` có 2 row (cũ đóng ở ngày đổi−1, mới mở ở ngày đổi).
- [ ] **Step 2:** FAIL. **Step 3:** Impl: ghi `endKm`/`receiveImages` xe cũ (lưu audit), set `deliveryImages`/`startKm` xe mới, thu tiền nếu có khoản treo, gọi `bookingCarHistoryService.closeAndOpenNew(...)`, status→ONGOING, audit. **Step 4:** PASS. **Step 5: Commit.**

### Task 2.5 — Kết thúc HĐ: mở rộng performReceive nguồn INCIDENT (TDD test 12)

**Files:** Modify `BookingServiceImpl.java` (`performReceive`); Test `EndContractFromIncidentTest.java`

- [ ] **Step 1: Test** — INCIDENT(7) → performReceive (isHoldDeposit=true) → status=REFUND_PENDING(6), set refundRequestedAt, ghi endKm/receiveImages. **Step 2:** FAIL. **Step 3:** Nới guard nguồn của performReceive cho phép từ INCIDENT (vị trí Wave 0). **Step 4:** PASS. **Step 5: Commit.**

### Task 2.6 — Controller 2 endpoint

**Files:** Modify `BookingAdminController.java`

- [ ] **Step 1:** Thêm `@PostMapping("/change-car")` → `changeCar`, `@PostMapping("/change-car/deliver")` → `performChangeCarDelivery`; trả ResponseCode `"00"`. **Step 2:** `./mvnw -q test` (group change_car) → PASS. **Step 3: Commit.**

**Contract API (gửi FE):** xem spec mục 6.2 (`/change-car`) + 6.3 (`/change-car/deliver`). Báo sự cố dùng endpoint `updateBookingStatus` sẵn có + thêm field `incidentType`. Kết thúc HĐ dùng endpoint `performReceive` sẵn có (nguồn INCIDENT).

### Task 2.7 — Sửa F5 Tỉ lệ lấp đầy đọc từ nhật ký xe (TDD)

> Lead chốt: đợt này CHỈ sửa Tỉ lệ lấp đầy. Doanh thu theo xe + Excel để task sau.

**Files:** Modify `.../ReportFillRateServiceImpl.java` (Wave 0 ghim: dùng `car_id` tại dòng ~86, ~358); Test `.../group3_business/change_car/FillRateAfterChangeCarTest.java`

- [ ] **Step 1: Test** — booking VF3 thuê 3 ngày, đổi sang Hyundai ngày 2 (nhật ký xe có 2 row). Query tỉ lệ lấp đầy kỳ đó: VF3 = 1 ngày, Hyundai = 2 ngày (KHÔNG phải Hyundai 3 + VF3 0). Booking không đổi xe → giống hệt trước (backfill 1 row).
- [ ] **Step 2:** Test → FAIL. **Step 3:** Đổi query đọc từ `booking_car_history` thay vì `booking.car_id`:

```sql
SELECT car_id, SUM(LEAST(to_date, :toDate) - GREATEST(from_date, :fromDate) + 1) AS days_occupied
FROM booking_car_history
WHERE from_date <= :toDate AND to_date >= :fromDate
GROUP BY car_id
```

- [ ] **Step 4:** Test → PASS. **Step 5: Commit.**

---

## Wave 3 — FE (1 agent `fe-incident-change-car`, sau khi chốt contract)

### Task 3.1 — Status label + filter
**Files:** Modify `contract.status.ts`, `ContractFilter.tsx`
- [ ] Thêm nhãn `CHANGING_CAR` = "Đổi xe — Chờ giao xe mới"; nhãn loại sự cố "Lỗi kỹ thuật"/"Tai nạn". Thêm option lọc `CHANGING_CAR`. Build FE `npm run build` → PASS. **Commit.**

### Task 3.2 — Dialog Báo sự cố
**Files:** Create `IncidentReportDialog.tsx`; Modify nút action top (file Wave 0), `useContract.ts`, `contract.request.ts`
- [ ] Dialog chọn loại (Lỗi kỹ thuật / Tai nạn) + ghi chú → gọi `updateBookingStatus` với `incidentType`. Nút "Báo sự cố" chỉ hiện khi status=ONGOING. **Test thủ công** (kịch bản dưới). **Commit.**

### Task 3.3 — Đổi xe văn phòng
**Files:** Create `ChangeCarOfficeDialog.tsx`, BFF `change-car/route.ts`; Modify `useContract.ts`, `contract.request.ts`, nút action
- [ ] Nhái mẫu `ExtendCreateDialog.tsx`: chọn xe mới + tiền chênh + cách thu + **thời điểm thu (AT_OFFICE/AT_DELIVERY)** + lý do (bắt buộc). Xe rẻ hơn → ẩn phần thu, hiện thông báo hoàn cuối kỳ. Nút "Đổi xe" chỉ hiện khi status=INCIDENT. **Commit.**

### Task 3.4 — Đổi xe tại chỗ (hiện trường)
**Files:** Create `ChangeCarDeliverDialog.tsx`, BFF `change-car/deliver/route.ts`
- [ ] 1 màn gộp: phần A thu xe cũ (km cuối + ảnh, dùng `MultiImageUploader`) + **xem lại ảnh xe cũ lúc giao (4.2)**; phần B giao xe mới (km đầu + ảnh + ký); phần C thu tiền **chỉ hiện nếu khoản treo AT_DELIVERY**. Nút "Đổi xe tại chỗ" hiện khi status=CHANGING_CAR. **Commit.**

### Task 3.5 — Kết thúc HĐ
**Files:** Modify `ReceiveDialog.tsx`, nút action
- [ ] Nút "Kết thúc HĐ" khi status=INCIDENT → mở `ReceiveDialog` (tái dùng) → sang Chờ hoàn cọc. Hiện sẵn ảnh giao để đối chiếu (4.2). **Commit.**

### Task 3.6 — Khu ảnh giao/nhận cố định (4.1)
**Files:** Modify `contract/components/detail/tab/DocumentTab.tsx` (Wave 0: đây là tab ảnh; data `deliveryImageUrls`/`receiveImageUrls` có sẵn ở `contract.response.ts:107,112`)
- [ ] Khu "Ảnh giao/nhận xe" đọc `deliveryImageUrls` + `receiveImageUrls` (+ ảnh các lần đổi nếu có) — xem mọi lúc kể cả đơn đã hoàn thành, chỉ đọc. Build → PASS. **Commit.**

### Task 3.7 — Xem Phiếu Thu + ảnh chứng từ ở màn hợp đồng (4.3)
> Lead chốt: làm đợt này. Wave 0 xác nhận `ExpenseTab` đang lọc cứng `type:2` (chỉ Phiếu Chi) → Phiếu Thu (type 1) CHƯA hiển thị ở chi tiết HĐ.
**Files:** Modify `contract/components/detail/tab/ExpenseTab.tsx`
- [ ] Cho hiển thị **cả Phiếu Thu (type 1)** lẫn Phiếu Chi, tách rõ 2 nhóm. Mỗi phiếu xem được ảnh chứng từ (UNC/biên nhận) — tái dùng cơ chế xem ảnh đã có cho Phiếu Chi. Build → PASS. **Commit.**

---

## Kịch bản test thủ công cho lead (localhost:3000)

1. **Báo sự cố:** vào hợp đồng Đang thuê → "Báo sự cố" → chọn Lỗi kỹ thuật → đơn chuyển "Sự cố".
2. **Đổi xe (thu tại VP):** ở đơn Sự cố → "Đổi xe" → chọn xe mới, chênh +600k, thu ngay tại VP → đơn "Chờ giao xe mới", có Phiếu Thu 600k.
3. **Đổi xe tại chỗ:** ở đơn Chờ giao xe mới → "Đổi xe tại chỗ" → nhập km/ảnh xe cũ + xe mới → đơn về "Đang thuê".
4. **Thu khi giao:** lặp lại bước 2 chọn "thu khi giao xe mới" → bước 3 hiện ô thu tiền.
5. **Kết thúc HĐ:** ở đơn Sự cố → "Kết thúc HĐ" → màn Nhận xe → đơn "Chờ hoàn cọc" → Quản lý duyệt hoàn.
6. **Xem ảnh:** mở 1 đơn đã hoàn thành → vẫn xem lại được ảnh giao + ảnh nhận; mở 1 Phiếu Thu → thấy ảnh chứng từ.

---

## Ngoài phạm vi (nhắc lại)
- Thu tiền trước khi giao xe **lần đầu** (đơn mới) — task riêng.
- Tự khóa xe sự cố không cho gán đơn khác.
- Báo cáo downtime theo loại sự cố.
- **Doanh thu theo xe + Excel export theo xe** đọc từ nhật ký xe — task sau (lead chốt đợt này chỉ sửa Tỉ lệ lấp đầy ở Task 2.7). Lưu ý: sau khi ship đổi xe, các báo cáo này tạm gán theo `booking.car_id` mới cho đơn đã đổi.

---

## Self-review (đã rà)
- **Spec coverage:** Báo sự cố (T1.5, T3.2), incidentType (T1.2), CHANGING_CAR (T1.2, T2.1, T3.1), đổi xe VP + tiền + thời điểm thu (T2.3, T3.3), đổi xe tại chỗ (T2.4, T3.4), kết thúc HĐ (T2.5, T3.5), cùng hợp đồng (T2.3 không tạo đơn mới), nhật ký xe (T1.3/1.4/1.6/2.4), xem ảnh 4.1/4.2/4.3 (T3.4/3.5/3.6), migration (T1.1). ✔
- **Ngày đổi/đóng row:** thống nhất đóng row cũ `to_date = ngày đổi − 1`, mở row mới từ ngày đổi (T1.4 + T2.4). ✔
- **Khoản thu treo:** cách lưu chốt ở Wave 0; dùng nhất quán T2.3 (lưu) ↔ T2.4 (thu + xóa). ✔
- **carId NOT NULL** (entity) → backfill không cần WHERE car_id IS NOT NULL (đã bỏ). ✔
