# ⚖️ AB Layout (Advocate Benefit Layout)

![Platform](https://img.shields.io/badge/Platform-Microsoft%20Word%20Add--in-orange)
![Architecture](https://img.shields.io/badge/Engine-Ribbon%20Driven-blue)
![License](https://img.shields.io/badge/License-Apache%202.0-green)
![Status](https://img.shields.io/badge/Status-Production--Ready-brightgreen)

---

## ⟡ Overview

**AB Layout** is a structured **legal formatting engine** built as a Microsoft Word Office JS Add-in.

It converts unstructured drafts into **court-compliant documents instantly**, eliminating repetitive formatting and ensuring consistency across filings.

Designed for:

* Advocates
* Law students
* Legal professionals

---

## ⟡ Core System

AB Layout operates as a **ribbon-driven engine**, not just a taskpane utility.

```text
Ribbon Action → Layout Engine → Word API → Structured Output
```

---

## ⟡ Capabilities

* ⚡ One-click **court-compliant formatting**
* 🏛 Support for **High Court, District Court, Affidavits**
* 📄 Automatic **legal page structuring**
* 🔁 Safe **Undo / Revert system**
* 📑 Handles **large documents (100+ pages)**
* 🌐 **Dynamic layout updates (GitHub-powered)**
* 🔌 **Offline fallback support**
* 🧩 Fully **extensible architecture**

---

## ⟡ Live System

🌐 Access the hosted add-in:
👉 https://ratiojuris.github.io/ab-layout/

---

## ⟡ Installation

```text
1. Download manifest.xml
2. Open Microsoft Word
3. Insert → Add-ins → Upload My Add-in
4. Select manifest.xml
```

---

## ⟡ Usage Flow

```text
Ribbon → Select Layout → Apply → Undo (if required)
```

---

## ⟡ Project Structure

```bash
ab-layout/
├── manifest.xml          # Add-in definition
├── web/                  # UI + engine
├── layouts/              # Layout schema (JSON)
├── assets/               # Icons and resources
└── README.md
```

---

## ⟡ Contribution Protocol

```text
1. Modify /layouts/layouts.json
2. Add or update layout presets
3. Validate formatting integrity
4. Submit Pull Request
```

---

## ⟡ Privacy & Data Policy

AB Layout:

* ❌ Does NOT collect personal data
* ❌ Does NOT transmit document content
* ✅ Operates locally within Microsoft Word

External dependency:

* Microsoft Office JS runtime

---

## ⟡ License

Licensed under the **Apache License 2.0**

---

## ⟡ Maintainer

Maintained as an independent system initiative

🔗 https://github.com/RatioJuris

---

## ⟡ Support

* ⭐ Star the repository
* 🍴 Fork and contribute
* 📢 Share with the legal community

---
