const { v4: uuidv4 } = require('uuid');

const generateTicketCode = () => {
  const year = new Date().getFullYear();
  const shortId = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  return `EVT-${year}-${shortId}`;
};

module.exports = { generateTicketCode };
