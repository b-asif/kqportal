import users from "../models/userModels.js";
import hashing from "../utilities/hashing.js";

const newUser = async (req, res) => {
    try {
        const { first_name, last_name, email, password, phone_num, role } = req.body;
        if (!first_name || !last_name || !email || !password || !phone_num || !role) {
            return res.status(400).json({ message: "Missing fields" });
        }
        //check that role is either admin or parent
        if (role != 'admin' && role != 'parent' && role != 'tutor') return res.status(400).json({ message: "invalid entry" });
        // check db to make sure user does not already exist
        const existingUser = await users.findByEmail(email);
        if (existingUser) {
            return res.status(409).json({ message: "request could not be completed, user already exists with that email" });
        }
        console.log(password);
        //hash password 
        const hashedPassword = await hashing.hashPassword(password);
        console.log(hashedPassword);
        //add to db 
        const newUser = await users.addUser(first_name, last_name, email, hashedPassword, phone_num, role);
        const { password: _, ...userWithoutPassword } = newUser;
        return res.status(201).json({ user: userWithoutPassword })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal error" });
    }

}

const getUsers = async (req, res) => {
    try {
        const userInfo = await users.findAllUsers();
        res.json(userInfo);
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
}

// finding user by their id 
const getUserByID = async (req, res) => {
    console.log('➡️ getUserByID hit with params:', req.params);
    try {
        const { id } = req.params; // admin specifies specific user id 
        const userID = await users.findByUserID(id);
        if (!userID) return res.status(404).json({ message: "User not found" });
        return res.status(200).json(userID)
    } catch (error) {
        console.log(error)
        return res.status(500).json({ message: "Internal server error" });
    }
}

// modifying user data 
const updateData = async (req, res) => {
    const fields = ["first_name", "last_name", "email", "phone_num"];
    try {
        const { id } = req.params;
        //check if user exists
        const user = await users.findByUserID(id); //check db 
        if (!user) return res.status(404).json({ message: "User not found" });

        const updatedFields = req.body; // take the fields user wants to update 
        // check that the user is not sending an empty request
        if (Object.keys(updatedFields).length == 0) {
            return res.status(400).json({ message: "Invalid request" });
        }
        if ("email" in updatedFields) {
            const newEmail = updatedFields.email;
            const existingEmail = users.findByEmail(newEmail);
            if (existingEmail && existingEmail.user_id !== Number(id)) {
                return res.status(400).json({ message: "Email already in use" });
            }
        }
        // check to see if user is not updated restricted fields 
        if ("role" in updatedFields || "user_id" in updatedFields || "password" in updatedFields) {
            return res.status(400).json({ message: "Invalid request" });
        }
        // check that the fields being updated are not null/empty
        for (const key of Object.keys(updatedFields)) {
            if (!fields.includes(key)) {
                return res.status(400).json({ message: "Invalid request" })
            }

            const value = updatedFields[key];

            if (typeof value === "string" && value.trim() === "") {
                return res.status(400).json({ message: "Invalid request, cannot be empty" })
            }
        }
        const sendUpdate = await users.updateData(id, updatedFields);
        return res.status(200).json(sendUpdate);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }

}

//delete user 
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params; // retrieving the userId
        //check if user exists 
        const userExists = await users.findByUserID(id);
        if (!userExists) return res.status(404).json({ message: "user not found" });
        //delete the user. 
        const deletedUser = await users.deleteUser(id);
        if (deleteUser) return res.status(200).json({ message: "User was successfully deleted" });
        else return res.status(404).json({ message: "User not found" })
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}


export default { newUser, getUsers, getUserByID, updateData, deleteUser };