import enrollmentModel from "../models/enrollmentModel.js"
import studentModel from "../models/studentModels.js"
import sessionModel from "../models/sessionModel.js"

const PRE_PAYMENT_HOURS = new Set([24, 36, 48]);


export const enrollStudent = async (req, res) => {
    console.log("enrolling student...");
    try {
        const session_id = Number(req.params.session_id);
        const student_id = Number(req.body.student_id);

        if (!Number.isInteger(session_id) || !Number.isInteger(student_id)) {
            return res.status(400).json({ message: "Invalid session_id or student_id" });
        }

        // quick existence checks (keeps same behavior as your earlier code)
        const isStudent = await studentModel.findStudentByID(student_id);
        const isSession = await sessionModel.findSession(session_id);
        if (!isStudent || !isSession) {
            return res.status(404).json({ message: "Student or Session not found" });
        }

        // attempt enroll
        const result = await enrollmentModel.enrollStudent(student_id, session_id);

        // If enrollment blocked due to "no active enrollment" and client asked us to auto-create hourly,
        // try to create a temporary hourly enrollment and retry.
        if (
            result &&
            result.status === 400 &&
            typeof result.message === "string" &&
            result.message.toLowerCase().includes("no active enrollment") &&
            req.body.createHourlyIfMissing === true
        ) {
            // Validate hourly_rate
            const hourlyRate = Number(req.body.hourly_rate);
            if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
                return res.status(400).json({ message: "Hourly rate is required and must be > 0 to auto-create an hourly enrollment." });
            }

            // Create an hourly enrollment that starts today and lasts 1 year (adjust as you like)
            const startDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
            const endDate = new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().slice(0, 10);

            try {
                const newEnrollment = await enrollmentModel.createEnrollment({
                    student_id,
                    start_date: startDate,
                    end_date: endDate,
                    billing_type: "hourly",
                    hours_purchased: null,
                    hourly_rate: hourlyRate
                });

                // if creation succeeded, retry enrollment
                if (newEnrollment) {
                    const retry = await enrollmentModel.enrollStudent(student_id, session_id);
                    return res.status(retry.status).json({ message: retry.message, createdEnrollment: newEnrollment });
                } else {
                    // fallback: return original error if createEnrollment didn't return a value
                    return res.status(500).json({ message: "Failed to create hourly enrollment automatically." });
                }
            } catch (createErr) {
                console.error("Auto-create enrollment error:", createErr);
                return res.status(500).json({ message: "Failed to auto-create hourly enrollment." });
            }
        }

        // Normal return (enrollModel result)
        return res.status(result.status).json({ message: result.message });
    } catch (error) {
        console.error("enrollStudent controller error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

const viewSchedule = async (req, res) => {
    console.log("viewing student weekly schedule")
    try {
        // which student id is being looked up
        const student_id = Number(req.params.student_id)
        if (!Number.isInteger(student_id)) {
            return res.status(400).json({ message: "Invalid session_id or student_id" });
        }
        const isStudent = await studentModel.findStudentByID(student_id);
        if (!isStudent) {
            return res.status(404).json({ message: "Student not found" });
        }
        const studentSchedule = await enrollmentModel.viewStudentSchedule(student_id);
        return res.status(200).json(studentSchedule);

    } catch (error) {
        console.error("viewSchedule error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }

}

//removing students from a session 
const deleteSession = async (req, res) => {
    try {
        const student_id = Number(req.params.student_id)
        const session_id = Number(req.params.session_id)
        if (!Number.isInteger(student_id) || !Number.isInteger(session_id)) {
            return res.status(400).json({ message: "Invalid session_id or student_id entry" });
        }
        const isStudent = await studentModel.findStudentByID(student_id)
        if (!isStudent) {
            return res.status(404).json({ message: "Student not found" });
        }
        const isSession = await sessionModel.findSession(session_id);
        if (!isSession) {
            return res.status(404).json({ message: "Session not found" });
        }

        const deleteSes = await enrollmentModel.deleteStudentSession(student_id, session_id);
        if (!deleteSes) {
            return res.status(404).json({ message: "Could not delete session" })
        }
        return res.status(200).json({ message: "Session successfully deleted" })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}
const viewAllStudentsInSession = async (req, res) => {
    try {
        const session_id = Number(req.params.session_id);
        if (!Number.isInteger(session_id)) {
            return res.status(400).json({ message: "invalid entry for session id" });
        }
        const isSession = await sessionModel.findSession(session_id);
        if (!isSession) {
            return res.status(404).json({ message: "Session not found" });
        }
        const students = await enrollmentModel.studentsInSession(session_id);
        return res.status(200).json(students);

    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

const createEnrollmentPlan = async (req, res) => {
    try {
        const studentID = Number(req.params.student_id);
        const { hoursPurchased } = req.body;

        if (!studentID) return res.status(400).json({ message: "Invalid student_id" });
        if (!hoursPurchased) {
            return res.status(400).json({ message: "hoursPurchased are required" });
        }

        const row = await enrollmentModel.createStudentEnrollment(
            studentID,
            hoursPurchased
        );

        return res.status(201).json(row);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message || "Internal server error" });
    }
};


export default { enrollStudent, viewSchedule, deleteSession, viewAllStudentsInSession, createEnrollmentPlan }