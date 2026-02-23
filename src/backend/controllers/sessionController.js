import sessionModel from "../models/sessionModel.js"
import users from "../models/userModels.js"

const addSession = async (req, res) => {
    try {
        const tutor_id = Number(req.params.tutor_id);
        const isTutor = await users.findByUserID(tutor_id);
        if (!isTutor) return res.status(404).json({ message: "Tutor not found" });
        if (isTutor.role !== "tutor") {
            return res.status(400).json({ message: "User is not a tutor" });
        }
        const { day, start_time, end_time } = req.body;
        if (!day || !start_time || !end_time) return res.status(400).json({ message: "Missing fields" });
        const createdSession = await sessionModel.createSession(tutor_id, day, start_time, end_time);
        return res.status(200).json({ message: "Session created sucessfully" })
    } catch (error) {
        console.log("Internal server error", error);
        throw error;
    }
}

const findSessions = async (req, res) => {
    console.log("Inside the find sessions block.")
    try {
        console.log("Looking for sessions...")
        const sessions = await sessionModel.findAllSessions();
        if (!sessions) return res.status(404).json({ message: "There were no sessions found" });
        return res.json(sessions);
    } catch (error) {
        console.error("findSessions error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const findSessionByID = async (req, res) => {
    console.log("Looking for session...")
    try {
        const { session_id } = req.params;
        const isSession = await sessionModel.findSession(session_id);
        if (!isSession) return res.status(404).json({ message: "Session not found" });
        return res.json({ message: "Session found", isSession });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

const tutorSessions = async (req, res) => {
    try {
        const tutor_id = Number(req.params.tutor_id);
        const isTutor = await users.findByUserID(tutor_id);
        if (!isTutor) return res.status(404).json({ message: "Tutor not found" });
        const viewTutorSessions = await sessionModel.findSessionByTutorId(tutor_id);
        console.log(viewTutorSessions)
        return res.json(viewTutorSessions);
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server errro" });
    }
}

const updateInfo = async (req, res) => {
    const fields = ["day", "start_time", "end_time", "tutor_id"];
    try {
        const { session_id } = req.params;
        const isSession = await sessionModel.findSession(session_id);
        if (!isSession) return res.status(404).json({ message: "Session not found" });

        const updateFields = req.body;
        if (Object.keys(updateFields).length == 0) {
            return res.status(400).json({ message: "Invalid entry, fields may not be empty" });
        }
        for (const key of Object.keys(updateFields)) {
            if (!fields.includes(key)) {
                return res.status(400).json({ message: "Invalid entry, this field cannot be updated" });
            }
            const value = updateFields[key];
            if (typeof value == "string" && value.trim() === "") {
                return res.status(400).json({ message: "Cannot send an empty entry" });
            }
        }
        const update = await sessionModel.updateSession(session_id, updateFields);
        return res.status(200).json(update);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

const deleteSessionInstance = async (req, res) => {
    try {
        const { session_id } = req.params;
        const isSession = await sessionModel.findSession(session_id);
        if (!isSession) return res.status(404).json({ message: "Session not found" });
        const deletingSession = await sessionModel.deleteSession(session_id);
        return res.status(200).json({ message: "Sucessfully deleted the session" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}
const findSessionsForWeek = async (req, res) => {
    try {
        const rows = await sessionModel.findSessionForWeek();

        const dayMap = {
            Monday: [],
            Tuesday: [],
            Wednesday: [],
            Thursday: [],
            Friday: [],
            Saturday: [],
            Sunday: []
        };

        for (const r of rows) {
            if (!r.day) continue;
            if (!r.student_id) continue; // skip empty left-join rows

            // avoid duplicates if same student appears multiple times in same day
            const fullName = `${r.student_first_name} ${r.student_last_name}`;
            if (!dayMap[r.day]) dayMap[r.day] = [];
            if (!dayMap[r.day].includes(fullName)) dayMap[r.day].push(fullName);
        }

        return res.json(dayMap);
    } catch (error) {
        console.error("findSessionsForWeek error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
export default {
    addSession,
    findSessions,
    tutorSessions,
    findSessionByID,
    updateInfo,
    deleteSessionInstance,
    findSessionsForWeek
}