import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./StudentAttendance.css";
import api from "./api";

import kqlogo from "./kqlogo.png";
import dash from "./dashboard.png";
import contacts from "./contacts.png";
import calendar from "./calendar.png";
import requests from "./requests.png";
import att from "./person.png";
import logout from "./logout.png";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMonthStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

function monthLabel(monthStr) {
    const [y, m] = monthStr.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
}

function daysInMonth(year, monthIndex0) {
    return new Date(year, monthIndex0 + 1, 0).getDate();
}

function formatTime(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const hour12 = h % 12 || 12;
    const ampm = h >= 12 ? "PM" : "AM";
    return `${hour12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function statusToClass(status) {
    // scheduled/present -> green
    if (status === "excused") return "tile excused";
    if (status === "absent") return "tile absent";
    if (status === "makeup") return "tile makeup";
    return "tile scheduled";
}

export default function StudentAttendanceMonth() {
    const navigate = useNavigate();
    const { student_id } = useParams();

    const [sideBarOpen, setSideBarOpen] = useState(true);
    const [user, setUser] = useState(null);

    const [month, setMonth] = useState(() => toMonthStr(new Date()));
    const [items, setItems] = useState([]); // calendar items from API
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState("");
    const [msgType, setMsgType] = useState("info"); // info|success|error

    // modal state
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(null);
    const [editStatus, setEditStatus] = useState("present");
    const [editNotes, setEditNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [hoursSummary, setHoursSummary] = useState(null);
    const [hoursLoading, setHoursLoading] = useState(false);

    // Load admin/user name
    useEffect(() => {
        const userId = localStorage.getItem("userID");
        if (!userId) return;

        fetch(`http://localhost:5001/user/${encodeURIComponent(userId)}`)
            .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
            .then((data) => {
                const first = data.first_name ?? data.firstName ?? "";
                const last = data.last_name ?? data.lastName ?? "";
                if (first || last) setUser({ firstName: first, lastName: last, ...data });
            })
            .catch(() => { });
    }, []);

    // Fetch month calendar
    useEffect(() => {
        let cancelled = false;

        async function loadMonth() {
            setLoading(true);
            setMsg("");

            try {
                // ✅ Endpoint we created:
                // GET /api/attendance/student/:id/calendar?month=YYYY-MM
                const res = await api.get(`/viewMonthly/byMonth/${student_id}`, {
                    params: { month },
                });

                if (cancelled) return;
                const data = res.data?.items ?? [];
                setItems(Array.isArray(data) ? data : []);
                if (!data || data.length === 0) {
                    setMsgType("info");
                    setMsg("No scheduled sessions found for this month.");
                }
            } catch (e) {
                if (!cancelled) {
                    setMsgType("error");
                    setMsg(e?.response?.data?.message || "Failed to load month attendance.");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        loadMonth();
        return () => {
            cancelled = true;
        };
    }, [student_id, month]);

    useEffect(() => {
        let cancelled = false;

        async function loadHours() {
            setHoursLoading(true);
            try {
                // If your backend route is: /api/viewPayment/studentHours/:student_id?month=YYYY-MM
                const res = await api.get(`/viewPayment/studentHours/${student_id}`, {
                    params: { month }, // or startDate/endDate, but month is easiest
                });

                if (!cancelled) setHoursSummary(res.data);
            } catch (e) {
                if (!cancelled) setHoursSummary(null);
                console.error("Failed to load hours summary", e);
            } finally {
                if (!cancelled) setHoursLoading(false);
            }
        }

        if (student_id) loadHours();
        return () => { cancelled = true; };
    }, [student_id, month]);


    // Group items by date (YYYY-MM-DD)
    const byDate = useMemo(() => {
        const map = new Map();
        for (const it of items) {
            const d = String(it.session_date).slice(0, 10);
            if (!map.has(d)) map.set(d, []);
            map.get(d).push(it);
        }
        // sort inside each day by start_time
        for (const [k, arr] of map.entries()) {
            arr.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)));
            map.set(k, arr);
        }
        return map;
    }, [items]);

    // Build calendar grid
    const calendarCells = useMemo(() => {
        const [y, m] = month.split("-").map(Number);
        const monthIndex0 = m - 1;
        const totalDays = daysInMonth(y, monthIndex0);

        const firstDow = new Date(y, monthIndex0, 1).getDay(); // 0=Sun
        const cells = [];

        // leading blanks
        for (let i = 0; i < firstDow; i++) cells.push(null);

        // actual days
        for (let d = 1; d <= totalDays; d++) {
            const dateObj = new Date(y, monthIndex0, d);
            const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            cells.push({ dayNum: d, iso, dow: dateObj.getDay() });
        }

        // trailing blanks to fill rows
        while (cells.length % 7 !== 0) cells.push(null);

        return cells;
    }, [month]);

    function prevMonth() {
        const [y, m] = month.split("-").map(Number);
        const d = new Date(y, m - 1, 1);
        d.setMonth(d.getMonth() - 1);
        setMonth(toMonthStr(d));
    }

    function nextMonth() {
        const [y, m] = month.split("-").map(Number);
        const d = new Date(y, m - 1, 1);
        d.setMonth(d.getMonth() + 1);
        setMonth(toMonthStr(d));
    }

    function openModal(item) {
        setSelected(item);
        setEditStatus(item.status === "scheduled" ? "present" : item.status);
        setEditNotes(item.notes ?? "");
        setOpen(true);
    }

    async function saveAttendance() {
        if (!selected) return;

        setSaving(true);
        setMsg("");

        try {
            // ✅ Adjust this route to your actual markAbsence endpoint.
            // You need: session_instance_id, student_id, status, notes
            await api.post("/track/markAttendance", {
                sessionID: selected.session_instance_id,
                studentID: Number(student_id),
                status: editStatus,
                notes: editNotes || null,
            });

            // refresh month after save
            const res = await api.get(`/attendance/student/${student_id}/calendar`, {
                params: { month },
            });
            setItems(res.data?.items ?? []);

            const hrs = await api.get(`/viewPayment/studentHours/${student_id}`, {
                params: { month },
              });
              setHoursSummary(hrs.data);

            setMsgType("success");
            setMsg("Attendance updated.");
            setOpen(false);
        } catch (e) {
            setMsgType("error");
            setMsg(e?.response?.data?.message || "Failed to update attendance.");
        } finally {
            setSaving(false);
        }
    }

    // nav handlers (match your pages)
    const handleLogin = () => navigate("/loginPage");
    const handleDirectory = () => navigate("/directory");
    const handleDashboard = () => navigate("/dashboard");
    const handleSchedule = () => navigate("/schedule");
    const handleRequestsPages = () => navigate("/requests");
    const handleAttendancePage = () => navigate("/attendance");
    const handleStudentsPage = () => navigate("/students");

    return (
        <div className="student-attendance-page">
            <div className={`app-shell ${sideBarOpen ? "sidebar-open" : "sidebar-closed"}`}>
                <nav className="header">
                    <button className="sidebar-toggle" onClick={() => setSideBarOpen((v) => !v)}>☰</button>

                    <div className="header-left">
                        <img src={kqlogo} alt="Logo" className="logo" />
                        <h1>KnowledgeQuest</h1>
                    </div>

                    <div className="header-right">
                        <h3>{user ? `${user.firstName} ${user.lastName}` : "Admin"}</h3>
                    </div>
                </nav>

                <div className="app-body">
                    <aside className="sidebar">
                        <button className="nav-link" onClick={handleDashboard}>
                            <img src={dash} className="logo-1" alt="" />
                            <span className="nav-text">Dashboard</span>
                        </button>
                        <button className="nav-link" onClick={handleDirectory}>
                            <img src={contacts} className="logo-1" alt="" />
                            <span className="nav-text">Tutor Directory</span>
                        </button>
                        <button className="nav-link" onClick={handleStudentsPage}>
                            <img src={contacts} className="logo-1" alt="" />
                            <span className="nav-text">Students</span>
                        </button>
                        <button className="nav-link" onClick={handleRequestsPages}>
                            <img src={requests} className="logo-1" alt="" />
                            <span className="nav-text">Requests</span>
                        </button>
                        <button className="nav-link" onClick={handleSchedule}>
                            <img src={calendar} className="logo-1" alt="" />
                            <span className="nav-text">Schedule</span>
                        </button>
                        <button className="nav-link" onClick={handleAttendancePage}>
                            <img src={att} className="logo-1" alt="" />
                            <span className="nav-text">Attendance</span>
                        </button>
                        <button className="nav-link" onClick={handleLogin}>
                            <img src={logout} className="logo-1" alt="" />
                            <span className="nav-text">Logout</span>
                        </button>
                    </aside>

                    <main className="main-content">
                        <div className="card">
                            <div className="cal-top">
                                <button className="btn" onClick={() => navigate(-1)}>← Back</button>
                                <div className="cal-title">
                                    <h2>Attendance Calendar</h2>
                                    <p className="muted">
                                        {hoursLoading ? (
                                            "Hours Remaining: loading…"
                                        ) : hoursSummary ? (
                                            <>
                                                Hours Remaining: <b>{hoursSummary.hoursRemaining}</b>
                                                
                                            </>
                                        ) : (
                                            "Hours Remaining: —"
                                        )}
                                    </p>

                                </div>

                                <div className="cal-controls">
                                    <button className="btn" onClick={prevMonth} disabled={loading}>←</button>
                                    <div className="month-pill">{monthLabel(month)}</div>
                                    <button className="btn" onClick={nextMonth} disabled={loading}>→</button>
                                </div>
                            </div>

                            <Legend />

                            {msg ? <div className={`notice ${msgType}`}>{msg}</div> : null}

                            {loading ? (
                                <div className="muted">Loading calendar…</div>
                            ) : (
                                <div className="calendar">
                                    <div className="dow">
                                        {WEEKDAY.map((d) => (
                                            <div key={d} className="dow-cell">{d}</div>
                                        ))}
                                    </div>

                                    <div className="grid">
                                        {calendarCells.map((cell, idx) => {
                                            if (!cell) return <div key={idx} className="day blank" />;

                                            const dayItems = byDate.get(cell.iso) || [];

                                            return (
                                                <div key={cell.iso} className="day">
                                                    <div className="day-head">
                                                        <div className="day-num">{cell.dayNum}</div>
                                                    </div>

                                                    <div className="day-body">
                                                        {dayItems.length === 0 ? (
                                                            <div className="empty">—</div>
                                                        ) : (
                                                            dayItems.map((it) => (
                                                                <button
                                                                    key={it.session_instance_id}
                                                                    className={statusToClass(it.status)}
                                                                    onClick={() => openModal(it)}
                                                                    type="button"
                                                                    title={`${it.day} ${formatTime(it.start_time)} • ${it.status}`}
                                                                >
                                                                    <div className="tile-top">
                                                                        {formatTime(it.start_time)}
                                                                    </div>
                                                                    <div className="tile-sub">
                                                                        {it.tutor_first_name} {it.tutor_last_name}
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </div>

                {/* Modal */}
                {open && selected && (
                    <div className="modal-backdrop" onClick={() => !saving && setOpen(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-head">
                                <h3>Update Attendance</h3>
                                <button className="icon-btn" onClick={() => !saving && setOpen(false)}>✕</button>
                            </div>

                            <div className="modal-meta">
                                <div><b>Date:</b> {String(selected.session_date).slice(0, 10)}</div>
                                <div><b>Time:</b> {formatTime(selected.start_time)}</div>
                                <div><b>Tutor:</b> {selected.tutor_first_name} {selected.tutor_last_name}</div>
                            </div>

                            <label className="field">
                                <span>Status</span>
                                <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                                    <option value="present">Present (green)</option>
                                    <option value="excused">Excused (yellow)</option>
                                    <option value="absent">Absent/No-show (red)</option>
                                    <option value="makeup">Makeup (blue)</option>
                                </select>
                            </label>

                            <label className="field">
                                <span>Notes</span>
                                <textarea
                                    value={editNotes}
                                    onChange={(e) => setEditNotes(e.target.value)}
                                    placeholder="Optional notes…"
                                    rows={3}
                                />
                            </label>

                            <div className="modal-actions">
                                <button className="btn" onClick={() => setOpen(false)} disabled={saving}>
                                    Cancel
                                </button>
                                <button className="btn primary" onClick={saveAttendance} disabled={saving}>
                                    {saving ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function Legend() {
    return (
        <div className="legend">
            <div className="leg-item"><span className="dot scheduled" /> Scheduled/Present</div>
            <div className="leg-item"><span className="dot excused" /> Excused (CAB)</div>
            <div className="leg-item"><span className="dot absent" /> No-show</div>
            <div className="leg-item"><span className="dot makeup" /> Makeup</div>
        </div>
    );
}
