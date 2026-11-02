import React, { useEffect, useState } from "react";
import "./NgoDashboard.css"; // Reuse dashboard styling for consistent clean UI

export default function VolunteerDashboard() {
  const [user, setUser] = useState(null);
  const [availableDonations, setAvailableDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("https://sharemeal-1qz0.onrender.com/api/auth/me", {
      method: "GET",
      credentials: "include",
    })
      .then(async (r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data && data.user) {
          setUser(data.user);
        } else {
          setUser(null);
        }
      })
      .catch((err) => {
        console.error("Auth check failed:", err);
        setUser(null);
      });
  }, []);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const res = await fetch("https://sharemeal-1qz0.onrender.com/api/donations/volunteer", {
        method: "GET",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableDonations(Array.isArray(data.donations) ? data.donations : []);
      } else {
        setAvailableDonations([]);
      }
    } catch (err) {
      console.error("Failed to load volunteer deliveries:", err);
      setMsg("Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadDeliveries();
    }
  }, [user]);

  const handleLogout = async () => {
    try {
      await fetch("https://sharemeal-1qz0.onrender.com/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    window.location.href = "/";
  };

  return (
    <div className="dd-dashboard">
      <nav className="dd-navbar">
        <a className="dd-logo" href="/">
          <span className="dd-logo-icon">🥗</span> ShareMeal
        </a>
        <div className="dd-nav-right">
          <span className="dd-user-badge">
            <span className="dd-badge-dot"></span>
            Volunteer Portal {user?.name ? `(${user.name})` : ""}
          </span>
          <button className="dd-btn-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>

      <main className="dd-container">
        <section className="dd-hero">
          <span className="dd-eyebrow">VOLUNTEER DASHBOARD</span>
          <h1>Welcome, {user?.name || "Volunteer"}!</h1>
          <p>
            Help bridge the gap between food donors and NGOs. View active meal donations ready for pickup and distribution.
          </p>
        </section>

        {msg && <div className="dd-alert dd-alert-info">{msg}</div>}

        <section className="dd-table-section">
          <div className="dd-table-header">
            <h2>Available Pickups & Deliveries</h2>
            <button className="dd-btn-refresh" onClick={loadDeliveries} disabled={loading}>
              {loading ? "Refreshing..." : "↻ Refresh"}
            </button>
          </div>

          {loading ? (
            <p className="dd-loading">Loading available deliveries...</p>
          ) : availableDonations.length === 0 ? (
            <p className="dd-empty">No food pickups currently available. Check back soon!</p>
          ) : (
            <div className="dd-table-wrapper">
              <table className="dd-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Pickup Location</th>
                    <th>Contact</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {availableDonations.map((d) => (
                    <tr key={d._id}>
                      <td>
                        <strong>{d.title}</strong>
                        {d.description && <div className="dd-table-meta">{d.description}</div>}
                      </td>
                      <td>
                        <span className="dd-qty-badge">{d.quantity} meals</span>
                      </td>
                      <td>{d.pickupAddress || d.location || "—"}</td>
                      <td>
                        {d.contactInfo ? (
                          <div className="dd-donor-chip">{d.contactInfo}</div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : "—"}
                      </td>
                      <td>
                        <span className="dd-status dd-status-available">
                          {d.status || "available"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      <footer className="dd-footer">
        <div className="dd-logo">
          <span className="dd-logo-icon">🥗</span> ShareMeal
        </div>
        <p>Share food. Spread kindness. Make a difference.</p>
        <span>© 2026 ShareMeal</span>
      </footer>
    </div>
  );
}

