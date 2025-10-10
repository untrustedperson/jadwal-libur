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
  leaveType: string[];
  start: string;
  end?: string;
}

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<{ value: string; label: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [total, setTotal] = useState<number>(0);
  const navigate = useNavigate();

  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const role = localStorage.getItem("role");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  const leaveTypes = [
    "Sakit",
    "Cuti Tahunan",
    "Cuti Penting",
    "Cuti Penangguhan",
  ];

  // 🔄 Realtime event listener
  useEffect(() => {
    const unsubscribe = onSnapshot(eventsCollection, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CalendarEvent, "id">),
      }));
      setEvents(data);
    });
    return () => unsubscribe();
  }, []);

  // 🔁 Ambil daftar pegawai dari database
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

  // ➕ CREATE (gunakan dropdown interaktif)
  // 🧩 Modal input interaktif
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForAdd, setSelectedEmployeeForAdd] = useState<string | null>(null);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  async function saveNewLeave() {
    if (!selectedEmployeeForAdd || selectedLeaveTypes.length === 0) return alert("Lengkapi semua data!");
    try {
      await addDoc(eventsCollection, {
        title: `${selectedEmployeeForAdd} - ${(selectedLeaveTypes || []).join(", ")}`,
        employee: selectedEmployeeForAdd,
        leaveType: selectedLeaveTypes,
        start: selectedDate,
        end: selectedDate,
      });
      setShowModal(false);
      setSelectedEmployeeForAdd(null);
      setSelectedLeaveTypes([]);
    } catch (err) {
      console.error("Gagal menambah event:", err);
    }
  }

  // ✏️ UPDATE

  // ❌ DELETE
  async function deleteEventById(eventId: string) {
    if (!canEdit) return;
    if (!window.confirm("Hapus event ini?")) return;
    await deleteDoc(doc(db, "events", eventId));
  }

  // Render event (dengan tombol hapus)
  function renderEventContent(arg: any) {
    const onDelete = async (e: any) => {
      e.stopPropagation();
      if (!canEdit) return;
      if (!window.confirm(`Hapus "${arg.event.title}"?`)) return;
      await deleteEventById(arg.event.id);
    };

    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
        <span>{arg.event.title}</span>
        {canEdit && (
          <button
            onClick={onDelete}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            🗑️
          </button>
        )}
      </div>
    );
  }

  // 🔍 Dropdown filter pegawai untuk rekap libur
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

  // ✅ Normalisasi: pastikan leaveType selalu array
  if (Array.isArray(e.leaveType)) {
    types = e.leaveType;
  } else if (typeof e.leaveType === "string") {
    types = [e.leaveType];
  } else if (typeof e.leaveType === "string") {
    // fallback untuk data lama
    types = [e.leaveType];
  }

  types.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
});


    setSummary(counts);
    setTotal(Object.values(counts).reduce((a, b) => a + b, 0));
  }, [selectedEmployee, events]);

  return (
    <div style={{ padding: 20, width: "100%", overflowX: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
        <h2>📅 Jadwal Hari Libur — Halo, {userName}</h2>
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
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Calendar */}
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

      {/* Search / Rekap Data Pegawai */}
      <div
        style={{
          marginTop: 30,
          background: "#fff",
          borderRadius: 12,
          padding: 20,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          maxWidth: 500,
          marginInline: "auto",
          color: "#111827",
        }}
      >
        <h3 style={{ textAlign: "center", color: "#1e3a8a" }}>
          🔍 Rekap Hari Libur Pegawai
        </h3>

        <Select
          options={employees}
          onChange={(opt: { value: string; label: string } | null) =>
            setSelectedEmployee(opt?.value || null)
          }
          placeholder="Pilih nama pegawai..."
          isSearchable
        />

        {selectedEmployee && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ textAlign: "center" }}>📋 Data untuk {selectedEmployee}</h4>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
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

      {/* Modal Input Hari Libur */}
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
              onChange={(opt: { value: string; label: string } | null) =>
                setSelectedEmployeeForAdd(opt?.value || null)
              }

              placeholder="Cari pegawai..."
              isSearchable
            />

            <label style={{ marginTop: 12, display: "block" }}>Jenis Libur:</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {leaveTypes.map((t) => (
                <label key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={selectedLeaveTypes.includes(t)}
                    onChange={(e) => {
                      if (e.target.checked)
                        setSelectedLeaveTypes([...selectedLeaveTypes, t]);
                      else
                        setSelectedLeaveTypes(selectedLeaveTypes.filter((x) => x !== t));
                    }}
                  />
                  {t}
                </label>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 20, gap: 8 }}>
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
