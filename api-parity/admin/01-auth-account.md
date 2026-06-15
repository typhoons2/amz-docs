# Doi chieu API + nghiep vu — LO 01-auth-account

> Pham vi: Dang nhap, dang xuat, refresh token, lay thong tin user, doi mat khau, cap nhat profile.
> So sanh Web admin (amazing-xanh-admin-fe, lop BFF route.ts) vs App admin (amz_xanh_admin_app, Flutter goi backend truc tiep).

## Tom tat

- **So route.ts da quet: 7** (auth: login, logout, me, refresh, refresh-redirect | account: change-password, update-profile)
- **CRITICAL: 1** (logout app goi sai endpoint, mat hieu luc huy phien — refreshToken khong bi thu hoi)
- **HIGH: 4** (refresh token, get profile, doi mat khau, cap nhat profile — deu THIEU o app; app duoc lam UI nhung nut bam khong goi API nao)

> Luu y chung: TAT CA route auth ben Web KHONG verify `response.responseCode` (auth-service convention success = "200"). Web chi dua vao HTTP status (`responseApi.ok`) de phan biet thanh/bai. App login co verify `responseCode == "200"` dung convention. Day la lech kiem soat ket qua giua 2 ben (Web long leo hon).

## Bang doi chieu

| Hanh dong | Web (endpoint + method) | App (endpoint + method) | Trang thai | Muc do | Ghi chu nghiep vu |
|-----------|--------------------------|--------------------------|------------|--------|-------------------|
| Dang nhap | `POST /api/v1/auth/admin/login` (AUTH.LOGIN, qua route `/api/auth/login`) | `POST /api/v1/auth/admin/login` (ApiEndpoints.login) | MATCH | OK | Endpoint + method + body khop (`username`, `password` + Web bo deviceId, App them `deviceId`). Web boc token vao cookie httpOnly; App tu luu refreshToken/userId vao storage. Web KHONG check `responseCode` (chi check HTTP ok) → neu backend tra HTTP 200 kem responseCode loi, Web van coi la dang nhap thanh cong. App check `responseCode == "200"` dung. |
| Truong body deviceId khi login | Web: KHONG gui `deviceId` (chi forward body raw qua createRequestPayload) | App: CO gui `deviceId` trong `data` | BODY_MISMATCH | LOW | App gui them `deviceId` de backend nhan dien thiet bi; Web khong gui. Khong gay sai du lieu nhung khac contract. Can xac nhan backend co bat buoc deviceId khong. |
| Dang xuat | `POST /api/v1/auth/admin/logout` (AUTH.LOGOUT) — gui `refreshToken` trong body + header Bearer accessToken | `POST /api/v1/auth/logout` (ApiEndpoints.logout, THIEU `/admin`) — gui `refreshToken` + Bearer accessToken | ENDPOINT_MISMATCH | CRITICAL | App goi sai duong dan (`/auth/logout` thay vi `/auth/admin/logout`). Hau qua: lenh huy phien admin co the khong trung route → refreshToken KHONG bi thu hoi phia server, phien van song du user da bam dang xuat. Web thi xoa cookie + goi dung endpoint admin. App check `responseCode == "200"`, Web KHONG check responseCode. |
| Refresh token (lam moi phien) | `POST /api/v1/auth/admin/refresh-token` (AUTH.REFRESH_TOKEN) — 2 route: `/api/auth/refresh` (XHR) va `/api/auth/refresh-redirect` (dieu huong). Gui `refreshToken`, set lai cookie accessToken/refreshToken | (khong co) | MISSING_IN_APP | HIGH | App co LUU refreshToken vao storage nhung KHONG co bat ky loi goi refresh nao. Khi accessToken het han, app khong tu gia han → user bi dang xuat dot ngot / cac API tra 401, phai dang nhap lai. Web tu dong refresh truoc khi het han. |
| Lay thong tin user (me / profile) | `GET /api/v1/auth/admin/profile` (AUTH.GET_PROFILE, qua route `/api/auth/me`) — tra `result.data` | (khong co) | MISSING_IN_APP | HIGH | App KHONG goi API profile. Man hinh Settings hien thong tin CUNG (hardcode "Admin User" / "admin@amazingxanh.vn" / "Super Admin"), khong phai du lieu that cua user dang dang nhap. Web lay profile that tu backend. |
| Doi mat khau | `POST /api/v1/auth/admin/change-password` (AUTH.CHANGE_PASSWORD, qua route `/api/account/change-password`) | (khong co) | MISSING_IN_APP | HIGH | App co nut "Doi mat khau" trong Settings nhung `onTap` rong (`() {}`) — khong goi API. Chuc nang chi co tren Web. |
| Cap nhat profile | `POST /api/v1/auth/admin/profile/update` (AUTH.UPDATE_PROFILE, qua route `/api/account/update-profile`) — chi gui `fullName` | (khong co) | MISSING_IN_APP | HIGH | App co nut "Chinh sua ho so" trong Settings nhung `onPressed` rong (`() {}`) — khong goi API. Web chi cho sua `fullName`. Chuc nang chi co tren Web. |

## Ghi chu bo sung (App-only / khac biet)

- App KHONG co loi goi nao vuot ra ngoai pham vi auth/account ma Web khong co (khong co APP_ONLY trong lo nay).
- Khac biet kien truc: Web giu token trong cookie httpOnly (BFF), co flow refresh-redirect cho dieu huong server-side; App giu token trong SharedPreferences va khong refresh.
- Rui ro chung CRITICAL/HIGH deu nam o App: thieu refresh, thieu doi mat khau, thieu cap nhat profile, khong lay profile that, va dac biet logout goi sai endpoint.
