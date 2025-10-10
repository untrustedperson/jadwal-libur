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

  // 🔄 Realtime listener
  useEffect(() => {
    const unsub = onSnapshot(eventsCollection, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
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
      const list = snap.docs.map((d) => ({
        value: d.data().name,
        label: d.data().name,
      }));
      setEmployees(list);
    };
    loadEmployees();
  }, []);

  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

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

  async function deleteEventById(eventId: string) {
    if (!canEdit) return;
    if (!window.confirm("Hapus event ini?")) return;
    await deleteDoc(doc(db, "events", eventId));
  }

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
        width: "100%",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "40px 0",
        overflowX: "hidden",
      }}
    >
      <div
        style={{
          width: "95%",
          maxWidth: "1200px",
          background: "#fff",
          borderRadius: 20,
          padding: "40px 50px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          boxSizing: "border-box",
        }}
      >
        {/* HEADER */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            marginBottom: 25,
          }}
        >
          <h2 style={{ color: "#1e3a8a", margin: 0 }}>
            📅 Jadwal Hari Libur — Halo, {userName}
          </h2>
          <div style={{ display: "flex", gap: 10 }}>
            {(role === "admin" || role === "dev") && (
              <button
                onClick={() => navigate("/manage-employees")}
                style={{
                  background: "#10b981",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: "none",
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
                padding: "10px 14px",
                borderRadius: 8,
                border: "none",
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
            background: "#f8fafc",
            borderRadius: 12,
            padding: 20,
            marginBottom: 30,
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
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 14,
                }}
              >
                <span>{arg.event.title}</span>
                {canEdit && (
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

        {/* REKAP PEGAWAI */}
        <div
          style={{
            background: "#e2e8f0",
            borderRadius: 12,
            padding: 24,
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h3
            style={{
              textAlign: "center",
              color: "#1e3a8a",
              marginBottom: 12,
            }}
          >
            🔍 Rekap Hari Libur Pegawai
          </h3>
          <Select
            options={employees}
            onChange={(opt) => setSelectedEmployee(opt ? opt.value : null)}
            placeholder="Pilih nama pegawai..."
            isSearchable
          />
          {selectedEmployee && (
            <div style={{ marginTop: 20 }}>
              <h4
                style={{
                  textAlign: "center",
                  color: "#1e3a8a",
                  marginBottom: 12,
                }}
              >
                📋 Data untuk {selectedEmployee}
              </h4>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#f8fafc",
                  textAlign: "center",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <thead>
                  <tr style={{ background: "#cbd5e1" }}>
                    <th style={{ padding: 10 }}>Jenis Libur</th>
                    <th style={{ padding: 10 }}>Jumlah</th>
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
      </div>

      {/* MODAL INPUT */}
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
            }}
          >
            <h3 style={{ textAlign: "center", color: "#1e3a8a" }}>
              Tambah Hari Libur
            </h3>
            <label>Pilih Pegawai:</label>
            <Select
              options={employees}
              onChange={(opt) =>
                setSelectedEmployeeForAdd(opt ? opt.value : null)
              }
              placeholder="Cari pegawai..."
              isSearchable
            />
            <label style={{ marginTop: 12, display: "block" }}>Jenis Libur:</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {leaveTypes.map((t) => (
                <label key={t} style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="checkbox"
                    checked={selectedLeaveTypes.includes(t)}
                    onChange={(e) =>
                      e.target.checked
                        ? setSelectedLeaveTypes([...selectedLeaveTypes, t])
                        : setSelectedLeaveTypes(selectedLeaveTypes.filter((x) => x !== t))
                    }
                  />
                  <span style={{ marginLeft: 6 }}>{t}</span>
                </label>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 20 }}>
              <button
                onClick={saveNewLeave}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
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
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
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
