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
  employee: string;
  leaveType: string[] | string;
  start: string;
  end?: string;
  backgroundColor?: string;
  textColor?: string;
}

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<CalendarEvent[]>([]);
  const [showHolidays, setShowHolidays] = useState(true);
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForAdd, setSelectedEmployeeForAdd] = useState<string | null>(null);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const role = localStorage.getItem("role");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  // 🔄 Realtime events Firestore
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

  // 🔁 Load employees
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

  // 🇮🇩 Ambil Hari Libur Nasional (cache 30 hari)
  useEffect(() => {
    async function fetchHolidays() {
      const cacheKey = "cachedHolidays";
      const cached = localStorage.getItem(cacheKey);

      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const diff = Date.now() - timestamp;
        const days = diff / (1000 * 60 * 60 * 24);
        if (days < 30 && Array.isArray(data)) {
          setHolidays(data);
          return;
        }
      }

      try {
        const res = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/id.indonesian%23holiday%40group.v.calendar.google.com/events?key=${
            import.meta.env.VITE_GOOGLE_API_KEY
          }`
        );
        const data = await res.json();
        if (!data.items) return;
        const fetched = data.items.map((item: any) => ({
          id: item.id,
          title: `🇮🇩 ${item.summary}`,
          start: item.start.date || item.start.dateTime,
          end: item.end?.date || item.start.date,
          backgroundColor: "#dc2626",
          textColor: "#fff",
        }));
        setHolidays(fetched);
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ data: fetched, timestamp: Date.now() })
        );
      } catch (err) {
        console.error("Gagal memuat hari libur nasional:", err);
      }
    }
    fetchHolidays();
  }, []);

  // 🔒 Logout
  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

  // ➕ Tambah jadwal libur
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

  // ❌ Hapus event
  async function deleteEventById(eventId: string) {
    if (!canEdit) return;
    if (!window.confirm("Hapus event ini?")) return;
    await deleteDoc(doc(db, "events", eventId));
  }

  // 🔀 Gabungkan event pegawai + libur nasional
  const displayedEvents = showHolidays ? [...events, ...holidays] : events;

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "40px 16px",
        overflowX: "hidden",
        overflowY: "auto",
        boxSizing: "border-box",
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
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            maxWidth: 1000,
            marginBottom: 30,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <h1
            style={{
              color: "#fff",
              margin: 0,
              fontSize: "1.8rem",
              fontWeight: 700,
              textAlign: "left",
              flex: 1,
            }}
          >
            📅 Jadwal Hari Libur — Halo, {userName}
          </h1>

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              flexWrap: "wrap",
            }}
          >
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

        {/* Calendar Section */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            width: "100%",
            maxWidth: 1000,
            padding: "28px 20px",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              marginBottom: 12,
            }}
          >
            <label style={{ color: "#1e3a8a", fontWeight: 600, marginRight: 8 }}>
              Tampilkan Libur Nasional
            </label>
            <input
              type="checkbox"
              checked={showHolidays}
              onChange={(e) => setShowHolidays(e.target.checked)}
              style={{ width: 20, height: 20, cursor: "pointer" }}
            />
          </div>

          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: "dayGridMonth,dayGridWeek",
            }}
            events={displayedEvents}
            eventContent={(arg) => (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                  color: arg.event.textColor || "#111827",
                }}
              >
                <span>{arg.event.title}</span>
                {canEdit && !arg.event.title.startsWith("🇮🇩") && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteEventById(arg.event.id);
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: 16,
                      cursor: "pointer",
                      color: "#1e3a8a",
                    }}
                    title="Hapus Jadwal"
                  >
                    🗑️
                  </button>
                )}
              </div>
            )}
            dateClick={(info) => {
              if (canEdit) {
                setSelectedDate(info.dateStr);
                setShowModal(true);
              }
            }}
            height="auto"
          />
        </div>

        {/* 🔍 Rekap Hari Libur */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            width: "100%",
            maxWidth: 900,
            padding: "28px 24px",
            textAlign: "center",
            marginBottom: 50,
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
            <h2 style={{ color: "#1e3a8a", margin: 0 }}>🔍 Rekap Hari Libur Pegawai</h2>
            <div style={{ width: 250 }}>
              <Select
                options={[{ value: "all", label: "Tampilkan Semua Pegawai" }, ...employees]}
                defaultValue={{ value: "all", label: "Tampilkan Semua Pegawai" }}
                onChange={(opt) => setSelectedEmployee(opt?.value || "all")}
                placeholder="Pilih pegawai..."
                isSearchable
              />
            </div>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              background: "#f9fafb",
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
                      rec["Sakit"] + rec["Cuti Tahunan"] + rec["Cuti Penting"] + rec["Cuti Penangguhan"];
                    return (
                      <tr key={emp}>
                        <td style={{ padding: 8, fontWeight: 600 }}>{emp}</td>
                        <td style={{ padding: 8 }}>{rec["Sakit"]}</td>
                        <td style={{ padding: 8 }}>{rec["Cuti Tahunan"]}</td>
                        <td style={{ padding: 8 }}>{rec["Cuti Penting"]}</td>
                        <td style={{ padding: 8 }}>{rec["Cuti Penangguhan"]}</td>
                        <td style={{ padding: 8, fontWeight: "bold", background: "#e0e7ff" }}>{total}</td>
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

      {/* 🧾 Modal Tambah Hari Libur */}
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
            <h3 style={{ textAlign: "center", color: "#1e3a8a" }}>Tambah Hari Libur</h3>

            <label style={{ fontWeight: 600 }}>Pilih Pegawai:</label>
            <Select
              options={employees}
              onChange={(opt) => setSelectedEmployeeForAdd(opt ? opt.value : null)}
              placeholder="Pilih nama pegawai..."
              isSearchable
            />

            <label style={{ fontWeight: 600, marginTop: 12 }}>Jenis Libur:</label>
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

            <div style={{ display: "flex", justifyContent: "center", marginTop: 20, gap: 10 }}>
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
    </div>
  );
}
