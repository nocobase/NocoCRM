import fileUi from '../extensions/nocobase-file-component-ui/locales/de-DE.js';
import type { AppResource } from './en-US.js';
import { crmDeDE } from './crm/de-DE.js';
import settingsDeDE from './settings/de-DE.js';

// The pages in de-DE: the template's copy (./system/), the AI skills'
// display text and the CRM's own (./crm/de-DE.ts), with the same keys as
// ./en-US.ts. The template ships no de-DE, so its copy is translated
// here; a template upgrade that adds keys fails the type check until they
// are translated.
const deDE: AppResource = {
  ...fileUi,
  'auth.passwordResetSuccess':
    'Ihr Passwort wurde zurückgesetzt. Melden Sie sich mit Ihrem neuen Passwort an.',
  'auth.requestNewResetLink': 'Neuen Link zum Zurücksetzen anfordern',
  'auth.preparingSession': 'Ihre Sitzung wird vorbereitet…',
  'auth.connectionFailed': 'Verbindung nicht möglich',
  'auth.connectionFailedDescription':
    'Die Echtzeitverbindung konnte nicht hergestellt werden. Versuchen Sie es erneut, um die Anwendung zu öffnen, oder melden Sie sich ab.',
  'deviceApproval.title': 'Gerät autorisieren',
  'deviceApproval.description':
    'Eine Befehlszeile oder ein anderes Gerät möchte sich in Ihrem Namen anmelden. Genehmigen Sie dies nur, wenn Sie die Anmeldung selbst gestartet haben.',
  'deviceApproval.enterCode': 'Geben Sie den Code ein, den Ihr Gerät anzeigt.',
  'deviceApproval.codeLabel': 'Code',
  'deviceApproval.continue': 'Weiter',
  'deviceApproval.checking': 'Code wird geprüft…',
  'deviceApproval.confirm':
    'Prüfen Sie, ob dieser Code mit dem auf Ihrem Gerät angezeigten übereinstimmt.',
  'deviceApproval.client': 'Angefordert von {{client}}',
  'deviceApproval.approve': 'Genehmigen',
  'deviceApproval.approving': 'Wird genehmigt…',
  'deviceApproval.deny': 'Ablehnen',
  'deviceApproval.denying': 'Wird abgelehnt…',
  'deviceApproval.approved':
    'Gerät genehmigt. Kehren Sie zum Terminal zurück, um fortzufahren; Sie können diese Seite schließen.',
  'deviceApproval.denied':
    'Anfrage abgelehnt. Das Gerät wurde nicht angemeldet; Sie können diese Seite schließen.',
  'deviceApproval.expired':
    'Dieser Code ist abgelaufen. Starten Sie die Anmeldung auf Ihrem Gerät erneut.',
  'deviceApproval.invalid':
    'Dieser Code ist ungültig. Vergleichen Sie ihn mit Ihrem Gerät und versuchen Sie es erneut.',
  'deviceApproval.notYours':
    'Dieser Code wird bereits von einem anderen Konto genehmigt.',
  'deviceApproval.error': 'Etwas ist schiefgelaufen. Versuchen Sie es erneut.',
  'deviceApproval.retry': 'Erneut versuchen',
  'deviceApproval.otherCode': 'Anderen Code eingeben',
  'inbox.title': 'Posteingang',
  'inbox.description': 'Benachrichtigungen und Anfragen an Sie.',
  'inbox.views.all': 'Benachrichtigungen',
  'inbox.views.todo': 'KI-Vorschläge',
  'inbox.kinds.label': 'Typ',
  'inbox.kinds.all': 'Alle Typen',
  'inbox.kinds.decision': 'Entscheidungen',
  'inbox.kinds.info': 'Benachrichtigungen',
  'inbox.tabs.decision': 'Von mir zu entscheiden',
  'inbox.tabs.info': 'Benachrichtigungen',
  'inbox.clearFilter': 'Filter zurücksetzen',
  'inbox.noMatchDescription':
    'Setzen Sie den Filter zurück, um alle Typen zu sehen.',
  'inbox.readAll': 'Alle als gelesen markieren',
  'inbox.allRead': 'Alle als gelesen markiert.',
  'inbox.loading': 'Wird geladen',
  'inbox.loadFailed': 'Posteingang konnte nicht geladen werden',
  'inbox.loadFailedDescription':
    'Prüfen Sie Ihre Verbindung und versuchen Sie es erneut.',
  'inbox.retry': 'Erneut versuchen',
  'inbox.loadMore': 'Mehr laden',
  'inbox.emptyAll': 'Keine Einträge',
  'inbox.empty.todo': 'Nichts wartet auf Sie',
  'inbox.empty.decision': 'Keine Entscheidungen ausstehend',
  'inbox.empty.info': 'Keine Benachrichtigungen',
  'inbox.emptyDescription':
    'Benachrichtigungen und Anfragen an Sie erscheinen hier.',
  'inbox.unread': 'Ungelesen',
  'inbox.unreadCount': '{{count}} ungelesen',
  'inbox.pendingDecisions': '{{count}} ausstehend',
  'inbox.resolved': 'Erledigt',
  'inbox.outcomes.approved': 'Genehmigt',
  'inbox.outcomes.rejected': 'Abgelehnt',
  'inbox.outcomes.withdrawn': 'Zurückgezogen',
  'inbox.count': '×{{count}}',
  'inbox.actionsFor': 'Aktionen für {{title}}',
  'inbox.actions.read': 'Als gelesen markieren',
  'inbox.actions.unread': 'Als ungelesen markieren',
  'inbox.actions.delete': 'Löschen',
  'inbox.deleted': 'Gelöscht.',
  'inbox.requestFailed':
    'Die Anfrage ist fehlgeschlagen. Versuchen Sie es erneut.',
  'inbox.forbidden': 'Dazu sind Sie nicht berechtigt.',
  'inbox.nothingSelected': 'Wählen Sie einen Eintrag aus, um ihn anzuzeigen',
  'inbox.back': 'Zurück zur Liste',
  'inbox.open': 'Öffnen',
  'inbox.keyMove': 'Navigieren',
  'inbox.keyOpen': 'Öffnen',
  'inbox.cancel': 'Abbrechen',
  'inbox.request.approve': 'Genehmigen',
  'inbox.request.reject': 'Ablehnen',
  'inbox.request.commentPlaceholder': 'Schreiben Sie etwas…',
  'inbox.request.commentFor': '{{action}}: {{title}}',
  'inbox.request.quickSend': 'zum Senden',
  'inbox.request.newLine': 'für eine neue Zeile',
  'inboxButton.title': 'Posteingang',
  'inboxButton.pending': 'Posteingang, {{count}} ausstehend',
  'inboxButton.unread': 'Posteingang, {{count}} ungelesen',
  'inboxButton.pendingHint':
    '{{count}} warten auf Sie; die Zahl sinkt, sobald sie erledigt sind.',
  'inboxButton.unreadHint':
    '{{count}} ungelesen; die Zahl sinkt, während Sie lesen.',
  'auth.welcome': 'Willkommen zurück',
  'auth.loginDescription':
    'Melden Sie sich mit Benutzername oder E-Mail und Passwort an.',
  'auth.registerTitle': 'Konto erstellen',
  'auth.registerDescription': 'Erstellen Sie ein Konto, um loszulegen.',
  'auth.forgotTitle': 'Passwort vergessen',
  'auth.forgotDescription':
    'Geben Sie Ihre E-Mail-Adresse ein. Falls das Konto existiert, senden wir einen Link zum Zurücksetzen.',
  'auth.passwordResetUnavailable':
    'Das Zurücksetzen des Passworts durch Benutzer ist nicht aktiviert. Wenden Sie sich an einen Administrator, um Ihr Passwort zurückzusetzen.',
  'auth.capabilityLoadFailed':
    'Es konnte nicht geprüft werden, ob das Zurücksetzen des Passworts verfügbar ist.',
  'auth.retry': 'Erneut versuchen',
  'auth.loading': 'Wird geladen',
  'auth.resetDescription': 'Wählen Sie ein neues Passwort für Ihr Konto.',
  'auth.resetTitle': 'Passwort zurücksetzen',
  'auth.identifier': 'Benutzername oder E-Mail',
  'auth.password': 'Passwort',
  'auth.signIn': 'Anmelden',
  'auth.signingIn': 'Anmeldung läuft…',
  'auth.hidePassword': 'Passwort ausblenden',
  'auth.showPassword': 'Passwort anzeigen',
  'auth.forgotLink': 'Passwort vergessen?',
  'auth.noAccount': 'Noch kein Konto?',
  'auth.signUp': 'Registrieren',
  'auth.createAccount': 'Konto erstellen',
  'auth.creatingAccount': 'Konto wird erstellt…',
  'auth.name': 'Name',
  'auth.username': 'Benutzername',
  'auth.email': 'E-Mail',
  'auth.confirmPassword': 'Passwort bestätigen',
  'auth.existingAccount': 'Sie haben bereits ein Konto?',
  'auth.passwordMismatch': 'Die Passwörter stimmen nicht überein.',
  'auth.resetting': 'Wird zurückgesetzt…',
  'auth.newPassword': 'Neues Passwort',
  'auth.confirmNewPassword': 'Neues Passwort bestätigen',
  'auth.invalidResetLink':
    'Dieser Link zum Zurücksetzen des Passworts ist ungültig oder abgelaufen.',
  'auth.backToSignIn': 'Zurück zur Anmeldung',
  'auth.sendResetLink': 'Link zum Zurücksetzen senden',
  'auth.sending': 'Wird gesendet…',
  'auth.resetSent':
    'Falls das Konto existiert, wurde ein Link zum Zurücksetzen gesendet.',
  'auth.rememberPassword': 'Passwort wieder eingefallen?',
  'auth.methods': 'Anmeldemethoden',
  'auth.or': 'Oder weiter mit',
  'auth.continueWith': 'Weiter mit {provider}',
  'auth.about': 'Über diese Anwendung',
  'auth.platform': 'KI-native Anwendungsplattform',
  'auth.marketingTitleFirst': 'Lassen Sie KI frei bauen.',
  'auth.marketingTitleSecond': 'NocoBase macht es',
  'auth.marketingTitleThird': 'zuverlässig.',
  'auth.marketingDescription':
    'Geben Sie der KI ein flexibles Frontend-Framework, um jedes Erlebnis zu gestalten, während NocoBase die Daten, Berechtigungen und Governance darunter absichert.',
  'auth.frontend': 'KI-natives Frontend',
  'auth.frontendDescription':
    'Oberflächen frei auf einem flexiblen Framework gestalten.',
  'auth.foundation': 'NocoBase-Fundament',
  'auth.foundationDescription':
    'Zuverlässige Daten, Zugriffskontrolle und Governance.',
  'auth.marketingFooter': 'Freiheit oben. Verlässlichkeit unten.',
  'status.loading': 'Wird geladen',
  'status.loadingPage': 'Seite wird geladen',
  'status.denied': 'Zugriff verweigert',
  'status.pageFailed': 'Seite konnte nicht geladen werden',
  'status.retry': 'Erneut versuchen',
  'navigation.brandHome': 'NocoCRM-Startseite',
  'navigation.brandApps': 'NocoBase-Anwendungen',
  'routeOverlay.close': 'Schließen',
  'status.deniedDescription': 'Sie haben keine Berechtigung für {{label}}.',
  'status.routeFailedDescription':
    'Route {{label}} aus {{packageName}} konnte nicht geladen werden.',
  shell: {
    buildFreely: 'KI baut frei.',
    reliability: '<brand>NocoBase</brand> macht es zuverlässig.',
  },
  home: {
    platform: 'NocoBase · KI-native Anwendungsplattform',
    title: 'Beschreiben Sie es, und Ihr Agent baut es',
    description:
      'Diese Anwendung wird im Gespräch mit Ihrem Coding-Agent entwickelt. Beschreiben Sie in einfachen Worten, was das Geschäft braucht, und er schreibt die Seiten, Datenmodelle, APIs und Geschäftsprozesse in diesem Projekt.',
    steps: {
      describe: {
        title: 'Bedarf beschreiben',
        description:
          'Sagen Sie, wer es nutzt, welche Daten es speichert und was passieren soll.',
      },
      build: {
        title: 'Den Agent bauen lassen',
        description:
          'Er liest dieses Projekt und seine integrierten Funktionen und schreibt dann den Code.',
      },
      review: {
        title: 'Prüfen und verfeinern',
        description:
          'Laden Sie die Seite neu, um es auszuprobieren, und bitten Sie auf dieselbe Weise um Änderungen.',
      },
    },
    example: {
      title: 'Probieren Sie eine Anfrage wie diese',
      text: 'Erstellen Sie eine Anwendung für Bestellungen.\n\nEine Bestellung hat eine Nummer, einen Artikel, einen Antragsteller, einen Betrag und einen Genehmigungsstatus. Antragsteller erstellen Bestellungen und sehen nur ihre eigenen; Prüfer sehen alle offenen Bestellungen und genehmigen oder lehnen sie ab.\nBenachrichtigen Sie den Antragsteller nach einer Entscheidung im Posteingang, mit einem Link zur Bestellung.',
      hint: 'Fügen Sie sie in Claude Code, Codex, Cursor oder einen anderen Coding-Agent ein, der in diesem Projekt geöffnet ist.',
    },
    capabilitiesTitle: 'Integrierte Funktionen',
    capabilitiesDescription:
      'Ihr Agent nutzt diese direkt, statt sie von Grund auf neu zu bauen. Öffnen Sie eine davon, um einen Prompt zu erhalten, den Sie bearbeiten und kopieren können.',
    viewPrompts: 'Prompts anzeigen ({{count}})',
    prompt: {
      label: 'Prompt',
      hint: 'Passen Sie den Prompt vor dem Kopieren an Ihr Geschäft an. Änderungen gehen verloren, wenn der Dialog geschlossen wird.',
      copy: 'Kopieren',
      copiedShort: 'Kopiert',
      copied: 'Prompt kopiert',
      copyFailed:
        'Kopieren nicht möglich. Markieren Sie den Text und kopieren Sie ihn manuell.',
      reset: 'Standard wiederherstellen',
    },
    capabilities: {
      auth: {
        title: 'Authentifizierung',
        description:
          'Anmeldung, Registrierung, Zurücksetzen des Passworts und Single Sign-on des Unternehmens.',
        prompts: {
          disableSignUp: {
            label: 'Registrierung schließen',
            text: 'Diese Anwendung ist nur für Mitarbeitende des Unternehmens. Administratoren legen alle Konten an.\nDeaktivieren Sie die Selbstregistrierung und entfernen Sie den Registrierungslink von der Anmeldeseite.\nBestehende Mitarbeitende müssen sich weiterhin mit ihren Konten und Passwörtern anmelden können.\nBehalten Sie den Link „Passwort vergessen“ bei.',
          },
          companySso: {
            label: 'Unternehmens-SSO',
            text: 'Lassen Sie Mitarbeitende sich per OIDC über die Identitätsplattform unseres Unternehmens anmelden.\n\nBehalten Sie die Anmeldung mit Konto und Passwort bei und fügen Sie eine Schaltfläche „Unternehmenskonto“ hinzu.\nDie Schaltfläche öffnet die Identitätsplattform des Unternehmens. Nach erfolgreicher Anmeldung geht es zurück zur Startseite der Anwendung.\n\nErlauben Sie, dass bei der ersten Anmeldung ein Anwendungskonto angelegt wird, identifiziert über die stabile Benutzerkennung der Plattform.\nVerknüpfen Sie Konten nicht automatisch über übereinstimmende Namen oder E-Mail-Adressen. Neue Konten erhalten die Standardberechtigungen der Anwendung.\n\nListen Sie die Informationen auf, die der Administrator der Identitätsplattform bereitstellen muss, sowie die Callback-URL, die er registrieren muss.',
          },
          apiKeys: {
            label: 'API-Schlüssel',
            text: 'Fügen Sie dem Benutzermenü einen Eintrag „Integrationsschlüssel“ hinzu und nutzen Sie dafür die integrierte API-Schlüssel-Funktion der Anwendung.\nMitarbeitende verwalten nur die Schlüssel, die sie selbst erstellt haben, und geben dabei einen Zweck und eine Gültigkeitsdauer in Tagen an.\nZeigen Sie den vollständigen Schlüssel nur einmal nach der Erstellung an, mit dem Hinweis, ihn sofort zu kopieren und sicher aufzubewahren.\nListen Sie für jeden Schlüssel Name, ein erkennbares Fragment, Status, Ablaufdatum und letzte Verwendung auf und erlauben Sie, ihn nach Bestätigung zu widerrufen.\nZeigen Sie den vollständigen Schlüssel niemals in der Liste, in Logs oder in Details an.',
          },
        },
      },
      dataSources: {
        title: 'Datenquellen',
        description:
          'Wählen Sie die Anwendungsdatenbank und nutzen Sie Geschäftsdaten aus bestehenden externen Datenbanken.',
        prompts: {
          postgres: {
            label: 'Datenbank wechseln',
            text: 'Stellen Sie die Anwendungsdatenbank von SQLite auf PostgreSQL um.\nLesen Sie die Verbindungsdaten aus der Laufzeitkonfiguration des Servers, nicht aus dem Quellcode.\nErklären Sie, welchen Datenbanktreiber ich installieren und welche Einstellungen ich ausfüllen muss, und weisen Sie mich darauf hin, dass vorhandene Daten nicht automatisch migriert werden.',
          },
          externalDatabase: {
            label: 'Externe Datenbank',
            text: 'Binden Sie die bestehende Finanzdatenbank des Unternehmens als schreibgeschützte externe Datenquelle an; ändern Sie ihre Tabellen nicht.\nOrdnen Sie Datensätze über die Lieferantennummer zu und ergänzen Sie die Lieferantendetails um einen Abschnitt „Abrechnung“ mit Abrechnungszyklus, Kreditlimit und Abrechnungsstatus, gekennzeichnet mit seiner Quelle.\nLesen Sie die Kontaktdaten der Lieferanten weiterhin aus der Anwendungsdatenbank und die Abrechnungsdaten direkt aus der externen Datenbank, ohne sie zu importieren.\nLesen Sie die Zugangsdaten der Verbindung aus der Laufzeitkonfiguration des Servers.',
          },
        },
      },
      authorization: {
        title: 'Berechtigungen',
        description:
          'Legen Sie fest, wer welche Seiten öffnen, welche Aktionen ausführen und welche Datensätze sehen darf.',
        prompts: {
          jobs: {
            label: 'Positionen',
            text: 'Erstellen Sie für die Anwendung die Positionen „Bestellanforderer“ und „Bestellprüfer“.\nBestellanforderer können die Bestellseite öffnen und die von ihnen angeforderten Bestellungen ansehen.\nBestellprüfer können die Bestellseite öffnen, Bestellungen ansehen und offene Bestellungen genehmigen oder ablehnen.\nNur Administratoren der Anwendung können Berechtigungen und Zuweisungen ändern.\nNutzen Sie die vorhandene Autorisierungsfunktion der Anwendung, damit Administratoren Berechtigungen später anpassen und Personen zuweisen können.',
          },
          dataScopes: {
            label: 'Datenbereiche',
            text: 'Lassen Sie Bestellanforderer nur ihre eigenen Bestellungen sehen; die Zugehörigkeit bestimmt das Feld „Anforderer“ der Bestellung.\nBestellprüfer können alle Bestellungen sehen und offene Genehmigungen bearbeiten.\nAdministratoren können den Sichtbereich für Bestellungen jeder Position in deren Berechtigungssatz anpassen.',
          },
          restrictions: {
            label: 'Einschränkungen',
            text: 'Bob hilft vorübergehend bei der Prüfung von Bestellungen und darf nur Bestellungen bis 2.000 sehen.\nFügen Sie seiner Aktion „Bestellungen ansehen“ ein Betragslimit hinzu und behalten Sie seine bestehende Position und seine Datenbereiche bei.\nWenden Sie das Limit auf seine eigenen Bestellungen und auf mit ihm geteilte Bestellungen an.\nAdministratoren können den Betrag ändern oder die Regel entfernen; erklären Sie vor dem Entfernen, dass sich sein sichtbarer Bereich vergrößern kann.',
          },
        },
      },
      workflow: {
        title: 'Workflows',
        description:
          'Führen Sie Geschäftsdatensätze durch Phasen – mit Wartezeiten, Timeouts, Wiederholungen und einem Verlauf, wer was getan hat.',
        prompts: {
          stages: {
            label: 'Phasen',
            text: 'Fügen Sie Bestellungen einen Prozess hinzu: Genehmigung ausstehend → Einkauf ausstehend → Eingegangen → Abgeschlossen.\nPrüfer genehmigen oder lehnen ab; eine Ablehnung erfordert eine Begründung und gibt die Bestellung an den Antragsteller zurück, der sie überarbeitet und erneut einreicht.\nNachdem der Einkäufer den Einkauf ausgelöst hat, steht die Bestellung auf „Einkauf ausstehend“; die Bestätigung der Lieferung mit unterschriebenem Empfangsbeleg setzt sie auf „Eingegangen“, und die Bestätigung des Antragstellers schließt sie ab.\nDie Bestelldetails bieten nur die Aktionen der aktuellen Phase an, und normale Bearbeitungen können die Phase nicht ändern.\nPrüfen Sie Phasen und Pflichtangaben auf dem Server und überschreiben Sie niemals ein Ergebnis, das jemand anderes bereits eingereicht hat.',
          },
          backgroundExport: {
            label: 'Export im Hintergrund',
            text: 'Fügen Sie eine Seite für Bestellberichte hinzu, die vorhandene Bestellungen als CSV exportiert.\nNach dem Absenden wartet der Export auf die Verarbeitung, wird im Hintergrund erzeugt und endet mit einem Download-Link.\nZeigen Sie die aktuelle Phase, den Dateinamen, die Anzahl exportierter Bestellungen sowie die Einträge zur Übermittlung und zur Systemverarbeitung an.\nWiederholen Sie fehlgeschlagene Erzeugungen nach festgelegten Regeln und überlassen Sie einen endgültigen Fehlschlag dem Verantwortlichen zur Bearbeitung; ein erneuter Lauf darf keine doppelten Berichtsdateien erzeugen.\nHalten Sie Fortschritt und Ergebnis nach dem Neuladen der Seite sichtbar und erlauben Sie nur berechtigten Personen, Bestellungen zu exportieren.',
          },
          history: {
            label: 'Verlauf',
            text: 'Zeigen Sie in den Bestelldetails die aktuelle Phase und den Bearbeitungsverlauf an.\nJeder Eintrag zeigt, wer gehandelt hat, wann, die Aktion, die Phase davor und danach sowie gegebenenfalls den Ablehnungsgrund oder den unterschriebenen Empfangsbeleg.\nKennzeichnen Sie automatisch ausgeführte Aktionen als vom System durchgeführt.\nBewahren Sie Fortschritt und Verlauf nach dem Neuladen der Seite, damit sich der gesamte Prozess nach Abschluss nachvollziehen lässt.',
          },
        },
      },
      scheduler: {
        title: 'Geplante Aufgaben',
        description:
          'Führen Sie Geschäftsaufgaben zu festgelegten Zeiten aus und sehen Sie die nächste Ausführung und ihre Ergebnisse.',
        prompts: {
          reminder: {
            label: 'Tägliche Erinnerung',
            text: 'Fügen Sie der bestehenden Bestellanwendung eine Erinnerung an offene Bestellungen hinzu.\n\nSuchen Sie an jedem Werktag um 09:00 Uhr Pekinger Zeit die Bestellungen, die auf Genehmigung warten, gruppieren Sie sie nach Prüfer und senden Sie jedem Prüfer eine In-App-Benachrichtigung.\nGeben Sie die Anzahl offener Bestellungen an und verlinken Sie auf die Liste der offenen Bestellungen. Senden Sie nichts, wenn keine Bestellungen offen sind.\nAdministratoren können den Zeitplan und die Ausführungsprotokolle einsehen sowie Erinnerungen pausieren oder fortsetzen.',
          },
          weeklyReport: {
            label: 'Wochenbericht',
            text: 'Erstellen Sie jeden Montag um 08:00 Uhr Pekinger Zeit die Vertriebsübersicht der Vorwoche und benachrichtigen Sie den Vertriebsleiter.\nGeben Sie Umsatz, Anzahl der Bestellungen und Summen nach Region an. Administratoren können die Aufgabe und die Ausführungsprotokolle einsehen.',
          },
        },
      },
      notification: {
        title: 'Benachrichtigungen',
        description:
          'Senden Sie In-App-Nachrichten, E-Mails oder Nachrichten über Gruppen-Bots, wenn etwas passiert.',
        prompts: {
          inApp: {
            label: 'In-App-Nachricht',
            text: 'Fügen Sie der aktuellen Anwendung eine Genehmigung für Bestellungen hinzu und benachrichtigen Sie Antragsteller per In-App-Nachricht über das Ergebnis.\n\nBestellungen enthalten Nummer, Name, Antragsteller, Betrag und Genehmigungsstatus.\nAntragsteller können ihre eigenen Bestellungen sehen. Prüfer können offene Bestellungen sehen und genehmigen oder ablehnen. Verwenden Sie vorhandene Bestell- und Genehmigungsfunktionen, falls verfügbar.\n\nSenden Sie nach der Genehmigung oder Ablehnung eine einzige In-App-Nachricht, und zwar nur an den Antragsteller der Bestellung.\nDer Titel gibt an, ob die Bestellung genehmigt oder abgelehnt wurde. Der Text enthält Bestellnummer, Name und Genehmigungsergebnis.\nEin Klick auf die Nachricht öffnet die zugehörigen Bestelldetails.\nSenden Sie nichts, solange die Genehmigung aussteht. Benachrichtigen Sie für dasselbe Genehmigungsergebnis nur einmal.\nEin Fehler bei der Benachrichtigung beeinträchtigt das gespeicherte Genehmigungsergebnis nicht.',
          },
          email: {
            label: 'E-Mail',
            text: 'Ergänzen Sie die bestehenden Benachrichtigungen zur Bestellgenehmigung um E-Mail und nutzen Sie dafür den konfigurierten E-Mail-Kanal der Anwendung.\n\nSenden Sie das Ergebnis nach der Genehmigung oder Ablehnung einer Bestellung an die Konto-E-Mail-Adresse des Antragstellers.\nNehmen Sie die Bestellnummer in den Betreff und den Bestellnamen sowie das Ergebnis in den Text auf.\nBehalten Sie die bestehenden In-App-Nachrichten bei. Hat der Antragsteller keine E-Mail-Adresse, senden Sie nur die In-App-Nachricht.\nEin Fehler beim E-Mail-Versand darf weder das Genehmigungsergebnis noch die In-App-Nachricht beeinträchtigen.',
          },
        },
      },
      mail: {
        title: 'E-Mail',
        description:
          'Verbinden Sie persönliche Postfächer und lesen, beantworten und senden Sie geschäftliche E-Mails.',
        prompts: {
          providers: {
            label: 'E-Mail-Anbieter',
            text: 'Konfigurieren Sie mailbox.org für die Anwendung unter mail.providers in der Serverkonfiguration:\n- IMAP-Posteingangsserver: imap.mailbox.org, Port 993, SSL/TLS.\n- SMTP-Postausgangsserver: smtp.mailbox.org, Port 465, SSL/TLS.\nBenutzer geben ihre eigene E-Mail-Adresse, ihren Benutzernamen und ihr Passwort auf der Seite der Postfachkonten ein und wählen das Datum, ab dem die erste Synchronisierung beginnt; schreiben Sie Postfachpasswörter niemals in die Konfiguration oder den Quellcode.',
          },
          mailCenter: {
            label: 'E-Mail-Center',
            text: 'E-Mail ist in diese Anwendung integriert; verwenden Sie sie wieder, statt sie neu zu bauen oder ein weiteres Plugin zu installieren.\nFügen Sie der Navigation die Seiten „E-Mail-Center“ und „Postfachkonten“ hinzu und nutzen Sie dafür den E-Mail-Arbeitsbereich und die Seiten für Postfachkonten, die die E-Mail-Funktion bereitstellt.\nBenutzer können ihre eigenen Postfächer verbinden, eingehende Nachrichten synchronisieren, Nachrichten und Anhänge lesen und antworten; dabei bleiben der ursprüngliche Betreff und der Gesprächskontext erhalten, und die Antwort geht an den ursprünglichen Absender.\nJeder Benutzer arbeitet mit seinen eigenen verbundenen Postfächern.',
          },
          correspondence: {
            label: 'Kunden-E-Mails',
            text: 'Fügen Sie den Kundendetails einen Abschnitt „Korrespondenz“ hinzu und verwenden Sie dafür die integrierten Komponenten der Anwendung zum Lesen und Verfassen von E-Mails.\nZeigen Sie Nachrichten an, deren Absender oder Empfänger mit den Kontakt-E-Mail-Adressen des aktuellen Kunden übereinstimmt. Vertriebsmitarbeiter können Nachrichten lesen, Anhänge ansehen und über ihre eigenen verbundenen Postfächer antworten.',
          },
        },
      },
      file: {
        title: 'Dateien',
        description:
          'Laden Sie Dateien hoch, hängen Sie sie an Datensätze an und zeigen Sie sie in der Vorschau an oder laden Sie sie herunter.',
        prompts: {
          attachments: {
            label: 'Anhänge',
            text: 'Fügen Sie meiner bestehenden Bestellverwaltung Einkaufsanhänge hinzu.\n\nFügen Sie den Bestelldetails einen Anhangsbereich hinzu. Jede Bestellung kann mehrere Dateien haben, darunter PDF, Bilder und DOCX.\nZeigen Sie Dateinamen und -größen an, mit Aktionen für Vorschau, Download und Entfernen von Anhängen.\nLassen Sie Benutzer die Anhänge nach dem Hochladen in der aktuellen Bestellung speichern. Sie bleiben verfügbar, wenn die Bestellung erneut geöffnet wird.\nJeder mit Zugriff auf eine Bestellung kann ihre Anhänge ansehen und herunterladen. Antragsteller und Prüfer können Anhänge hinzufügen oder entfernen.\nDas Entfernen eines Anhangs löst ihn nur von der aktuellen Bestellung; die Datei bleibt erhalten.',
          },
          avatar: {
            label: 'Avatar',
            text: 'Geben Sie jedem Mitarbeitenden einen Avatar, mit einem Bild pro Person.\nUnterstützen Sie das Hochladen und Ersetzen des Avatars und zeigen Sie ihn in Mitarbeiterlisten und -details an.\nVerwenden Sie nach dem Ersetzen den neuen Avatar und lassen Sie ihn nach dem Neuladen der Seite sichtbar.',
          },
        },
      },
      i18n: {
        title: 'Sprachen',
        description:
          'Wechseln Sie die Sprache der Oberfläche, fügen Sie Sprachen hinzu und legen Sie die Standardsprache fest.',
        prompts: {
          addLanguage: {
            label: 'Sprache hinzufügen',
            text: 'Fügen Sie meiner Anwendung Spanisch hinzu. Übersetzen Sie die Oberfläche und die Servermeldungen und nehmen Sie Spanisch in das Sprachmenü auf.',
          },
          defaultLanguage: {
            label: 'Standardsprache',
            text: 'Machen Sie vereinfachtes Chinesisch zur Standardsprache der Anwendung für Personen, die keine Sprache gewählt haben. Englisch bleibt im Sprachmenü verfügbar.',
          },
        },
      },
      theme: {
        title: 'Designs',
        description:
          'Passen Sie Farben, Schriften und Dichte an und wechseln Sie zwischen hell und dunkel.',
        prompts: {
          changeTheme: {
            label: 'Design ändern',
            text: 'Aktualisieren Sie das Design „Kompakt“: Verwenden Sie Blau als Primärfarbe und vergrößern Sie den Eckenradius leicht. Behalten Sie die aktuellen Schriften, Schriftgrößen und kompakten Abstände bei.',
          },
          newTheme: {
            label: 'Neues Design',
            text: 'Erstellen Sie ein Design „Wald“ mit Grün als Primärfarbe, sanften Hintergründen, mäßig abgerundeten Ecken und dezenten Schatten.',
          },
        },
      },
    },
  },
  appearance: {
    title: 'Darstellung',
    mode: 'Farbmodus',
    preset: 'Design',
    light: 'Hell',
    dark: 'Dunkel',
    system: 'System',
    themes: {
      default: 'Großzügig',
      compact: 'Kompakt',
    },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: 'Schließen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    language: 'Sprache',
  },
  notices: {
    serverLocaleFallback:
      'Der Server unterstützt diese Sprache nicht, daher werden Servermeldungen auf Englisch angezeigt.',
    languageChangeFailed:
      'Die Sprache konnte nicht geändert werden. Bitte versuchen Sie es erneut.',
  },
  account: {
    signOutFailed: 'Abmelden nicht möglich. Bitte versuchen Sie es erneut.',
    openMenu: 'Kontomenü öffnen',
    fallback: 'Konto',
    signOut: 'Abmelden',
    signingOut: 'Wird abgemeldet…',
  },
  navigation: {
    home: 'Übersicht',
    open: 'Navigation öffnen',
    close: 'Navigation schließen',
    expand: 'Navigation ausklappen',
    collapse: 'Navigation einklappen',
    toggle: 'Navigation aus- oder einklappen',
    label: 'Anwendungsnavigation',
    description: 'Zu einer Seite dieser Anwendung wechseln.',
    breadcrumb: 'Brotkrumennavigation',
    breadcrumbMore: 'Zwischenebenen anzeigen',
    back: 'Zurück',
  },
  dataTable: {
    noResults: 'Keine Ergebnisse.',
    sortAscending: 'Aufsteigend',
    sortDescending: 'Absteigend',
    hideColumn: 'Ausblenden',
    view: 'Ansicht',
    toggleColumns: 'Spalten ein-/ausblenden',
    selectedCount: '{{selected}} von {{total}} Zeile(n) ausgewählt.',
    rowsPerPage: 'Zeilen pro Seite',
    pageOf: 'Seite {{page}} von {{pageCount}}',
    firstPage: 'Zur ersten Seite',
    previousPage: 'Zur vorherigen Seite',
    nextPage: 'Zur nächsten Seite',
    lastPage: 'Zur letzten Seite',
  },
  datePicker: {
    placeholder: 'Datum auswählen',
    rangePlaceholder: 'Zeitraum auswählen',
  },
  'Lead follow-up': 'Lead nachfassen',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    'Prüft alles, was zu einem Lead aktuell vorliegt (den Lead selbst, seine Aufgaben, Kommentare und zugehörige Datensätze im CRM), und empfiehlt mit Begründung den nächsten Schritt – weiter nachfassen, in Pflege nehmen, konvertieren oder ungültig; beim Nachfassen wird klar gesagt, wie nachgefasst wird und was genau zu tun ist. Verwenden, wenn ein neuer Lead eingeht, wenn der Benutzer darum bittet, einen Lead nachzufassen oder erneut nachzufassen, oder fragt: „Was soll ich als Nächstes mit diesem Lead tun?“',
  'Opportunity follow-up': 'Verkaufschance nachfassen',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    'Prüft alles zum aktuellen Stand einer Verkaufschance (die Verkaufschance selbst, das Unternehmen, Kontakte und ihre Rollen, Aufgaben, Kommentare, Genehmigungen, den Ursprungs-Lead) und beurteilt, ob ihre Phase haltbar ist und was als Nächstes zu tun ist – in die nächste Phase vorrücken, in der aktuellen Phase dranbleiben, pausieren oder als verloren markieren –, mit Begründung, Risiken und zu schließenden Lücken; beim Vorrücken wird genau beschrieben, was zu tun ist. Verwenden, wenn durch die Konvertierung eines Leads eine neue Verkaufschance entsteht, wenn das Ergebnis einer Aufgabe der Verkaufschance erfasst wurde, wenn der Benutzer um Nachfassen bittet oder wenn gefragt wird: „Was ist der nächste Schritt für diese Verkaufschance?“',
  'Approval review': 'Genehmigungsprüfung',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    'Hilft einem Genehmiger zu beurteilen, ob eine Genehmigungsanfrage (Rabatt, Zahlungsbedingungen, Vertragsbedingungen, Lieferzusage) eine Genehmigung verdient – wie weit die geforderten Bedingungen vom Standard abweichen, die Auswirkung auf Betrag und Zahlungseingang, die Lage der Verkaufschance und die Belege für dieses Zugeständnis, die anderen mit ihr für dieselbe Verkaufschance eingereichten Genehmigungen, wie frühere Anfragen derselben Art entschieden wurden, die Risiken und was der Antragsteller offengelassen hat – und empfiehlt dann Genehmigen, Genehmigen unter Auflagen, Ablehnen oder weitere Informationen anfordern und entwirft den Kommentar zur Entscheidung. Verwenden, nachdem eine Genehmigung eingereicht wurde, oder wenn der Genehmiger fragt: „Sollte diese Genehmigung erteilt werden?“',
  'Task preparation': 'Aufgabenvorbereitung',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    'Bereitet einen Vertriebsmitarbeiter auf eine anstehende Aufgabe mit einem Kunden vor (Anruf, Meeting, Besuch, Demo) – was die Aufgabe erreichen soll, wo die Dinge laut Aufgaben, Kommentaren und E-Mails des Datensatzes stehen, wer auf der Gegenseite sitzt und welche Rolle jeder spielt, welche Fragen zu stellen sind, was mitzubringen ist, die Risiken und die Punkte, die der Reihe nach zu behandeln sind. Verwenden am Morgen einer Aufgabe oder wenn der Verantwortliche der Aufgabe um Vorbereitung bittet.',
  flowDiagram: {
    controls: 'Diagrammsteuerung',
    fitView: 'Einpassen',
    fullscreen: 'Vollbild',
    exitFullscreen: 'Vollbild beenden',
    escapeHint: 'Zum Beenden Esc drücken',
    leavesTo: 'Führt zu',
    arrivesFrom: 'Kommt von',
    otherRoutes: 'Weitere Wege',
    minimap: 'Diagrammübersicht',
    configure: 'Konfigurieren',
    overview: 'Diagrammübersicht',
    actualSize: 'Originalgröße',
    states: 'Zustände',
    transitions: 'Übergänge',
    configurable: 'Parameter',
    current: 'Aktuell',
    visited: 'Durchlaufen',
    initial: 'Anfang',
    final: 'Ende',
    state: 'Zustand',
    zoomOut: 'Verkleinern',
    zoomIn: 'Vergrößern',
    fit: 'Einpassen',
    empty: 'Keine Zustände vorhanden.',
    loading: 'Diagramm wird angeordnet…',
    failed: 'Dieses Diagramm kann nicht angeordnet werden.',
    nodeHelp:
      'Drücken Sie die Eingabe- oder Leertaste, um einen Zustand auszuwählen.',
    edgeHelp:
      'Drücken Sie die Eingabe- oder Leertaste, um einen Übergang auszuwählen.',
  },
  loginActivity: {
    heading: 'Vom ersten Lead bis zum unterschriebenen Abschluss.',
    description:
      'Ihr KI-Vertriebsteam fasst bei jedem Lead und jeder Verkaufschance nach, bereitet jedes Meeting und jede Genehmigung vor – und Sie entscheiden.',
    phases: {
      lead: 'Lead',
      deal: 'Verkaufschance',
      won: 'Abgeschlossen',
    },
    participants: {
      rep: 'Sophie Bennett',
      leadAgent: 'KI-Nachfassen (Lead)',
      prepAgent: 'KI-Aufgabenassistent',
      dealAgent: 'KI-Nachfassen (Verkaufschance)',
      approvalAgent: 'KI-Genehmigungsprüfung',
      manager: 'Daniel Brooks',
      customer: 'Emma Walsh',
    },
    capabilities: {
      capture: 'KI-Erfassung',
      followUp: 'KI-Nachfassen',
      pipeline: 'Pipeline',
      prep: 'Aufgabenvorbereitung',
      mail: 'E-Mail',
      approval: 'Genehmigungen',
    },
    timeline: 'Verlauf',
    lead: {
      kind: 'Lead',
      title: 'Emma Walsh / Northwind Logistics',
      need: 'Flottendisposition, 200 Lkw · aus einer E-Mail',
      grade: 'Bewertung A',
    },
    deal: {
      kind: 'Verkaufschance',
      title: 'Flottendispositionsplattform (Enterprise)',
      company: 'Northwind Logistics',
      amount: '48.000 $',
      owner: 'Sophie Bennett',
      won: 'Gewonnen',
    },
    leadStatuses: {
      new: 'Neu',
      working: 'In Bearbeitung',
      converted: 'Konvertiert',
    },
    stages: {
      qualification: 'Qualifizierung',
      proposal: 'Angebot',
      negotiation: 'Verhandlung',
      won: 'Gewonnen',
    },
    steps: {
      captured: {
        who: 'KI',
        what: 'hat den Lead aus einer E-Mail erfasst',
      },
      leadFollowUp: {
        who: 'KI-Nachfassen',
        what: 'Bewertung A, heute um 15 Uhr anrufen',
      },
      converted: {
        who: 'Sophie Bennett',
        what: 'hat den Lead in eine Verkaufschance konvertiert',
      },
      prepared: {
        who: 'KI',
        what: 'hat die Demo für morgen mit den eigenen Routen des Kunden vorbereitet',
      },
      replied: {
        who: 'Emma Walsh',
        what: 'Könnten wir 60 Tage nach Rechnungsstellung zahlen?',
      },
      dealFollowUp: {
        who: 'KI-Nachfassen',
        what: 'weiter zur Verhandlung; 60 Tage brauchen eine Genehmigung',
      },
      reviewed: {
        who: 'KI-Prüfung',
        what: 'unter Auflagen genehmigen',
      },
      approved: {
        who: 'Daniel Brooks',
        what: 'hat das Zahlungsziel von 60 Tagen genehmigt',
      },
      won: {
        who: 'Sophie Bennett',
        what: 'der unterschriebene Vertrag ist zurück',
      },
    },
  },
  // The template's Settings copy, translated in ./settings/.
  settings: settingsDeDE,
  crm: crmDeDE,
};

export default deDE;
