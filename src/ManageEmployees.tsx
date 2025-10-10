import React, { useEffect, useState } from "react";
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";

interface Employee {
  id?: string;
  name: string;
}

export default function ManageEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newEmployee, setNewEmployee] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const navigate = useNavigate();
  const employeesCollection = collection(db, "employees");

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    const snapshot = await getDocs(employeesCollection);
    const list = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Employee) }));
    setEmployees(list);
  }

  async function handleAdd() {
    if (!newEmployee.trim()) return alert("Nama pegawai tidak boleh kosong!");
    await addDoc(employeesCollection, { name: newEmployee.trim() });
    setNewEmployee("");
    await loadEmployees();
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return alert("Nama baru tidak boleh kosong!");
    await updateDoc(doc(db, "employees", id), { name: editName.trim() });
    setEditId(null);
    setEditName("");
    await loadEmployees();
  }

  async function handleDelete(id: string) {
    const confirmDelete = window.confirm("Hapus pegawai ini?");
    if (!confirmDelete) return;
    await deleteDoc(doc(db, "employees", id));
    await loadEmployees();
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: "40px 16px",
        boxSizing: "border-box",
        overflowX: "hidden", // 🧩 Hilangkan sisa background kanan
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: "40px",
          borderRadius: 16,
          width: "100%",
          maxWidth: "1000px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <h1 style={{ margin: 0, color: "#1e3a8a", fontSize: "1.8rem" }}>👥 Kelola Pegawai</h1>
          <button
            onClick={() => navigate("/calendar")}
            style={{
              padding: "10px 16px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontWeight: 600,
              cursor: "pointer",
              transition: "background 0.2s",
            }}
          >
            ← Kembali ke Kalender
          </button>
        </div>

        {/* Form Tambah */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Masukkan nama pegawai..."
            value={newEmployee}
            onChange={(e) => setNewEmployee(e.target.value)}
            style={{
              flex: 1,
              minWidth: "250px",
              padding: "12px 16px",
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 15,
              boxSizing: "border-box",
            }}
          />
          <button
            onClick={handleAdd}
            style={{
              padding: "12px 20px",
              borderRadius: 10,
              background: "#2563eb",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Tambah
          </button>
        </div>

        {/* Tabel Pegawai */}
        <div
          style={{
            overflowX: "auto",
            borderRadius: 12,
            boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 15,
              borderRadius: 12,
              overflow: "hidden",
              tableLayout: "fixed", // 🧩 Supaya kolom tidak melebar keluar layar
            }}
          >
            <thead style={{ background: "#f3f4f6" }}>
              <tr>
                <th style={thStyle}>No</th>
                <th style={thStyle}>Nama Pegawai</th>
                <th style={thStyle}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr
                  key={emp.id}
                  style={{
                    background: idx % 2 === 0 ? "#fff" : "#f9fafb",
                    transition: "background 0.2s",
                    textAlign: "center",
                  }}
                >
                  <td style={tdStyle}>{idx + 1}</td>
                  <td style={{ ...tdStyle, textAlign: "left", paddingLeft: 20 }}>
                    {editId === emp.id ? (
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        style={{
                          padding: "8px 10px",
                          border: "1px solid #ccc",
                          borderRadius: 8,
                          width: "100%",
                          boxSizing: "border-box",
                        }}
                      />
                    ) : (
                      emp.name
                    )}
                  </td>
                  <td
                    style={{
                      ...tdStyle,
                      display: "flex",
                      gap: "8px",
                      justifyContent: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    {editId === emp.id ? (
                      <>
                        <button onClick={() => handleUpdate(emp.id!)} style={btnSave}>
                          💾 Simpan
                        </button>
                        <button
                          onClick={() => {
                            setEditId(null);
                            setEditName("");
                          }}
                          style={btnCancel}
                        >
                          ✖ Batal
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditId(emp.id!);
                            setEditName(emp.name);
                          }}
                          style={btnEdit}
                        >
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(emp.id!)} style={btnDelete}>
                          🗑️ Hapus
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Jika kosong */}
        {employees.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: "#6b7280",
              fontSize: 15,
              marginTop: 20,
            }}
          >
            Belum ada pegawai.
          </p>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "14px 8px",
  textAlign: "center",
  fontWeight: 600,
  color: "#374151",
  borderBottom: "2px solid #e5e7eb",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 8px",
  color: "#1f2937",
  borderBottom: "1px solid #e5e7eb",
};

const btnEdit: React.CSSProperties = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 500,
};

const btnDelete: React.CSSProperties = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 500,
};

const btnSave: React.CSSProperties = {
  background: "#10b981",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 500,
};

const btnCancel: React.CSSProperties = {
  background: "#9ca3af",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 12px",
  cursor: "pointer",
  fontWeight: 500,
};
