/*
 * ESP32 DairySense Integration Template
 * 
 * This template shows how to integrate WiFi and HTTP API calls
 * into your existing ESP32 RFID reader code.
 * 
 * INTEGRATION INSTRUCTIONS:
 * 1. Copy WiFi connection code into your existing sketch
 * 2. Copy HTTP API functions (checkCowExists, registerPendingRfid)
 * 3. Call these functions from your existing RFID read handlers
 * 4. Keep all your existing OLED, LED, and buzzer logic
 * 
 * CONFIGURATION:
 * - Update WIFI_SSID and WIFI_PASSWORD
 * - Update BACKEND_URL with your computer's IP address
 * - Update RFID reading logic to match your existing code
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

const char* WIFI_SSID = "YourWiFiNetwork";           // Your WiFi network name
const char* WIFI_PASSWORD = "YourWiFiPassword";      // Your WiFi password
const char* BACKEND_URL = "http://10.215.216.156:3001";  // Your computer's IP address (find with ipconfig)

// WiFi connection timeout (milliseconds)
const unsigned long WIFI_TIMEOUT = 30000;  // 30 seconds

// HTTP request timeout (milliseconds)
const unsigned long HTTP_TIMEOUT = 10000;  // 10 seconds

// ============================================
// WIFI CONNECTION
// ============================================

bool connectWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED) {
    if (millis() - startTime > WIFI_TIMEOUT) {
      Serial.println("WiFi connection timeout!");
      return false;
    }
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  return true;
}

bool isWiFiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

// ============================================
// API FUNCTIONS
// ============================================

/**
 * Check if cow exists by RFID UID (Scan Mode)
 * 
 * @param rfidUid RFID tag UID (HEX string, uppercase)
 * @return true if cow exists, false if not found or error
 */
bool checkCowExists(String rfidUid) {
  if (!isWiFiConnected()) {
    Serial.println("WiFi not connected!");
    return false;
  }
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/cows/rfid/" + rfidUid;
  
  Serial.print("Checking cow: ");
  Serial.println(url);
  
  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT);
  
  int httpCode = http.GET();
  
  bool result = false;
  
  if (httpCode == HTTP_CODE_OK) {
    // Cow exists
    String payload = http.getString();
    Serial.println("Cow found!");
    Serial.println(payload);
    result = true;
  } else if (httpCode == HTTP_CODE_NOT_FOUND) {
    // Cow not found (404)
    Serial.println("Cow not found");
    result = false;
  } else {
    // Error (500, timeout, etc.)
    Serial.print("HTTP error: ");
    Serial.println(httpCode);
    result = false;
  }
  
  http.end();
  return result;
}

/**
 * Register pending RFID scan (Register Mode)
 * 
 * @param rfidUid RFID tag UID (HEX string, uppercase)
 * @return true if new tag (ready to register), false if exists or error
 */
bool registerPendingRfid(String rfidUid) {
  if (!isWiFiConnected()) {
    Serial.println("WiFi not connected!");
    return false;
  }
  
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/cows/rfid/pending";
  
  Serial.print("Registering pending RFID: ");
  Serial.println(rfidUid);
  
  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT);
  http.addHeader("Content-Type", "application/json");
  
  // Create JSON request body
  String jsonBody = "{\"rfid_uid\":\"" + rfidUid + "\"}";
  
  int httpCode = http.POST(jsonBody);
  
  bool result = false;
  
  if (httpCode == HTTP_CODE_OK) {
    // New tag - ready to register
    String payload = http.getString();
    Serial.println("New tag - ready to register!");
    Serial.println(payload);
    result = true;
  } else if (httpCode == HTTP_CODE_BAD_REQUEST) {
    // Already exists (400)
    String payload = http.getString();
    Serial.println("Tag already registered");
    Serial.println(payload);
    result = false;
  } else {
    // Error (500, timeout, etc.)
    Serial.print("HTTP error: ");
    Serial.println(httpCode);
    result = false;
  }
  
  http.end();
  return result;
}

// ============================================
// INTEGRATION POINTS
// ============================================

/**
 * Handle RFID scan in SCAN MODE (Daily Operations)
 * 
 * This function:
 * 1. Sends RFID to backend for auto lane assignment
 * 2. Gets cow details, assigned lane, and feed suggestion
 * 3. Displays on OLED: Cow name, Lane number, Feed suggestion
 */
