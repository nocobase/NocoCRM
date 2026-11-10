<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="images/nococrm-logo-dark.svg">
    <img src="images/nococrm-logo.svg" width="240" alt="NocoCRM">
  </picture>
</h1>

<p align="center"><strong>Pour vos commerciaux, une équipe d’agents 24/7.</strong></p>

<p align="center">CRM open source pour la vente B2B · Construit sur NocoBase</p>

<p align="center">
  <a href="../LICENSE.txt"><img src="https://img.shields.io/badge/license-NocoBase-blue" alt="NocoBase License"></a>
  <a href="https://github.com/nocobase/NocoCRM/tags"><img src="https://img.shields.io/github/v/tag/nocobase/NocoCRM?label=version&sort=semver&include_prereleases" alt="version"></a>
  <a href="https://www.nocobase.com"><img src="https://img.shields.io/badge/built%20on-NocoBase-1f6feb" alt="Built on NocoBase"></a>
</p>

<p align="center">
  <a href="https://solutions.nocobase.com/crm/"><strong>Essayer en ligne</strong></a> · <a href="https://www.nocobase.com/fr-FR/solution-crm/">Site web</a>
</p>

<p align="center">
  <a href="../README.MD">English</a> · <a href="README.zh-CN.md">简体中文</a> · <a href="README.zh-TW.md">繁體中文</a> · <a href="README.ja-JP.md">日本語</a> · <a href="README.ko-KR.md">한국어</a> · <a href="README.de-DE.md">Deutsch</a> · <strong>Français</strong> · <a href="README.es-ES.md">Español</a> · <a href="README.pt-BR.md">Português</a> · <a href="README.ru-RU.md">Русский</a> · <a href="README.id-ID.md">Bahasa Indonesia</a> · <a href="README.vi-VN.md">Tiếng Việt</a>
</p>

NocoCRM est un CRM open source pour la vente B2B, construit sur [NocoBase](https://www.nocobase.com). Il intègre 6 agents commerciaux et se connecte à votre messagerie et à WhatsApp : ils relancent leads et opportunités, répondent aux messages sans attendre et examinent les validations avec vous. Les agents proposent, vous décidez.

https://github.com/user-attachments/assets/8d637ac6-4bed-4286-83d6-27856ae10bce

## Fonctionnalités

- **Relances automatiques.** Un nouveau lead ou une nouvelle affaire, la réponse d’un client, une tâche terminée, la revue du matin : un agent lit tout le contexte et dépose la prochaine étape dans votre boîte de réception, avec sa recommandation, son degré de confiance et ses raisons. Les fiches ne changent que lorsque vous acceptez.
- **Tous les canaux sur une même chronologie.** Chacun connecte sa propre boîte mail (Gmail, Microsoft 365 ou tout serveur IMAP/SMTP), l’entreprise son numéro WhatsApp Business. Les messages sont rattachés aux leads et aux contacts, et les réponses rédigées partent de votre propre compte.
- **6 agents commerciaux.** Sales Expert pour échanger depuis n’importe quelle page, plus cinq agents qui travaillent en arrière-plan : le suivi des prospects, le suivi des opportunités, l’analyse des approbations, la préparation des tâches et la veille sur les entreprises, chacun avec ses déclencheurs, ses compétences et l’historique de ses exécutions.
- **Saisie intelligente.** Collez un e-mail, une conversation ou une carte de visite : l’IA le compare aux fiches existantes et en fait des leads ou une opportunité, que vous vérifiez avant d’enregistrer. Pour une nouvelle entreprise, le nom suffit : l’IA complète sa fiche à partir du web. Les leads en double sont repérés et fusionnés.
- **Signaux d’entreprise.** Chaque matin, la veille sur les entreprises cherche sur le web l’actualité des entreprises qui ont des opportunités en cours ou que vous suivez : levées de fonds, recrutements, changements de dirigeants, évolutions de l’activité et risques, avec leurs sources. Un signal important relance le suivi de leurs opportunités en cours.
- **Les validations ne bloquent plus.** L’agent de validation confronte une remise ou une condition à vos règles et aux décisions passées, puis rédige une recommandation et un commentaire pour la personne qui valide.
- **Tout le cycle de vente.** Leads, entreprises, contacts, opportunités, tâches, validations et rapports, avec un tableau des opportunités, un calendrier des tâches, une recherche dans toutes les fiches (⌘K / Ctrl+K) et des rôles appliqués fiche par fiche par le serveur.
- **Personnalisable.** Écrivez vos prix, vos plafonds de remise et votre rythme de relance en texte simple dans les consignes métier, et chaque agent les suit ; la méthode de chaque agent est une compétence modifiable. Le code source est ouvert : un agent de code peut changer le reste.
- **Auto-hébergé.** Vos données restent sur vos serveurs, avec les modèles de votre choix : DeepSeek, OpenAI, Claude, Gemini, Qwen et d’autres.

## Démarrage rapide

Envie de jeter un œil ? [Essayer en ligne](https://solutions.nocobase.com/crm/) : vous êtes connecté à un compte de démonstration, et toutes les données sont fictives.

### 1. Installer

**Avec un agent de code.** Le plus simple. Ouvrez Claude Code, Codex ou Cursor dans le dossier qui doit accueillir NocoCRM, et donnez-lui ceci :

```text
Installe NocoCRM depuis https://github.com/nocobase/NocoCRM et démarre-le, en suivant le AGENTS.md et le README du dépôt.
```

**À la main.** Il vous faut Node.js 24 ou plus récent et pnpm 11 (`corepack enable`). Les données vont par défaut dans un fichier SQLite ; PostgreSQL et MySQL fonctionnent aussi.

```bash
git clone https://github.com/nocobase/NocoCRM.git
cd NocoCRM
pnpm install
pnpm nocobase config init --dialect sqlite
pnpm dev
```

### 2. Se connecter

Ouvrez l’adresse `Local:` qu’affiche `pnpm dev`, en général `http://127.0.0.1:13000/main/`, et connectez-vous avec `nocobase` et le mot de passe `admin123`.

### 3. Importer les données de démonstration

Le bandeau en haut de page les propose, ou ouvrez **Paramètres → Données de démonstration**. Elles apportent une équipe commerciale avec ses clients, affaires, tâches, validations, e-mails et conversations ; supprimez-les au même endroit quand vous démarrez pour de bon.

### 4. Configurer un modèle d’IA

Ajoutez un service de modèle avec sa clé dans **Équipe d’Agents → Modèles**, par exemple DeepSeek, OpenAI, Claude, Gemini ou Qwen. L’assistant et les agents en ont besoin ; tout le reste fonctionne sans.

Le [guide](guide.md) (en anglais) couvre les étapes suivantes, les comptes de démonstration, les rôles, la configuration (IA, e-mail, WhatsApp, bases de données), le déploiement et le développement.

Pour la mise en production, voir [Déploiement](guide.md#deployment) ; pour PostgreSQL et MySQL, voir [Configuration](guide.md#configuration).

## Licence

NocoCRM est construit sur NocoBase et publié sous la [licence NocoBase](../LICENSE.txt).
