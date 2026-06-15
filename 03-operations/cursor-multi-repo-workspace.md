# Huong dan hien du Git repo trong Cursor / VS Code

> Cap nhat: 2026-05-30 | Ap dung cho workspace AMZ tren may lead (thu muc `Project`)

---

## Van de thuong gap

Mo thu muc `Project` trong Cursor, vao **Source Control** (Ctrl+Shift+G), muc **REPOSITORIES** chi hien:

- **Project Git** — branch `main*` (hoac branch hien tai)

Trong khi tren may co nhieu service (moi folder co `.git` rieng): `xanh-service`, `internal-auth-service`, `amazing-xanh-admin-fe`, ...

**Mong muon:** REPOSITORIES liet ke tat ca repo dang lam viec de commit/push/sync tung service khong can mo nhieu cua so.

---

## Nguyen nhan

| Hien tuong | Giai thich |
|-----------|------------|
| Chi thay 1 repo | Cursor/VS Code mac dinh uu tien repo o **root** folder dang mo |
| Repo con khong hien | Chua bat **quet repo trong thu muc con**, hoac chua mo **multi-root workspace** |
| Folder khong co `.git` | Khong bao gio xuat hien trong REPOSITORIES (vd chi la folder code thuong) |

Cau truc tren may lead (2026-05):

```
Project/                    ← co .git (repo root — "Project Git")
├── xanh-service/           ← co .git rieng
├── internal-auth-service/  ← co .git rieng
├── amazing-xanh-admin-fe/  ← co .git rieng
├── amz-api-gateway/        ← co .git rieng
├── amz-socket/             ← co .git rieng
├── amazing-xanh-fe/        ← co .git rieng
├── xanh-service-prepayment/        ← worktree / task (co .git)
└── amazing-xanh-admin-fe-prepayment/
```

---

## Danh sach repo AMZ (chinh)

| Repo | Vai tro | Port (tham khao) |
|------|---------|------------------|
| `xanh-service` | Backend nghiep vu | 8080 |
| `internal-auth-service` | Auth noi bo staff/admin | 8084 |
| `customer-auth-service` | Auth khach hang | 8081 |
| `traffic-worker-service` | Python worker | — |
| `amz-socket` | Realtime STOMP/SockJS | — |
| `amz-api-gateway` | API gateway | — |
| `amazing-xanh-admin-fe` | Admin panel Next.js | 3000 |
| `amazing-xanh-fe` | Web khach hang | — |

**Worktree theo task:** Khi lam song song nhieu task, tao folder dang `<repo>-<task-slug>` (vd `xanh-service-prepayment`). Them folder do vao workspace khi can (xem Cach 3).

Chi tiet worktree + cleanup sau merge: `CLAUDE-deep.md` (muc sau-merge cleanup).

---

## Cach 1 — Bat quet repo trong thu muc con (nhanh)

### Buoc thuc hien

1. Mo **Settings**: `Ctrl + ,`
2. Tim va dat:

| Setting | Gia tri |
|---------|---------|
| `Git: Auto Repository Detection` | `subFolders` (hoac `true`) |
| `Git: Repository Scan Max Depth` | `2` (tang len `3` neu repo nam sau 2 cap thu muc) |

3. **Reload Window**: `Ctrl+Shift+P` → go `Developer: Reload Window` → Enter.

### Cai dat global (Windows)

Them vao `%APPDATA%\Cursor\User\settings.json`:

```json
{
  "git.autoRepositoryDetection": "subFolders",
  "git.repositoryScanMaxDepth": 2
}
```

Sau khi reload, REPOSITORIES thuong hien them tung ten folder co `.git` (xanh-service, internal-auth-service, ...).

---

## Cach 2 — Multi-root workspace (on dinh nhat)

File mau san co tai root Project: **`Project.code-workspace`**

### Mo workspace

1. **File** → **Open Workspace from File...**
2. Chon `Project/Project.code-workspace`
3. Cursor hoi co luu workspace hien tai → chon **Save** hoac **Don't Save** tuy y

Moi muc trong `folders` = **mot dong rieng** trong REPOSITORIES.

### Noi dung file mau

```json
{
  "folders": [
    { "name": "xanh-service", "path": "xanh-service" },
    { "name": "internal-auth-service", "path": "internal-auth-service" },
    { "name": "amazing-xanh-admin-fe", "path": "amazing-xanh-admin-fe" },
    { "name": "amazing-xanh-fe", "path": "amazing-xanh-fe" },
    { "name": "amz-api-gateway", "path": "amz-api-gateway" },
    { "name": "amz-socket", "path": "amz-socket" }
  ],
  "settings": {
    "git.autoRepositoryDetection": "subFolders",
    "git.repositoryScanMaxDepth": 2
  }
}
```

**Luu y:** Worktree/prepayment **khong** nam trong file mac dinh — them khi dang lam task do (Cach 3).

---

## Cach 3 — Them / bo folder trong workspace

### Them worktree hoac repo moi

1. **File** → **Add Folder to Workspace...**
2. Chon folder (vd `xanh-service-prepayment`)
3. **File** → **Save Workspace As...** de luu ban workspace ca nhan (neu can)

### Bo folder khoi workspace

Chuot phai folder trong Explorer → **Remove Folder from Workspace**

---

## Khac phuc su co

| Trieu chung | Cach xu ly |
|------------|------------|
| Van chi 1 repo sau khi doi settings | Reload Window; dong Cursor mo lai bang **Open Workspace from File** |
| Repo con van khong hien | Tang `git.repositoryScanMaxDepth` len 3; kiem tra folder co thu muc `.git` |
| Khong remove duoc worktree | Ctrl+C `npm run dev` / dong terminal giu folder; dong Cursor dang mo folder do |
| Bushub / folder khac khong hien | Folder do khong co `.git` — can clone repo hoac Add Folder neu co repo ben trong |
| Commit nham repo | Kiem tra ten repo dang chon o dropdown REPOSITORIES truoc khi Commit |

---

## So sanh 3 cach

| | Cach 1 Settings | Cach 2 .code-workspace | Cach 3 Add Folder |
|--|-------------------|------------------------|-------------------|
| Do kho | Thap | Trung binh | Thap |
| On dinh | Trung binh | Cao | Cao (neu luu workspace) |
| Phu hop | Quet nhanh khi mo folder Project | Lam viec hang ngay nhieu repo | Them worktree tam thoi |

**Khuyen nghi lead:** Dung **Cach 2** (`Project.code-workspace`) cho lam viec hang ngay; **Cach 1** bo sung neu van mo thang folder `Project`.

---

## Lien quan

| Tai lieu | Noi dung |
|----------|----------|
| [CURSOR-MULTI-REPO.md](../../CURSOR-MULTI-REPO.md) | Tom tat 1 trang o root Project |
| [onboarding-guide.md](../00-overview/onboarding-guide.md) | Clone repo, setup dev |
| `CLAUDE-deep.md` | Worktree, cleanup branch sau merge |
| `CLAUDE.md` | Repo map, quy trinh team |

---

## Tom tat 30 giay

1. Mo `Project.code-workspace` **hoac** bat `git.autoRepositoryDetection` = `subFolders`
2. Reload Window
3. Source Control → REPOSITORIES: chon dung repo truoc khi commit
4. Task moi co worktree → **Add Folder to Workspace**
