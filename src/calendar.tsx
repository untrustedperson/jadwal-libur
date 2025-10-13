import { useState, useEffect, useRef } from "react";
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
  // 🔹 State utama
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForAdd, setSelectedEmployeeForAdd] = useState<string | null>(null);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  //@ts-ignore
  const [showHolidays, setShowHolidays] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // 🔹 Month picker
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const calendarRef = useRef<any>(null);

  // 🔹 Navigasi dan data Firestore
  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const role = localStorage.getItem("role");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  // 🔄 Realtime event
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

  // 👥 Load pegawai
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

  // 🇮🇩 Fetch libur nasional (Nager.Date)
  async function fetchHolidays(year: number) {
    try {
      const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/ID`;
      console.log("🌐 Fetching Nager.Date holidays:", url);
      const resp = await fetch(url);
      if (!resp.ok) return console.error("❌ Error:", resp.status);
      const data = await resp.json();
      const formatted = data.map((d: any) => ({
        id: d.date,
        title: `🇮🇩 ${d.localName}`,
        start: d.date,
        end: d.date,
        backgroundColor: "#dc2626",
        textColor: "#fff",
      }));
      setHolidays(formatted);
    } catch (e) {
      console.error("⚠️ fetchHolidays error:", e);
    }
  }

  useEffect(() => {
    fetchHolidays(new Date().getFullYear());
  }, []);

  // 🚪 Logout
  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

  // ➕ Tambah jadwal libur
  async function saveNewLeave() {
    if (!selectedEmployeeForAdd || selectedLeaveTypes.length === 0)
      return alert("Lengkapi semua data!");
    await addDoc(eventsCollection, {
      title: `${selectedEmployeeForAdd} - ${selectedLeaveTypes.join(", ")}`,
      employee: selectedEmployeeForAdd,
      leaveType: selectedLeaveTypes,
      start: selectedDate,
      end: selectedDate,
    });
    setShowModal(false);
    setSelectedEmployeeForAdd(null);
    setSelectedLeaveTypes([]);
  }

  // 🗓️ Pindah bulan & tahun
  const handleMonthYearChange = () => {
    if (calendarRef.current) {
      const newDate = new Date(selectedYear, selectedMonth, 1);
      calendarRef.current.getApi().gotoDate(newDate);
      fetchHolidays(selectedYear);
      setShowMonthPicker(false);
    }
  };

  // 🖱️ Klik judul bulan/tahun
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const el = document.querySelector(".fc-toolbar-title");
      if (el) {
        el.addEventListener("click", () => setShowMonthPicker(true));
        el.addEventListener("touchstart", () => setShowMonthPicker(true));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  // ===============================
  // 🔷 RETURN (UI)
  // ===============================
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
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            marginBottom: 30,
          }}
        >
          <h1 style={{ color: "#fff", fontSize: "1.8rem" }}>
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
            padding: "32px 24px",
            marginBottom: 50,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView={window.innerWidth < 600 ? "dayGridWeek" : "dayGridMonth"}
            headerToolbar={{
              left: "prev,next",
              center: "title",
              right: window.innerWidth < 600 ? "" : "dayGridMonth,dayGridWeek",
            }}
            events={[
              ...events.map((e) => ({
                ...e,
                backgroundColor: "#2563eb",
                textColor: "#fff",
              })),
              ...(showHolidays ? holidays : []),
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
          />
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

      {/* 🔹 Picker Bulan & Tahun */}
      {showMonthPicker && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 2000,
          }}
          onClick={() => setShowMonthPicker(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 20,
              color: "#111827",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ color: "#1e3a8a" }}>Pilih Bulan & Tahun</h3>
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
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
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleMonthYearChange}
              style={{
                marginTop: 15,
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "8px 16px",
              }}
            >
              Tampilkan
            </button>
          </div>
        </div>
      )}

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
            <h3 style={{ textAlign: "center", color: "#1e3a8a" }}>Tambah Hari Libur</h3>
            <label style={{ fontWeight: 600 }}>Pilih Pegawai:</label>
            <Select
              options={employees}
              onChange={(opt) => setSelectedEmployeeForAdd(opt ? opt.value : null)}
              placeholder="Pilih nama pegawai..."
              isSearchable
            />
            <label style={{ marginTop: 12, display: "block", fontWeight: 600 }}>Jenis Libur:</label>
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

      {/* 🗑️ Modal Hapus Jadwal */}
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
