# Kien truc he thong AMZ

> Cap nhat: 2026-05-28 | Source: reverse-engineered tu code + config

---

## So do tong the

```
┌────────────────────────────────────┐  ┌──────────────────────────────────────────────┐
│  [Web Khach] amazing-xanh-fe       │  │  [FE Admin :3000] amazing-xanh-admin-fe       │
│  Next.js — giao dien dat xe        │  │  Next.js App Router — admin.amzholdings.com.vn │
│  cho khach hang cuoi               │  │  Goi API qua gateway /api/v1/xanh/*           │
└────────────────┬───────────────────┘  └──────────────────────────┬────────────────────┘
                 │                                                   │
                 └─────────────────────┬─────────────────────────────┘
                                       │
                          ┌────────────▼─────────────────────┐
                          │     amz-api-gateway               │
                          │  Java/Spring Boot (pom.xml +      │
                          │  Dockerfile) — cua ngo vao he     │
                          │  thong, route request den BE       │
                          │  api-portal.amzholdings.vn        │
                          └──────────────┬───────────────────┘
                                         │
              ┌──────────────────────────┼─────────────────────┐
              │                          │                       │
              ▼                          ▼                       ▼
┌─────────────────────┐   ┌────────────────────────┐  ┌──────────────────────┐
│   xanh-service      │   │ internal-auth-service  │  │ customer-auth-service│
│   Port: 8080 (8082) │   │   Port: 8084           │  │   Port: 8081         │
│   Nghiep vu chinh   │   │   Auth noi bo          │  │   Auth khach hang    │
│   (booking, xe,     │   │   (staff/admin JWT,    │  │   (customer login,   │
│    tram, khach hang)│   │    role, company)       │  │    register, OAuth)  │
└──────────┬──────────┘   └────────────────────────┘  └──────────────────────┘
           │                          │                       │
           │          ┌───────────────┴───────────────────────┘
           │          │
           ▼          ▼
    ┌────────────────────┐
    │     PostgreSQL     │
    │   1 DB CHUNG       │
    │  (tat ca service   │
    │   dung chung)      │
    └────────────────────┘

┌─────────────────────────┐    ┌────────────────────────────┐
│   amz-socket (STOMP)    │───▶│         Redis              │
│   Realtime notification │    │   Cache + Pub/Sub          │
│   SockJS                │    │   Port: 6379               │
└─────────────────────────┘    └────────────────────────────┘

┌──────────────────────────────┐
│  traffic-worker-service      │
│  Python worker               │
│  Schedule, crawler, cron jobs│
└──────────────────────────────┘
```

---

## Mo ta tung service

### xanh-service
- **Repo path:** `xanh-service/` (worktree: `BACKEND/xanh-service`)
- **Port:** 8082 (container internal), expose qua gateway prefix `/api/v1/xanh`
- **Tech:** Java 21 + Spring Boot 3.5.8 + JPA + PostgreSQL
- **Vai tro:** Toan bo nghiep vu cot loi — booking (hop dong thue xe), quan ly xe, tram giao nhan, khach hang, giao dich thu/chi, bao cao doanh thu, in hop dong Google Docs, OCR CCCD
- **ResponseCode Success:** `"00"`
- **Gateway swagger:** `/api/v1/xanh/swagger-ui.html`

### internal-auth-service
- **Repo path:** `internal-auth-service/` (worktree: `BACKEND/internal-auth-service`)
- **Port:** 8084
- **Tech:** Java 21 + Spring Boot 3.5.9 + JWT (RSA key pair)
- **Vai tro:** Xac thuc noi bo — dang nhap staff/admin, cap JWT, phan quyen role (ADMIN/MANAGER/XANH/STAFF), quan ly company, reset password qua OTP Zalo/email
- **ResponseCode Success:** `"200"`
- **Luu y:** Moi JWT internal dung RSA private/public key (env: `JWT_PRIVATE_KEY_CONTENT`, `JWT_PUBLIC_KEY_CONTENT`). JWT het han sau 3600000ms (1 gio)

### customer-auth-service
- **Repo path:** `customer-auth-service/` (worktree: `BACKEND/customer-auth-service`)
- **Port:** 8081
- **Tech:** Java + Spring Boot
- **Vai tro:** Xac thuc khach hang — dang ky, dang nhap, Google OAuth2, refresh token cho end-user app
- **ResponseCode Success:** `"200"`
- **Luu y:** Google OAuth2 OAuth Client staging da tao (xem secrets.md)

