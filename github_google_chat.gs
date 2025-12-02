/**
 * @fileoverview GitHub Webhook -> Google Chat
 * @author Nash Ang (PinoySeoul Media Enterprise)
 */

var WEBHOOK_URL = "YOUR_WEBHOOK_URL_HERE";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.getDataAsString());
    var message = "";
    var title = "GitHub Activity";
    
    // Logic: Identify Event Type
    if (data.commits) {
      title = "🚀 CODE SHIPPED";
      message = "<b>" + data.sender.login + "</b> pushed " + data.commits.length + " commits.";
    } else if (data.pull_request) {
      title = "📝 PULL REQUEST";
      message = "<b>" + data.sender.login + "</b> " + data.action + " PR: " + data.pull_request.title;
    } else {
      return ContentService.createTextOutput("Ignored");
    }

    var payload = {
      "cardsV2": [{
        "cardId": "gh-" + new Date().getTime(),
        "card": {
          "header": {
            "title": title,
            "subtitle": data.repository.name,
            "imageUrl": "https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png",
            "imageType": "CIRCLE"
          },
          "sections": [{
            "widgets": [{
              "textParagraph": { "text": message }
            }]
          }]
        }
      }]
    };

    UrlFetchApp.fetch(WEBHOOK_URL, {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(payload)
    });
    return ContentService.createTextOutput("Success");

  } catch (error) {
    return ContentService.createTextOutput("Error");
  }
}
