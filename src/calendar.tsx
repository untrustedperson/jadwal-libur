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

  // modal tambah libur
  const [showModal, setShowModal] = useState(false);
  const [selectedLeaveTypes, setSelectedLeaveTypes] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");

  // modal hapus event
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // bulan/tahun
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // kelola pegawai (admin)
  const [empNewName, setEmpNewName] = useState("");
  const [empEditId, setEmpEditId] = useState<string | null>(null);
  const [empEditName, setEmpEditName] = useState("");

  const calendarRef = useRef<any>(null);
  const navigate = useNavigate();
  const eventsCollection = collection(db, "events");
  const employeesCollection = collection(db, "employees");
  const userName = (auth.currentUser?.email || "").split("@")[0];

  /* =========================
     Data Realtime
  ==========================*/
  // events realtime
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

  // employees realtime (pakai onSnapshot supaya CRUD terasa langsung)
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

  /* =========================
     Libur Nasional / Bali
  ==========================*/
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

  // Hari Raya Bali (statis sederhana, bisa kamu kembangkan)
  const baseBalineseHolidays = [
    { title: "Hari Raya Saraswati", date: "02-08" },
    { title: "Tumpek Landep", date: "02-22" },
    { title: "Hari Raya Nyepi", date: "03-29" },
    { title: "Ngembak Geni", date: "03-30" },
    { title: "Hari Raya Galungan", date: "04-23" },
    { title: "Hari Raya Kuningan", date: "05-03" },
    { title: "Tumpek Krulut", date: "06-07" },
    { title: "Tumpek Kandang", date: "07-12" },
    { title: "Tumpek Wayang", date: "08-16" },
    { title: "Hari Raya Saraswati", date: "09-06" },
    { title: "Tumpek Uduh", date: "10-25" },
    { title: "Hari Raya Galungan", date: "11-19" },
    { title: "Hari Raya Kuningan", date: "11-29" },
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

  /* =========================
     Auth
  ==========================*/
  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

  /* =========================
     CRUD Events / Pengajuan
  ==========================*/
  // viewer hanya pilih jenis libur → employee otomatis userName
  async function saveNewLeave() {
    if (selectedLeaveTypes.length === 0) return alert("Pilih jenis libur dulu!");

    // normalisasi leaveType ke array string
    const leaveArr = selectedLeaveTypes.map((v) => String(v));

    const newEvent: CalendarEvent = {
      title: `${userName} - ${leaveArr.join(", ")}`,
      employee: userName,
      leaveType: leaveArr,
      start: selectedDate,
      end: selectedDate,
      status: canEdit ? "approved" : "pending",
    };

    await addDoc(eventsCollection, newEvent);
    setShowModal(false);
    setSelectedLeaveTypes([]);
    alert(
      canEdit
        ? "✅ Jadwal berhasil ditambahkan."
        : "🕒 Pengajuan libur berhasil dikirim. Menunggu persetujuan admin."
    );
  }

  async function approveEvent(id: string) {
    await updateDoc(doc(db, "events", id), { status: "approved" });
  }

  async function rejectEvent(id: string) {
    await updateDoc(doc(db, "events", id), { status: "rejected" });
  }

  /* =========================
     Kelola Pegawai (Admin/Dev)
  ==========================*/
  async function addEmployee() {
    const name = empNewName.trim();
    if (!name) return;
    // hindari duplikat nama sederhana
    const exist = employees.some((e) => e.value.toLowerCase() === name.toLowerCase());
    if (exist) return alert("Nama pegawai sudah ada.");
    await addDoc(employeesCollection, { name });
    setEmpNewName("");
  }

  function startEditEmployee(empId: string, current: string) {
    setEmpEditId(empId);
    setEmpEditName(current);
  }

  async function saveEditEmployee() {
    if (!empEditId) return;
    const name = empEditName.trim();
    if (!name) return;
    await updateDoc(doc(db, "employees", empEditId), { name });
    setEmpEditId(null);
    setEmpEditName("");
  }

  async function deleteEmployee(empId?: string) {
    if (!empId) return;
    if (!confirm("Hapus pegawai ini?")) return;
    await deleteDoc(doc(db, "employees", empId));
  }

  /* =========================
     Calendar nav
  ==========================*/
  const handleMonthYearChange = () => {
    if (calendarRef.current) {
      const newDate = new Date(selectedYear, selectedMonth, 1);
      calendarRef.current.getApi().gotoDate(newDate);
      fetchHolidays(selectedYear);
      setBalineseHolidays(generateBalineseHolidays(selectedYear));
      setShowMonthPicker(false);
    }
  };

  /* =========================
     Styling react-select (kontras)
  ==========================*/
  const selectStyles = {
    control: (base: any) => ({
      ...base,
      borderRadius: 8,
      borderColor: "#2563eb",
      backgroundColor: "#ffffff",
      minHeight: 40,
      boxShadow: "none",
      ":hover": { borderColor: "#1d4ed8" },
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: 8,
      backgroundColor: "#ffffff",
      overflow: "hidden",
      zIndex: 30,
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#2563eb"
        : state.isFocused
        ? "#e0e7ff"
        : "#ffffff",
      color: state.isSelected ? "#ffffff" : "#111827",
      cursor: "pointer",
    }),
    singleValue: (base: any) => ({
      ...base,
      color: "#111827",
      fontWeight: 600,
    }),
    multiValue: (base: any) => ({
      ...base,
      backgroundColor: "#e5e7eb",
    }),
    multiValueLabel: (base: any) => ({
      ...base,
      color: "#111827",
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
          }}
        >
          <h1 style={{ color: "#fff", fontSize: "1.8rem" }}>
            📅 Jadwal Hari Libur — Halo, {userName}
          </h1>
          <div style={{ display: "flex", gap: 10 }}>
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
            // warna event sudah fix: approved=biru, pending=kuning, rejected=abu-abu
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
              ...holidays,
              ...balineseHolidays,
            ]}
          />

          {/* === LEGENDA === */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 16,
            }}
          >
            {[
              ["#2563eb", "Jadwal Disetujui"],
              ["#facc15", "Pending Persetujuan"],
              ["#dc2626", "Libur Nasional"],
              ["#16a34a", "Hari Raya Bali"],
              ["#9ca3af", "Ditolak"],
            ].map(([color, label]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    backgroundColor: color,
                  }}
                />
                <span style={{ color: "#1e3a8a", fontWeight: 600 }}>{label}</span>
              </div>
            ))}
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

        {/* === TABEL PENGAJUAN PENDING (ADMIN) === */}
        {canEdit && (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px",
              marginBottom: 24,
              boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
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
                        <td style={{ padding: 12 }}>{e.employee}</td>
                        <td style={{ padding: 12 }}>
                          {Array.isArray(e.leaveType)
                            ? e.leaveType.join(", ")
                            : e.leaveType}
                        </td>
                        <td style={{ padding: 12 }}>{e.start}</td>
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
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            marginBottom: 24,
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
            <h2
              style={{
                color: "#1e3a8a",
                fontWeight: 700,
                fontSize: "1.4rem",
              }}
            >
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
                      const types =
                        Array.isArray(e.leaveType)
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

        {/* === KELOLA PEGAWAI (ADMIN/DEV) === */}
        {canEdit && (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "24px",
              marginBottom: 40,
              boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h2 style={{ color: "#1e3a8a", fontWeight: 700, fontSize: "1.4rem", marginBottom: 12 }}>
              👥 Kelola Pegawai
            </h2>

            {/* Tambah pegawai */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <input
                value={empNewName}
                onChange={(e) => setEmpNewName(e.target.value)}
                placeholder="Nama pegawai baru"
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "1px solid #d1d5db",
                }}
              />
              <button
                onClick={addEmployee}
                style={{
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "10px 16px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Tambah
              </button>
            </div>

            {/* Tabel pegawai */}
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  background: "#f9fafb",
                }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ padding: 12, textAlign: "left" }}>Nama</th>
                    <th style={{ padding: 12, textAlign: "left" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length ? (
                    employees.map((emp) => (
                      <tr key={emp.id}>
                        <td style={{ padding: 12 }}>
                          {empEditId === emp.id ? (
                            <input
                              value={empEditName}
                              onChange={(e) => setEmpEditName(e.target.value)}
                              style={{
                                padding: "8px 10px",
                                borderRadius: 8,
                                border: "1px solid #d1d5db",
                                width: "100%",
                                maxWidth: 360,
                              }}
                            />
                          ) : (
                            <span style={{ fontWeight: 600 }}>{emp.label}</span>
                          )}
                        </td>
                        <td style={{ padding: 12 }}>
                          {empEditId === emp.id ? (
                            <>
                              <button
                                onClick={saveEditEmployee}
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
                                Simpan
                              </button>
                              <button
                                onClick={() => {
                                  setEmpEditId(null);
                                  setEmpEditName("");
                                }}
                                style={{
                                  background: "#9ca3af",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  padding: "6px 12px",
                                  cursor: "pointer",
                                }}
                              >
                                Batal
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => startEditEmployee(emp.id!, emp.value)}
                                style={{
                                  background: "#2563eb",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  padding: "6px 12px",
                                  marginRight: 8,
                                  cursor: "pointer",
                                }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => deleteEmployee(emp.id)}
                                style={{
                                  background: "#dc2626",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 6,
                                  padding: "6px 12px",
                                  cursor: "pointer",
                                }}
                              >
                                Hapus
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} style={{ padding: 12, textAlign: "center" }}>
                        Belum ada pegawai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* === MODAL TAMBAH LIBUR (viewer hanya pilih jenis) === */}
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

            {/* viewer tidak pilih pegawai */}
            {!canEdit ? (
              <div
                style={{
                  marginBottom: 8,
                  fontSize: ".95rem",
                  color: "#374151",
                }}
              >
                Pegawai: <strong>{userName}</strong>
              </div>
            ) : null}

            {/* jenis libur (multi) */}
            <label style={{ fontWeight: 600, display: "block", marginTop: 8, marginBottom: 6 }}>
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
