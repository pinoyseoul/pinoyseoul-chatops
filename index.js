// =================================================================
// ⚙️ CONFIGURATION: THE SWITCHBOARD
// =================================================================

// 1. DEFAULT WEBHOOK (Fallback)
const DEFAULT_WEBHOOK = "https://chat.googleapis.com/v1/spaces/AAQAotoa0bE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ek0KkABCAIOiYGHYu8xv8FwB6AvoK3IYDyaCPGyFGu8";

// 2. BOARD ROUTING (Map Boards -> Rooms)
const BOARD_ROUTES = {
  // CORE TEAM
  "General Inquiries":            "https://chat.googleapis.com/v1/spaces/AAQAotoa0bE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ek0KkABCAIOiYGHYu8xv8FwB6AvoK3IYDyaCPGyFGu8",
  "Brand & Creator Partnerships": "https://chat.googleapis.com/v1/spaces/AAQA2YS7Gg4/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=449Xne6i1EZfMaeRI8dkPmPztQhMKMbJ2CqCdBWXlRA",
  "Academy & Internships":        "https://chat.googleapis.com/v1/spaces/AAQAyDn7xAs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=ZuV_QhFzHRiRaWtifrLv-Rxio-0JNwxkF50o0lWDaYI",

  // DEV TEAM
  "Server Maintainance":          "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=N1YnRio1T-7kIFxZ8IouOuCPmtGSTiTyJe-xUGG-OcQ",
  "App Development":              "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=N1YnRio1T-7kIFxZ8IouOuCPmtGSTiTyJe-xUGG-OcQ",
  "Partner Management":           "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=N1YnRio1T-7kIFxZ8IouOuCPmtGSTiTyJe-xUGG-OcQ",

  // INTERNS
  "Publishing Team":              "https://chat.googleapis.com/v1/spaces/AAAAaORpFVc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=_3eiMLnXu4HvNrARMfQ8l27kla4fMKpCfpjZRBzHxC8",
  "Broadcast Team":               "https://chat.googleapis.com/v1/spaces/AAAAaORpFVc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=_3eiMLnXu4HvNrARMfQ8l27kla4fMKpCfpjZRBzHxC8",
  "Outreach Team":                "https://chat.googleapis.com/v1/spaces/AAAAaORpFVc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=_3eiMLnXu4HvNrARMfQ8l27kla4fMKpCfpjZRBzHxC8"
};

// 3. BRANDING
const BRAND_LOGO = "https://planka.app/cms-content/1/uploads/site/sitelogomenue.png";

