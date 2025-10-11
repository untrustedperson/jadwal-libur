import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import Select from "react-select";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

interface CalendarEvent {
  id?: string;
  title: string;
  employee?: string;
  leaveType?: string[] | string;
  start: string;
  end?: string;
  backgroundColor?: string;
  textColor?: string;
}

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [_holidays, setHolidays] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForAdd, setSelectedEmployeeForAdd] = useState<string | null>(null);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [showHolidays, setShowHolidays] = useState(true);

  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const role = localStorage.getItem("role");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  // 🔄 Firestore realtime events
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

  // 👥 Load data pegawai
  useEffect(() => {
    const loadEmployees = async () => {
      const snap = await getDocs(employeesCollection);
      setEmployees(
        snap.docs.map((d) => ({
          value: d.data().name,
          label: d.data().name,
        }))
      );
    };
    loadEmployees();
  }, []);

  useEffect(() => {
  async function fetchHolidays() {
    try {
      const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      console.log("🔍 GOOGLE API KEY:", apiKey);

      if (!apiKey) {
        console.warn("❌ GOOGLE_API_KEY tidak ditemukan di .env");
        return;
      }

      const calendarId = "en.indonesian#holiday@group.v.calendar.google.com";
      const currentYear = new Date().getFullYear();
      const timeMin = `${currentYear}-01-01T00:00:00Z`;
      const timeMax = `${currentYear}-12-31T23:59:59Z`;

      const url = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?key=${apiKey}&timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`;

      console.log("🌐 Fetching holidays from:", url);

      const resp = await fetch(url);
      if (!resp.ok) {
        const errText = await resp.text();
        console.error("❌ Google Calendar API error:", resp.status, errText);
        return;
      }

      const data = await resp.json();
      if (!data.items || data.items.length === 0) {
        console.warn("⚠️ Tidak ada data libur nasional yang diterima:", data);
        return;
      }

      const formatted = data.items.map((item: any) => ({
        id: item.id,
        title: `🇮🇩 ${item.summary}`,
        start: item.start?.date || item.start?.dateTime,
        end: item.end?.date || item.start?.date,
        backgroundColor: "#dc2626", // merah
        textColor: "#ffffff",
      }));

      console.log("✅ Fetched holidays:", formatted);
      setHolidays(formatted);
    } catch (err) {
      console.error("⚠️ fetchHolidays error:", err);
    }
  }

  fetchHolidays();
}, []);


  // 🚪 Logout
  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

  // ➕ Tambah jadwal libur pegawai
  async function saveNewLeave() {
    if (!selectedEmployeeForAdd || selectedLeaveTypes.length === 0)
      return alert("Lengkapi semua data!");
    try {
      await addDoc(eventsCollection, {
        title: `${selectedEmployeeForAdd} - ${selectedLeaveTypes.join(", ")}`,
        employee: selectedEmployeeForAdd,
        leaveType: selectedLeaveTypes,
        start: selectedDate,
        end: selectedDate,
      });
      setShowModal(false);
      setSelectedLeaveTypes([]);
      setSelectedEmployeeForAdd(null);
    } catch (err) {
      console.error("Gagal menambah event:", err);
    }
  }

  // 🔀 Gabungkan data event pegawai dan libur nasional
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
 
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
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 1200,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            maxWidth: 1000,
            marginBottom: 30,
            flexWrap: "wrap",
          }}
        >
          <h1
            style={{
              color: "#fff",
              fontSize: "1.8rem",
              fontWeight: 700,
              margin: 0,
            }}
          >
            📅 Jadwal Hari Libur — Halo, {userName}
          </h1>

          <div style={{ display: "flex", gap: 10 }}>
            {(role === "admin" || role === "dev") && (
              <button
                onClick={() => navigate("/manage-employees")}
                style={{
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 18px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                👥 Kelola Pegawai
              </button>
            )}
            <button
              onClick={handleLogout}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* CALENDAR */}
        <div
          style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          width: "100%",
          maxWidth: 1200, // ⬅️ Tambahkan lebar lebih besar
          padding: "32px 24px",
          marginBottom: 50,
          overflow: "hidden",
          boxSizing: "border-box",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              marginBottom: 10,
            }}
          >
            <label
              style={{
                color: "#1e3a8a",
                fontWeight: 600,
                marginRight: 10,
              }}
            >
              Tampilkan Libur Nasional
            </label>
            <input
              type="checkbox"
              checked={showHolidays}
              onChange={(e) => setShowHolidays(e.target.checked)}
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
          </div>

<FullCalendar
  plugins={[dayGridPlugin, interactionPlugin]}
  initialView={window.innerWidth < 600 ? "dayGridWeek" : "dayGridMonth"}
  headerToolbar={{
    left: "prev,next",
    center: "title",
    right: window.innerWidth < 600 ? "" : "dayGridMonth,dayGridWeek",
  }}
  events={[
    ...events,
    ...(showHolidays ? _holidays : []),
  ]}
  eventClick={(info) => {
    if (!canEdit) return;
    if (info.event.title.startsWith("🇮🇩")) return;
    setSelectedEventId(info.event.id);
    setShowDeleteModal(true);
  }}
  dateClick={(info) => {
    if (canEdit) {
      setSelectedDate(info.dateStr);
      setShowModal(true);
    }
  }}
  contentHeight="auto"
  height="auto"
  themeSystem="standard"
/>
{/* 🔹 Legenda Warna */}
<div
  style={{
    display: "flex",
    justifyContent: "center",
    gap: 20,
    marginTop: 16,
    flexWrap: "wrap",
  }}
>
  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <div
      style={{
        width: 16,
        height: 16,
        background: "#2563eb", // biru
        borderRadius: 4,
      }}
    ></div>
    <span style={{ color: "#1e3a8a", fontWeight: 600 }}>Jadwal Pegawai</span>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
    <div
      style={{
        width: 16,
        height: 16,
        background: "#dc2626", // merah
        borderRadius: 4,
      }}
    ></div>
    <span style={{ color: "#991b1b", fontWeight: 600 }}>Libur Nasional</span>
  </div>
</div>

        </div>

        {/* REKAP DATA PEGAWAI */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            width: "100%",
            maxWidth: 900,
            padding: "28px 24px",
            color: "#111827",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ color: "#1e3a8a" }}>🔍 Rekap Hari Libur Pegawai</h2>
            <div style={{ width: 250 }}>
              <Select
                options={[{ value: "all", label: "Tampilkan Semua Pegawai" }, ...employees]}
                defaultValue={{ value: "all", label: "Tampilkan Semua Pegawai" }}
                onChange={(opt) => setSelectedEmployee(opt?.value || "all")}
              />
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#f9fafb",
              color: "#111827",
            }}
          >
            <thead>
              <tr style={{ background: "#e5e7eb", color: "#111827" }}>
                <th style={{ padding: 8 }}>Nama Pegawai</th>
                <th style={{ padding: 8 }}>Sakit</th>
                <th style={{ padding: 8 }}>Cuti Tahunan</th>
                <th style={{ padding: 8 }}>Cuti Penting</th>
                <th style={{ padding: 8 }}>Cuti Penangguhan</th>
                <th style={{ padding: 8 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const grouped: Record<string, Record<string, number>> = {};
                events.forEach((e) => {
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
                      <tr key={emp} style={{ borderBottom: "1px solid #d1d5db" }}>
                        <td style={{ padding: 8, fontWeight: 600 }}>{emp}</td>
                        <td style={{ padding: 8 }}>{rec["Sakit"]}</td>
                        <td style={{ padding: 8 }}>{rec["Cuti Tahunan"]}</td>
                        <td style={{ padding: 8 }}>{rec["Cuti Penting"]}</td>
                        <td style={{ padding: 8 }}>{rec["Cuti Penangguhan"]}</td>
                        <td
                          style={{
                            padding: 8,
                            fontWeight: "bold",
                            background: "#e0e7ff",
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
                    <td colSpan={6} style={{ padding: 10, color: "#6b7280" }}>
                      Tidak ada data pegawai ditemukan.
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL TAMBAH LIBUR */}
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
              maxWidth: 400,
              color: "#111827",
            }}
          >
            <h3 style={{ textAlign: "center", color: "#1e3a8a" }}>
              Tambah Hari Libur
            </h3>

            <label style={{ fontWeight: 600 }}>Pilih Pegawai:</label>
            <Select
              options={employees}
              onChange={(opt) => setSelectedEmployeeForAdd(opt ? opt.value : null)}
              placeholder="Pilih nama pegawai..."
              isSearchable
            />

            <label
              style={{ marginTop: 12, display: "block", fontWeight: 600 }}
            >
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
              onChange={(opts) =>
                setSelectedLeaveTypes(opts ? opts.map((o) => o.value) : [])
              }
              placeholder="Pilih jenis libur..."
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
                onClick={() => setShowModal(false)}
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
      {/* 🗑️ Modal Konfirmasi Hapus Jadwal */}
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
        Apakah Anda ingin menghapus jadwal ini?
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
    </div>    
  );
}
