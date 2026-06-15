AMZ Xanh Admin App - REVIEW-REPORT Response

AMZ Xanh Admin App
Remediation Response Report Dựa Trên REVIEW-REPORT.pdf

Ngày đối chiếu

04/06/2026

Kết luận ngắn

Theo report gốc, trạng thái ban đầu là BLOCK tích hợp do 6 CRITICAL findings. Trong source app hiện tại,
các CRITICAL app-side đã được xử lý theo hướng report yêu cầu: secure storage, không lưu password,
cleartext disabled, bỏ credential logging, parser responseCode cho xanh-service, và UI chỉ success khi
service success thật. Các phần còn cần AMZ/BE cung cấp chủ yếu là production API contract, sample
response, TLS fingerprint, release signing secrets/process, và test data nghiệm thu.

Verification Hiện Tại

flutter analyze: pass, no issues found.
flutter test: pass, 37/37 tests.

●
●
●  Coverage hiện tại: 7.51% theo coverage/lcov.info, chưa đạt target 60% trong report gốc.
●  Scan _buildXxx trong lib/test: không còn match.
●  Scan print() trong lib: không còn match.

Nhóm

CRITICAL

HIGH

MEDIUM

LOW

Tổng

Trạng thái

Ghi chú

6

8

10

4

App-side fixed

Mixed

Mostly
addressed
Mostly
addressed

Đã xử lý các lỗi blocker trong app; cần AMZ/BE xác
nhận contract production và test data để nghiệm thu.
Một số đã xử lý, nhưng coverage 60%, TLS pin value,
signing secrets và một vài acceptance item vẫn cần
phối hợp.
Nhiều mục đã xử lý trong app; dashboard/API contract
vẫn cần endpoint/mapping chính thức.
Local login lockout là optional chưa ưu tiên; các mục
kỹ thuật còn lại đã có hướng xử lý.

Confidential working note | Trang 1

AMZ Xanh Admin App - REVIEW-REPORT Response

CRITICAL Findings

ID
CRIT-01

CRIT-02

CRIT-03
CRIT-04

CRIT-05

Mức
CRITICAL

CRITICAL

CRITICAL
CRITICAL

CRITICAL

Status
Done

Done

Done
Done

Done

CRIT-06

CRITICAL

Done

HIGH Findings

ID
HIGH-01

Mức
HIGH

Status
Partial

HIGH-02

HIGH

Partial

HIGH-03

HIGH

Partial

HIGH-04

HIGH-05

HIGH-06

HIGH-07

HIGH

HIGH

HIGH

HIGH

Partial

Done

Done

Partial

HIGH-08

HIGH

Done

MEDIUM Findings

ID
MED-01
MED-02

Mức
MEDIUM
MEDIUM

Status
Done
Done

Evidence / next step

Remember-me không lưu password; StorageService chỉ lưu
email/enabled state, getRememberMePassword() trả null; legacy
remember_me_password bị xóa khi init.
accessToken/refreshToken được cache từ FlutterSecureStorage;
legacy plaintext SharedPreferences token bị remove khi init.
AndroidManifest đặt android:usesCleartextTraffic="false".
AuthService không còn debugPrint/log body login, password, token
hoặc raw auth response.
AdminApiResponse.parseXanhResponse() yêu cầu
response.responseCode == "00"; các service admin đã dùng parser
chung. AuthService tách riêng success code "200".
Delivery/receive/refund/surcharge/extend/finish chỉ show success khi
result['success']==true; failure hiển thị snackbar đỏ bằng backend
message.

Evidence / next step

