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
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "40px 16px",
        boxSizing: "border-box",
      }}
    >
      {/* Header dan tombol kembali */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          width: "100%",
          maxWidth: 600,
          marginBottom: 24,
        }}
      >
        <h1 style={{ color: "#fff", fontSize: "1.8rem", margin: 0 }}>👥 Kelola Pegawai</h1>
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
          ← Kembali
        </button>
      </div>

      {/* Kartu Tambah Pegawai */}
      <div
        style={{
          background: "#fff",
          padding: "32px 24px",
          borderRadius: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 600,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <h2 style={{ color: "#1e3a8a", margin: 0 }}>Tambah Pegawai</h2>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
            justifyContent: "center",
            width: "100%",
          }}
        >
          <input
            type="text"
            placeholder="Masukkan nama pegawai..."
            value={newEmployee}
            onChange={(e) => setNewEmployee(e.target.value)}
            style={{
              flex: 1,
              minWidth: 250,
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
              whiteSpace: "nowrap",
            }}
          >
            Tambah
          </button>
        </div>
      </div>

      {/* Daftar Pegawai */}
      <div
        style={{
          background: "#fff",
          padding: "24px 20px",
          borderRadius: 16,
          boxShadow: "0 6px 20px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 800,
          marginTop: 32,
          overflowX: "auto",
        }}
      >
        <h3 style={{ margin: "0 0 16px", color: "#1e3a8a", textAlign: "center" }}>
          Daftar Pegawai
        </h3>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6" }}>
              <th style={thStyle}>No</th>
              <th style={thStyle}>Nama Pegawai</th>
              <th style={thStyle}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp, idx) => (
              <tr key={emp.id} style={{ background: idx % 2 === 0 ? "#fff" : "#f9fafb" }}>
                <td style={tdStyle}>{idx + 1}</td>
                <td style={{ ...tdStyle, width: "60%" }}>
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
                      }}
                    />
                  ) : (
                    emp.name
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
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

        {employees.length === 0 && (
          <p style={{ textAlign: "center", marginTop: 16, color: "#6b7280" }}>
            Belum ada pegawai.
          </p>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 8px",
  fontWeight: 600,
  color: "#374151",
  borderBottom: "2px solid #e5e7eb",
  textAlign: "center",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: 14,
};

const btnEdit: React.CSSProperties = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 500,
  margin: "0 4px",
};

const btnDelete: React.CSSProperties = {
  background: "#ef4444",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 500,
  margin: "0 4px",
};

const btnSave: React.CSSProperties = {
  background: "#10b981",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 500,
  margin: "0 4px",
};

const btnCancel: React.CSSProperties = {
  background: "#9ca3af",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 500,
  margin: "0 4px",
};
