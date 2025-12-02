export default {
  async fetch(request, env, ctx) {
    // 1. Only allow POST requests (sending data)
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const json = await request.json();
      
      // 2. Get the message text from Planka
      const text = json.text || "Update from Planka";

      // 3. Set Defaults (PinoySeoul Blue)
      let themeColor = "#0038A8"; 
      let iconUrl = "https://cdn-icons-png.flaticon.com/512/1087/1087815.png"; 
      let title = "Project Update";
      
      // 4. "Vibe Check" - Change color/icon based on the action
      if (text.match(/to Done|to Published/i)) {
        themeColor = "#1E8E3E"; // Green for Wins
        iconUrl = "https://cdn-icons-png.flaticon.com/512/190/190411.png";
        title = "✅ TASK COMPLETED";
      } 
      else if (text.match(/created card/i)) {
        themeColor = "#FDB913"; // Yellow for New Work
        iconUrl = "https://cdn-icons-png.flaticon.com/512/4202/4202611.png";
        title = "✨ NEW TASK";
      }
      else if (text.match(/commented/i)) {
        title = "💬 NEW COMMENT";
      }

      // 5. Build the Google Chat Card
      const payload = {
        "cardsV2": [{
          "cardId": "planka-" + Date.now(),
          "card": {
            "header": {
              "title": title,
              "subtitle": "PinoySeoul Projects",
              "imageUrl": env.BRAND_LOGO, 
              "imageType": "CIRCLE"
            },
            "sections": [{
              "widgets": [{
                  "decoratedText": {
                    "startIcon": { "iconUrl": iconUrl },
                    "text": text, 
                    "wrapText": true
                  }
              }]
            }]
          }
        }]
      };

      // 6. CHECK FOR THE "PHONE NUMBER" (Webhook URL)
      // This looks for the variable you saved in Cloudflare Settings
      if (!env.GOOGLE_CHAT_WEBHOOK) {
        return new Response("Error: GOOGLE_CHAT_WEBHOOK is missing in Settings > Variables", { status: 500 });
      }

      // 7. Send to Google Chat
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
