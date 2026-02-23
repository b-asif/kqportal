import pool from "../db/db.js";

const linkStudentToParent = async (student_id, parent_id) => {
    try {
        const result = await pool.query(
            `INSERT INTO parent_student (student_id, parent_id) VALUES ($1, $2)
            ON CONFLICT DO NOTHING 
            RETURNING student_id, parent_id `,
            [student_id, parent_id]);
        return result.rows[0];
    } catch (error) {
        console.log("Error occured while linking student to parent");
        throw error;
    }
}

const getParent = async (student_id) => {
    try {
        const result = await pool.query(`SELECT u.user_id, u.first_name, u.last_name, u.email, u.phone_num 
            FROM parent_student ps 
            JOIN users u ON ps.parent_id = u.user_id WHERE ps.student_id = $1`,
            [student_id]);
        console.log('getParent DB rows:', result.rows); 
        return result.rows;
    } catch (error) {
        console.log("error occured while retrieving parent info of student");
        throw error;
    }
}

const getStudents = async (parent_id) => {
    try {
        const result = await pool.query(`SELECT s.student_id, s.first_name, s.last_name, s.grade 
            FROM parent_student ps 
            JOIN students s ON ps.student_id = s.student_id WHERE ps.parent_id = $1`,
            [parent_id]);
        return result.rows;
    } catch (error) {
        console.log("error occured while retrieving student info of parent");
        throw error;
    }
}


export default { linkStudentToParent, getParent, getStudents };