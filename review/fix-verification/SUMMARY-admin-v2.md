# Verify fix — APP ADMIN (code đúng) — KẾT QUẢ CHÍNH THỨC

**Code verify:** nhánh `release` commit **`3e6d332`** ("fix: add device info privacy manifest", 07/06/2026) — bản mới nhất thật trên remote (gitlab enochtech).
**Lưu ý:** lần verify trước (kết quả "0/28") chạy nhầm trên local CŨ `4b8165d` (19/04) → SAI, đã bỏ.

## Tổng: 24/28 FIXED · 3 PARTIAL · 0 NOT_FIXED · 1 NEEDS_AMZ (85,7%)

Outsource **không over-claim** — thậm chí 3 mục làm tốt hơn bản khai (HIGH-01, HIGH-03, LOW-01 thực tế đã Done dù khai Partial/Open).

### CRITICAL: 6/6 FIXED ✅ (đủ điều kiện gate CRITICAL)
| ID | Trạng thái | Bằng chứng |
|----|-----------|-----------|
| CRIT-01 mật khẩu plaintext | ✅ FIXED | remember-me không lưu password |
| CRIT-02 token plaintext | ✅ FIXED | dùng FlutterSecureStorage |
| CRIT-03 cleartext HTTP | ✅ FIXED | `usesCleartextTraffic=false` |
| CRIT-04 log credential | ✅ FIXED | xóa hết log body/password/token |
| CRIT-05 không check responseCode | ✅ FIXED | `parseXanhResponse` guard `"00"` (auth tách `"200"`) |
| CRIT-06 UI báo thành công giả | ✅ FIXED | dialog chỉ xanh khi success; fail → snackbar đỏ + message BE |

### HIGH: 6/8 FIXED + 2 PARTIAL
- ✅ FIXED: HIGH-01 (signing từ env), HIGH-03 (mounted checks), HIGH-05 (tách widget), HIGH-06 (màn xác nhận hoàn tiền), HIGH-07 (redirect login khi token hết hạn), HIGH-08 (logout an toàn).
- 🟡 PARTIAL: **HIGH-02** (SSL pinning: code sẵn sàng, **thiếu giá trị pin thật `AMZ_CERT_SHA256`** — AMZ phải cấp). **HIGH-04** (test coverage ~7,51% < 60%).

### MED+LOW: 12/14 FIXED + 1 PARTIAL + 1 NEEDS_AMZ
- 🟡 PARTIAL: **MED-06** (dashboard đã bỏ số giả nhưng chưa gọi API thống kê thật — **AMZ cần cấp endpoint**).
- ⚠️ NEEDS_AMZ: **MED-09** (banner/news Enoch Tech — AMZ/BE xác nhận format gateway).

## Còn lại phải làm (chia trách nhiệm)

**Outsource còn nợ (thật sự):**
- HIGH-04: nâng test coverage lên ≥60% (hiện 7,51%).

**Chờ AMZ cung cấp thì outsource mới đóng được:**
- HIGH-02: giá trị TLS pin thật (`AMZ_CERT_SHA256` active + backup).
- HIGH-01: keystore release + secret ký (`AMZ_UPLOAD_*`).
- MED-06: endpoint API thống kê dashboard.
- MED-09: xác nhận format responseCode gateway banner/news (Enoch Tech).

## Kết luận nghiệm thu
- **CRITICAL gate: ĐẠT** (6/6). Theo Acceptance Criteria của report gốc (mục 4.1), điều kiện bắt buộc trước tích hợp đã thỏa.
- HIGH gần xong; phần kẹt chủ yếu do **AMZ chưa cấp input** (pin, keystore, dashboard API), không phải outsource chây ì.
- Khuyến nghị: AMZ cấp nốt 4 input trên + outsource bù test coverage → đủ điều kiện nghiệm thu giai đoạn 1.

> ⚠️ Lưu ý: review BẢO MẬT sâu (workflow `app-security-stability-review`) cho admin trước đó chạy trên code CŨ `4b8165d` → một phần đã lỗi thời (nhiều mục nay đã fix). Nếu cần findings bảo mật chính xác trên code mới, phải chạy lại trên `3e6d332`.
