# Research Findings — Đổi xe / Kết thúc HĐ theo Sự cố (Wave 0)

**Ngày:** 2026-06-03
**Researcher:** agent Wave 0 (CHỈ điều tra, KHÔNG sửa code).
**Repo BE:** `xanh-service` · **Repo FE:** `amazing-xanh-admin-fe`

> Mọi đường dẫn là tuyệt đối. Mọi kết luận kèm `file:line`. Chỗ mơ hồ ở mục cuối "RỦI RO / CẦN LEAD QUYẾT".

---

## BE — `xanh-service`

File chính: `C:\Users\it\OneDrive\Desktop\Project\xanh-service\src\main\java\vn\AMZ\xanh_service\domain\service\impl\BookingServiceImpl.java` (viết tắt **BSImpl** dưới đây).

### 1. Method validate chuyển trạng thái — cấu trúc + chỗ thêm transition 7→9, 9→3, 7→6

- **Method:** `private void validateStatusTransition(Integer currentStatus, Integer newStatus)` — **BSImpl:2850**.
- **Cấu trúc:** KHÔNG phải Map/switch. Là chuỗi **`if / else if`** theo `currentStatus`, mỗi nhánh set `boolean isValidTransition` bằng các phép so sánh `==` với hằng `Booking.STATUS_*`. Cuối hàm (BSImpl:2913) nếu `!isValidTransition` thì `throw BusinessException`.
- **Gọi từ:** `updateBookingStatus` tại **BSImpl:1620**.
- **Chỗ sửa để thêm transition:**
  - **7→9 (INCIDENT→CHANGING_CAR):** thêm `|| (Booking.STATUS_CHANGING_CAR == newStatus)` vào nhánh `INCIDENT` — **BSImpl:2889-2894** (`else if (Booking.STATUS_INCIDENT == currentStatus)`). LƯU Ý: hiện chưa có hằng `STATUS_CHANGING_CAR=9` trong `Booking.java` → phải thêm hằng trước (Wave 1 Task 1.2).
  - **9→3 (CHANGING_CAR→ONGOING):** thêm 1 nhánh MỚI `else if (Booking.STATUS_CHANGING_CAR == currentStatus) { isValidTransition = (Booking.STATUS_ONGOING == newStatus); }` — chèn quanh **BSImpl:2895** (trước nhánh `SEIZED`).
  - **7→6 (INCIDENT→REFUND_PENDING):** **ĐÃ HỢP LỆ SẴN** trong nhánh INCIDENT — **BSImpl:2892** đã có `|| (Booking.STATUS_REFUND_PENDING == newStatus)`. Nhưng spec nói kết thúc HĐ phải đi qua `performReceive` (không qua `updateBookingStatus`), nên transition này dùng cho guard nội bộ của performReceive, không phải qua dialog status thường.
- **Lưu ý quan trọng — LOCKED transitions:** quy ước hiện tại CHẶN các transition “qua dialog” (2→3 Giao xe, 3→4 / 3→6 Nhận xe) ngay trong `updateBookingStatus`/validate (BSImpl:2916-2924). Tương tự, **9→3** nên được thực hiện qua endpoint `performChangeCarDelivery` MỚI (không qua dialog status), để đảm bảo có km/ảnh. Cần quyết: có đưa 9→3 vào danh sách LOCKED_MANUAL (chặn chọn tay) hay không.

### 2. `performReceive` — guard nguồn status + chỗ nới cho INCIDENT

- **Method:** `public AMZResponse<BookingAdminResponse> performReceive(PerformReceiveRequestData data)` — **BSImpl:3931**.
- **Guard nguồn HIỆN TẠI (chỉ ONGOING=3):** **BSImpl:3955-3961**:
  ```java
  // Step 2: Validate Status (must be ONGOING)
  if (Booking.STATUS_ONGOING != booking.getStatus()) {
      throw new BusinessException(ResultCode.INVALID_REQUEST,
              "Booking status must be ONGOING (3) to perform receive");
  }
  ```
- **Chỗ cần nới:** sửa điều kiện ở **BSImpl:3956** để cho phép cả INCIDENT(7), ví dụ:
  `if (Booking.STATUS_ONGOING != status && Booking.STATUS_INCIDENT != status) throw ...`.
