// src/components/LogBook.js
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getDatabase,
  ref as dbRef,
  onValue,
  push,
  set,
  update,
  remove,
} from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  Calendar,
  Plus,
  Save,
  X,
  Trash2,
  Clock,
  Download,
  Printer,
  Edit2,
  Car,
  Fuel,
  MapPin,
  User,
  FileText,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

/** ---------- Time helpers (12-hour) ---------- */
const HOURS_12 = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0")
);
const MINUTES = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0")
);
const PERIODS = ["AM", "PM"];

const to12hString = (h, m, p) => {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${p}`;
};

const twelveToMinutes = (t12) => {
  if (!t12) return null;
  const m = t12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (hh === 12) hh = 0;
  let mins = hh * 60 + mm;
  if (period === "PM") mins += 12 * 60;
  return mins;
};

const from24hTo12h = (t24) => {
  if (!t24 || !/^\d{2}:\d{2}$/.test(t24)) return t24;
  const [hStr, mStr] = t24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(
    2,
    "0"
  )} ${period}`;
};

const split12 = (t12) => {
  const m = t12?.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m)
    return {
      hh: String(m[1]).padStart(2, "0"),
      mm: m[2],
      pp: m[3].toUpperCase(),
    };
  return { hh: "12", mm: "00", pp: "AM" };
};

