# Cach tinh gia thue xe

> Cap nhat: 2026-05-27 | Source: reverse-engineered tu PricingServiceImpl.java

---

## 1. Tong quan

He thong tinh gia tu dong dua tren **cau hinh gia dong** (`price_configurations` table). Gia thay doi theo:
- **Loai ngay:** Ngay thuong (WEEKDAY) vs Cuoi tuan (WEEKEND)
- **Khung gio:** Gio nhan xe va gio tra xe
- **Model xe:** `car_model` lay tu `CarSpecification.carModel`

**Dinh nghia cuoi tuan:** Thu 6, Thu 7, Chu nhat (DayOfWeek FRIDAY, SATURDAY, SUNDAY).

---

## 2. Input / Output

| Truong | Kieu | Mo ta |
|--------|------|-------|
| Input: `carModel` | String | Ma model xe (tu `CarSpecification.carModel`) |
| Input: `startTime` | LocalDateTime | Thoi gian nhan xe |
| Input: `endTime` | LocalDateTime | Thoi gian tra xe |
| Input: `promotionCode` | String (optional) | Ma khuyen mai |
| Input: `pickupFee` | BigDecimal (optional) | Phi giao xe tai noi (NV nhap) |
| Input: `returnFee` | BigDecimal (optional) | Phi nhan xe tai noi (NV nhap) |
| Output: `rentalPrice` | BigDecimal | Gia thue tinh theo thoi gian (chua giam gia) |
| Output: `discountAmount` | BigDecimal | So tien giam gia |
| Output: `totalAmount` | BigDecimal | Tong tien cuoi (da tru giam gia, cong phi) |
| Output: `explanation` | String | Dien giai cong thuc (hien thi cho NV) |

---

## 3. Cong thuc tinh gia

### Truong hop A: Thue trong ngay (startDate == endDate)

```
rentalPrice = MAX(pickupSlotPrice, returnSlotPrice)
```

> Ly do: chi tinh 1 lan, lay muc cao hon giua khung gio nhan va gio tra.

**Vi du:** Nhan 08:00 (150.000 VND) — Tra 17:00 (200.000 VND) → `rentalPrice = 200.000 VND`

---

### Truong hop B: Thue qua ngay (startDate != endDate)

```
rentalPrice = pickupDayPrice + middleDaysTotalPrice + returnDayPrice
```

Trong do:
- `pickupDayPrice`: Tra DB theo `(type=PICKUP, carModel, dayType, startTime.toLocalTime())`
- `returnDayPrice`: Tra DB theo `(type=RETURN, carModel, dayType, endTime.toLocalTime())`
- `middleDaysTotalPrice`: Tong cac ngay o giua (tu ngay sau startDate den truoc endDate)

**Tinh cac ngay giua:**
```
cho moi ngay giua:
  neu la cuoi tuan → cong weekendFullDayPrice
  neu la ngay thuong → cong weekdayFullDayPrice
```

Neu WEEKEND fullday price khong co trong DB → fallback ve WEEKDAY price.

**Vi du:** Thue Thu 2 08:00 → Thu 4 17:00 (2 dem, 1 ngay giua)
- pickupDayPrice (T2 WEEKDAY PICKUP 08:00) = 500.000
- middleDayPrice (T3 WEEKDAY full day) = 600.000
- returnDayPrice (T4 WEEKDAY RETURN 17:00) = 400.000
- `rentalPrice = 500.000 + 600.000 + 400.000 = 1.500.000 VND`

---

### Tinh tong tien cuoi

```
basePrice = rentalPrice + pickupFee + returnFee

discountAmount:
  discountType = 1 (phan tram): discountAmount = basePrice * discountValue / 100
  discountType = 2 (so tien co dinh): discountAmount = discountValue
  discountAmount = MIN(discountAmount, basePrice)  // khong giam qua so tien

taxableAmount = basePrice - discountAmount

vatAmount = taxableAmount * vatPercent / 100   (neu vatPercent > 0)

totalAmount = taxableAmount + vatAmount
            = basePrice - discountAmount + vatAmount
```

**Vi du day du:**
- basePrice = 2.000.000 VND (rentalPrice=1.800.000, pickupFee=200.000)
- Giam 10%: discountAmount = 200.000 VND
- VAT 8%: taxableAmount = 1.800.000, vatAmount = 144.000
- totalAmount = 1.944.000 VND

---

## 4. Truong hop ngoai cau hinh

Neu khung gio nhan xe HOAC tra xe khong co trong DB `price_configurations` → he thong tra:
```
totalAmount = 0
explanation = "Khung gio ngoai cau hinh - can nhap thu cong"
```

FE detect `totalAmount = 0` → hien thi banner canh bao, NV phai nhap tay `totalAmount`.

Tuong tu neu thue qua nhieu dem nhung DB thieu cau hinh `fullDayPrice` ngay thuong.

---

## 5. Cac truong lien quan tren Booking

| Column DB | Ten tieng Viet | Mo ta |
|-----------|----------------|-------|
| `rental_price` | Gia thue goc | rentalPrice (chua discount, chua phi giao nhan) |
| `total_amount` | Tong tien hop dong | totalAmount sau giam gia va VAT |
| `discount_type` | Loai giam gia | 1 = %, 2 = so tien co dinh |
| `discount_value` | Gia tri giam gia | Ty le % hoac so VND |
| `vat_percent` | % VAT | Integer (vd: 8 = 8%) |
| `vat_amount` | So tien VAT | Tinh theo cong thuc tren |
| `pickup_fee` | Phi giao xe | NV nhap truoc khi tao booking |
| `return_fee` | Phi nhan xe | NV nhap truoc khi tao booking |
| `paid_amount` | Tien da thu | Cong don moi lan thu |
| `deposit_amount` | So tien coc | NV nhap khi giao xe |
| `collected_deposit` | Tien coc da thu thuc te | Cap nhat trong performDelivery |
| `surcharge_amount` | Tong phu thu | Tong cac phu phi ghi nhan khi nhan xe |

---

## 6. Giam gia / Khuyen mai

- Nhap ma khuyen mai (`promotionCode`) → he thong goi `PromotionService.calculateDiscount`
- Discount chi ap dung tren `rentalPrice` (KHONG tinh tren pickupFee + returnFee)
- Neu ma khong hop le / het han → `discountAmount = 0`, tiep tuc tinh binh thuong

---

## 7. [CAN LEAD XAC NHAN]

- **Gia co thay doi theo mua vu khong?** Code hien tai chi phan biet WEEKDAY vs WEEKEND, khong co logic peak season / holiday pricing. Gia le / tet co phu thu tach rieng qua `SurchargeCatalog` (HOLIDAY, OVERNIGHT).
- **DB `price_configurations` co bao nhieu dong?** Agent chua query duoc bang nay — lead xac nhan cau truc (co bao nhieu model, bao nhieu khung gio).
- **Tong hop pickupFee + returnFee:** Hien tai lay tu request, NV nhap truoc khi tao booking. Co phai luon co trong moi booking khong?
