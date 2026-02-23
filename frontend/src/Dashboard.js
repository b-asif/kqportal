import React, { useEffect, useMemo, useState } from "react";
import "./Dashboard.css";
import { useNavigate } from "react-router-dom";
import api from "./api";
import kqlogo from "./kqlogo.png";
import dash from "./dashboard.png";
import contacts from "./contacts.png";
import calendar from "./calendar.png";
import requests from "./requests.png";
import att from "./person.png";
import logout from "./logout.png";
import students from "./students.png";
import enroll from "./enroll.png";

function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    // weekly format we expect:
    // {
    //   Monday:   [ { student_id, first_name, last_name, attendance_status }, ... ],
    //   Tuesday:  [ ... ],
    //   ...
    // }
    const [weekly, setWeekly] = useState(null);
    const [loadingWeekly, setLoadingWeekly] = useState(false);
    const [weeklyMessage, setWeeklyMessage] = useState("");

    const [loading, setLoading] = useState(false);
    const [sideBarOpen, setSideBarOpen] = useState(true);

    useEffect(() => {
        const userId = localStorage.getItem("userID");
        if (!userId) return;

        setLoading(true);
        fetch(`http://localhost:5001/user/${encodeURIComponent(userId)}`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((data) => {
                if (data?.first_name || data?.firstName) {
                    const first = data.first_name ?? data.firstName;
                    const last = data.last_name ?? data.lastName;
                    setUser({ firstName: first, lastName: last, ...data });
                } else {
                    console.warn("User not found or missing name data", data);
                    localStorage.removeItem("userID");
                }
            })
            .catch((err) => console.error("Failed to fetch user data", err))
            .finally(() => setLoading(false));
    }, []);

    // ✅ NEW: fetch weekly students list (Mon–Thurs display)
    useEffect(() => {
        setLoadingWeekly(true);
        setWeeklyMessage("");

        // IMPORTANT: This path depends on how you mount your router.
        // If your router is mounted at "/sessions", this becomes "/sessions/findWeekly"
        // If already included in api baseURL, keep as shown.
        api
            .get("/viewAllWeek/findWeekly")
            .then((res) => {
                const data = res.data;

                // If backend returns { Monday: [...], ... }
                if (data && typeof data === "object" && !Array.isArray(data)) {
                    setWeekly(data);
                    return;
                }

                setWeekly(null);
                setWeeklyMessage("No weekly schedule found.");
            })
            .catch((err) => {
                console.error("Failed to fetch weekly schedule", err.response?.data || err);
                setWeekly(null);
                setWeeklyMessage("Failed to load weekly schedule.");
            })
            .finally(() => setLoadingWeekly(false));
    }, []);

    const daysToShow = useMemo(
        () => ["Monday", "Tuesday", "Wednesday", "Thursday"],
        []
    );

    const normalizedWeekly = useMemo(() => {
        const base = {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: []
        };

        if (!weekly) return base;

        for (const d of daysToShow) {
            const raw = weekly[d] ?? [];

            // allow API to return either:
            // - array of objects: { first_name, last_name, attendance_status }
            // - array of strings: "First Last"
            // We'll normalize into objects.
            base[d] = raw.map((item, idx) => {
                if (typeof item === "string") {
                    return {
                        student_id: `${d}-${idx}`,
                        first_name: item,
                        last_name: "",
                        attendance_status: "unknown"
                    };
                }

                const status =
                    item.attendance_status ??
                    item.status ??
                    item.attendance ??
                    "unknown";

                return {
                    student_id: item.student_id ?? `${d}-${idx}`,
                    first_name: item.first_name ?? item.student_first_name ?? "",
                    last_name: item.last_name ?? item.student_last_name ?? "",
                    attendance_status: String(status).toLowerCase()
                };
            });
        }

        return base;
    }, [weekly, daysToShow]);

    const statusClass = (status) => {
        const s = String(status || "").toLowerCase();
        if (s === "present") return "present";
        if (s === "no-show" || s === "noshow" || s === "no_show") return "no-show";
        if (s === "cab") return "cab";
        return "unknown";
    };

    const handleLogin = () => navigate("/loginPage");
    const handleDirectory = () => navigate("/directory");
    const handleDashboard = () => navigate("/dashboard");
    const handleSchedule = () => navigate("/schedule");
    const handleRequestsPages = () => navigate("/requests");
    const handleAttendancePage = () => navigate("/attendance");
    const handleStudentPage = () => navigate("/students");
    const handleEnrollment = () => navigate("/enrollment");

    return (
        <div className="dashboard">
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
                            <div className="card-header">
                                <h2>Weekly Students (Mon–Thu)</h2>
                            </div>

                            {/* Optional legend */}
                            <div className="weekly-legend">
                                <span className="legend-pill present">Present</span>
                                <span className="legend-pill no-show">No Show</span>
                                <span className="legend-pill cab">CAB</span>
                            </div>

                            {loadingWeekly ? (
                                <div className="muted">Loading weekly schedule…</div>
                            ) : weeklyMessage ? (
                                <div className="muted">{weeklyMessage}</div>
                            ) : (
                                <div className="weekly-days">
                                    {daysToShow.map((day) => {
                                        const studentsForDay = normalizedWeekly[day] ?? [];
                                        return (
                                            <div key={day} className="day-card">
                                                <h3 className="day-title">{day}</h3>

                                                {studentsForDay.length ? (
                                                    <div className="students">
                                                        {studentsForDay.map((s) => (
                                                            <div
                                                                key={s.student_id}
                                                                className={`student-pill ${statusClass(s.attendance_status)}`}
                                                            >
                                                                {s.first_name} {s.last_name}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="muted">No students</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;