import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import Select from "react-select";
import { Timestamp, FieldValue } from "firebase/firestore";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

interface CalendarEvent {
  id?: string;
  title: string;
  employee?: string;
  leaveType?: string[] | string;
  start: string;
  end?: string;
  status?: "approved" | "pending" | "rejected";
  backgroundColor?: string;
  textColor?: string;
  allDay?: boolean;
  createdAt?: Timestamp | Date | FieldValue | null;
}

export default function Calendar() {
  const role = localStorage.getItem("role");
  const canEdit = role === "admin" || role === "dev";

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<CalendarEvent[]>([]);
  const [balineseHolidays, setBalineseHolidays] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<{ value: string; label: string; id?: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>("all");
  const [selectedEmployeeForAdd, setSelectedEmployeeForAdd] = useState<string | null>(null);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // 🔁 filter libur
  const [showNationalHolidays, setShowNationalHolidays] = useState(true);
  const [showBalineseHolidays, setShowBalineseHolidays] = useState(true);

  const calendarRef = useRef<any>(null);
  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  /* ========== Realtime Data ========== */
  useEffect(() => {
    const unsub = onSnapshot(eventsCollection, (snap) => {
      const data = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as CalendarEvent),
      }));
      setEvents(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(employeesCollection, (snap) => {
      setEmployees(
        snap.docs.map((d) => ({
          id: d.id,
          value: d.data().name,
          label: d.data().name,
        }))
      );
    });
    return () => unsub();
  }, []);

/* ========== Libur Nasional / Bali ========== */
async function fetchHolidays(year: number) {
  try {
    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/ID`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Gagal fetch (${resp.status})`);
    const data = await resp.json();
    const formatted = data.map((d: any) => ({
      id: d.date,
      title: `🇮🇩 ${d.localName}`,
      start: d.date,
      backgroundColor: "#dc2626",
      textColor: "#fff",
      allDay: true,
    }));
    console.log("✅ Libur Nasional Ditemukan:", formatted.length);
    setHolidays(formatted);
  } catch (e) {
    console.error("⚠️ Gagal memuat libur nasional:", e);
  }
}

/* ========== Hari Raya Bali Multi-Tahun (Galungan, Kuningan, Nyepi, dll) ========== */

const REFERENCE_GALUNGAN = new Date("2025-02-12");
const CYCLE_DAYS = 210;
const BALINESE_CYCLES = [
  { title: "🌺 Hari Raya Galungan", offset: 0 },
  { title: "🌼 Hari Raya Kuningan", offset: 10 },
  { title: "🌸 Hari Raya Saraswati", offset: -35 },
  { title: "🕉️ Hari Raya Pagerwesi", offset: -31 },
  { title: "⚔️ Tumpek Landep", offset: -105 },
  { title: "🎶 Tumpek Krulut", offset: -84 },
  { title: "🐂 Tumpek Kandang", offset: -63 },
  { title: "🪵 Tumpek Uduh", offset: -42 },
  { title: "🎭 Siwaratri", offset: -3 },
];

function generateBalineseEvents(year: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const base = new Date(REFERENCE_GALUNGAN);

  for (let i = -15; i <= 15; i++) {
    const galunganBase = new Date(base);
    galunganBase.setDate(base.getDate() + i * CYCLE_DAYS);

    BALINESE_CYCLES.forEach((cycle) => {
      const date = new Date(galunganBase);
      date.setDate(galunganBase.getDate() + cycle.offset);
      if (date.getFullYear() === year) {
        const dateStr = date.toISOString().slice(0, 10);
        events.push({
          id: `${cycle.title}-${dateStr}`,
          title: cycle.title,
          start: dateStr,
          backgroundColor: "#16a34a",
          textColor: "#fff",
          allDay: true,
        });
      }
    });
  }

  return events;
}

