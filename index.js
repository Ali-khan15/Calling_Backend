const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect('mongodb+srv://alikhan:Inspiron153000+@calling.oebje.mongodb.net/?retryWrites=true&w=majority&appName=calling', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected'))
  .catch((error) => console.error('MongoDB connection error:', error));

// JWT secret key (hardcoded)
const JWT_SECRET = 'baf10085b557323bfd5ec1f45a4c070a69259797f3a476602322b860cb423a6c5d5c84a7d09eab0fbbb3adacb0bbe03dd61d4083c1140fd49aaa04bad8e5a256';

// User Schema
const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  companyName: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Configure Nodemailer with Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'ak8855105@gmail.com', // Your Gmail address
      pass: 'zitr nyvl bjxh hqpv', // Your Gmail password or app password if 2FA enabled
    },
  });
  
  // Register Route
app.post('/signup', async (req, res) => {
    const { fullName, phone, email, password, companyName } = req.body;
  
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }
  
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Create new user
      const newUser = new User({
        fullName,
        phone,
        email,
        password: hashedPassword,
        companyName,
      });
  
      await newUser.save();
  
      // Generate token
      const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '1h' });
  
      // Send a welcome email to the user
      const mailOptions = {
        from: 'ak8855105@gmail.com', // sender address
        to: email, // list of receivers
        subject: 'Welcome to Our Platform', // Subject line
        text: `Hello ${fullName},\n\nThank you for signing up on our platform. We are excited to have you onboard!\n\nBest regards,\nThe Team`, // plain text body
      };
  
      // Send email
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
          return res.status(500).json({ message: 'User created, but email failed to send' });
        } else {
          console.log('Email sent: ' + info.response);
          return res.status(201).json({ message: 'Signup successful, email sent!', token });
        }
      });
    } catch (error) {
      console.error('Error during signup:', error);
      res.status(500).json({ message: 'Server error' });
    }
  });



  app.use('/', (req, res) => {
    res.json({message :'Hello World'});
  });
  
// Login Route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'User with this email not found' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

    res.status(200).json({ message: 'Login successful', token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

const authenticate = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token || !token.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Access denied, no token provided' });
  }

  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET); // Split 'Bearer ' and get the token part
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(400).json({ message: 'Invalid token' });
  }
};

// Get User Info Route
app.get('/user', authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ fullName: user.fullName });
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
