// =================================================================
// ⚙️ CONFIGURATION: THE SWITCHBOARD
// =================================================================

// 1. DEFAULT WEBHOOK (Fallback)
const DEFAULT_WEBHOOK = "https://chat.googleapis.com/v1/spaces/AAQAotoa0bE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ib3WWOCF8u_Eqi3_pEy7cN3vIUzbmzGhDsbXCdFgw1I";

// 🆕 2. OPPA LOGGING BRIDGE (The Google Apps Script Web App URL)
const OPPA_BRIDGE_URL = "https://script.google.com/macros/s/AKfycbyODe5GoLoLIF9XaqbQBMGs4UKvh6k0vfnNhaUvsvBma3vADNfwoSf5DDrhSSkcenwT0w/exec"; 

// 3. BOARD ROUTING (Map Boards -> Rooms)
const BOARD_ROUTES = {
  // CORE TEAM
  "General Inquiries":            "https://chat.googleapis.com/v1/spaces/AAQAotoa0bE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ib3WWOCF8u_Eqi3_pEy7cN3vIUzbmzGhDsbXCdFgw1I",
  "Brand & Creator Partnerships": "https://chat.googleapis.com/v1/spaces/AAQA2YS7Gg4/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=YRoKvHbUMjg5o3kdJpPEidJvyUx6tx-tRUe6ri945qc",
  "Academy & Internships":        "https://chat.googleapis.com/v1/spaces/AAQAyDn7xAs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=5heGPJCdttd3N9bJsKP0ix_df605vVi3nXRUXLzYY4k",

  // DEV TEAM
  "Server Maintainance":          "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=uGPE8lrgkiR7HqkwEUbCbHjR1ekltLC9Z6jtVSb6EtE",
  "App Development":              "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=uGPE8lrgkiR7HqkwEUbCbHjR1ekltLC9Z6jtVSb6EtE",
  "Partner Management":           "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=uGPE8lrgkiR7HqkwEUbCbHjR1ekltLC9Z6jtVSb6EtE",

  // OTHERS
  "Other Stuff":           "https://chat.googleapis.com/v1/spaces/AAQAaj6OQiU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=dsiUEstakIkYYiYu7K7I_60-DDTao8Zn7-8HKgQpurA",

  // INTERNS
  "Publishing Team":              "https://chat.googleapis.com/v1/spaces/AAAAaORpFVc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=N8UVaRvy1i5EY-Dgo5F4ck1oRa4KzghMEXIfcDz6FyU",
  "Broadcast Team":               "https://chat.googleapis.com/v1/spaces/AAAAaORpFVc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=N8UVaRvy1i5EY-Dgo5F4ck1oRa4KzghMEXIfcDz6FyU",
  "Outreach Team":                "https://chat.googleapis.com/v1/spaces/AAAAaORpFVc/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=N8UVaRvy1i5EY-Dgo5F4ck1oRa4KzghMEXIfcDz6FyU"
};

// 4. BRANDING
const BRAND_LOGO = "https://planka.app/cms-content/1/uploads/site/sitelogomenue.png";

