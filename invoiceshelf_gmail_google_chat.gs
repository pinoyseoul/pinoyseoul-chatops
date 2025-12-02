/**
 * @fileoverview Gmail Sent Items Scanner -> Google Chat
 * @author Nash Ang (PinoySeoul Media Enterprise)
 * @note Run this on the account that sends the invoices (e.g., noreply@)
 */

var WEBHOOK_URL = "YOUR_WEBHOOK_URL_HERE";
var EMAIL_SUBJECT = "New Payment"; // Exact subject line from InvoiceShelf

function checkSentMailForPayments() {
  // Search Sent Items for un-celebrated emails
  var query = 'from:me subject:"' + EMAIL_SUBJECT + '" -label:Celebrated';
  var threads = GmailApp.search(query);

  if (threads.length === 0) return;

  var label = GmailApp.getUserLabelByName("Celebrated");
  if (!label) label = GmailApp.createLabel("Celebrated");

  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var msg = thread.getMessages()[0];
    var clientEmail = msg.getTo();

    var payload = {
      "cardsV2": [{
        "cardId": "payment-" + new Date().getTime(),
        "card": {
          "header": {
            "title": "💰 Payment Confirmed",
            "subtitle": "Revenue Recorded",
            "imageUrl": "https://fonts.gstatic.com/s/i/googlematerialicons/payments/v1/48px.png",
            "imageType": "CIRCLE"
          },
          "sections": [{
            "widgets": [
              {
                "decoratedText": {
                  "topLabel": "Client Email",
                  "text": "<b>" + clientEmail + "</b>",
                  "startIcon": { "knownIcon": "EMAIL" }
                }
              },
               {
                "textParagraph": {
                  "text": "<i>Cha-ching! Funds detected.</i> 🏦"
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

    thread.addLabel(label); // Mark as done
  }
}
