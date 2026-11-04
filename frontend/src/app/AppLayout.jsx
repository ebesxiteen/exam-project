import { useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { authApi } from "../features/auth/authApi.js";
import { ROLE_LABEL, useAuth } from "../features/auth/AuthContext.jsx";
import { Alert, Button } from "../shared/ui";
import styles from "./AppLayout.module.css";

function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (next.length < 6) { setError("Mật khẩu mới phải ít nhất 6 ký tự"); return; }
    setLoading(true);
    try {
      await authApi.changePassword(current, next);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "var(--color-surface, #fff)", padding: "1.5rem", borderRadius: "8px", minWidth: "320px", maxWidth: "400px", width: "90%" }}>
        <h3 style={{ margin: "0 0 1rem" }}>Đổi mật khẩu</h3>
        {success ? (
          <>
            <p style={{ color: "green" }}>Đổi mật khẩu thành công!</p>
            <Button onClick={onClose}>Đóng</Button>
          </>
        ) : (
          <form onSubmit={submit}>
            {error && <Alert style={{ marginBottom: "0.75rem" }}>{error}</Alert>}
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem" }}>Mật khẩu hiện tại</label>
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)}
                required style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px" }} />
            </div>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem" }}>Mật khẩu mới</label>
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)}
                required minLength={6} style={{ width: "100%", padding: "0.5rem", boxSizing: "border-box", border: "1px solid #ccc", borderRadius: "4px" }} />
            </div>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>Hủy</Button>
              <Button type="submit" disabled={loading}>{loading ? "Đang lưu..." : "Lưu"}</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/** Khung chung cho các trang sau đăng nhập: thanh trên cùng + vùng nội dung (<Outlet />). */
export default function AppLayout() {
  const { user, logout } = useAuth();
  const [showChangePw, setShowChangePw] = useState(false);

  return (
    <div>
      <header className={styles.topbar}>
        <Link to="/" className={styles.brand}>
          Thi trực tuyến
        </Link>
        <span>
          {user.full_name} <em>({ROLE_LABEL[user.role]})</em>
          <Button variant="link" onClick={() => setShowChangePw(true)}>
            Đổi mật khẩu
          </Button>
          <Button variant="link" onClick={logout}>
            Đăng xuất
          </Button>
        </span>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      {showChangePw && <ChangePasswordModal onClose={() => setShowChangePw(false)} />}
    </div>
  );
}