// =================================================================
// 🚀 WORKER LOGIC
// =================================================================
export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

    try {
      const json = await request.json();
      const rawSentence = json.message || json.text || "Unknown Data";

      // --- 1. PARSE & FILTER ---
      const data = parsePlankaGeneric(rawSentence);

      if (!data) {
        return new Response("Ignored: Noise Filter", { status: 200 });
      }

      // --- 2. ROUTING ---
      let targetWebhook = DEFAULT_WEBHOOK;
      const detectedBoard = data.boardName ? data.boardName.trim() : "";
      
      if (detectedBoard && BOARD_ROUTES[detectedBoard]) {
        targetWebhook = BOARD_ROUTES[detectedBoard];
      }

      // --- 3. OPPA LOGGING (FIRE AND FORGET) ---
      if (OPPA_BRIDGE_URL && !OPPA_BRIDGE_URL.includes("YOUR_GAS_BRIDGE")) {
        // We do not await this, so it doesn't slow down the chat response
        const logPromise = fetch(OPPA_BRIDGE_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "Planka",
            user: data.user || "Planka User",
            message: data.oppaMessage || "Activity on Board"
          })
        }).catch(err => console.log("OPPA Log Failed", err));
        
        ctx.waitUntil(logPromise); // Cloudflare specific: Keep worker alive for async task
      }

      // --- 4. SMART THREADING LOGIC ---
      let cardStructure = {};
      let threadKey = data.threadKey; 

      if (data.isVictory) {
        cardStructure = {
          "header": {
            "title": data.headerTitle,
            "subtitle": "Task Completed",
            "imageUrl": BRAND_LOGO,
            "imageType": "CIRCLE"
          },
          "sections": [{ "widgets": data.widgets }]
        };
      } 
      else if (data.isCreation) {
        cardStructure = {
          "header": {
            "title": data.headerTitle,
            "subtitle": data.boardName || "New Initiative",
            "imageUrl": BRAND_LOGO,
            "imageType": "CIRCLE"
          },
          "sections": [{ "widgets": data.widgets }]
        };
      } 
      else {
        data.widgets.unshift({
            "textParagraph": { "text": "<b>" + data.headerTitle + "</b>" }
        });
        cardStructure = {
          "sections": [{ "widgets": data.widgets }]
        };
      }

      // --- 5. CONSTRUCT PAYLOAD ---
      const payload = {
        "thread": { "threadKey": threadKey },
        "cardsV2": [{
          "cardId": "ps-planka-" + Date.now(),
          "card": cardStructure
        }]
      };

      // --- 6. SEND ---
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
// ============================================================
function parsePlankaGeneric(text) {
  let headerTitle = "Project Activity";
  let widgets = [];
  let threadKey = "general-update";
  
  let isVictory = false;
  let isCreation = false;
  
  // For OPPA Logging
  let user = "Planka User";
  let oppaMessage = "";
  
  // --- REGEX PATTERNS ---
  const moveMatch = text.match(/^(.*?) moved \[(.*?)\]\((.*?)\) from \*\*(.*?)\*\* to \*\*(.*?)\*\* on (.*?)$/);
  const createMatch = text.match(/^(.*?) created \[(.*?)\]\((.*?)\)(?: in \*\*(.*?)\*\*)? on (.*?)$/);
  const commentMatch = text.match(/^(.*?) left a new comment to \[(.*?)\]\((.*?)\) on (.*?):\s*\n\n(.*?)$/s);

  // --- LOGIC ---

  if (moveMatch) {
    user = moveMatch[1];
    const cardName = moveMatch[2];
    const cardUrl = moveMatch[3];
    const fromList = moveMatch[4];
    const toList = moveMatch[5];
    const boardName = moveMatch[6];
    
    threadKey = extractCardId(cardUrl);
    oppaMessage = `📋 **Card Moved**: ${cardName} (To ${toList})`;

    // 🛑 FILTER NOISE
    if (toList.match(/Trash/i)) return null;
    if (toList.match(/Pitch|Backlog|Planning|Scouting|Search|Ideas/i)) return null;

    // ✅ VICTORY (Completed)
    if (toList.match(/Done|Published|Complete|Deployed|Stable|Finished|Completed|Live/i)) {
      isVictory = true;
      headerTitle = getRandomTitle("VICTORY"); 
      widgets.push({
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/190/190411.png" },
          "topLabel": "COMPLETED BY " + user.toUpperCase(),
          "text": "<b>" + cardName + "</b>",
          "bottomLabel": "Board: " + boardName,
          "wrapText": true,
          "button": { "text": "Open Card", "onClick": { "openLink": { "url": cardUrl } } }
        }
      });
    } 
    // ✅ MOMENTUM (In Progress)
    else if (toList.match(/Doing|Drafting|Progress|Writing/i)) {
      headerTitle = getRandomTitle("MOMENTUM"); 
      widgets.push({
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/324/324126.png" },
          "topLabel": user.toUpperCase() + " IS WORKING ON",
          "text": "<b>" + cardName + "</b>",
          "bottomLabel": "Moved to: " + toList,
          "wrapText": true,
          "button": { "text": "Open Card", "onClick": { "openLink": { "url": cardUrl } } }
        }
      });
    }
    // ✅ GENERIC (Status Change)
    else {
      headerTitle = getRandomTitle("UPDATE"); 
      widgets.push({
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/8138/8138518.png" },
          "text": "<b>" + cardName + "</b>",
          "bottomLabel": fromList + " ➔ " + toList,
          "wrapText": true,
          "button": { "text": "Open Card", "onClick": { "openLink": { "url": cardUrl } } }
        }
      });
    }
    return { headerTitle, widgets, boardName, threadKey, isVictory, isCreation, user, oppaMessage };
  } 
  
  else if (createMatch) {
    user = createMatch[1];
    const cardName = createMatch[2];
    const cardUrl = createMatch[3];
    const listName = createMatch[4] || "Backlog";
    const boardName = createMatch[5]; 
    
    threadKey = extractCardId(cardUrl);
    isCreation = true;
    oppaMessage = `✨ **New Task**: ${cardName} (in ${listName})`;
    
    headerTitle = getRandomTitle("CREATION"); 
    
    widgets.push({
      "decoratedText": {
        "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/4202/4202611.png" },
        "topLabel": "ADDED BY " + user.toUpperCase(),
        "text": "New Task: <b>" + cardName + "</b>",
        "bottomLabel": "List: " + listName,
        "wrapText": true,
        "button": { "text": "View Task", "onClick": { "openLink": { "url": cardUrl } } }
      }
    });
    return { headerTitle, widgets, boardName, threadKey, isVictory, isCreation, user, oppaMessage };
  }
  
  else if (commentMatch) {
    user = commentMatch[1];
    const cardName = commentMatch[2];
    const cardUrl = commentMatch[3];
    const boardName = commentMatch[4];
    let commentContent = commentMatch[5];

    threadKey = extractCardId(cardUrl);
    commentContent = commentContent.replace(/^\*|\*$/g, ''); 
    oppaMessage = `💬 **Comment**: "${commentContent.substring(0, 30)}..." on ${cardName}`;

    if (commentContent.length < 4) return null;

    headerTitle = getRandomTitle("COMMENT"); 

    widgets.push({
      "decoratedText": {
        "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/1380/1380338.png" },
        "topLabel": "COMMENT FROM " + user.toUpperCase(),
        "text": "<b>" + cardName + "</b>",
        "bottomLabel": "\"" + commentContent + "\"",
        "wrapText": true,
        "button": { "text": "Reply", "onClick": { "openLink": { "url": cardUrl } } }
      }
    });
    return { headerTitle, widgets, boardName, threadKey, isVictory, isCreation, user, oppaMessage };
  }
  
  // FALLBACK
  else {
    headerTitle = "📋 TEAM ACTIVITY";
    widgets.push({
      "textParagraph": { "text": text }
    });
    return { headerTitle, widgets, boardName: null, threadKey: "misc-" + Date.now(), isVictory, isCreation, user: "Unknown", oppaMessage: "Activity Detected" };
  }
}

