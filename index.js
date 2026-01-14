// =================================================================
// ⚙️ CONFIGURATION: THE SWITCHBOARD
// =================================================================

// 1. DEFAULT WEBHOOK (Fallback)
const DEFAULT_WEBHOOK = "https://chat.googleapis.com/v1/spaces/AAQAotoa0bE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ib3WWOCF8u_Eqi3_pEy7cN3vIUzbmzGhDsbXCdFgw1I";

// 2. OPPA LOGGING BRIDGE
const OPPA_BRIDGE_URL = "https://script.google.com/macros/s/AKfycbyODe5GoLoLIF9XaqbQBMGs4UKvh6k0vfnNhaUvsvBma3vADNfwoSf5DDrhSSkcenwT0w/exec"; 

// 3. BOARD ROUTING (Map Boards -> Rooms)
const BOARD_ROUTES = {
  // TEAM
  "General Inquiries":            "https://chat.googleapis.com/v1/spaces/AAQAotoa0bE/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=Ib3WWOCF8u_Eqi3_pEy7cN3vIUzbmzGhDsbXCdFgw1I",
  "Brand & Creator Partnerships": "https://chat.googleapis.com/v1/spaces/AAQA2YS7Gg4/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=YRoKvHbUMjg5o3kdJpPEidJvyUx6tx-tRUe6ri945qc",
  "Academy & Internships":        "https://chat.googleapis.com/v1/spaces/AAQAyDn7xAs/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=5heGPJCdttd3N9bJsKP0ix_df605vVi3nXRUXLzYY4k",

  // DEV
  "Server Maintainance":          "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=uGPE8lrgkiR7HqkwEUbCbHjR1ekltLC9Z6jtVSb6EtE",
  "App Development":              "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=uGPE8lrgkiR7HqkwEUbCbHjR1ekltLC9Z6jtVSb6EtE",
  "Partner Management":           "https://chat.googleapis.com/v1/spaces/AAQAWX5NV6s/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=uGPE8lrgkiR7HqkwEUbCbHjR1ekltLC9Z6jtVSb6EtE",

  // ADMIN
  "Notebook":           "https://chat.googleapis.com/v1/spaces/AAQAaj6OQiU/messages?key=AIzaSyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI&token=dsiUEstakIkYYiYu7K7I_60-DDTao8Zn7-8HKgQpurA",

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
      if (OPPA_BRIDGE_URL && OPPA_BRIDGE_URL.startsWith("http")) {
        const logPromise = fetch(OPPA_BRIDGE_URL, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "User-Agent": "Cloudflare-Worker/1.0"
          },
          body: JSON.stringify({
            source: "Planka",
            user: data.user || "Planka User",
            message: data.oppaMessage || "Activity on Board"
          })
        }).catch(err => { console.log("OPPA Log Failed:", err); });
        
        ctx.waitUntil(logPromise); 
      }

      // --- 4. CONSTRUCT PAYLOAD (CLEAN DESIGN) ---
      const payload = {
        "thread": { "threadKey": data.threadKey },
        "cardsV2": [{
          "cardId": "ps-planka-" + Date.now(),
          "card": {
            "header": data.cardHeader,
            "sections": data.cardSections
          }
        }]
      };

      // --- 5. SEND ---
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
// 🌐 THE UNIVERSAL TRANSLATION ENGINE (UI REDESIGNED)
// ============================================================
function parsePlankaGeneric(text) {
  let user = "Planka User";
  let oppaMessage = "";
  let threadKey = "general-update";
  let boardName = "";
  
  let cardHeader = {};
  let cardSections = [];
  
  // --- REGEX PATTERNS ---
  const moveMatch = text.match(/^(.*?) moved \[(.*?)\]\((.*?)\) from \*\*(.*?)\*\* to \*\*(.*?)\*\* on (.*?)$/);
  const createMatch = text.match(/^(.*?) created \[(.*?)\]\((.*?)\)(?: in \*\*(.*?)\*\*)? on (.*?)$/);
  const commentMatch = text.match(/^(.*?) left a new comment to \[(.*?)\]\((.*?)\) on (.*?):\s*\n\n(.*?)$/s);

  // Helper to remove backslashes
  const clean = (str) => (str ? str.replace(/\\/g, "") : str);

  // --- 1. CARD MOVED ---
  if (moveMatch) {
    user = clean(moveMatch[1]);
    const cardName = clean(moveMatch[2]);
    const cardUrl = moveMatch[3];
    const fromList = clean(moveMatch[4]);
    const toList = clean(moveMatch[5]);
    boardName = clean(moveMatch[6]);
    
    threadKey = extractCardId(cardUrl);
    oppaMessage = `📋 **Card Moved**: ${cardName} (To ${toList})`;

    // Noise Filter
    if (toList.match(/Trash/i)) return null;
    if (toList.match(/Pitch|Backlog|Planning|Scouting|Search|Ideas/i)) return null;

    // Header: Subject = Task Name, Sub = Who
    cardHeader = {
        "title": cardName, 
        "subtitle": `Moved by ${user}`,
        "imageUrl": BRAND_LOGO,
        "imageType": "CIRCLE"
    };

    // Body: The Context
    cardSections = [{
        "widgets": [{
            "decoratedText": {
                "startIcon": { "knownIcon": "FLIGHT_TAKEOFF" }, 
                "topLabel": "STATUS UPDATE",
                "text": `<b>${fromList} ➔ ${toList}</b>`,
                "button": { "text": "Open Card", "onClick": { "openLink": { "url": cardUrl } } }
            }
        }]
    }];
    
    return { boardName, threadKey, user, oppaMessage, cardHeader, cardSections };
  } 
  
  // --- 2. CARD CREATED ---
  else if (createMatch) {
    user = clean(createMatch[1]);
    const cardName = clean(createMatch[2]);
    const cardUrl = createMatch[3];
    const listName = clean(createMatch[4]) || "Backlog";
    boardName = clean(createMatch[5]); 
    
    threadKey = extractCardId(cardUrl);
    oppaMessage = `✨ **New Task**: ${cardName} (in ${listName})`;
    
    cardHeader = {
        "title": cardName, 
        "subtitle": `Created by ${user}`,
        "imageUrl": BRAND_LOGO,
        "imageType": "CIRCLE"
    };

    cardSections = [{
        "widgets": [{
            "decoratedText": {
                "startIcon": { "knownIcon": "STAR" },
                "topLabel": "NEW TASK",
                "text": `<b>In: ${listName}</b>`,
                "button": { "text": "View Task", "onClick": { "openLink": { "url": cardUrl } } }
            }
        }]
    }];
    
    return { boardName, threadKey, user, oppaMessage, cardHeader, cardSections };
  }
  
  // --- 3. NEW COMMENT ---
  else if (commentMatch) {
    user = clean(commentMatch[1]);
    const cardName = clean(commentMatch[2]);
    const cardUrl = commentMatch[3];
    boardName = clean(commentMatch[4]);
    let commentContent = clean(commentMatch[5]);

    threadKey = extractCardId(cardUrl);
    
    // OPPA Log: Truncated
    oppaMessage = `💬 **Comment**: "${commentContent.substring(0, 30)}..." on ${cardName}`;

    // Clean for display (remove wrapping asterisks)
    commentContent = commentContent.replace(/^\*|\*$/g, ''); 

    if (commentContent.length < 4) return null;

    cardHeader = {
        "title": cardName,
        "subtitle": `Comment by ${user}`,
        "imageUrl": "https://cdn-icons-png.flaticon.com/512/1380/1380338.png", // Chat Icon
        "imageType": "CIRCLE"
    };

    // Body: Use TextParagraph for better readability of the full comment content
    cardSections = [
        {
            "widgets": [
                { 
                    "textParagraph": { 
                        "text": commentContent 
                    } 
                }
            ]
        },
        {
            "widgets": [
                {
                    "buttonList": {
                        "buttons": [
                            { "text": "Reply", "onClick": { "openLink": { "url": cardUrl } } }
                        ]
                    }
                }
            ]
        }
    ];

    return { boardName, threadKey, user, oppaMessage, cardHeader, cardSections };
  }
  
  // --- 4. FALLBACK ---
  else {
    cardHeader = {
        "title": "Activity Update",
        "subtitle": "Planka Board",
        "imageUrl": BRAND_LOGO,
        "imageType": "CIRCLE"
    };
    cardSections = [{
        "widgets": [{ "textParagraph": { "text": text } }]
    }];

    return { 
        boardName: null, 
        threadKey: "misc-" + Date.now(), 
        user: "Unknown", 
        oppaMessage: "Activity Detected",
        cardHeader, 
        cardSections
    };
  }
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
