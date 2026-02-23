import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
dotenv.config();

function generateToken(payload) {
    const token = jwt.sign(
        payload, 
        process.env.ACCESS_TOKEN_KEY, 
        {expiresIn: process.env.EXPIRES_IN}
    );
    return token;
}

export default generateToken;