import React, { useEffect, useState } from "react";
import { collection, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebaseConfig";
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";

interface UserRole {
  id: string;
  email: string;
  role: string;
}

export default function Dashboard() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const navigate = useNavigate();

  // 🔄 Ambil data user secara real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "roles"), (snapshot) => {
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<UserRole, "id">),
      }));
      setUsers(data);
    });
    return () => unsub();
  }, []);

  // 🔁 Ubah role user
  async function handleRoleChange(uid: string, newRole: string) {
    const userRef = doc(db, "roles", uid);
    await updateDoc(userRef, { role: newRole });
    console.log(`✅ Role user ${uid} diubah menjadi ${newRole}`);
  }

  // 🚪 Logout dev
  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

  // 🧠 Helper: tampilkan nama user tanpa domain email
  function formatName(email: string) {
    return email.split("@")[0]; // contoh: padma@contoh.com → "padma"
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>👑 Dev Dashboard – Manajemen Role</h2>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>

      {/* Tabel user */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>Nama</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={styles.tr}>
                <td style={styles.td}>{formatName(user.email)}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.roleBadge,
                      backgroundColor:
                        user.role === "dev"
                          ? "#2563eb"
                          : user.role === "admin"
                          ? "#10b981"
                          : "#6b7280",
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td style={styles.td}>
                  {user.role !== "dev" && (
                    <div style={styles.btnGroup}>
                      <button
                        onClick={() => handleRoleChange(user.id, "admin")}
                        style={styles.btnPrimary}
                      >
                        Jadikan Admin
                      </button>
                      <button
                        onClick={() => handleRoleChange(user.id, "viewer")}
                        style={styles.btnSecondary}
                      >
                        Jadikan Viewer
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 💅 Styling responsif untuk desktop & mobile
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #1e3a8a, #3b82f6)",
    padding: "20px",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  title: {
    color: "#fff",
    fontSize: 20,
    margin: 0,
  },
  logoutBtn: {
    background: "#ef4444",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontWeight: 600,
    cursor: "pointer",
  },
  tableWrapper: {
    background: "#fff",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  tableHeader: {
    background: "#f3f4f6",
  },
  th: {
    textAlign: "left",
    padding: 10,
    fontWeight: 700,
    color: "#1f2937",
    fontSize: 14,
  },
  tr: {
    borderBottom: "1px solid #e5e7eb",
  },
  td: {
    padding: 10,
    fontSize: 14,
  },
  roleBadge: {
    padding: "4px 8px",
    borderRadius: 6,
    color: "#fff",
    fontWeight: 600,
    textTransform: "capitalize",
  },
  btnGroup: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  btnPrimary: {
    background: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 10px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnSecondary: {
    background: "#6b7280",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "6px 10px",
    fontWeight: 600,
    cursor: "pointer",
  },
};
