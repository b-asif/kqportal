import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Schedule.css";
import api from "./api";

import kqlogo from "./kqlogo.png";
import dash from "./dashboard.png"
import contacts from "./contacts.png"
import calendar from "./calendar.png"
import requests from "./requests.png"
import att from "./person.png"
import logout from "./logout.png"
import students from "./students.png"
import enroll from "./enroll.png"

const DAYS = ["MON", "TUES", "WED", "THURS", "FRI"];

// Week grid tuning
const START_MINUTES = 8 * 60;   // 8:00 AM
const END_MINUTES = 19 * 60;    // 7:00 PM
const STEP_MINUTES = 15;        // 15-min blocks

function getTodayYYYYMMDD() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function yyyymmdd(dateObj) {
    const yyyy = dateObj.getFullYear();
    const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
    const dd = String(dateObj.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function addDays(dateObj, days) {
    const d = new Date(dateObj);
    d.setDate(d.getDate() + days);
    return d;
}

function getMonday(dateStrYYYYMMDD) {
    // Treat as local date
    const [y, m, d] = dateStrYYYYMMDD.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    const day = dt.getDay(); // 0 Sun, 1 Mon, ...
    const diffToMon = (day + 6) % 7; // Mon->0, Tue->1, Sun->6
    dt.setDate(dt.getDate() - diffToMon);
    return dt;
}

function toMinutes(hhmmss) {
    // "13:45" or "13:45:00"
    const [hh, mm] = hhmmss.split(":");
    return Number(hh) * 60 + Number(mm);
}

function minutesToLabel(m) {
    const h24 = Math.floor(m / 60);
    const mm = String(m % 60).padStart(2, "0");
    const h12 = ((h24 + 11) % 12) + 1;
    const ampm = h24 >= 12 ? "PM" : "AM";
    return `${h12}:${mm} ${ampm}`;
}

function addMinutesToTimeStr(hhmmss, addMin) {
    const base = toMinutes(hhmmss);
    const total = base + addMin;
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    return `${hh}:${mm}:00`;
}

function hashColor(seed) {
    // Simple stable color picker without libs
    const colors = ["#7c3aed", "#f59e0b", "#22c55e", "#ec4899", "#06b6d4", "#a855f7", "#ef4444"];
    let h = 0;
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
    return colors[h % colors.length];
}

export default function Schedule() {
    const navigate = useNavigate();

    const [sideBarOpen, setSideBarOpen] = useState(true);

    // Pick any date; we show that week
    const [selectedDate, setSelectedDate] = useState(getTodayYYYYMMDD());

    const [user, setUser] = useState(null);

    const [loadingWeek, setLoadingWeek] = useState(false);
    const [message, setMessage] = useState("");
    const [weekSessions, setWeekSessions] = useState([]); // <- what the grid consumes

    // Load user (same as your dashboard)
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

    // Compute week range (Mon–Fri) from selected date
    const weekStart = useMemo(() => getMonday(selectedDate), [selectedDate]);
    const weekDates = useMemo(() => {
        // Mon..Fri
        return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
    }, [weekStart]);

    // Fetch week data using your existing /date endpoint
    useEffect(() => {
        let cancelled = false;

        async function loadWeek() {
            setLoadingWeek(true);
            setMessage("");

            try {
                const results = await Promise.all(
                    weekDates.map((d) =>
                        api
                            .get("/viewScheduleFor/date", { params: { date: yyyymmdd(d) } })
                            .then((res) => ({ date: yyyymmdd(d), data: res.data }))
                            .catch(() => ({ date: yyyymmdd(d), data: [] }))
                    )
                );

                if (cancelled) return;

                // Flatten into the weekSessions structure the grid expects
                const flattened = [];
                for (let dayIndex = 0; dayIndex < results.length; dayIndex++) {
                    const dayRes = results[dayIndex];
                    const sessions = Array.isArray(dayRes.data) ? dayRes.data : [];

                    for (const s of sessions) {
                        const start = s.start_time ?? s.start ?? "08:00:00";
                        // If your backend doesn't provide end_time, default to 60 min blocks:
                        const end = s.end_time ?? s.end ?? addMinutesToTimeStr(start, 60);

                        const tutorName = `${s.tutor_first_name ?? ""} ${s.tutor_last_name ?? ""}`.trim();
                        const students = Array.isArray(s.students) ? s.students : [];

                        // Title idea: show tutor + students, tweak however you want:
                        const title =
                            students.length > 0
                                ? students.map(st => `${st.first_name} ${st.last_name}`).join(", ")
                                : (tutorName || "Session");

                        flattened.push({
                            id: s.session_id ?? s.id ?? `${dayRes.date}-${start}-${tutorName}-${Math.random()}`,
                            dayIndex,          // 0..4 (Mon..Fri)
                            start,             // "HH:MM:SS"
                            end,               // "HH:MM:SS"
                            title,
                            subtitle: tutorName ? `Tutor: ${tutorName}` : "",
                            color: hashColor(tutorName || title),
                        });
                    }
                }

                setWeekSessions(flattened);
                if (flattened.length === 0) setMessage("No sessions scheduled for this week.");
            } catch (e) {
                if (!cancelled) {
                    setWeekSessions([]);
                    setMessage("Failed to load weekly schedule.");
                }
            } finally {
                if (!cancelled) setLoadingWeek(false);
            }
        }

        loadWeek();
        return () => {
            cancelled = true;
        };
    }, [weekDates]);

    // ---- Weekly grid render helpers ----
    const { rows, totalRows } = useMemo(() => {
        const r = [];
        for (let t = START_MINUTES; t <= END_MINUTES; t += STEP_MINUTES) r.push(t);
        return { rows: r, totalRows: r.length };
    }, []);

    const items = useMemo(() => {
        return (weekSessions ?? []).map((s) => {
            const startM = toMinutes(s.start);
            const endM = toMinutes(s.end);

            const startRow = Math.floor((startM - START_MINUTES) / STEP_MINUTES) + 2; // row 1 header
            const span = Math.max(1, Math.ceil((endM - startM) / STEP_MINUTES));

            return { ...s, startRow, span };
        });
    }, [weekSessions]);

    // nav handlers
    const handleLogin = () => navigate("/loginPage");
    const handleDirectory = () => navigate("/directory");
    const handleDashboard = () => navigate("/dashboard");
    const handleSchedule = () => navigate("/schedule");
    const handleRequestsPages = () => navigate("/requests");
    const handleAttendancePage = () => navigate("/attendance");
    const handleStudentPage = () => navigate("/students");
    const handleEnrollment = () => navigate("/enrollment");

    return (
        <div className="schedule-page">
            <div className={`app-shell ${sideBarOpen ? "sidebar-open" : "sidebar-closed"}`}>
                <nav className="header">
                    <button className="sidebar-toggle" onClick={() => setSideBarOpen((v) => !v)}>
                        ☰
                    </button>

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
                        <div className="profile">
                            <div className="avatar">
                                {user?.firstName?.[0] ?? "A"}
                                {user?.lastName?.[0] ?? "D"}
                            </div>
                            <p className="name">{user ? `${user.first_name}` : "Admin"}</p>
                            <p className="courses">Admin Dashboard</p>
                        </div>

                        <button className="nav-link" onClick={handleDashboard}>
                            <img src={dash} className="logo-1" alt="" />
                            <span className="nav-text">Dashboard</span>
                        </button>
                        <button className="nav-link" onClick={handleDirectory}>
                            <img src={contacts} className="logo-1" alt="" />
                            <span className="nav-text">Tutor Directory</span>
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
                        <button className="nav-link" onClick={handleStudentPage}>
                            <img src={students} className="logo-1" alt="" />
                            <span className="nav-text">Students</span>
                        </button>
                        <button className="nav-link" onClick={handleEnrollment}>
                            <img src={enroll} className="logo-1" alt="" />
                            <span className="nav-text">Enrollment</span>
                        </button>

                        <button className="nav-link" onClick={handleLogin}>
                            <img src={logout} className="logo-1" alt="" />
                            <span className="nav-text">Logout</span>
                        </button>

                    </aside>

                    <main className="main-content">
                        <div className="card">
                            <div className="schedule-controls">
                                <label>
                                    Week of
                                    <input
                                        type="date"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </label>
                            </div>

                            {loadingWeek ? (
                                <div className="muted">Loading weekly schedule…</div>
                            ) : message ? (
                                <div className="muted">{message}</div>
                            ) : (
                                <div className="week-wrap">
                                    <div
                                        className="week-grid"
                                        style={{
                                            gridTemplateColumns: `120px repeat(5, minmax(220px, 1fr))`,
                                            gridTemplateRows: `44px repeat(${totalRows}, 28px)`,
                                        }}
                                    >
                                        <div className="cell corner" />
                                        {DAYS.map((d, i) => (
                                            <div
                                                key={d}
                                                className="cell day-header"
                                                style={{ gridColumn: i + 2, gridRow: 1 }}
                                            >
                                                {d}
                                            </div>
                                        ))}

                                        {rows.map((t, idx) => (
                                            <div
                                                key={t}
                                                className="cell time-cell"
                                                style={{ gridColumn: 1, gridRow: idx + 2 }}
                                            >
                                                {idx % 4 === 0 ? minutesToLabel(t) : ""}
                                            </div>
                                        ))}

                                        {rows.map((_, r) =>
                                            DAYS.map((__, c) => (
                                                <div
                                                    key={`${r}-${c}`}
                                                    className="cell grid-bg"
                                                    style={{ gridColumn: c + 2, gridRow: r + 2 }}
                                                />
                                            ))
                                        )}

                                        {items.map((s) => (
                                            <div
                                                key={s.id}
                                                className="event"
                                                style={{
                                                    gridColumn: s.dayIndex + 2,
                                                    gridRow: `${s.startRow} / span ${s.span}`,
                                                    background: s.color || "#f59e0b",
                                                }}
                                                title={`${s.title} (${s.start}–${s.end})`}
                                            >
                                                <div className="event-title">{s.title}</div>
                                                {s.subtitle && <div className="event-subtitle">{s.subtitle}</div>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