/* ========== Hari Raya Indonesia (Libur Nasional + Hari Besar Tambahan) ========== */
async function fetchAllIndonesianHolidays(): Promise<CalendarEvent[]> {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const all: CalendarEvent[] = [];

  for (const y of years) {
    try {
      const url = `https://date.nager.at/api/v3/PublicHolidays/${y}/ID`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`Gagal fetch tahun ${y}`);
      const data = await resp.json();

      // 🔴 Data resmi dari Nager.Date
      const official = data.map((d: any) => ({
        id: `${y}-${d.date}`,
        title: `🇮🇩 ${d.localName}`,
        start: d.date,
        backgroundColor: "#dc2626",
        textColor: "#fff",
        allDay: true,
      }));

      // 🔴 Tambahkan hari besar nasional tambahan
      const extras = [
        { date: `${y}-04-21`, title: "🇮🇩 Hari Kartini" },
        { date: `${y}-06-01`, title: "🇮🇩 Hari Lahir Pancasila" },
        { date: `${y}-08-17`, title: "🇮🇩 Hari Kemerdekaan RI" },
        { date: `${y}-10-28`, title: "🇮🇩 Hari Sumpah Pemuda" },
        { date: `${y}-11-10`, title: "🇮🇩 Hari Pahlawan" },
        { date: `${y}-12-22`, title: "🇮🇩 Hari Ibu" },
      ].map((d) => ({
        id: `${y}-${d.date}`,
        title: d.title,
        start: d.date,
        backgroundColor: "#dc2626",
        textColor: "#fff",
        allDay: true,
      }));

      all.push(...official, ...extras);
    } catch (e) {
      console.warn(`⚠️ Gagal memuat hari raya Indonesia tahun ${y}:`, e);
    }
  }

  console.log(`✅ Total Hari Raya Indonesia dimuat: ${all.length}`);
  return all;
}

