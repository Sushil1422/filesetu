// src/components/Dairy.js
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  getDatabase,
  ref as dbRef,
  onValue,
  push,
  set,
  remove,
  update,
} from "firebase/database";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Save,
  X,
  MapPin,
  Clock,
  Car,
  FileText,
  Trash2,
  Printer,
  Download,
  Edit2,
  Edit,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";

// PDF generation libraries
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

const Dairy = ({ showToast }) => {
  const { currentUser } = useAuth();

  // ========== STATE MANAGEMENT ==========
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  // Report configuration
  const [reportConfig, setReportConfig] = useState({
    employeeName: "एम. बी. कर्नाळे",
    designation: "सहाय्यक अभियंता श्रेणी - 1",
    department: "",
    subDepartment: "",
    officeName: "",
    officeLocation: "",
    fieldWorkDays: "",
    outOfHQDays: "",
    hqDays: "",
    weeklyHolidays: "",
    totalDays: "",
  });

  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const printRef = useRef();

  // Form data with DEFAULT VALUES
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    travelFrom: "",
    travelTo: "",
    timeFromHour: "9",
    timeFromMinute: "0",
    timeFromPeriod: "AM",
    timeToHour: "5",
    timeToMinute: "0",
    timeToPeriod: "PM",
    distance: "",
    vehicle: "",
    remark: "",
  });

  const [errors, setErrors] = useState({});

  // ========== LIFECYCLE EFFECTS ==========
  useEffect(() => {
    const saved = localStorage.getItem("dairyReportConfig");
    if (saved) {
      setReportConfig(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const db = getDatabase();
    const dairyRef = dbRef(db, `dairy/${currentUser.uid}`);

    const unsubscribe = onValue(
      dairyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const entriesArray = Object.entries(data)
            .map(([id, entry]) => ({ id, ...entry }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));
          setEntries(entriesArray);
        } else {
          setEntries([]);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching entries:", err);
        showToast?.error("Failed to load entries");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, showToast]);

  useEffect(() => {
    if (showReportModal) {
      setIsEditingConfig(true);
    } else {
      setIsEditingConfig(false);
    }
  }, [showReportModal]);

  // ========== UTILITY FUNCTIONS ==========
  const formatTimeDisplay = (hour, minute, period) => {
    if (!hour || !minute) return "";
    const h = String(hour).padStart(2, "0");
    const m = String(minute).padStart(2, "0");
    return `${h}:${m} ${period}`;
  };

  const convertTo24 = (hour, minute, period) => {
    let h = parseInt(hour, 10);
    const m = String(minute).padStart(2, "0");
    if (period === "PM" && h !== 12) h += 12;
    if (period === "AM" && h === 12) h = 0;
    return `${String(h).padStart(2, "0")}:${m}`;
  };

  const calculateDuration = (timeFrom, timeTo) => {
    if (!timeFrom || !timeTo) return "N/A";

    const parseTime = (timeStr) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return null;
      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      return convertTo24(hour, minute, period);
    };

    const start24 = parseTime(timeFrom);
    const end24 = parseTime(timeTo);

    if (!start24 || !end24) return "N/A";

    let startDate = new Date(`2000-01-01T${start24}`);
    let endDate = new Date(`2000-01-01T${end24}`);

    if (endDate <= startDate) {
      endDate = new Date(`2000-01-02T${end24}`);
    }

    const diff = endDate - startDate;
    if (diff <= 0) return "0h 0m";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("mr-IN", { day: "2-digit", month: "short" });

  const formatDay = (d) =>
    new Date(d).toLocaleDateString("mr-IN", { weekday: "short" });

  const getFormattedMonth = () => {
    const [year, month] = selectedMonth.split("-");
    return `${month}/${year}`;
  };

  const validateVehicleNumber = (vehicleNo) => {
    const pattern = /^[A-Z]{2}\d{2}[A-Z]{1,2}\d{4}$/i;
    return pattern.test(vehicleNo.replace(/\s+/g, ""));
  };

  // ========== DATA COMPUTATION ==========
  const getMonthlyEntries = () =>
    entries.filter((e) => e.date?.slice(0, 7) === selectedMonth);

  const calculateMonthlyStats = () => {
    const monthly = getMonthlyEntries();
    const totalDistance = monthly.reduce(
      (sum, e) => sum + (parseFloat(e.distance) || 0),
      0
    );
    return { totalTrips: monthly.length, totalDistance, entries: monthly };
  };

  // ========== FORM VALIDATION ==========
  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) newErrors.date = "Date is required";
    if (!formData.travelFrom.trim())
      newErrors.travelFrom = "Travel From is required";
    if (!formData.travelTo.trim()) newErrors.travelTo = "Travel To is required";

    if (!formData.timeFromHour || !formData.timeFromMinute) {
      newErrors.timeFrom = "Start time is required";
    } else {
      const hour = parseInt(formData.timeFromHour, 10);
      const minute = parseInt(formData.timeFromMinute, 10);
      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
        newErrors.timeFrom = "Invalid time";
      }
    }

    if (!formData.timeToHour || !formData.timeToMinute) {
      newErrors.timeTo = "End time is required";
    } else {
      const hour = parseInt(formData.timeToHour, 10);
      const minute = parseInt(formData.timeToMinute, 10);
      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) {
        newErrors.timeTo = "Invalid time";
      }
    }

    if (
      !formData.distance ||
      isNaN(formData.distance) ||
      parseFloat(formData.distance) <= 0
    )
      newErrors.distance = "Distance must be a positive number";

    if (!formData.vehicle.trim()) {
      newErrors.vehicle = "Vehicle No is required";
    } else if (!validateVehicleNumber(formData.vehicle)) {
      newErrors.vehicle = "Invalid format. Use: MH10GF3456";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ========== EVENT HANDLERS ==========
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "timeFromHour" || name === "timeToHour") {
      const num = parseInt(value, 10);
      if (value && (num < 1 || num > 12)) return;
    }

    if (name === "timeFromMinute" || name === "timeToMinute") {
      const num = parseInt(value, 10);
      if (value && (num < 0 || num > 59)) return;
    }

    if (name === "vehicle") {
      setFormData((f) => ({
        ...f,
        [name]: value.toUpperCase().replace(/\s+/g, ""),
      }));
    } else {
      setFormData((f) => ({ ...f, [name]: value }));
    }

    if (errors[name] || errors.timeFrom || errors.timeTo) {
      setErrors((er) => ({ ...er, [name]: "", timeFrom: "", timeTo: "" }));
    }
  };

  const handleRowClick = (entry) => {
    setSelectedEntry(entry);
  };

  const closeEntryOptions = () => {
    setSelectedEntry(null);
  };

  const handleEditEntry = () => {
    if (!selectedEntry) return;

    const parseStoredTime = (timeStr) => {
      const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return { hour: "", minute: "", period: "AM" };
      return {
        hour: parseInt(match[1], 10),
        minute: parseInt(match[2], 10),
        period: match[3].toUpperCase(),
      };
    };

    const timeFrom = parseStoredTime(selectedEntry.timeFrom);
    const timeTo = parseStoredTime(selectedEntry.timeTo);

    setFormData({
      date: selectedEntry.date,
      travelFrom: selectedEntry.travelFrom,
      travelTo: selectedEntry.travelTo,
      timeFromHour: timeFrom.hour,
      timeFromMinute: timeFrom.minute,
      timeFromPeriod: timeFrom.period,
      timeToHour: timeTo.hour,
      timeToMinute: timeTo.minute,
      timeToPeriod: timeTo.period,
      distance: selectedEntry.distance,
      vehicle: selectedEntry.vehicle,
      remark: selectedEntry.remark || "",
    });

    setEditingEntryId(selectedEntry.id);
    setSelectedEntry(null);
    setShowEditModal(true);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const confirmDelete = async () => {
    if (!selectedEntry) return;

    try {
      const db = getDatabase();
      await remove(dbRef(db, `dairy/${currentUser.uid}/${selectedEntry.id}`));
      showToast?.success("Entry deleted successfully!");
      setShowDeleteConfirm(false);
      setSelectedEntry(null);
    } catch (err) {
      console.error("Delete error:", err);
      showToast?.error("Failed to delete entry");
      setShowDeleteConfirm(false);
    }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast?.error("Please fix validation errors");
      return;
    }

    const timeFrom = formatTimeDisplay(
      formData.timeFromHour,
      formData.timeFromMinute,
      formData.timeFromPeriod
    );
    const timeTo = formatTimeDisplay(
      formData.timeToHour,
      formData.timeToMinute,
      formData.timeToPeriod
    );

    try {
      const db = getDatabase();
      const newRef = push(dbRef(db, `dairy/${currentUser.uid}`));
      await set(newRef, {
        date: formData.date,
        travelFrom: formData.travelFrom,
        travelTo: formData.travelTo,
        timeFrom,
        timeTo,
        distance: formData.distance,
        vehicle: formData.vehicle,
        remark: formData.remark || "",
        createdAt: new Date().toISOString(),
      });

      showToast?.success("Entry added successfully!");
      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error("Add error:", err);
      showToast?.error("Failed to add entry");
    }
  };

  const handleUpdateEntry = async (e) => {
    e.preventDefault();

    if (!editingEntryId) {
      showToast?.error("Entry ID not found");
      return;
    }

    if (!validateForm()) {
      showToast?.error("Please fix validation errors");
      return;
    }

    const timeFrom = formatTimeDisplay(
      formData.timeFromHour,
      formData.timeFromMinute,
      formData.timeFromPeriod
    );
    const timeTo = formatTimeDisplay(
      formData.timeToHour,
      formData.timeToMinute,
      formData.timeToPeriod
    );

    try {
      const db = getDatabase();
      const entryRef = dbRef(db, `dairy/${currentUser.uid}/${editingEntryId}`);
      await update(entryRef, {
        date: formData.date,
        travelFrom: formData.travelFrom,
        travelTo: formData.travelTo,
        timeFrom,
        timeTo,
        distance: formData.distance,
        vehicle: formData.vehicle,
        remark: formData.remark || "",
        updatedAt: new Date().toISOString(),
      });

      showToast?.success("Entry updated successfully!");
      setShowEditModal(false);
      setEditingEntryId(null);
      resetForm();
    } catch (err) {
      console.error("Update error:", err);
      showToast?.error("Failed to update entry");
    }
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      travelFrom: "",
      travelTo: "",
      timeFromHour: "9",
      timeFromMinute: "0",
      timeFromPeriod: "AM",
      timeToHour: "5",
      timeToMinute: "0",
      timeToPeriod: "PM",
      distance: "",
      vehicle: "",
      remark: "",
    });
    setErrors({});
  };

  const saveReportConfig = () => {
    localStorage.setItem("dairyReportConfig", JSON.stringify(reportConfig));
    setIsEditingConfig(false);
    showToast?.success("Report configuration saved!");
  };

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    try {
      const input = printRef.current;
      if (!input) return;

      const canvas = await html2canvas(input, {
        scale: 2.5,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight > pageHeight) {
        const ratio = pageHeight / imgHeight;
        const finalWidth = imgWidth * ratio;
        const finalHeight = pageHeight;
        const x = (pageWidth - finalWidth) / 2;
        pdf.addImage(imgData, "PNG", x, 0, finalWidth, finalHeight);
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      }

      const [yStr, mStr] = selectedMonth.split("-");
      pdf.save(`Monthly-Travel-${mStr}-${yStr}.pdf`);
      showToast?.success("PDF downloaded successfully!");
    } catch (e) {
      console.error("PDF generation error:", e);
      showToast?.error("PDF generation failed");
    }
  };

  const monthly = calculateMonthlyStats();
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <>
      {/* MAIN CONTAINER */}
      <motion.div
        className="dairy-container"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="dairy-header">
          <div className="dairy-header-left">
            <h2>
              <BookOpen size={24} />
              Travel Diary
            </h2>
            <p>Track your travel & print monthly report</p>
          </div>
          <div className="dairy-header-actions">
            <motion.button
              className="btn-report"
              onClick={() => setShowReportModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FileText size={18} />
              Monthly Report
            </motion.button>
            <motion.button
              className="btn-add-dairy"
              onClick={() => setShowAddModal(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus size={18} />
              New Entry
            </motion.button>
          </div>
        </div>

        {/* TABLE */}
        {loading ? (
          <div className="dairy-loading">
            <div className="spinner-dairy" />
            <p>Loading entries...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="dairy-empty">
            <BookOpen size={64} color="#c4b5fd" />
            <h3>No Travel Entries Yet</h3>
            <p>Start tracking your travel by creating your first entry</p>
            <button
              className="btn-empty-dairy"
              onClick={() => setShowAddModal(true)}
            >
              <Plus size={18} />
              Create First Entry
            </button>
          </div>
        ) : (
          <div className="dairy-table-container">
            <table className="dairy-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Time</th>
                  <th>Duration</th>
                  <th>Distance</th>
                  <th>Vehicle No</th>
                  <th>Remark</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {entries.map((entry) => (
                    <motion.tr
                      key={entry.id}
                      className="clickable-row"
                      onClick={() => handleRowClick(entry)}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      whileHover={{ backgroundColor: "#faf5ff" }}
                    >
                      <td className="td-date">
                        {new Date(entry.date).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="td-location">
                        <MapPin size={14} className="inline-icon" />
                        {entry.travelFrom}
                      </td>
                      <td className="td-location">
                        <MapPin size={14} className="inline-icon" />
                        {entry.travelTo}
                      </td>
                      <td className="td-time">
                        <Clock size={14} className="inline-icon" />
                        {entry.timeFrom} - {entry.timeTo}
                      </td>
                      <td className="td-duration">
                        {calculateDuration(entry.timeFrom, entry.timeTo)}
                      </td>
                      <td className="td-distance">{entry.distance} km</td>
                      <td className="td-vehicle">
                        <Car size={14} className="inline-icon" />
                        {entry.vehicle}
                      </td>
                      <td className="td-remark">
                        {entry.remark && (
                          <>
                            <MessageSquare size={14} className="inline-icon" />
                            {entry.remark}
                          </>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* ENTRY OPTIONS MODAL */}
      <AnimatePresence>
        {selectedEntry && !showDeleteConfirm && (
          <motion.div
            className="entry-options-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeEntryOptions}
          >
            <motion.div
              className="entry-options-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="entry-options-header">
                <h3>Entry Options</h3>
                <button
                  onClick={closeEntryOptions}
                  className="btn-close-options"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="entry-details">
                <div className="detail-row">
                  <span className="label">Date:</span>
                  <span className="value">
                    {new Date(selectedEntry.date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">From:</span>
                  <span className="value">{selectedEntry.travelFrom}</span>
                </div>
                <div className="detail-row">
                  <span className="label">To:</span>
                  <span className="value">{selectedEntry.travelTo}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Time:</span>
                  <span className="value">
                    {selectedEntry.timeFrom} - {selectedEntry.timeTo}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Distance:</span>
                  <span className="value">{selectedEntry.distance} km</span>
                </div>
                <div className="detail-row">
                  <span className="label">Vehicle No:</span>
                  <span className="value">{selectedEntry.vehicle}</span>
                </div>
                {selectedEntry.remark && (
                  <div className="detail-row">
                    <span className="label">Remark:</span>
                    <span className="value">{selectedEntry.remark}</span>
                  </div>
                )}
              </div>

              <div className="entry-options-actions">
                <button onClick={handleEditEntry} className="btn-edit-entry">
                  <Edit size={18} />
                  Edit Entry
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="btn-delete-entry-modal"
                >
                  <Trash2 size={18} />
                  Delete Entry
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION */}
      <AnimatePresence>
        {showDeleteConfirm && selectedEntry && (
          <motion.div
            className="delete-confirm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancelDelete}
          >
            <motion.div
              className="delete-confirm-modal"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="delete-icon-container">
                <motion.div
                  className="delete-icon-circle"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                >
                  <AlertTriangle size={48} />
                </motion.div>
              </div>

              <div className="delete-content">
                <h3>Delete Entry?</h3>
                <p>
                  Are you sure you want to delete this travel entry? This action
                  cannot be undone.
                </p>

                <div className="delete-entry-summary">
                  <div className="summary-item">
                    <span className="summary-label">Date:</span>
                    <span className="summary-value">
                      {new Date(selectedEntry.date).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        }
                      )}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Route:</span>
                    <span className="summary-value">
                      {selectedEntry.travelFrom} → {selectedEntry.travelTo}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Distance:</span>
                    <span className="summary-value">
                      {selectedEntry.distance} km
                    </span>
                  </div>
                </div>
              </div>

              <div className="delete-actions">
                <button onClick={cancelDelete} className="btn-cancel-delete">
                  Cancel
                </button>
                <button onClick={confirmDelete} className="btn-confirm-delete">
                  <Trash2 size={18} />
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ADD MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto"
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
                <h3 className="flex items-center gap-2 text-xl font-bold">
                  <BookOpen size={22} />
                  New Travel Entry
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddEntry} className="p-6 space-y-6">
                {/* Date */}
                <div>
                  <label htmlFor="date" className="block text-sm font-semibold text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border-2 ${errors.date ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'} outline-none transition-colors`}
                    max={new Date().toISOString().split("T")[0]}
                  />
                  {errors.date && (
                    <span className="text-red-500 text-sm mt-1 block">{errors.date}</span>
                  )}
                </div>

                {/* From/To */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="travelFrom" className="block text-sm font-semibold text-gray-700 mb-2">
                      Travel From <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="travelFrom"
                      name="travelFrom"
                      type="text"
                      placeholder="e.g., मुंबई / Mumbai"
                      value={formData.travelFrom}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${errors.travelFrom ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'} outline-none transition-colors`}
                    />
                    {errors.travelFrom && (
                      <span className="text-red-500 text-sm mt-1 block">{errors.travelFrom}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="travelTo" className="block text-sm font-semibold text-gray-700 mb-2">
                      Travel To <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="travelTo"
                      name="travelTo"
                      type="text"
                      placeholder="e.g., पुणे / Pune"
                      value={formData.travelTo}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${errors.travelTo ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'} outline-none transition-colors`}
                    />
                    {errors.travelTo && (
                      <span className="text-red-500 text-sm mt-1 block">{errors.travelTo}</span>
                    )}
                  </div>
                </div>

                {/* Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time From <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        name="timeFromHour"
                        value={formData.timeFromHour}
                        onChange={handleChange}
                        className={`flex-1 px-3 py-3 rounded-xl border-2 ${errors.timeFrom ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'} outline-none transition-colors`}
                      >
                        <option value="">HH</option>
                        {hours.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500 font-bold">:</span>
                      <select
                        name="timeFromMinute"
                        value={formData.timeFromMinute}
                        onChange={handleChange}
                        className={`flex-1 px-3 py-3 rounded-xl border-2 ${errors.timeFrom ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'} outline-none transition-colors`}
                      >
                        <option value="">MM</option>
                        {minutes.map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <select
                        name="timeFromPeriod"
                        value={formData.timeFromPeriod}
                        onChange={handleChange}
                        className="px-3 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 outline-none transition-colors"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    {errors.timeFrom && (
                      <span className="text-red-500 text-sm mt-1 block">{errors.timeFrom}</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Time To <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        name="timeToHour"
                        value={formData.timeToHour}
                        onChange={handleChange}
                        className={`flex-1 px-3 py-3 rounded-xl border-2 ${errors.timeTo ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'} outline-none transition-colors`}
                      >
                        <option value="">HH</option>
                        {hours.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="text-gray-500 font-bold">:</span>
                      <select
                        name="timeToMinute"
                        value={formData.timeToMinute}
                        onChange={handleChange}
                        className={`flex-1 px-3 py-3 rounded-xl border-2 ${errors.timeTo ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'} outline-none transition-colors`}
                      >
                        <option value="">MM</option>
                        {minutes.map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <select
                        name="timeToPeriod"
                        value={formData.timeToPeriod}
                        onChange={handleChange}
                        className="px-3 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 outline-none transition-colors"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    {errors.timeTo && (
                      <span className="text-red-500 text-sm mt-1 block">{errors.timeTo}</span>
                    )}
                  </div>
                </div>

                {/* Distance/Vehicle */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="distance" className="block text-sm font-semibold text-gray-700 mb-2">
                      Distance (km) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="distance"
                      name="distance"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g., 150"
                      value={formData.distance}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${errors.distance ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'} outline-none transition-colors`}
                    />
                    {errors.distance && (
                      <span className="text-red-500 text-sm mt-1 block">{errors.distance}</span>
                    )}
                  </div>

                  <div>
                    <label htmlFor="vehicle" className="block text-sm font-semibold text-gray-700 mb-2">
                      Vehicle No <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="vehicle"
                      name="vehicle"
                      type="text"
                      placeholder="e.g., MH10GF3456"
                      value={formData.vehicle}
                      onChange={handleChange}
                      className={`w-full px-4 py-3 rounded-xl border-2 ${errors.vehicle ? 'border-red-300 bg-red-50' : 'border-gray-300 focus:border-purple-500'} outline-none transition-colors`}
                      maxLength="13"
                    />
                    {errors.vehicle && (
                      <span className="text-red-500 text-sm mt-1 block">{errors.vehicle}</span>
                    )}
                  </div>
                </div>

                {/* Remark */}
                <div>
                  <label htmlFor="remark" className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                    <MessageSquare size={16} />
                    Remark (Optional)
                  </label>
                  <textarea
                    id="remark"
                    name="remark"
                    rows="3"
                    placeholder="Add any notes or remarks..."
                    value={formData.remark}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-purple-500 outline-none transition-colors resize-none"
                  />
                </div>

                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    <Save size={18} />
                    Save Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div
            className="dairy-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowEditModal(false);
              setEditingEntryId(null);
              resetForm();
            }}
          >
            <motion.div
              className="dairy-modal-content"
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="dairy-modal-header">
                <h3>
                  <Edit2 size={22} />
                  Edit Travel Entry
                </h3>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingEntryId(null);
                    resetForm();
                  }}
                  className="btn-close-modal"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateEntry} className="dairy-form">
                {/* Same form fields as Add Modal */}
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-date">
                      Date <span className="required">*</span>
                    </label>
                    <input
                      id="edit-date"
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleChange}
                      className={`form-input ${errors.date ? "error" : ""}`}
                      max={new Date().toISOString().split("T")[0]}
                    />
                    {errors.date && (
                      <span className="error-text">{errors.date}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-travelFrom">
                      Travel From <span className="required">*</span>
                    </label>
                    <input
                      id="edit-travelFrom"
                      name="travelFrom"
                      type="text"
                      placeholder="e.g., मुंबई / Mumbai"
                      value={formData.travelFrom}
                      onChange={handleChange}
                      className={`form-input ${errors.travelFrom ? "error" : ""}`}
                    />
                    {errors.travelFrom && (
                      <span className="error-text">{errors.travelFrom}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-travelTo">
                      Travel To <span className="required">*</span>
                    </label>
                    <input
                      id="edit-travelTo"
                      name="travelTo"
                      type="text"
                      placeholder="e.g., पुणे / Pune"
                      value={formData.travelTo}
                      onChange={handleChange}
                      className={`form-input ${errors.travelTo ? "error" : ""}`}
                    />
                    {errors.travelTo && (
                      <span className="error-text">{errors.travelTo}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>
                      Time From <span className="required">*</span>
                    </label>
                    <div className="time-input-group">
                      <select
                        name="timeFromHour"
                        value={formData.timeFromHour}
                        onChange={handleChange}
                        className={`time-select ${errors.timeFrom ? "error" : ""}`}
                      >
                        <option value="">HH</option>
                        {hours.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="time-separator">:</span>
                      <select
                        name="timeFromMinute"
                        value={formData.timeFromMinute}
                        onChange={handleChange}
                        className={`time-select ${errors.timeFrom ? "error" : ""}`}
                      >
                        <option value="">MM</option>
                        {minutes.map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <select
                        name="timeFromPeriod"
                        value={formData.timeFromPeriod}
                        onChange={handleChange}
                        className="time-period"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    {errors.timeFrom && (
                      <span className="error-text">{errors.timeFrom}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>
                      Time To <span className="required">*</span>
                    </label>
                    <div className="time-input-group">
                      <select
                        name="timeToHour"
                        value={formData.timeToHour}
                        onChange={handleChange}
                        className={`time-select ${errors.timeTo ? "error" : ""}`}
                      >
                        <option value="">HH</option>
                        {hours.map((h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <span className="time-separator">:</span>
                      <select
                        name="timeToMinute"
                        value={formData.timeToMinute}
                        onChange={handleChange}
                        className={`time-select ${errors.timeTo ? "error" : ""}`}
                      >
                        <option value="">MM</option>
                        {minutes.map((m) => (
                          <option key={m} value={m}>
                            {String(m).padStart(2, "0")}
                          </option>
                        ))}
                      </select>
                      <select
                        name="timeToPeriod"
                        value={formData.timeToPeriod}
                        onChange={handleChange}
                        className="time-period"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                    {errors.timeTo && (
                      <span className="error-text">{errors.timeTo}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="edit-distance">
                      Distance (km) <span className="required">*</span>
                    </label>
                    <input
                      id="edit-distance"
                      name="distance"
                      type="number"
                      step="0.1"
                      min="0"
                      placeholder="e.g., 150"
                      value={formData.distance}
                      onChange={handleChange}
                      className={`form-input ${errors.distance ? "error" : ""}`}
                    />
                    {errors.distance && (
                      <span className="error-text">{errors.distance}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-vehicle">
                      Vehicle No <span className="required">*</span>
                    </label>
                    <input
                      id="edit-vehicle"
                      name="vehicle"
                      type="text"
                      placeholder="e.g., MH10GF3456"
                      value={formData.vehicle}
                      onChange={handleChange}
                      className={`form-input ${errors.vehicle ? "error" : ""}`}
                      maxLength="13"
                    />
                    {errors.vehicle && (
                      <span className="error-text">{errors.vehicle}</span>
                    )}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group full-width">
                    <label htmlFor="edit-remark">
                      <MessageSquare size={16} className="inline-icon" />
                      Remark (Optional)
                    </label>
                    <textarea
                      id="edit-remark"
                      name="remark"
                      rows="3"
                      placeholder="Add any notes or remarks..."
                      value={formData.remark}
                      onChange={handleChange}
                      className="remark-textarea"
                    />
                  </div>
                </div>

                <div className="dairy-modal-footer">
                  <button
                    type="button"
                    className="btn-cancel"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingEntryId(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-save">
                    <Save size={18} />
                    Update Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div
            className="report-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReportModal(false)}
          >
            <motion.div
              className="report-modal-content compact-report"
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="report-modal-header no-print">
                <h3>
                  <FileText size={22} />
                  Monthly Travel Report
                </h3>
                <div className="report-controls">
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    max={new Date().toISOString().slice(0, 7)}
                  />
                  <button
                    onClick={() => setIsEditingConfig(!isEditingConfig)}
                    className="btn-edit-config"
                  >
                    <Edit2 size={18} />
                    {isEditingConfig ? "Hide" : "Edit"}
                  </button>
                  <button onClick={handleDownloadPDF} className="btn-download">
                    <Download size={18} />
                    PDF
                  </button>
                  <button onClick={handlePrint} className="btn-print">
                    <Printer size={18} />
                    Print
                  </button>
                  <button
                    onClick={() => setShowReportModal(false)}
                    className="btn-close-report"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {isEditingConfig && (
                <div className="config-panel no-print">
                  <h4>📝 Edit Report Details</h4>

                  <div className="config-section">
                    <h5>Basic Information</h5>
                    <div className="config-grid">
                      <div className="config-field">
                        <label>Employee Name</label>
                        <input
                          type="text"
                          value={reportConfig.employeeName}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              employeeName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="config-field">
                        <label>Designation</label>
                        <input
                          type="text"
                          value={reportConfig.designation}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              designation: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="config-field">
                        <label>Department</label>
                        <input
                          type="text"
                          value={reportConfig.department}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              department: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="config-field">
                        <label>Sub Department</label>
                        <input
                          type="text"
                          value={reportConfig.subDepartment}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              subDepartment: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="config-section">
                    <h5>Office Information</h5>
                    <div className="config-grid">
                      <div className="config-field">
                        <label>Office Name</label>
                        <input
                          type="text"
                          value={reportConfig.officeName}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              officeName: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="config-field">
                        <label>Office Location</label>
                        <input
                          type="text"
                          value={reportConfig.officeLocation}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              officeLocation: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="config-section">
                    <h5>Gosavara Details</h5>
                    <div className="config-grid">
                      <div className="config-field">
                        <label>Field Work Days</label>
                        <input
                          type="text"
                          value={reportConfig.fieldWorkDays}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              fieldWorkDays: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="config-field">
                        <label>Out of HQ Days</label>
                        <input
                          type="text"
                          value={reportConfig.outOfHQDays}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              outOfHQDays: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="config-field">
                        <label>HQ Days</label>
                        <input
                          type="text"
                          value={reportConfig.hqDays}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              hqDays: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="config-field">
                        <label>Weekly Holidays</label>
                        <input
                          type="text"
                          value={reportConfig.weeklyHolidays}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              weeklyHolidays: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="config-field">
                        <label>Total Days</label>
                        <input
                          type="text"
                          value={reportConfig.totalDays}
                          onChange={(e) =>
                            setReportConfig({
                              ...reportConfig,
                              totalDays: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={saveReportConfig}
                    className="btn-save-config"
                  >
                    <Save size={16} />
                    Save Configuration
                  </button>
                </div>
              )}

              <div className="report-content" ref={printRef}>
                <div className="gov-header">
                  {reportConfig.department && (
                    <p className="line-center">
                      विभाग - {reportConfig.department}
                    </p>
                  )}
                  {reportConfig.subDepartment && (
                    <p className="line-center">
                      उप विभाग - {reportConfig.subDepartment}
                    </p>
                  )}
                  <p className="line-center title">मासिक दैनंदिनी</p>
                  <p className="line-center report-subtitle">
                    श्री. {reportConfig.employeeName},{" "}
                    {reportConfig.designation} यांची माहे -{" "}
                    {getFormattedMonth()} ची मासिक दौरा नोंद
                  </p>
                </div>

                <table className="gov-table">
                  <thead>
                    <tr>
                      <th>दिनांक</th>
                      <th>वार</th>
                      <th>पासून</th>
                      <th>पर्यंत</th>
                      <th>वेळ</th>
                      <th>अंतर</th>
                      <th>वाहन</th>
                      <th>शेरा</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.entries.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          style={{ textAlign: "center", padding: "1.5rem" }}
                        >
                          No entries for selected month
                        </td>
                      </tr>
                    ) : (
                      monthly.entries.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDate(row.date)}</td>
                          <td>{formatDay(row.date)}</td>
                          <td>{row.travelFrom}</td>
                          <td>{row.travelTo}</td>
                          <td className="time-cell">
                            {row.timeFrom} - {row.timeTo}
                          </td>
                          <td>{row.distance}</td>
                          <td>{row.vehicle}</td>
                          <td className="shera-cell">{row.remark || ""}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan="5" className="text-right">
                        <strong>एकूण:</strong>
                      </td>
                      <td>
                        <strong>{monthly.totalDistance.toFixed(2)}</strong>
                      </td>
                      <td colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>

                <div className="gosavara-box">
                  <div className="gosavara-inner">
                    <div className="gos-title">गोषवारा</div>
                    <div className="gos-lines">
                      <div>
                        क्षेत्रीय कामाचे एकूण दिवस -{" "}
                        {reportConfig.fieldWorkDays}
                      </div>
                      <div>
                        मुख्यालयाबाहेरील कामाचे दिवस -{" "}
                        {reportConfig.outOfHQDays}
                      </div>
                      <div>मुख्यालयातील एकूण दिवस - {reportConfig.hqDays}</div>
                      <div>
                        साप्ताहीक सुट्टी व इतर सुट्टी -{" "}
                        {reportConfig.weeklyHolidays}
                      </div>
                      <div>एकूण दिवस - {reportConfig.totalDays}</div>
                    </div>
                  </div>
                </div>

                <div className="sign-section">
                  <div className="sign-name">
                    ( {reportConfig.employeeName} )
                  </div>
                  <div className="sign-name">{reportConfig.designation},</div>
                  {reportConfig.officeName && (
                    <div className="sign-office">
                      {reportConfig.officeName}
                    </div>
                  )}
                  {reportConfig.officeLocation && (
                    <div className="sign-location">
                      {reportConfig.officeLocation}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* STYLES */}
      <style>{`
        :root {
          --purple-100: #f3e8ff;
          --purple-200: #e9d5ff;
          --purple-300: #d8b4fe;
          --purple-400: #c084fc;
          --purple-500: #a855f7;
          --purple-600: #9333ea;
          --pink-100: #fce7f3;
          --pink-400: #f472b6;
          --blue-400: #60a5fa;
          --blue-500: #3b82f6;
          --green-300: #86efac;
          --green-400: #4ade80;
          --red-100: #fee2e2;
          --red-200: #fecaca;
          --red-300: #fca5a5;
          --red-400: #f87171;
          --gray-50: #f9fafb;
          --gray-100: #f3f4f6;
          --gray-200: #e5e7eb;
          --gray-300: #d1d5db;
          --gray-500: #6b7280;
          --gray-600: #4b5563;
          --gray-700: #374151;
        }

        * {
          box-sizing: border-box;
        }

        .dairy-container {
          padding: 1.25rem;
          max-width: 1300px;
          margin: 0 auto;
        }

        .dairy-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }

        .dairy-header-left h2 {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin: 0;
          font-size: 1.6rem;
          background: linear-gradient(135deg, var(--purple-500), var(--pink-400));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .dairy-header-left p {
          margin: 0.15rem 0 0;
          color: var(--gray-500);
          font-size: 0.9rem;
        }

        .dairy-header-actions {
          display: flex;
          gap: 0.6rem;
        }

        .btn-add-dairy,
        .btn-report {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          color: #fff;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.95rem;
        }

        .btn-add-dairy {
          background: linear-gradient(135deg, var(--purple-400), var(--pink-400));
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.25);
        }

        .btn-add-dairy:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(168, 85, 247, 0.35);
        }

        .btn-report {
          background: linear-gradient(135deg, var(--blue-400), var(--blue-500));
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
        }

        .btn-report:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
        }

        .dairy-loading,
        .dairy-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          color: var(--gray-500);
          text-align: center;
        }

        .spinner-dairy {
          width: 36px;
          height: 36px;
          border: 4px solid var(--purple-200);
          border-top-color: var(--purple-500);
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 0.75rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .dairy-empty h3 {
          margin: 1rem 0 0.5rem;
          color: var(--gray-500);
          font-size: 1.2rem;
        }

        .dairy-empty p {
          color: var(--gray-500);
          margin: 0.25rem 0 1.5rem;
        }

        .btn-empty-dairy {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          background: linear-gradient(135deg, var(--purple-400), var(--pink-400));
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-empty-dairy:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(168, 85, 247, 0.35);
        }

        .dairy-table-container {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(168, 85, 247, 0.1);
          overflow-x: auto;
        }

        .dairy-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 900px;
        }

        .dairy-table thead {
          background: linear-gradient(135deg, var(--purple-400), var(--pink-400));
        }

        .dairy-table th {
          padding: 0.8rem 0.75rem;
          text-align: left;
          font-size: 0.83rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #fff;
          font-weight: 700;
        }

        .dairy-table td {
          padding: 0.8rem 0.75rem;
          border-bottom: 1px solid var(--gray-200);
          font-size: 0.92rem;
        }

        .clickable-row {
          cursor: pointer;
          transition: background-color 0.2s ease;
        }

        .clickable-row:hover {
          background-color: #faf5ff !important;
        }

        .inline-icon {
          margin-right: 0.35rem;
          color: var(--purple-400);
          vertical-align: middle;
        }

        .td-date {
          font-weight: 700;
          color: var(--blue-400);
        }

        .td-duration {
          font-weight: 700;
          color: var(--purple-500);
        }

        .td-distance {
          font-weight: 700;
          color: var(--green-400);
        }

        .td-remark {
          color: var(--gray-600);
          font-style: italic;
          font-size: 0.88rem;
        }

        /* MODALS */
        .entry-options-backdrop,
        .delete-confirm-backdrop,
        .dairy-modal-backdrop,
        .report-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 6000;
          padding: 1rem;
        }

        .delete-confirm-backdrop {
          background: rgba(0, 0, 0, 0.5);
          z-index: 7000;
        }

        .dairy-modal-backdrop,
        .report-modal-backdrop {
          z-index: 5000;
        }

        .entry-options-modal,
        .delete-confirm-modal,
        .dairy-modal-content,
        .report-modal-content {
          background: #fff;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 22px 60px rgba(168, 85, 247, 0.25);
        }

        .dairy-modal-content {
          max-width: 700px;
          max-height: 92vh;
          overflow: auto;
        }

        .report-modal-content {
          max-width: 950px;
          width: 95%;
          max-height: 92vh;
          overflow: auto;
        }

        .delete-confirm-modal {
          max-width: 480px;
          border-radius: 20px;
        }

        .entry-options-header,
        .dairy-modal-header,
        .report-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.25rem;
          border-bottom: 2px solid var(--purple-100);
          background: linear-gradient(135deg, var(--purple-50), var(--pink-100));
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .entry-options-header h3,
        .dairy-modal-header h3,
        .report-modal-header h3 {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          margin: 0;
          font-size: 1.15rem;
          color: var(--gray-700);
        }

        .btn-close-options,
        .btn-close-modal,
        .btn-close-report {
          background: var(--purple-100);
          border: none;
          border-radius: 8px;
          padding: 0.5rem;
          cursor: pointer;
          color: var(--purple-600);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-close-options:hover,
        .btn-close-modal:hover,
        .btn-close-report:hover {
          background: var(--purple-200);
          color: var(--purple-700);
        }

        .entry-details {
          padding: 1.25rem;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid var(--gray-200);
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-row .label {
          font-weight: 600;
          color: var(--gray-500);
          font-size: 0.9rem;
        }

        .detail-row .value {
          font-weight: 500;
          color: var(--gray-700);
          text-align: right;
          word-break: break-word;
        }

        .entry-options-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-top: 2px solid var(--purple-100);
          background: var(--gray-50);
        }

        .btn-edit-entry,
        .btn-delete-entry-modal {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.75rem;
          color: white;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-edit-entry {
          background: linear-gradient(135deg, var(--blue-400), var(--blue-500));
        }

        .btn-edit-entry:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(59, 130, 246, 0.35);
        }

        .btn-delete-entry-modal {
          background: linear-gradient(135deg, var(--red-300), var(--red-400));
        }

        .btn-delete-entry-modal:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(248, 113, 113, 0.35);
        }

        /* DELETE MODAL */
        .delete-icon-container {
          display: flex;
          justify-content: center;
          padding: 2rem 1.5rem 1rem;
          background: linear-gradient(135deg, var(--red-100), var(--red-200));
        }

        .delete-icon-circle {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--red-200), var(--red-300));
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--red-400);
          box-shadow: 0 8px 24px rgba(248, 113, 113, 0.25);
        }

        .delete-content {
          padding: 1.5rem 1.75rem;
          text-align: center;
        }

        .delete-content h3 {
          margin: 0 0 0.75rem;
          font-size: 1.5rem;
          color: var(--red-400);
          font-weight: 700;
        }

        .delete-content p {
          margin: 0 0 1.25rem;
          color: var(--gray-500);
          font-size: 0.95rem;
          line-height: 1.6;
        }

        .delete-entry-summary {
          background: var(--gray-50);
          border: 2px solid var(--gray-200);
          border-radius: 12px;
          padding: 1rem;
          text-align: left;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.5rem 0;
          border-bottom: 1px solid var(--gray-200);
        }

        .summary-item:last-child {
          border-bottom: none;
        }

        .summary-label {
          font-weight: 600;
          color: var(--gray-500);
          font-size: 0.88rem;
        }

        .summary-value {
          font-weight: 600;
          color: var(--gray-700);
          font-size: 0.92rem;
        }

        .delete-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1.25rem 1.75rem;
          background: var(--gray-50);
          border-top: 2px solid var(--gray-200);
        }

        .btn-cancel-delete {
          flex: 1;
          padding: 0.85rem 1.25rem;
          background: #fff;
          border: 2px solid var(--gray-300);
          border-radius: 12px;
          color: var(--gray-600);
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel-delete:hover {
          background: var(--gray-100);
          border-color: var(--gray-400);
          color: var(--gray-700);
          transform: translateY(-1px);
        }

        .btn-confirm-delete {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem 1.25rem;
          background: linear-gradient(135deg, var(--red-300), var(--red-400));
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(248, 113, 113, 0.3);
        }

        .btn-confirm-delete:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(248, 113, 113, 0.4);
        }

        /* FORM */
        .dairy-form {
          padding: 1rem 1.25rem;
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          margin-bottom: 0.4rem;
          font-weight: 600;
          color: var(--gray-700);
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .required {
          color: var(--red-400);
        }

        .form-input,
        .time-select,
        .time-period,
        .remark-textarea {
          padding: 0.7rem;
          border: 1px solid var(--purple-200);
          border-radius: 8px;
          font-size: 0.95rem;
          transition: all 0.2s ease;
          font-family: inherit;
          width: 100%;
        }

        .form-input:focus,
        .time-select:focus,
        .time-period:focus,
        .remark-textarea:focus {
          outline: none;
          border-color: var(--purple-400);
          box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
        }

        .form-input.error,
        .time-select.error {
          border-color: var(--red-400);
          background: #fff5f5;
        }

        .error-text {
          color: var(--red-400);
          font-size: 0.8rem;
          margin-top: 0.25rem;
        }

        .remark-textarea {
          resize: vertical;
          min-height: 70px;
        }

        .time-input-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .time-select {
          flex: 1;
          cursor: pointer;
        }

        .time-separator {
          font-weight: 700;
          font-size: 1.2rem;
          color: var(--gray-500);
        }

        .time-period {
          flex: 0.8;
          background: linear-gradient(135deg, var(--purple-50), var(--pink-100));
          cursor: pointer;
        }

        .dairy-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.6rem;
          padding: 1rem 1.25rem;
          border-top: 2px solid var(--purple-100);
          background: var(--gray-50);
          position: sticky;
          bottom: 0;
        }

        .btn-cancel {
          padding: 0.6rem 1.2rem;
          background: #fff;
          border: 1px solid var(--gray-300);
          border-radius: 8px;
          color: var(--gray-600);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-cancel:hover {
          background: var(--gray-100);
          border-color: var(--gray-400);
          color: var(--gray-700);
        }

        .btn-save {
          display: flex;
          align-items: center;
          gap: 0.45rem;
          background: linear-gradient(135deg, var(--purple-400), var(--pink-400));
          color: #fff;
          border: none;
          border-radius: 8px;
          padding: 0.6rem 1.2rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-save:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
        }

        /* REPORT */
        .report-controls {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .report-controls input[type="month"] {
          padding: 0.45rem 0.6rem;
          border: 1px solid var(--purple-200);
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .btn-print,
        .btn-download,
        .btn-edit-config {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.8rem;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          color: #fff;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.9rem;
        }

        .btn-edit-config {
          background: linear-gradient(135deg, var(--purple-400), var(--purple-500));
        }

        .btn-print {
          background: linear-gradient(135deg, var(--blue-400), var(--blue-500));
        }

        .btn-download {
          background: linear-gradient(135deg, var(--green-300), var(--green-400));
        }

        .btn-edit-config:hover,
        .btn-print:hover,
        .btn-download:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .config-panel {
          padding: 1.25rem;
          background: var(--gray-50);
          border-bottom: 2px solid var(--purple-100);
          max-height: 60vh;
          overflow-y: auto;
        }

        .config-panel h4 {
          margin: 0 0 1rem;
          color: var(--gray-700);
          font-size: 1.1rem;
        }

        .config-section {
          margin-bottom: 1.5rem;
        }

        .config-section h5 {
          margin: 0 0 0.75rem;
          color: var(--purple-600);
          font-size: 0.95rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .config-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 0.75rem;
        }

        .config-field label {
          display: block;
          margin-bottom: 0.35rem;
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--gray-600);
        }

        .config-field input {
          width: 100%;
          padding: 0.5rem;
          border: 1px solid var(--purple-200);
          border-radius: 6px;
          font-size: 0.9rem;
        }

        .config-field input:focus {
          outline: none;
          border-color: var(--purple-400);
          box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
        }

        .btn-save-config {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 1.2rem;
          background: linear-gradient(135deg, var(--purple-400), var(--pink-400));
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-top: 1rem;
        }

        .btn-save-config:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(168, 85, 247, 0.35);
        }

        .report-content {
          padding: 0.5cm;
          font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Devanagari", sans-serif;
        }

        .gov-header {
          margin-bottom: 0.3cm;
          text-align: center;
        }

        .gov-header .line-center {
          margin: 0.05rem 0;
          font-size: 0.88rem;
        }

        .gov-header .title {
          font-weight: 800;
          font-size: 1.05rem;
          margin: 0.1rem 0;
          text-decoration: underline;
        }

        .gov-header .report-subtitle {
          font-size: 0.88rem;
          margin: 0.08rem 0;
          font-weight: 500;
        }

        .gov-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
          margin-bottom: 0.4cm;
        }

        .gov-table th,
        .gov-table td {
          border: 1.3px solid #000;
          padding: 0.18rem 0.25rem;
          line-height: 1.15;
        }

        .gov-table th {
          font-weight: 800;
          text-align: center;
          background: var(--gray-100);
          font-size: 0.76rem;
        }

        .gov-table td {
          vertical-align: top;
        }

        .gov-table tfoot td {
          text-align: right;
          font-weight: 700;
        }

        .time-cell {
          font-size: 0.72rem;
        }

        .shera-cell {
          min-width: 90px;
          word-wrap: break-word;
        }

        .text-right {
          text-align: right;
        }

        .gosavara-box {
          margin-top: 0.35cm;
        }

        .gosavara-inner {
          width: 9cm;
          border: 1.5px solid #000;
          padding: 0.25cm 0.3cm;
        }

        .gos-title {
          font-weight: 800;
          text-align: center;
          margin-bottom: 0.12cm;
          font-size: 0.88rem;
        }

        .gos-lines > div {
          padding: 0.05cm 0;
          border-bottom: 1px solid #bbb;
          font-size: 0.82rem;
        }

        .gos-lines > div:last-child {
          border-bottom: none;
        }

        .sign-section {
          margin-top: 0.6cm;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
          gap: 0.1rem;
          font-size: 0.88rem;
        }

        .sign-name,
        .sign-office,
        .sign-location {
          font-size: 0.9rem;
          font-weight: 500;
        }

        /* PRINT */
        @media print {
          body * {
            visibility: hidden;
          }

          .report-content,
          .report-content * {
            visibility: visible;
          }

          .report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0.4cm 0.5cm;
          }

          .no-print {
            display: none !important;
          }

          @page {
            size: A4;
            margin: 0.8cm;
          }
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .dairy-container {
            padding: 1rem;
          }

          .dairy-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 1rem;
          }

          .dairy-header-actions {
            width: 100%;
            grid-template-columns: 1fr;
          }

          .dairy-table-container {
            overflow-x: auto;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .report-controls {
            width: 100%;
            flex-direction: column;
          }

          .report-controls input[type="month"],
          .btn-print,
          .btn-download,
          .btn-edit-config,
          .btn-close-report {
            width: 100%;
          }

          .config-grid {
            grid-template-columns: 1fr;
          }

          .entry-options-actions,
          .delete-actions {
            flex-direction: column;
          }

          .dairy-modal-footer {
            flex-direction: column;
          }

          .btn-cancel,
          .btn-save,
          .btn-edit-entry,
          .btn-delete-entry-modal,
          .btn-cancel-delete,
          .btn-confirm-delete {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .dairy-header-left h2 {
            font-size: 1.3rem;
          }

          .btn-add-dairy,
          .btn-report {
            font-size: 0.9rem;
            padding: 0.65rem 0.85rem;
          }

          .dairy-table {
            font-size: 0.85rem;
          }

          .form-group label {
            font-size: 0.85rem;
          }

          .form-input,
          .time-select,
          .time-period,
          .remark-textarea {
            font-size: 16px; /* Prevents iOS zoom */
          }
        }
      `}</style>
    </>
  );
};

export default Dairy;