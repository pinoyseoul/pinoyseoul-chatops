// =================================================================
// ⚙️ CONFIGURATION: THE SWITCHBOARD
// =================================================================

// 1. DEFAULT WEBHOOK (Where to send if the board isn't listed below)
//    Use your main "General" or "Tech Support" room here.
const DEFAULT_WEBHOOK = "https://chat.googleapis.com/v1/spaces/AAQAotoa0bE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ek0KkABCAIOiYGHYu8xv8FwB6AvoK3IYDyaCPGyFGu8";

// 2. BOARD ROUTING (Map specific Planka Boards to specific Chat Rooms)
//    Format: "Exact Board Name": "Webhook URL"
//    Add as many lines as you need.
const BOARD_ROUTES = {
  // CORE TEAM BOARDS -> Core Team Room
  "General Inquiries": "https://chat.googleapis.com/v1/spaces/AAQAotoa0bE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ek0KkABCAIOiYGHYu8xv8FwB6AvoK3IYDyaCPGyFGu8",
  "Brand & Creator Partnerships": "https://chat.googleapis.com/v1/spaces/AAQAkDpGC70/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=UMbbAlGL-MuY-8i56elIILptG4KGvefOhng-P9cgzg4",
  "Academy & Internships":     "https://chat.googleapis.com/v1/spaces/AAQAyDn7xAs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=ZuV_QhFzHRiRaWtifrLv-Rxio-0JNwxkF50o0lWDaYI",

  // DEV TEAM BOARDS -> Dev Team Room
  "Server Maintainance":    "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=N1YnRio1T-7kIFxZ8IouOuCPmtGSTiTyJe-xUGG-OcQ",
  "App Development":     "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=N1YnRio1T-7kIFxZ8IouOuCPmtGSTiTyJe-xUGG-OcQ",
  "Partner Management":           "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=N1YnRio1T-7kIFxZ8IouOuCPmtGSTiTyJe-xUGG-OcQ",

  // INTERNS BOARDS -> Interns Hub
  "Publishing Team":   "https://chat.googleapis.com/v1/spaces/AAAAaORpFVc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=_3eiMLnXu4HvNrARMfQ8l27kla4fMKpCfpjZRBzHxC8",
  "Broadcast Team":   "https://chat.googleapis.com/v1/spaces/AAAAaORpFVc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=_3eiMLnXu4HvNrARMfQ8l27kla4fMKpCfpjZRBzHxC8",
  "Outreach Team":   "https://chat.googleapis.com/v1/spaces/AAAAaORpFVc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=_3eiMLnXu4HvNrARMfQ8l27kla4fMKpCfpjZRBzHxC8"
};

// 3. BRANDING
const BRAND_LOGO = "https://planka.app/cms-content/1/uploads/site/sitelogomenue.png";

// =================================================================
// 🚀 WORKER LOGIC
// =================================================================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const json = await request.json();
      
      // Get the message (Apprise uses 'message', Raw Planka uses 'text')
      const rawSentence = json.message || json.text || "Unknown Data";

      // --- 1. PARSE DATA ---
      // We extract the Board Name inside the parser now
      const data = parsePlankaToPinoySeoul(rawSentence);

      // --- 2. DETERMINE DESTINATION ---
      // Look up the board name in our config. If found, use that URL. If not, use Default.
      // We trim whitespace just in case.
      let targetWebhook = DEFAULT_WEBHOOK;
      const detectedBoard = data.boardName ? data.boardName.trim() : "";
      
      if (detectedBoard && BOARD_ROUTES[detectedBoard]) {
        targetWebhook = BOARD_ROUTES[detectedBoard];
      }

      // --- 3. CONSTRUCT CARD ---
      const payload = {
        "cardsV2": [{
          "cardId": "ps-planka-" + Date.now(),
          "card": {
            "header": {
              "title": data.headerTitle,
              "subtitle": data.boardName || "PinoySeoul Projects",
              "imageUrl": BRAND_LOGO,
              "imageType": "CIRCLE"
            },
            "sections": [{
              "widgets": data.widgets
            }]
          }
        }]
      };

      // --- 4. SEND ---
      await fetch(targetWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      return new Response("Success", { status: 200 });

    } catch (err) {
      return new Response("Error: " + err.message, { status: 400 });
    }
  }
};

