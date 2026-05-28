# Huong dan setup moi truong dev

> Cap nhat: 2026-05-28 | Source: reverse-engineered tu application.yml, application.yaml, package.json
> Ghi chu: Nhung buoc chua xac nhan trong code duoc danh dau [CAN LEAD XAC NHAN]

---

## Yeu cau tien quyet

| Cong cu | Version toi thieu | Ghi chu |
|--------|------------------|---------|
| JDK | 21 | Tat ca BE service dung Java 21 |
| Maven | 3.8+ | Cac xanh-service va internal-auth-service dung Maven |
| Node.js | 20+ | Admin FE, devDependencies yeu cau `@types/node: ^20` |
| npm | 9+ | Package manager FE |
| Docker + Docker Compose | — | [CAN LEAD XAC NHAN — co bat buoc khong? Hay dev chay process thang?] |
| Git | — | Quan ly code |

---

## Buoc 1: Clone cac repo

```bash
# Tao thu muc workspace
mkdir amz-workspace && cd amz-workspace

# Clone tung repo
git clone <url-xanh-service> xanh-service
git clone <url-internal-auth-service> internal-auth-service
git clone <url-customer-auth-service> customer-auth-service
git clone <url-amazing-xanh-admin-fe> amazing-xanh-admin-fe
git clone <url-amz-socket> amz-socket
git clone <url-traffic-worker-service> traffic-worker-service
git clone <url-amz-api-gateway> amz-api-gateway
git clone <url-amazing-xanh-fe> amazing-xanh-fe  # chi can neu lam phan khach hang

# [CAN LEAD XAC NHAN] URL cua tung repo tren GitHub
```

**Luu y ve amz-api-gateway va amazing-xanh-fe:**
- `amz-api-gateway`: La cua ngo vao he thong (Java/Spring Boot). Can clone + chay neu muon test full flow local (FE local → gateway local → BE local). Neu chi lam admin FE → FE goi thang gateway staging (`api-portal.amzholdings.vn`), **khong can chay gateway local**.
- `amazing-xanh-fe`: Web khach hang (Next.js). Chi clone neu dev lam phan giao dien khach hang. Dev chi lam admin panel thi bo qua.

---

## Buoc 2: Setup PostgreSQL

**Quan trong: Toan bo service dung 1 PostgreSQL duy nhat.**

### Option A: Docker (khuyen nghi)

```bash
docker run -d \
  --name amz-postgres \
  -e POSTGRES_USER=<user> \
  -e POSTGRES_PASSWORD=<password> \
  -e POSTGRES_DB=<dbname> \
  -p 5432:5432 \
  postgres:15

# [CAN LEAD XAC NHAN] ten DB chinh xac la gi?
```

### Option B: PostgreSQL local (cai dat san)

```bash
# Tao user va database
psql -U postgres -c "CREATE USER amzuser WITH PASSWORD 'amzpass';"
psql -U postgres -c "CREATE DATABASE amzdb OWNER amzuser;"
```

### Khoi tao schema

```bash
# [CAN LEAD XAC NHAN] Chay migration script nao truoc tien?
# Hibernate ddl-auto=validate nen can chay SQL migration tay
# Xem cac file migration-*.sql trong thu muc goc Project
```

---

## Buoc 3: Setup Redis

```bash
# Chay Redis voi Docker
docker run -d --name amz-redis -p 6379:6379 redis:7-alpine
```

---

## Buoc 4: Cau hinh Environment Variables

### xanh-service — tao file `.env` hoac dat trong IDE run config:

```properties
# Database (bat buoc — khong co default)
POSTGRES_URL=jdbc:postgresql://localhost:5432/<dbname>
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<password>

# AWS S3
S3_ACCESS_KEY=<s3-key>
S3_SECRET_KEY=<s3-secret>

# Mesoft API (dong bo xe tu he thong cu)
MESOFT_TOKEN_DALAT=<token>
MESOFT_TOKEN_NHATRANG=<token>
MESOFT_ALL_CAR_TOKEN=<token>
MESOFT_GET_CAR_TOKEN=<token>

# Internal Auth cross-service
INTERNAL_AUTH_BASE_URL=http://localhost:8084/api/v1/auth
INTERNAL_SERVICE_SECRET_KEY=dev-shared-secret-change-me-in-prod

# Company code
APP_COMPANY_CODE=AMZ_XANH

# Google Docs (optional, disable duoc)
GOOGLE_DOCS_ENABLED=false

# OCR (optional, disable duoc neu khong co sidecar)
OCR_SERVICE_BASE_URL=http://localhost:8000

# Telegram (optional, co the tat)
TELEGRAM_ENABLED=false

# Server port (mac dinh 8082)
SERVER_PORT=8082
```