- **Set status đích:** **BSImpl:4384-4396**. Khi `isHoldDeposit=true` → `setStatus(REFUND_PENDING)` + `setRefundRequestedAtIfNeeded(booking)` (helper idempotent tại **BSImpl:3104**). Khi false → `validateFullPayment` + `setStatus(COMPLETED)`. → Kết thúc HĐ từ INCIDENT chỉ cần gọi performReceive với `isHoldDeposit=true` (đúng spec 6.4).
- **Ghi nhận xe:** `setReceiveImages` + `setEndKm` tại **BSImpl:4151-4152**.

### 3. `performDelivery` — cách ghi `deliveryImages` / `startKm` (tái dùng cho “giao xe mới”)

- **Method:** `public AMZResponse<BookingAdminResponse> performDelivery(PerformDeliveryRequestData data)` — **BSImpl:3508**.
- **Ghi ảnh giao + ODO đầu:** **BSImpl:3771-3774**:
  ```java
  if (data.getCarConditionImages() != null) {
      booking.setDeliveryImages(data.getCarConditionImages());   // 3772
  }
  booking.setStartKm(data.getCurrentKm());                        // 3774
  ```
- **Video giao (optional):** `setDeliveryVideo` — **BSImpl:3784-3787**.
- **Tạo Phiếu Thu khi giao (thu trước):** trong performDelivery có nhánh tạo `TransactionCategory("RENTAL_PAYMENT")` — **BSImpl:3863-3879** (tham khảo mẫu tạo phiếu thu khi giao xe). → Tái dùng cho phần C (thu tiền khi giao xe mới) của `performChangeCarDelivery`.
- **Field entity:** `car_name` (Booking.java:75-76), `license_plate` (Booking.java:78-79), `startKm`, `deliveryImages` đều có sẵn.

### 4. Tạo Phiếu Thu RENTAL_PAYMENT — mẫu tái dùng cho tiền chênh đổi xe

Có **2 nơi** tạo Phiếu Thu RENTAL_PAYMENT, đều dùng chung pattern (find-or-create category code `"RENTAL_PAYMENT"` → build `Transaction(type=1)` → `transactionRepository.save`):

- **Mẫu sạch nhất — `prePayment(...)`** (xử lý PrePaymentDialog): **BSImpl:5655-5696**.
  - `transactionCategoryRepository.findByCode("RENTAL_PAYMENT").orElseGet(...)` — BSImpl:5656-5667.
  - `generateTransactionCode(1)` — BSImpl:5669.
  - `Transaction.builder().type(1).categoryId(rentalCategory.getId()).bookingId(...).carId(...).customerId(...).paymentMethodId(...).documentImages(...)` — BSImpl:5674-5692.
  - `booking.setPaidAmount(currentPaid.add(amount))` — BSImpl:5651.
- **Mẫu thứ 2 — trong `performDelivery`:** BSImpl:3863-3879 (thu khi giao xe).
- **`extendBooking`** (F2): **BSImpl:4713**. KHÔNG tự tạo Phiếu Thu RENTAL_PAYMENT bên trong — chỉ cập nhật `totalAmount`/`endTime`; việc thu tiền gia hạn đi qua luồng phiếu thu riêng. → Mẫu chuẩn để COPY cho tiền chênh đổi xe là **`prePayment` (BSImpl:5655-5696)**, KHÔNG phải extendBooking.
- **Dependencies có sẵn (injected):** `transactionService` (BSImpl:165), `transactionRepository`, `transactionCategoryRepository`, `generateTransactionCode(int)`. Có thể gọi trực tiếp `TransactionService.createTransaction(...)` (mẫu tại BSImpl:6580) nếu muốn tách logic.

### 5. `updateBookingStatus` — request shape (DTO) + chỗ nhét `incidentType`

- **DTO:** `C:\Users\it\OneDrive\Desktop\Project\xanh-service\src\main\java\vn\AMZ\xanh_service\application\resource\request\data\booking\UpdateBookingStatusRequestData.java`.
  - Fields hiện có: `id` (NotNull), `status` (NotNull), **`note` (String, optional)** — dòng 29, `targetStatus` (Integer, optional) — dòng 38.
