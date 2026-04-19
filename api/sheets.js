// api/sheets.js
// Google Sheets API 프록시 — client_secret을 서버에서만 보관

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

  const { action, spreadsheetId, range, values } = req.method === 'POST'
    ? req.body
    : req.query;

  if (!spreadsheetId) return res.status(400).json({ error: 'spreadsheetId required' });

  try {
    let googleRes;

    if (action === 'append') {
      // 행 추가
      googleRes = await fetch(
        `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
    } else if (action === 'read') {
      // 행 읽기
      googleRes = await fetch(
        `${SHEETS_BASE}/${spreadsheetId}/values/${encodeURIComponent(range)}`,
        { headers: { 'Authorization': authHeader } }
      );
    } else if (action === 'create_sheet') {
      // 시트가 없으면 생성 + 헤더 삽입
      googleRes = await fetch(
        `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [{
              addSheet: {
                properties: { title: '혈압기록' }
              }
            }]
          }),
        }
      );
    } else {
      return res.status(400).json({ error: 'Unknown action' });
    }

    const data = await googleRes.json();
    if (!googleRes.ok) throw new Error(data.error?.message || 'Sheets API error');
    return res.status(200).json(data);

  } catch (err) {
    console.error('[Sheets Error]', err);
    return res.status(500).json({ error: err.message });
  }
}
