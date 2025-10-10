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

  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const role = localStorage.getItem("role");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  // @ts-ignore
  const leaveTypes = ["Sakit", "Cuti Tahunan", "Cuti Penting", "Cuti Penangguhan"];

  // 🔄 Load event realtime
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

  // 🔁 Load nama pegawai
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

  // ➕ Tambah event
  async function handleDateClick(info: any) {
    if (!canEdit) return;

    const employee = prompt(
      "Masukkan nama pegawai (atau pilih dari daftar):\n\n" + employees.map((e) => e.label).join(", ")
    );
    if (!employee || employee.trim() === "") return;

    const choose = prompt(
      "Pilih jenis hari libur (pisahkan dengan koma):\n1. Sakit\n2. Cuti Tahunan\n3. Cuti Penting\n4. Cuti Penangguhan"
    );
    if (!choose) return;

    const map: Record<string, string> = {
      "1": "Sakit",
      "2": "Cuti Tahunan",
      "3": "Cuti Penting",
      "4": "Cuti Penangguhan",
    };

    const leaveType = choose
      .split(",")
      .map((x) => map[x.trim()] || "Tidak Diketahui")
      .filter(Boolean);

    await addDoc(eventsCollection, {
      title: `${employee} - ${leaveType.join(", ")}`,
      employee,
      leaveType,
      start: info.dateStr,
      end: info.dateStr,
    });
  }

  // ❌ Hapus event
  async function deleteEventById(id: string) {
    if (!canEdit) return;
    if (!window.confirm("Yakin ingin menghapus?")) return;
    await deleteDoc(doc(db, "events", id));
  }

  // 📊 Hitung rekap otomatis
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
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        padding: "40px 16px",
        boxSizing: "border-box",
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
        <h1 style={{ color: "#fff", fontSize: "1.8rem", fontWeight: 700, margin: 0 }}>
          📅 Jadwal Hari Libur — Halo, {userName}
        </h1>
        <div style={{ display: "flex", gap: 10 }}>
          {(role === "admin" || role === "dev") && (
            <button
              onClick={() => navigate("/manage-employees")}
              style={{
                padding: "10px 18px",
                background: "#10b981",
                color: "#fff",
                border: "none",
                borderRadius: 8,
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
              padding: "10px 18px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Calendar Card */}
      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          width: "100%",
          maxWidth: 1000,
          padding: "28px 20px",
          marginBottom: 40,
          textAlign: "center",
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
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
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
          dateClick={handleDateClick}
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
              padding: "2px 4px",
              boxShadow: "none",
              "&:hover": { borderColor: "#38bdf8" },
            }),
            singleValue: (base) => ({
              ...base,
              color: "#f9fafb",
              fontWeight: 600,
            }),
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
            placeholder: (base) => ({
              ...base,
              color: "#cbd5e1",
            }),
            input: (base) => ({
              ...base,
              color: "#f9fafb",
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
    </div>
  );
}