- **Chỗ nhét `incidentType`:** THÊM field mới `private String incidentType;` vào DTO này (sau `targetStatus`, dòng ~38). KHÔNG nên nhồi vào `note` (note là ghi chú audit free-text, giữ riêng).
- **Chỗ set/clear trong service:** `updateBookingStatus` — **BSImpl:1585**. Sau khi xác định `newStatus`:
  - Khi `newStatus == INCIDENT(7)`: bắt buộc `data.getIncidentType()` ∈ {TECHNICAL_FAULT, ACCIDENT}, else throw "Phải chọn loại sự cố"; rồi `booking.setIncidentType(...)`.
  - Khi `INCIDENT→ONGOING` (soft revert đã có tại BSImpl:1639-1644, và xử lý revert quanh BSImpl:1694-1701): clear `booking.setIncidentType(null)`. Chỗ này nằm cùng khối xử lý soft-revert 6/7/8→3.
  - Audit log STATUS_CHANGE đã có sẵn tại **BSImpl:1834-1848** → có thể chèn loại sự cố vào logContent.
- **Lưu ý:** `Booking.java` HIỆN CHƯA có field `incidentType` → phải thêm `@Column(name="incident_type")` (Wave 1 Task 1.2) + migration.

### 6. Nơi report/export dùng `booking.car_id` (ảnh hưởng F5 / Excel khi đổi xe)

Booking entity LƯU DENORMALIZED `car_id` + `car_name` + `license_plate` (Booking.java:75-79) → khi đổi xe các field này bị GHI ĐÈ sang xe mới, **mất lịch sử xe cũ**. Đây chính là lý do cần `booking_car_history`. Các nơi bị ảnh hưởng:

- **F5 — Tỉ lệ lấp đầy:** `C:\Users\it\OneDrive\Desktop\Project\xanh-service\src\main\java\vn\AMZ\xanh_service\domain\service\impl\ReportFillRateServiceImpl.java`
  - Group bookings theo `Booking::getCarId` — **dòng 86** và **dòng 358**.
  - Group maintenance theo `MaintenanceTicket::getCarId` — dòng 88, 360.
  - `buildDailyState(Long carId, ...)` — dòng 220 (đếm ngày xe bận theo carId đơn).
  - → Sau khi đổi xe, query này gán TOÀN BỘ khoảng thuê cho xe MỚI, sai cho cả xe cũ lẫn xe mới. **F5 cần chuyển sang đọc `booking_car_history`** (thuộc Wave 1B gốc, ngoài plan này — plan chỉ tạo bảng + ghi dữ liệu).
- **Report doanh thu:** `C:\Users\it\OneDrive\Desktop\Project\xanh-service\src\main\java\vn\AMZ\xanh_service\domain\service\impl\ReportServiceImpl.java` — `.carId(p.getCarId())` dòng 391.
- **Excel export:** endpoint `POST /export-excel` (controller dòng 155). Excel lấy `carName`/`licensePlate` từ field denormalized của booking (Booking.java:75-79). → Sau đổi xe chỉ thấy xe HIỆN TẠI. Không tìm thấy native query Excel build riêng theo car_id; export dùng dữ liệu booking đã lưu.
- **Availability checks (phụ):** `BookingRepository.findOverlappingBookingsForCars` (BookingRepository.java:267-273), `findBusyCarIds` (dòng 309-313), và search query dùng `b.car_id` (BookingRepository.java:165-234, 340-372) — kiểm tra xe rảnh theo car_id đơn; ít ảnh hưởng vì chỉ xét đơn đang active.

**→ Báo lead:** đổi xe ghi đè `car_id/car_name/license_plate` trên booking. F5 (ReportFillRateServiceImpl:86,358) và Excel/Report doanh thu sẽ chỉ phản ánh xe cuối cùng nếu không đọc `booking_car_history`. Việc sửa F5 NẰM NGOÀI plan này (chỉ tạo bảng + ghi dữ liệu để F5 dùng sau).

### 7. Entity Car — tên bảng THẬT (cho FK booking_car_history.car_id)

- `C:\Users\it\OneDrive\Desktop\Project\xanh-service\src\main\java\vn\AMZ\xanh_service\infrastructure\entity\Car.java` — **dòng 26**: `@Table(name = "new_cars", ...)`.
- Booking: `@Table(name = "new_bookings")` — Booking.java:27.
- → FK: `booking_car_history.booking_id REFERENCES new_bookings(id)`, `car_id REFERENCES new_cars(id)`. Migration trong plan đã đúng tên bảng.

---

## FE — `amazing-xanh-admin-fe`

### 8. Nút ACTION TOP trang chi tiết HĐ + cách ẩn/hiện theo status

