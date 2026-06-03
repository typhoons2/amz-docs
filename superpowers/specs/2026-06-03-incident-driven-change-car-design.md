# Spec — Đổi xe / Kết thúc HĐ theo Sự cố (thiết kế lại F3)

**Phiên bản:** 1.0 — 2026-06-03
**Trạng thái:** Draft (chờ lead review lần cuối)
**Phạm vi:** Thiết kế lại nghiệp vụ **F3 — Đổi xe giữa kỳ** trong spec `ongoing-edit-and-revenue.md`.
**Người chốt định hướng:** Lead (qua buổi brainstorm 2026-06-03).

> **Spec này THAY THẾ phần F3 trong `ongoing-edit-and-revenue.md`.**
> Các nghiệp vụ khác của Wave 1B giữ nguyên: F1 (doanh thu pro-rata), F2 (gia hạn),
> F4 (cảnh báo sửa giá), F5 (tỉ lệ lấp đầy), bảng `booking_car_history`, status `CHANGING_CAR`.

---

## 1. Vì sao thay đổi

Spec F3 cũ cho phép NV bấm **"Đổi xe" bất kỳ lúc nào** khi xe đang thuê, lý do điển hình là *"khách không ưng xe"*. Bên quản lý đề xuất siết lại: **đổi xe chỉ là một cách xử lý khi xe gặp sự cố** — không còn đổi tự do.

Đồng thời, khi xe gặp sự cố, NV cần thêm một lựa chọn nữa: **kết thúc hợp đồng sớm** (khách không thuê tiếp nữa).

### So sánh nhanh

| Hạng mục | Spec F3 cũ | Spec này |
|----------|-----------|----------|
| Khi nào đổi xe | Bấm bất kỳ lúc nào khi đang thuê | **Chỉ khi xe ở trạng thái Sự cố** |
| Lý do đổi | "Khách không ưng xe" (tự do) | **Lỗi kỹ thuật** hoặc **Tai nạn** |
| Thao tác từ Sự cố | (không có) | **2 lựa chọn: Đổi xe / Kết thúc HĐ** |
| Ghi nhận xe cũ trả về | Không có | **Có** — thu xe cũ + giao xe mới chung 1 màn |
| Hợp đồng khi đổi | (ngầm hiểu cùng đơn) | **Cùng 1 đơn** (chốt rõ) |
| Thời điểm thu tiền chênh | Thu tại bước đổi xe | **Cho chọn**: thu ngay tại VP / thu khi giao xe mới |

---

## 2. Trạng thái & luồng

### 2.1 Tận dụng status đã có

- Dùng lại **`INCIDENT (7)` = "Sự cố / Tai nạn"** (đã có sẵn) làm trạng thái "Sự cố".
- Thêm trường phân loại **`incidentType`** trên booking: `TECHNICAL_FAULT` (lỗi kỹ thuật) | `ACCIDENT` (tai nạn).
- Dùng lại **`CHANGING_CAR (9)` = "Chờ giao xe mới"** (đã thiết kế trong spec cũ).
- Dùng lại **`REFUND_PENDING (6)` = "Chờ hoàn cọc"** (đã có sẵn) cho nhánh Kết thúc HĐ.

> **Quyết định:** Không tách "lỗi kỹ thuật" và "tai nạn" thành 2 status riêng. Hai loại đi tiếp giống hệt nhau (đều ra Đổi xe / Kết thúc HĐ); chỉ khác ở **ý nghĩa nghiệp vụ + báo cáo**, nên dùng 1 trường phân loại là đủ. Sau này thêm loại sự cố mới chỉ cần thêm 1 giá trị `incidentType`, không phải đẻ status.

### 2.2 Sơ đồ luồng

