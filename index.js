const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const swaggerUi = require('swagger-ui-express');
const swaggerDocs = require('./swagger'); // Swagger configuration file
const { connection } = require('./db'); // Ensure you have your database connection here

const app = express();
const PORT = process.env.PORT ||3005;

app.use(express.json());
app.use(cors());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
console.log('API documentation available at http://localhost:3005/api-docs');

// In-memory OTP storage
const otpStorage = new Map();

// In-memory token storage
let userToken = null;
let speakerToken = null;

// JWT secret key
const JWT_Secret = "abcdUniqueStuff1234567890e8r8tydjnkjsjdjfj";

// Generate a 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash password using MD5
function hashPassword(password) {
    return crypto.createHash('md5').update(password).digest('hex');
}

// Send OTP email
async function sendOTPEmail(email, otp) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "avinash.alt7@gmail.com",
            pass: "ccyz rfqs ivis mvbj",
        },
    });

    let mailOptions = {
        from: "avinash.alt7@gmail.com",
        to: email,
        subject: 'Your Sign Up OTP',
        text: `Your OTP for sign up is: ${otp}. This OTP will expire in 10 minutes.`,
    };

    await transporter.sendMail(mailOptions);
}

async function sendEmailNotification(userEmail, speakerEmail, bookingDate, timeSlot) {
    let transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "avinash.alt7@gmail.com",
            pass: "ccyz rfqs ivis mvbj",
        },
    });

    let mailOptions = {
        from: "avinash.alt7@gmail.com",
        to: [userEmail, speakerEmail],
        subject: 'Session Booking Confirmation',
        text: `Your session has been booked on ${bookingDate} at ${timeSlot} by ${userEmail} for ${speakerEmail}.`,
    };

    await transporter.sendMail(mailOptions);
}