// ============================================================
// 🎲 THE VOCABULARY ENGINE (Randomizer)
// ============================================================
function getRandomTitle(type) {
  const vocab = {
    "CREATION": [ "✨ NEW INITIATIVE", "💡 FRESH IDEA", "📥 ADDED TO PIPELINE", "🌱 NEW TASK CREATED", "🎬 ACTION ITEM ADDED" ],
    "VICTORY": [ "🚀 READY FOR BROADCAST", "✅ MISSION ACCOMPLISHED", "🏆 WIN SECURED", "🚢 SHIPPED IT", "🏁 CROSSING THE FINISH LINE" ],
    "MOMENTUM": [ "▶️ WORK IN PROGRESS", "🔨 UNDER CONSTRUCTION", "🍳 COOKING NOW", "🏃‍♂️ IN MOTION", "🎥 PRODUCTION STARTED" ],
    "COMMENT": [ "💬 TEAM CHATTER", "🗣️ FEEDBACK LOOP", "📝 NOTE ADDED", "📨 INCOMING MESSAGE", "💭 THOUGHT SHARED" ],
    "UPDATE": [ "🔄 STATUS UPDATE", "📋 PROJECT LOG", "👣 NEXT STEP TAKEN", "⚙️ CARD MOVED" ]
  };
  const list = vocab[type] || vocab["UPDATE"];
  return list[Math.floor(Math.random() * list.length)];
}

function extractCardId(url) {
  if (!url) return "unknown-thread-" + Date.now();
  try {
    const cleanUrl = url.split('?')[0].replace(/\/$/, ""); 
    const parts = cleanUrl.split('/');
    const id = parts[parts.length - 1];
    if (!id || id.trim() === "") return "unknown-thread-" + Date.now();
    return id;
  } catch (e) {
    return "error-thread-" + Date.now();
  }
}