```
                          ĐANG THUÊ (ONGOING 3)
                                  │
                           bấm "Báo sự cố"
                           chọn loại: ◉ Lỗi kỹ thuật  ○ Tai nạn
                                  │
                                  ▼
                          ┌── SỰ CỐ (INCIDENT 7) ──┐
                          │  incidentType = KT / TN  │
              ┌───────────┴───────────────────────────┐
       bấm "Đổi xe"                              bấm "Kết thúc HĐ"
              │                                         │
  [Văn phòng] chọn xe mới                       mở màn "NHẬN XE" (đã có)
  + tiền chênh + cách thu                       ghi km/ảnh/phụ thu
  + thời điểm thu                                       │
              │                                         ▼
              ▼                              CHỜ HOÀN CỌC (REFUND_PENDING 6)
    CHỜ GIAO XE MỚI (CHANGING_CAR 9)                    │
              │                                  Quản lý duyệt hoàn
  [Hiện trường] "Đổi xe tại chỗ"                        │
  thu xe cũ + giao xe mới                               ▼
  (+ thu tiền nếu chọn "thu khi giao")          HOÀN THÀNH (COMPLETED 4)
              │
              ▼
        ĐANG THUÊ (ONGOING 3)
```

### 2.3 Transitions thêm / dùng lại

| Từ | Đến | Thao tác | Method | Ghi chú |
|----|-----|----------|--------|---------|
| ONGOING (3) | INCIDENT (7) | Báo sự cố | `updateBookingStatus` (đã có) | **Thêm:** bắt buộc set `incidentType` |
| INCIDENT (7) | ONGOING (3) | Báo nhầm, quay lại | `updateBookingStatus` (đã có) | Clear `incidentType` |
| INCIDENT (7) | CHANGING_CAR (9) | Đổi xe (văn phòng) | `changeCar` (MỚI) | Chốt xe mới + tiền + thời điểm thu |
| CHANGING_CAR (9) | ONGOING (3) | Đổi xe tại chỗ (hiện trường) | `performChangeCarDelivery` (MỚI) | Thu xe cũ + giao xe mới + (thu tiền nếu cần) |
| INCIDENT (7) | REFUND_PENDING (6) | Kết thúc HĐ | `performReceive` (đã có — mở rộng nguồn từ INCIDENT) | Ghi km/ảnh/phụ thu → chờ hoàn |

> **Lưu ý transition cũ:** spec cũ ghi `CHANGING_CAR → ONGOING` qua "Giao xe". Ở đây tách rõ thành **`performChangeCarDelivery`** vì màn này khác màn giao xe lần đầu (có thêm phần thu xe cũ + xem lại ảnh).

---

## 3. Ba thao tác chi tiết

### 3.1 Báo sự cố (NV, văn phòng/hiện trường)

- Từ đơn **Đang thuê**, bấm **"Báo sự cố"**.
- Chọn loại: **Lỗi kỹ thuật** / **Tai nạn** + ghi chú (mô tả sự cố).
- Đơn chuyển sang **Sự cố**, lưu `incidentType`, ghi audit (ai báo, lúc nào, loại, ghi chú).
- Cho phép **quay lại Đang thuê** nếu báo nhầm.

### 3.2 Đổi xe — bước Văn phòng (NV tư vấn)

Từ đơn **Sự cố**, bấm **"Đổi xe"** → dialog:

- **Chọn xe mới** (xe đang rảnh).
- **Số tiền chênh lệch** (NV tự nhập; gợi ý = chênh giá/ngày × số ngày còn lại nhưng không bắt buộc).
- **Cách thu** (nếu chênh > 0): Thu ngay (CK + tiền mặt) / Trừ vào cọc / Trả sau khi trả xe.
- **Thời điểm thu** (nếu chọn "Thu ngay"): **Thu ngay tại văn phòng** / **Thu khi giao xe mới**.
- **Lý do** (bắt buộc — audit).

Xác nhận → đơn sang **Chờ giao xe mới (CHANGING_CAR)**.

Hành vi theo lựa chọn:

