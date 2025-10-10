import { useEffect, useState } from "react";
import { collection, addDoc, deleteDoc, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";

interface Employee {
  id?: string;
  name: string;
}

export default function ManageEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [newName, setNewName] = useState("");
  const navigate = useNavigate();
  const employeesCollection = collection(db, "employees");

  useEffect(() => {
    const unsub = onSnapshot(employeesCollection, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Employee[];
      setEmployees(data);
    });
    return () => unsub();
  }, []);

  async function addEmployee() {
    if (!newName.trim()) return;
    await addDoc(employeesCollection, { name: newName.trim() });
    setNewName("");
  }

  async function deleteEmployee(id?: string) {
    if (!id) return;
    const ok = confirm("Hapus pegawai ini?");
    if (!ok) return;
    await deleteDoc(doc(db, "employees", id));
  }

  async function editEmployee(id?: string, oldName?: string) {
    const newName = prompt("Edit nama pegawai:", oldName);
    if (!newName || !newName.trim()) return;
    await updateDoc(doc(db, "employees", id!), { name: newName.trim() });
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "0 auto" }}>
      <h2>👥 Kelola Pegawai</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="Nama pegawai baru"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          style={{ flex: 1, padding: 8, borderRadius: 8, border: "1px solid #ccc" }}
        />
        <button
          onClick={addEmployee}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 12px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Tambah
        </button>
      </div>

      <ul style={{ listStyle: "none", padding: 0 }}>
        {employees.map((emp) => (
          <li
            key={emp.id}
            style={{
              padding: 8,
              borderBottom: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{emp.name}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => editEmployee(emp.id, emp.name)}
                style={{
                  background: "#10b981",
                  border: "none",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                ✏️
              </button>
              <button
                onClick={() => deleteEmployee(emp.id)}
                style={{
                  background: "#ef4444",
                  border: "none",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={() => navigate("/calendar")}
        style={{
          marginTop: 20,
          background: "#3b82f6",
          color: "#fff",
          border: "none",
          padding: "8px 12px",
          borderRadius: 8,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        ← Kembali ke Kalender
      </button>
    </div>
  );
}
