# Cong nghe su dung

> Cap nhat: 2026-05-28 | Source: reverse-engineered tu pom.xml, package.json, application.yml

---

## Giai thich don gian (cho nguoi khong chuyen IT)

He thong AMZ giong nhu 1 cua hang cho thue xe co:
- **Backend (Java/Spring Boot)** = "bo nao" xu ly nghiep vu: tinh tien, luu booking, quan ly xe. Khach khong nhin thay truc tiep.
- **Frontend (Next.js/React)** = "mat tien cua hang": giao dien NV bam nut, xem danh sach. Cai ma nguoi dung nhin + click.
- **Database (PostgreSQL)** = "kho ho so": noi luu tat ca du lieu (booking, xe, khach, tien).
- **Redis** = "bo nho tam": luu tam thong tin truy cap nhanh (vd session dang nhap).
- **Docker** = "thung chua dong goi san": giup chay ung dung giong nhau tren may dev va server that.
- **API Gateway** = "le tan": nhan moi yeu cau tu ngoai vao, chi duong toi dung bo phan xu ly.
- **S3 (AWS)** = "kho luu anh/file": luu anh xe, giay to, hop dong.

Khi can hieu sau hon tung phan, xem bang ky thuat ben duoi hoac hoi team-lead.

---

## Bang tong hop

| Layer | Cong nghe | Version | Ghi chu | Repo |
|-------|-----------|---------|---------|------|
| **Backend nghiep vu** | Java + Spring Boot | Java 21, Spring Boot **3.5.8** | xanh-service | `xanh-service/` |
| **Backend auth noi bo** | Java + Spring Boot | Java 21, Spring Boot **3.5.9** | internal-auth-service | `internal-auth-service/` |
| **Backend auth khach** | Java + Spring Boot | Java 21, Spring Boot [CAN LEAD XAC NHAN] | customer-auth-service | `customer-auth-service/` |
| **Frontend admin** | Next.js + React + TypeScript | Next.js **16.0.8**, React **19.2.1**, TS 5 | App Router + MUI 7 + Tailwind 4 | `amazing-xanh-admin-fe/` |
| **Database** | PostgreSQL | [CAN LEAD XAC NHAN — version] | 1 DB chung tat ca service | VPS rieng |
| **Realtime** | STOMP / SockJS + Redis | Redis 7-alpine | amz-socket | `amz-socket/` |
| **Worker** | Python | [CAN LEAD XAC NHAN — version] | Scheduler + crawler | `traffic-worker-service/` |
| **Object Storage** | AWS S3 | SDK 2.21.46 | Anh xe, CCCD, giay to | Bucket: `xanh-api-images`, region: `ap-southeast-1` |
| **Containerization** | Docker + Docker Compose | — | Moi service co Dockerfile, deploy qua compose | VPS prod + staging |
| **CI/CD** | GitHub Actions | — | Push code → build image → push DockerHub → SSH deploy | `.github/workflows/` |
| **API Gateway** | [CAN LEAD XAC NHAN — tech] | — | Route traffic, SSL termination | `amz-api-gateway/` |

---

## Chi tiet Backend

### xanh-service (Java 21 + Spring Boot 3.5.8)

| Thu vien | Version | Dung cho |
|---------|---------|---------|
| spring-boot-starter-data-jpa | 3.5.8 | ORM, truy cap DB |
| spring-boot-starter-security | 3.5.8 | Phan quyen @PreAuthorize |
| spring-boot-starter-web | 3.5.8 | REST API |
| mapstruct | 1.5.5.Final | Mapping DTO <-> Entity |
| aws-sdk (s3) | 2.21.46 | Upload anh S3 |
| springdoc-openapi | — | Swagger UI |
| Hibernate | (theo Spring Boot) | JPA dialect PostgreSQL, timezone VN |
| apache-httpclient5 | — | RestTemplate goi cross-service |
| Telegram Bot | — | Thong bao giao dich lon |
| Google Docs/Drive API | — | In hop dong |
| PaddleOCR sidecar | Python | Quet CCCD (goi qua HTTP `ocr.service.base-url`) |

