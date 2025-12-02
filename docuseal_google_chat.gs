/**
 * @fileoverview DocuSeal Webhook -> Google Chat
 * @author Nash Ang (PinoySeoul Media Enterprise)
 */

var WEBHOOK_URL = "YOUR_WEBHOOK_URL_HERE";

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    
    // Filter: Only accept completed forms/documents
    var eventType = payload.event_type || payload.event || "unknown";
    if (eventType !== "form.completed" && eventType !== "document.completed") {
       return ContentService.createTextOutput("Ignored");
    }

    var docName = "Signed Document";
    if (payload.data && payload.data.template && payload.data.template.name) {
      docName = payload.data.template.name;
    }

    var outputPayload = {
      "cardsV2": [{
        "cardId": "docuseal-" + new Date().getTime(),
        "card": {
          "header": {
            "title": "🤝 It's Official!",
            "subtitle": "Contract Signed",
            "imageUrl": "https://fonts.gstatic.com/s/i/googlematerialicons/handshake/v1/48px.png",
            "imageType": "CIRCLE"
          },
          "sections": [{
            "widgets": [
              {
                "decoratedText": {
                  "topLabel": "Document Name",
                  "text": "<b>" + docName + "</b>",
                  "startIcon": { "knownIcon": "DESCRIPTION" }
                }
              },
              {
                "textParagraph": {
                  "text": "<i>Another partnership locked in. Excellent work securing this agreement!</i> ✍️"
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
      "payload": JSON.stringify(outputPayload)
    });
    return ContentService.createTextOutput("Success");

  } catch (error) {
    return ContentService.createTextOutput("Error");
  }
}