| Thời điểm thu | Tại bước văn phòng | Tại bước hiện trường |
|---------------|--------------------|--------------------|
| Thu ngay tại VP | Tạo phiếu thu RENTAL_PAYMENT liền, `paidAmount` tăng | Chỉ ghi nhận xe, không thu |
| Thu khi giao xe mới | Lưu "khoản cần thu" (số tiền + cách CK/mặt) chờ thu | Màn hiện trường hiện ô thu tiền + tạo phiếu thu |
| Trừ vào cọc | `collectedDeposit` giảm ngay (chặn nếu cọc không đủ) | Chỉ ghi nhận xe |
| Trả sau khi trả xe | `totalAmount` tăng, `paidAmount` giữ | Chỉ ghi nhận xe |

> **Chênh lệch âm (xe mới rẻ hơn):** KHÔNG tạo phiếu chi ngay; `totalAmount` giảm; phần dư **hoàn ở cọc cuối kỳ** (DEPOSIT_REFUND cộng thêm tự nhiên — giống flow rút ngắn). Ẩn phần "cách thu / thời điểm thu".

### 3.3 Đổi xe — bước Hiện trường (NV giao xe)

Từ đơn **Chờ giao xe mới**, bấm **"Đổi xe tại chỗ"** → 1 màn gộp:

- **Phần A — Thu xe cũ:** km cuối xe cũ + ảnh tình trạng xe cũ. (Có khu **xem lại ảnh xe cũ lúc giao** để đối chiếu — xem mục 4.)
- **Phần B — Giao xe mới:** km đầu xe mới + ảnh + ký nhận.
- **Phần C — Thu tiền (CÓ ĐIỀU KIỆN):** chỉ hiện nếu văn phòng chọn **"Thu khi giao xe mới"** → ô CK/tiền mặt + ảnh UNC → tạo phiếu thu RENTAL_PAYMENT.

Xác nhận → đơn về **Đang thuê**; `deliveryImages`/`initialKm` = dữ liệu xe mới; cập nhật nhật ký xe (mục 5).

### 3.4 Kết thúc HĐ (từ Sự cố)

- Từ đơn **Sự cố**, bấm **"Kết thúc HĐ"** → mở đúng **màn "Nhận xe" đã có** (ghi km lúc trả, ảnh xe, tính phụ thu nếu có).
- Đơn chuyển sang **Chờ hoàn cọc**.
- Quản lý/Admin vào **duyệt hoàn** như bình thường — **số tiền hoàn (gồm cả hoàn ngày chưa dùng, trừ hư hỏng) do người duyệt quyết tay**. KHÔNG có logic tính hoàn tự động.

---

## 4. Xem lại ảnh giao/nhận (bổ sung ②)

Vấn đề: hiện ảnh chỉ xem được khi đang mở form. **Sau khi nhận xe xong thì không còn chỗ nào xem lại cả ảnh giao lẫn ảnh nhận.** Phải có chỗ xem **cố định**, không phụ thuộc form.

### 4.1 Khu ảnh cố định trên trang chi tiết đơn (MỚI — quan trọng)

Thêm khu **"Ảnh giao/nhận xe"** ngay trên trang chi tiết hợp đồng, xem được **bất cứ lúc nào** (kể cả sau khi đã hoàn thành/chờ hoàn):

- Ảnh **giao xe** (`deliveryImages`).
- Ảnh **nhận xe** (ảnh chụp lúc `performReceive`).
- Nếu đơn đã từng đổi xe: ảnh **xe cũ lúc trả** + ảnh **xe mới lúc giao** của từng lần đổi.

→ Đúng ý: nhận xe xong vẫn vào xem lại được cả ảnh giao lẫn ảnh nhận.

### 4.2 Xem ngay trong lúc thao tác (tiện đối chiếu)

- Trong **màn Nhận xe** (gồm cả Kết thúc HĐ): hiện sẵn ảnh lúc giao để so.
- Trong **màn Đổi xe tại chỗ** (phần A — thu xe cũ): hiện sẵn ảnh xe cũ lúc giao để so.

