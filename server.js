const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Temporary in-memory storage for approvals
const approvals = {}; // { requestId: { decision, timestamp, ip } }

// 📩 POST route to send email to parent
app.post('/send-email', async (req, res) => {
  const { to, studentName, studentSap, requestType, date, time, reason } = req.body;

  // 🔑 Debug input
  console.log("📥 Incoming email data:", req.body);
  if (!studentName || !studentSap || !requestType) {
    console.log("⚠️ Missing some required fields!");
  }

  // Generate request ID (later replace with DB)
  const requestId = Math.random().toString(36).substr(2, 9);
  const approveLink = `http://localhost:3001/approve?id=${requestId}&type=approve`;
  const rejectLink = `http://localhost:3001/approve?id=${requestId}&type=reject`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: `Permission Request – ${studentName} (SAP: ${studentSap})`,
    text: `Fallback: ${studentName} submitted a ${requestType} request.`,
    html: `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: #fff; padding: 20px; border-radius: 8px;">
            <div style="text-align: center;">
              <img src="https://upload.wikimedia.org/wikipedia/en/thumb/5/56/NMIMS_University_Logo.svg/512px-NMIMS_University_Logo.svg.png" style="max-width: 150px; margin-bottom: 20px;" />
            </div>
            <p>Dear Parent,</p>
            <p>Your child <strong>${studentName}</strong> (SAP ID: <strong>${studentSap}</strong>) has submitted a <strong>${requestType}</strong> request via the NMIMS Student Portal.</p>
            <ul>
              <li><strong>📅 Date:</strong> ${date}</li>
              <li><strong>⏰ Time:</strong> ${time}</li>
              <li><strong>📄 Reason:</strong> ${reason}</li>
            </ul>
            <p>Please confirm your approval below:</p>
            <div style="margin-top: 20px;">
              <a href="${approveLink}" style="background-color: #28a745; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px;">✅ Approve</a>
              <a href="${rejectLink}" style="background-color: #dc3545; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; margin-left: 10px;">❌ Reject</a>
            </div>
            <p style="font-size: 12px; color: #888; margin-top: 30px;">NMIMS | Student Portal System</p>
          </div>
        </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Email sent to:", to);
    res.status(200).send('Email sent successfully');
  } catch (error) {
    console.error('❌ Error sending email:', error);
    res.status(500).send('Failed to send email');
  }
});

// ✅ Approve/Reject Response Route
app.get('/approve', (req, res) => {
  const { id, type } = req.query;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  if (!id || !['approve', 'reject'].includes(type)) {
    return res.status(400).send('Invalid approval link');
  }

  approvals[id] = {
    decision: type,
    timestamp: new Date().toISOString(),
    ip
  };

  console.log(`✅ Parent responded: ${type.toUpperCase()} for ID ${id} from ${ip}`);
  res.send(`<h2>Thank you!</h2><p>Your response (<strong>${type}</strong>) has been recorded for request ID <strong>${id}</strong>.</p>`);
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Email server running on http://localhost:${PORT}`);
});
