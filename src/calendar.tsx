import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  getDocs,
} from "firebase/firestore";

interface CalendarEvent {
  id?: string;
  title: string;
  employee?: string;
  leaveType?: string;
  start: string;
  end?: string;
  type?: string; // kompatibilitas lama
}

export default function Calendar({ canEdit }: { canEdit: boolean }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [search, setSearch] = useState("");
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [total, setTotal] = useState<number>(0);
  const [employees, setEmployees] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [clickedDate, setClickedDate] = useState<string>("");

  const navigate = useNavigate();
  const role = localStorage.getItem("role");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");

  // 🔒 Logout
  async function handleLogout() {
    try {
      await signOut(auth);
      localStorage.removeItem("role");
      navigate("/login");
    } catch (e) {
      console.error("Logout error:", e);
    }
  }

  // 🔁 Real-time load events
  useEffect(() => {
    const unsubscribe = onSnapshot(eventsCollection, (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as CalendarEvent),
      }));
      setEvents(data);
    });
    return () => unsubscribe();
  }, []);

  // 🔁 Load daftar pegawai
  useEffect(() => {
    const loadEmployees = async () => {
      const snap = await getDocs(employeesCollection);
      setEmployees(snap.docs.map((d) => d.data().name));
    };
    loadEmployees();
  }, []);

  // ➕ CREATE (buka modal)
  function handleDateClick(info: any) {
    if (!canEdit) return;
    setClickedDate(info.dateStr);
    setShowModal(true);
  }

  // 🧾 Simpan data dari modal
  async function handleSave() {
    if (!selectedEmployee.trim() || selectedTypes.length === 0) {
      alert("Pilih pegawai dan minimal satu jenis libur!");
      return;
    }

    try {
      for (const type of selectedTypes) {
        await addDoc(eventsCollection, {
          title: `${selectedEmployee} - ${type}`,
          employee: selectedEmployee,
          leaveType: type,
          start: clickedDate,
          end: clickedDate,
        });
      }

      setShowModal(false);
      setSelectedEmployee("");
      setSelectedTypes([]);
    } catch (err) {
      console.error("Gagal menambah event:", err);
    }
  }

  // ✏️ UPDATE
  async function handleEventClick(info: any) {
    if (!canEdit) return;
    const newTitle = prompt("Ubah nama hari libur:", info.event.title);
    if (!newTitle || newTitle.trim() === "") return;
    try {
      const ref = doc(db, "events", info.event.id);
      await updateDoc(ref, { title: newTitle });
    } catch (err) {
      console.error("Gagal mengupdate event:", err);
    }
  }

  // ❌ DELETE
  async function deleteEventById(eventId: string) {
    if (!canEdit) return;
    const ok = window.confirm("Hapus event ini?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db, "events", eventId));
    } catch (err) {
      console.error("Gagal menghapus event:", err);
    }
  }

  // 🔍 Hitung rekap libur pegawai
  useEffect(() => {
    if (!search.trim()) {
      setSummary({});
      setTotal(0);
      return;
    }

    const lower = search.toLowerCase();
    const filtered = events.filter((e) =>
      (e.employee ?? "").toLowerCase().includes(lower)
    );

    const counts: Record<string, number> = {};
    filtered.forEach((e) => {
      const key = e.leaveType ?? e.type ?? "Tidak Diketahui";
      counts[key] = (counts[key] || 0) + 1;
    });

    setSummary(counts);
    setTotal(Object.values(counts).reduce((a, b) => a + b, 0));
  }, [search, events]);

  // 🎨 Render event content
  function renderEventContent(arg: any) {
    const onDelete = async (e: any) => {
      e.stopPropagation();
      if (!canEdit) return;
      const ok = window.confirm(`Hapus "${arg.event.title}"?`);
      if (!ok) return;
      await deleteEventById(arg.event.id);
    };

    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontSize: "14px",
            fontWeight: 500,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "80%",
          }}
        >
          {arg.event.title}
        </span>
        {canEdit && (
          <button
            onClick={onDelete}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              padding: 4,
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
        padding: 20,
        width: "100vw",
        maxWidth: "100%",
        overflowX: "hidden",
        margin: "0 auto",
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
        <h2 style={{ margin: 0, fontSize: 20 }}>
          📅 Jadwal Hari Libur — Halo, {userName}
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {(role === "admin" || role === "dev") && (
            <button
              onClick={() => navigate("/manage-employees")}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #10b981",
                background: "#10b981",
                color: "#fff",
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
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #1d4ed8",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 600,
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
        height="auto"
        eventContent={renderEventContent}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
      />

      {/* Search & Summary */}
      <div
        style={{
          marginTop: 24,
          background: "#f9fafb",
          borderRadius: 12,
          padding: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          maxWidth: 500,
          marginInline: "auto",
        }}
      >
        <h3 style={{ textAlign: "center", marginBottom: 10 }}>
          🔍 Cari Data Hari Libur Pegawai
        </h3>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <input
            type="text"
            placeholder="Masukkan nama pegawai..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1,
              padding: 10,
              border: "1px solid #d1d5db",
              borderRadius: 8,
            }}
          />
        </div>

        {Object.keys(summary).length > 0 && (
          <div style={{ marginTop: 20 }}>
            <h4 style={{ textAlign: "center", color: "#1e3a8a" }}>
              Rekap Hari Libur untuk “{search}”
            </h4>
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
                <tr
                  style={{
                    background: "#f3f4f6",
                    fontWeight: "bold",
                  }}
                >
                  <td style={{ padding: 8 }}>Total Hari Libur</td>
                  <td style={{ padding: 8 }}>{total}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Input Admin */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
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
              textAlign: "center",
            }}
          >
            <h3 style={{ color: "#1e3a8a" }}>Tambah Hari Libur</h3>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                marginBottom: 16,
              }}
            >
              <option value="">Pilih Pegawai</option>
              {employees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>

            <div
              style={{
                textAlign: "left",
                marginBottom: 16,
                paddingLeft: 10,
              }}
            >
              <label>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes("Sakit")}
                  onChange={() =>
                    setSelectedTypes((prev) =>
                      prev.includes("Sakit")
                        ? prev.filter((t) => t !== "Sakit")
                        : [...prev, "Sakit"]
                    )
                  }
                />{" "}
                Sakit
              </label>
              <br />
              <label>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes("Cuti Tahunan")}
                  onChange={() =>
                    setSelectedTypes((prev) =>
                      prev.includes("Cuti Tahunan")
                        ? prev.filter((t) => t !== "Cuti Tahunan")
                        : [...prev, "Cuti Tahunan"]
                    )
                  }
                />{" "}
                Cuti Tahunan
              </label>
              <br />
              <label>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes("Cuti Penting")}
                  onChange={() =>
                    setSelectedTypes((prev) =>
                      prev.includes("Cuti Penting")
                        ? prev.filter((t) => t !== "Cuti Penting")
                        : [...prev, "Cuti Penting"]
                    )
                  }
                />{" "}
                Cuti Penting
              </label>
              <br />
              <label>
                <input
                  type="checkbox"
                  checked={selectedTypes.includes("Cuti Penangguhan")}
                  onChange={() =>
                    setSelectedTypes((prev) =>
                      prev.includes("Cuti Penangguhan")
                        ? prev.filter((t) => t !== "Cuti Penangguhan")
                        : [...prev, "Cuti Penangguhan"]
                    )
                  }
                />{" "}
                Cuti Penangguhan
              </label>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "#9ca3af",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
