const { exchangeCodeForTokens } = require('./_lib/amocrm');

exports.handler = async function (event) {
  var code = event.queryStringParameters && event.queryStringParameters.code;
  if (!code) {
    return { statusCode: 400, body: 'Missing "code" parameter' };
  }

  try {
    await exchangeCodeForTokens(code);
  } catch (err) {
    return { statusCode: 502, body: 'amoCRM authorization failed: ' + err.message };
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: '<!doctype html><html lang="ru"><body style="font-family:sans-serif;padding:2rem;text-align:center;">' +
      '<h2>amoCRM подключён</h2><p>Можно закрыть эту вкладку.</p></body></html>'
  };
};
