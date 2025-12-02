/**
 * @fileoverview Postiz Webhook -> Google Chat (On-Air Style)
 * @author Nash Ang (PinoySeoul Media Enterprise)
 */

var WEBHOOK_URL = "YOUR_WEBHOOK_URL_HERE";
var BRAND_LOGO = 'https://pinoyseoul.com/favicon.ico'; 

function doPost(e) {
  try {
    var jsonString = e.postData.getDataAsString();
    var postizData = JSON.parse(jsonString);
    var posts = Array.isArray(postizData) ? postizData : [postizData];
    
    var widgets = [];

    // Header Motivation
    widgets.push({
      "textParagraph": {
        "text": "<b><font color=\"#0038A8\">" + getTimeBasedGreeting() + "</font></b><br>" + getMotivation()
      }
    });

    for (var i = 0; i < posts.length; i++) {
      var post = posts[i];
      var provider = post.integration ? post.integration.providerIdentifier : 'unknown';
      var iconUrl = getSocialIcon(provider);
      
      // Visual Status Logic
      var statusText = "UNKNOWN";
      var statusIcon = "❓";
      var statusColor = "#666666"; 

      if (post.state === 'PUBLISHED') {
        statusText = "ON AIR / PUBLISHED";
        statusIcon = "📡"; 
        statusColor = "#1E8E3E"; 
      } else if (post.state === 'FAILED') {
        statusText = "BROADCAST FAILED";
        statusIcon = "🛑";
        statusColor = "#CE1126";
      }

      widgets.push({
        "decoratedText": {
          "startIcon": { "iconUrl": iconUrl },
          "topLabel": (post.integration ? post.integration.name : "Channel").toUpperCase(),
          "text": "<b>" + provider.toUpperCase() + "</b>",
          "bottomLabel": statusIcon + " <font color=\"" + statusColor + "\">" + statusText + "</font>"
        }
      });

      if (post.releaseURL) {
        widgets.push({
          "buttonList": {
            "buttons": [{
              "text": "👀 Check Live Post",
              "onClick": { "openLink": { "url": post.releaseURL } }
            }]
          }
        });
      }
    }

    var payload = {
      "cardsV2": [{
        "cardId": "postiz-" + new Date().getTime(),
        "card": {
          "header": {
            "title": "Social Media Operations",
            "imageUrl": BRAND_LOGO,
            "imageType": "CIRCLE"
          },
          "sections": [{ "widgets": widgets }]
        }
      }]
    };

    UrlFetchApp.fetch(WEBHOOK_URL, {
      'method' : 'post',
      'contentType': 'application/json',
      'payload' : JSON.stringify(payload)
    });
    return ContentService.createTextOutput("Success");

  } catch (error) {
    return ContentService.createTextOutput("Error");
  }
}

// Helpers
function getTimeBasedGreeting() {
  var h = new Date().getHours(); 
  if (h < 12) return "🌤️ Good morning! 좋은 아침입니다!";
  if (h < 18) return "☀️ Good afternoon! 안녕하세요!";
  return "🌙 Good evening! 수고하셨습니다!";
}

function getMotivation() {
  var q = ["Stories connect us.", "Building the bridge.", "Your voice matters.", "One post at a time."];
  return q[Math.floor(Math.random() * q.length)];
}

function getSocialIcon(p) {
  // Add icon mapping logic here
  return 'https://cdn-icons-png.flaticon.com/512/1006/1006771.png';
}
