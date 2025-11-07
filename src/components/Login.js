import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { sendPasswordResetEmail } from "firebase/auth";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, currentUser, userRole } = useAuth();
  const navigate = useNavigate();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [forgotPasswordError, setForgotPasswordError] = useState("");
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);

  useEffect(() => {
    if (currentUser && userRole) {
      if (userRole === "admin") {
        navigate("/dashboard");
      } else if (userRole === "subadmin") {
        navigate("/subadmin-dashboard");
      }
    }
  }, [currentUser, userRole, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      setLoading(true);
      await login(formData.email, formData.password);
    } catch (error) {
      setError("Failed to login: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordError("");
    setForgotPasswordSuccess(false);
    setLoading(true);

    const emailToSend = resetEmail || formData.email;

    if (!emailToSend) {
      setForgotPasswordError("Please enter your email address.");
      setLoading(false);
      return;
    }

    try {
      const { database } = await import("../firebase");
      const { ref, get } = await import("firebase/database");

      const usersRef = ref(database, "user");
      const snapshot = await get(usersRef);

      if (!snapshot.exists()) {
        setForgotPasswordError("No users found in database.");
        setLoading(false);
        return;
      }

      const users = snapshot.val();
      const userExists = Object.values(users).some(
        (user) => user.email === emailToSend
      );

      if (!userExists) {
        setForgotPasswordError(
          "Email address not found in our system. Please check your email or contact support."
        );
        setLoading(false);
        return;
      }

      await sendPasswordResetEmail(auth, emailToSend);
      setForgotPasswordSuccess(true);
    } catch (error) {
      setForgotPasswordError(
        "Failed to send password reset email: " + error.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
            overflow: hidden;
            background: #0b1020;
            color: #fff;
          }

          .modern-login-container {
            position: relative;
            isolation: isolate;
            min-height: 100dvh;
            width: 100%;
            display: grid;
            place-items: center;
            padding: 20px;
            overflow: hidden;
            background: radial-gradient(1200px 800px at 50% -10%, #1a1f3a 0%, transparent 60%),
                        linear-gradient(180deg, #0b1020 0%, #060812 100%);
          }

          .bg-fallback,
          .bg-video,
          .bg-overlay,
          .bg-grid,
          .bg-noise,
          .bg-blob {
            position: absolute;
            inset: 0;
            pointer-events: none;
          }

          .bg-fallback {
            z-index: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
            opacity: 0.8;
            filter: saturate(1) contrast(1) brightness(0.8);
          }

          .bg-video {
            z-index: 1;
            width: 100%;
            height: 100%;
            object-fit: cover;
            filter: saturate(1.2) contrast(1.05) brightness(0.75) hue-rotate(-5deg);
          }

          .blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(60px);
            opacity: 0.65;
            mix-blend-mode: screen;
            transform: translateZ(0);
            animation: float 24s ease-in-out infinite;
          }

          .blob-1 {
            z-index: 2;
            width: 45vw; height: 45vw; max-width: 680px; max-height: 680px;
            top: -10%; left: -10%;
            background: radial-gradient(circle at 30% 30%, rgba(120,119,198,0.9), rgba(120,119,198,0.05) 60%);
            animation-delay: 0s;
          }

          .blob-2 {
            z-index: 2;
            width: 50vw; height: 50vw; max-width: 720px; max-height: 720px;
            bottom: -15%; right: -10%;
            background: radial-gradient(circle at 70% 40%, rgba(255,119,198,0.8), rgba(255,119,198,0.04) 60%);
            animation-delay: 6s;
          }

          .blob-3 {
            z-index: 2;
            width: 35vw; height: 35vw; max-width: 520px; max-height: 520px;
            top: 10%; right: 20%;
            background: radial-gradient(circle at 50% 50%, rgba(120,219,255,0.6), rgba(120,219,255,0.03) 60%);
            animation-delay: 12s;
          }

          @keyframes float {
            0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
            33%      { transform: translate3d(30px, -20px, 0) scale(1.05); }
            66%      { transform: translate3d(-20px, 25px, 0) scale(0.98); }
          }

          .bg-overlay {
            z-index: 3;
            background:
              radial-gradient(80% 60% at 50% 20%, rgba(12, 16, 32, 0.1) 0%, rgba(12, 16, 32, 0.65) 70%),
              linear-gradient(180deg, rgba(6, 8, 18, 0.4) 0%, rgba(6, 8, 18, 0.8) 100%);
            backdrop-filter: saturate(110%) brightness(95%);
            -webkit-backdrop-filter: saturate(110%) brightness(95%);
          }

          .bg-grid {
            z-index: 4;
            background-image:
              radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0);
            background-size: 36px 36px;
            opacity: 0.25;
            mix-blend-mode: overlay;
          }

          .bg-noise {
            z-index: 5;
            opacity: 0.04;
            background-image: url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAPElEQVQoz2NgwA38z8DAwMDwZ2B4KsxgZGBgYHxg+Y9F2GZg8J8rYxgYGBgYkJjGf9xYF0bEwhmM4gAAe0kD7x1Qq5gAAAABJRU5ErkJggg==");
            background-size: 200px 200px;
            image-rendering: pixelated;
          }

          .modern-login-form {
            position: relative;
            z-index: 10;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(20px) saturate(120%);
            -webkit-backdrop-filter: blur(20px) saturate(120%);
            border: 1px solid rgba(255, 255, 255, 0.16);
            padding: 3rem;
            border-radius: 24px;
            box-shadow:
              0 25px 45px rgba(0, 0, 0, 0.35),
              0 0 0 1px rgba(255, 255, 255, 0.06),
              inset 0 1px 0 rgba(255, 255, 255, 0.12);
            width: 100%;
            max-width: 460px;
            transform: translateY(0);
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            animation: slideUp 0.6s ease-out;
          }

          .modern-login-form::before {
            content: '';
            position: absolute;
            inset: -2px;
            border-radius: 26px;
            background: conic-gradient(from 180deg at 50% 50%, rgba(224, 204, 255, 0.3), rgba(57, 59, 178, 0.35), rgba(224, 204, 255, 0.3));
            filter: blur(18px);
            opacity: 0.35;
            z-index: -1;
          }

          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }

          .modern-login-form:hover {
            transform: translateY(-6px);
            box-shadow:
              0 35px 65px rgba(0, 0, 0, 0.45),
              0 0 0 1px rgba(255, 255, 255, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.18);
          }

          .modern-login-title {
            text-align: center;
            margin-bottom: 1rem;
            color: #ffffff;
            font-size: 2.4rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            background: linear-gradient(135deg, #ffffff, rgba(255,255,255,0.8));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          }

          .modern-login-subtitle {
            text-align: center;
            color: rgba(255, 255, 255, 0.8);
            font-size: 1.05rem;
            font-weight: 400;
            margin-bottom: 2rem;
            letter-spacing: 0.01em;
          }

          .modern-form-group { margin-bottom: 1.6rem; position: relative; }
          .modern-form-group label {
            display: block;
            margin-bottom: 0.75rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.9);
            font-size: 0.95rem;
            letter-spacing: 0.01em;
          }

          .modern-input-container { position: relative; }

          .modern-input-icon {
            position: absolute;
            left: 16px; top: 50%;
            transform: translateY(-50%);
            color: rgba(255, 255, 255, 0.6);
            width: 18px; height: 18px; z-index: 2;
          }

          .modern-form-group input {
            width: 100%;
            padding: 16px 20px 16px 50px;
            border: 1px solid rgba(255, 255, 255, 0.22);
            border-radius: 12px;
            font-size: 1rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            background: rgba(255, 255, 255, 0.08);
            color: #ffffff;
            outline: none;
            position: relative;
            font-family: inherit;
          }

          .modern-form-group input::placeholder {
            color: rgba(255, 255, 255, 0.55);
            transition: opacity 0.3s ease;
          }

          .modern-form-group input:focus {
            border-color: rgba(255, 255, 255, 0.45);
            background: rgba(255, 255, 255, 0.12);
            box-shadow:
              0 0 0 6px rgba(255, 255, 255, 0.08),
              0 12px 30px rgba(0, 0, 0, 0.25);
            transform: translateY(-1px);
          }

          .modern-form-group input:focus::placeholder { opacity: 0.75; }

          .password-toggle {
            position: absolute;
            right: 16px; top: 50%;
            transform: translateY(-50%);
            background: none; border: none;
            color: rgba(255, 255, 255, 0.7);
            cursor: pointer; padding: 4px; border-radius: 6px;
            transition: all 0.2s ease;
          }

          .password-toggle:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.12);
          }

          .modern-login-button {
            width: 100%;
            padding: 18px;
            background: linear-gradient(135deg, rgba(236, 72, 153, 0.22) 0%, rgba(99, 102, 241, 0.22) 50%, rgba(56, 189, 248, 0.22) 100%);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.35);
            border-radius: 12px;
            font-size: 1.08rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            letter-spacing: 0.01em;
            position: relative;
            overflow: hidden;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
          }

          .modern-login-button::before {
            content: '';
            position: absolute; top: 0; left: -100%;
            width: 100%; height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
            transition: left 0.5s;
          }
          .modern-login-button:hover::before { left: 100%; }
          .modern-login-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
            border-color: rgba(255, 255, 255, 0.5);
            background: linear-gradient(135deg, rgba(236, 72, 153, 0.32) 0%, rgba(99, 102, 241, 0.32) 50%, rgba(56, 189, 248, 0.32) 100%);
          }
          .modern-login-button:disabled {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
            cursor: not-allowed; transform: none;
            border-color: rgba(255, 255, 255, 0.2);
            color: rgba(255, 255, 255, 0.65);
          }

          .modern-error-message {
            background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(211, 47, 47, 0.22));
            border: 1px solid rgba(244, 67, 54, 0.35);
            color: #ffffff;
            padding: 14px 16px;
            border-radius: 12px;
            margin-bottom: 1.2rem;
            font-weight: 600;
            font-size: 0.95rem;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            animation: slideDown 0.25s ease-out;
            display: flex; align-items: center; gap: 10px;
          }

          .modern-success-message {
            background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(56, 142, 60, 0.22));
            border: 1px solid rgba(76, 175, 80, 0.35);
            color: #ffffff;
            padding: 14px 16px;
            border-radius: 12px;
            margin-bottom: 1.2rem;
            font-weight: 600;
            font-size: 0.95rem;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            animation: slideDown 0.25s ease-out;
            display: flex; align-items: center; gap: 10px;
          }

          .modern-loading-message {
            background: linear-gradient(135deg, rgba(33, 150, 243, 0.2), rgba(30, 136, 229, 0.22));
            border: 1px solid rgba(33, 150, 243, 0.35);
            color: #ffffff;
            padding: 14px 16px;
            border-radius: 12px;
            margin-bottom: 1.2rem;
            font-weight: 600;
            font-size: 0.95rem;
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            animation: slideDown 0.25s ease-out;
            display: flex; align-items: center; justify-content: center; gap: 12px;
          }

          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-16px); }
            to   { opacity: 1; transform: translateY(0); }
          }

          .modern-link-section {
            text-align: center;
            margin-top: 1.6rem;
            padding-top: 1.2rem;
            border-top: 1px solid rgba(255, 255, 255, 0.12);
          }

          .modern-link {
            color: rgba(255, 255, 255, 0.85);
            text-decoration: none;
            font-weight: 700;
            transition: all 0.25s ease;
            position: relative;
            font-size: 0.95rem;
          }
          .modern-link::after {
            content: '';
            position: absolute; width: 0; height: 2px; bottom: -2px; left: 50%;
            background: linear-gradient(135deg, #ffffff, rgba(255,255,255,0.8));
            transition: all 0.25s ease; transform: translateX(-50%);
          }
          .modern-link:hover { color: #ffffff; transform: translateY(-1px); }
          .modern-link:hover::after { width: 100%; }

          .modern-link-text {
            color: rgba(255, 255, 255, 0.75);
            font-size: 0.95rem;
          }

          .modern-spinner {
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-top: 3px solid #fff;
            border-radius: 50%;
            width: 22px; height: 22px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }

          @media (max-width: 768px) {
            .modern-login-container { padding: 16px; }
            .modern-login-form { padding: 2rem 1.5rem; border-radius: 20px; }
            .modern-login-title { font-size: 2rem; margin-bottom: 1rem; }
            .modern-form-group { margin-bottom: 1.3rem; }
            .modern-form-group input { padding: 14px 18px 14px 46px; font-size: 16px; }
            .modern-login-button { padding: 16px; font-size: 1rem; }
          }

          @media (max-width: 480px) {
            .modern-login-form { padding: 1.5rem 1rem; }
            .modern-login-title { font-size: 1.8rem; }
          }

          @media (prefers-contrast: high) {
            .modern-login-form {
              background: rgba(0, 0, 0, 0.85);
              border: 2px solid white;
            }
            .modern-form-group input {
              border: 2px solid white;
              background: rgba(0, 0, 0, 0.3);
            }
            .modern-login-button {
              background: white;
              color: black;
              border: 2px solid white;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              animation-iteration-count: 1 !important;
              transition-duration: 0.01ms !important;
              scroll-behavior: auto !important;
            }
            .bg-video { display: none; }
          }

          .modern-login-button:focus,
          .modern-form-group input:focus,
          .modern-link:focus,
          .password-toggle:focus {
            outline: 2px solid rgba(255, 255, 255, 0.85);
            outline-offset: 2px;
          }
        `}
      </style>

      <div className="modern-login-container">
        <img
          src="/media/login/poster.jpg"
          alt=""
          className="bg-fallback"
          aria-hidden="true"
        />
        <video
          className="bg-video"
          autoPlay
          muted
          loop
          playsInline
          poster="/media/login/poster.jpg"
        >
          <source src="/media/login/galaxy.webm" type="video/webm" />
          <source src="/media/login/galaxy.mp4" type="video/mp4" />
        </video>

        <div className="bg-blob blob blob-1" aria-hidden="true"></div>
        <div className="bg-blob blob blob-2" aria-hidden="true"></div>
        <div className="bg-blob blob blob-3" aria-hidden="true"></div>

        <div className="bg-overlay" aria-hidden="true"></div>
        <div className="bg-grid" aria-hidden="true"></div>
        <div className="bg-noise" aria-hidden="true"></div>

        <div className="modern-login-form">
          <h1 className="modern-login-title">Welcome Back</h1>
          <p className="modern-login-subtitle">
            {showForgotPassword
              ? "Reset your password"
              : "Sign in to your account"}
          </p>

          {error && (
            <div className="modern-error-message">
              <span>⚠️</span>
              {error}
            </div>
          )}

          {loading && (
            <div className="modern-loading-message">
              <div className="modern-spinner"></div>
              <span>Processing...</span>
            </div>
          )}

          {!loading && !showForgotPassword && (
            <form onSubmit={handleSubmit}>
              <div className="modern-form-group">
                <label htmlFor="email">Email Address</label>
                <div className="modern-input-container">
                  <svg
                    className="modern-input-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="modern-form-group">
                <label htmlFor="password">Password</label>
                <div className="modern-input-container">
                  <svg
                    className="modern-input-icon"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                  >
                    {showPassword ? (
                      <svg
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                        />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="modern-login-button"
              >
                {loading ? (
                  <>
                    <div className="modern-spinner"></div>
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>
          )}

          {!loading && !showForgotPassword && (
            <div className="modern-link-section">
              <button
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetEmail(formData.email);
                  setError("");
                }}
                className="modern-link"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Forgot Password?
              </button>
            </div>
          )}

          {!loading && showForgotPassword && (
            <div>
              {forgotPasswordError && (
                <div className="modern-error-message">
                  <span>⚠️</span>
                  {forgotPasswordError}
                </div>
              )}

              {forgotPasswordSuccess ? (
                <div className="modern-success-message">
                  <svg
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                    />
                  </svg>
                  Password reset email sent! Check your inbox.
                </div>
              ) : (
                <form onSubmit={handleForgotPassword}>
                  <div className="modern-form-group">
                    <label htmlFor="resetEmail">Email Address</label>
                    <div className="modern-input-container">
                      <svg
                        className="modern-input-icon"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
                        />
                      </svg>
                      <input
                        id="resetEmail"
                        name="resetEmail"
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="modern-login-button"
                  >
                    {loading ? (
                      <>
                        <div className="modern-spinner"></div>
                        Sending...
                      </>
                    ) : (
                      "Send Reset Email"
                    )}
                  </button>
                </form>
              )}

              <div className="modern-link-section">
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordError("");
                    setForgotPasswordSuccess(false);
                    setResetEmail("");
                  }}
                  className="modern-link"
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back to Login
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Login;
