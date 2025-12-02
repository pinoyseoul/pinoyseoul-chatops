export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const json = await request.json();
      const text = json.text || ""; // Planka's raw sentence

      // 1. PARSE THE SENTENCE
      // We break down the text to find "Who", "What", and "Where"
      const data = parsePlankaText(text);

      // 2. CONSTRUCT THE CARD
      const payload = {
        "cardsV2": [{
          "cardId": "planka-" + Date.now(),
          "card": {
            "header": {
              "title": data.headerTitle,
              "subtitle": "PinoySeoul Projects",
              "imageUrl": env.BRAND_LOGO,
              "imageType": "CIRCLE"
            },
            "sections": [{
              "widgets": data.widgets
            }]
          }
        }]
      };

      // 3. SEND TO GOOGLE CHAT
      if (!env.GOOGLE_CHAT_WEBHOOK) {
        return new Response("Error: Missing Webhook URL", { status: 500 });
      }

      await fetch(env.GOOGLE_CHAT_WEBHOOK, {
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
// 🧠 THE PARSER ENGINE
// This turns simple sentences into rich UI components
// ============================================================
function parsePlankaText(text) {
  let headerTitle = "Project Update";
  let widgets = [];
  
  // REGEX PATTERNS FOR PLANKA ACTIONS
  
  // A. MOVED CARD (The most complex one)
  // Format: "User moved card [Name] from [List A] to [List B]"
  const moveMatch = text.match(/^(.*?) moved card (.*?) from (.*?) to (.*?)$/);
  
  // B. CREATED CARD
  // Format: "User created card [Name] in list [List Name]"
  const createMatch = text.match(/^(.*?) created card (.*?) in list (.*?)$/);

  // C. COMMENTED
  // Format: "User commented on card [Name]"
  const commentMatch = text.match(/^(.*?) commented on card (.*?)$/);

  // --- LOGIC HANDLERS ---

  if (moveMatch) {
    const user = moveMatch[1];
    const cardName = moveMatch[2];
    const fromList = moveMatch[3];
    const toList = moveMatch[4];

    // Check if it's a "Victory" move
    const isDone = toList.match(/Done|Published|Complete/i);
    
    headerTitle = isDone ? "✅ TASK COMPLETED" : "🔄 STATUS UPDATE";
    const icon = isDone ? "https://cdn-icons-png.flaticon.com/512/190/190411.png" : "https://cdn-icons-png.flaticon.com/512/8138/8138518.png";
    const color = isDone ? "#1E8E3E" : "#0038A8"; // Green vs Blue

    widgets.push(
      // User & Action
      {
        "decoratedText": {
          "startIcon": { "iconUrl": icon },
          "topLabel": "ACTION BY " + user.toUpperCase(),
          "text": "Moved <b>" + cardName + "</b>",
          "wrapText": true
        }
      },
      // The Visual Move (From -> To)
      {
        "columns": {
          "columnItems": [
            {
              "widgets": [{
                "decoratedText": {
                  "topLabel": "FROM",
                  "text": fromList,
                  "startIcon": { "knownIcon": "BOOKMARK" }
                }
              }]
            },
            {
              "widgets": [{
                "decoratedText": {
                  "topLabel": "TO",
                  "text": "<b><font color=\"" + color + "\">" + toList + "</font></b>",
                  "startIcon": { "knownIcon": "STAR" }
                }
              }]
            }
          ]
        }
      }
    );
  } 
  else if (createMatch) {
    const user = createMatch[1];
    const cardName = createMatch[2];
    const listName = createMatch[3];

    headerTitle = "✨ NEW TASK CREATED";
    
    widgets.push(
      {
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/4202/4202611.png" },
          "topLabel": "CREATED BY " + user.toUpperCase(),
          "text": "<b>" + cardName + "</b>",
          "bottomLabel": "In List: " + listName
        }
      }
    );
  }
  else if (commentMatch) {
    const user = commentMatch[1];
    const cardName = commentMatch[2];

    headerTitle = "💬 NEW COMMENT";

    widgets.push(
      {
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/1380/1380338.png" },
          "topLabel": "ON CARD: " + cardName,
          "text": "<b>" + user + "</b> added a comment."
        }
      }
    );
  }
  // FALLBACK (For attachments, joins, etc.)
  else {
    headerTitle = "📋 PROJECT ACTIVITY";
    widgets.push({
      "textParagraph": { "text": text }
    });
  }

  return { headerTitle, widgets };
}
