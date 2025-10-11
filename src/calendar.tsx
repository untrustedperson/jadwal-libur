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
  const [_summary, setSummary] = useState<Record<string, number>>({});
  const [_total, setTotal] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForAdd, setSelectedEmployeeForAdd] = useState<string | null>(null);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const role = localStorage.getItem("role");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  //@ts-ignore
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
      width: "100%",
      background: "linear-gradient(135deg, #2563eb, #60a5fa)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      padding: "40px 16px",
      overflowX: "hidden",
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
                whiteSpace: "nowrap",
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
              whiteSpace: "nowrap",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Calendar Container */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          width: "100%",
          maxWidth: 1000,
          padding: "28px 20px",
          marginBottom: 40,
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            overflowX: "hidden",
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
                  alignItems: "center",
                  color: "#111827",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: "85%",
                  }}
                >
                  {arg.event.title}
                </span>
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
                      color: "#1e3a8a",
                      flexShrink: 0,
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
            contentHeight="auto"
            height="auto"
            themeSystem="standard"
          />
        </div>
      </div>

      {/* Rekap Card */}
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
    position: "relative",
    color: "#111827",
  }}
>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 20,
      flexWrap: "wrap",
      gap: 10,
    }}
  >
    <h2 style={{ color: "#1e3a8a", margin: 0 }}>🔍 Rekap Hari Libur Pegawai</h2>

    <div style={{ width: 250 }}>
      <Select
        options={[
          { value: "all", label: "Tampilkan Semua Pegawai" },
          ...employees,
        ]}
        defaultValue={{ value: "all", label: "Tampilkan Semua Pegawai" }}
        onChange={(opt) => setSelectedEmployee(opt?.value || "all")}
        placeholder="Pilih pegawai..."
        isSearchable
        styles={{
          control: (base) => ({
            ...base,
            backgroundColor: "#f3f4f6",
            borderColor: "#2563eb",
            borderRadius: 8,
            color: "#111827",
          }),
          singleValue: (base) => ({
            ...base,
            color: "#111827",
            fontWeight: 600,
          }),
          placeholder: (base) => ({
            ...base,
            color: "#4b5563",
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: "#f9fafb",
            color: "#111827",
            borderRadius: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? "#2563eb" : "#f9fafb",
            color: state.isFocused ? "#fff" : "#111827",
            cursor: "pointer",
          }),
        }}
      />
    </div>
  </div>

  {/* 🔢 Rekap tabel semua pegawai */}
  <div style={{ overflowX: "auto" }}>
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "center",
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
          <th style={{ padding: 8 }}>Total Libur</th>
        </tr>
      </thead>
      <tbody>
        {(() => {
          // Kelompokkan data pegawai
          const grouped: Record<string, Record<string, number>> = {};
          events.forEach((e) => {
            const emp = e.employee || "(Tidak diketahui)";
            if (!grouped[emp])
              grouped[emp] = {
                "Sakit": 0,
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

          // Filter jika user memilih 1 pegawai
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
                <tr key={emp}>
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


      {/* Modal Tambah Libur */}
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
        onChange={(opt) => setSelectedEmployeeForAdd(opt ? opt.value : null)}
        placeholder="Pilih nama pegawai..."
        isSearchable
        styles={{
          control: (base) => ({
            ...base,
            backgroundColor: "#f9fafb",
            borderColor: "#2563eb",
            borderRadius: 8,
            color: "#111827",
          }),
          singleValue: (base) => ({
            ...base,
            color: "#111827",
            fontWeight: 600,
          }),
          placeholder: (base) => ({
            ...base,
            color: "#4b5563",
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: "#f3f4f6",
            color: "#111827",
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? "#2563eb" : "#f3f4f6",
            color: state.isFocused ? "#fff" : "#111827",
            cursor: "pointer",
          }),
        }}
      />

      <label style={{ marginTop: 12, display: "block" }}>Jenis Libur:</label>
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
        styles={{
          control: (base) => ({
            ...base,
            backgroundColor: "#f9fafb",
            borderColor: "#2563eb",
            borderRadius: 8,
            color: "#111827",
          }),
          multiValue: (base) => ({
            ...base,
            backgroundColor: "#e0e7ff",
          }),
          multiValueLabel: (base) => ({
            ...base,
            color: "#111827",
            fontWeight: 600,
          }),
          placeholder: (base) => ({
            ...base,
            color: "#4b5563",
          }),
          menu: (base) => ({
            ...base,
            backgroundColor: "#f3f4f6",
            color: "#111827",
          }),
          option: (base, state) => ({
            ...base,
            backgroundColor: state.isFocused ? "#2563eb" : "#f3f4f6",
            color: state.isFocused ? "#fff" : "#111827",
          }),
        }}
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
  </div>
    </div>
)};