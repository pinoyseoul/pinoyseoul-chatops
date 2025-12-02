/**
 * @fileoverview AzuraCast Webhook -> Google Chat (DJ Persona)
 * @author Nash Ang (PinoySeoul Media Enterprise)
 */

var WEBHOOK_URL = "YOUR_WEBHOOK_URL_HERE";
var TARGET_HOUR = 12; // 12 NN Check-in

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.getDataAsString());
    var stationData = data.now_playing || data; // Normalization
    var isLive = stationData.live.is_live || false;
    var isRequest = stationData.now_playing.is_request || false;
    
    // Time Logic
    var manilaTime = new Date(new Date().toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    var isLunch = (manilaTime.getHours() === TARGET_HOUR);
    var props = PropertiesService.getScriptProperties();
    var lastPost = props.getProperty("LAST_DAILY");
    var today = manilaTime.toDateString();

    // Filter: Only Allow Live, Requests, or 12NN Daily Check
    if (isLive || isRequest) {
       // Pass
    } else if (isLunch && lastPost !== today) {
       props.setProperty("LAST_DAILY", today);
    } else {
       return ContentService.createTextOutput("Skipped");
    }

    // Dynamic Text Generation
    var title = "PINOYSEOUL RADIO";
    var msg = "🕛 <b>It's 12 Noon!</b><br>Streaming the bridge between PH and KR.";
    
    if (isLive) {
      title = "🔴 LIVE ON AIR";
      msg = "🚨 <b>BREAKING:</b> DJ is live on the decks!";
    }

    var payload = {
      "cardsV2": [{
        "cardId": "radio-" + new Date().getTime(),
        "card": {
          "header": {
            "title": title,
            "subtitle": "Broadcast System",
            "imageUrl": "https://cdn-icons-png.flaticon.com/512/8208/8208626.png",
            "imageType": "CIRCLE"
          },
          "sections": [{
            "widgets": [{
              "textParagraph": { "text": msg }
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