// =================================================================
// 🚀 WORKER LOGIC
// =================================================================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    try {
      const json = await request.json();
      // Apprise sends 'message', Planka Raw sends 'text'
      const rawSentence = json.message || json.text || "Unknown Data";

      // --- 1. PARSE & FILTER ---
      const data = parsePlankaGeneric(rawSentence);

      // If the parser returned null, it means it was NOISE (Trash/Backlog move)
      if (!data) {
        return new Response("Ignored: Noise Filter", { status: 200 });
      }

      // --- 2. ROUTING ---
      let targetWebhook = DEFAULT_WEBHOOK;
      const detectedBoard = data.boardName ? data.boardName.trim() : "";
      
      if (detectedBoard && BOARD_ROUTES[detectedBoard]) {
        targetWebhook = BOARD_ROUTES[detectedBoard];
      }

      // --- 3. CONSTRUCT CARD WITH THREADING ---
      const payload = {
        // THREADING ENABLED: Group by Card ID
        "thread": { 
          "threadKey": data.threadKey 
        },
        "cardsV2": [{
          "cardId": "ps-planka-" + Date.now(),
          "card": {
            "header": {
              "title": data.headerTitle,
              "subtitle": data.boardName || "Project Update",
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
      // 🚨 THREADING FIX: Google requires this specific URL parameter to allow replies
      const webhookUrlWithThreading = targetWebhook + "&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD";

      await fetch(webhookUrlWithThreading, {
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
// 🌐 THE UNIVERSAL TRANSLATION ENGINE
// Converts boring logs into Universal Project Updates
// ============================================================
function parsePlankaGeneric(text) {
  let headerTitle = "Project Activity";
  let widgets = [];
  let threadKey = "general-update"; // Default key if card ID not found
  
  // --- REGEX PATTERNS (Markdown Support) ---
  const moveMatch = text.match(/^(.*?) moved \[(.*?)\]\((.*?)\) from \*\*(.*?)\*\* to \*\*(.*?)\*\* on (.*?)$/);
  const createMatch = text.match(/^(.*?) created \[(.*?)\]\((.*?)\)(?: in \*\*(.*?)\*\*)? on (.*?)$/);
  const commentMatch = text.match(/^(.*?) left a new comment to \[(.*?)\]\((.*?)\) on (.*?):\s*\n\n(.*?)$/s);

  // --- LOGIC HANDLERS ---

  if (moveMatch) {
    const user = moveMatch[1];
    const cardName = moveMatch[2];
    const cardUrl = moveMatch[3];
    const fromList = moveMatch[4];
    const toList = moveMatch[5];
    const boardName = moveMatch[6];
    
    // Extract Card ID for Threading (last part of URL)
    threadKey = extractCardId(cardUrl);

    // 🛑 FILTER: BLOCK NOISE
    if (toList.match(/Trash/i)) return null;
    if (toList.match(/Pitch|Backlog|Planning|Scouting|Search/i)) return null;

    // ✅ ALLOW: VICTORY
    if (toList.match(/Done|Published|Complete|Live/i)) {
      headerTitle = "✅ TASK COMPLETED";
      widgets.push(
        {
          "decoratedText": {
            "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/190/190411.png" }, // Checkmark
            "topLabel": "COMPLETED BY " + user.toUpperCase(),
            "text": "<b>" + cardName + "</b>",
            "bottomLabel": "Board: " + boardName,
            "wrapText": true,
            "button": { "text": "Open Card", "onClick": { "openLink": { "url": cardUrl } } }
          }
        }
      );
    } 
    // ✅ ALLOW: MOMENTUM
    else if (toList.match(/Doing|Drafting|Progress|Writing/i)) {
      headerTitle = "▶️ WORK IN PROGRESS";
      widgets.push(
        {
          "decoratedText": {
            "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/324/324126.png" }, // Play Button
            "topLabel": "ACTIVE WORK BY " + user.toUpperCase(),
            "text": "Started working on: <b>" + cardName + "</b>",
            "bottomLabel": "Moved to: " + toList,
            "wrapText": true,
            "button": { "text": "Open Card", "onClick": { "openLink": { "url": cardUrl } } }
          }
        }
      );
    }
    // ✅ ALLOW: GENERIC FORWARD MOVE
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
            "button": { "text": "Open Card", "onClick": { "openLink": { "url": cardUrl } } }
          }
        }
      );
    }
    return { headerTitle, widgets, boardName, threadKey };
  } 
  
  else if (createMatch) {
    const user = createMatch[1];
    const cardName = createMatch[2];
    const cardUrl = createMatch[3];
    const listName = createMatch[4] || "Backlog";
    const boardName = createMatch[5];
    
    threadKey = extractCardId(cardUrl);
    
    headerTitle = "✨ NEW CARD CREATED";
    
    widgets.push(
      {
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/4202/4202611.png" }, // Sparkle
          "topLabel": "ADDED BY " + user.toUpperCase(),
          "text": "New Task: <b>" + cardName + "</b>",
          "bottomLabel": "List: " + listName,
          "wrapText": true,
          "button": { "text": "View Task", "onClick": { "openLink": { "url": cardUrl } } }
        }
      }
    );
    return { headerTitle, widgets, boardName, threadKey };
  }
  
  else if (commentMatch) {
    const user = commentMatch[1];
    const cardName = commentMatch[2];
    const cardUrl = commentMatch[3];
    const boardName = commentMatch[4];
    let commentContent = commentMatch[5];

    threadKey = extractCardId(cardUrl);
    commentContent = commentContent.replace(/^\*|\*$/g, ''); 

    // 🛑 FILTER: IGNORE SHORT COMMENTS
    if (commentContent.length < 4) return null;

    headerTitle = "💬 NEW COMMENT";

    widgets.push(
      {
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/1380/1380338.png" }, // Chat Bubble
          "topLabel": "COMMENT FROM " + user.toUpperCase(),
          "text": "<b>" + cardName + "</b>",
          "bottomLabel": "\"" + commentContent + "\"",
          "wrapText": true,
          "button": { "text": "Reply", "onClick": { "openLink": { "url": cardUrl } } }
        }
      }
    );
    return { headerTitle, widgets, boardName, threadKey };
  }
  
  // FALLBACK
  else {
    headerTitle = "📋 TEAM ACTIVITY";
    widgets.push({
      "textParagraph": { "text": text }
    });
    return { headerTitle, widgets, boardName: null, threadKey: "misc-" + Date.now() };
  }
}

// Helper to extract the unique Card ID from the URL
// Example: https://projects.pinoyseoul.com/cards/1656800328600781977 -> 1656800328600781977
function extractCardId(url) {
  if (!url) return "unknown-thread";
  const parts = url.split('/');
  return parts[parts.length - 1]; // Returns the last part (the ID)
}
