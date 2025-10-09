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

  const getDisplayName = (email: string) => email.split("@")[0];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        background: "linear-gradient(135deg, #2563eb, #60a5fa)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "16px",
        boxSizing: "border-box",
        overflowX: "hidden", // ✅ cegah scroll horizontal di PC
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
          flexWrap: "wrap",
          marginBottom: 20,
          gap: 12,
        }}
      >
        <h2 style={{ color: "white", margin: 0 }}>👑 Dev Dashboard</h2>
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

      {/* Table wrapper */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          width: "100%",
          maxWidth: 800,
          overflowX: "auto",
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
              <th style={styles.th}>Nama</th>
              <th style={styles.th}>Role</th>
              <th style={styles.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} style={{ borderBottom: "1px solid #e5e7eb", textAlign: "center" }}>
                <td style={styles.td}>{getDisplayName(user.email)}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "6px 12px",
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
                      whiteSpace: "nowrap",
                    }}
                  >
                    {user.role}
                  </span>
                </td>
                <td style={styles.td}>
                  {user.role !== "dev" && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
                      <button
                        onClick={() => handleRoleChange(user.id, "admin")}
                        style={styles.btnGreen}
                      >
                        Admin
                      </button>
                      <button
                        onClick={() => handleRoleChange(user.id, "viewer")}
                        style={styles.btnGray}
                      >
                        Viewer
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
