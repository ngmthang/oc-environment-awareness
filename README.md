# 🌊 Orange County Environmental Awareness

A local learning hub that turns government and public-agency reports into clear takeaways about Orange County's environment. Built as an educational web project for Orange Coast College.

---

# Link: https://ocenv.onrender.com/

## 📖 About

This site makes Orange County's environmental data accessible and understandable. It combines real data from OC public agencies with course concepts from environmental science lectures — covering water quality, flood control, climate change, biodiversity, and more.

Visitors can explore what's improving, what's at risk, and the specific actions residents, schools, and local agencies can take to make a difference.

---

## ✨ Features

- **Tabbed navigation** — Browse six content sections via a sticky scrollable nav bar
- **Visitor login** — Optional name and OCC Student ID registration (guests welcome)
- **Visit dashboard** — Live stats tracking total visits, guests, and OCC students
- **Interactive quiz** — 10 randomized questions drawn from a bank of 30+, with score-based encouragement messages
- **Image gallery** — Clickable fullscreen lightbox for all section images
- **QR code** — Auto-generated QR on the login page so users can open it on their phone
- **Sources section** — All 17 cited sources linked directly to their PDFs
- **Scroll progress bar** — Visual indicator as you scroll through the page
- **Back to top button** — Appears after scrolling down
- **Fully responsive** — Works on desktop, tablet, and mobile

---

## 📂 Project Structure

```
oc-environment-awareness/
│
├── index.html / login.html     # Login / entry page
├── main.html                   # Main content page
│
├── css/
│   └── styles.css              # All styles (ocean/teal theme)
│
├── js/
│   ├── login.js                # Login form logic + QR code
│   └── main.js                 # Tabs, quiz, dashboard, lightbox, animations
│
├── images/                     # Section and hero images
├── videos/                     # OC Public Works infrastructure video
└── pdfs/                       # Source documents (OC agency reports + lecture PDFs)
```

---

## 🗂️ Content Sections

| Section | Topics Covered |
|---|---|
| **Snapshot** | OC monitoring overview, water facts, biodiversity, climate |
| **Ocean & Water** | Beach monitoring, GWRS recycled water, groundwater |
| **Flood & Beach** | Channel capacity, sand replenishment, debris removal |
| **Climate & Health** | Sea level rise, air quality, heat, mitigation & adaptation |
| **Nature & Culture** | Biodiversity, forests, fire ecology, wildlife corridors |
| **Actions & Orgs** | The 5 R's, water conservation, local OC agencies |
| **Quiz** | 10 randomized questions with instant scoring and feedback |
| **Sources** | 17 cited sources — OC agency reports and course lecture PDFs |

---

## 🛠️ Tech Stack

- **HTML5** — Semantic, accessible markup
- **CSS3** — Custom properties, CSS Grid, responsive design, no frameworks
- **Vanilla JavaScript** — No dependencies; tabs, quiz, lightbox, dashboard all hand-rolled
- **Spring Boot** (backend) — Handles visitor registration, session, quiz submission, and dashboard API
- **QuickChart.io** — QR code generation for the login page

---

## 🚀 Running Locally

This project requires a Spring Boot backend for full functionality (login, dashboard, quiz scoring). For frontend-only preview, open `login.html` or `main.html` directly in a browser.

To run with the backend:

```bash
# Clone the repo
git clone https://github.com/NgMThang/oc-environment-awareness.git
cd oc-environment-awareness

# Run the Spring Boot backend (requires Java 17+)
./mvnw spring-boot:run

# Open in browser
http://localhost:8080
```

---

## 📊 Data Sources

All content is cited from publicly available sources:

- Orange County Ocean, Harbor and Bay Water Quality Report (2023–2024)
- OCWD Groundwater Replenishment System Annual Report (2024)
- Orange County Public Works State of the Department (2022–2024)
- Indicators of Climate Change in California (2022)
- Orange Coast College Environmental Science lecture PDFs (Chapters 7–17)

---

## 🎓 Academic Context

Built for an Environmental Science course at **Orange Coast College**, Costa Mesa, CA. Content reflects real OC agency data paired with course concepts on water systems, biodiversity, climate change, air quality, forest management, agriculture, and waste management.

---

## 📄 License

Educational use only. All source documents belong to their respective public agencies and institutions.
