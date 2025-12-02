/**
 * @fileoverview Blogger RSS -> Google Chat Notification
 * @author Nash Ang (PinoySeoul Media Enterprise)
 */

var WEBHOOK_URL = "YOUR_WEBHOOK_URL_HERE";
var WEBSITE_URL = "https://pinoyseoul.com"; 

function checkBloggerFeed() {
  var feedUrl = WEBSITE_URL + "/feeds/posts/default?alt=rss";
  
  try {
    var response = UrlFetchApp.fetch(feedUrl);
    var xml = response.getContentText();
    var document = XmlService.parse(xml);
    var root = document.getRootElement();
    var items = root.getChild("channel").getChildren("item");
    
    if (items.length === 0) return;
    
    var latestItem = items[0];
    var title = latestItem.getChildText("title");
    var link = latestItem.getChildText("link");
    
    // Memory Check to prevent duplicates
    var props = PropertiesService.getScriptProperties();
    var lastSeenUrl = props.getProperty("LAST_SEEN_URL");
    
    if (link === lastSeenUrl) return; 

    var payload = {
      "cardsV2": [{
        "cardId": "blogger-" + new Date().getTime(),
        "card": {
          "header": {
            "title": "🚀 New Story Published!",
            "subtitle": "Editorial Team",
            "imageUrl": "https://upload.wikimedia.org/wikipedia/commons/3/31/Blogger.svg",
            "imageType": "CIRCLE"
          },
          "sections": [{
            "widgets": [
              {
                "decoratedText": {
                  "topLabel": "Title",
                  "text": "<b>" + title + "</b>",
                  "startIcon": { "knownIcon": "DESCRIPTION" },
                  "wrapText": true
                }
              },
              {
                "buttonList": {
                  "buttons": [{
                    "text": "👀 Read Article",
                    "onClick": { "openLink": { "url": link } }
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
    
    props.setProperty("LAST_SEEN_URL", link);

  } catch (e) {
    Logger.log(e);
  }
}
