# PinoySeoul ChatOps Suite 🇵🇭🇰🇷

> **The "Celebration Engine"**: A Google Apps Script toolkit that turns operational output into team victories.

- **Author:** Nash Ang
- **Portfolio:** https://subtleazn.github.io
- **Acknowledgments:** This project was built to support the [PinoySeoul Media Enterprise](https://pinoyseoul.com).


## 📖 Overview

This repository contains a suite of automation scripts designed to power the **Digital Headquarters** of PinoySeoul Media Enterprise. 

Unlike traditional "Monitoring Systems" that spam teams with server logs and error reports, this system is designed as a **Celebration Engine**. It is strictly filtered to notify the volunteer-based team only when "Wins" occur—shipping code, publishing articles, signing contracts, or receiving revenue.

It serves as the bridge between our disparate tools and **Google Chat**, keeping our remote team aligned and motivated.

## 🛠️ The Tech Stack

* **Platform:** Google Apps Script (Serverless JavaScript)
* **Interface:** Google Chat Webhooks (Card V2 Layouts)
* **Triggers:** Time-driven triggers, Webhooks (doPost), RSS Feeds, and Gmail Filters.

## 🧩 Modules

| Module | Source System | Trigger Type | Function |
| :--- | :--- | :--- | :--- |
| **Growth** | Google Forms | Event (On Submit) | Celebrates new student enrollments and brand leads. |
| **Content** | Blogger | Time (RSS Polling) | Detects new articles and pushes them to the team. |
| **Socials** | Postiz | Webhook | Formats social media posts with "On Air" status indicators. |
| **Business** | DocuSeal | Webhook | Celebrates signed MOUs and partnership agreements. |
| **Revenue** | InvoiceShelf | Gmail Spy | Detects payment confirmation emails from the `noreply` sender. |
| **Radio** | AzuraCast | Webhook + Schedule | A "DJ-style" bot that announces the 12:00 NN station status. |
| **DevOps** | GitHub | Webhook/RSS | Tracks code shipping, PR merges, and open-source contributions. |

## 🚀 Deployment

1.  Create a new **Google Apps Script** project for the desired module.
2.  Copy the code from the `src/` folder.
3.  Replace `GOOGLE_CHAT_WEBHOOK_URL` with your Space's webhook.
4.  **For Webhooks:** Deploy as a Web App (Execute as Me, Access: Anyone).
5.  **For Polling:** Set a Time-Driven Trigger (e.g., Every Hour).

## 💡 Philosophy

> *"We are volunteer-based. We don't force work; we glorify output. When a volunteer sees their work celebrated instantly in the team chat, it creates a dopamine loop that drives motivation."* — Nash Ang

---

© 2025 PinoySeoul Media Enterprise. Open Source for the Community.