Release signing config đã đọc từ env/Gradle properties và không
dùng debug signing. Cần AMZ/Enoch cung cấp keystore/secrets hoặc
quy trình ký chính thức.
SecureHttpClient + http_certificate_pinning đã có; build release yêu
cầu AMZ_CERT_SHA256. Cần AMZ cung cấp fingerprint
active/backup và rotation plan.
LoginScreen đã có mounted checks ở async paths chính. Report yêu
cầu broad audit toàn app cho mọi setState sau await, nên vẫn cần
kiểm tra tiếp theo risk.
Đã có tests trọng điểm và flutter test pass 37/37, nhưng coverage
mới 7.51%, chưa đạt 60%.
Scan không còn _buildXxx/Widget _build trong lib/test; UI đã được
tách widget theo pattern mới.
Contract detail đã có action/dialog Xác nhận hoàn tiền gọi
BookingAdminService.confirmRefund và xử lý success/error đúng.
Parser/session service redirect login khi HTTP 401/403 hoặc
token-expired code. Cần AMZ/BE xác nhận đầy đủ expired-code
matrix và refresh-token contract nếu muốn auto refresh.
AuthService.logout bắt empty/invalid/network response;
StorageService.logout luôn clear local cache/token state kể cả secure
storage delete lỗi.

Evidence / next step
applicationId đã đổi sang vn.amzholdings.xanh.admin.
Info.plist có NSAppTransportSecurity và
NSAllowsArbitraryLoads=false.

Confidential working note | Trang 2

AMZ Xanh Admin App - REVIEW-REPORT Response

ID
MED-03

Mức
MEDIUM

MED-04

MEDIUM

MED-05

MEDIUM

Status
Done

Done

Done

MED-06

MEDIUM

Partial

MED-07

MEDIUM

MED-08

MEDIUM

Done

Done

MED-09

MEDIUM

Need AMZ/BE

MED-10

MEDIUM

Done

LOW Findings

ID
LOW-01

LOW-02
LOW-03

LOW-04

Mức
LOW

LOW
LOW

LOW

Status
Open

Done
Done

Done

Evidence / next step

scripts/build_release.sh bật --obfuscate và --split-debug-info cho
apk/appbundle/ipa.
Scan lib không còn print(); debugPrint còn lại nằm trong
kDebugMode ở storage error paths.
Request wrapper đã dùng AppUtils.generateRequestTime() chung;
generateRequestId() cũng centralized.
Dashboard không còn số liệu fake; hiện placeholder/empty panels.
Cần AMZ cung cấp dashboard API thật nếu muốn hiển thị số liệu
production.
analysis_options.yaml bật strict-casts, strict-inference,
strict-raw-types.
Navigation item model/test giữ mapping màn hình và bottom nav
trong một source coherent.
Banner/news có parser guard theo responseCode; vì
BE/source/gateway có thể đã đổi, cần AMZ/BE xác nhận production
format và endpoint mapping.
Shared parser/services có SocketException handling qua
AdminApiResponse.networkFailure() với message thân thiện.

Evidence / next step

Client-side local lockout sau 5 lần login sai chưa ưu tiên; backend vẫn
là nơi bắt buộc enforce rate limit/lockout.
BookingAdminService không còn import dart:convert trùng.
AppUtils.generateRequestId() dùng microseconds + counter + random
part; test uniqueness 100 ids.
Base URL tập trung trong ApiConfig và hỗ trợ --dart-define
AMZ_PORTAL_BASE_URL/AMZ_API_BASE_URL/AMZ_IMAGE_BASE_U
RL.

Input AMZ/BE Cần Cung Cấp Để Nghiệm Thu

●  TLS pin: AMZ_CERT_SHA256 production fingerprint(s), gồm active và backup/next pin nếu có

rotation plan.

●  Release signing: Keystore/secrets hoặc quy trình AMZ tự ký artifact; không commit secrets vào

source.

●  Production API contract: Response code matrix hiện tại cho xanh-service, auth-service,

banner/news/promotion và endpoint/gateway mapping nếu BE đã đổi source.

●  Sanitized fixtures: Sample JSON success/failure/token-expired/permission/validation/malformed

response, không chứa token/credential thật.

●  Manual acceptance data: Admin test account, test bookings, vehicle/customer/payment data, và

test window an toàn nếu đang nghiệm thu trên production.

●  Dashboard endpoint: Endpoint thống kê thật nếu AMZ muốn đóng MED-06 trước production.

Confidential working note | Trang 3

