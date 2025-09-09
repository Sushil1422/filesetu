import React, { useState } from "react";
import { auth, database } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set } from "firebase/database";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom"; // Keep Link for the static button, remove useNavigate
// import "./SignUp.css";

const SignUp = () => {
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "subadmin",
  });

  const { signup } = useAuth();
  // const navigate = useNavigate(); // Remove useNavigate initialization

  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState({ level: "", color: "" });
  const [successMessage, setSuccessMessage] = useState(""); // New state for success message
  const [errorMessage, setErrorMessage] = useState("");   // New state for error message

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });

    if (e.target.name === "password") {
      checkPasswordStrength(e.target.value);
    }
  };

  const checkPasswordStrength = (password) => {
    if (password.length < 6) {
      setStrength({ level: "Weak", color: "red" });
    } else if (password.match(/[A-Z]/) && password.match(/[0-9]/)) {
      setStrength({ level: "Strong", color: "green" });
    } else {
      setStrength({ level: "Medium", color: "orange" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage(""); // Clear previous messages
    setErrorMessage("");   // Clear previous messages

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage("Passwords do not match!");
      return;
    }

    try {
      // Use the signup function from AuthContext
      await signup(formData.email, formData.password, {
        name: formData.fullName,
        mobile: formData.phone,
        role: formData.role, // Pass the selected role
      });

      setSuccessMessage("Account created successfully!");
      // No direct redirection here, user will click a link
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <>
      <div className="background-overlay"></div>
      <div className="signup-container">
        <h2>Create Account</h2>
        {successMessage && (
          <div style={{ backgroundColor: '#4CAF50', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>
            {successMessage}
          </div>
        )}
        {errorMessage && <div style={{ backgroundColor: '#f44336', color: 'white', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>{errorMessage}</div>}
        <form onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input
            type="text"
            name="fullName"
            value={formData.fullName}
            onChange={handleChange}
            required
          />

          <label>Mobile Number</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />

          <label>Email Address</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label>Password</label>
          <div className="password-container">
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
            <span
              className="toggle-visibility"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? "🙈" : "👁"}
            </span>
          </div>
          <div className="strength-bar" style={{ background: strength.color }}></div>
          <p className="strength-text">{strength.level}</p>

          <label>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />

          <label>Account Role</label>
          <select name="role" value={formData.role} onChange={handleChange}>
            <option value="admin">Admin</option>
            <option value="subadmin">Sub Administrator</option>
            {/* <option value="User">User</option> */}
          </select>

          <button type="submit">Create Account</button>
        </form>
        <p style={{textAlign: 'center', marginTop: '15px'}}>Already have an account? <Link to="/login" style={{ color: '#8a7dff', textDecoration: 'none', fontWeight: 'bold' }}>Login</Link></p>
      </div>

      <style>{`
       .background-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-image: url('/damimg.jpg');
  background-size: cover;
  background-position: center;
  filter: brightness(0.35) blur(2px);
  z-index: -1;
}

/* Card with glassmorphism */
.signup-container {
  max-width: 480px;
  margin: 60px auto;
  padding: 35px 30px;
  border-radius: 16px;
  backdrop-filter: blur(18px) saturate(180%);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0px 12px 30px rgba(0,0,0,0.3);
  font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  color: #fff;
  animation: fadeIn 0.6s ease-in-out;
}

.signup-container h2 {
  text-align: center;
  margin-bottom: 25px;
  font-size: 26px;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 1px;
}

/* Form layout */
.signup-container form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* Labels */
.signup-container label {
  font-size: 14px;
  font-weight: 500;
  color: #ddd;
  margin-left: 2px;
  margin-bottom: 5px;
}

/* Inputs / Select dropdown */
.signup-container input,
.signup-container select {
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  font-size: 15px;
  color: #fff;
  outline: none;
  transition: 0.3s ease;
}

.signup-container input::placeholder {
  color: rgba(255,255,255,0.6);
}

.signup-container input:focus,
.signup-container select:focus {
  border-color: #8a7dff;
  box-shadow: 0px 0px 8px rgba(138,125,255,0.6);
  background: rgba(255, 255, 255, 0.12);
}

/* Password visibility toggle */
.password-container {
  position: relative;
  display: flex;
  align-items: center;
}

.password-container input {
  width: 100%;
  padding-right: 42px;
}

.password-container .toggle-visibility {
  position: absolute;
  right: 12px;
  cursor: pointer;
  font-size: 18px;
  user-select: none;
  color: #8a7dff;
  transition: transform 0.2s;
}

.password-container .toggle-visibility:hover {
  transform: scale(1.1);
  color: #fff;
}

/* Password Strength Bar */
.strength-bar {
  height: 7px;
  border-radius: 5px;
  margin: 4px 0;
  transition: all 0.3s ease-in-out;
}

.strength-text {
  font-size: 13px;
  font-style: italic;
  color: #ddd;
  margin-bottom: 10px;
}

/* Submit button */
.signup-container button {
  padding: 14px;
  margin-top: 10px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 1px;
  cursor: pointer;
  background: linear-gradient(135deg, #6a5acd, #8a7dff, #937dff);
  color: white;
  box-shadow: 0 4px 15px rgba(106,90,205,0.5);
  transition: all 0.3s ease;
}

.signup-container button:hover {
  background: linear-gradient(135deg, #8a7dff, #6a5acd);
  box-shadow: 0 6px 20px rgba(106,90,205,0.7);
  transform: translateY(-2px);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

      `}</style>
    </>
  );
};

export default SignUp;
