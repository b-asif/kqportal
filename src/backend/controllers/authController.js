import users from "../models/userModels.js";
import hashing from "../utilities/hashing.js";
import generateToken from "../utilities/jwt.js";

// creating login function 
const login = async (req, res) => {
    console.log("login controller has started.")
    try {
        // retrieve user credentials 
        const { userEmail, password } = req.body;
        //check that the user provided both email and password
        if (!userEmail || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }
        // else check the database to see if user is a registered user
        const isUser = await users.findByEmail(userEmail);
        if (!isUser) return res.status(401).json({ message: "Invalid email or password" });
        // otherwise verify password
        const verified = await hashing.comparePasswords(password, isUser.password)
        if (!verified) {
            return res.status(401).json({ message: "Invalid email or password" });
        }
        //send jwt token user has been verified 
        const user = {
            id: isUser.id,
            first_name: isUser.first_name,
            last_name: isUser.last_name,
            email: isUser.email,
            phone_num: isUser.phone_num,
            role: isUser.role
        }
        console.log("user was logging in succesfully!")
        res.status(200).json({
            message: "Login Successful!",
            token: generateToken(user)
        });
    } catch (error) {
        console.log("an error occured", error)
        res.status(500).json({ message: "internal server error" })
    }

}
export default login