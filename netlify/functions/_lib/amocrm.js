const { getStore } = require('@netlify/blobs');

function tokenStore() {
  return getStore({
    name: 'amocrm',
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN
  });
}

async function exchangeToken(body) {
  var subdomain = process.env.AMOCRM_SUBDOMAIN;
  var res = await fetch('https://' + subdomain + '.amocrm.ru/oauth2/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  var data = await res.json();
  if (!res.ok) {
    throw new Error('amoCRM token exchange failed: ' + JSON.stringify(data));
  }
  return data;
}

async function saveTokens(store, data) {
  var record = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000)
  };
  await store.setJSON('tokens', record);
  return record;
}

async function exchangeCodeForTokens(code) {
  var store = tokenStore();
  var data = await exchangeToken({
    client_id: process.env.AMOCRM_CLIENT_ID,
    client_secret: process.env.AMOCRM_CLIENT_SECRET,
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: process.env.AMOCRM_REDIRECT_URI
  });
  return saveTokens(store, data);
}

async function getValidAccessToken() {
  var store = tokenStore();
  var tokens = await store.get('tokens', { type: 'json' });
  if (!tokens) {
    throw new Error('amoCRM is not authorized yet — open the authorization link in amoCRM first');
  }

  if (tokens.expires_at - 60000 > Date.now()) {
    return tokens.access_token;
  }

  var data = await exchangeToken({
    client_id: process.env.AMOCRM_CLIENT_ID,
    client_secret: process.env.AMOCRM_CLIENT_SECRET,
    grant_type: 'refresh_token',
    refresh_token: tokens.refresh_token,
    redirect_uri: process.env.AMOCRM_REDIRECT_URI
  });
  var saved = await saveTokens(store, data);
  return saved.access_token;
}

async function createLead(payload) {
  var subdomain = process.env.AMOCRM_SUBDOMAIN;
  var token = await getValidAccessToken();

  var leadName = 'Заявка с сайта: ' + (payload['class'] || 'без указания класса');

  var contact = {
    name: payload.name,
    custom_fields_values: [
      { field_code: 'PHONE', values: [{ value: payload.phone, enum_code: 'WORK' }] },
      { field_code: 'EMAIL', values: [{ value: payload.email, enum_code: 'WORK' }] }
    ]
  };

  var leadRes = await fetch('https://' + subdomain + '.amocrm.ru/api/v4/leads/complex', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + token
    },
    body: JSON.stringify([{ name: leadName, _embedded: { contacts: [contact] } }])
  });

  var leadData = await leadRes.json();
  if (!leadRes.ok) {
    throw new Error('amoCRM lead creation failed: ' + JSON.stringify(leadData));
  }

  var leadId = leadData[0] && leadData[0].id;

  if (leadId) {
    var noteText = [
      'Класс(ы): ' + (payload['class'] || 'не указан'),
      'Способ связи: ' + payload.messenger + ' (' + payload.contact + ')'
    ].join('\n');

    await fetch('https://' + subdomain + '.amocrm.ru/api/v4/leads/' + leadId + '/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify([{ note_type: 'common', params: { text: noteText } }])
    });
  }

  return leadId;
}

module.exports = {
  exchangeCodeForTokens: exchangeCodeForTokens,
  getValidAccessToken: getValidAccessToken,
  createLead: createLead
};
