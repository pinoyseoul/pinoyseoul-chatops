/**
 * @fileoverview Google Forms -> Google Chat Notification
 * @author Nash Ang (PinoySeoul Media Enterprise)
 */

var WEBHOOK_URL = "YOUR_WEBHOOK_URL_HERE";
var NAME_FIELD_HEADER = "Full Name"; // Ensure this matches your Google Sheet Header exactly

function sendFormCelebration(e) {
  var sheetUrl = SpreadsheetApp.getActiveSpreadsheet().getUrl();
  var responses = e.namedValues;
  
  // Defensive: Find the name field regardless of whitespace
  var applicantName = "New Applicant";
  for (var key in responses) {
    if (key.trim() === NAME_FIELD_HEADER.trim()) {
      applicantName = responses[key][0];
      break;
    }
  }

  var payload = {
    "cardsV2": [{
      "cardId": "growth-" + new Date().getTime(),
      "card": {
        "header": {
          "title": "🎉 New Lead Captured!",
          "subtitle": "Growth Engine",
          "imageUrl": "https://fonts.gstatic.com/s/i/googlematerialicons/celebration/v1/48px.png",
          "imageType": "CIRCLE"
        },
        "sections": [{
          "widgets": [
            {
              "decoratedText": {
                "topLabel": "Applicant Name",
                "text": "<b>" + applicantName + "</b>",
                "startIcon": { "knownIcon": "PERSON" }
              }
            },
            {
              "buttonList": {
                "buttons": [{
                  "text": "📂 Open Spreadsheet",
                  "onClick": { "openLink": { "url": sheetUrl } }
                }]
              }
            }
          ]
        }]
      }
    }]
  };

  UrlFetchApp.fetch(WEBHOOK_URL, {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload)
  });
}