Tất cả **chỉ đọc** ảnh đã có sẵn trong dữ liệu, không sửa, không endpoint mới.

### 4.3 Ảnh chứng từ tiền — xem theo từng Phiếu Thu

Ảnh UNC chuyển khoản / biên nhận tiền mặt **gắn với từng Phiếu Thu** (mỗi ảnh chứng cho 1 lần thu, kèm số tiền + tài khoản). Cho xem ảnh **ngay tại từng Phiếu Thu** của đơn — mở phiếu thu nào ra thấy ảnh chứng từ của phiếu đó. Giữ đúng liên kết tiền–chứng từ (KHÔNG gom chung album với ảnh xe).

> **Researcher kiểm tra trước:** tab Tài chính / danh sách Phiếu Thu hiện đã hiển thị ảnh chứng từ chưa. **Nếu đã có sẵn → khỏi làm.** Chỉ bổ sung nếu chưa hiện.

---

## 5. Dữ liệu

### 5.1 Trường mới trên booking

- `incidentType`: `TECHNICAL_FAULT` | `ACCIDENT` | null. Set khi báo sự cố, clear khi quay lại Đang thuê.

### 5.2 Lưu "khoản cần thu khi giao xe mới"

Khi văn phòng chọn **"Thu khi giao xe mới"**, cần nhớ số tiền + cách thu để bước hiện trường thực hiện. Lưu dạng "khoản thu treo" gắn với booking đang ở CHANGING_CAR (cách lưu cụ thể để planning quyết — field tạm trên booking hoặc bản ghi riêng). Thu xong ở hiện trường thì xóa khoản treo.

### 5.3 Nhật ký xe (`booking_car_history`) — giữ nguyên thiết kế cũ

- Bảng + backfill như spec `ongoing-edit-and-revenue.md` (không đổi).
- **Thời điểm cập nhật:** tại **bước hiện trường** (đổi xe tại chỗ — lúc xe thực sự đổi), KHÔNG phải bước văn phòng. Vì lịch sử phản ánh **xe nào ở với khách ngày nào** (phục vụ tỉ lệ lấp đầy).
  - Close row xe cũ: `to_date = ngày đổi - 1`.
  - Insert row xe mới: `from_date = ngày đổi`, `to_date = endTime.date`, `reason`, `created_by`.

---

## 6. BE Contract API

### 6.1 Báo sự cố — dùng `updateBookingStatus` (mở rộng)

Khi `targetStatus = INCIDENT (7)` → bắt buộc kèm `incidentType` (`TECHNICAL_FAULT`|`ACCIDENT`) + `note`. Khi `INCIDENT → ONGOING` → clear `incidentType`.

### 6.2 Đổi xe (văn phòng) — `POST /api/v1/xanh/admin/bookings/change-car` (MỚI)

```jsonc
{
  "data": {
    "bookingId": 100,
    "newCarId": 200,
    "newRentalPrice": 800000,
    "priceDiffAmount": 600000,            // có thể âm
    "paymentMode": "PAY_NOW | DEDUCT_FROM_DEPOSIT | PAY_LATER",
    "collectTiming": "AT_OFFICE | AT_DELIVERY",   // chỉ dùng khi PAY_NOW
    // các trường CK/tiền mặt chỉ bắt buộc khi PAY_NOW + AT_OFFICE:
    "ckAmount": 600000, "ckPaymentMethodId": 2, "ckDocumentImages": ["..."],
    "cashAmount": 0, "cashDocumentImages": [],
    "reason": "Xe lỗi điều hòa, đổi sang xe khác"
  }
}
```

Validate: `reason` không trống; nếu `PAY_NOW + AT_OFFICE` thì `ckAmount + cashAmount == priceDiffAmount`; `DEDUCT_FROM_DEPOSIT` thì `collectedDeposit >= priceDiffAmount` (không thì throw `BusinessException("Cọc không đủ để trừ")`).