### amazing-xanh-admin-fe
- **Repo path:** `amazing-xanh-admin-fe/` (worktree: `FONTEND/amazing-xanh-admin-fe`)
- **Port dev:** 3000
- **Tech:** Next.js 16.0.8 + React 19 + TypeScript 5 + MUI 7 + Tailwind 4 + Jotai + React Hook Form
- **Vai tro:** Admin panel — quan ly booking, xe, tram, khach hang, nhan vien, bao cao doanh thu, in hop dong
- **URL staging:** `https://releasexanh.amazingdalat.org`
- **URL prod:** `https://admin.amzholdings.com.vn`
- **Goi API:** Qua gateway `https://api-portal.amzholdings.vn` (staging) hoac `https://api.amzholdings.com.vn` (prod). Local dev dung staging gateway (CORS `*`).

### amz-socket
- **Repo path:** `amz-socket/` (worktree: `BACKEND/amz-socket`)
- **Tech:** Spring + STOMP/SockJS + Redis Pub/Sub
- **Vai tro:** Realtime notification — push cap nhat booking, trang thai den admin panel theo thoi gian thuc

### traffic-worker-service
- **Repo path:** `traffic-worker-service/` (worktree: `BACKEND/traffic-worker-service`)
- **Tech:** Python
- **Vai tro:** Background jobs — schedule tu dong, crawler data tu he thong mesoft.biz, dong bo lich xe tu he thong cu

### amazing-xanh-fe
- **Repo path:** `amazing-xanh-fe/`
- **Tech:** Next.js
- **Vai tro:** Web KHACH HANG — giao dien cho khach hang dat xe, xem lich su booking, dang nhap/dang ky. KHAC voi `amazing-xanh-admin-fe` (admin panel danh cho nhan vien/quan ly).

### amz-api-gateway
- **Repo path:** `amz-api-gateway/`
- **Tech:** Java / Spring Boot (co `pom.xml` + `Dockerfile`)
- **Vai tro:** API Gateway — cua ngo vao he thong. Nhan moi request tu FE/client, route den dung service backend theo prefix path. SSL termination. Gateway staging: `api-portal.amzholdings.vn`.

---

## Database

**Quan trong: Toan bo 6 service dung CHUNG 1 PostgreSQL duy nhat.** Khong co DB rieng cho tung service.

Ket qua: Moi service truy cap cung cac table nhung KHONG DUOC import entity cua service khac. Moi service phai co entity rieng (du cung map ve cung table vat ly). Vi du: xanh-service co `StaffProfile` map `staff_profiles`, internal-auth-service co `User` map `users` — hai service cung DB nhung entity rieng.

- **DB type:** PostgreSQL (chay tren VPS rieng, khong phai container)
- **Connection:** Qua env `POSTGRES_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
- **Timezone:** `Asia/Ho_Chi_Minh`
- **Hibernate DDL:** `validate` (khong auto-create/drop)

---

## ResponseCode Convention

| Service | Success | Validate fail | Not found | Business rule vi pham | Auth fail |
|---------|---------|---------------|-----------|----------------------|-----------|
| xanh-service | `"00"` | `"01"` | `"02"` | `"03"` | — |
| internal-auth-service | `"200"` | — | `"404"` | — | `"401"`, `"403"` |
| customer-auth-service | `"200"` | — | — | — | `"401"`, `"403"` |

**Luon check `response.responseCode`, KHONG chi dua vao HTTP status code.**

---

## Cross-service Communication

- **xanh-service -> internal-auth-service:** Goi HTTP noi bo voi header `X-Internal-Service-Secret` (env: `INTERNAL_SERVICE_SECRET_KEY`). Base URL: `${INTERNAL_AUTH_BASE_URL}` (mac dinh `http://localhost:8084/api/v1/auth`)
- **Khong co cross-service entity import:** Moi service co entity rieng du chung DB

---

## Luu y bao mat & deploy

- **JWT RSA Key:** internal-auth-service dung RSA key pair, KHONG phai HMAC secret
- **S3:** Anh xe, giay to luu tren AWS S3 bucket `xanh-api-images` (region `ap-southeast-1`)
- **Telegram Bot:** Thong bao giao dich lon, chia theo region (da-lat, nha-trang)
- **Google Docs/Drive:** In hop dong tu mau template, dung Service Account JSON
- **CI/CD:** GitHub Actions → Docker Hub → SSH deploy VPS (`ltuan1207/xanh-service:latest`)
