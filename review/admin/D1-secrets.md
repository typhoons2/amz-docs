# D1 — Quét hardcode secret / key / token / URL — App Flutter ADMIN

- **App:** `amz_xanh_admin_app`
- **Commit review:** `3e6d332` (07/06/2026) — bản SAU khi outsource fix
- **Phạm vi:** toàn bộ `lib/` + `android/` + `ios/` + `web/macos/windows/linux` + file cấu hình build
- **Ngày quét:** 08/06/2026

## Kết luận tổng quát

**KHÔNG phát hiện secret/key/token/credential bị hardcode trong source hay trong cấu hình platform.** Bản sau-fix đã xử lý gọn phần secrets (so với bản cũ: base-url cứng và lưu mật khẩu plaintext đã được khắc phục):

- **Base URL:** lấy qua `String.fromEnvironment` (`AMZ_PORTAL_BASE_URL` / `AMZ_API_BASE_URL` / `AMZ_IMAGE_BASE_URL`), default là URL production công khai `https://api-portal.amzholdings.vn` — KHÔNG phải secret. (`lib/core/config/api_config.dart`)
- **Cert pinning (SHA-256):** đọc từ env `AMZ_CERT_SHA256`, không nhúng fingerprint cứng; thiếu thì ném `MissingTlsPinningConfigurationException`. (`lib/core/services/secure_http_client.dart`)
- **Keystore ký Android:** đọc từ Gradle property / env (`AMZ_UPLOAD_KEYSTORE_PATH/PASSWORD`, `AMZ_UPLOAD_KEY_ALIAS/PASSWORD`); build release fail nếu thiếu. KHÔNG có password/keystore trong repo. (`android/app/build.gradle`)
- **`.env.example`:** chỉ có key rỗng + ghi chú "Do not commit real values" — không lộ giá trị thật.
- **Không có file nhạy cảm bị commit:** không có `keystore/.jks/.p12/.pem`, không có `google-services.json` / `GoogleService-Info.plist` (app admin này không dùng Google OAuth — đó là app khách).
- **Token runtime:** lưu trong `flutter_secure_storage`, logout xóa cả secure storage lẫn SharedPreferences; `getRememberMePassword()` luôn trả `null` (không còn lưu mật khẩu plaintext). (`lib/core/services/storage_service.dart`)
- **Transport:** Android `usesCleartextTraffic="false"`; iOS `NSAllowsArbitraryLoads=false`. Không cleartext.
- **Logger:** `Level.off` ở release; các lời gọi `log(...)` chỉ in object lỗi `$e`, không in token/PII/body.

## Các match "secret-like" đã kiểm tra và loại trừ

| Vị trí | Nội dung | Kết luận |
|--------|----------|----------|
| `lib/core/api.dart`, `api_config.dart` | URL `api-portal.amzholdings.vn` + path `/xanh/admin/...` | Base URL công khai (env-overridable) + đường dẫn endpoint — KHÔNG phải secret |
| `docs/api-parity/*.md` | Chuỗi `client_secret`, `google-services.json`, OAuth client ID cũ | Chỉ là tài liệu thảo luận (khuyến cáo KHÔNG nhúng secret); credential cũ thuộc app KHÁCH, không nằm trong app admin này |
| `test/.../auth_service_test.dart`, `storage_service_test.dart` | `'secret-password'`, `'plaintext-password'` | Dữ liệu test giả lập, không phải credential thật |
| `lib/core/constants/app_strings.dart` | `password = 'Mật khẩu'` | Nhãn UI tiếng Việt |
| `lib/features/banners/.../banners_screen.dart` | `hintText: 'https://example.com'` | Placeholder UI |

## Lưu ý (không phải lỗ hổng secret trong app này)

- Credential Google OAuth CŨ từng bị commit nhầm (`client_secret_*.json`, `google-services.json`) được nhắc trong `docs/api-parity/answer-Q1-oauth.md` — **thuộc repo APP KHÁCH, không thuộc app admin này**. Đã có khuyến nghị rotate trong tài liệu đó. App admin không bị ảnh hưởng.
