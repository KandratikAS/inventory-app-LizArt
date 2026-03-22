const jsforce = require('jsforce');

let conn = null;

async function getConnection() {
  if (conn && conn.accessToken) return conn;
  conn = new jsforce.Connection({ loginUrl: process.env.SF_LOGIN_URL });
  await conn.login(process.env.SF_USERNAME, process.env.SF_PASSWORD);
  return conn;
}

async function createAccountWithContact({ firstName, lastName, email, phone, company }) {
  const c = await getConnection();

  const account = await c.sobject('Account').create({
    Name: company || `${firstName} ${lastName}`,
    Phone: phone || '',
    Website: 'https://inventory-client-2a2m.onrender.com',
  });

  if (!account.success) throw new Error('Failed to create Account');

  const contact = await c.sobject('Contact').create({
    FirstName: firstName,
    LastName: lastName,
    Email: email,
    Phone: phone || '',
    AccountId: account.id,
  });

  if (!contact.success) throw new Error('Failed to create Contact');

  return { accountId: account.id, contactId: contact.id };
}

module.exports = { createAccountWithContact };