// ============================================================
// 🇵🇭🇰🇷 THE TRANSLATION ENGINE
// Converts boring logs into Media Project Updates
// ============================================================
function parsePlankaToPinoySeoul(text) {
  let headerTitle = "Project Log";
  let boardName = null; // We try to capture this for routing
  let widgets = [];
  
  // --- REGEX PATTERNS ---
  // Markdown formatted patterns provided by Planka/Apprise
  
  // 1. MOVEMENT: "User moved [Card](URL) from **List A** to **List B** on Board Name"
  const moveMatch = text.match(/^(.*?) moved \[(.*?)\]\((.*?)\) from \*\*(.*?)\*\* to \*\*(.*?)\*\* on (.*?)$/);
  
  // 2. CREATION: "User created [Card](URL) in **List** on Board"
  const createMatch = text.match(/^(.*?) created \[(.*?)\]\((.*?)\) in \*\*(.*?)\*\* on (.*?)$/);

  // 3. COMMENT: "User left a new comment to [Card](URL) on Board:\n\n*Content*"
  const commentMatch = text.match(/^(.*?) left a new comment to \[(.*?)\]\((.*?)\) on (.*?):\s*\n\n(.*?)$/s);

  // --- LOGIC HANDLERS ---

  if (moveMatch) {
    const user = moveMatch[1];
    const cardName = moveMatch[2];
    const cardUrl = moveMatch[3];
    const fromList = moveMatch[4];
    const toList = moveMatch[5];
    boardName = moveMatch[6]; // Captured!

    // DETECTING VICTORY
    if (toList.match(/Done|Published|Complete|Live|Pitch \/ Backlog/i)) {
      headerTitle = "🚀 READY FOR BROADCAST";
      widgets.push(
        {
          "decoratedText": {
            "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/190/190411.png" }, // Checkmark
            "topLabel": "COMPLETED BY " + user.toUpperCase(),
            "text": "<b>" + cardName + "</b>",
            "bottomLabel": "Board: " + boardName,
            "wrapText": true,
            "button": {
                "text": "Open Card",
                "onClick": { "openLink": { "url": cardUrl } }
            }
          }
        }
      );
    } 
    // DETECTING "IN PROGRESS"
    else if (toList.match(/Doing|Progress|Writing|Drafting/i)) {
      headerTitle = "🎥 IN PRODUCTION";
      widgets.push(
        {
          "decoratedText": {
            "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/3059/3059446.png" }, // Mic/Rec
            "topLabel": "ACTIVE WORK BY " + user.toUpperCase(),
            "text": "Started working on: <b>" + cardName + "</b>",
            "bottomLabel": "Moved to: " + toList,
            "wrapText": true,
            "button": {
                "text": "Open Card",
                "onClick": { "openLink": { "url": cardUrl } }
            }
          }
        }
      );
    }
    // GENERIC MOVE
    else {
      headerTitle = "🔄 STATUS UPDATE";
      widgets.push(
        {
          "decoratedText": {
            "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/8138/8138518.png" }, // Recycle/Move
            "topLabel": user.toUpperCase() + " UPDATED STATUS",
            "text": "<b>" + cardName + "</b>",
            "bottomLabel": fromList + " ➔ " + toList,
            "wrapText": true,
            "button": {
                "text": "Open Card",
                "onClick": { "openLink": { "url": cardUrl } }
            }
          }
        }
      );
    }
  } 
  else if (createMatch) {
    const user = createMatch[1];
    const cardName = createMatch[2];
    const cardUrl = createMatch[3];
    const listName = createMatch[4];
    boardName = createMatch[5]; // Captured!
    
    headerTitle = "🎬 NEW STORY PITCH";
    
    widgets.push(
      {
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/4202/4202611.png" }, // Sparkle
          "topLabel": "SUBMITTED BY " + user.toUpperCase(),
          "text": "New Idea: <b>" + cardName + "</b>",
          "bottomLabel": "List: " + listName,
          "wrapText": true,
          "button": {
              "text": "View Pitch",
              "onClick": { "openLink": { "url": cardUrl } }
          }
        }
      }
    );
  }
  else if (commentMatch) {
    const user = commentMatch[1];
    const cardName = commentMatch[2];
    const cardUrl = commentMatch[3];
    boardName = commentMatch[4]; // Captured!
    let commentContent = commentMatch[5];

    commentContent = commentContent.replace(/^\*|\*$/g, ''); 

    headerTitle = "💬 EDITORIAL NOTE";

    widgets.push(
      {
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/1380/1380338.png" }, // Chat Bubble
          "topLabel": "FEEDBACK FROM " + user.toUpperCase(),
          "text": "<b>" + cardName + "</b>",
          "bottomLabel": "\"" + commentContent + "\"",
          "wrapText": true,
          "button": {
              "text": "Reply",
              "onClick": { "openLink": { "url": cardUrl } }
          }
        }
      }
    );
  }
  // FALLBACK
  else {
    headerTitle = "📋 TEAM ACTIVITY";
    widgets.push({
      "textParagraph": { "text": text }
    });
  }

  return { headerTitle, widgets, boardName };
}
