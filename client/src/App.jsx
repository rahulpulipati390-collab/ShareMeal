
import { useState, useEffect, useRef } from "react";
import "./App.css";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import DonorDashboard from "./pages/DonorDashboard";
import NgoDashboard from "./pages/NgoDashboard";
import VolunteerDashboard from "./pages/VolunteerDashboard";

function App() {
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "donor",
  });
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleLoginChange(e) {
    setLoginForm({ ...loginForm, [e.target.name]: e.target.value });
  }

  function openSignup() {
    setShowSignup(true);
    setShowLogin(false);
    setMessage("");
  }

  function openLogin() {
    setShowLogin(true);
    setShowSignup(false);
    setMessage("");
  }

  function closeForms() {
    setShowSignup(false);
    setShowLogin(false);
    setMessage("");
  }

  async function handleSignup(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/signup",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(form),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Signup failed.");
      }

      setMessage("Account created successfully! Please log in.");
      setForm({
        name: "",
        email: "",
        password: "",
        role: "donor",
      });
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  const navigate = useNavigate();
  const location = useLocation();

    const hasRedirected = useRef(false);
  // On first page load, if user is already authenticated on the landing page, route to their role dashboard.
  // Subsequent navigation to '/' (e.g., via Back button) will no longer auto‑redirect, allowing the Home page to be viewed.
  useEffect(() => {
    if (!hasRedirected.current && location.pathname === "/") {
      hasRedirected.current = true;
      fetch("http://localhost:5000/api/auth/me", {
        method: "GET",
        credentials: "include",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.user && data.user.role) {
            const role = data.user.role;
            if (role === "ngo") {
              navigate("/ngo", { replace: true });
            } else if (role === "volunteer") {
              navigate("/volunteer", { replace: true });
            } else {
              navigate("/donor", { replace: true });
            }
          }
        })
        .catch(() => {});
    }
  }, [location.pathname, navigate]);


  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(loginForm),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      setMessage(data.message || "Login successful!");
      setLoginForm({ email: "", password: "" });

      // fetch user profile
      const meRes = await fetch("http://localhost:5000/api/auth/me", {
        method: "GET",
        credentials: "include",
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        const role = meData.user?.role;
        console.log('Redirecting user based on role:', role);
        if (role === 'ngo') {
          navigate('/ngo');
        } else if (role === 'volunteer') {
          navigate('/volunteer');
        } else {
          navigate('/donor');
        }
        closeForms();
      }
    } catch (error) {
      setMessage(error.message || "Unable to connect to the server.");
    } finally {
      setLoading(false);
    }
  }

    return (
    
      <Routes>
        <Route path="/" element={
          <div className="app">
            <nav className="navbar">
              <a className="logo" href="#home">
                <span className="logo-icon">🥗</span> ShareMeal
              </a>

              <div className="nav-links">
                <a href="#how-it-works">How it works</a>
                <a href="#impact">Our impact</a>

                <button className="login-btn" onClick={openLogin}>
                  Login
                </button>

                <button className="login-btn" onClick={openSignup}>
                  Get Started
                </button>
              </div>
            </nav>

            <main id="home">
              <section className="hero">
                <div className="hero-content">
                  <span className="eyebrow">LESS WASTE. MORE HOPE.</span>

                  <h1>
                    Good food deserves
                    <br />
                    a <span>second chance.</span>
                  </h1>

                  <p>
                    Connect surplus food with people who need it.
                    ShareMeal brings donors, NGOs and volunteers together
                    to make every meal count.
                  </p>

                  <div className="hero-actions" id="get-started">
                    <button className="primary-btn" onClick={openSignup}>
                      Donate Food <span>→</span>
                    </button>

                    <button className="secondary-btn" onClick={openSignup}>
                      Find Food
                    </button>
                  </div>

                  <div className="trust-note">
                    <span className="trust-icon">✓</span>
                    Connecting communities, one meal at a time
                  </div>
                </div>

                <div className="hero-visual">
                  <div className="food-circle">
                    <div className="food-emoji">🥗</div>
                  </div>

                  <div className="floating-card card-top">
                    <span className="float-icon">🍱</span>
                    <div>
                      <strong>Fresh food, shared</strong>
                      <small>Give surplus a purpose</small>
                    </div>
                  </div>

                  <div className="floating-card card-bottom">
                    <span className="float-icon">💚</span>
                    <div>
                      <strong>Small act, big impact</strong>
                      <small>Every meal matters</small>
                    </div>
                  </div>

                  <span className="decor decor-one">✳</span>
                  <span className="decor decor-two">✦</span>
                </div>
              </section>

              <section className="impact" id="impact">
                <div className="impact-heading">
                  <span className="eyebrow">WHY SHAREMEAL?</span>
                  <h2>A little sharing goes a long way.</h2>
                </div>

                <div className="impact-grid">
                  <article className="impact-card">
                    <span className="impact-icon">🍲</span>
                    <h3>Reduce food waste</h3>
                    <p>Give surplus food a chance to nourish someone.</p>
                  </article>

                  <article className="impact-card">
                    <span className="impact-icon">🤝</span>
                    <h3>Support communities</h3>
                    <p>Help NGOs reach people who need food support.</p>
                  </article>

                  <article className="impact-card">
                    <span className="impact-icon">🌱</span>
                    <h3>Create real impact</h3>
                    <p>Bring donors and volunteers together for good.</p>
                  </article>
                </div>
              </section>

              <section className="how-section" id="how-it-works">
                <span className="eyebrow">SIMPLE. MEANINGFUL. TOGETHER.</span>
                <h2>Three steps to share a meal.</h2>

                <div className="steps-grid">
                  <article>
                    <span>01</span>
                    <h3>Donate</h3>
                    <p>Food donors list their available surplus food.</p>
                  </article>

                  <article>
                    <span>02</span>
                    <h3>Connect</h3>
                    <p>NGOs find suitable donations and coordinate pickup.</p>
                  </article>

                  <article>
                    <span>03</span>
                    <h3>Deliver</h3>
                    <p>Volunteers help food reach the community.</p>
                  </article>
                </div>
              </section>

              {showSignup && (
                <section className="signup-section" id="signup">
                  <form className="signup-form" onSubmit={handleSignup}>
                    <button
                      type="button"
                      className="close-signup"
                      onClick={closeForms}
                      aria-label="Close signup form"
                    >
                      ✕
                    </button>

                    <span className="eyebrow">JOIN SHAREMEAL</span>
                    <h2>Create your account</h2>
                    <p>Be part of a community that shares food and kindness.</p>

                    <label htmlFor="name">Full name</label>
                    <input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Enter your name"
                      autoComplete="name"
                      required
                    />

                    <label htmlFor="signup-email">Email address</label>
                    <input
                      id="signup-email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="Enter your email"
                      autoComplete="email"
                      required
                    />

                    <label htmlFor="signup-password">Password</label>
                    <input
                      id="signup-password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="At least 6 characters"
                      minLength={6}
                      autoComplete="new-password"
                      required
                    />

                    <label htmlFor="role">I want to join as</label>
                    <select
                      id="role"
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      required
                    >
                      <option value="donor">Food Donor</option>
                      <option value="ngo">NGO</option>
                      <option value="volunteer">Volunteer</option>
                    </select>

                    <button
                      type="submit"
                      className="primary-btn signup-submit"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Create Account"}
                    </button>

                    {message && (
                      <p className="signup-message" role="status">
                        {message}
                      </p>
                    )}

                    <p>
                      Already have an account?{" "}
                      <button type="button" onClick={openLogin}>
                        Log in
                      </button>
                    </p>
                  </form>
                </section>
              )}

              {showLogin && (
                <section className="signup-section" id="login">
                  <form className="signup-form" onSubmit={handleLogin}>
                    <button
                      type="button"
                      className="close-signup"
                      onClick={closeForms}
                      aria-label="Close login form"
                    >
                      ✕
                    </button>

                    <span className="eyebrow">WELCOME BACK</span>
                    <h2>Log in to ShareMeal</h2>
                    <p>Sign in to continue making a difference.</p>

                    <label htmlFor="login-email">Email address</label>
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      placeholder="Enter your email"
                      autoComplete="email"
                      required
                    />

                    <label htmlFor="login-password">Password</label>
                    <input
                      id="login-password"
                      name="password"
                      type="password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="submit"
                      className="primary-btn signup-submit"
                      disabled={loading}
                    >
                      {loading ? "Logging in..." : "Login"}
                    </button>

                    {message && (
                      <p className="signup-message" role="status">
                        {message}
                      </p>
                    )}

                    <p>
                      New to ShareMeal?{" "}
                      <button type="button" onClick={openSignup}>
                        Create an account
                      </button>
                    </p>
                  </form>
                </section>
              )}
            </main>

            <footer className="footer">
              <a className="logo" href="#home">
                🥗 ShareMeal
              </a>
              <p>Share food. Spread kindness. Make a difference.</p>
              <span>© 2026 ShareMeal</span>
            </footer>
          </div>
           } />
        <Route path="/donor" element={<DonorDashboard />} />
        <Route path="/ngo" element={<NgoDashboard />} />
        <Route path="/volunteer" element={<VolunteerDashboard />} />
      </Routes>
    
  );
}

export default App;