### internal-auth-service — tao file `.env` hoac dat trong IDE run config:

```properties
# Database (bat buoc)
POSTGRES_URL=jdbc:postgresql://localhost:5432/<dbname>
POSTGRES_USER=<user>
POSTGRES_PASSWORD=<password>

# JWT RSA Keys (lay tu lead hoac gen moi)
JWT_PRIVATE_KEY_CONTENT=<rsa-private-key-content>
JWT_PUBLIC_KEY_CONTENT=<rsa-public-key-content>

# Email (Brevo SMTP)
MAIL=<email>
MAIL_PASSWORD=<smtp-password>

# Zalo ZNS (OTP)
ZALO_ID=<id>
ZALO_SECRET=<secret>
ZNS_ID=<template-id>
ZNS_URL=<url>
ZNS_AUTH_URL=<url>

# Inter-service secret (phai trung voi INTERNAL_SERVICE_SECRET_KEY cua xanh-service)
INTERNAL_SERVICE_SECRET_KEY=dev-shared-secret-change-me-in-prod
```

**Luu y:** Tat ca credentials nhay cam xem tai `.planning/intel/secrets.md` (gitignored, hoi lead de lay).

---

## Buoc 5: Chay Backend (Be)

### xanh-service

```bash
cd xanh-service
mvn spring-boot:run
# Hoac trong IDE: chay class XanhServiceApplication.java

# Kiem tra: curl http://localhost:8082/api/v1/xanh/swagger-ui.html
```

### internal-auth-service

```bash
cd internal-auth-service
mvn spring-boot:run
# Port: 8084

# Kiem tra: curl http://localhost:8084/api/v1/auth/admin/swagger-ui.html
```

### customer-auth-service

```bash
cd customer-auth-service
mvn spring-boot:run
# Port: 8081

# [CAN LEAD XAC NHAN] Cac env vars can thiet cho customer-auth-service
```

---

## Buoc 6: Chay Frontend Admin

```bash
cd amazing-xanh-admin-fe
npm install
npm run dev

# FE chay tai: http://localhost:3000
```

**Quan trong:** FE local goi API qua gateway staging `https://api-portal.amzholdings.vn` — **khong** goi BE local. CORS da mo `*`. Khong can cau hinh them.

---

## Buoc 7: Kiem tra chay thanh cong

1. Mo trinh duyet, vao `http://localhost:3000`
2. Dang nhap voi tai khoan test: `[hoi lead / xem .planning/intel/secrets.md]` (so dien thoai + mat khau test — khong luu trong git)
3. Kiem tra co vao duoc trang quan ly booking khong
4. Tat ca API call se di qua gateway staging (xem Network tab de xac nhan)

---

## Luu y quan trong cho dev

| Dieu | Chi tiet |
|------|---------|
| **KHONG push thang main** | Tao branch moi, tao PR, lead merge |
| **KHONG tu apply SQL migration** | Sinh file `migration-<task>.sql`, lead apply tay len DB |
| **KHONG hardcode URL, secret** | Doc tu `application.yml` env var |
| **Table name thuc te** | Grep `@Table(name=...)` trong entity Java. Vi du: Booking → `new_bookings`, Car → `new_cars` |
| **ResponseCode check** | Luon check `response.responseCode === "00"` (xanh) hoac `=== "200"` (auth), KHONG chi HTTP 200 |
| **Cross-service entity** | KHONG import entity tu service khac. Moi service co entity rieng du chung DB |

---

## Troubleshooting thuong gap

| Loi | Nguyen nhan co the | Giai phap |
|-----|-------------------|----|
| `HikariPool timeout` | DB chua chay hoac sai URL | Kiem tra POSTGRES_URL, chac DB dang chay |
| `Schema validation failed` | Hibernate validate thay schema DB khac entity | Chay dung file migration SQL |
| `401 Unauthorized` | Token het han hoac sai secret | Lay token moi, kiem tra `INTERNAL_SERVICE_SECRET_KEY` trung nhau giua 2 service |
| `CORS error` | Goi direct BE local thay vi qua gateway | FE phai goi qua `api-portal.amzholdings.vn`, khong goi localhost BE |
| `Cannot find JWT key` | Thieu env JWT_PRIVATE_KEY_CONTENT | Lay tu `.planning/intel/secrets.md` hoac hoi lead |
