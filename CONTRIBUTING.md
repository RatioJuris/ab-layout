# 🤝 Contributing to AB Layout

Thank you for your interest in contributing to **AB Layout (Advocate Benefit Layout)**.

This project is built to simplify **legal document formatting in Microsoft Word**, and contributions from the community are highly valued.

---

## 📌 Before You Start

Please take a moment to:

* ⭐ Star the repository
* 📖 Read the [README](./README.md)
* 🔍 Check existing Issues / Pull Requests

Understanding the project helps you contribute effectively.

---

## 🚀 Ways to Contribute

You can contribute in multiple ways:

### 🏛 Add New Court Layout

* Add a new court format in:

  ```
  /layouts/layouts.json
  ```
* Ensure:

  * Accurate page size and margins **in points** (1 cm = 28.35 pt)
  * Clear naming
  * A `note` citing the official source (circular / rule number and date). Unsourced presets must be described as conventions, never as court requirements.
  * The file stays **valid JSON** (no comments) — `npm test` checks this.

---

### 🐛 Report Bugs

If you find a bug:

1. Go to **Issues**
2. Click **New Issue**
3. Provide:

   * Steps to reproduce
   * Expected behavior
   * Actual behavior

---

### 💡 Suggest Features

Have an idea?

* Open an Issue with tag: `enhancement`
* Clearly explain the use-case

---

### 🎨 Improve UI / UX

* Improve layout design (HTML/CSS)
* Enhance usability of task pane
* Optimize accessibility

---

### 🧾 Improve Documentation

* Fix typos
* Improve README clarity
* Add examples or screenshots

---

## 🛠️ Development Workflow

Follow this standard workflow:

```bash
# 1. Fork repository
# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/ab-layout.git

# 3. Create a branch
git checkout -b feature/your-feature-name

# 4. Make changes
# 5. Commit changes
git commit -m "Add: short description"

# 6. Push changes
git push origin feature/your-feature-name
```

Then:

* Open a **Pull Request (PR)**
* Describe what you changed and why

---

## 📏 Contribution Guidelines

Please follow:

* ✔ Keep changes **small and focused**
* ✔ Write **clear commit messages**
* ✔ Maintain **code readability**
* ✔ Follow existing structure and style

Avoid:

* ❌ Large unrelated changes
* ❌ Breaking existing functionality
* ❌ Hardcoded values without reason

---

## 🧪 Testing

Before submitting, run:

```bash
npm install
npm run check      # type check + unit tests
npm run test:ui    # task pane in Microsoft Edge with a simulated Word document
```

Then test in **Microsoft Word** (see [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) for sideloading) and verify:

* Check Document lists real findings and "Show" jumps to the paragraph
* Clean Document: preview, apply, "Text check passed", Restore
* Applying the same profile twice changes nothing the second time
* Kruti Dev conversion leaves English words untouched
* No UI breaks in Word for Windows **and** Word for the web

## 🧾 Rules that protect advocates' documents

* Never change document **text** in formatting code. Only the properties in `FormatChange` may be written.
* Never send document content anywhere, and never log it.
* Anything uncertain is **reported**, not guessed.
* New source files in `web/core`, `web/word` and `web/ui` use the `rj-pb-` prefix and the standard header (the attribution test enforces this).

---

## 💬 Communication

* Be respectful and constructive
* Ask questions if unsure
* Discussions are encouraged

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the **GNU General Public License v3.0 or later**, together with the additional terms in [NOTICE](./NOTICE) (GPLv3 section 7: preservation of the attribution "Developed by PrajnaBytes International Private Limited and RatioJuris", marking of modified versions, and no rights to the project names). Do not remove or alter file headers or the task pane attribution.

---

## 🙌 Acknowledgement

Every contributor helps make this project better.

Thank you for contributing to **AB Layout** ⚖️

---

**Developed by:** PrajnaBytes International Private Limited and RatioJuris
**Maintained by:** Bee Isrg Rajan — 🔗 https://github.com/isrgrajan
