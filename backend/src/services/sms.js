const sendTicketSMS = async (phone, ticketData) => {
  try {
    const message = `Your ticket for ${ticketData.eventTitle} on ${ticketData.eventDate} at ${ticketData.venue}. Code: ${ticketData.ticketCode}. Show this at entry.`;
    // Integrate with an SMS provider (e.g., Twilio, Africa's Talking, etc.)
    console.log(`SMS sent to ${phone}: ${message}`);
    return true;
  } catch (error) {
    console.error('SMS send failed:', error.message);
    return false;
  }
};

module.exports = { sendTicketSMS };
