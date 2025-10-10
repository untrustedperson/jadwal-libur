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

  // 🔄 Realtime event listener
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

  // 🔁 Ambil daftar pegawai
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

  // 🔒 Logout
  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

  // ➕ Tambah hari libur
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

  // 🗑️ Hapus event
  async function deleteEventById(eventId: string) {
    if (!canEdit) return;
    if (!window.confirm("Hapus event ini?")) return;
    await deleteDoc(doc(db, "events", eventId));
  }

  // 🔍 Rekap hari libur pegawai
  useEffect(() => {
    if (!selectedEmployee) {
      setSummary({});
      setTotal(0);
      return;
    }

    const filtered = events.filter((e) => e.employee === selectedEmployee);
    const counts: Record<string, number> = {};

    filtered.forEach((e) => {
      let types: string[] = [];
      if (Array.isArray(e.leaveType)) types = e.leaveType;
      else if (typeof e.leaveType === "string") types = [e.leaveType];
      else if (typeof (e as any).type === "string") types = [(e as any).type];
      types.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
    });

    setSummary(counts);
    setTotal(Object.values(counts).reduce((a, b) => a + b, 0));
  }, [selectedEmployee, events]);

  // Render event kalender
  function renderEventContent(arg: any) {
    const onDelete = async (e: any) => {
      e.stopPropagation();
      if (!canEdit) return;
      if (!window.confirm(`Hapus "${arg.event.title}"?`)) return;
      await deleteEventById(arg.event.id);
    };
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
        }}
      >
        <span>{arg.event.title}</span>
        {canEdit && (
          <button
            onClick={onDelete}
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
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        overflowX: "hidden",
        padding: "40px 16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 6px 30px rgba(0,0,0,0.15)",
          padding: "24px 32px",
          width: "100%",
          maxWidth: 1100,
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ color: "#1e3a8a", margin: 0 }}>
            📅 Jadwal Hari Libur — Halo, {userName}
          </h2>

          <div style={{ display: "flex", gap: 8 }}>
            {(role === "admin" || role === "dev") && (
              <button
                onClick={() => navigate("/manage-employees")}
                style={{
                  background: "#10b981",
                  color: "#fff",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontWeight: 600,
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
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Kalender */}
        <div
          style={{
            background: "#f9fafb",
            borderRadius: 12,
            padding: 12,
            marginBottom: 24,
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
            eventContent={renderEventContent}
            dateClick={(info) => {
              if (canEdit) {
                setSelectedDate(info.dateStr);
                setShowModal(true);
              }
            }}
          />
        </div>

        {/* Rekap Hari Libur */}
        <div
          style={{
            background: "#f9fafb",
            borderRadius: 12,
            padding: 16,
            textAlign: "center",
          }}
        >
          <h3 style={{ color: "#1e3a8a", marginBottom: 10 }}>
            🔍 Rekap Hari Libur Pegawai
          </h3>
          <Select
            options={employees}
            onChange={(opt) => setSelectedEmployee(opt ? opt.value : null)}
            placeholder="Pilih nama pegawai..."
            isSearchable
          />
          {selectedEmployee && (
            <div style={{ marginTop: 16 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "center",
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
                  <tr style={{ background: "#f3f4f6", fontWeight: "bold" }}>
                    <td>Total Hari Libur</td>
                    <td>{total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal Input Hari Libur */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              width: "90%",
              maxWidth: 400,
            }}
          >
            <h3 style={{ textAlign: "center", color: "#1e3a8a" }}>
              Tambah Hari Libur
            </h3>
            <Select
              options={employees}
              onChange={(opt) => setSelectedEmployeeForAdd(opt ? opt.value : null)}
              placeholder="Pilih pegawai..."
              isSearchable
            />
            <div style={{ marginTop: 12 }}>
              <label>Jenis Libur:</label>
              {leaveTypes.map((t) => (
                <label
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 6,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedLeaveTypes.includes(t)}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedLeaveTypes([...selectedLeaveTypes, t]);
                      else
                        setSelectedLeaveTypes(
                          selectedLeaveTypes.filter((x) => x !== t)
                        );
                    }}
                  />
                  {t}
                </label>
              ))}
            </div>
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
    </div>
  );
}