const LogBook = () => {
  const { currentUser } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "" });

  const printRef = useRef();

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    fuel: "",
    oil: "",
    depHour: "09",
    depMinute: "00",
    depPeriod: "AM",
    arrHour: "06",
    arrMinute: "00",
    arrPeriod: "PM",
    from: "",
    to: "",
    beforeMeterReading: "",
    afterMeterReading: "",
    kilometers: "",
    purpose: "",
    usedBy: "",
  });

  const [errors, setErrors] = useState({});

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "" }), 3000);
  };

  // Auto-calculate kilometers when meter readings change
  useEffect(() => {
    const before = parseFloat(formData.beforeMeterReading);
    const after = parseFloat(formData.afterMeterReading);

    if (!isNaN(before) && !isNaN(after) && after > before) {
      const calculated = (after - before).toFixed(1);
      setFormData((prev) => ({ ...prev, kilometers: calculated }));
    } else if (formData.beforeMeterReading && formData.afterMeterReading) {
      // Clear if invalid
      if (formData.kilometers) {
        setFormData((prev) => ({ ...prev, kilometers: "" }));
      }
    }
  }, [formData.beforeMeterReading, formData.afterMeterReading]);

  useEffect(() => {
    if (!currentUser) return;

    const db = getDatabase();
    const logbookRef = dbRef(db, `logbook/${currentUser.uid}`);

    const unsubscribe = onValue(
      logbookRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const logsArray = Object.entries(data)
            .map(([id, log]) => {
              let departureTime = log.departureTime;
              let arrivalTime = log.arrivalTime;
              if (/^\d{2}:\d{2}$/.test(log.departureTime || "")) {
                departureTime = from24hTo12h(log.departureTime);
              }
              if (/^\d{2}:\d{2}$/.test(log.arrivalTime || "")) {
                arrivalTime = from24hTo12h(log.arrivalTime);
              }
              return { id, ...log, departureTime, arrivalTime };
            })
            .sort((a, b) => new Date(b.date) - new Date(a.date));
          setLogs(logsArray);
        } else {
          setLogs([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching log entries:", err);
        showToast("Failed to load log entries", "error");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.date) newErrors.date = "Date is required";

    const dep12 = to12hString(
      formData.depHour,
      formData.depMinute,
      formData.depPeriod
    );
    const arr12 = to12hString(
      formData.arrHour,
      formData.arrMinute,
      formData.arrPeriod
    );

    const depMins = twelveToMinutes(dep12);
    const arrMins = twelveToMinutes(arr12);

    if (depMins == null) newErrors.departure = "Departure time is required";
    if (arrMins == null) newErrors.arrival = "Arrival time is required";
    if (depMins != null && arrMins != null && arrMins <= depMins) {
      newErrors.arrival = "Arrival must be after departure";
    }

    if (!formData.from?.trim())
      newErrors.from = "Starting location is required";
    if (!formData.to?.trim()) newErrors.to = "Destination is required";

    // Before meter reading validation
    if (!formData.beforeMeterReading) {
      newErrors.beforeMeterReading = "Before reading is required";
    } else if (
      isNaN(formData.beforeMeterReading) ||
      Number(formData.beforeMeterReading) < 0
    ) {
      newErrors.beforeMeterReading = "Enter a valid number";
    }

    // After meter reading validation
    if (!formData.afterMeterReading) {
      newErrors.afterMeterReading = "After reading is required";
    } else if (
      isNaN(formData.afterMeterReading) ||
      Number(formData.afterMeterReading) < 0
    ) {
      newErrors.afterMeterReading = "Enter a valid number";
    }

    // Check after > before
    const before = parseFloat(formData.beforeMeterReading);
    const after = parseFloat(formData.afterMeterReading);
    if (!isNaN(before) && !isNaN(after) && after <= before) {
      newErrors.afterMeterReading = "After reading must be greater than before";
    }

    if (!formData.kilometers) {
      newErrors.kilometers = "Kilometers is required";
    } else if (isNaN(formData.kilometers) || Number(formData.kilometers) <= 0) {
      newErrors.kilometers = "Enter a valid number";
    }

    if (!formData.purpose?.trim()) newErrors.purpose = "Purpose is required";
    if (!formData.usedBy?.trim()) newErrors.usedBy = "Driver name is required";

    if (formData.fuel && (isNaN(formData.fuel) || Number(formData.fuel) < 0)) {
      newErrors.fuel = "Enter a valid number";
    }
    if (formData.oil && (isNaN(formData.oil) || Number(formData.oil) < 0)) {
      newErrors.oil = "Enter a valid number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: "" }));
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      fuel: "",
      oil: "",
      depHour: "09",
      depMinute: "00",
      depPeriod: "AM",
      arrHour: "06",
      arrMinute: "00",
      arrPeriod: "PM",
      from: "",
      to: "",
      beforeMeterReading: "",
      afterMeterReading: "",
      kilometers: "",
      purpose: "",
      usedBy: "",
    });
    setErrors({});
    setIsEditing(false);
    setSelectedLog(null);
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Please fix all errors", "error");
      return;
    }

    const departureTime = to12hString(
      formData.depHour,
      formData.depMinute,
      formData.depPeriod
    );
    const arrivalTime = to12hString(
      formData.arrHour,
      formData.arrMinute,
      formData.arrPeriod
    );

    try {
      const db = getDatabase();
      const logbookRef = dbRef(db, `logbook/${currentUser.uid}`);
      const newLogRef = push(logbookRef);

      await set(newLogRef, {
        date: formData.date,
        fuel: formData.fuel,
        oil: formData.oil,
        departureTime,
        arrivalTime,
        from: formData.from,
        to: formData.to,
        beforeMeterReading: formData.beforeMeterReading,
        afterMeterReading: formData.afterMeterReading,
        kilometers: formData.kilometers,
        purpose: formData.purpose,
        usedBy: formData.usedBy,
        remarks: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      showToast("Log added successfully!", "success");
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error("Error adding log:", err);
      showToast("Failed to add log", "error");
    }
  };

  const handleUpdateLog = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast("Please fix all errors", "error");
      return;
    }

    const departureTime = to12hString(
      formData.depHour,
      formData.depMinute,
      formData.depPeriod
    );
    const arrivalTime = to12hString(
      formData.arrHour,
      formData.arrMinute,
      formData.arrPeriod
    );

    try {
      const db = getDatabase();
      const logRef = dbRef(db, `logbook/${currentUser.uid}/${selectedLog.id}`);

      await update(logRef, {
        date: formData.date,
        fuel: formData.fuel,
        oil: formData.oil,
        departureTime,
        arrivalTime,
        from: formData.from,
        to: formData.to,
        beforeMeterReading: formData.beforeMeterReading,
        afterMeterReading: formData.afterMeterReading,
        kilometers: formData.kilometers,
        purpose: formData.purpose,
        usedBy: formData.usedBy,
        remarks: "",
        updatedAt: new Date().toISOString(),
      });

      showToast("Log updated successfully!", "success");
      setShowAddModal(false);
      setShowDetailModal(false);
      resetForm();
    } catch (err) {
      console.error("Error updating log:", err);
      showToast("Failed to update log", "error");
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Are you sure you want to delete this log?")) return;
    try {
      const db = getDatabase();
      await remove(dbRef(db, `logbook/${currentUser.uid}/${id}`));
      showToast("Log deleted successfully!", "success");
      setShowDetailModal(false);
      resetForm();
    } catch (err) {
      console.error("Error deleting log:", err);
      showToast("Failed to delete log", "error");
    }
  };

  const handleLogClick = (log) => {
    setSelectedLog(log);
    setShowDetailModal(true);
  };

  const handleEditClick = () => {
    const depPieces = split12(selectedLog.departureTime);
    const arrPieces = split12(selectedLog.arrivalTime);

    setFormData({
      date: selectedLog.date,
      fuel: selectedLog.fuel || "",
      oil: selectedLog.oil || "",
      depHour: depPieces.hh,
      depMinute: depPieces.mm,
      depPeriod: depPieces.pp,
      arrHour: arrPieces.hh,
      arrMinute: arrPieces.mm,
      arrPeriod: arrPieces.pp,
      from: selectedLog.from,
      to: selectedLog.to,
      beforeMeterReading:
        selectedLog.beforeMeterReading || selectedLog.meterReading || "",
      afterMeterReading: selectedLog.afterMeterReading || "",
      kilometers: selectedLog.kilometers,
      purpose: selectedLog.purpose,
      usedBy: selectedLog.usedBy,
    });
    setIsEditing(true);
    setShowDetailModal(false);
    setShowAddModal(true);
  };

  // --- PRINT HTML (Hidden container for printing) ---
  const PrintContent = () => (
    <div ref={printRef} style={{ display: "none" }}>
      <div className="print-container">
        <h1 className="print-title">
          सरकारी मोटार वाहनांकरिता लॉग बुकचा नमुना
        </h1>
        <table className="print-table">
          <thead>
            <tr>
              <th className="w-idx" rowSpan="2">
                क्र.
              </th>
              <th className="w-date" rowSpan="2">
                तारीख
              </th>
              <th className="w-supply" colSpan="2">
                पुरवठा
              </th>
              <th className="w-dep" rowSpan="2">
                गाडी नेण्याची वेळ
              </th>
              <th className="w-arr" rowSpan="2">
                गाडी आल्याची वेळ
              </th>
              <th className="w-from" rowSpan="2">
                कोठून
              </th>
              <th className="w-to" rowSpan="2">
                कोठे
              </th>
              <th className="w-meter" colSpan="2">
                प्रवासापूर्वी व नंतरचे मिटरवरील पाठ्यांक
              </th>
              <th className="w-km" rowSpan="2">
                किती किलोमीटर
              </th>
              <th className="w-purpose" rowSpan="2">
                प्रवासाचा हेतू
              </th>
              <th className="w-user" rowSpan="2">
                गाडी कोणी वापरली
              </th>
              <th className="w-remark" rowSpan="2">
                शेरा
              </th>
            </tr>
            <tr>
              <th className="w-supply-child">जळण</th>
              <th className="w-supply-child">तेल</th>
              <th className="w-meter-child">पूर्वी</th>
              <th className="w-meter-child">नंतर</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, index) => (
              <tr key={log.id}>
                <td className="td-center">{index + 1}</td>
                <td>{new Date(log.date).toLocaleDateString("en-GB")}</td>
                <td className="td-center">{log.fuel || "-"}</td>
                <td className="td-center">{log.oil || "-"}</td>
                <td>{log.departureTime || ""}</td>
                <td>{log.arrivalTime || ""}</td>
                <td>{log.from || ""}</td>
                <td>{log.to || ""}</td>
                <td className="td-right">
                  {log.beforeMeterReading || log.meterReading || ""}
                </td>
                <td className="td-right">{log.afterMeterReading || ""}</td>
                <td className="td-center">
                  <strong>{log.kilometers || ""}</strong>
                </td>
                <td>{log.purpose || ""}</td>
                <td>{log.usedBy || ""}</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="print-footer">
          <p>
            <strong>Generated on:</strong>{" "}
            {new Date().toLocaleString("en-GB", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>
    </div>
  );

  // --- Print using window.print() on current page ---
  const handlePrint = () => {
    // Temporarily show print content
    const printElement = printRef.current;
    if (!printElement) return;

    printElement.style.display = "block";

    // Hide main content
    const mainContent = document.querySelector(".logbook-container");
    const originalDisplay = mainContent.style.display;
    mainContent.style.display = "none";

    // Trigger print
    window.print();

    // Restore after print
    setTimeout(() => {
      printElement.style.display = "none";
      mainContent.style.display = originalDisplay;
    }, 100);
  };

  // --- Download PDF ---
  const downloadPDF = async () => {
    try {
      showToast("Generating PDF...", "success");

      const printElement = printRef.current;
      if (!printElement) return;

      // Temporarily show for rendering
      printElement.style.display = "block";

      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(printElement, {
        backgroundColor: "#ffffff",
        scale: 2.5,
        useCORS: true,
        logging: false,
      });

      printElement.style.display = "none";

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF("l", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight, "", "FAST");

      const now = new Date();
      const filename = `Vehicle-LogBook-${String(now.getMonth() + 1).padStart(
        2,
        "0"
      )}-${now.getFullYear()}.pdf`;
      pdf.save(filename);

      showToast("PDF downloaded successfully!", "success");
    } catch (error) {
      console.error("PDF generation error:", error);
      showToast("Failed to generate PDF", "error");
    }
  };

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            className={`toast toast-${toast.type}`}
            initial={{ opacity: 0, y: -50, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -50, x: "-50%" }}
          >
            {toast.type === "success" ? (
              <CheckCircle size={20} />
            ) : (
              <AlertCircle size={20} />
            )}
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Print Content */}
      <PrintContent />

      {/* Main */}
      <motion.div
        className="logbook-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="logbook-header">
          <div className="logbook-header-left">
            <h2>
              <Car size={24} />
              Vehicle Log Book
            </h2>
            <p>Track and manage your daily vehicle records</p>
          </div>
          <div className="logbook-header-actions">
            {logs.length > 0 && (
              <>
                <motion.button
                  className="btn-action btn-print"
                  onClick={handlePrint}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title="Print"
                >
                  <Printer size={18} />
                  Print
                </motion.button>
                <motion.button
                  className="btn-action btn-download"
                  onClick={downloadPDF}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  title="Download PDF"
                >
                  <Download size={18} />
                  Download PDF
                </motion.button>
              </>
            )}
            <motion.button
              className="btn-add-log"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={18} />
              Add Log
            </motion.button>
          </div>
        </div>

        {loading ? (
          <div className="logbook-loading">
            <div className="spinner-logbook"></div>
            <p>Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="logbook-empty">
            <Car size={64} color="#94a3b8" />
            <h3>No Logs Yet</h3>
            <p>Start tracking your daily vehicle records</p>
            <button
              className="btn-empty-log"
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              <Plus size={18} />
              Create First Log
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="log-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Time</th>
                  <th>Distance</th>
                  <th>Supply</th>
                  <th>Purpose</th>
                  <th>Driver</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {logs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.03 }}
                      onClick={() => handleLogClick(log)}
                      className="clickable-row"
                    >
                      <td>
                        <div className="td-date">
                          <Calendar size={14} />
                          {new Date(log.date).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="td-route">
                          <div className="route-item">
                            <MapPin size={12} className="icon-from" />
                            {log.from}
                          </div>
                          <div className="route-arrow">→</div>
                          <div className="route-item">
                            <MapPin size={12} className="icon-to" />
                            {log.to}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="td-time">
                          <div>
                            <Clock size={12} /> {log.departureTime}
                          </div>
                          <div className="time-arrival">
                            → {log.arrivalTime}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="td-distance">
                          <strong>{log.kilometers} km</strong>
                          <small>
                            Before:{" "}
                            {log.beforeMeterReading || log.meterReading || "-"}
                          </small>
                          <small>After: {log.afterMeterReading || "-"}</small>
                        </div>
                      </td>
                      <td>
                        <div className="td-supply">
                          {log.fuel && (
                            <span className="supply-badge fuel">
                              <Fuel size={11} />
                              {log.fuel}L
                            </span>
                          )}
                          {log.oil && (
                            <span className="supply-badge oil">
                              Oil: {log.oil}L
                            </span>
                          )}
                          {!log.fuel && !log.oil && "-"}
                        </div>
                      </td>
                      <td>
                        <div className="td-purpose">{log.purpose}</div>
                      </td>
                      <td>
                        <div className="td-user">
                          <User size={12} />
                          {log.usedBy}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Add/Edit Log Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="logbook-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            <motion.div
              className="logbook-modal-content compact-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="logbook-modal-header">
                <h3>
                  <Car size={20} />
                  {isEditing ? "Edit Log Entry" : "New Log Entry"}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={isEditing ? handleUpdateLog : handleAddLog}
                className="compact-form"
              >
                <div className="form-grid">
                  {/* Date */}
                  <div className="form-group">
                    <label>
                      Date <span className="required">*</span>
                    </label>
                    <input
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]}
                      className={errors.date ? "error" : ""}
                    />
                    {errors.date && (
                      <span className="error-text">{errors.date}</span>
                    )}
                  </div>

                  {/* Fuel */}
                  <div className="form-group">
                    <label>Fuel (Liters)</label>
                    <input
                      name="fuel"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.fuel}
                      onChange={handleChange}
                      className={errors.fuel ? "error" : ""}
                    />
                    {errors.fuel && (
                      <span className="error-text">{errors.fuel}</span>
                    )}
                  </div>

                  {/* Oil */}
                  <div className="form-group">
                    <label>Oil (Liters)</label>
                    <input
                      name="oil"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.oil}
                      onChange={handleChange}
                      className={errors.oil ? "error" : ""}
                    />
                    {errors.oil && (
                      <span className="error-text">{errors.oil}</span>
                    )}
                  </div>

                  {/* Departure (12h) */}
                  <div className="form-group">
                    <label>
                      गाडी नेण्याची वेळ <span className="required">*</span>
                    </label>
                    <div className="time-12h">
                      <select
                        name="depHour"
                        value={formData.depHour}
                        onChange={handleChange}
                        className={errors.departure ? "error" : ""}
                      >
                        {HOURS_12.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <span className="sep">:</span>
                      <select
                        name="depMinute"
                        value={formData.depMinute}
                        onChange={handleChange}
                        className={errors.departure ? "error" : ""}
                      >
                        {MINUTES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        name="depPeriod"
                        value={formData.depPeriod}
                        onChange={handleChange}
                        className={errors.departure ? "error" : ""}
                      >
                        {PERIODS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.departure && (
                      <span className="error-text">{errors.departure}</span>
                    )}
                  </div>

                  {/* Arrival (12h) */}
                  <div className="form-group">
                    <label>
                      गाडी आल्याची वेळ <span className="required">*</span>
                    </label>
                    <div className="time-12h">
                      <select
                        name="arrHour"
                        value={formData.arrHour}
                        onChange={handleChange}
                        className={errors.arrival ? "error" : ""}
                      >
                        {HOURS_12.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                      <span className="sep">:</span>
                      <select
                        name="arrMinute"
                        value={formData.arrMinute}
                        onChange={handleChange}
                        className={errors.arrival ? "error" : ""}
                      >
                        {MINUTES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <select
                        name="arrPeriod"
                        value={formData.arrPeriod}
                        onChange={handleChange}
                        className={errors.arrival ? "error" : ""}
                      >
                        {PERIODS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                    {errors.arrival && (
                      <span className="error-text">{errors.arrival}</span>
                    )}
                  </div>

                  {/* From */}
                  <div className="form-group">
                    <label>
                      From <span className="required">*</span>
                    </label>
                    <input
                      name="from"
                      type="text"
                      placeholder="Starting location"
                      value={formData.from}
                      onChange={handleChange}
                      className={errors.from ? "error" : ""}
                    />
                    {errors.from && (
                      <span className="error-text">{errors.from}</span>
                    )}
                  </div>

                  {/* To */}
                  <div className="form-group">
                    <label>
                      To <span className="required">*</span>
                    </label>
                    <input
                      name="to"
                      type="text"
                      placeholder="Destination"
                      value={formData.to}
                      onChange={handleChange}
                      className={errors.to ? "error" : ""}
                    />
                    {errors.to && (
                      <span className="error-text">{errors.to}</span>
                    )}
                  </div>

                  {/* Before Meter Reading */}
                  <div className="form-group">
                    <label>
                      Before Travelling Reading{" "}
                      <span className="required">*</span>
                    </label>
                    <input
                      name="beforeMeterReading"
                      type="number"
                      placeholder="Before reading"
                      value={formData.beforeMeterReading}
                      onChange={handleChange}
                      className={errors.beforeMeterReading ? "error" : ""}
                    />
                    {errors.beforeMeterReading && (
                      <span className="error-text">
                        {errors.beforeMeterReading}
                      </span>
                    )}
                  </div>

                  {/* After Meter Reading */}
                  <div className="form-group">
                    <label>
                      After Travelling Reading{" "}
                      <span className="required">*</span>
                    </label>
                    <input
                      name="afterMeterReading"
                      type="number"
                      placeholder="After reading"
                      value={formData.afterMeterReading}
                      onChange={handleChange}
                      className={errors.afterMeterReading ? "error" : ""}
                    />
                    {errors.afterMeterReading && (
                      <span className="error-text">
                        {errors.afterMeterReading}
                      </span>
                    )}
                  </div>

                  {/* Km (Auto-calculated) */}
                  <div className="form-group">
                    <label>
                      Kilometers <span className="required">*</span>
                    </label>
                    <input
                      name="kilometers"
                      type="number"
                      step="0.1"
                      placeholder="Auto-calculated"
                      value={formData.kilometers}
                      onChange={handleChange}
                      className={errors.kilometers ? "error" : ""}
                      readOnly
                      style={{
                        backgroundColor: "#f1f5f9",
                        cursor: "not-allowed",
                      }}
                    />
                    {errors.kilometers && (
                      <span className="error-text">{errors.kilometers}</span>
                    )}
                  </div>

                  {/* Purpose */}
                  <div className="form-group full-width">
                    <label>
                      Purpose <span className="required">*</span>
                    </label>
                    <input
                      name="purpose"
                      type="text"
                      placeholder="Purpose of trip"
                      value={formData.purpose}
                      onChange={handleChange}
                      className={errors.purpose ? "error" : ""}
                    />
                    {errors.purpose && (
                      <span className="error-text">{errors.purpose}</span>
                    )}
                  </div>

                  {/* Used By */}
                  <div className="form-group full-width">
                    <label>
                      Driver Name <span className="required">*</span>
                    </label>
                    <input
                      name="usedBy"
                      type="text"
                      placeholder="Driver/user name"
                      value={formData.usedBy}
                      onChange={handleChange}
                      className={errors.usedBy ? "error" : ""}
                    />
                    {errors.usedBy && (
                      <span className="error-text">{errors.usedBy}</span>
                    )}
                  </div>
                </div>

                <div className="compact-modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-save">
                    <Save size={18} />
                    {isEditing ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail View Modal */}
      <AnimatePresence>
        {showDetailModal && selectedLog && (
          <motion.div
            className="logbook-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowDetailModal(false);
              setSelectedLog(null);
            }}
          >
            <motion.div
              className="logbook-modal-content detail-modal"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="logbook-modal-header">
                <h3>
                  <Car size={20} />
                  Log Details
                </h3>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedLog(null);
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="detail-content">
                <div className="detail-row">
                  <div className="detail-label">
                    <Calendar size={16} /> Date
                  </div>
                  <div className="detail-value">
                    {new Date(selectedLog.date).toLocaleDateString("en-GB", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <Clock size={16} /> Time
                  </div>
                  <div className="detail-value">
                    {selectedLog.departureTime} - {selectedLog.arrivalTime}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <MapPin size={16} /> Route
                  </div>
                  <div className="detail-value">
                    {selectedLog.from} → {selectedLog.to}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <FileText size={16} /> Meter Readings
                  </div>
                  <div className="detail-value">
                    Before:{" "}
                    {selectedLog.beforeMeterReading ||
                      selectedLog.meterReading ||
                      "-"}
                    <br />
                    After: {selectedLog.afterMeterReading || "-"}
                  </div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <FileText size={16} /> Distance
                  </div>
                  <div className="detail-value">
                    <strong>{selectedLog.kilometers} km</strong>
                  </div>
                </div>

                {(selectedLog.fuel || selectedLog.oil) && (
                  <div className="detail-row">
                    <div className="detail-label">
                      <Fuel size={16} /> Supply
                    </div>
                    <div className="detail-value">
                      {selectedLog.fuel && (
                        <span>Fuel: {selectedLog.fuel}L</span>
                      )}
                      {selectedLog.fuel && selectedLog.oil && <span> | </span>}
                      {selectedLog.oil && <span>Oil: {selectedLog.oil}L</span>}
                    </div>
                  </div>
                )}

                <div className="detail-row">
                  <div className="detail-label">
                    <FileText size={16} /> Purpose
                  </div>
                  <div className="detail-value">{selectedLog.purpose}</div>
                </div>

                <div className="detail-row">
                  <div className="detail-label">
                    <User size={16} /> Driver
                  </div>
                  <div className="detail-value">{selectedLog.usedBy}</div>
                </div>
              </div>

              <div className="detail-modal-footer">
                <button
                  className="btn-delete-detail"
                  onClick={() => handleDeleteLog(selectedLog.id)}
                >
                  <Trash2 size={18} />
                  Delete
                </button>
                <button className="btn-edit-detail" onClick={handleEditClick}>
                  <Edit2 size={18} />
                  Edit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* Toast */
        .toast {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 1.5rem;
          border-radius: 10px;
          font-weight: 600;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          z-index: 10000;
          min-width: 300px;
          backdrop-filter: blur(10px);
        }
        .toast-success { background: linear-gradient(135deg, #10b981, #059669); color: white; }
        .toast-error { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }

        /* Main Container */
        .logbook-container { padding: 1.5rem; max-width: 1400px; margin: 0 auto; }

        .logbook-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem; }
        .logbook-header-left h2 {
          display: flex; align-items: center; gap: 0.75rem; margin: 0 0 0.5rem 0;
          font-size: 1.75rem; background: linear-gradient(135deg, #3b82f6, #2563eb);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .logbook-header-left p { margin: 0; color: #64748b; font-size: 0.95rem; }
        .logbook-header-actions { display: flex; gap: 0.75rem; flex-wrap: wrap; }

        .btn-action {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem; border: none; border-radius: 10px;
          font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: all 0.2s ease;
        }
        .btn-print { background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3); }
        .btn-print:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(139, 92, 246, 0.4); }
        .btn-download { background: linear-gradient(135deg, #10b981, #059669); color: white; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3); }
        .btn-download:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4); }
        .btn-add-log {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        .btn-add-log:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4); }

        .logbook-loading, .logbook-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 4rem 2rem; color: #64748b; text-align: center;
        }
        .spinner-logbook { width: 40px; height: 40px; border: 4px solid #e2e8f0; border-top-color: #3b82f6; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .logbook-empty h3 { margin: 1rem 0 0.5rem 0; color: #64748b; font-size: 1.25rem; }
        .btn-empty-log { display: flex; align-items: center; gap: 0.5rem; margin-top: 1.5rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }

        /* Table (in-app) */
        .table-wrapper { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); overflow-x: auto; border: 1px solid #e2e8f0; }
        .log-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
        .log-table thead { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
        .log-table th { padding: 1rem 0.75rem; text-align: left; font-weight: 700; font-size: 0.85rem; white-space: nowrap; }
        .log-table tbody tr { border-bottom: 1px solid #e2e8f0; transition: all 0.2s ease; }
        .log-table tbody tr.clickable-row { cursor: pointer; }
        .log-table tbody tr.clickable-row:hover { background: #f1f5f9; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); transform: scale(1.005); }
        .log-table td { padding: 1rem 0.75rem; color: #475569; }

        .td-date { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #1e293b; white-space: nowrap; }
        .td-route { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
        .route-item { display: flex; align-items: center; gap: 0.35rem; }
        .icon-from { color: #10b981; }
        .icon-to { color: #ef4444; }
        .route-arrow { color: #94a3b8; font-weight: bold; }

        .td-time { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.85rem; }
        .td-time > div { display: flex; align-items: center; gap: 0.35rem; }
        .time-arrival { color: #10b981; font-weight: 600; }

        .td-distance { display: flex; flex-direction: column; gap: 0.25rem; }
        .td-distance strong { color: #3b82f6; font-size: 1rem; }
        .td-distance small { color: #94a3b8; font-size: 0.75rem; }

        .td-supply { display: flex; flex-direction: column; gap: 0.25rem; }
        .supply-badge { display: flex; align-items: center; gap: 0.35rem; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; width: fit-content; }
        .supply-badge.fuel { background: #dbeafe; color: #1e40af; }
        .supply-badge.oil { background: #fef3c7; color: #92400e; }

        .td-purpose { max-width: 200px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; font-size: 0.85rem; line-height: 1.4; }
        .td-user { display: flex; align-items: center; gap: 0.5rem; font-weight: 500; font-size: 0.85rem; }

        /* Modals */
        .logbook-modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); display: flex; justify-content: center; align-items: center; z-index: 5000; padding: 1rem; overflow-y: auto; }
        .logbook-modal-content { background: white; border-radius: 16px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3); margin: auto; }
        .compact-modal { max-width: 800px; }
        .detail-modal { max-width: 550px; }

        .logbook-modal-header { display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 2px solid #e2e8f0; background: linear-gradient(135deg, #eff6ff, #dbeafe); position: sticky; top: 0; z-index: 10; }
        .logbook-modal-header h3 { display: flex; align-items: center; gap: 0.5rem; margin: 0; font-size: 1.1rem; font-weight: 700; color: #1e293b; }
        .logbook-modal-header button { background: #f1f5f9; border: none; border-radius: 8px; padding: 0.5rem; cursor: pointer; color: #64748b; transition: all 0.2s ease; }
        .logbook-modal-header button:hover { background: #e2e8f0; color: #334155; }

        .compact-form { padding: 1.5rem; }
        .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .form-group { display: flex; flex-direction: column; }
        .form-group.full-width { grid-column: 1 / -1; }
        .form-group label { margin-bottom: 0.4rem; font-weight: 600; color: #1e293b; font-size: 0.85rem; }
        .required { color: #dc2626; }

        .form-group input, .form-group select, .form-group textarea {
          width: 100%; padding: 0.65rem; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 0.9rem; transition: all 0.2s ease; font-family: inherit;
        }
        .form-group input:focus, .form-group select:focus, .form-group textarea:focus {
          outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .form-group input.error, .form-group select.error, .form-group textarea.error { border-color: #dc2626; }
        .error-text { color: #dc2626; font-size: 0.75rem; margin-top: 0.25rem; }
        .form-group textarea { resize: vertical; min-height: 60px; }

        .time-12h { display: grid; grid-template-columns: 1fr auto 1fr 1fr; gap: 0.4rem; align-items: center; width:220px; }
        .time-12h .sep { text-align: center; font-weight: 700; color: #64748b; }

        .compact-modal-footer { display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1.25rem 1.5rem; border-top: 2px solid #e2e8f0; background: #f8fafc; position: sticky; bottom: 0; }
        .btn-cancel, .btn-save { padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: none; font-size: 0.9rem; }
        .btn-cancel { background: #f1f5f9; color: #64748b; }
        .btn-cancel:hover { background: #e2e8f0; }
        .btn-save { display: flex; align-items: center; gap: 0.5rem; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; }
        .btn-save:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4); }

        .detail-content { padding: 1.5rem; }
        .detail-row { display: flex; flex-direction: column; gap: 0.5rem; padding: 1rem; background: #f8fafc; border-radius: 8px; margin-bottom: 0.75rem; border-left: 3px solid #3b82f6; }
        .detail-label { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #64748b; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .detail-value { color: #1e293b; font-size: 1rem; font-weight: 500; padding-left: 1.5rem; }
        .detail-modal-footer { display: flex; justify-content: space-between; gap: 0.75rem; padding: 1.25rem 1.5rem; border-top: 2px solid #e2e8f0; background: #f8fafc; }
        .btn-delete-detail, .btn-edit-detail { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.5rem; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; border: none; flex: 1; justify-content: center; font-size: 0.9rem; }
        .btn-delete-detail { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
        .btn-delete-detail:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4); }
        .btn-edit-detail { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; }
        .btn-edit-detail:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4); }

        /* Print Styles */
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { position: absolute; left: 0; top: 0; width: 100%; }
        }

        .print-container {
          background: #ffffff;
          color: #0f172a;
          padding: 20px;
          font-family: Arial, Helvetica, sans-serif;
        }

        .print-title {
          text-align: center;
          margin: 0 0 16px 0;
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
          border-bottom: 4px solid #3b82f6;
          padding-bottom: 10px;
        }

        .print-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 11px;
        }

        .print-table thead th {
          color: #000000ff;
          border: 1px solid #1d4ed8;
          text-align: center;
          font-weight: 700;
          padding: 8px 6px;
          line-height: 1.25;
          vertical-align: middle;
          word-wrap: break-word;
          white-space: normal;
        }

        .print-table tbody td {
          border: 1px solid #333;
          padding: 8px 6px;
          vertical-align: top;
          word-wrap: break-word;
          white-space: normal;
        }

        .print-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .w-idx { width: 3%; }
        .w-date { width: 9%; }
        .w-supply { width: 14%; }
        .w-supply-child { width: 7%; }
        .w-dep { width: 10%; }
        .w-arr { width: 10%; }
        .w-from { width: 10%; }
        .w-to { width: 10%; }
        .w-meter { width: 14%; }
        .w-meter-child { width: 7%; }
        .w-km { width: 6%; }
        .w-purpose { width: 11%; }
        .w-user { width: 10%; }
        .w-remark { width: 10%; }

        .td-center { text-align: center; }
        .td-right { text-align: right; }

        .print-footer {
          margin-top: 16px;
          text-align: center;
          font-size: 10px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
        }

        @media (max-width: 968px) { .form-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 768px) {
          .logbook-header { flex-direction: column; align-items: stretch; }
          .logbook-header-actions { width: 100%; }
          .btn-action, .btn-add-log { flex: 1; justify-content: center; }
          .table-wrapper { overflow-x: scroll; }
          .log-table { min-width: 900px; }
          .form-grid { grid-template-columns: 1fr; }
          .toast { min-width: 250px; font-size: 0.9rem; }
        }
        @media (max-width: 480px) {
          .logbook-container { padding: 1rem; }
          .logbook-header-left h2 { font-size: 1.35rem; }
        }
      `}</style>
    </>
  );
};

export default LogBook;
