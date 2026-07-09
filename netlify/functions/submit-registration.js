const { createLead } = require('./_lib/amocrm');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  var data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request' }) };
  }

  // honeypot: bots fill hidden fields, real visitors never see this one
  if (data.company) {
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
  }

  var required = ['class', 'name', 'email', 'phone', 'messenger', 'contact', 'consent'];
  for (var i = 0; i < required.length; i++) {
    if (!data[required[i]]) {
      return { statusCode: 400, body: JSON.stringify({ error: 'missing field: ' + required[i] }) };
    }
  }

  var token = process.env.TELEGRAM_BOT_TOKEN;
  var chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  var text = [
    'Новая заявка с сайта',
    '',
    'Класс: ' + (data['class'] || 'не указан'),
    'Имя: ' + data.name,
    'Email: ' + data.email,
    'Телефон: ' + data.phone,
    'Связь: ' + data.messenger + ' (' + data.contact + ')'
  ].join('\n');

  try {
    var res = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: text })
    });
    if (!res.ok) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Telegram error' }) };
    }
  } catch (err) {
    return { statusCode: 502, body: JSON.stringify({ error: 'Network error' }) };
  }

  // amoCRM is a secondary channel — never let a CRM hiccup block the visitor's
  // confirmation, Telegram delivery above already succeeded at this point.
  if (process.env.AMOCRM_CLIENT_ID) {
    try {
      await createLead(data);
    } catch (err) {
      console.error('amoCRM lead creation failed:', err.message);
    }
  }

  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true }) };
};
