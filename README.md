# 🌐 IPTrace - Firefox Browser Extension

A lightweight Firefox browser extension that tracks and displays IP address details in real time. Built using the WebExtensions API, this project demonstrates API integration and basic networking concepts in a simple and user-friendly way.

---

## 🎯 What It Does

🔍 Fetches your current IP address
🌍 Displays geolocation details (country, region, city)
📡 Shows ISP and network information
⚡ Provides instant results via the browser toolbar

---

## 📊 Features

* Real-time IP tracking
* One-click access through extension popup
* Clean and minimal UI
* Fast API-based data retrieval
* Uses multiple APIs for reliable data

---

## 📁 Project Structure

IPTrace/
│
├── manifest.json     ← Extension configuration (Firefox)
├── popup.html        ← Extension UI
├── style.css         ← Styling
├── script.js         ← Logic & API calls
└── README.md         ← Documentation

---

## 🛠️ Tech Stack

| Tool              | Purpose                     |
| ----------------- | --------------------------- |
| HTML              | Structure                   |
| CSS               | Design                      |
| JavaScript        | Functionality               |
| WebExtensions API | Browser extension framework |
| External APIs     | Fetch IP and location data  |

---

## ⚙️ How to Install (Firefox)

1. Download or clone the repository

git clone https://github.com/YOUR_USERNAME/IPTrace.git

2. Open Firefox

3. Navigate to:
   about:debugging#/runtime/this-firefox

4. Click **"Load Temporary Add-on"**

5. Select the `manifest.json` file

✅ Extension will be installed temporarily and visible in the toolbar

---

## ▶️ How to Use

1. Click the extension icon
2. View IP details instantly
3. Refresh if needed

---

## ⚠️ Note

* This extension runs as a **temporary add-on**
* It will be removed when Firefox is closed
* Permanent installation requires signing via Firefox Add-ons

---

## 📋 Sample Output

* IP Address: 192.xxx.xxx.xxx
* Location: India
* ISP: Example Network
* Region: Karnataka

---

## 🎯 Purpose

This project demonstrates how Firefox extensions can interact with external APIs to fetch and display real-time network information.

---

## 🧠 Skills Demonstrated

* Firefox extension development (WebExtensions API)
* API integration and data handling
* Basic networking concepts
* UI design and user interaction

---

## 🎯 Use Cases

* Learning browser extension development
* Understanding IP tracking basics
* Beginner cybersecurity portfolio project

---

## 👩‍💻 Author

Your Name

---

## 📄 License

This project is open source and available under the MIT License.
