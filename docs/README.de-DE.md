<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/nococrm-logo-dark.svg">
    <img src="images/nococrm-logo.svg" width="240" alt="NocoCRM">
  </picture>
</h1>

<p align="center"><strong>Ihr Vertrieb bekommt ein 24/7-Agenten-Team.</strong></p>

<p align="center">Open-Source-CRM für den B2B-Vertrieb · Gebaut auf NocoBase</p>

<p align="center">
  <a href="../LICENSE.txt"><img src="https://img.shields.io/badge/license-NocoBase-blue" alt="NocoBase License"></a>
  <a href="https://github.com/nocobase/NocoCRM/tags"><img src="https://img.shields.io/github/v/tag/nocobase/NocoCRM?label=version&sort=semver&include_prereleases" alt="version"></a>
  <a href="https://www.nocobase.com"><img src="https://img.shields.io/badge/built%20on-NocoBase-1f6feb" alt="Built on NocoBase"></a>
</p>

<p align="center">
  <a href="https://solutions.nocobase.com/crm/"><strong>Online testen</strong></a> · <a href="https://www.nocobase.com/de-DE/solution-crm/">Website</a>
</p>

<p align="center">
  <a href="../README.MD">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja-JP.md">日本語</a> · <a href="README.ko-KR.md">한국어</a> · <strong>Deutsch</strong> · <a href="README.fr-FR.md">Français</a> · <a href="README.es-ES.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.ru-RU.md">Русский</a> · <a href="README.id-ID.md">Bahasa Indonesia</a> · <a href="README.vi-VN.md">Tiếng Việt</a>
</p>

NocoCRM ist ein Open-Source-CRM für den B2B-Vertrieb, gebaut auf [NocoBase](https://www.nocobase.com). Es bringt 6 Vertriebs-Agenten mit und bindet Ihre E-Mail und WhatsApp ein: Die Agenten fassen bei Leads und Deals nach, beantworten Nachrichten sofort und prüfen Freigaben gemeinsam mit Ihnen. Agenten schlagen vor, Sie entscheiden.

https://github.com/user-attachments/assets/64f9cc69-f126-469d-9f81-bfb1116f2cca

## Funktionen

- **Automatisches Nachfassen.** Ein neuer Lead oder Deal, die Antwort eines Kunden, eine erledigte Aufgabe, der Check am Morgen: Ein Agent liest den ganzen Zusammenhang und legt den nächsten Schritt in Ihren Posteingang, mit Empfehlung, Sicherheit und Begründung. Datensätze ändern sich erst, wenn Sie annehmen.
- **Alle Kanäle auf einer Zeitleiste.** Jede Person verbindet ihr eigenes Postfach (Gmail, Microsoft 365 oder jeder IMAP/SMTP-Server), das Unternehmen seine WhatsApp-Business-Nummer. Nachrichten werden Leads und Kontakten zugeordnet, Antworten vorformuliert und von Ihrem eigenen Konto gesendet.
- **6 Vertriebs-Agenten.** Sales Expert für das Gespräch auf jeder Seite, dazu fünf, die im Hintergrund arbeiten: Lead nachfassen, Verkaufschance nachfassen, Genehmigungsprüfung, Aufgabenvorbereitung und Unternehmensrecherche, jeder mit seinen Auslösern, Skills und einer Übersicht seiner Läufe.
- **Intelligente Erfassung.** Fügen Sie eine E-Mail, einen Chat oder eine Visitenkarte ein: Die KI gleicht sie mit vorhandenen Datensätzen ab und macht daraus Leads oder eine Verkaufschance, die Sie prüfen und speichern. Bei einem neuen Unternehmen genügt der Name, die KI ergänzt die Angaben aus dem Web. Doppelte Leads werden gefunden und zusammengeführt.
- **Unternehmenssignale.** Jeden Morgen sucht die Unternehmensrecherche im Web nach Neuigkeiten zu den Unternehmen mit offenen Verkaufschancen oder auf Ihrer Beobachtungsliste: Finanzierungen, Neueinstellungen, Wechsel in der Führung, geschäftliche Schritte und Risiken, mit Quellen. Ein wichtiges Signal startet das Nachfassen ihrer offenen Verkaufschancen.
- **Freigaben stocken nicht mehr.** Der Freigabe-Agent prüft einen Rabatt oder eine Bedingung gegen Ihre Regeln und frühere Entscheidungen und formuliert eine Empfehlung und einen Kommentar für die genehmigende Person.
- **Der ganze Vertriebszyklus.** Leads, Unternehmen, Kontakte, Verkaufschancen, Aufgaben, Freigaben und Berichte, mit Pipeline-Board, Aufgabenkalender, Suche über alle Datensätze (⌘K / Strg+K) und Rollen, die der Server für jeden Datensatz durchsetzt.
- **Anpassbar.** Schreiben Sie Preise, Rabattgrenzen und Nachfassrhythmus als Geschäftsrichtlinien in Klartext, und jeder Agent hält sich daran; wie ein Agent vorgeht, ist ein Skill, den Sie bearbeiten können. Der Quellcode ist offen, den Rest ändert ein Coding-Agent.
- **Selbst gehostet.** Ihre Daten bleiben auf Ihren Servern, mit den Modellen Ihrer Wahl: DeepSeek, OpenAI, Claude, Gemini, Qwen und weitere.

## Schnellstart

Nur mal ansehen? [Online testen](https://solutions.nocobase.com/crm/): Sie sind mit einem Demokonto angemeldet, und alle Daten sind erfunden.

### 1. Installieren

**Mit einem Coding-Agenten.** Der einfachste Weg. Öffnen Sie Claude Code, Codex oder Cursor im Ordner, in den NocoCRM soll, und geben Sie ihm dies:

```text
Installiere NocoCRM von https://github.com/nocobase/NocoCRM und starte es; folge dabei der AGENTS.md und der README des Repositorys.
```

**Von Hand.** Sie brauchen Node.js 24 oder neuer und pnpm 11 (`corepack enable`). Die Daten liegen standardmäßig in einer SQLite-Datei; PostgreSQL und MySQL funktionieren ebenfalls.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Anmelden

Öffnen Sie die `Local:`-Adresse, die `pnpm dev` ausgibt, normalerweise `http://127.0.0.1:13000/main/`, und melden Sie sich als `nocobase` mit dem Passwort `admin123` an.

### 3. Demodaten importieren

Das Banner oben bietet sie an, oder öffnen Sie **Einstellungen → Demodaten**. Sie bringen ein Vertriebsteam mit Kunden, Deals, Aufgaben, Freigaben, E-Mails und Gesprächen mit; entfernen Sie sie dort, wenn Sie richtig loslegen.

### 4. Ein KI-Modell einrichten

Fügen Sie unter **Agent-Team → Modelle** einen Modelldienst mit seinem Schlüssel hinzu, etwa DeepSeek, OpenAI, Claude, Gemini oder Qwen. Der Assistent und die Agenten brauchen ihn; alles andere funktioniert ohne.

Der [Leitfaden](guide.md) (Englisch) beschreibt die nächsten Schritte, die Demokonten, Rollen, die Konfiguration (KI, E-Mail, WhatsApp, Datenbanken), das Deployment und die Entwicklung.

Für den Produktivbetrieb siehe [Deployment](guide.md#deployment); für PostgreSQL und MySQL siehe [Konfiguration](guide.md#configuration).

## Lizenz

NocoCRM ist auf NocoBase gebaut und unter der [NocoBase-Lizenz](../LICENSE.txt) veröffentlicht.