void handleScanMode(String rfidUid) {
  Serial.print("SCAN MODE - RFID: ");
  Serial.println(rfidUid);
  
  // TODO: Update OLED to show "Scanning..."
  // TODO: Your existing OLED update code here
  
  // Call ESP32 scan endpoint (auto-assigns lane)
  HTTPClient http;
  String url = String(BACKEND_URL) + "/api/daily-lane-log/esp32-scan";
  
  Serial.print("Sending scan request: ");
  Serial.println(url);
  
  http.begin(url);
  http.setTimeout(HTTP_TIMEOUT);
  http.addHeader("Content-Type", "application/json");
  
  String jsonBody = "{\"rfid_uid\":\"" + rfidUid + "\",\"operation\":\"feed\"}";
  
  int httpCode = http.POST(jsonBody);
  
  if (httpCode == HTTP_CODE_OK) {
    // Parse response
    String payload = http.getString();
    Serial.println("Scan response: " + payload);
    
    // TODO: Parse JSON response to extract:
    // - cow.name
    // - lane_no
    // - feed_suggestion_kg
    // 
    // Example response:
    // {
    //   "data": {
    //     "cow": {"name": "Bella", "cow_type": "normal"},
    //     "lane_no": 3,
    //     "feed_suggestion_kg": 4.5
    //   }
    // }
    
    // TODO: Update OLED to show:
    // Line 1: "Cow: [name]"
    // Line 2: "Lane: [lane_no]"
    // Line 3: "Feed: [feed_suggestion] kg"
    
    // TODO: Green LED ON
    // TODO: Short beep (success)
    
    Serial.println("SUCCESS: Cow scanned, lane assigned");
  } else if (httpCode == HTTP_CODE_NOT_FOUND) {
    // Cow not found
    Serial.println("NOT FOUND: Cow not registered");
    // TODO: Update OLED: "Not Registered"
    // TODO: Red LED ON
    // TODO: Double beep (error)
  } else {
    // Error
    Serial.print("HTTP error: ");
    Serial.println(httpCode);
    // TODO: Update OLED: "Server Error"
    // TODO: Red LED ON
    // TODO: Double beep (error)
  }
  
  http.end();
}

/**
 * Handle RFID scan in REGISTER MODE
 * 
 * Replace this with your existing register mode handler.
 * Keep your OLED, LED, and buzzer logic.
 */
void handleRegisterMode(String rfidUid) {
  Serial.print("REGISTER MODE - RFID: ");
  Serial.println(rfidUid);
  
  // TODO: Update OLED to show "Checking..."
  // TODO: Your existing OLED update code here
  
  // Check if tag is new via API
  bool isNew = registerPendingRfid(rfidUid);
  
  if (isNew) {
    // New tag - READY TO REGISTER
    Serial.println("READY: New tag - complete registration on frontend");
    // TODO: Update OLED: "Ready to Register"
    // TODO: Green LED ON
    // TODO: Long beep (registration completed)
  } else {
    // Tag already exists - ALREADY REGISTERED
    Serial.println("EXISTS: Tag already registered");
    // TODO: Update OLED: "Already Registered"
    // TODO: Red LED ON
    // TODO: Double beep (error)
  }
}

// ============================================
// SETUP AND LOOP
// ============================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("=== DairySense ESP32 ===");
  
  // Connect to WiFi
  if (!connectWiFi()) {
    Serial.println("Failed to connect to WiFi!");
    // TODO: Show error on OLED
    // TODO: Continue in offline mode if needed
  }
  
  // TODO: Initialize your existing hardware:
  // - RFID reader (RC522)
  // - OLED display
  // - LEDs
  // - Buzzer
  // - Mode switch
  
  Serial.println("Setup complete!");
}

void loop() {
  // TODO: Read mode switch (Scan vs Register)
  // bool isRegisterMode = readModeSwitch();
  
  // TODO: Read RFID tag
  // String rfidUid = readRfidTag();
  // if (rfidUid.length() > 0) {
  //   if (isRegisterMode) {
  //     handleRegisterMode(rfidUid);
  //   } else {
  //     handleScanMode(rfidUid);
  //   }
  // }
  
  // TODO: Your existing loop logic here
  
  delay(100);
}

// ============================================
// NOTES
// ============================================

/*
 * INTEGRATION CHECKLIST:
 * 
 * 1. ✅ Copy WiFi connection code (connectWiFi, isWiFiConnected)
 * 2. ✅ Copy API functions (checkCowExists, registerPendingRfid)
 * 3. ✅ Update handleScanMode with your OLED/LED/buzzer logic
 * 4. ✅ Update handleRegisterMode with your OLED/LED/buzzer logic
 * 5. ✅ Call handleScanMode/handleRegisterMode from your RFID read handler
 * 6. ✅ Update configuration (WIFI_SSID, WIFI_PASSWORD, BACKEND_URL)
 * 7. ✅ Test WiFi connection
 * 8. ✅ Test API calls
 * 9. ✅ Test end-to-end flow
 * 
 * ERROR HANDLING:
 * - Network errors should NOT crash the ESP32
 * - Show error messages on OLED
 * - Use LED/buzzer patterns to indicate errors
 * - Consider fallback to offline mode if WiFi fails
 * 
 * TESTING:
 * - Test with registered cow (should return success)
 * - Test with unregistered cow (should return not found)
 * - Test with network disconnected (should show error, not crash)
 * - Test register mode with new tag (should return ready)
 * - Test register mode with existing tag (should return exists)
 */