Action: set `incidentType` vẫn giữ; cập nhật xe mới + giá + `totalAmount += priceDiffAmount`; xử lý tiền theo bảng mục 3.2; nếu `AT_DELIVERY` → lưu khoản thu treo; status → `CHANGING_CAR`; **chưa** cập nhật `booking_car_history` (để bước hiện trường); audit.

### 6.3 Đổi xe tại chỗ (hiện trường) — `POST /api/v1/xanh/admin/bookings/change-car/deliver` (MỚI)

```jsonc
{
  "data": {
    "bookingId": 100,
    "oldCarEndKm": 12500,
    "oldCarReturnImages": ["..."],
    "newCarStartKm": 300,
    "newCarDeliveryImages": ["..."],
    "signatureImage": "...",
    // chỉ khi khoản thu treo = AT_DELIVERY:
    "ckAmount": 600000, "ckPaymentMethodId": 2, "ckDocumentImages": ["..."],
    "cashAmount": 0, "cashDocumentImages": []
  }
}
```

Action: ghi nhận xe cũ trả về + xe mới giao; nếu có khoản thu treo → tạo phiếu thu RENTAL_PAYMENT + `paidAmount` tăng + xóa khoản treo; cập nhật `booking_car_history` (close cũ + insert mới); `deliveryImages`/`initialKm` = xe mới; status → `ONGOING`; audit.

### 6.4 Kết thúc HĐ — dùng `performReceive` (đã có, mở rộng nguồn)

Cho phép `performReceive` xuất phát từ **INCIDENT (7)** (hiện chỉ từ ONGOING). Kết quả → `REFUND_PENDING (6)` (giữ cọc chờ hoàn). Hoàn do `confirmRefund` quyết tay.

---

## 7. Business Rules

- **BR-IC-01:** Đổi xe + Kết thúc HĐ **chỉ** thao tác được khi đơn ở trạng thái Sự cố (INCIDENT).
- **BR-IC-02:** Báo sự cố bắt buộc chọn `incidentType` + ghi chú.
- **BR-IC-03:** Đổi xe luôn trên **cùng 1 đơn**; không tạo đơn mới; cọc/tiền đã thu giữ nguyên.
- **BR-IC-04:** Lý do đổi xe bắt buộc (audit).
- **BR-IC-05:** Tiền chênh dương → thu theo cách thu + thời điểm thu đã chọn. Tiền chênh âm → hoàn ở cọc cuối kỳ, không tạo phiếu chi giữa kỳ.
- **BR-IC-06:** "Thu khi giao xe mới" → khoản thu treo chỉ được tất toán ở bước hiện trường; nếu khách chưa trả lúc giao, NV có thể chuyển sang "trả sau" (ghi nợ) — không chặn giao xe.
- **BR-IC-07:** `booking_car_history` cập nhật tại **ngày đổi thực tế** (bước hiện trường).
- **BR-IC-08:** Kết thúc HĐ → REFUND_PENDING; số tiền hoàn quyết tay ở bước duyệt hoàn.
- **BR-IC-09:** Quyền: STAFF+ làm được cả 3 thao tác; đều ghi audit. (Có thể siết "Kết thúc HĐ" lên Manager+ nếu lead muốn — xem mục 9.)
- **BR-IC-10:** Có **khu ảnh cố định trên trang chi tiết đơn** xem được cả ảnh giao + ảnh nhận (+ ảnh các lần đổi xe) **mọi lúc, kể cả sau khi nhận xe xong**. Tất cả chỉ đọc, không sửa.

---

## 8. Test Scenarios

### Báo sự cố
1. Đang thuê → báo sự cố loại Lỗi kỹ thuật → status Sự cố, `incidentType=TECHNICAL_FAULT`, có audit.
2. Sự cố → báo nhầm → quay lại Đang thuê, `incidentType` clear.

