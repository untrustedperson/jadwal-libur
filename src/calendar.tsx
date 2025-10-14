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
  updateDoc,
} from "firebase/firestore";

interface CalendarEvent {
  id?: string;
  title: string;
  employee?: string;
  leaveType?: string[] | string;
  start: string;
  end?: string;
  status?: "approved" | "pending" | "rejected";
  backgroundColor?: string;
  textColor?: string;
}

export default function Calendar() {
  const role = localStorage.getItem("role");
  const canEdit = role === "admin" || role === "dev";

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidays, setHolidays] = useState<CalendarEvent[]>([]);
  const [balineseHolidays, setBalineseHolidays] = useState<CalendarEvent[]>([]);
  const [employees, setEmployees] = useState<{ value: string; label: string; id?: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>("all");
  const [selectedEmployeeForAdd, setSelectedEmployeeForAdd] = useState<string | null>(null);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // 🔁 filter libur
  const [showNationalHolidays, setShowNationalHolidays] = useState(true);
  const [showBalineseHolidays, setShowBalineseHolidays] = useState(true);

  const calendarRef = useRef<any>(null);
  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  /* ========== Realtime Data ========== */
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

  useEffect(() => {
    const unsub = onSnapshot(employeesCollection, (snap) => {
      setEmployees(
        snap.docs.map((d) => ({
          id: d.id,
          value: d.data().name,
          label: d.data().name,
        }))
      );
    });
    return () => unsub();
  }, []);

  /* ========== Libur Nasional / Bali ========== */
  async function fetchHolidays(year: number) {
    try {
      const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/ID`;
      const resp = await fetch(url);
      if (!resp.ok) return console.error("❌ Error:", resp.status);
      const data = await resp.json();
      const formatted = data.map((d: any) => ({
        id: d.date,
        title: `🇮🇩 ${d.localName}`,
        start: d.date,
        backgroundColor: "#dc2626",
        textColor: "#fff",
      }));
      setHolidays(formatted);
    } catch (e) {
      console.error("⚠️ fetchHolidays error:", e);
    }
  }

  const baseBalineseHolidays = [
    { title: "Hari Raya Saraswati", date: "02-08" },
    { title: "Tumpek Landep", date: "02-22" },
    { title: "Hari Raya Nyepi", date: "03-29" },
    { title: "Ngembak Geni", date: "03-30" },
    { title: "Hari Raya Galungan", date: "04-23" },
    { title: "Hari Raya Kuningan", date: "05-03" },
  ];

  const generateBalineseHolidays = (year: number) =>
    baseBalineseHolidays.map((b) => ({
      id: `${year}-${b.date}-${b.title}`,
      title: `🌺 ${b.title}`,
      start: `${year}-${b.date}`,
      backgroundColor: "#16a34a",
      textColor: "#fff",
    }));

  useEffect(() => {
    fetchHolidays(selectedYear);
    setBalineseHolidays(generateBalineseHolidays(selectedYear));
  }, [selectedYear]);

  /* ========== Auth ========== */
  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

  /* ========== CRUD Jadwal ========== */
  async function saveNewLeave() {
    if (selectedLeaveTypes.length === 0)
      return alert("Pilih jenis libur dulu!");

    let employeeName = userName;
    let leaveStatus: "approved" | "pending" = "pending";

    if (canEdit) {
      if (!selectedEmployeeForAdd) return alert("Pilih pegawai dulu!");
      employeeName = selectedEmployeeForAdd;
      leaveStatus = "approved";
    }

    const newEvent: CalendarEvent = {
      title: `${employeeName} - ${selectedLeaveTypes.join(", ")}`,
      employee: employeeName,
      leaveType: selectedLeaveTypes,
      start: selectedDate,
      end: selectedDate,
      status: leaveStatus,
    };

    await addDoc(eventsCollection, newEvent);
    setShowModal(false);
    setSelectedLeaveTypes([]);
    setSelectedEmployeeForAdd(null);
    alert(
      canEdit
        ? "✅ Jadwal berhasil ditambahkan dan disetujui."
        : "🕒 Pengajuan libur berhasil dikirim. Menunggu persetujuan admin."
    );
  }

  async function approveEvent(id: string) {
    await updateDoc(doc(db, "events", id), { status: "approved" });
  }

  async function rejectEvent(id: string) {
    await updateDoc(doc(db, "events", id), { status: "rejected" });
  }

  async function deleteEvent(id: string) {
    if (confirm("Hapus jadwal ini?")) {
      await deleteDoc(doc(db, "events", id));
      setShowDeleteModal(false);
      setSelectedEventId(null);
    }
  }

  const handleMonthYearChange = () => {
    if (calendarRef.current) {
      const newDate = new Date(selectedYear, selectedMonth, 1);
      calendarRef.current.getApi().gotoDate(newDate);
      fetchHolidays(selectedYear);
      setBalineseHolidays(generateBalineseHolidays(selectedYear));
      setShowMonthPicker(false);
    }
  };

  const selectStyles = {
    control: (base: any) => ({
      ...base,
      borderRadius: 8,
      borderColor: "#2563eb",
      backgroundColor: "#ffffff",
      minHeight: 40,
      boxShadow: "none",
    }),
  };

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
        {/* === HEADER === */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 30,
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <h1 style={{ color: "#fff", fontSize: "1.8rem" }}>
            📅 Jadwal Hari Libur — Halo, {userName}
          </h1>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
            {/* Checkbox filter libur */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "6px 10px",
                color: "#fff",
                fontSize: ".9rem",
              }}
            >
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showNationalHolidays}
                  onChange={(e) => setShowNationalHolidays(e.target.checked)}
                />
                <span>Libur Nasional</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showBalineseHolidays}
                  onChange={(e) => setShowBalineseHolidays(e.target.checked)}
                />
                <span>Hari Raya Bali</span>
              </label>
            </div>

            {canEdit && (
              <button
                onClick={() => navigate("/manage-employees")}
                style={{
                  background: "#10b981",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                👥 Kelola Pegawai
              </button>
            )}

            <button
              onClick={() => setShowMonthPicker(true)}
              style={{
                background: "#facc15",
                color: "#000",
                border: "none",
                borderRadius: 8,
                padding: "10px 16px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📆 Pilih Bulan & Tahun
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 18px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Logout
            </button>
          </div>
        </div>

        {/* === CALENDAR === */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "32px 24px",
            marginBottom: 20,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            dateClick={(info) => {
              setSelectedDate(info.dateStr);
              setShowModal(true);
            }}
            eventClick={(info) => {
              if (!canEdit) return;
              setSelectedEventId(info.event.id);
              setShowDeleteModal(true);
            }}
            events={[
              ...events.map((e) => {
                const status = (e.status || "pending").toLowerCase();
                const bg =
                  status === "approved"
                    ? "#2563eb"
                    : status === "pending"
                    ? "#facc15"
                    : "#9ca3af";
                const txt = status === "pending" ? "#000" : "#fff";
                return { ...e, backgroundColor: bg, textColor: txt };
              }),
              ...(showNationalHolidays ? holidays : []),
              ...(showBalineseHolidays ? balineseHolidays : []),
            ]}
          />
        </div>

        {/* === MODAL HAPUS === */}
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
                textAlign: "center",
              }}
            >
              <h3 style={{ color: "#1e3a8a", marginBottom: 16 }}>
                Apakah Anda ingin menghapus jadwal ini?
              </h3>
              <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
                <button
                  onClick={() => selectedEventId && deleteEvent(selectedEventId)}
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
        
        {/* === TABEL PENGAJUAN PENDING === */}
        {canEdit && (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              marginBottom: 24,
              boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
              color: "#111827",
            }}
          >
            <h2 style={{ color: "#1e3a8a", fontWeight: 700, fontSize: "1.4rem" }}>
              🕒 Daftar Pengajuan Pending
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#f9fafb",
                marginTop: 10,
              }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ padding: 12 }}>Pegawai</th>
                  <th style={{ padding: 12 }}>Jenis Libur</th>
                  <th style={{ padding: 12 }}>Tanggal</th>
                  <th style={{ padding: 12 }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {events.filter((e) => e.status === "pending").length ? (
                  events
                    .filter((e) => e.status === "pending")
                    .map((e) => (
                      <tr key={e.id}>
                        <td style={{ padding: 12, color: "#111827" }}>{e.employee}</td>
                        <td style={{ padding: 12, color: "#111827" }}>
                          {Array.isArray(e.leaveType) ? e.leaveType.join(", ") : e.leaveType}
                        </td>
                        <td style={{ padding: 12, color: "#111827" }}>{e.start}</td>
                        <td style={{ padding: 12 }}>
                          <button
                            onClick={() => approveEvent(e.id!)}
                            style={{
                              background: "#16a34a",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "6px 12px",
                              marginRight: 8,
                              cursor: "pointer",
                            }}
                          >
                            Setujui
                          </button>
                          <button
                            onClick={() => rejectEvent(e.id!)}
                            style={{
                              background: "#dc2626",
                              color: "#fff",
                              border: "none",
                              borderRadius: 6,
                              padding: "6px 12px",
                              cursor: "pointer",
                            }}
                          >
                            Tolak
                          </button>
                        </td>
                      </tr>
                    ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 12 }}>
                      Tidak ada pengajuan pending.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* === REKAP DATA PEGAWAI === */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "32px 24px",
            marginBottom: 24,
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ color: "#1e3a8a", fontWeight: 700, fontSize: "1.4rem" }}>
              🔍 Rekap Hari Libur Pegawai
            </h2>
            <div style={{ width: 280, marginTop: 10 }}>
              <Select
                options={[{ value: "all", label: "Tampilkan Semua Pegawai" }, ...employees]}
                defaultValue={{ value: "all", label: "Tampilkan Semua Pegawai" }}
                onChange={(opt) => setSelectedEmployee(opt?.value || "all")}
                styles={selectStyles}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "#f9fafb",
                color: "#111827",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <thead>
                <tr style={{ background: "#f3f4f6", color: "#1f2937", textAlign: "left" }}>
                  <th style={{ padding: 12, fontWeight: 700 }}>Nama Pegawai</th>
                  <th style={{ padding: 12, fontWeight: 700 }}>Sakit</th>
                  <th style={{ padding: 12, fontWeight: 700 }}>Cuti Tahunan</th>
                  <th style={{ padding: 12, fontWeight: 700 }}>Cuti Penting</th>
                  <th style={{ padding: 12, fontWeight: 700 }}>Cuti Penangguhan</th>
                  <th style={{ padding: 12, fontWeight: 700 }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const grouped: Record<string, Record<string, number>> = {};
                  events
                    .filter((e) => (e.status || "").toLowerCase() === "approved")
                    .forEach((e) => {
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
                        <tr
                          key={emp}
                          style={{
                            borderBottom: "1px solid #e5e7eb",
                            transition: "background 0.2s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#e0e7ff")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <td style={{ padding: 12, fontWeight: 600 }}>{emp}</td>
                          <td style={{ padding: 12 }}>{rec["Sakit"]}</td>
                          <td style={{ padding: 12 }}>{rec["Cuti Tahunan"]}</td>
                          <td style={{ padding: 12 }}>{rec["Cuti Penting"]}</td>
                          <td style={{ padding: 12 }}>{rec["Cuti Penangguhan"]}</td>
                          <td
                            style={{
                              padding: 12,
                              fontWeight: 700,
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
                      <td colSpan={6} style={{ padding: 14, textAlign: "center", color: "#6b7280" }}>
                        Tidak ada data pegawai ditemukan.
                      </td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* === MODAL PICKER BULAN & TAHUN === */}
        {showMonthPicker && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.45)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 2000,
            }}
            onClick={() => setShowMonthPicker(false)}
          >
            <div
              style={{
                background: "#ffffff",
                borderRadius: 16,
                padding: "24px 28px",
                width: "90%",
                maxWidth: 400,
                color: "#111827",
                boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                textAlign: "center",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                style={{
                  color: "#2563eb",
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  marginBottom: 16,
                }}
              >
                Pilih Bulan & Tahun
              </h3>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: "1rem",
                  }}
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
                  style={{
                    padding: "8px 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: 8,
                    fontSize: "1rem",
                  }}
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(
                    (y) => (
                      <option key={y}>{y}</option>
                    )
                  )}
                </select>
              </div>

              <button
                onClick={handleMonthYearChange}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontWeight: 600,
                  fontSize: "1rem",
                  cursor: "pointer",
                }}
              >
                Tampilkan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* === MODAL TAMBAH LIBUR === */}
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
              maxWidth: 420,
              color: "#111827",
            }}
          >
            <h3 style={{ textAlign: "center", color: "#1e3a8a", marginBottom: 12 }}>
              {canEdit ? "Tambah Hari Libur Pegawai" : "Ajukan Hari Libur"}
            </h3>

            {canEdit ? (
              <>
                <label style={{ fontWeight: 600, display: "block", marginBottom: 6 }}>
                  Pilih Pegawai:
                </label>
                <Select
                  options={employees}
                  onChange={(opt) => setSelectedEmployeeForAdd(opt?.value || null)}
                  placeholder="Pilih pegawai..."
                  styles={selectStyles}
                />
              </>
            ) : (
              <div
                style={{
                  marginBottom: 8,
                  fontSize: ".95rem",
                  color: "#374151",
                }}
              >
                Pegawai: <strong>{userName}</strong>
              </div>
            )}

            <label style={{ fontWeight: 600, display: "block", marginTop: 10, marginBottom: 6 }}>
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
              onChange={(opts) => setSelectedLeaveTypes(opts ? opts.map((o) => o.value) : [])}
              placeholder="Pilih jenis libur..."
              styles={selectStyles}
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
                onClick={() => {
                  setShowModal(false);
                  setSelectedLeaveTypes([]);
                  setSelectedEmployeeForAdd(null);
                }}
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

{/* === MODAL HAPUS JADWAL === */}
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
        Apakah Anda yakin ingin menghapus jadwal ini?
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
          Ya, Hapus
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
