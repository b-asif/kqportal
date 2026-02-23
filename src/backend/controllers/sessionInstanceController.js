import sessionInstance from "../models/sessionInstanceModel.js"

const generateInstance = async (req, res) => {
    try {
        const { startDate, endDate } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ message: "startDate and endDate are required" });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return res.status(400).json({ message: "Invalid date form provided. Please use YYYY-MM-DD" });
        }
        if (start > end) {
            return res.status(400).json({ message: "starting date must be before end date" });
        }
        const result = await sessionInstance.generateInstancesForRange(startDate, endDate);
        return res.status(200).json(result);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const retrieveScheduleForDate = async (req, res) => {
    try {
        const date = req.query.date || req.body?.date;
        if (!date) {
            return res.status(400).json({ message: "date is required (YYYY-MM-DD" });
        }
        const d = new Date(date);
        if (Number.isNaN(d.getTime())) {
            return res.status(400).json({ message: "Invalid date format. Please return as YYYY-MM-DD" });
        }
        const dateSchedule = await sessionInstance.getScheduleForDate(date);
        if (!dateSchedule || dateSchedule.length === 0) {
            return res.status(200).json({ message: "No sessions were scheduled for this date." });
        }
        return res.status(200).json(dateSchedule);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


export default { generateInstance, retrieveScheduleForDate }