- **KHÔNG có cụm nút action chuyên dụng (Báo sự cố/Đổi xe/Kết thúc HĐ) hiện tại.** Việc đổi trạng thái hiện đi qua **chip trạng thái → dialog**.
- File trang chi tiết: `C:\Users\it\OneDrive\Desktop\Project\amazing-xanh-admin-fe\src\features\booking\contract\components\form\ContractDetailForm.tsx`.
  - Chip trạng thái mở `ContractStatusDialog` qua `onClick={() => setOpenStatusDialog(true)}` — **dòng 110** (mobile) và render `<RenderContractStatus .../>` dòng 114, 389.
  - Nút "Sửa" (dòng 357), "Đóng hợp đồng" (dòng 674-681, chuyển sang tab `close`). `canShowCloseTab = [3,6].includes(status)` — **dòng 79**.
  - Dialog status mount tại **dòng 685-691**.
- **Dialog đổi trạng thái:** `C:\Users\it\OneDrive\Desktop\Project\amazing-xanh-admin-fe\src\features\booking\contract\components\dialog\ContractStatusDialog.tsx`.
  - Ẩn/hiện target theo `ALLOWED_TRANSITIONS[currentStatus]` (dòng 82) + `ADMIN_REVERT_TRANSITIONS` (dòng 84). LOCKED transitions disabled qua `LOCKED_MANUAL_TRANSITIONS` (dòng 126-129, 230-233).
  - Gọi API qua `updateStatusContract({ id, status, note })` — **dòng 149**.
- **Bảng transition FE:** `C:\Users\it\OneDrive\Desktop\Project\amazing-xanh-admin-fe\src\features\booking\contract\types\status\contract.status.ts`.
  - `STATUS` chưa có `CHANGING_CAR=9` (dòng 1-10) → cần thêm.
  - `ALLOWED_TRANSITIONS`: `3:[4,6,7,8]` (dòng 31) đã có 7; `7:[3,4,6,8]` (dòng 35) → **cần thêm 9** thành `7:[3,4,6,8,9]`; thêm key `9:[3]`. `STATUS_LABEL` thêm nhãn 9 (dòng 14-23).
- **Cách làm đề xuất:** 3 nút action mới đặt ở header chi tiết (cạnh chip status, ContractDetailForm dòng 388-393) hoặc trong ContractStatusDialog. Ẩn/hiện:
  - "Báo sự cố": chỉ khi `status === STATUS.ONGOING (3)`.
  - "Đổi xe" + "Kết thúc HĐ": chỉ khi `status === STATUS.INCIDENT (7)`.
  - "Đổi xe tại chỗ": chỉ khi `status === STATUS.CHANGING_CAR (9)`.

### 9. ExpenseTab — đã hiển thị ảnh chứng từ Phiếu Thu chưa?

**CHƯA (đối với Phiếu Thu).** Bằng chứng:
- File: `C:\Users\it\OneDrive\Desktop\Project\amazing-xanh-admin-fe\src\features\booking\contract\components\detail\tab\ExpenseTab.tsx`.
- Tab này filter cứng **`type: 2`** (Phiếu CHI) — dòng 43, 47, 59. Type 1 = Phiếu Thu, type 2 = Phiếu Chi (xác nhận tại `transaction.types.ts:29` và `TransactionTable.tsx:43-44`).
- Tab CÓ sẵn cơ chế xem ảnh chứng từ qua `documentImageUrls` + `ViewTransactionImagesDialog` (mobile dòng 145-158, desktop dòng 223-232) — nhưng **CHỈ áp dụng cho Phiếu Chi**.
- **→ Kết luận:** Phiếu Thu (RENTAL_PAYMENT, gồm UNC/biên nhận tiền chênh đổi xe) HIỆN KHÔNG hiển thị ở trang chi tiết HĐ. Tab "Chi phí" chỉ liệt kê Phiếu Chi. Yêu cầu 4.3 (xem ảnh chứng từ theo từng Phiếu Thu) **CẦN LÀM**: hoặc đổi ExpenseTab gộp cả type 1+2, hoặc thêm tab/khu "Phiếu Thu" riêng. Cơ chế render ảnh đã có sẵn (`ViewTransactionImagesDialog` + `documentImageUrls`) nên tái dùng dễ.

### 10. Tab đặt khu "Ảnh giao/nhận xe" cố định (4.1) — đề xuất

