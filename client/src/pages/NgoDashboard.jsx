import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NgoDashboard.css";

export default function NgoDashboard() {
  const [user, setUser] = useState(null);
  const [availableDonations, setAvailableDonations] = useState([]);
  const [claimedDonations, setClaimedDonations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState(null);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info"); // "info" or "error"
  const [activeTab, setActiveTab] = useState("available"); // "available" | "claimed"
  const navigate = useNavigate();

  // 1. Fetch authenticated user profile
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

  // 2. Fetch available and claimed donations
  const reloadData = async () => {
    try {
      const [availRes, claimedRes] = await Promise.all([
        fetch("https://sharemeal-1qz0.onrender.com/api/donations/available", {
          method: "GET",
          credentials: "include",
        }),
        fetch("https://sharemeal-1qz0.onrender.com/api/donations/claimed", {
          method: "GET",
          credentials: "include",
        }),
      ]);

      if (availRes.ok) {
        const availData = await availRes.json();
        setAvailableDonations(Array.isArray(availData.donations) ? availData.donations : []);
      } else {
        setAvailableDonations([]);
      }

      if (claimedRes.ok) {
        const claimedData = await claimedRes.json();
        setClaimedDonations(Array.isArray(claimedData.donations) ? claimedData.donations : []);
      } else {
        setClaimedDonations([]);
      }
    } catch (e) {
      console.error("Failed to load NGO donations:", e);
      setMsg("Unable to connect to the server. Please check your connection.");
      setMsgType("error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function fetchNgoDataOnMount() {
      try {
        const [availRes, claimedRes] = await Promise.all([
          fetch("https://sharemeal-1qz0.onrender.com/api/donations/available", {
            method: "GET",
            credentials: "include",
          }),
          fetch("https://sharemeal-1qz0.onrender.com/api/donations/claimed", {
            method: "GET",
            credentials: "include",
          }),
        ]);

        if (ignore) return;

        if (availRes.ok) {
          const availData = await availRes.json();
          setAvailableDonations(Array.isArray(availData.donations) ? availData.donations : []);
        } else {
          setAvailableDonations([]);
        }

        if (claimedRes.ok) {
          const claimedData = await claimedRes.json();
          setClaimedDonations(Array.isArray(claimedData.donations) ? claimedData.donations : []);
        } else {
          setClaimedDonations([]);
        }
      } catch (e) {
        if (!ignore) {
          console.error("Failed to load NGO donations:", e);
          setMsg("Unable to connect to the server. Please check your connection.");
          setMsgType("error");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    fetchNgoDataOnMount();
    return () => {
      ignore = true;
    };
  }, []);

  // 3. Claim donation handler
  const handleClaim = async (donationId) => {
    if (!user) {
      setMsg("Please log in with an NGO account to claim donations.");
      setMsgType("error");
      return;
    }
    if (user.role !== "ngo") {
      setMsg("Only registered NGO accounts can claim food donations. Donors cannot claim donations.");
      setMsgType("error");
      return;
    }

    setClaimingId(donationId);
    setMsg("");

    try {
      const res = await fetch(`https://sharemeal-1qz0.onrender.com/api/donations/${donationId}/claim`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Failed to claim donation.");
      }

      setMsg(data?.message || "Donation claimed successfully!");
      setMsgType("info");

      // Optimistically add claimed item to claimed list, remove from available, and switch to claimed tab
      if (data?.donation) {
        setClaimedDonations((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          const exists = list.some((item) => item._id === data.donation._id);
          return exists ? list : [data.donation, ...list];
        });
        setAvailableDonations((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          return list.filter((item) => item._id !== donationId);
        });
      }
      setActiveTab("claimed");
      await reloadData();
    } catch (err) {
      setMsg(err.message || "Failed to claim donation.");
      setMsgType("error");
      await reloadData();
    } finally {
      setClaimingId(null);
    }
  };

  const safeAvailable = Array.isArray(availableDonations) ? availableDonations : [];
  const safeClaimed = Array.isArray(claimedDonations) ? claimedDonations : [];
  const totalClaimedQuantity = safeClaimed.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

  return (
    <div className="ngo-dashboard-page">
      {/* Top Navigation */}
      <nav className="dd-navbar">
        <a href="/" className="dd-logo">
          <span className="dd-logo-icon">🥗</span> ShareMeal
        </a>

        <div className="dd-nav-actions">
          {user && (
            <div className="dd-user-badge">
              <span className="dd-user-dot"></span>
              {user.name} ({user.role?.toUpperCase() || "NGO"})
            </div>
          )}
          {user?.role === "donor" && (
            <a href="/donor" className="dd-back-link">
              Go to Donor Portal
            </a>
          )}
          <button className="dd-back-link" onClick={() => navigate('/')}>← Back to Home</button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="dd-main">
        {/* Page Header */}
        <header className="dd-header">
          <span className="dd-eyebrow">RECIPIENT & NGO PORTAL</span>
          <h1 className="dd-title">
            {user ? `Welcome, ${user.name}` : "NGO Food Dashboard"}
          </h1>
          <p className="dd-subtitle">
            Find and claim fresh surplus food donations listed by community donors. Coordinate
            pickups and direct meals to individuals and families who need them.
          </p>
        </header>

        {/* Role Notice Banner for Donors or Guests */}
        {user && user.role !== "ngo" && (
          <div className="ngo-role-banner" role="alert">
            <div>
              <strong>Note:</strong> You are currently logged in as a <strong>{user.role}</strong>. Only NGO accounts can claim food donations.
            </div>
            <a href="/donor">Go to Donor Dashboard →</a>
          </div>
        )}

        {!user && !loading && (
          <div className="ngo-role-banner" role="alert">
            <div>
              <strong>Session note:</strong> Please log in with your registered NGO account to claim food donations.
            </div>
            <a href="/">Log in on Homepage →</a>
          </div>
        )}

        {/* Status Notification Alert */}
        {msg && (
          <div
            className={`dd-alert ${msgType === "error" ? "dd-alert-error" : "dd-alert-info"}`}
            role="status"
          >
            <span>{msg}</span>
          </div>
        )}

        {/* Statistics Grid */}
        <section className="dd-stats-grid">
          <article className="dd-stat-card">
            <div className="dd-stat-icon">🍲</div>
            <div className="dd-stat-content">
              <span className="dd-stat-number">{safeAvailable.length}</span>
              <span className="dd-stat-label">Available Donations</span>
            </div>
          </article>

          <article className="dd-stat-card">
            <div className="dd-stat-icon">📦</div>
            <div className="dd-stat-content">
              <span className="dd-stat-number">{safeClaimed.length}</span>
              <span className="dd-stat-label">Your Claimed Donations</span>
            </div>
          </article>

          <article className="dd-stat-card">
            <div className="dd-stat-icon">🥗</div>
            <div className="dd-stat-content">
              <span className="dd-stat-number">{totalClaimedQuantity}</span>
              <span className="dd-stat-label">Total Meals Secured</span>
            </div>
          </article>
        </section>

        {/* Tabs Navigation */}
        <nav className="dd-tabs-nav" aria-label="Donations View">
          <button
            type="button"
            className={`dd-tab-btn ${activeTab === "available" ? "active" : ""}`}
            onClick={() => setActiveTab("available")}
          >
            Available Donations ({safeAvailable.length})
          </button>
          <button
            type="button"
            className={`dd-tab-btn ${activeTab === "claimed" ? "active" : ""}`}
            onClick={() => setActiveTab("claimed")}
          >
            Your Claimed Donations ({safeClaimed.length})
          </button>
        </nav>

        {/* TAB 1: Available Donations */}
        {activeTab === "available" && (
          <section className="dd-card">
            <div className="dd-card-header">
              <h2 className="dd-card-title">
                Available Food Donations
                <span className="dd-count-pill">{safeAvailable.length} available</span>
              </h2>
              <p className="dd-card-subtitle">
                Surplus food listed by donors that is available for immediate claiming and pickup.
              </p>
            </div>

            {loading ? (
              <div className="dd-empty-state">
                <p>Loading available donations...</p>
              </div>
            ) : safeAvailable.length === 0 ? (
              <div className="dd-empty-state">
                <div className="dd-empty-icon">🍲</div>
                <h3 className="dd-empty-title">No available donations right now</h3>
                <p className="dd-empty-text">
                  All listed donations have either been claimed or no new surplus meals have been
                  posted yet. Check back soon!
                </p>
              </div>
            ) : (
              <div className="dd-table-wrapper">
                <table className="dd-table">
                  <thead>
                    <tr>
                      <th>Food Item Details</th>
                      <th>Qty</th>
                      <th>Expiry</th>
                      <th>Pickup Location</th>
                      <th>Donor / Contact</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeAvailable.map((d) => {
                      const isOwner = user && d.donor && (d.donor._id === user.id || d.donor === user.id);
                      return (
                        <tr key={d._id}>
                          <td>
                            <div className="dd-table-title">{d.title}</div>
                            {d.description && (
                              <div className="dd-table-meta">{d.description}</div>
                            )}
                          </td>
                          <td>
                            <span className="dd-qty-badge">{d.quantity} meals</span>
                          </td>
                          <td>
                            {d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : "—"}
                          </td>
                          <td>{d.pickupAddress || d.location || "—"}</td>
                          <td>
                            <div className="dd-donor-chip">
                              <span className="dd-donor-name">
                                {d.donor?.name || "Verified Donor"}
                              </span>
                              {d.contactInfo && <div>{d.contactInfo}</div>}
                            </div>
                          </td>
                          <td>
                            <span className="dd-status dd-status-available">
                              {d.status || "available"}
                            </span>
                          </td>
                          <td>
                            {isOwner ? (
                              <button
                                type="button"
                                className="dd-btn-claim"
                                disabled
                                title="You created this donation"
                              >
                                Your Listing
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleClaim(d._id)}
                                disabled={claimingId === d._id || (user && user.role !== "ngo")}
                                className="dd-btn-claim"
                              >
                                {claimingId === d._id ? "Claiming..." : "Claim Donation"}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* TAB 2: Claimed Donations */}
        {activeTab === "claimed" && (
          <section className="dd-card">
            <div className="dd-card-header">
              <h2 className="dd-card-title">
                Your Claimed Donations
                <span className="dd-count-pill">{safeClaimed.length} claimed</span>
              </h2>
              <p className="dd-card-subtitle">
                Donations you have claimed for pickup and community redistribution.
              </p>
            </div>

            {loading ? (
              <div className="dd-empty-state">
                <p>Loading your claimed donations...</p>
              </div>
            ) : safeClaimed.length === 0 ? (
              <div className="dd-empty-state">
                <div className="dd-empty-icon">📦</div>
                <h3 className="dd-empty-title">You haven't claimed any donations yet</h3>
                <p className="dd-empty-text">
                  Switch to the "Available Donations" tab above and click "Claim Donation" to
                  reserve surplus food for your community.
                </p>
              </div>
            ) : (
              <div className="dd-table-wrapper">
                <table className="dd-table">
                  <thead>
                    <tr>
                      <th>Food Item Details</th>
                      <th>Qty</th>
                      <th>Expiry</th>
                      <th>Pickup Address</th>
                      <th>Donor Contact</th>
                      <th>Status</th>
                      <th>Claimed On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {safeClaimed.map((d) => (
                      <tr key={d._id}>
                        <td>
                          <div className="dd-table-title">{d.title}</div>
                          {d.description && (
                            <div className="dd-table-meta">{d.description}</div>
                          )}
                        </td>
                        <td>
                          <span className="dd-qty-badge">{d.quantity} meals</span>
                        </td>
                        <td>
                          {d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : "—"}
                        </td>
                        <td>{d.pickupAddress || d.location || "—"}</td>
                        <td>
                          <div className="dd-donor-chip">
                            <span className="dd-donor-name">
                              {d.donor?.name || "Donor"}
                            </span>
                            {d.contactInfo && <div>{d.contactInfo}</div>}
                          </div>
                        </td>
                        <td>
                          <span className="dd-status dd-status-claimed">
                            {d.status || "claimed"}
                          </span>
                        </td>
                        <td>
                          {d.updatedAt ? new Date(d.updatedAt).toLocaleDateString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Footer */}
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
