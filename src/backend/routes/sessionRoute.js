import express from "express";
import authToken from "../middleware/jwtAuth.js";
import requireAdmin from "../middleware/requireAdmin.js";
import sessionController from "../controllers/sessionController.js";

const route = express.Router();

route.get("/findWeekly", authToken, requireAdmin, sessionController.findSessionsForWeek);
route.get("/info/:session_id", authToken, requireAdmin, sessionController.findSessionByID);
route.patch("/update/:session_id", authToken, requireAdmin, sessionController.updateInfo);
route.delete("/delete/:session_id", authToken, requireAdmin, sessionController.deleteSessionInstance);
route.get("/", authToken, requireAdmin, sessionController.findSessions);
route.post("/:tutor_id", authToken, requireAdmin, sessionController.addSession);
route.get("/:tutor_id", authToken, requireAdmin, sessionController.tutorSessions);

export default route;