- **Dữ liệu có sẵn:** `contractDetailData.deliveryImageUrls` và `receiveImageUrls` đã được BE trả về — `C:\Users\it\OneDrive\Desktop\Project\amazing-xanh-admin-fe\src\features\booking\contract\types\contract.response.ts` dòng **107** (`deliveryImageUrls`) và **112** (`receiveImageUrls`). Không cần endpoint mới.
- **DocumentTab** (`.../detail/tab/DocumentTab.tsx`): chuyên về **"Ảnh chứng từ hợp đồng"** = `customerDocumentImages` (có UPLOAD, sửa được — dòng 64-88, 110-119). Là tab ảnh/tài liệu sẵn có.
- **OverviewTab** (`.../detail/tab/OverviewTab.tsx`): tổng quan thông tin, KHÔNG render ảnh giao/nhận (grep không thấy deliveryImage/receiveImage).
- **ĐỀ XUẤT: đặt khu "Ảnh giao/nhận xe" (chỉ đọc) trong `DocumentTab.tsx`** — vì đây đã là tab ảnh/chứng từ, gom chung trải nghiệm xem ảnh; thêm 1 section read-only render `deliveryImageUrls` + `receiveImageUrls` (+ ảnh các lần đổi xe nếu sau này lưu). Tránh nhồi vào OverviewTab (đang là bảng info text). Dùng lại pattern preview ảnh sẵn có trong DocumentTab (openPreview, dòng 97-105).

### 11. Mẫu ExtendCreateDialog + useExtend + extend.store (để nhái cho dialog đổi xe)

- **Dialog:** `C:\Users\it\OneDrive\Desktop\Project\amazing-xanh-admin-fe\src\features\booking\contract\components\dialog\extend\ExtendCreateDialog.tsx`.
  - Props: `{ open, disable?, loading?, onClose, onSubmit? }` — dòng 15-22. **Dialog KHÔNG tự gọi API**; build payload rồi `onSubmit?.(payload)` (dòng 116) → **CHA sở hữu việc gọi API**.
  - Lấy data đơn qua hook `useContract().contractDetailData` (dòng 41).
  - Form state qua `useFormState<ExtendCreateRequest>` (dòng 38). Tiền nhập qua `formatVnd/parseVnd` (dòng 218-221). Có ConfirmDialog phụ khi đơn ở REFUND_PENDING (dòng 110-114, 311-319) — mẫu để làm confirm cho "cọc không đủ".
- **Hook:** `C:\Users\it\OneDrive\Desktop\Project\amazing-xanh-admin-fe\src\features\booking\contract\services\useExtend.ts`.
  - `createExtend(data, wasRefundPending)` → `apiFetch("/api/booking/extend/create", { method:"POST", body: JSON.stringify(data) })` (dòng 19-25) → check `json.response.responseCode === "00"` (dòng 29) → toast success/error. Set loading atom đầu/cuối (dòng 16, 45).
- **Store:** `C:\Users\it\OneDrive\Desktop\Project\amazing-xanh-admin-fe\src\features\booking\contract\store\extend.store.ts` — chỉ 1 atom loading: `export const extendCreatingLoadedAtom = atom<boolean>(false);`.
- **BFF route mẫu:** `src/app/api/booking/extend/create/route.ts` (thư mục `.../api/booking/extend/create` tồn tại). Mẫu BFF chuẩn: xem skill `amazing-xanh-bff-api` (createRequestPayload + map responseCode).
- **→ Mẫu nhái cho đổi xe:**
  - Tạo `change-car.store.ts` (atom loading), `useChangeCar.ts` (2 hàm `changeCar` + `changeCarDeliver` gọi `apiFetch("/api/booking/contract/change-car"...)` check `responseCode==="00"`).
  - Dialog VP `ChangeCarOfficeDialog` + dialog hiện trường `ChangeCarDeliverDialog` theo pattern `onSubmit` callback, cha gọi hook.

### 12. ReceiveDialog — cơ chế mở (props/store) để mở lại cho luồng Kết thúc HĐ

- **File:** `C:\Users\it\OneDrive\Desktop\Project\amazing-xanh-admin-fe\src\features\booking\delivery-receive\components\dialog\ReceiveDialog.tsx`.
- **Mở qua PROPS (không qua store):** `interface ReceiveDialogProps { open, onClose, booking: DeliveryReceiveData | null, onSuccess }` — **dòng 56-61**.
- **QUAN TRỌNG:** prop `booking` KHÔNG phải `bookingId` mà là **object `DeliveryReceiveData`** (type của feature `delivery-receive`, khác `contractDetailData` của feature contract).
- **Nơi mở hiện tại:** trang `C:\Users\it\OneDrive\Desktop\Project\amazing-xanh-admin-fe\src\app\(site)\deliver-collect-car\page.tsx`:
  - state `openReceiveDialog` (dòng 65), render `<ReceiveDialog open={!!selectedBooking && openReceiveDialog} booking={selectedBooking} onSuccess={...}/>` — **dòng 224-228**. `selectedBooking` là `DeliveryReceiveData`.
