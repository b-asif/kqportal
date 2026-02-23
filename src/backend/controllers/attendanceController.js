import attendance from "../models/attendanceModel.js"
import sessionInstanceModel from "../models/sessionInstanceModel.js";

const markAttendance = async (req, res) => {
    try {
        const { instanceId, studentId, status, notes } = req.body;
        if (!instanceId || !studentId || !status) {
            return res.status(400).json({ message: "instanceId, studentId, and status are required fields. Please try again." });
        }
        const duration = 1; 
        const CHARGE_STATUSES = new Set["present", "no-show"];
        const normalize = String(status).toLowerCase();
        const chargedHours = CHARGE_STATUSES.has(normalize) ? duration : 0;
        const response = await attendance.markAbsence(instanceId, studentId, status, notes);
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

const viewAttendanceBySessionInstance = async (req, res) => {
    try {
        const instanceId = req.body.instanceId ?? req.query.instanceId; // recieve the day admin wants to view attendance record. 
        if (!instanceId) {
            return res.status(400).json({ message: "instance id is required to proceed." });
        }
        const result = await attendance.getAttendanceBySessionInstance(instanceId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error." });
    }
}
const viewAttendanceByDate = async (req, res) => {
    try {
        const date = req.query.date;

        if (!date) {
            return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });
        }

        const d = new Date(date);
        if (Number.isNaN(d.getTime())) {
            return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
        }

        // 1) Get schedule sessions for the date (must include session_instance_id + students)
        const daySchedule = await sessionInstanceModel.getScheduleForDate(date);

        if (!daySchedule || daySchedule.length === 0) {
            return res.status(200).json({ message: "No sessions scheduled for this date.", sessions: [] });
        }

        // 2) For each session instance, fetch attendance rows
        const enriched = await Promise.all(
            daySchedule.map(async (sess) => {
                const rows = await attendance.getAttendanceBySessionInstance(sess.session_instance_id);

                // Map student_id -> status (and notes if you later add it)
                const statusMap = new Map(rows.map((r) => [r.student_id, r.status]));

                const studentsWithStatus = (sess.students || []).map((st) => ({
                    ...st,
                    attendance_status: statusMap.get(st.student_id) ?? null, // null => unmarked
                }));

                return {
                    ...sess,
                    students: studentsWithStatus,
                };
            })
        );

        return res.status(200).json(enriched);
    } catch (error) {
        console.log("viewAttendanceByDate error:", error);
        return res.status(500).json({ message: "Internal server error." });
    }
};

function monthToRange(month) {
    if (!/^\d{4}-\d{2}$/.test(month)) return null;
    const [y, m] = month.split("-").map(Number);

    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const endObj = new Date(y, m, 0); // last day of month
    const end = endObj.toISOString().slice(0, 10);

    return { start, end };
}

export const getStudentMonthCalendar = async (req, res) => {
    try {
        const studentID = Number(req.params.student_id);
        const { month } = req.query;

        if (!studentID) return res.status(400).json({ message: "Invalid student_id" });
        if (!month) return res.status(400).json({ message: "month is required (YYYY-MM)" });

        const range = monthToRange(month);
        if (!range) return res.status(400).json({ message: "Invalid month format. Use YYYY-MM" });

        const items = await attendance.getStudentMonthCalendar(
            studentID,
            range.start,
            range.end
        );

        return res.status(200).json({ items, month, startDate: range.start, endDate: range.end });
    } catch (err) {
        console.error("getStudentMonthCalendar ERROR:", err);
        return res.status(500).json({ message: err.message || "Internal Server Error" });
    }
};


const viewStudentAttendanceRecord = async (req, res) => {
    try {
        const studentID = req.body.studentID ?? req.query.studentID;

        if (!studentID) {
            return res.status(400).json({ message: "studentID is required." });
        }
        if (!studentID) return res.status(400).json({ message: "student id is required to proceed." });
        const result = await attendance.getStudentAttendanceRecord(studentID);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error." });
    }
}

const getStudentAttendanceByDate = async (req, res) => {
    try {
        const { studentID, startDate, endDate } = req.body;
        if (studentID == null || startDate == null || endDate == null) {
            return res.status(400).json({ message: "Required fields not provided. Please try again." });
        }
        const result = await attendance.studentAttendanceDateRange(studentID, startDate, endDate);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error." });
    }
}
const getStudentHoursSummary = async (req, res) => {
    try {
        const studentID = Number(req.params.student_id);
        if (!studentID) return res.status(400).json({ message: "Invalid student_id." });

        // Use month if passed, otherwise "today" for active enrollment lookup
        const month = req.query.month ?? req.body?.month;

        // Decide what date to use when selecting the active enrollment
        // If month=YYYY-MM, use the first day of that month
        const asOfDate = month ? `${month}-01` : null;

        const enrollment = await enrollmentModel.getActiveEnrollment(studentID, asOfDate);
        if (!enrollment) {
            return res.status(200).json({
                hoursPurchased: 0,
                hoursUsed: 0,
                hoursRemaining: 0,
                message: "No active enrollment found for this student."
            });
        }

        // compute used hours within enrollment period
        const summary = await attendance.getStudentHoursSummary(
            studentID,
            enrollment.start_date,
            enrollment.end_date
        );

        const hoursPurchased = Number(enrollment.hours_purchased);
        const hoursUsed = Number(summary.hoursCharged ?? 0);
        const hoursRemaining = Math.max(0, hoursPurchased - hoursUsed);

        return res.status(200).json({
            enrollment: {
                enrollment_id: enrollment.enrollment_id,
                start_date: enrollment.start_date,
                end_date: enrollment.end_date,
            },
            hoursPurchased,
            hoursUsed,
            hoursRemaining,
            counts: summary.counts,
        });
    } catch (err) {
        console.error("getStudentHoursSummary error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};



const deleteAttendanceRecord = async (req, res) => {
    try {
        const { instanceId, studentID } = req.body;
        if (instanceId == null || studentID == null) {
            return res.status(400).json({ message: "instance id and student id is required to delete entry" });
        }
        const result = await attendance.deleteEntry(instanceId, studentID);
        return res.status(200).json({ message: "Successfully deleted the attendance record." });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error." });
    }
}
export default {
    markAttendance,
    viewAttendanceBySessionInstance,
    viewAttendanceByDate,
    viewStudentAttendanceRecord,
    getStudentAttendanceByDate,
    deleteAttendanceRecord,
    getStudentHoursSummary,
    getStudentMonthCalendar
}