### Đổi xe — văn phòng
3. Chênh +600k, Thu ngay tại VP, CK đủ → phiếu thu 600k, `paidAmount` tăng, status CHANGING_CAR, history CHƯA đổi.
4. Chênh +600k, Thu khi giao xe mới → CHƯA tạo phiếu thu, lưu khoản treo, status CHANGING_CAR.
5. Chênh −300k (xe rẻ hơn) → không thu, `totalAmount` giảm, status CHANGING_CAR.
6. Trừ cọc nhưng cọc không đủ → throw "Cọc không đủ để trừ".
7. Không nhập lý do → reject.

### Đổi xe — hiện trường
8. Khoản treo AT_DELIVERY → thu tại hiện trường → tạo phiếu thu + xóa khoản treo + status ONGOING.
9. Không có khoản treo → chỉ ghi nhận xe → status ONGOING.
10. Sau bước hiện trường: `booking_car_history` có 2 row (xe cũ đóng ở ngày đổi−1, xe mới mở ở ngày đổi).
11. Tỉ lệ lấp đầy (F5): VF3 thuê tới ngày đổi, xe mới từ ngày đổi → đếm đúng từng xe.

### Kết thúc HĐ
12. Sự cố → Kết thúc HĐ qua màn Nhận xe → status Chờ hoàn cọc, ghi km/ảnh.
13. Quản lý duyệt hoàn (tự nhập số tiền gồm ngày chưa dùng) → Hoàn thành.

### Xem ảnh
14. Màn Nhận xe + màn Đổi xe tại chỗ → xem lại được ảnh lúc giao (chỉ đọc).
15. Trang chi tiết đơn **đã Hoàn thành/Chờ hoàn** → vẫn vào xem lại được cả ảnh giao + ảnh nhận (+ ảnh các lần đổi xe).
16. Mở 1 Phiếu Thu của đơn → thấy ảnh chứng từ (UNC/biên nhận) đúng của phiếu đó.

---

## 9. Mặc định đề xuất (lead xác nhận khi review)

1. **Quyền 3 thao tác:** STAFF+. *(Đề xuất; nếu muốn "Kết thúc HĐ" chỉ Manager+ → chỉnh BR-IC-09.)*
2. **Báo nhầm sự cố:** cho quay lại Đang thuê.
3. **Đổi xe khi "thu khi giao" mà khách chưa trả:** cho chuyển "trả sau", không chặn giao.

---

## 10. Ngoài phạm vi (làm sau)

- **Thu tiền trước khi giao xe LẦN ĐẦU** (đơn mới, khách CK trước rồi mới tới ngày giao): vấn đề chung toàn hệ thống → **tách task riêng** ("ghi nhận thu tiền trước khi giao xe"). KHÔNG nằm trong spec này.
- Tự động khóa xe bị báo sự cố không cho gán đơn khác — chỉ xử lý trên đơn hiện tại.
- Báo cáo downtime theo loại sự cố (lỗi KT vs tai nạn) — có dữ liệu `incidentType` nhưng màn báo cáo để sau.

---

## 11. Quyết định đã chốt (brainstorm 2026-06-03)

| Câu | Chốt |
|-----|------|
| Đổi xe gated theo sự cố? | **Thay thế hoàn toàn** đổi tự do |
| Phân biệt lỗi KT / tai nạn? | **1 status Sự cố + trường `incidentType`** |
| Kết thúc HĐ về đâu? | **Chờ hoàn cọc** (qua màn Nhận xe), hoàn quyết tay |
| Đổi xe — hợp đồng? | **Cùng 1 đơn**, không tạo đơn mới |
| Đổi xe — hiện trường? | **1 màn gộp** thu cũ + giao mới |
| Tiền chênh thu lúc nào? | **Cho chọn**: thu ngay tại VP / thu khi giao xe mới |
| Xem lại ảnh giao/nhận? | **Có** — thêm khu xem ảnh (chỉ đọc) |
| Thu tiền trước khi giao lần đầu? | **Ngoài phạm vi** — task riêng |
