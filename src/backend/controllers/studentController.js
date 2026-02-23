import students from "../models/studentModels.js";
import parentStudent from "../models/parentStudentModels.js"
import users from "../models/userModels.js"
const newStudent = async (req, res) => {
    try {
        const { first_name, last_name, grade } = req.body;
        if (!first_name || !last_name || !grade) {
            return res.status(400).json({ message: "fields are missing" });
        }
        const enrolledStudent = await students.findByName(first_name, last_name);
        if (enrolledStudent) {
            return res.status(409).json({ message: "Student enrolled in system" });
        }
        const enrollStudent = await students.addStudent(first_name, last_name, grade);
        return res.status(201).json({ student: enrollStudent, message: "Student succesfully added" });
    } catch (error) {
        console.log("Error occured while adding student to the system");
        throw error;
    }
}
const getStudents = async (req, res) => {
    console.log("calling the getStudents method")
    try {
        const studentInfo = await students.findAllStudents();
        return res.json(studentInfo);
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

const getStudentByID = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await students.findStudentByID(id);
        if (!student) {
            return res.status(400).json({ message: "Could not find student with that id" });
        }
        return res.status(200).json(student)
    } catch (error) {
        console.log("Internal Error");
    }
}

const updateInfo = async (req, res) => {
    const fields = ["first_name", "last_name", "grade"];
    try {
        const { id } = req.params;
        const student = await students.findStudentByID(id);
        if (!student) return res.status(404).json({ message: "Student not found" });

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
        const sendUpdate = await students.updateStudentInfo(id, updateFields);
        return res.status(200).json(sendUpdate);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

const deleteStudentInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const student = await students.findStudentByID(id);
        if (!student) return res.status(404).json({ message: "student not found" });
        const deleteStu = await students.deleteStudent(id);
        if (deleteStu) return res.status(200).json({ message: "Student deleted successfully" });
        else return res.status(404).json({ message: "student not found" });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error" });
    }
}

const assignGuardian = async (req, res) => {
    try {
        const { student_id } = req.params; // for this student
        const { parent_id } = req.body; // assign this parent
        console.log('student_id:', student_id);
        console.log('parent_id:', parent_id);
        const student = await students.findStudentByID(student_id);
        const parent = await users.findByUserID(parent_id);

        if (!student || !parent) return res.status(404).json({ message: "Student or Parent not found" });
        const result = await parentStudent.linkStudentToParent(student_id, parent_id);

        return res.status(200).json({ message: "Parent succesfully linked to student", link: result });
    } catch (error) {
        console.error('Error in assignGuardian:', error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
const getParentInfo = async (req, res) => {
    console.log("in parent info block")
    try {
        const { student_id } = req.params;
        const isStudent = await students.findStudentByID(student_id);
        if (!isStudent) {
            console.log("Student was not found in DB");
            return res.status(500).json({ message: "Student not found" });
        }
        console.log("Found student, looking for parent info...")
        const parentOfStudent = await parentStudent.getParent(student_id)
        if (parentOfStudent) {
            console.log("Found the parents");
        }
        return res.status(200).json(parentOfStudent);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

const getStudentOfParent = async (req, res) => {
    console.log("in the block");
    try {
        const { parent_id } = req.params;
        const isParent = await users.findByUserID(parent_id);
        if (!isParent) {
            console.log("Parent not found");
            return res.status(404).json({ message: "Parent not found" });
        }
        console.log("Looking for students...")
        const studentsOfParent = await parentStudent.getStudents(parent_id);
        if (studentsOfParent) {
            console.log("Found students")
        }
        return res.status(200).json(studentsOfParent);
    } catch (error) {
        return res.status(500).json({ message: "internal server error" });
    }
}
export default {
    newStudent,
    getStudents,
    getStudentByID,
    updateInfo,
    deleteStudentInfo,
    assignGuardian,
    getParentInfo,
    getStudentOfParent
};