- **Gọi API:** ReceiveDialog dùng `useDeliveryReceive` (import dòng 33) → performReceive. Dùng `MultiImageUploader` (dòng 35) cho ảnh nhận.
- **→ Để mở từ trang chi tiết HĐ (Kết thúc HĐ từ INCIDENT):** có 2 hướng (cần lead quyết — xem rủi ro):
  - (a) Mở `ReceiveDialog` ngay trong ContractDetailForm, nhưng phải MAP `contractDetailData` (feature contract) → `DeliveryReceiveData` (feature delivery-receive) để truyền prop `booking`. Có thể thiếu field.
  - (b) Điều hướng sang trang `deliver-collect-car` với đơn đã chọn.
  Cách (a) khớp spec "mở đúng màn Nhận xe đã có" nhưng cần lớp map/adapter giữa 2 type.

---

## RỦI RO / CẦN LEAD QUYẾT

1. **[Mục 5/Báo sự cố] Vị trí lưu `incidentType`:** đề xuất thêm field riêng `incidentType` vào `UpdateBookingStatusRequestData` + entity `Booking`, KHÔNG nhồi vào `note`. Cần lead/team-lead xác nhận để Wave 1 thêm cột migration `incident_type`.

2. **[Mục 12 — ReceiveDialog] Khác biệt type giữa 2 feature:** `ReceiveDialog` nhận `booking: DeliveryReceiveData` (feature delivery-receive), còn trang chi tiết HĐ có `contractDetailData` (feature contract). Mở Kết thúc HĐ từ INCIDENT cần adapter map 2 type hoặc fetch lại theo bookingId. **Cần quyết hướng (a) mở inline + map, hay (b) điều hướng sang trang deliver-collect-car.** Đây là điểm tích hợp dễ phát sinh thiếu field.

3. **[Mục 9 — Phiếu Thu] 4.3 PHẢI làm:** ExpenseTab chỉ hiển thị Phiếu Chi (type 2). Phiếu Thu (RENTAL_PAYMENT) không xem được ở trang chi tiết. Cần quyết: (a) mở rộng ExpenseTab gộp type 1+2, hay (b) thêm khu/tab "Phiếu Thu" riêng. Cơ chế xem ảnh (`ViewTransactionImagesDialog` + `documentImageUrls`) đã có, tái dùng được.

4. **[Mục 1 — transition 9→3] Có chặn chọn tay không:** spec yêu cầu 9→3 đi qua `performChangeCarDelivery` (có km/ảnh). Cần quyết có thêm 9→3 vào `LOCKED_MANUAL_TRANSITIONS` (BE BSImpl:2914-2924 + FE contract.status.ts:41-44) để chặn đổi tay qua dialog status, giống 2→3 / 3→4 / 3→6.

5. **[Mục 6 — F5/Excel] Ghi đè car_id khi đổi xe:** đổi xe ghi đè `car_id/car_name/license_plate` trên `new_bookings`. F5 (ReportFillRateServiceImpl:86,358) và Excel/Report doanh thu sẽ mất lịch sử xe cũ. Plan này CHỈ tạo `booking_car_history` + ghi dữ liệu; **sửa F5 query đọc bảng mới NẰM NGOÀI scope** — cần lead xác nhận có gộp F5 vào đợt này không.

6. **[Mục 4 — khoản thu treo AT_DELIVERY] Cách lưu chưa chốt:** spec 5.2 để planning quyết (field tạm trên booking vs bản ghi riêng). KHÔNG tìm thấy field "khoản thu treo" sẵn có trên `Booking.java`. Cần lead/planning chốt: thêm cột (vd `pending_collect_amount`, `pending_collect_method`) vào `new_bookings` hay bảng riêng. Ảnh hưởng migration Wave 1.

7. **[Mục 8 — vị trí nút action] UX:** hiện chưa có cụm nút action; mọi đổi trạng thái qua chip→ContractStatusDialog. Cần lead xác nhận đặt 3 nút mới (Báo sự cố/Đổi xe/Kết thúc HĐ) ở header chi tiết (cạnh chip) — đây là thay đổi UX nhìn thấy được.
