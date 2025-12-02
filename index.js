export default {
  async fetch(request, env, ctx) {
    // 1. Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const json = await request.json();
      
      // 🚨 CRITICAL FIX: Apprise uses 'message', Planka Raw uses 'text'.
      // We check both. If neither exists, we dump the whole JSON so you can see what happened.
      const rawSentence = json.message || json.text || "Unknown Data: " + JSON.stringify(json);

      // 2. PARSE & TRANSLATE (The "Media Vibe" Engine)
      const data = parsePlankaToPinoySeoul(rawSentence);

      // 3. CONSTRUCT THE CARD
      const payload = {
        "cardsV2": [{
          "cardId": "ps-planka-" + Date.now(),
          "card": {
            "header": {
              "title": data.headerTitle,
              "subtitle": "PinoySeoul Project Board",
              "imageUrl": env.BRAND_LOGO,
              "imageType": "CIRCLE"
            },
            "sections": [{
              "widgets": data.widgets
            }]
          }
        }]
      };

      // 4. SEND TO GOOGLE CHAT
      if (!env.GOOGLE_CHAT_WEBHOOK) {
        return new Response("Error: GOOGLE_CHAT_WEBHOOK variable is missing.", { status: 500 });
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
// 🇵🇭🇰🇷 THE TRANSLATION ENGINE
// Converts boring logs into Media Project Updates
// ============================================================
function parsePlankaToPinoySeoul(text) {
  let headerTitle = "Project Log";
  let widgets = [];
  
  // --- REGEX PATTERNS (The Readers) ---
  // Now tuned for Planka's Markdown format based on your latest samples:
  
  // 1. MOVEMENT: "User moved [Card Name](URL) from **List A** to **List B** on Board Name"
  const moveMatch = text.match(/^(.*?) moved \[(.*?)\]\((.*?)\) from \*\*(.*?)\*\* to \*\*(.*?)\*\* on (.*?)$/);
  
  // 2. CREATION: "User created [Card Name](URL) in **List** on Board"
  // Fixed: Removed 'card' keyword and ensured list capture is strict
  const createMatch = text.match(/^(.*?) created \[(.*?)\]\((.*?)\) in \*\*(.*?)\*\* on (.*?)$/);

  // 3. COMMENT: "User left a new comment to [Card Name](URL) on Board:\n\n*Content*"
  // Fixed: Matches "left a new comment to" and captures the content after the newline
  const commentMatch = text.match(/^(.*?) left a new comment to \[(.*?)\]\((.*?)\) on (.*?):\s*\n\n(.*?)$/s);

  // --- LOGIC HANDLERS ---

  if (moveMatch) {
    const user = moveMatch[1];
    const cardName = moveMatch[2];
    const cardUrl = moveMatch[3];
    const fromList = moveMatch[4];
    const toList = moveMatch[5];
    const boardName = moveMatch[6];

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
    const boardName = createMatch[5];
    
    headerTitle = "🎬 NEW STORY PITCH";
    
    widgets.push(
      {
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/4202/4202611.png" }, // Sparkle
          "topLabel": "SUBMITTED BY " + user.toUpperCase(),
          "text": "New Idea: <b>" + cardName + "</b>",
          "bottomLabel": "List: " + listName + " (" + boardName + ")",
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
    const boardName = commentMatch[4];
    let commentContent = commentMatch[5];

    // Clean up Markdown italics/bold if present in the comment
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
  // FALLBACK (If regex fails, just print the text nicely)
  else {
    headerTitle = "📋 TEAM ACTIVITY";
    widgets.push({
      "textParagraph": { "text": text }
    });
  }

  return { headerTitle, widgets };
}

// Helper to remove quotes if Planka adds them 'Like This'
function cleanName(str) {
  if (!str) return "Unknown Card";
  return str.replace(/^'|'$/g, '');
}
