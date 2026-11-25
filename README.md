# Admin Panel

หน้าเว็บสำหรับ admin ของเซิร์ฟเวอร์ FiveM ใช้ดู log ที่ script ต่างๆ ในเกมบันทึกไว้ เช่น การเงิน, item, การตาย, รถ และคำสั่ง admin
เข้าสู่ระบบด้วย Discord และเปิดให้เฉพาะ Discord ID ที่กำหนดไว้

![stack](https://img.shields.io/badge/Next.js-16-black) ![stack](https://img.shields.io/badge/React-19-61dafb) ![stack](https://img.shields.io/badge/Tailwind-4-38bdf8)

## ความสามารถ
- **เมนู Script → Type** (sidebar) แสดงจำนวน log ใน 24 ชั่วโมงล่าสุด และมีช่องค้นหา รองรับ script หลักร้อยตัว
- **Filter** ตามช่วงเวลา (`1h` `24h` `7d` `30d` หรือกำหนดเอง) และตามผู้เล่น (Discord ID)
- **ดูรายละเอียด log** แบบ key/value พร้อมปุ่ม Copy JSON และ copy Discord ID
- **Filter เก็บอยู่ใน URL** แชร์ลิงก์ให้ admin คนอื่นได้ และกดปุ่ม Back ย้อนได้
- **รองรับมือถือ** เมนูเปลี่ยนเป็น drawer และรายการ log เปลี่ยนเป็น card
- **ธีม dark** และใส่ใจ accessibility (keyboard focus, aria label, reduced motion)

## ภาพรวมระบบ
```
FiveM server ── exports.mongodb:log() ──▶ MongoDB (fivem_logs) ◀── Elysia API (VPS) ◀── /api/* ── Admin Panel (Netlify)
```
- **repo นี้มีแค่หน้าเว็บ** ข้อมูลทั้งหมดดึงผ่าน **Admin Panel API** (Elysia + Bun) ที่รันอยู่บน VPS เครื่องเดียวกับ MongoDB
- Next.js ส่ง `/api/*` ต่อไปที่ API ผ่าน `rewrites` ใน [`next.config.ts`](next.config.ts) ทำให้เว็บกับ API อยู่ origin เดียวกัน
  cookie login จึงใช้ร่วมกันได้และไม่ต้องตั้ง CORS
- หน้าเว็บไม่ได้ต่อ MongoDB โดยตรง และไม่มี secret ใดๆ อยู่ฝั่งเว็บ

## เริ่มพัฒนาบนเครื่อง
ต้องรัน API ไว้ก่อน (ค่า default คือ `http://localhost:8080`)
```bash
bun install
cp .env.example .env.local   # แก้ API_URL ถ้า API ไม่ได้อยู่ที่ localhost:8080
bun run dev                  # http://localhost:3000
```

| คำสั่ง | หน้าที่ |
|---|---|
| `bun run dev` | dev server |
| `bun run build` | build สำหรับ production |
| `bun run lint` | ESLint |

## Deploy บน Netlify
1. **Add new site → Import from GitHub** แล้วเลือก repo นี้ (Netlify จะอ่านค่า build จาก [`netlify.toml`](netlify.toml) เอง)
2. **Site configuration → Environment variables** เพิ่ม
   | ชื่อ | ตัวอย่าง | หมายเหตุ |
   |---|---|---|
   | `API_URL` | `https://api.your-domain.com` | URL สาธารณะของ API ควรเป็น HTTPS **ใช้ตอน build** ถ้าเปลี่ยนต้อง deploy ใหม่ |
3. Deploy

### ตั้งค่าฝั่ง API ให้ตรงกับ Netlify
ใน `.env` ของ API บน VPS:
```env
NODE_ENV=production                                   # cookie เป็น Secure (ต้องใช้ HTTPS)
WEB_URL=https://<your-site>.netlify.app               # หน้าที่ redirect กลับไปหลัง login
DISCORD_REDIRECT_URI=https://<your-site>.netlify.app/api/auth/callback
```
และเพิ่ม Redirect URI เดียวกันนี้ใน [Discord Developer Portal](https://discord.com/developers/applications) → OAuth2 → Redirects

ถ้าใช้ custom domain ให้เปลี่ยน `<your-site>.netlify.app` เป็น domain นั้นทั้ง 3 จุด

## โครงสร้างโปรเจกต์
```
app/
├── layout.tsx            font, theme
├── page.tsx              หน้าหลัก (ห่อ LogsView ด้วย Suspense)
├── logs-view.tsx         state หลัก: โหลด log, เมนู, filter ↔ URL
├── login/                หน้า login + ข้อความ error จาก OAuth
└── components/
    ├── sidebar.tsx       เมนู Script → Type + ค้นหา
    ├── filter-bar.tsx    Time / Player + ชิป filter ที่ใช้อยู่
    ├── log-list.tsx      รายการ log, รายละเอียด, skeleton
    ├── top-bar.tsx       แถบบน + ปุ่มเปิดเมนูบนมือถือ + ออกจากระบบ
    ├── filters.ts        แปลง filter ↔ URL ↔ query ของ API
    └── format.ts         format เวลา, ตัวเลข, สีของ type
lib/api.ts                API client และ type ของ response
```

## API ที่หน้าเว็บเรียกใช้
| Method | Path | หน้าที่ |
|---|---|---|
| GET | `/api/auth/login` | redirect ไป Discord |
| GET | `/api/auth/me` | ข้อมูล admin ที่ login อยู่ (401 = ยังไม่ login) |
| POST | `/api/auth/logout` | ออกจากระบบ |
| GET | `/api/logs` | รายการ log (`resource`, `type`, `identifier`, `from`, `to`, `limit`, `cursor`) |
| GET | `/api/logs/menu` | เมนู script → type พร้อมจำนวน 24 ชม. |
