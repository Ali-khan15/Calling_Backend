const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Vonage } = require('@vonage/server-sdk'); // Importing Vonage
const fs = require('fs'); // For reading the private key
const bcrypt = require('bcryptjs'); // Import bcrypt for password hashing
 
// Vonage API credentials
const vonage = new Vonage({
  apiKey: '070a6680',  // Replace with your actual API key
  apiSecret: 'a6BKzfjiyhQpdvW7', // Replace with your actual API secret
  applicationId: '1256c672-f7b3-4e61-a249-195d2df3c5a3', // Add the application ID here
  privateKey: fs.readFileSync(__dirname + '/private.key') // Point to the location of your private key
});
 
// Create Express app
const app = express();
app.use(cors());
app.use(bodyParser.json());
 
// MongoDB connection
mongoose.connect('mongodb+srv://alikhan:Inspiron153000+@calling.oebje.mongodb.net/?retryWrites=true&w=majority&appName=calling', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => console.log(err));
 
// User Schema
const UserSchema = new mongoose.Schema({
  fullName: String,
  phone: String,
  email: String,
  password: String,
  companyName: String,
});
 
const User = mongoose.model('User', UserSchema);
 
// Script Schema
const ScriptSchema = new mongoose.Schema({
  script: { type: String, required: true },
  user: { type: String, required: true },
  companyName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});
 
const Script = mongoose.model('Script', ScriptSchema);
 
// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ak8855105@gmail.com', // your Gmail
    pass: 'zitr nyvl bjxh hqpv', // your Gmail app password
  },
});
 
// Signup route
app.post('/signup', async (req, res) => {
  const { fullName, phone, email, password, companyName } = req.body;
 
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send({ message: 'User already exists with this email' });
    }
 
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
 
    // Save user to the database
    const newUser = new User({ fullName, phone, email, password: hashedPassword, companyName });
    await newUser.save();
 
    // Send welcome email
    const mailOptions = {
      from: 'ak8855105@gmail.com',
      to: email,
      subject: 'Welcome to Calling Web!',
      text: `Hi ${fullName},\n\nThank you for signing up at Calling Web. We are excited to have you onboard!\n\nBest Regards,\nCalling Web Team`,
    };
 
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.log(error);
        return res.status(500).send({ message: 'Error sending email' });
      } else {
        console.log('Email sent: ' + info.response);
        res.status(201).send({ message: 'Signup successful and email sent', user: newUser });
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: 'Error signing up user' });
  }
});
 
// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
 
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
 
    // Compare the hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
 
    res.status(200).json({ message: 'Login successful', user });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: 'Error logging in' });
  }
});
 
// Route to submit the script
app.post('/submit-script', async (req, res) => {
  const { script, user, companyName } = req.body;
 
  try {
    const newScript = new Script({ script, user, companyName });
    await newScript.save();
 
    res.status(201).json({ message: 'Script saved successfully!' });
  } catch (err) {
    console.log(err);
    res.status(500).send({ message: 'Error saving script' });
  }
});
 
// Route to call users using Vonage API
app.post('/call-users', (req, res) => {
  const { numbers, script } = req.body;
 
  numbers.forEach((number) => {
    vonage.voice.createOutboundCall({
      to: [{ type: 'phone', number }],
      from: { type: 'phone', number: '+923355504440' }, // Replace with your Vonage registered number
      ncco: [
        {
          action: 'talk',
          text: script,
        }
      ]
    }, (err, responseData) => {
      if (err) {
        console.error(err);
        return res.status(500).send({ message: 'Error calling user' });
      } else {
        console.log(responseData);
      }
    });
  });
 
  res.status(200).send({ message: 'Calls initiated!' });
});
 
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});