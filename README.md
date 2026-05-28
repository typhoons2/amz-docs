# Tai lieu he thong AMZ

> Cap nhat: 2026-05-27 | Source: reverse-engineered tu code + config

---

## Cach doc

1. **Bat dau voi `00-overview/`** — hieu tong the he thong (so do, cong nghe, thuat ngu)
2. **Tiep theo `01-business/`** — hieu nghiep vu (phan quyen, quy trinh, luong tien)
3. **Dev doc `02-technical/`** khi code (state machine, API contract, sequence diagram)
4. **Deploy doc `03-operations/`** khi deploy len staging/prod
5. **Thac mac "tai sao?"** doc `04-decisions/`

---

## Danh sach tai lieu

### 00-overview — Tong quan he thong

| File | Mo ta | Ai doc |
|------|-------|--------|
| [system-architecture.md](00-overview/system-architecture.md) | So do he thong, mo ta tung service, port, ResponseCode, giao tiep cross-service | Tat ca |
| [domain-glossary.md](00-overview/domain-glossary.md) | Tu dien thuat ngu — trang thai booking, loai phieu thu/chi, field tai chinh, role | Tat ca |
| [tech-stack.md](00-overview/tech-stack.md) | Cong nghe su dung, version, thu vien chinh, VPS, CI/CD | Dev + DevOps |
| [onboarding-guide.md](00-overview/onboarding-guide.md) | Huong dan setup moi truong dev, clone repo, env vars, chay lan dau | Dev moi |

### 01-business — Nghiep vu

| File | Mo ta | Ai doc |
|------|-------|--------|
| [permission-matrix.md](01-business/permission-matrix.md) | Bang phan quyen chi tiet: 4 role x 15+ action = ai lam duoc gi | Dev + Lead |
| booking-lifecycle.md | Vong doi hop dong: tao → giao xe → nhan xe → quyet toan, cac truong hop ngoai le | [Chua tao — Wave 2] |
| financial-flow.md | Luong tien: PT/PC, logic "Tru vao coc", but toan noi bo, cong thuc tinh remaining | [Chua tao — Wave 2] |
| kyc-flow.md | Luong duyet KYC: khach upload CCCD/bang lai → admin duyet/tu choi → auto-approve | [Chua tao — Wave 2] |
| surcharge-logic.md | Logic phu phi: them/xoa/goi y, surcharge_deducted_from_deposit, but toan noi bo | [Chua tao — Wave 2] |
| cancel-refund-flow.md | Luong huy don va hoan coc: phi huy, REFUND_PENDING, confirm refund | [Chua tao — Wave 2] |

### 02-technical — Ky thuat

| File | Mo ta | Ai doc |
|------|-------|--------|
| [state-machine.md](02-technical/state-machine.md) | State machine booking: transition map, dieu kien hop le | Dev BE |
| api-contracts/ | Contract API theo domain (booking, xe, tram, khach hang...) | Dev FE + BE |
| sequence-diagrams/ | Sequence diagram cac luong chinh (giao xe, nhan xe, confirm refund) | Dev |
| database-schema.md | Schema DB: bang chinh, index, constraint | [Chua tao — Wave 2] |
| request-wrapper-pattern.md | Pattern Request Wrapper trong xanh-service | [Chua tao — Wave 3] |
| bff-api-pattern.md | Pattern BFF API route trong admin FE | [Chua tao — Wave 3] |
| jwt-auth-flow.md | Luong JWT: login → token → refresh → logout | [Chua tao — Wave 2] |
| cross-service-auth.md | Giao tiep cross-service: X-Internal-Service-Secret | [Chua tao — Wave 3] |
| s3-storage.md | Pattern upload/download anh S3 presigned URL | [Chua tao — Wave 3] |
| google-docs-print.md | Luong in hop dong Google Docs: copy template, fill placeholder, export PDF | [Chua tao — Wave 3] |
| ocr-cccd.md | Luong scan OCR CCCD: upload anh, goi Python sidecar, tra ket qua | [Chua tao — Wave 3] |
| telegram-notification.md | Cau hinh Telegram bot, routing theo region, nguong giao dich lon | [Chua tao — Wave 3] |

### 03-operations — Van hanh

| File | Mo ta | Ai doc |
|------|-------|--------|
| deploy-guide.md | Quy trinh deploy: staging va production, rollback | [Chua tao — Wave 2] |
| docker-compose-reference.md | Tham chieu docker-compose.yml cua prod va staging | [Chua tao — Wave 2] |
| cicd-pipeline.md | Chi tiet GitHub Actions workflow | [Chua tao — Wave 2] |
| monitoring.md | Log, Telegram alert, theo doi he thong | [Chua tao — Wave 3] |
| database-migration.md | Quy trinh viet va apply SQL migration (KHONG auto) | [Chua tao — Wave 2] |
| vps-access.md | Thong tin VPS prod + staging, SSH, Docker Compose paths | [Xem .planning/intel/vps.md] |
| runbook-incidents.md | Xu ly su co thuong gap: DB full, service down, loi deploy | [Chua tao — Wave 3] |

### 04-decisions — Quyet dinh kien truc

| File | Mo ta | Ai doc |
|------|-------|--------|
| adr-001-shared-db.md | Ly do chon 1 PostgreSQL chung cho tat ca service (khong microservice DB rieng) | Tech lead |
| adr-002-request-wrapper.md | Ly do dung Request Wrapper pattern (khong REST thuan tuy) | Dev |
| adr-003-bigint-money.md | Ly do dung BIGINT cho tien (don vi VND, khong dung DECIMAL) | Dev BE |
| adr-004-no-cross-entity.md | Ly do cam cross-service entity import | Dev BE |
| adr-005-rsa-jwt.md | Ly do dung RSA key pair cho JWT thay vi HMAC | [Chua tao — Wave 3] |
| [ADR-006-surcharge-not-in-total.md](04-decisions/ADR-006-surcharge-not-in-total.md) | Phi giao nhan/chuyen vung nhap qua surcharge KHONG cong total_amount — van de + huong fix | Lead, Dev BE |

---

## Thong tin tham chieu nhanh

| Can tim gi | O dau |
|-----------|-------|
| Port cua service | [system-architecture.md](00-overview/system-architecture.md) |
| ResponseCode cua service | [system-architecture.md](00-overview/system-architecture.md) hoac CLAUDE.md |
| Y nghia trang thai booking | [domain-glossary.md](00-overview/domain-glossary.md) |
| Ai duoc lam gi | [permission-matrix.md](01-business/permission-matrix.md) |
| Setup moi truong | [onboarding-guide.md](00-overview/onboarding-guide.md) |
| Table name thuc te | Grep `@Table(name=...)` trong `xanh-service/src/main/java/.../entity/*.java` |
| Business defaults | `.planning/intel/business-defaults.md` |
| VPS + credentials | `.planning/intel/vps.md` + `.planning/intel/secrets.md` |
| State machine booking | `docs/02-technical/state-machine.md` |
