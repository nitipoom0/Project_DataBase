import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import { nanoid } from "nanoid";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const app = express();
const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET || "supersecretchangeit";

app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// File storage for slips
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `slip_${Date.now()}_${nanoid(6)}${ext}`);
  },
});
const upload = multer({ storage });

// LowDB init
const dbFile = path.join(process.cwd(), "data", "db.json");
const adapter = new JSONFile(dbFile);
const db = new Low(adapter, { users: [], rooms: [], bookings: [], terms: [] });

await db.read();
db.data ||= { users: [], rooms: [], bookings: [], terms: [] };
await db.write();

// Seed if empty
if ((db.data.users || []).length === 0) {
  const adminPass = bcrypt.hashSync("admin123", 10);
  db.data.users.push({
    id: nanoid(),
    role: "admin",
    student_id: "A0000000",
    name: "Admin",
    email: "admin@example.com",
    phone: "000-000-0000",
    password_hash: adminPass,
  });
  await db.write();
}

if ((db.data.terms || []).length === 0) {
  db.data.terms.push(
    { id: "1", code: "2/2025", name: "Semester 2/2025" },
    { id: "2", code: "1/2026", name: "Semester 1/2026" }
  );
  await db.write();
}

if ((db.data.rooms || []).length === 0) {
  // Sample rooms across gender-separated buildings, capacities, and air/fan
  const sample = [];
  const buildings = [
    { id: "B1", name: "Building A (Female)", gender: "female" },
    { id: "B2", name: "Building B (Male)", gender: "male" },
    { id: "B3", name: "Building C (Female)", gender: "female" },
    { id: "B4", name: "Building D (Male)", gender: "male" },
  ];
  let rid = 1;
  for (const b of buildings) {
    for (let i = 1; i <= 6; i++) {
      const cap = i % 2 === 0 ? 4 : 2;
      const air = i % 3 !== 0; // more air than fan
      sample.push({
        id: String(rid++),
        dorm_id: b.id,
        dorm_name: b.name,
        gender: b.gender, // male|female (building policy)
        name: `Room ${i}`,
        type: cap === 2 ? "2pax" : "4pax",
        capacity: cap,
        cooling: air ? "air" : "fan",
        price_month: air ? 4200 : 3200,
        photos: [],
        amenities: ["Wi-Fi", air ? "Air Conditioning" : "Fan"],
      });
    }
  }
  db.data.rooms = sample;
  await db.write();
}

// Helpers
function auth(req, res, next) {
  const hdr = req.headers.authorization;
  if (!hdr) return res.status(401).json({ error: "Missing token" });
  const token = hdr.replace("Bearer ", "");
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin only" });
  next();
}

// Auth
app.post("/api/auth/register", async (req, res) => {
  const schema = z.object({
    student_id: z.string().min(4),
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(6),
    password: z.string().min(6),
  });
  const parse = schema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });

  const { student_id, name, email, phone, password } = parse.data;
  const exists = db.data.users.find(u => u.email === email || u.student_id === student_id);
  if (exists) return res.status(409).json({ error: "User already exists" });
  const password_hash = bcrypt.hashSync(password, 10);
  const user = { id: nanoid(), role: "student", student_id, name, email, phone, password_hash };
  db.data.users.push(user);
  await db.write();
  res.json({ ok: true });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const user = db.data.users.find(u => u.email === email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, role: user.role, name: user.name, email: user.email } });
});

// Rooms & filters
app.get("/api/rooms", async (req, res) => {
  const { gender, type, cooling, q } = req.query;
  let rooms = db.data.rooms;
  if (gender) rooms = rooms.filter(r => r.gender === gender);
  if (type) rooms = rooms.filter(r => r.type === type);
  if (cooling) rooms = rooms.filter(r => r.cooling === cooling);
  if (q) {
    const s = String(q).toLowerCase();
    rooms = rooms.filter(r => r.name.toLowerCase().includes(s) || r.dorm_name.toLowerCase().includes(s));
  }
  // Count current occupants (approved bookings in any term)
  const withCounts = rooms.map(r => {
    const approved = db.data.bookings.filter(b => b.room_id === r.id && b.status === "approved");
    const occupants = approved.length; // simple per-room booking count
    return { ...r, occupants };
  });
  res.json(withCounts);
});