function createICalFile(eventDetails) {
    const { summary, startDate, endDate, location, description } = eventDetails;

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your Organization//Your Product//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${new Date().getTime()}@yourdomain.com
SUMMARY:${summary}
LOCATION:${location}
DESCRIPTION:${description}
DTSTART:${startDate}
DTEND:${endDate}
STATUS:CONFIRMED
SEQUENCE:0
BEGIN:VALARM
TRIGGER:-PT10M
DESCRIPTION:Reminder
ACTION:DISPLAY
END:VALARM
END:VEVENT
END:VCALENDAR`;

    const filePath = './event.ics';
    fs.writeFileSync(filePath, icsContent);
    return filePath;
}

async function sendEmailWithICS(toEmails, subject, text, icsFilePath) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: "avinash.alt7@gmail.com", // Replace with your email
            pass: "ccyz rfqs ivis mvbj", // Replace with your app-specific password
        },
    });

    const mailOptions = {
        from: "avinash.alt7@gmail.com", // Replace with your email
        to: toEmails.join(','), // Comma-separated list of recipients
        subject: subject,
        text: text,
        attachments: [
            {
                filename: 'event.ics',
                path: icsFilePath,
                contentType: 'text/calendar',
            },
        ],
    };

    await transporter.sendMail(mailOptions);
}

async function sendGoogleCalendarNotification(userEmail, speakerEmail, eventDetails) {
    try {
        // Create the .ics file
        const icsFilePath = createICalFile(eventDetails);

        // Send the email with the .ics file to both user and speaker
        await sendEmailWithICS(
            [userEmail, speakerEmail],
            `Session Booking Confirmation: ${eventDetails.summary}`,
            `Dear User and Speaker,\n\nYour session has been scheduled.\n\nDetails:\n- Topic: ${eventDetails.summary}\n- Date: ${eventDetails.startDate}\n- Location: ${eventDetails.location}\n\nPlease find the calendar invite attached.\n\nBest regards,\nYour Team`,
            icsFilePath
        );

        // Clean up the .ics file
        fs.unlinkSync(icsFilePath);
        console.log('Temporary .ics file deleted after sending email.');
    } catch (error) {
        console.error('Error in sending Google Calendar notification:', error);
    }
}

// Middleware to verify JWT and role
function verifyToken(requiredRole) {
    return (req, res, next) => {
        const token = requiredRole === 'user' ? userToken : speakerToken;

        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        try {
            const decoded = jwt.verify(token, JWT_Secret);
            req.user = decoded;

            if (decoded.role !== requiredRole) {
                return res.status(403).json({ message: 'Access denied' });
            }

            next();
        } catch (error) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
    };
}



/**
 * @swagger
 * /user-sign-up:
 *   post:
 *     summary: User Sign-Up
 *     description: Handles both stages of user sign-up. The first request sends an OTP to the user's email, and the second verifies the OTP to complete registration. To start, please enter your email, first name, last name, and password. An OTP will be sent to your email. Then, submit the OTP to complete the sign-up process.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *                 description: "Provide only in the first request to receive OTP."
 *               first_name:
 *                 type: string
 *                 example: "John"
 *                 description: "Provide only in the first request to receive OTP."
 *               last_name:
 *                 type: string
 *                 example: "Doe"
 *                 description: "Provide only in the first request to receive OTP."
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 description: "Provide only in the first request to receive OTP."
 *           
 *     responses:
 *       200:
 *         description: OTP sent to the user's email (on first request).
 *       201:
 *         description: User registered successfully (on second request with OTP).
 *       400:
 *         description: Invalid input, OTP expired, or mismatch.
 *       500:
 *         description: Server error.
 */
app.post('/user-sign-up', async (req, res) => {
    try {
        const { email, first_name, last_name, password, otp } = req.body;

        if (!otp) {
            const [existingUser] = await connection.promise().query(
                'SELECT * FROM user_login WHERE email = ?',
                [email]
            );

            if (existingUser.length > 0) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            const generatedOTP = generateOTP();

            otpStorage.set(email, {
                otp: generatedOTP,
                createdAt: Date.now(),
                email,
                first_name,
                last_name,
                password,
            });

            await sendOTPEmail(email, generatedOTP);

            return res.status(200).json({ 
                message: 'OTP sent to email. Please use the OTP to finish sign-up.',
                otp_format: { 
                    otp: "6 digit otp enclosed in brackets"
                }
            });
        }

        const storedOtpData = Array.from(otpStorage.values()).find(data => data.otp === otp);
        if (!storedOtpData) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const [result] = await connection.promise().query(
            `INSERT INTO user_login (first_name, last_name, email, user_password, is_logged_in) 
             VALUES (?, ?, ?, MD5(?), ?)`,
            [storedOtpData.first_name, storedOtpData.last_name, storedOtpData.email, storedOtpData.password, 0]
        );

        otpStorage.delete(storedOtpData.email);

        res.status(201).json({ message: 'User registered successfully', userId: result.insertId });
    } catch (error) {
        console.error('Sign-Up Error:', error);
        res.status(500).json({ message: 'Error during sign up', error: error.message });
    }
});

/**
 * @swagger
 * /speaker-sign-up:
 *   post:
 *     summary: Speaker Sign-Up
 *     description: Handles both stages of speaker sign-up. The first request sends an OTP to the speaker's email, and the second verifies the OTP to complete registration. To start, please enter your email, first name, last name, and password. An OTP will be sent to your email. Then, submit the OTP to complete the sign-up process, only enter otp for the second stage.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "speaker@example.com"
 *                 description: "Provide only in the first request to receive OTP."
 *               first_name:
 *                 type: string
 *                 example: "Jane"
 *                 description: "Provide only in the first request to receive OTP."
 *               last_name:
 *                 type: string
 *                 example: "Doe"
 *                 description: "Provide only in the first request to receive OTP."
 *               password:
 *                 type: string
 *                 example: "password123"
 *                 description: "Provide only in the first request to receive OTP."             
 *     responses:
 *       200:
 *         description: OTP sent to the speaker's email (on first request).
 *       201:
 *         description: Speaker registered successfully (on second request with OTP).
 *       400:
 *         description: Invalid input, OTP expired, or mismatch.
 *       500:
 *         description: Server error.
 */
app.post('/speaker-sign-up', async (req, res) => {
    try {
        const { email, first_name, last_name, password, otp } = req.body;

        if (!otp) {
            const [existingUser] = await connection.promise().query(
                'SELECT * FROM speaker_login WHERE email = ?',
                [email]
            );

            if (existingUser.length > 0) {
                return res.status(400).json({ message: 'Email already registered' });
            }

            const generatedOTP = generateOTP();

            otpStorage.set(email, {
                otp: generatedOTP,
                createdAt: Date.now(),
                email,
                first_name,
                last_name,
                password,
            });

            await sendOTPEmail(email, generatedOTP);

            return res.status(200).json({ 
                message: 'OTP sent to email. Please use the OTP to finish sign-up.',
                otp_format: { 
                    otp: "6 digit otp enclosed in brackets"
                }
            });
            
            
        }

        const storedOtpData = Array.from(otpStorage.values()).find(data => data.otp === otp);
        if (!storedOtpData) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const [result] = await connection.promise().query(
            `INSERT INTO speaker_login (first_name, last_name, email, user_password, is_logged_in) 
             VALUES (?, ?, ?, MD5(?), ?)`,
            [storedOtpData.first_name, storedOtpData.last_name, storedOtpData.email, storedOtpData.password, 0]
        );

        otpStorage.delete(storedOtpData.email);

        res.status(201).json({ message: 'Speaker registered successfully', userId: result.insertId });
    } catch (error) {
        console.error('Sign-Up Error:', error);
        res.status(500).json({ message: 'Error during sign up', error: error.message });
    }
});


/**
 * @swagger
 * /user-login:
 *   post:
 *     summary: User Login
 *     description: Authenticate a user and generate a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid credentials or user not found
 *       500:
 *         description: Server error during login
 */
app.post('/user-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [users] = await connection.promise().query(
            'SELECT * FROM user_login WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        const user = users[0];
        const hashedPassword = hashPassword(password);

        if (user.user_password !== hashedPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        userToken = jwt.sign(
            { userId: user.user_id, email: user.email, role: 'user' },
            JWT_Secret,
            { expiresIn: '10m' }
        );

        await connection.promise().query(
            'UPDATE user_login SET is_logged_in = 1, login_time = NOW() WHERE user_id = ?',
            [user.user_id]
        );

        res.status(200).json({ message: 'Login successful', token: userToken });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Error during login', error: error.message });
    }
});

/**
 * @swagger
 * /speaker-login:
 *   post:
 *     summary: Speaker Login
 *     description: Authenticate a speaker and generate a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "speaker@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 token:
 *                   type: string
 *       400:
 *         description: Invalid credentials or speaker not found
 *       500:
 *         description: Server error during login
 */
app.post('/speaker-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const [speakers] = await connection.promise().query(
            'SELECT * FROM speaker_login WHERE email = ?',
            [email]
        );

        if (speakers.length === 0) {
            return res.status(400).json({ message: 'Speaker not found' });
        }

        const speaker = speakers[0];
        const hashedPassword = hashPassword(password);

        if (speaker.user_password !== hashedPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Include user_id in the token
        speakerToken = jwt.sign(
            { userId: speaker.user_id, email: speaker.email, role: 'speaker' },
            JWT_Secret,
            { expiresIn: '10m' }
        );

        await connection.promise().query(
            'UPDATE speaker_login SET is_logged_in = 1, login_time = NOW() WHERE user_id = ?',
            [speaker.user_id]
        );

        res.status(200).json({ message: 'Login successful', token: speakerToken });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Error during login', error: error.message });
    }
});

/**
 * @swagger
 * /speaker-profile-update:
 *   post:
 *     summary: Update or Create Speaker Profile
 *     description: Allow speakers to update or create their profile details
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expertise:
 *                 type: string
 *                 example: "Machine Learning, AI"
 *               price_per_session:
 *                 type: number
 *                 example: 100
 *               bio:
 *                 type: string
 *                 example: "Experienced AI researcher with 10 years of industry experience"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       201:
 *         description: New profile created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error during profile update
 */
app.post('/speaker-profile-update', verifyToken('speaker'), async (req, res) => {
    try {
        const { expertise, price_per_session, bio } = req.body;
        const { userId, email } = req.user; // Extract userId from the JWT

        if (!expertise || !price_per_session || typeof expertise !== 'string' || typeof price_per_session !== 'number') {
            return res.status(400).json({ message: 'Invalid input. Ensure expertise is a string and price_per_session is a number.' });
        }

        // Check if profile already exists
        const [existingProfile] = await connection.promise().query(
            'SELECT * FROM speaker_profiles WHERE speaker_id = ?',
            [userId] // Use userId as speaker_id
        );

        if (existingProfile.length > 0) {
            // Update existing profile
            await connection.promise().query(
                'UPDATE speaker_profiles SET expertise = ?, price_per_session = ?, bio = ?, updated_at = NOW() WHERE speaker_id = ?',
                [expertise, price_per_session, bio, userId] // Use userId as speaker_id
            );
            return res.status(200).json({ message: 'Profile updated successfully' });
        }

        // Create new profile
        await connection.promise().query(
            'INSERT INTO speaker_profiles (speaker_id, email, expertise, price_per_session, bio) VALUES (?, ?, ?, ?, ?)',
            [userId, email, expertise, price_per_session, bio] // Use userId as speaker_id
        );

        res.status(201).json({ message: 'Profile created successfully' });
    } catch (error) {
        console.error('Error creating/updating profile:', error);
        res.status(500).json({ message: 'Error creating/updating profile', error: error.message });
    }
});

/**
 * @swagger
 * /book-session:
 *   post:
 *     summary: Book a Session with a Speaker
 *     description: Allow users to book a session with a specific speaker
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               speakerEmail:
 *                 type: string
 *                 example: "speaker@example.com"
 *               bookingDate:
 *                 type: string
 *                 format: date
 *                 example: "2024-02-15"
 *               timeSlot:
 *                 type: string
 *                 example: "10:00"
 *                 enum: ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"]
 *     responses:
 *       201:
 *         description: Session booked successfully
 *       400:
 *         description: Invalid input or time slot already booked
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error during session booking
 */
app.post('/book-session', verifyToken('user'), async (req, res) => {
    try {
        const { speakerEmail, bookingDate, timeSlot } = req.body;

        // Validate input
        if (!speakerEmail || !bookingDate || !timeSlot) {
            return res.status(400).json({ message: 'Speaker email, booking date, and time slot are required.' });
        }

        // Check if the time slot is within available hours (9 AM to 4 PM)
        const validSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
        if (!validSlots.includes(timeSlot)) {
            return res.status(400).json({ message: 'Invalid time slot. Available slots are 9 AM to 4 PM.' });
        }

        // Retrieve speaker ID using speaker email
        const [speakerInfo] = await connection.promise().query(
            'SELECT user_id, first_name FROM speaker_login WHERE email = ?',
            [speakerEmail]
        );

        if (speakerInfo.length === 0) {
            return res.status(400).json({ message: 'Speaker not found.' });
        }

        const speakerId = speakerInfo[0].user_id;

        // Check if the booking already exists for the given date and time slot
        const [existingBooking] = await connection.promise().query(
            'SELECT * FROM bookings WHERE speaker_id = ? AND booking_date = ? AND time_slot = ?',
            [speakerId, bookingDate, timeSlot]
        );

        if (existingBooking.length > 0) {
            return res.status(400).json({ message: 'This time slot is already booked.' });
        }

        // Book the time slot
        await connection.promise().query(
            'INSERT INTO bookings (speaker_id, speaker_email, booking_date, time_slot, booked) VALUES (?, ?, ?, ?, ?)',
            [speakerId, speakerEmail, bookingDate, timeSlot, true]
        );

        const eventDetails = {
            summary: `Session with Speaker ${speakerInfo[0].first_name}`,
            startDate: `${bookingDate}T${timeSlot.replace(':', '')}00Z`, // UTC format: YYYYMMDDTHHMMSSZ
            endDate: `${bookingDate}T${(parseInt(timeSlot.split(':')[0], 10) + 1).toString().padStart(2, '0')}${timeSlot.split(':')[1]}00Z`,
            location: "Online",
            description: "Join the session with your booked speaker.",
        };

        // Send email notification to user and speaker (pseudo-code, requires actual implementation)
        const userEmail = req.user.email;  // Get user email from token
        await sendEmailNotification(userEmail, speakerEmail, bookingDate, timeSlot);
        await sendGoogleCalendarNotification(userEmail, speakerEmail, eventDetails);

        res.status(201).json({ message: 'Session booked successfully.' });
    } catch (error) {
        console.error('Booking Error:', error);
        res.status(500).json({ message: 'Error booking session', error: error.message });
    }
});



/**
 * @swagger
 * /speaker-profiles:
 *   get:
 *     summary: Get All Speaker Profiles
 *     description: Retrieve a list of all speaker profiles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved speaker profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 profiles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       first_name:
 *                         type: string
 *                       last_name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       expertise:
 *                         type: string
 *                       price_per_session:
 *                         type: number
 *                       bio:
 *                         type: string
 *       404:
 *         description: No speaker profiles found
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       500:
 *         description: Server error during profile retrieval
 */
app.get('/speaker-profiles', verifyToken('user'),async (req, res) => {
    try {
        const [profiles] = await connection.promise().query(
            `SELECT 
                s.first_name, 
                s.last_name, 
                p.email, 
                p.expertise, 
                p.price_per_session, 
                p.bio 
             FROM speaker_profiles p 
             JOIN speaker_login s ON p.speaker_id = s.user_id`
        );

        if (profiles.length === 0) {
            return res.status(404).json({ message: 'No speaker profiles found' });
        }

        res.status(200).json({ profiles });
    } catch (error) {
        console.error('Error fetching speaker profiles:', error);
        res.status(500).json({ message: 'Error fetching speaker profiles', error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`App running on port ${PORT}`);
});
