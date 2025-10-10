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
}

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [total, setTotal] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForAdd, setSelectedEmployeeForAdd] = useState<string | null>(null);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const role = localStorage.getItem("role");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  const leaveTypes = ["Sakit", "Cuti Tahunan", "Cuti Penting", "Cuti Penangguhan"];

  // 🔄 Realtime events
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

  // 📊 Rekap data
  useEffect(() => {
    if (!selectedEmployee) {
      setSummary({});
      setTotal(0);
      return;
    }
    const filtered = events.filter((e) => e.employee === selectedEmployee);
    const counts: Record<string, number> = {};
    filtered.forEach((e) => {
      const types = Array.isArray(e.leaveType)
        ? e.leaveType
        : typeof e.leaveType === "string"
        ? [e.leaveType]
        : [];
      types.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
    });
    setSummary(counts);
    setTotal(Object.values(counts).reduce((a, b) => a + b, 0));
  }, [selectedEmployee, events]);

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
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          maxWidth: 900,
          marginBottom: 30,
          flexWrap: "wrap",
        }}
      >
        <h1 style={{ color: "#fff", margin: 0, fontSize: "1.8rem", fontWeight: 700 }}>
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

      {/* Calendar */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          width: "100%",
          maxWidth: 1000,
          padding: "28px 20px",
          marginBottom: 40,
          position: "relative",
        }}
      >
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView={window.innerWidth < 600 ? "dayGridWeek" : "dayGridMonth"}
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: window.innerWidth < 600 ? "" : "dayGridMonth,dayGridWeek",
          }}
          events={events}
          eventContent={(arg) => (
            <div
              style={{
                position: "relative",
                background: "#eff6ff",
                borderRadius: 8,
                padding: "4px 8px",
                overflow: "hidden",
                textAlign: "left",
                wordBreak: "break-word",
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, color: "#1e3a8a" }}>
                {arg.event.title}
              </span>
              {canEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteEventById(arg.event.id);
                  }}
                  style={{
                    position: "absolute",
                    top: 2,
                    right: 4,
                    background: "transparent",
                    border: "none",
                    color: "#ef4444",
                    fontSize: 16,
                    cursor: "pointer",
                  }}
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
        />
      </div>

      {/* Rekap Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          width: "100%",
          maxWidth: 600,
          padding: "28px 24px",
          textAlign: "center",
          marginBottom: 50,
        }}
      >
        <h2 style={{ color: "#1e3a8a", marginBottom: 20 }}>🔍 Rekap Hari Libur Pegawai</h2>

        <Select
          options={employees}
          onChange={(opt) => setSelectedEmployee(opt ? opt.value : null)}
          placeholder="Pilih nama pegawai..."
          isSearchable
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: "#1e293b",
              borderColor: "#0ea5e9",
              borderRadius: 8,
              boxShadow: "none",
            }),
            singleValue: (base) => ({ ...base, color: "#f9fafb", fontWeight: 600 }),
            menu: (base) => ({
              ...base,
              backgroundColor: "#0f172a",
              color: "#f9fafb",
              borderRadius: 8,
            }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused ? "#2563eb" : "#1e293b",
              color: "#f9fafb",
              cursor: "pointer",
            }),
          }}
        />

        {selectedEmployee && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ color: "#1e3a8a" }}>📋 Data untuk {selectedEmployee}</h4>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                marginTop: 10,
                background: "#f9fafb",
              }}
            >
              <thead>
                <tr style={{ background: "#e5e7eb" }}>
                  <th style={{ padding: 8 }}>Jenis Libur</th>
                  <th style={{ padding: 8 }}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary).map(([type, count]) => (
                  <tr key={type}>
                    <td style={{ padding: 8 }}>{type}</td>
                    <td style={{ padding: 8 }}>{count}</td>
                  </tr>
                ))}
                <tr style={{ background: "#dbeafe", fontWeight: "bold" }}>
                  <td>Total Hari Libur</td>
                  <td>{total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Jadwal */}
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
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              width: "90%",
              maxWidth: 420,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ color: "#1e3a8a", textAlign: "center", marginBottom: 16 }}>
              Tambah Hari Libur
            </h3>

            <label style={{ fontWeight: 600 }}>Pilih Pegawai</label>
            <Select
              options={employees}
              onChange={(opt) => setSelectedEmployeeForAdd(opt ? opt.value : null)}
              placeholder="Cari nama pegawai..."
              isSearchable
            />

            <label style={{ fontWeight: 600, marginTop: 12 }}>Jenis Libur</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {leaveTypes.map((t) => (
                <label key={t}>
                  <input
                    type="checkbox"
                    checked={selectedLeaveTypes.includes(t)}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedLeaveTypes([...selectedLeaveTypes, t]);
                      else
                        setSelectedLeaveTypes(selectedLeaveTypes.filter((x) => x !== t));
                    }}
                  />{" "}
                  {t}
                </label>
              ))}
            </div>

            <div style={{ marginTop: 20, display: "flex", justifyContent: "center", gap: 8 }}>
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
