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
              "subtitle": "PinoySeoul Production Board",
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
// Converts boring logs into Media Production Updates
// ============================================================
function parsePlankaToPinoySeoul(text) {
  let headerTitle = "Production Log";
  let widgets = [];
  
  // --- REGEX PATTERNS (The Readers) ---
  
  // 1. MOVEMENT: "User moved card [Name] from [List A] to [List B]"
  const moveMatch = text.match(/^(.*?) moved card (.*?) from (.*?) to (.*?)$/);
  
  // 2. CREATION: "User created card [Name] in list [List]"
  // Note: Apprise often formats this as "User created card 'Name'"
  const createMatch = text.match(/^(.*?) created card (.*?)(?: in list (.*?))?$/);

  // 3. COMMENT: "User commented on card [Name]"
  const commentMatch = text.match(/^(.*?) commented on card (.*?)$/);

  // --- LOGIC HANDLERS ---

  if (moveMatch) {
    const user = moveMatch[1];
    const cardName = cleanName(moveMatch[2]);
    const fromList = moveMatch[3];
    const toList = moveMatch[4];

    // DETECTING VICTORY
    // If it moves to Done, Published, or Ready
    if (toList.match(/Done|Published|Complete|Live/i)) {
      headerTitle = "🚀 READY FOR BROADCAST";
      widgets.push(
        {
          "decoratedText": {
            "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/190/190411.png" }, // Checkmark
            "topLabel": "COMPLETED BY " + user.toUpperCase(),
            "text": "<b>" + cardName + "</b> is now LIVE/DONE.",
            "wrapText": true
          }
        }
      );
    } 
    // DETECTING "IN PROGRESS"
    else if (toList.match(/Doing|Progress|Writing/i)) {
      headerTitle = "🎥 IN PRODUCTION";
      widgets.push(
        {
          "decoratedText": {
            "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/3059/3059446.png" }, // Mic/Rec
            "topLabel": "ACTIVE WORK BY " + user.toUpperCase(),
            "text": "Started working on: <b>" + cardName + "</b>",
            "wrapText": true
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
            "text": "Moved <b>" + cardName + "</b> to <b>" + toList + "</b>",
            "wrapText": true
          }
        }
      );
    }
  } 
  else if (createMatch) {
    const user = createMatch[1];
    const cardName = cleanName(createMatch[2]);
    
    headerTitle = "🎬 NEW STORY PITCH";
    
    widgets.push(
      {
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/4202/4202611.png" }, // Sparkle
          "topLabel": "SUBMITTED BY " + user.toUpperCase(),
          "text": "Created new task: <b>" + cardName + "</b>",
          "wrapText": true
        }
      }
    );
  }
  else if (commentMatch) {
    const user = commentMatch[1];
    const cardName = cleanName(commentMatch[2]);

    headerTitle = "💬 EDITORIAL NOTE";

    widgets.push(
      {
        "decoratedText": {
          "startIcon": { "iconUrl": "https://cdn-icons-png.flaticon.com/512/1380/1380338.png" }, // Chat Bubble
          "topLabel": "FEEDBACK ON: " + cardName,
          "text": "<b>" + user + "</b> added a comment."
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
