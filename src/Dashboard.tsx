import React, { useEffect, useState } from "react";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "./firebaseConfig";
import { useNavigate } from "react-router-dom";

interface UserRole {
  id: string;
  email: string;
  role: string;
}

export default function Dashboard() {
  const [users, setUsers] = useState<UserRole[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const snapshot = await getDocs(collection(db, "roles"));
    const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as UserRole[];
    setUsers(data);
  }

  async function handleRoleChange(uid: string, newRole: string) {
    const userRef = doc(db, "roles", uid);
    await updateDoc(userRef, { role: newRole });
    await loadUsers();
  }

  async function handleLogout() {
    await signOut(auth);
    localStorage.removeItem("role");
    navigate("/login");
  }

  // Fungsi ambil nama depan user (tanpa domain email)
  function getDisplayName(email: string) {
    return email.split("@")[0]; // ambil sebelum '@'
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "20px",
        boxSizing: "border-box",
        overflowX: "hidden", // 🔒 hilangkan sisa background kanan
      }}
    >
      {/* Header */}
      <div
        style={{
          width: "100%",
          maxWidth: 800,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2 style={{ color: "white", margin: 0 }}>👑 Dev Dashboard – Manajemen Role</h2>
        <button
          onClick={handleLogout}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background: "#ef4444",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Logout
        </button>
      </div>

      {/* Tabel User */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 800,
          overflowX: "auto", // agar tabel bisa di-scroll di mobile
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: 360,
          }}
        >
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              <th style={styles.th}>Nama User</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                style={{
                  borderBottom: "1px solid #e5e7eb",
                  textAlign: "center",
                }}
              >
                <td style={styles.td}>{getDisplayName(user.email)}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 12,
                      background:
                        user.role === "dev"
                          ? "#2563eb"
                          : user.role === "admin"
                          ? "#16a34a"
                          : "#9ca3af",
                      color: "#fff",
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td style={styles.td}>
                  {user.role !== "dev" && (
                    <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
                      <button
                        onClick={() => handleRoleChange(user.id, "admin")}
                        style={styles.btnGreen}
                      >
                        Jadikan Admin
                      </button>
                      <button
                        onClick={() => handleRoleChange(user.id, "viewer")}
                        style={styles.btnGray}
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

const styles: Record<string, React.CSSProperties> = {
  th: {
    padding: "10px",
    fontSize: "14px",
    color: "#1f2937",
    textAlign: "center",
  },
  td: {
    padding: "10px",
    fontSize: "14px",
    color: "#374151",
    wordBreak: "break-word",
  },
  btnGreen: {
    background: "#16a34a",
    border: "none",
    color: "#fff",
    borderRadius: 6,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  },
  btnGray: {
    background: "#9ca3af",
    border: "none",
    color: "#fff",
    borderRadius: 6,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  },
};
