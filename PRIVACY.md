# Privacy Policy

**Effective Date:** 15 March 2026
**Data Controller:** Raouf ([raoof.r12@gmail.com](mailto:raoof.r12@gmail.com))

GitSwitch is an open-source Electron-based Git client. This policy explains what data the application handles, where it is processed, and what rights you have.

---

## 1. Data Collected

| Category | Details | Storage |
|---|---|---|
| **SSH private keys** | User-generated or imported keys for Git authentication | Encrypted at rest using the OS keychain; stored in `~/.gitswitch/keys/` |
| **API tokens** | Tokens for GitHub, GitLab, and AI providers (Google Gemini, OpenAI, Anthropic) | Encrypted at rest using the OS keychain |
| **Repository paths** | Local file-system paths added by the user | Stored locally in `electron-store` |
| **Git diffs and file names** | Diff content and file names from your repositories | Sent to a cloud AI provider **only** when the user explicitly enables a cloud provider **and** grants consent; never cached |
| **Settings preferences** | Theme, default branch, reduced motion, and other UI preferences | Stored locally in `electron-store` |
| **Audit log** | Log of sensitive operations (key creation, token usage, AI requests) | Stored locally; automatically rotated at 5 MB |

## 2. Where Data Is Processed

- **Locally by default.** All data remains on your machine unless you explicitly opt in to a cloud feature.
- **Cloud AI providers (Google Gemini API, OpenAI API, Anthropic API)** — Git diffs and file names are sent to the selected provider **only** when the user explicitly enables a cloud AI provider **and** grants consent via the in-app consent dialog.
- **GitHub API / GitLab API** — Repository metadata and pull-request content are sent to the respective platform **only** when the user initiates a PR creation using their own API token.

## 3. Data Retention

- **SSH keys and API tokens** are stored until the user explicitly deletes them via Settings.
- **Git diffs** are never cached or persisted. They exist in memory only for the duration of the AI request.
- **Audit logs** are stored locally and automatically rotated when the log file reaches 5 MB.
- **Settings and preferences** are stored until the user resets or uninstalls the application.

## 4. Third-Party Processors

The following third parties may process your data, but **only** when you explicitly opt in:

| Provider | Data Shared | When |
|---|---|---|
| **Google** (Gemini API) | Git diffs, file names | User selects Gemini as AI provider and grants consent |
| **OpenAI** | Git diffs, file names | User selects OpenAI as AI provider and grants consent |
| **Anthropic** | Git diffs, file names | User selects Anthropic as AI provider and grants consent |
| **GitHub** | Repository metadata, PR content | User creates a PR via GitHub integration |
| **GitLab** | Repository metadata, MR content | User creates an MR via GitLab integration |

Each provider is subject to their own privacy policy. GitSwitch does not control how these providers handle data once it has been transmitted.

## 5. No Telemetry

GitSwitch does **not** collect analytics, tracking data, or usage statistics of any kind. There are no telemetry endpoints, no crash reporters, and no background data collection.

## 6. User Rights

You have full control over your data:

- **View** all stored keys, tokens, and preferences via Settings.
- **Export** your data via Settings > Advanced.
- **Delete all data** via Settings > Advanced.
- **Delete individual keys** via Settings > Accounts.
- **Delete individual tokens** via Settings > Integrations.
- **Revoke AI consent** at any time via Settings > AI, which immediately stops all cloud AI data transmission.

## 7. Australian Privacy Principles (APP) Compliance

GitSwitch is designed in compliance with the Australian Privacy Principles:

- **APP 1 — Open and transparent management:** This policy is publicly available and clearly describes all data practices.
- **APP 3 — Collection of solicited personal information:** Data is collected only with explicit user consent and only where reasonably necessary for the application's functionality.
- **APP 5 — Notification of collection:** Users are informed at the point of collection (e.g., consent dialogs for AI features).
- **APP 6 — Use or disclosure:** Data is used only for the purpose for which it was collected.
- **APP 8 — Cross-border disclosure:** Cloud AI providers may process data outside Australia. Users are informed before opting in.
- **APP 11 — Security:** Keys and tokens are encrypted at rest using OS-level keychain services.
- **APP 12 — Access:** Users can view and export all stored data.
- **APP 13 — Correction and deletion:** Users can delete any stored data at any time.

## 8. GDPR Compliance

For users in the European Economic Area:

- **Lawful basis for cloud AI processing:** Consent (Art. 6(1)(a) GDPR). You may withdraw consent at any time via Settings > AI.
- **Lawful basis for local operations:** Legitimate interest (Art. 6(1)(f) GDPR) in providing the core functionality of the application.
- **Data subject rights:** Right of access, rectification, erasure, restriction, portability, and objection are all supported via the Settings interface.
- **Data minimisation:** Only the minimum data necessary is transmitted to third-party providers (e.g., only the relevant diff for an AI commit-message request).
- **No automated decision-making:** GitSwitch does not make automated decisions that produce legal or similarly significant effects.

## 9. Changes to This Policy

Any changes to this policy will be reflected in this document with an updated effective date. Significant changes will be noted in the application's release notes.

## 10. Contact

For questions, concerns, or data requests, contact:

**Raouf**
Email: [raoof.r12@gmail.com](mailto:raoof.r12@gmail.com)
