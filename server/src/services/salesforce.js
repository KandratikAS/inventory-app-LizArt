const axios = require('axios');

let accessToken = null;
let instanceUrl = null;

async function getConnection() {
  if (accessToken) return { accessToken, instanceUrl };

  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: process.env.SF_CLIENT_ID,
    client_secret: process.env.SF_CLIENT_SECRET,
    username: process.env.SF_USERNAME,
    password: process.env.SF_PASSWORD,
  });

  try {
    const { data } = await axios.post(
      `${process.env.SF_LOGIN_URL}/services/oauth2/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    accessToken = data.access_token;
    instanceUrl = data.instance_url;
    return { accessToken, instanceUrl };
  } catch (e) {
    console.error('SF Auth error:', JSON.stringify(e.response?.data));
    throw new Error(JSON.stringify(e.response?.data));
  }
}

async function createAccountWithContact({ firstName, lastName, email, phone, company }) {
  const { accessToken, instanceUrl } = await getConnection();

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    const accountRes = await axios.post(
      `${instanceUrl}/services/data/v59.0/sobjects/Account`,
      {
        Name: company || `${firstName} ${lastName}`,
        Phone: phone || '',
        Website: 'https://inventory-client-2a2m.onrender.com',
      },
      { headers }
    );

    const contactRes = await axios.post(
      `${instanceUrl}/services/data/v59.0/sobjects/Contact`,
      {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        Phone: phone || '',
        AccountId: accountRes.data.id,
      },
      { headers }
    );

    return { accountId: accountRes.data.id, contactId: contactRes.data.id };
  } catch (e) {
    console.error('SF API error:', JSON.stringify(e.response?.data));
    throw new Error(JSON.stringify(e.response?.data));
  }
}

module.exports = { createAccountWithContact };