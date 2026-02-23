import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Register.css';
import api from "./api";


function Register() {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmedPassword] = useState('');
    const [phoneNum, setPhoneNum] = useState('');
    const [role, setRole] = useState('');
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }
        if (!password || password.trim() === '') {
            alert("Please fill in all fields");
            return;
        }
        if (!firstName || !lastName || !email || !password || !confirmPassword || !phoneNum || !role) {
            alert("Please fill in all fields");
            return;
        }

        const normalizedRole = role.trim().toLowerCase();

        try {
            const response = await api.post("/newUser", {
                first_name: firstName,
                last_name: lastName,
                email,
                password,
                phone_num: phoneNum,
                role: normalizedRole,
            })
            alert(response.data?.message || "Registration successful");
            navigate('/loginPage');

        }
        catch (err) {
            console.error("Registration error: ", err);
            alert("Error occured during registration");
        }

    };

    return (
        <div className="Register">
            <header className="Register-header">
                <h1>KnowledgeQuest</h1>
                <p className="subText">the learning place</p>
            </header>

            <div className="register-box">
                <h2>Create an Account</h2>
                <form className="form" onSubmit={handleRegister}>
                    <input type="text" placeholder="First Name" value={firstName}
                        onChange={(e) => setFirstName(e.target.value)} />
                    <input type="text" placeholder="Last Name" value={lastName}
                        onChange={(e) => setLastName(e.target.value)} />
                    <input type="text" placeholder="Email Address" value={email}
                        onChange={(e) => setEmail(e.target.value)} />
                    <input type="password" placeholder="Password" value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                    <input type="text" placeholder="Confirm Password" value={confirmPassword}
                        onChange={(e) => setConfirmedPassword(e.target.value)} />
                    <input type="text" placeholder="Phone Number" value={phoneNum}
                        onChange={(e) => setPhoneNum(e.target.value)} />
                    <input type="text" placeholder="Admin or Tutor" value={role}
                        onChange={(e) => setRole(e.target.value)} />
                    <button className="registerButton" type="submit">register account</button>
                </form>
            </div>
        </div>
    )
}

export default Register;