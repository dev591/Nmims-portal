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

  const base = "https://nmims-portal.onrender.com"; // ← replace this with your actual Render URL

const requestId = Math.random().toString(36).substr(2, 9);
const approveLink = `${base}/approve?id=${requestId}&type=approve`;
const rejectLink = `${base}/approve?id=${requestId}&type=reject`;


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
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>NMIMS Parent Response</title>
      <style>
        body {
          font-family: 'Segoe UI', sans-serif;
          background: #f8f9fa;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 40px;
        }
        .card {
          background: #fff;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          max-width: 600px;
          text-align: center;
        }
        img {
          width: 120px;
          margin-bottom: 20px;
        }
        .status {
          font-size: 22px;
          font-weight: bold;
          color: ${type === 'approve' ? '#28a745' : '#dc3545'};
        }
        .info {
          font-size: 14px;
          color: #333;
          margin-bottom: 15px;
        }
        ul {
          text-align: left;
          font-size: 13px;
          line-height: 1.6;
          color: #555;
          padding: 10px 20px;
        }
        li {
          margin-bottom: 8px;
        }
        .footer {
          font-size: 12px;
          margin-top: 25px;
          color: #999;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <img src="https://upload.wikimedia.org/wikipedia/en/thumb/5/56/NMIMS_University_Logo.svg/512px-NMIMS_University_Logo.svg.png" alt="NMIMS Logo" />
        
        <div class="status">
          ${type === 'approve' ? '✅ Permission Granted' : '❌ Permission Denied'}
        </div>
        
        <p class="info">Your response has been recorded.</p>
        <p class="info"><strong>Request ID:</strong> ${id}</p>

        <ul>
          <li>The institution holds no responsibility for incidents outside the campus post-approval.</li>
          <li>Students must carry their college ID card at all times.</li>
          <li>Any misuse of outpass will lead to disciplinary action.</li>
          <li>This permission is valid only for the mentioned purpose and time frame.</li>
          <li>The outpass is non-transferable and applies to one-time use only.</li>
          <li>Parental approval does not override college regulations and policies.</li>
          <li>Emergency services and transportation are not provided by the institution.</li>
          <li>Management reserves the right to revoke permission at any point without notice.</li>
        </ul>

        <div class="footer">
          NMIMS Student Portal System
        </div>
      </div>
    </body>
  </html>
`);
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`✅ Email server running on http://localhost:${PORT}`);
});
