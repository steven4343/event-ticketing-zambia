const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendTicketEmail = async (to, ticketData) => {
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject: `Your Ticket for ${ticketData.eventTitle}`,
      html: `
        <h2>Your Ticket</h2>
        <p><strong>Event:</strong> ${ticketData.eventTitle}</p>
        <p><strong>Date:</strong> ${ticketData.eventDate}</p>
        <p><strong>Venue:</strong> ${ticketData.venue}</p>
        <p><strong>Ticket Code:</strong> ${ticketData.ticketCode}</p>
        <p><strong>Ticket Type:</strong> ${ticketData.ticketType}</p>
        <img src="${ticketData.qrCode}" alt="QR Code" />
      `,
    });
    return true;
  } catch (error) {
    console.error('Email send failed:', error.message);
    return false;
  }
};

module.exports = { sendTicketEmail };