async function fetchAllBalineseHolidays(): Promise<CalendarEvent[]> {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  const all: CalendarEvent[] = [];

  // Tambahkan Nyepi dan Hari Raya Bali lainnya untuk tiap tahun
  for (const year of years) {
    // 🌙 Tambahkan Nyepi dari API publik
    try {
      const resp = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/ID`);
      const data = await resp.json();
      const nyepi = data.find((d: any) => d.localName.toLowerCase().includes("nyepi"));
      if (nyepi) {
        all.push({
          id: `nyepi-${nyepi.date}`,
          title: "🌙 Hari Raya Nyepi",
          start: nyepi.date,
          backgroundColor: "#16a34a",
          textColor: "#fff",
          allDay: true,
        });
      }
    } catch (e) {
      console.warn(`⚠️ Gagal memuat Nyepi ${year}:`, e);
    }

    // 🌿 Tambahkan Hari Raya Pawukon (Galungan, Kuningan, dll)
    all.push(...generateBalineseEvents(year));
  }

  console.log(`✅ Total Hari Raya Bali dimuat: ${all.length}`);
  return all;
}


useEffect(() => {
  (async () => {
    console.log("📅 Memuat semua Hari Raya Indonesia & Bali (multi-tahun)...");
    const [indo, bali] = await Promise.all([
      fetchAllIndonesianHolidays(),
      fetchAllBalineseHolidays(),
    ]);
    setHolidays(indo);
    setBalineseHolidays(bali);
  })();
}, []);

// Tambahkan efek re-render bila user menyalakan kembali checkbox
useEffect(() => {
  if (showNationalHolidays && holidays.length === 0) fetchHolidays(selectedYear);
  if (showBalineseHolidays && balineseHolidays.length === 0) {
    (async () => {
      const bali = await fetchAllBalineseHolidays();
      setBalineseHolidays(bali);
    })();
  }
}, [showNationalHolidays, showBalineseHolidays]);


  /* ========== Auth ========== */
  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

  /* ========== CRUD Jadwal ========== */
  async function saveNewLeave() {
    if (selectedLeaveTypes.length === 0)
      return alert("Pilih jenis libur dulu!");

    let employeeName = userName;
    let leaveStatus: "approved" | "pending" = "pending";

    if (canEdit) {
      if (!selectedEmployeeForAdd) return alert("Pilih pegawai dulu!");
      employeeName = selectedEmployeeForAdd;
      leaveStatus = "approved";
    }

    const newEvent: CalendarEvent = {
      title: `${employeeName} - ${selectedLeaveTypes.join(", ")}`,
      employee: employeeName,
      leaveType: selectedLeaveTypes,
      start: selectedDate,
      end: selectedDate,
      status: leaveStatus,
      createdAt: serverTimestamp(),
    };

    await addDoc(eventsCollection, newEvent);
    setShowModal(false);
    setSelectedLeaveTypes([]);
    setSelectedEmployeeForAdd(null);
    alert(
      canEdit
        ? "✅ Jadwal berhasil ditambahkan dan disetujui."
        : "🕒 Pengajuan libur berhasil dikirim. Menunggu persetujuan admin."
    );
  }

  async function approveEvent(id: string) {
    await updateDoc(doc(db, "events", id), { status: "approved" });
  }

  async function rejectEvent(id: string) {
    await updateDoc(doc(db, "events", id), { status: "rejected" });
  }

  async function deleteEvent(id: string) {
    if (confirm("Hapus jadwal ini?")) {
      await deleteDoc(doc(db, "events", id));
      setShowDeleteModal(false);
      setSelectedEventId(null);
    }
  }

  const handleMonthYearChange = () => {
    if (calendarRef.current) {
      const newDate = new Date(selectedYear, selectedMonth, 1);
      calendarRef.current.getApi().gotoDate(newDate);
      fetchHolidays(selectedYear);
      (async () => {
      const bali = await fetchAllBalineseHolidays();
      setBalineseHolidays(bali);
    })();
      setShowMonthPicker(false);
    }
  };

const selectStyles = {
  control: (base: any, state: any) => ({
    ...base,
    borderRadius: 8,
    borderColor: state.isFocused ? "#2563eb" : "#d1d5db",
    backgroundColor: "#ffffff",
    minHeight: 42,
    boxShadow: state.isFocused ? "0 0 0 2px rgba(37,99,235,0.2)" : "none",
    ":hover": {
      borderColor: "#2563eb",
    },
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    zIndex: 50,
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected
      ? "#2563eb"
      : state.isFocused
      ? "#e0e7ff"
      : "#ffffff",
    color: state.isSelected ? "#ffffff" : "#111827",
    cursor: "pointer",
    fontWeight: state.isSelected ? 600 : 500,
    padding: "10px 12px",
  }),
  singleValue: (base: any) => ({
    ...base,
    color: "#111827", // ✅ teks default & selected value kini hitam pekat
    fontWeight: 600,
  }),
  input: (base: any) => ({
    ...base,
    color: "#111827", // ✅ saat mengetik filter pegawai tetap jelas
  }),
  placeholder: (base: any) => ({
    ...base,
    color: "#374151", // ✅ placeholder lebih gelap agar terlihat
    fontWeight: 500,
  }),
  dropdownIndicator: (base: any) => ({
    ...base,
    color: "#2563eb",
    ":hover": { color: "#1e40af" },
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
  menuList: (base: any) => ({
    ...base,
    padding: 4,
  }),
};

function formatDateTime(
  value?: Timestamp | Date | FieldValue | null
): string {
  if (!value) return "–";

  // Jika Timestamp Firestore
  // (cek yang aman: punya toDate + seconds)
  const maybeTs = value as any;
  if (maybeTs && typeof maybeTs.toDate === "function" && typeof maybeTs.seconds === "number") {
    const d: Date = maybeTs.toDate();
    return new Intl.DateTimeFormat("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d);
  }

  // Jika masih FieldValue (serverTimestamp sentinel) atau tipe lain
  return "–";
}
type PendingSort =
  | "name-asc"
  | "name-desc"
  | "date-asc"
  | "date-desc"
  | "created-new"
  | "created-old";

const [pendingSort, setPendingSort] = useState<PendingSort>("created-new");

// aman konversi createdAt ke millis
const toMillis = (v: any) => {
  if (!v) return 0;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (v instanceof Date) return v.getTime();
  return 0;
};

// daftar pending yang sudah diurutkan
const pendingEvents = events.filter((e) => (e.status || "").toLowerCase() === "pending");

const sortedPending = [...pendingEvents].sort((a, b) => {
  const nameA = (a.employee || "").toString();
  const nameB = (b.employee || "").toString();
  const dateA = new Date(a.start).getTime();
  const dateB = new Date(b.start).getTime();
  const createdA = toMillis(a.createdAt);
  const createdB = toMillis(b.createdAt);

  switch (pendingSort) {
    case "name-asc":
      return nameA.localeCompare(nameB, "id", { sensitivity: "base" });
    case "name-desc":
      return nameB.localeCompare(nameA, "id", { sensitivity: "base" });
    case "date-asc":
      return dateA - dateB;
    case "date-desc":
      return dateB - dateA;
    case "created-new":
      return createdB - createdA; // terbaru dulu
    case "created-old":
      return createdA - createdB; // terlama dulu
    default:
      return 0;
  }
});

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "40px 16px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1200 }}>
{/* === HEADER === */}
<div
  style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: 30,
    gap: 20,
  }}
>
  {/* Judul */}
  <h1
    style={{
      color: "#fff",
      fontSize: "1.8rem",
      fontWeight: 700,
      textAlign: "center",
    }}
  >
    📅 Jadwal Hari Libur — Halo, {userName}
  </h1>

  {/* Tombol-tombol dan Checkbox */}
  <div
    style={{
      display: "flex",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      gap: 12,
      background: "rgba(255,255,255,0.15)",
      borderRadius: 12,
      padding: "12px 20px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    }}
  >
    {/* Checkbox Filter Libur */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        color: "#fff",
        fontSize: ".95rem",
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={showNationalHolidays}
          onChange={(e) => setShowNationalHolidays(e.target.checked)}
        />
        <span>Hari Raya Indonesia</span>
      </label>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={showBalineseHolidays}
          onChange={(e) => setShowBalineseHolidays(e.target.checked)}
        />
        <span>Hari Raya Bali</span>
      </label>
    </div>

    {/* Tombol Kelola Pegawai */}
    {canEdit && (
      <button
        onClick={() => navigate("/manage-employees")}
        style={{
          background: "#10b981",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: "10px 16px",
          fontWeight: 600,
          cursor: "pointer",
          transition: "all 0.2s ease",
        }}
      >
        👥 Kelola Pegawai
      </button>
    )}

    {/* Tombol Pilih Bulan & Tahun */}
    <button
      onClick={() => setShowMonthPicker(true)}
      style={{
        background: "#facc15",
        color: "#000",
        border: "none",
        borderRadius: 8,
        padding: "10px 16px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
      }}
    >
      📆 Pilih Bulan & Tahun
    </button>

    {/* Tombol Logout */}
    <button
      onClick={handleLogout}
      style={{
        background: "#dc2626", // 🔴 merah agar lebih jelas
        color: "#fff",
        border: "none",
        borderRadius: 8,
        padding: "10px 18px",
        cursor: "pointer",
        fontWeight: 600,
        transition: "all 0.2s ease",
      }}
    >
      🔒 Logout
    </button>
  </div>
</div>

        {/* === CALENDAR === */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "32px 24px",
            marginBottom: 20,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            dateClick={(info) => {
              setSelectedDate(info.dateStr);
              setShowModal(true);
            }}
            eventClick={(info) => {
              if (!canEdit) return;
              setSelectedEventId(info.event.id);
              setShowDeleteModal(true);
            }}
                      events={[
            ...events.map((e) => {
              const status = (e.status || "pending").toLowerCase();
              const bg =
                status === "approved"
                  ? "#2563eb"
                  : status === "pending"
                  ? "#facc15"
                  : "#9ca3af";
              const txt = status === "pending" ? "#000" : "#fff";
              return { ...e, backgroundColor: bg, textColor: txt };
            }),
            ...(showNationalHolidays ? holidays : []),
            ...(showBalineseHolidays ? balineseHolidays : []),
          ]}
          />
          {/* === LEGEND (pusat) === */}
          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 20px" , fontSize: "2.5rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
                background: "#fff",
                padding: "10px 14px",
                borderRadius: 12,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
            >
              {[
              {color:"#dc2626", label:"Hari Raya Indonesia"},
              {color:"#16a34a", label:"Hari Raya Bali"},
              {color:"#2563eb", label:"Cuti Disetujui"},
              {color:"#facc15",label:"Pengajuan Pending"},
              {color:"#9ca3af", label:"Ditolak"},
            ].map((item) => (
    <div
      key={item.label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: "1.05rem", 
        fontWeight: 600, 
        color: "#111827",
      }}
    >
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: 4,
          background: item.color,
        }}
      />
      {item.label}
    </div>
  ))}
</div>
</div>

        </div>

        {/* === MODAL HAPUS === */}
        {showDeleteModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: 12,
                padding: 24,
                width: "90%",
                maxWidth: 400,
                color: "#111827",
                textAlign: "center",
              }}
            >
              <h3 style={{ color: "#1e3a8a", marginBottom: 16 }}>
                Apakah Anda ingin menghapus jadwal ini?
              </h3>
              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <button
                  onClick={() => selectedEventId && deleteEvent(selectedEventId)}
                  style={{
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Ya
                </button>
                <button
                  onClick={() => setShowDeleteModal(false)}
                  style={{
                    background: "#9ca3af",
                    color: "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 16px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
        </div>
        )}
        
        {/* === TABEL PENGAJUAN PENDING === */}
{canEdit && (
  <div
    style={{
      background: "#fff",
      borderRadius: 16,
      padding: "32px 24px",
      marginBottom: 24,
      boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
      color: "#111827",
    }}
  >
    {/* Header dengan judul dan dropdown */}
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        marginBottom: 20,
        gap: 12,
      }}
    >
      <h2
        style={{
          color: "#1e3a8a",
          fontWeight: 700,
          fontSize: "1.4rem",
        }}
      >
        🕒 Daftar Pengajuan Pending
      </h2>

      {/* Dropdown urutkan */}
      <div style={{ width: "260px", minWidth: "180px" }}>
        <select
          id="pending-sort"
          value={pendingSort}
          onChange={(e) => setPendingSort(e.target.value as PendingSort)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: 14,
            background: "#fff",
            color: pendingSort ? "#111827" : "#6b7280",
            fontWeight: 500,
            cursor: "pointer",
            appearance: "none",
            backgroundImage:
              "linear-gradient(45deg, transparent 50%, #2563eb 50%), linear-gradient(135deg, #2563eb 50%, transparent 50%)",
            backgroundPosition: "calc(100% - 16px) calc(1em + 2px), calc(100% - 12px) calc(1em + 2px)",
            backgroundSize: "4px 4px, 4px 4px",
            backgroundRepeat: "no-repeat",
          }}
        >
          <option value="" disabled hidden>
            Urutkan...
          </option>
          <option value="name-asc">Pegawai A → Z</option>
          <option value="name-desc">Pegawai Z → A</option>
          <option value="date-asc">Tanggal Libur: Awal → Akhir</option>
          <option value="date-desc">Tanggal Libur: Akhir → Awal</option>
          <option value="created-new">Diajukan: Terbaru → Terlama</option>
          <option value="created-old">Diajukan: Terlama → Terbaru</option>
        </select>
      </div>
    </div>

    {/* Tabel Pending */}
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#f9fafb",
          borderRadius: 12,
          overflow: "hidden",
          color: "#111827",
        }}
      >
        <thead>
          <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
            <th style={{ padding: "12px 10px", width: "25%" }}>Pegawai</th>
            <th style={{ padding: "12px 10px", width: "25%" }}>Tanggal Libur</th>
            <th style={{ padding: "12px 10px", width: "30%" }}>Jenis Libur</th>
            <th style={{ padding: "12px 10px", width: "20%" }}>Diajukan Pada</th>
            <th style={{ padding: "12px 10px", minWidth: 180 }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {sortedPending.length ? (
            sortedPending.map((e) => (
              <tr
                key={e.id}
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  backgroundColor: "#fff",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(ev) => (ev.currentTarget.style.background = "#eef2ff")}
                onMouseLeave={(ev) => (ev.currentTarget.style.background = "#fff")}
              >
                <td style={{ padding: "12px 10px", fontWeight: 500 }}>{e.employee}</td>
                <td style={{ padding: "12px 10px" }}>{e.start}</td>
                <td style={{ padding: "12px 10px" }}>
                  {Array.isArray(e.leaveType) ? e.leaveType.join(", ") : e.leaveType}
                </td>
                <td style={{ padding: "12px 10px" }}>{formatDateTime(e.createdAt)}</td>
                <td style={{ padding: "12px 10px" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => approveEvent(e.id!)}
                      style={{
                        background: "#16a34a",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Setujui
                    </button>
                    <button
                      onClick={() => rejectEvent(e.id!)}
                      style={{
                        background: "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 12px",
                        cursor: "pointer",
                        fontWeight: 500,
                      }}
                    >
                      Tolak
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={5}
                style={{
                  textAlign: "center",
                  padding: 12,
                  color: "#6b7280",
                  fontStyle: "italic",
                }}
              >
                Tidak ada pengajuan pending.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
)}

        {/* === REKAP DATA PEGAWAI === */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "32px 24px",
            marginBottom: 24,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ color: "#1e3a8a", fontWeight: 700, fontSize: "1.4rem" }}>
              🔍 Rekap Hari Libur Pegawai
            </h2>
            <div style={{ width: 280, marginTop: 10 }}>
              <Select
                options={[{ value: "all", label: "Tampilkan Semua Pegawai" }, ...employees]}
                defaultValue={{ value: "all", label: "Tampilkan Semua Pegawai" }}
                onChange={(opt) => setSelectedEmployee(opt?.value || "all")}
                styles={selectStyles}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#f9fafb",
                color: "#111827",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6", color: "#1f2937", textAlign: "left" }}>
                  <th style={{ padding: 12, fontWeight: 700 }}>Nama Pegawai</th>
                  <th style={{ padding: 12, fontWeight: 700 }}>Sakit</th>
                  <th style={{ padding: 12, fontWeight: 700 }}>Cuti Tahunan</th>
                  <th style={{ padding: 12, fontWeight: 700 }}>Cuti Penting</th>
                  <th style={{ padding: 12, fontWeight: 700 }}>Cuti Penangguhan</th>
                  <th style={{ padding: 12, fontWeight: 700 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const grouped: Record<string, Record<string, number>> = {};
                  events
                    .filter((e) => (e.status || "").toLowerCase() === "approved")
                    .forEach((e) => {
                      const emp = e.employee || "(Tidak diketahui)";
                      if (!grouped[emp])
                        grouped[emp] = {
                          Sakit: 0,
                          "Cuti Tahunan": 0,
                          "Cuti Penting": 0,
                          "Cuti Penangguhan": 0,
                        };
                      const types = Array.isArray(e.leaveType)
                        ? e.leaveType
                        : typeof e.leaveType === "string"
                        ? [e.leaveType]
                        : [];
                      types.forEach((t) => {
                        if (grouped[emp][t] !== undefined) grouped[emp][t]++;
                      });
                    });

                  const keys =
                    selectedEmployee && selectedEmployee !== "all"
                      ? Object.keys(grouped).filter((k) => k === selectedEmployee)
                      : Object.keys(grouped);

                  return keys.length ? (
                    keys.map((emp) => {
                      const rec = grouped[emp];
                      const total =
                        rec["Sakit"] +
                        rec["Cuti Tahunan"] +
                        rec["Cuti Penting"] +
                        rec["Cuti Penangguhan"];
                      return (
                        <tr
                          key={emp}
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            transition: "background 0.2s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#e0e7ff")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: 12, fontWeight: 600 }}>{emp}</td>
                          <td style={{ padding: 12 }}>{rec["Sakit"]}</td>
                          <td style={{ padding: 12 }}>{rec["Cuti Tahunan"]}</td>
                          <td style={{ padding: 12 }}>{rec["Cuti Penting"]}</td>
                          <td style={{ padding: 12 }}>{rec["Cuti Penangguhan"]}</td>
                          <td
                            style={{
                              padding: 12,
                              fontWeight: 700,
                              color: "#1e3a8a",
                            }}
                          >
                            {total}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ padding: 14, textAlign: "center", color: "#6b7280" }}>
                        Tidak ada data pegawai ditemukan.
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* === MODAL PICKER BULAN & TAHUN === */}
        {showMonthPicker && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 2000,
            }}
            onClick={() => setShowMonthPicker(false)}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 16,
                padding: "24px 28px",
                width: "90%",
                maxWidth: 400,
                color: "#111827",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                textAlign: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  color: "#2563eb",
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  marginBottom: 16,
                }}
              >
                Pilih Bulan & Tahun
              </h3>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: "1rem",
                  }}
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>
                      {new Date(0, i).toLocaleString("id-ID", { month: "long" })}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: "1rem",
                  }}
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(
                    (y) => (
                      <option key={y}>{y}</option>
                    )
                  )}
                </select>
              </div>

              <button
                onClick={handleMonthYearChange}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                Tampilkan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* === MODAL TAMBAH LIBUR === */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 24,
              width: "90%",
              maxWidth: 420,
              color: "#111827",
            }}
          >
            <h3 style={{ textAlign: "center", color: "#1e3a8a", marginBottom: 12 }}>
              {canEdit ? "Tambah Hari Libur Pegawai" : "Ajukan Hari Libur"}
            </h3>

            {canEdit ? (
              <>
                <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Pilih Pegawai:
                </label>
                <Select
                  options={employees}
                  onChange={(opt) => setSelectedEmployeeForAdd(opt?.value || null)}
                  placeholder="Pilih pegawai..."
                  styles={selectStyles}
                />
              </>
            ) : (
              <div
                style={{
                  marginBottom: 8,
                  fontSize: ".95rem",
                  color: "#374151",
                }}
              >
                Pegawai: <strong>{userName}</strong>
              </div>
            )}

            <label style={{ fontWeight: 600, display: "block", marginTop: 10, marginBottom: 6 }}>
              Jenis Libur:
            </label>
            <Select
              isMulti
              options={[
                { value: "Sakit", label: "Sakit" },
                { value: "Cuti Tahunan", label: "Cuti Tahunan" },
                { value: "Cuti Penting", label: "Cuti Penting" },
                { value: "Cuti Penangguhan", label: "Cuti Penangguhan" },
              ]}
              onChange={(opts) => setSelectedLeaveTypes(opts ? opts.map((o) => o.value) : [])}
              placeholder="Pilih jenis libur..."
              styles={selectStyles}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: 20,
                gap: 8,
              }}
            >
              <button
                onClick={saveNewLeave}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                Simpan
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedLeaveTypes([]);
                  setSelectedEmployeeForAdd(null);
                }}
                style={{
                  background: "#9ca3af",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

{/* === MODAL HAPUS JADWAL === */}
{showDeleteModal && (
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(0,0,0,0.5)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1100,
    }}
  >
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 24,
        width: "90%",
        maxWidth: 400,
        color: "#111827",
        textAlign: "center",
      }}
    >
      <h3 style={{ color: "#1e3a8a", marginBottom: 16 }}>
        Apakah Anda yakin ingin menghapus jadwal ini?
      </h3>
      <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
        <button
          onClick={async () => {
            if (selectedEventId) {
              await deleteDoc(doc(db, "events", selectedEventId));
            }
            setShowDeleteModal(false);
            setSelectedEventId(null);
          }}
          style={{
            background: "#dc2626",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Ya, Hapus
        </button>
        <button
          onClick={() => setShowDeleteModal(false)}
          style={{
            background: "#9ca3af",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Batal
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}
