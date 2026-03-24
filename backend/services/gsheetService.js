/**
 * Google Sheets Service
 * 
 * Handles bidirectional syncing and writing to a client Google Sheet.
 * Requires `credentials.json` (Service Account) in the backend directory
 * and `GOOGLE_SPREADSHEET_ID` inside the .env file.
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import dotenv from 'dotenv';
dotenv.config();

const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;

let authClient = null;

async function getAuthClient() {
  if (authClient) return authClient;
  
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    console.warn('⚠️ Google Sheets Sync Disabled: credentials.json not found in backend folder.');
    return null;
  }
  
  if (!SPREADSHEET_ID) {
    console.warn('⚠️ Google Sheets Sync Disabled: GOOGLE_SPREADSHEET_ID not set in .env.');
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: CREDENTIALS_PATH,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    authClient = await auth.getClient();
    console.log('✅ Google Sheets API authenticated successfully.');
    return authClient;
  } catch (err) {
    console.error('❌ Failed to authenticate with Google Sheets:', err.message);
    return null;
  }
}

/**
 * Appends a single row to a specific Sheet Tab.
 * 
 * @param {string} sheetName - The exact name of the tab in the spreadsheet (e.g. 'Daily Logs')
 * @param {Array<string|number>} values - An array representing the columns of the row to append
 */
export async function appendRow(sheetName, values) {
  try {
    const auth = await getAuthClient();
    if (!auth) return false;

    const sheets = google.sheets({ version: 'v4', auth });
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [values],
      },
    });
    
    return true;
  } catch (error) {
    console.error(`❌ Error appending to Google Sheet (${sheetName}):`, error.message);
    return false;
  }
}

/**
 * Reads all rows from a specific Sheet Tab.
 * Useful for the historical data import script.
 * 
 * @param {string} range - The range to read (e.g. 'HistoricalData!A1:Z500')
 */
export async function readRows(range) {
  try {
    const auth = await getAuthClient();
    if (!auth) return null;

    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: range,
    });
    
    return response.data.values;
  } catch (error) {
    console.error(`❌ Error reading from Google Sheet (${range}):`, error.message);
    return null;
  }
}
