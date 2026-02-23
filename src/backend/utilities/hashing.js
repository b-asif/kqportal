import bcrypt from 'bcrypt'

// Hashing the user password 
async function hashPassword(userPassword) {
    const hashedPassword = await bcrypt.hash(userPassword, 13);
    return hashedPassword;
}

//Comparing passwords 
async function comparePasswords(userPassword, hashedPassword) {
    return await bcrypt.compare(userPassword, hashedPassword);
}

export default {hashPassword, comparePasswords};