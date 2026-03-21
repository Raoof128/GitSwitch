# Privacy Policy

**Effective Date:** 15 March 2026
**Data Controller:** Raouf ([raoof.r12@gmail.com](mailto:raoof.r12@gmail.com))

GitSwitch is an open-source, security-first Electron desktop Git client. Privacy by design is a core principle: all data remains on your machine unless you explicitly opt in to a cloud feature. This policy explains what data the application handles, where it is processed, and what rights you have.

---

## 1. Data Collected

| Category | Details | Storage |
| --- | --- | --- |
| **SSH private keys** | User-generated or imported keys for Git authentication | Encrypted at rest using the OS keychain (`safeStorage`); stored in `~/.gitswitch/keys/` |
| **API tokens** | Tokens for GitHub, GitLab, and AI providers (Google Gemini, OpenAI, Anthropic) | Encrypted at rest using the OS keychain (`safeStorage`) |
| **Repository paths** | Local filesystem paths added by the user | Stored locally in `electron-store` |
| **Git diffs and file names** | Diff content and file names from your repositories | Sent to a cloud AI provider **only** when the user explicitly enables a cloud provider **and** grants consent via the in-app consent dialog; never cached or persisted |
| **Settings and preferences** | Theme, default branch, reduced motion, and other UI preferences | Stored locally in `electron-store` |
| **Audit log** | Structured log of sensitive operations (key creation, token usage, AI requests, push, pull, PR creation) | Stored locally in JSONL format; automatically rotated at 5 MB |

## 2. Where Data Is Processed

- **Locally by default.** All data remains on your machine unless you explicitly opt in to a cloud feature. GitSwitch is fully functional without any network connectivity.
- **Cloud AI providers (Google Gemini API, OpenAI API, Anthropic API)** --- Git diffs and file names are sent to the selected provider **only** when the user explicitly enables a cloud AI provider **and** grants consent via the in-app consent dialog. Diffs exist in memory only for the duration of the request.
- **GitHub API / GitLab API** --- Repository metadata and pull-request or merge-request content are sent to the respective platform **only** when the user initiates a PR/MR creation using their own API token.
- **Local LLM endpoints** --- When a local AI provider is configured, data is sent to the user-specified local endpoint. This traffic never leaves the user's machine or local network. Endpoint URLs are validated to prevent SSRF.

## 3. Data Retention

| Data | Retention | Deletion |
| --- | --- | --- |
| SSH keys and API tokens | Stored until explicitly deleted by the user | Settings > Accounts / Settings > Integrations |
| Git diffs | Never cached or persisted; in-memory only for the duration of the AI request | Automatic |
| Audit logs | Stored locally; automatically rotated at 5 MB | Settings > Advanced (Delete All Data) |
| Settings and preferences | Stored until the user resets or uninstalls the application | Settings > Advanced (Delete All Data) |

## 4. Third-Party Processors

The following third parties may process your data, but **only** when you explicitly opt in:

| Provider | Data Shared | When |
| --- | --- | --- |
| **Google** (Gemini API) | Git diffs, file names | User selects Gemini as AI provider and grants consent |
| **OpenAI** | Git diffs, file names | User selects OpenAI as AI provider and grants consent |
| **Anthropic** | Git diffs, file names | User selects Anthropic as AI provider and grants consent |
| **GitHub** | Repository metadata, PR content | User creates a PR via the GitHub integration |
| **GitLab** | Repository metadata, MR content | User creates an MR via the GitLab integration |

Each provider is subject to their own privacy policy and terms of service. GitSwitch does not control how these providers handle data once it has been transmitted.

## 5. No Telemetry

GitSwitch does **not** collect analytics, tracking data, or usage statistics of any kind. There are no telemetry endpoints, no crash reporters, and no background data collection. This is a deliberate design decision, not an oversight.

## 6. User Rights

You have full control over your data at all times:

- **View** all stored keys, tokens, and preferences via Settings.
- **Export** your data as JSON via Settings > Advanced.
- **Delete all data** via Settings > Advanced, which removes all keys, tokens, settings, and audit log entries.
- **Delete individual keys** via Settings > Accounts.
- **Delete individual tokens** via Settings > Integrations.
- **Revoke AI consent** at any time via Settings > AI, which immediately and permanently stops all cloud AI data transmission until consent is re-granted.

## 7. Australian Privacy Principles (APP) Compliance

GitSwitch is designed in compliance with the Australian Privacy Principles under the *Privacy Act 1988* (Cth):

- **APP 1 --- Open and transparent management:** This policy is publicly available in the repository and clearly describes all data practices.
- **APP 3 --- Collection of solicited personal information:** Data is collected only with explicit user consent and only where reasonably necessary for the application's stated functionality.
- **APP 5 --- Notification of collection:** Users are informed at the point of collection (e.g., the consent dialog for cloud AI features, token entry screens).
- **APP 6 --- Use or disclosure:** Data is used only for the purpose for which it was collected. No secondary use occurs.
- **APP 8 --- Cross-border disclosure:** Cloud AI providers may process data outside Australia. Users are informed before opting in via the consent dialog.
- **APP 11 --- Security:** Keys and tokens are encrypted at rest using OS-level keychain services (`safeStorage`). The application enforces a sandboxed Electron architecture with context isolation.
- **APP 12 --- Access:** Users can view and export all stored data via the Settings interface.
- **APP 13 --- Correction and deletion:** Users can delete any stored data at any time via the Settings interface.

## 8. GDPR Compliance

For users in the European Economic Area:

- **Lawful basis for cloud AI processing:** Consent (Art. 6(1)(a) GDPR). You may withdraw consent at any time via Settings > AI. Withdrawal is immediate and does not affect the lawfulness of processing prior to withdrawal.
- **Lawful basis for local operations:** Legitimate interest (Art. 6(1)(f) GDPR) in providing the core functionality of the application.
- **Data subject rights:** Right of access, rectification, erasure, restriction, portability, and objection are all supported via the Settings interface.
- **Data minimisation:** Only the minimum data necessary is transmitted to third-party providers (e.g., only the relevant diff for an AI commit-message request, not the entire repository).
- **Storage limitation:** Data is retained only as long as it serves the stated purpose. Audit logs are automatically rotated. Users can delete all data at any time.
- **No automated decision-making:** GitSwitch does not make automated decisions that produce legal or similarly significant effects on individuals.

## 9. Changes to This Policy

Any changes to this policy will be reflected in this document with an updated effective date. Significant changes will be noted in the application's release notes and CHANGELOG.

## 10. Contact

For questions, concerns, or data subject requests, contact:

**Raouf**
Email: [raoof.r12@gmail.com](mailto:raoof.r12@gmail.com)

<!-- GAPS:
- Consider adding a "Data Flow Diagram" showing exactly which data moves where under each user action (local-only, cloud AI, GitHub/GitLab).
- Consider adding a "Cookie and Local Storage" section clarifying that GitSwitch does not use browser cookies (relevant for Electron transparency).
- Consider specifying data retention periods for audit logs beyond the 5 MB rotation (e.g., maximum age before automatic purge).
- Consider adding a "Children's Privacy" section (COPPA) if the user base may include minors.
- Consider adding California Consumer Privacy Act (CCPA) compliance notes if targeting US users.
-->