**Swagger URL:** `https://api-portal.amzholdings.vn/api/v1/xanh/swagger-ui.html`

### internal-auth-service (Java 21 + Spring Boot 3.5.9)

| Thu vien / Config | Ghi chu |
|------------------|---------|
| JWT RSA key pair | `JWT_PRIVATE_KEY_CONTENT` + `JWT_PUBLIC_KEY_CONTENT` (env). TTL: 3600000ms = 1 gio |
| spring-boot-starter-mail | SMTP qua Brevo (smtp-relay.brevo.com:587) — gui OTP |
| Zalo ZNS | Gui OTP qua Zalo (`ZALO_ID`, `ZALO_SECRET`, `ZNS_ID`) |
| Inter-service auth | Header `X-Internal-Service-Secret` — xanh-service goi auth service |

**Swagger URL:** `https://api-portal.amzholdings.vn/api/v1/auth/admin/swagger-ui.html`

---

## Chi tiet Frontend

### amazing-xanh-admin-fe (Next.js 16.0.8 + React 19)

| Thu vien | Version | Dung cho |
|---------|---------|---------|
| next | 16.0.8 | Framework, App Router, BFF API routes |
| react + react-dom | 19.2.1 | UI rendering |
| typescript | ^5 | Type safety |
| @mui/material | ^7.3.6 | Component UI chinh |
| @mui/icons-material | ^7.3.6 | Icon |
| @mui/x-date-pickers | ^8.23.0 | Date/time picker |
| @emotion/react + styled | ^11 | CSS-in-JS (MUI dep) |
| tailwindcss | ^4 | Utility CSS (cung dung voi MUI) |
| axios | ^1.13.2 | HTTP client goi BFF API routes |
| react-hook-form | ^7.71.1 | Form management |
| jotai | ^2.15.2 | Global state management |
| react-toastify | ^11.0.5 | Toast notification |
| dayjs | ^1.11.19 | Xu ly date/time |
| recharts | ^3.7.0 | Bieu do doanh thu |
| jsonwebtoken | ^9.0.3 | Doc JWT payload phia client |
| js-cookie | ^3.0.5 | Luu token vao cookie |
| react-number-format | ^5.4.4 | Format so tien VND |
| react-to-print | ^3.2.0 | In trang tu trinh duyet |
| uuid | ^13.0.0 | Tao UUID client-side |
| lucide-react | ^0.556.0 | Icon bo sung |

**Pattern BFF:** Admin FE dung Next.js API routes (`/app/api/**/route.ts`) lam proxy trung gian, them header auth truoc khi goi xanh-service. Khong goi truc tiep tu browser.

---

## Infrastructure

### VPS

| Moi truong | IP | SSH Port | Docker Compose |
|------------|----|---------|-|
| **Production** | `[xem .planning/intel/vps.md]` | `[xem vps.md]` | `/root/amz-prod/docker-compose.yml` |
| **Staging** | `[xem .planning/intel/vps.md]` | `[xem vps.md]` | `/root/api-gateway/docker-compose.yml` |

> **Luu y bao mat:** IP VPS + SSH port la thong tin nhay cam — KHONG luu trong git. Xem `.planning/intel/vps.md` (gitignored, hoi lead de lay).

### Docker Images (DockerHub: `ltuan1207`)

| Service | Tag prod | Tag staging |
|---------|---------|-------------|
| xanh-service | `ltuan1207/xanh-service:prod` | `ltuan1207/xanh-service:latest` |
| api-gateway | `ltuan1207/api-gateway:prod` | `ltuan1207/api-gateway:latest` |
| internal-auth-service | [CAN LEAD XAC NHAN] | [CAN LEAD XAC NHAN] |
| customer-auth-service | [CAN LEAD XAC NHAN] | [CAN LEAD XAC NHAN] |
| redis | `redis:7-alpine` | `redis:7-alpine` |

### GitHub Actions CI/CD

- `main` branch → staging (tag `:latest`)
- `prod` branch hoac release tag → production (tag `:prod`)
- Auto deploy: Push code → build Docker → push DockerHub → SSH vao VPS → `docker compose up -d`