app.get("/api/terms", (req, res) => {
  res.json(db.data.terms);
});

// Bookings
app.post("/api/bookings", auth, upload.single("slip"), async (req, res) => {
  const schema = z.object({
    room_id: z.string(),
    term_id: z.string(),
    note: z.string().optional(),
    pay_method: z.enum(["slip", "online"]),
  });
  const body = { ...req.body };
  const parse = schema.safeParse(body);
  if (!parse.success) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: parse.error.flatten() });
  }
  const { room_id, term_id, note, pay_method } = parse.data;

  const room = db.data.rooms.find(r => r.id === room_id);
  if (!room) return res.status(404).json({ error: "Room not found" });

  // Enforce gender by building
  const user = db.data.users.find(u => u.id === req.user.id);
  // For MVP we don't store gender on user; assume students select appropriate building manually.

  // Only one booking per student per term
  const dup = db.data.bookings.find(b => b.user_id === req.user.id && b.term_id === term_id && b.status !== "rejected");
  if (dup) return res.status(409).json({ error: "You already have a booking this term" });

  // Occupancy check (approved only)
  const approved = db.data.bookings.filter(b => b.room_id === room_id && b.status === "approved");
  if (approved.length >= room.capacity) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(409).json({ error: "Room full" });
  }

  const booking = {
    id: nanoid(),
    user_id: req.user.id,
    room_id,
    term_id,
    created_at: new Date().toISOString(),
    status: "pending", // admin must approve
    note: note || "",
    pay_method,
    slip_url: req.file ? `/uploads/${req.file.filename}` : null,
    online_ref: pay_method === "online" ? `ONL-${Date.now()}-${nanoid(4)}` : null,
  };
  db.data.bookings.push(booking);
  await db.write();
  res.json({ ok: true, booking });
});

app.get("/api/bookings/me", auth, async (req, res) => {
  const mine = db.data.bookings
    .filter(b => b.user_id === req.user.id)
    .map(b => ({ 
      ...b,
      room: db.data.rooms.find(r => r.id === b.room_id) || null,
      term: db.data.terms.find(t => t.id === b.term_id) || null,
    }));
  res.json(mine);
});

// Admin endpoints
app.get("/api/admin/bookings", auth, adminOnly, async (req, res) => {
  const items = db.data.bookings.map(b => ({
    ...b,
    user: (() => {
      const u = db.data.users.find(u => u.id === b.user_id);
      return u ? { id: u.id, name: u.name, student_id: u.student_id, email: u.email } : null;
    })(),
    room: db.data.rooms.find(r => r.id === b.room_id) || null,
    term: db.data.terms.find(t => t.id === b.term_id) || null,
  }));
  res.json(items);
});

app.post("/api/admin/bookings/:id/approve", auth, adminOnly, async (req, res) => {
  const b = db.data.bookings.find(x => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: "Not found" });
  const room = db.data.rooms.find(r => r.id === b.room_id);
  const approved = db.data.bookings.filter(x => x.room_id === b.room_id && x.status === "approved");
  if (approved.length >= room.capacity) return res.status(409).json({ error: "Room full" });
  b.status = "approved";
  await db.write();
  res.json({ ok: true });
});

app.post("/api/admin/bookings/:id/reject", auth, adminOnly, async (req, res) => {
  const b = db.data.bookings.find(x => x.id === req.params.id);
  if (!b) return res.status(404).json({ error: "Not found" });
  b.status = "rejected";
  await db.write();
  res.json({ ok: true });
});

app.get("/api/ping", (_, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
