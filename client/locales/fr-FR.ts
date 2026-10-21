import type { AppResource } from './en-US.js';
import { crmFrFR } from './crm/fr-FR.js';
import settingsFrFR from './settings/fr-FR.js';

// The pages in fr-FR: the template's copy (./system/), the AI skills'
// display text and the CRM's own (./crm/fr-FR.ts), with the same keys as
// ./en-US.ts. The template ships no fr-FR, so its copy is translated
// here; a template upgrade that adds keys fails the type check until they
// are translated.
const frFR: AppResource = {
  'auth.passwordResetSuccess':
    'Votre mot de passe a été réinitialisé. Connectez-vous avec votre nouveau mot de passe.',
  'auth.requestNewResetLink': 'Demander un nouveau lien de réinitialisation',
  'auth.preparingSession': 'Préparation de votre session…',
  'auth.connectionFailed': 'Connexion impossible',
  'auth.connectionFailedDescription':
    'La connexion en temps réel n’a pas pu être établie. Réessayez pour accéder à l’application, ou déconnectez-vous.',
  'deviceApproval.title': 'Autoriser un appareil',
  'deviceApproval.description':
    "Une ligne de commande ou un autre appareil demande à se connecter en votre nom. N'approuvez que si vous avez vous-même lancé la connexion.",
  'deviceApproval.enterCode': 'Saisissez le code affiché par votre appareil.',
  'deviceApproval.codeLabel': 'Code',
  'deviceApproval.continue': 'Continuer',
  'deviceApproval.checking': 'Vérification du code…',
  'deviceApproval.confirm':
    'Vérifiez que ce code correspond à celui affiché par votre appareil.',
  'deviceApproval.client': 'Demandé par {{client}}',
  'deviceApproval.approve': 'Approuver',
  'deviceApproval.approving': 'Approbation…',
  'deviceApproval.deny': 'Refuser',
  'deviceApproval.denying': 'Refus…',
  'deviceApproval.approved':
    'Appareil approuvé. Revenez à votre terminal pour continuer ; vous pouvez fermer cette page.',
  'deviceApproval.denied':
    "Demande refusée. L'appareil n'a pas été connecté ; vous pouvez fermer cette page.",
  'deviceApproval.expired':
    'Ce code a expiré. Relancez la connexion sur votre appareil.',
  'deviceApproval.invalid':
    "Ce code n'est pas valide. Comparez-le à celui de votre appareil et réessayez.",
  'deviceApproval.notYours':
    "Ce code est déjà en cours d'approbation par un autre compte.",
  'deviceApproval.error': 'Une erreur est survenue. Réessayez.',
  'deviceApproval.retry': 'Réessayer',
  'deviceApproval.otherCode': 'Saisir un autre code',
  'inbox.title': 'Boîte de réception',
  'inbox.description': 'Les notifications et demandes qui vous sont adressées.',
  'inbox.views.all': 'Notifications',
  'inbox.views.todo': "Suggestions de l'IA",
  'inbox.kinds.label': 'Type',
  'inbox.kinds.all': 'Tous les types',
  'inbox.kinds.decision': 'Décisions',
  'inbox.kinds.info': 'Notifications',
  'inbox.tabs.decision': 'À décider',
  'inbox.tabs.info': 'Notifications',
  'inbox.clearFilter': 'Effacer le filtre',
  'inbox.noMatchDescription': 'Effacez le filtre pour voir tous les types.',
  'inbox.readAll': 'Tout marquer comme lu',
  'inbox.allRead': 'Tout a été marqué comme lu.',
  'inbox.loading': 'Chargement',
  'inbox.loadFailed': 'Impossible de charger la boîte de réception',
  'inbox.loadFailedDescription': 'Vérifiez votre connexion et réessayez.',
  'inbox.retry': 'Réessayer',
  'inbox.loadMore': 'Charger plus',
  'inbox.emptyAll': 'Rien ici',
  'inbox.empty.todo': 'Rien ne vous attend',
  'inbox.empty.decision': 'Aucune décision ne vous attend',
  'inbox.empty.info': 'Aucune notification',
  'inbox.emptyDescription':
    'Les notifications et demandes qui vous sont adressées apparaissent ici.',
  'inbox.unread': 'Non lu',
  'inbox.unreadCount': '{{count}} non lu(s)',
  'inbox.pendingDecisions': '{{count}} en attente',
  'inbox.resolved': 'Traité',
  'inbox.outcomes.approved': 'Approuvé',
  'inbox.outcomes.rejected': 'Refusé',
  'inbox.outcomes.withdrawn': 'Retiré',
  'inbox.count': '×{{count}}',
  'inbox.actionsFor': 'Actions pour {{title}}',
  'inbox.actions.read': 'Marquer comme lu',
  'inbox.actions.unread': 'Marquer comme non lu',
  'inbox.actions.delete': 'Supprimer',
  'inbox.deleted': 'Supprimé.',
  'inbox.requestFailed': 'La requête a échoué. Réessayez.',
  'inbox.forbidden': "Vous n'êtes pas autorisé à effectuer cette action.",
  'inbox.nothingSelected': 'Sélectionnez un élément pour le consulter',
  'inbox.back': 'Retour à la liste',
  'inbox.open': 'Ouvrir',
  'inbox.keyMove': 'Naviguer',
  'inbox.keyOpen': 'Ouvrir',
  'inbox.cancel': 'Annuler',
  'inbox.request.approve': 'Approuver',
  'inbox.request.reject': 'Refuser',
  'inbox.request.commentPlaceholder': 'Écrivez quelque chose…',
  'inbox.request.commentFor': '{{action}} : {{title}}',
  'inbox.request.quickSend': 'pour envoyer',
  'inbox.request.newLine': 'pour un saut de ligne',
  'inboxButton.title': 'Boîte de réception',
  'inboxButton.pending': 'Boîte de réception, {{count}} en attente',
  'inboxButton.unread': 'Boîte de réception, {{count}} non lu(s)',
  'inboxButton.pendingHint':
    '{{count}} en attente de votre part ; le nombre baisse à mesure que vous les traitez.',
  'inboxButton.unreadHint':
    '{{count}} non lu(s) ; le nombre baisse à mesure que vous les lisez.',
  'auth.welcome': 'Bon retour parmi nous',
  'auth.loginDescription':
    "Connectez-vous avec votre nom d'utilisateur ou votre e-mail et votre mot de passe.",
  'auth.registerTitle': 'Créer un compte',
  'auth.registerDescription': 'Créez un compte pour commencer.',
  'auth.forgotTitle': 'Mot de passe oublié',
  'auth.forgotDescription':
    'Saisissez votre e-mail ; si le compte existe, nous vous enverrons un lien de réinitialisation.',
  'auth.passwordResetUnavailable':
    "La réinitialisation du mot de passe en libre-service n'est pas activée. Contactez un administrateur pour réinitialiser votre mot de passe.",
  'auth.capabilityLoadFailed':
    'Impossible de vérifier si la réinitialisation du mot de passe est disponible.',
  'auth.retry': 'Réessayer',
  'auth.loading': 'Chargement',
  'auth.resetDescription':
    'Choisissez un nouveau mot de passe pour votre compte.',
  'auth.resetTitle': 'Réinitialiser le mot de passe',
  'auth.identifier': "Nom d'utilisateur ou e-mail",
  'auth.password': 'Mot de passe',
  'auth.signIn': 'Se connecter',
  'auth.signingIn': 'Connexion…',
  'auth.hidePassword': 'Masquer le mot de passe',
  'auth.showPassword': 'Afficher le mot de passe',
  'auth.forgotLink': 'Mot de passe oublié ?',
  'auth.noAccount': "Vous n'avez pas de compte ?",
  'auth.signUp': "S'inscrire",
  'auth.createAccount': 'Créer un compte',
  'auth.creatingAccount': 'Création du compte…',
  'auth.name': 'Nom',
  'auth.username': "Nom d'utilisateur",
  'auth.email': 'E-mail',
  'auth.confirmPassword': 'Confirmer le mot de passe',
  'auth.existingAccount': 'Vous avez déjà un compte ?',
  'auth.passwordMismatch': 'Les mots de passe ne correspondent pas.',
  'auth.resetting': 'Réinitialisation…',
  'auth.newPassword': 'Nouveau mot de passe',
  'auth.confirmNewPassword': 'Confirmer le nouveau mot de passe',
  'auth.invalidResetLink':
    'Ce lien de réinitialisation du mot de passe est invalide ou a expiré.',
  'auth.backToSignIn': 'Retour à la connexion',
  'auth.sendResetLink': 'Envoyer le lien de réinitialisation',
  'auth.sending': 'Envoi…',
  'auth.resetSent':
    'Si le compte existe, un lien de réinitialisation a été envoyé.',
  'auth.rememberPassword': 'Vous vous souvenez de votre mot de passe ?',
  'auth.methods': 'Méthodes de connexion',
  'auth.or': 'Ou continuer avec',
  'auth.continueWith': 'Continuer avec {provider}',
  'auth.about': 'À propos de cette application',
  'auth.platform': "Plateforme d'applications native IA",
  'auth.marketingTitleFirst': "Laissez l'IA construire librement.",
  'auth.marketingTitleSecond': 'NocoBase en garantit',
  'auth.marketingTitleThird': 'la fiabilité.',
  'auth.marketingDescription':
    "Offrez à l'IA un framework frontend flexible pour façonner chaque expérience, tandis que NocoBase sécurise en profondeur les données, les autorisations et la gouvernance.",
  'auth.frontend': 'Frontend natif IA',
  'auth.frontendDescription':
    'Composez librement des interfaces sur un framework flexible.',
  'auth.foundation': 'Socle NocoBase',
  'auth.foundationDescription':
    'Données, contrôle d’accès et gouvernance fiables.',
  'auth.marketingFooter': 'Liberté en surface. Confiance en profondeur.',
  'status.loading': 'Chargement',
  'status.loadingPage': 'Chargement de la page',
  'status.denied': 'Accès refusé',
  'status.pageFailed': 'Impossible de charger la page',
  'status.retry': 'Réessayer',
  'navigation.brandHome': 'Accueil NocoCRM',
  'navigation.brandApps': 'Applications NocoBase',
  'routeOverlay.close': 'Fermer',
  'status.deniedDescription': "Vous n'êtes pas autorisé à accéder à {{label}}.",
  'status.routeFailedDescription':
    "La route {{label}} de {{packageName}} n'a pas pu être chargée.",
  shell: {
    buildFreely: "L'IA construit librement.",
    reliability: '<brand>NocoBase</brand> en garantit la fiabilité.',
  },
  home: {
    platform: "NocoBase · Plateforme d'applications native IA",
    title: 'Décrivez-le, votre agent le construit',
    description:
      "Cette application se développe en dialoguant avec votre agent de code. Expliquez en termes simples ce dont l'activité a besoin, et il écrit les pages, les modèles de données, les API et les processus métier de ce projet.",
    steps: {
      describe: {
        title: 'Décrire le besoin',
        description:
          'Indiquez qui l’utilise, quelles données elle conserve et ce qui doit se passer.',
      },
      build: {
        title: "Laisser l'agent construire",
        description:
          'Il lit ce projet et ses fonctionnalités intégrées, puis écrit le code.',
      },
      review: {
        title: 'Vérifier et affiner',
        description:
          'Actualisez la page pour l’essayer, puis demandez des modifications de la même façon.',
      },
    },
    example: {
      title: 'Essayez une demande comme celle-ci',
      text: "Crée une application de bons de commande.\n\nUne commande comporte un numéro, un article, un demandeur, un montant et un statut d'approbation. Les demandeurs créent des commandes et ne voient que les leurs ; les approbateurs voient toutes les commandes en attente et les approuvent ou les refusent.\nAprès une décision, informe le demandeur dans la boîte de réception avec un lien vers la commande.",
      hint: 'Collez-la dans Claude Code, Codex, Cursor ou tout autre agent de code ouvert dans ce projet.',
    },
    capabilitiesTitle: 'Fonctionnalités intégrées',
    capabilitiesDescription:
      'Votre agent les utilise directement au lieu de les développer de zéro. Ouvrez-en une pour obtenir un prompt que vous pouvez modifier et copier.',
    viewPrompts: 'Voir les prompts ({{count}})',
    prompt: {
      label: 'Prompt',
      hint: 'Adaptez le prompt à votre activité avant de le copier. Les modifications ne sont pas conservées après la fermeture de la fenêtre.',
      copy: 'Copier',
      copiedShort: 'Copié',
      copied: 'Prompt copié',
      copyFailed:
        'Copie impossible. Sélectionnez le texte et copiez-le manuellement.',
      reset: 'Rétablir par défaut',
    },
    capabilities: {
      auth: {
        title: 'Authentification',
        description:
          'Connexion, inscription, réinitialisation du mot de passe et authentification unique (SSO) d’entreprise.',
        prompts: {
          disableSignUp: {
            label: 'Fermer les inscriptions',
            text: "Cette application est réservée aux employés de l'entreprise. Les administrateurs créent tous les comptes.\nDésactive l'inscription libre et retire le lien d'inscription de la page de connexion.\nLes employés existants doivent toujours pouvoir se connecter avec leur compte et leur mot de passe.\nConserve le lien « Mot de passe oublié ».",
          },
          companySso: {
            label: 'SSO d’entreprise',
            text: "Permets aux employés de se connecter via la plateforme d'identité de l'entreprise en OIDC.\n\nConserve la connexion par compte et mot de passe et ajoute un bouton « Compte d'entreprise ».\nLe bouton ouvre la plateforme d'identité de l'entreprise. Après une connexion réussie, reviens à la page d'accueil de l'application.\n\nAutorise la première connexion à créer un compte applicatif, identifié par l'identifiant utilisateur stable de la plateforme.\nNe lie pas automatiquement les comptes en comparant les noms ou les e-mails. Les nouveaux comptes reçoivent les autorisations par défaut de l'application.\n\nListe les informations que l'administrateur de la plateforme d'identité doit fournir et l'URL de rappel qu'il doit enregistrer.",
          },
          apiKeys: {
            label: 'Clés API',
            text: "Ajoute une entrée « Clés d'intégration » au menu utilisateur, en utilisant la fonctionnalité de clés API intégrée à l'application.\nLes employés ne gèrent que les clés qu'ils ont créées, en saisissant un objet et une durée de validité en jours.\nAffiche la clé complète une seule fois après sa création, en invitant à la copier et à la conserver immédiatement.\nListe pour chaque clé son nom, un fragment identifiable, son statut, son expiration et sa dernière utilisation, et permets de la révoquer après confirmation.\nN'affiche jamais la clé complète dans la liste, les journaux ou les détails.",
          },
        },
      },
      dataSources: {
        title: 'Sources de données',
        description:
          "Choisissez la base de données de l'application et exploitez les données métier de bases externes existantes.",
        prompts: {
          postgres: {
            label: 'Changer de base de données',
            text: "Passe la base de données de l'application de SQLite à PostgreSQL.\nLis les informations de connexion depuis la configuration d'exécution du serveur, pas depuis le code source.\nExplique quel pilote de base de données installer et quels paramètres renseigner, et rappelle-moi que les données existantes ne sont pas migrées automatiquement.",
          },
          externalDatabase: {
            label: 'Base de données externe',
            text: "Connecte la base de données financière existante de l'entreprise comme source de données externe en lecture seule ; ne modifie pas ses tables.\nAssocie les enregistrements par numéro de fournisseur et ajoute une section « Règlement » aux détails du fournisseur, affichant le cycle de règlement, la limite de crédit et le statut de règlement, avec l'indication de sa source.\nContinue de lire les coordonnées des fournisseurs depuis la base de données de l'application, et lis les données de règlement directement depuis la base externe sans les importer.\nLis les identifiants de connexion depuis la configuration d'exécution du serveur.",
          },
        },
      },
      authorization: {
        title: 'Autorisations',
        description:
          'Contrôlez qui peut ouvrir quelles pages, exécuter quelles actions et voir quelles données.',
        prompts: {
          jobs: {
            label: 'Postes',
            text: "Crée les postes « Demandeur d'achat » et « Approbateur de commandes » pour l'application.\nLes demandeurs d'achat peuvent accéder à la page des commandes et voir les commandes qu'ils ont demandées.\nLes approbateurs de commandes peuvent accéder à la page des commandes, voir les commandes, et approuver ou refuser les commandes en attente.\nSeuls les administrateurs de l'application peuvent modifier les autorisations et les affectations.\nUtilise la fonctionnalité d'autorisation existante de l'application afin que les administrateurs puissent ajuster les autorisations et affecter des personnes par la suite.",
          },
          dataScopes: {
            label: 'Périmètres de données',
            text: "Permets aux demandeurs d'achat de ne voir que leurs propres commandes, en utilisant le champ demandeur de la commande pour déterminer à qui elle appartient.\nLes approbateurs de commandes peuvent voir toutes les commandes et traiter les approbations en attente.\nLes administrateurs peuvent ajuster le périmètre de consultation des commandes de chaque poste dans son ensemble d'autorisations.",
          },
          restrictions: {
            label: 'Restrictions',
            text: "Bob aide temporairement à vérifier les bons de commande et ne peut voir que les commandes de 2 000 ou moins.\nAjoute une limite de montant à son action « Voir les commandes », en conservant son poste et ses périmètres de données existants.\nApplique la limite à ses propres commandes et aux commandes partagées avec lui.\nLes administrateurs peuvent modifier le montant ou supprimer la règle ; avant la suppression, explique que son périmètre visible peut s'élargir.",
          },
        },
      },
      workflow: {
        title: 'Flux de travail',
        description:
          'Faites avancer les documents métier par étapes, avec attentes, délais, nouvelles tentatives et un historique de qui a fait quoi.',
        prompts: {
          stages: {
            label: 'Étapes',
            text: "Ajoute un processus aux bons de commande : En attente d'approbation → En attente d'achat → Reçue → Terminée.\nLes approbateurs approuvent ou refusent ; un refus exige un motif et renvoie la commande au demandeur pour qu'il la corrige et la soumette à nouveau.\nUne fois l'achat passé par l'acheteur, la commande est en attente d'achat ; la confirmation de livraison avec un bon de réception signé la fait passer à Reçue, et la confirmation du demandeur la termine.\nLes détails de la commande ne proposent que les actions de l'étape en cours, et une modification ordinaire ne peut pas changer l'étape.\nVérifie les étapes et les informations obligatoires côté serveur, et n'écrase jamais un résultat déjà soumis par quelqu'un d'autre.",
          },
          backgroundExport: {
            label: 'Export en arrière-plan',
            text: "Ajoute une page de rapport des commandes qui exporte les commandes existantes au format CSV.\nAprès soumission, l'export attend d'être traité, est généré en arrière-plan et se termine avec un lien de téléchargement.\nAffiche l'étape en cours, le nom du fichier, le nombre de commandes exportées, ainsi que l'historique de la soumission et du traitement par le système.\nRelance la génération en échec selon des règles, et conserve un échec définitif pour que le responsable le traite ; une nouvelle exécution ne doit pas créer de fichiers de rapport en double.\nConserve la progression et le résultat visibles après une actualisation de la page, et n'autorise que les personnes habilitées à exporter les commandes.",
          },
          history: {
            label: 'Historique',
            text: "Affiche l'étape en cours et l'historique de traitement dans les détails de la commande.\nChaque entrée indique qui a agi, quand, l'action, l'étape avant et après, ainsi que le motif de refus ou le bon de réception signé le cas échéant.\nIndique que les actions exécutées automatiquement l'ont été par le système.\nConserve la progression et l'historique après une actualisation de la page, afin de pouvoir revoir tout le processus une fois terminé.",
          },
        },
      },
      scheduler: {
        title: 'Tâches planifiées',
        description:
          'Exécutez des traitements métier à heures fixes, et consultez la prochaine exécution et ses résultats.',
        prompts: {
          reminder: {
            label: 'Rappel quotidien',
            text: "Ajoute un rappel « Commandes en attente » à l'application de commandes existante.\n\nChaque jour ouvré à 09:00, heure de Pékin, recherche les commandes en attente d'approbation, regroupe-les par approbateur et envoie à chaque approbateur une notification dans l'application.\nIndique le nombre de commandes en attente avec un lien vers la liste des commandes en attente. N'envoie rien s'il n'y a aucune commande en attente.\nLes administrateurs peuvent consulter la planification et l'historique des exécutions, et suspendre ou reprendre les rappels.",
          },
          weeklyReport: {
            label: 'Rapport hebdomadaire',
            text: "Chaque lundi à 08:00, heure de Pékin, génère la synthèse des ventes de la semaine précédente et notifie le responsable commercial.\nInclus le chiffre d'affaires, le nombre de commandes et les totaux par région. Les administrateurs peuvent consulter la tâche et l'historique des exécutions.",
          },
        },
      },
      notification: {
        title: 'Notifications',
        description:
          "Envoyez des messages dans l'application, des e-mails ou des messages de bot de groupe lorsqu'un événement se produit.",
        prompts: {
          inApp: {
            label: "Message dans l'application",
            text: "Ajoute l'approbation des commandes à l'application actuelle et informe les demandeurs des résultats par des messages dans l'application.\n\nLes commandes comportent un numéro, un nom, un demandeur, un montant et un statut d'approbation.\nLes demandeurs peuvent voir leurs propres commandes. Les approbateurs peuvent voir les commandes en attente et les approuver ou les refuser. Réutilise les fonctionnalités de commande et d'approbation existantes si elles sont disponibles.\n\nAprès approbation ou refus, envoie un seul message dans l'application, uniquement au demandeur de la commande.\nLe titre indique si la commande a été approuvée ou refusée. Le corps comprend le numéro de commande, le nom et le résultat de l'approbation.\nUn clic sur le message ouvre les détails de la commande correspondante.\nN'envoie rien tant que l'approbation est en attente. Ne notifie qu'une seule fois pour un même résultat d'approbation.\nUn échec de notification n'affecte pas le résultat d'approbation enregistré.",
          },
          email: {
            label: 'E-mail',
            text: "Ajoute l'e-mail aux notifications d'approbation de commande existantes, en utilisant le canal e-mail configuré dans l'application.\n\nAprès l'approbation ou le refus d'une commande, envoie le résultat à l'adresse e-mail du compte du demandeur.\nIndique le numéro de commande dans l'objet, et le nom de la commande et le résultat dans le corps.\nConserve les messages existants dans l'application. Si le demandeur n'a pas d'adresse e-mail, envoie uniquement le message dans l'application.\nUn échec d'envoi de l'e-mail ne doit pas affecter le résultat de l'approbation ni le message dans l'application.",
          },
        },
      },
      mail: {
        title: 'E-mail',
        description:
          'Connectez des boîtes mail personnelles, puis lisez, répondez et envoyez des e-mails professionnels.',
        prompts: {
          providers: {
            label: 'Fournisseur de messagerie',
            text: "Configure mailbox.org pour l'application dans mail.providers de la configuration du serveur :\n- Serveur entrant IMAP : imap.mailbox.org, port 993, SSL/TLS.\n- Serveur sortant SMTP : smtp.mailbox.org, port 465, SSL/TLS.\nLes utilisateurs saisissent leur propre adresse e-mail, nom d'utilisateur et mot de passe sur la page des comptes de messagerie, et choisissent la date à partir de laquelle démarre la première synchronisation ; n'écris jamais les mots de passe des boîtes mail dans la configuration ou le code source.",
          },
          mailCenter: {
            label: 'Centre de messagerie',
            text: "La messagerie est intégrée à cette application ; réutilise-la au lieu de la redévelopper ou d'installer un autre plugin.\nAjoute à la navigation les pages « Centre de messagerie » et « Comptes de messagerie », en utilisant l'espace de travail de messagerie et la page des comptes de messagerie fournis par la fonctionnalité de messagerie.\nLes utilisateurs peuvent connecter leurs propres boîtes mail, synchroniser les messages entrants, lire les messages et les pièces jointes, et répondre en conservant l'objet et le contexte de la conversation d'origine, la réponse étant adressée à l'expéditeur d'origine.\nChaque utilisateur travaille avec ses propres boîtes mail connectées.",
          },
          correspondence: {
            label: 'E-mails clients',
            text: "Ajoute une section de correspondance aux détails du client, en réutilisant les composants intégrés de lecture et de rédaction d'e-mails de l'application.\nAffiche les messages dont l'expéditeur ou le destinataire correspond aux adresses e-mail des contacts du client actuel. Les commerciaux peuvent lire les messages, consulter les pièces jointes et répondre depuis leurs propres boîtes mail connectées.",
          },
        },
      },
      file: {
        title: 'Fichiers',
        description:
          'Importez des fichiers, rattachez-les à des fiches, et prévisualisez-les ou téléchargez-les.',
        prompts: {
          attachments: {
            label: 'Pièces jointes',
            text: "Ajoute des pièces jointes d'achat à mon application de gestion des commandes existante.\n\nAjoute une zone de pièces jointes aux détails de la commande. Chaque commande peut comporter plusieurs fichiers, notamment des PDF, des images et des DOCX.\nAffiche les noms et tailles des fichiers, avec des actions pour prévisualiser, télécharger et retirer les pièces jointes.\nAprès l'import, permets aux utilisateurs d'enregistrer les pièces jointes sur la commande en cours. Elles doivent rester disponibles lorsque la commande est rouverte.\nToute personne ayant accès à une commande peut voir et télécharger ses pièces jointes. Les demandeurs et les approbateurs peuvent ajouter ou retirer des pièces jointes.\nRetirer une pièce jointe la dissocie seulement de la commande en cours ; conserve le fichier.",
          },
          avatar: {
            label: 'Avatar',
            text: "Ajoute un avatar à chaque employé, avec une image par employé.\nPermets d'importer et de remplacer l'avatar, et affiche-le dans les listes et les détails des employés.\nUtilise le nouvel avatar après remplacement et garde-le visible après l'actualisation de la page.",
          },
        },
      },
      i18n: {
        title: 'Langues',
        description:
          "Changez la langue de l'interface, ajoutez des langues et définissez la langue par défaut.",
        prompts: {
          addLanguage: {
            label: 'Ajouter une langue',
            text: "Ajoute l'espagnol à mon application. Traduis l'interface et les messages du serveur, et ajoute l'espagnol au menu des langues.",
          },
          defaultLanguage: {
            label: 'Langue par défaut',
            text: "Fais du chinois simplifié la langue par défaut de l'application pour les personnes qui n'en ont pas choisi. Garde l'anglais disponible dans le menu des langues.",
          },
        },
      },
      theme: {
        title: 'Thèmes',
        description:
          'Ajustez les couleurs, les polices et la densité, et basculez entre clair et sombre.',
        prompts: {
          changeTheme: {
            label: 'Modifier un thème',
            text: 'Modifie le thème Compact : utilise le bleu comme couleur principale et augmente légèrement l’arrondi des angles. Conserve les polices, les tailles de texte et l’espacement compact actuels.',
          },
          newTheme: {
            label: 'Nouveau thème',
            text: 'Crée un thème Forêt avec le vert comme couleur principale, des arrière-plans doux, des angles modérément arrondis et des ombres discrètes.',
          },
        },
      },
    },
  },
  appearance: {
    title: 'Apparence',
    mode: 'Mode de couleur',
    preset: 'Thème',
    light: 'Clair',
    dark: 'Sombre',
    system: 'Système',
    themes: {
      default: 'Aéré',
      compact: 'Compact',
    },
  },
  app: {
    title: 'NocoCRM',
  },
  actions: {
    close: 'Fermer',
    save: 'Enregistrer',
    cancel: 'Annuler',
    confirm: 'Confirmer',
    language: 'Langue',
  },
  notices: {
    serverLocaleFallback:
      'Le serveur ne prend pas en charge cette langue ; les messages du serveur seront donc en anglais.',
    languageChangeFailed:
      'Impossible de changer de langue. Veuillez réessayer.',
  },
  account: {
    signOutFailed: 'Impossible de se déconnecter. Veuillez réessayer.',
    openMenu: 'Ouvrir le menu du compte',
    fallback: 'Compte',
    signOut: 'Se déconnecter',
    signingOut: 'Déconnexion…',
  },
  navigation: {
    home: 'Accueil',
    open: 'Ouvrir la navigation',
    close: 'Fermer la navigation',
    expand: 'Déplier la navigation',
    collapse: 'Replier la navigation',
    toggle: 'Déplier ou replier la navigation',
    label: "Navigation de l'application",
    description: 'Accédez à une page de cette application.',
    breadcrumb: "Fil d'Ariane",
    breadcrumbMore: 'Afficher les niveaux intermédiaires',
    back: 'Retour',
  },
  dataTable: {
    noResults: 'Aucun résultat.',
    sortAscending: 'Croissant',
    sortDescending: 'Décroissant',
    hideColumn: 'Masquer',
    view: 'Affichage',
    toggleColumns: 'Afficher les colonnes',
    selectedCount: '{{selected}} ligne(s) sélectionnée(s) sur {{total}}.',
    rowsPerPage: 'Lignes par page',
    pageOf: 'Page {{page}} sur {{pageCount}}',
    firstPage: 'Aller à la première page',
    previousPage: 'Aller à la page précédente',
    nextPage: 'Aller à la page suivante',
    lastPage: 'Aller à la dernière page',
  },
  datePicker: {
    placeholder: 'Choisir une date',
    rangePlaceholder: 'Choisir une période',
  },
  'Lead follow-up': 'Suivi des prospects',
  'Review everything a lead has now (the lead itself, its tasks, comments and related records in the CRM) and recommend the next step — keep following up, nurture, convert or invalid — with the reasons; when following up, say clearly how to follow up and what exactly to do. Use when a new lead comes in, when the user asks to follow up a lead or follow it up again, or asks "what should I do next with this lead".':
    "Examine tout ce dont dispose un prospect à l'instant (le prospect lui-même, ses tâches, ses commentaires et les fiches associées dans le CRM) et recommande l'étape suivante — poursuivre le suivi, mettre en maturation, convertir ou déclarer invalide — avec les raisons ; en cas de suivi, indique clairement comment suivre et quoi faire exactement. À utiliser à l'arrivée d'un nouveau prospect, lorsque l'utilisateur demande de suivre un prospect ou de le suivre à nouveau, ou demande « que dois-je faire ensuite avec ce prospect ».",
  'Opportunity follow-up': 'Suivi des opportunités',
  'Reviews everything about an opportunity as it now stands (the opportunity itself, the company, contacts and their roles, tasks, comments, approvals, the source lead) and judges whether its stage holds up and what to do next — advance to the next stage, keep at it in the current stage, pause, or mark it lost — with the reasons, risks and gaps to fill; when advancing, spells out exactly what to do. Use when a lead\'s conversion opens a new opportunity, when the outcome of an opportunity\'s task has been recorded, when the user asks for a follow-up, or when asked "what is the next step for this opportunity?".':
    "Examine tout ce qui concerne une opportunité dans son état actuel (l'opportunité elle-même, l'entreprise, les contacts et leurs rôles, les tâches, les commentaires, les approbations, le prospect d'origine) et juge si son étape tient et quoi faire ensuite — passer à l'étape suivante, poursuivre dans l'étape actuelle, mettre en pause ou la marquer comme perdue — avec les raisons, les risques et les lacunes à combler ; en cas d'avancement, précise exactement quoi faire. À utiliser lorsque la conversion d'un prospect ouvre une nouvelle opportunité, lorsque le résultat d'une tâche de l'opportunité a été enregistré, lorsque l'utilisateur demande un suivi, ou lorsqu'on demande « quelle est la prochaine étape pour cette opportunité ? ».",
  'Approval review': 'Analyse des approbations',
  'Helps an approver judge whether an approval request (discount, payment terms, contract terms, delivery commitment) is worth approving — how far the asked terms are from the standard, the effect on the amount and on collection, the opportunity\'s situation and the evidence supporting this concession, the other approvals submitted with it on the same opportunity, how earlier requests of the same kind were decided, the risks and what the applicant left unclear — then recommends approve, approve on conditions, reject or ask for more information, and drafts the decision comment. Use it after an approval is submitted, or when the approver asks "should this approval be approved?".':
    "Aide un approbateur à juger si une demande d'approbation (remise, conditions de paiement, clauses contractuelles, engagement de livraison) mérite d'être approuvée — l'écart entre les conditions demandées et la norme, l'effet sur le montant et sur l'encaissement, la situation de l'opportunité et les éléments qui justifient cette concession, les autres approbations soumises avec elle sur la même opportunité, la façon dont les demandes antérieures du même type ont été tranchées, les risques et ce que le demandeur a laissé flou — puis recommande d'approuver, d'approuver sous conditions, de refuser ou de demander des informations complémentaires, et rédige le commentaire de décision. À utiliser après la soumission d'une approbation, ou lorsque l'approbateur demande « faut-il approuver cette demande ? ».",
  'Task preparation': 'Préparation des tâches',
  "Prepares a salesperson for a task they are about to do with a customer (a call, a meeting, a visit, a demo) — what the task should achieve, where things stand from the record's tasks, comments and mail, who is on the other side and what part each plays, the questions to ask, what to bring, the risks, and the points to cover in order. Use it on the morning of a task, or when the task's owner asks to be prepared.":
    "Prépare un commercial à une tâche qu'il s'apprête à mener avec un client (un appel, une réunion, une visite, une démo) — ce que la tâche doit accomplir, où en sont les choses d'après les tâches, commentaires et e-mails de la fiche, qui se trouve en face et quel rôle chacun joue, les questions à poser, ce qu'il faut apporter, les risques et les points à aborder dans l'ordre. À utiliser le matin d'une tâche, ou lorsque le responsable de la tâche demande à être préparé.",
  flowDiagram: {
    configure: 'Configurer',
    overview: 'Aperçu du diagramme',
    actualSize: 'Taille réelle',
    states: 'États',
    transitions: 'Transitions',
    configurable: 'Paramètres',
    current: 'Actuel',
    visited: 'Parcouru',
    initial: 'Initial',
    final: 'Final',
    state: 'État',
    zoomOut: 'Zoom arrière',
    zoomIn: 'Zoom avant',
    fit: 'Ajuster à la vue',
    empty: 'Aucun état à afficher.',
    loading: 'Mise en page du diagramme…',
    failed: 'Impossible de mettre en page ce diagramme.',
    nodeHelp: 'Appuyez sur Entrée ou Espace pour sélectionner un état.',
    edgeHelp: 'Appuyez sur Entrée ou Espace pour sélectionner une transition.',
  },
  loginActivity: {
    heading: 'Du premier prospect à la signature.',
    description:
      'Votre équipe commerciale IA suit chaque prospect et chaque opportunité, prépare chaque rendez-vous et chaque approbation, et vous prenez la décision.',
    phases: {
      lead: 'Prospect',
      deal: 'Opportunité',
      won: 'Conclue',
    },
    participants: {
      rep: 'Sophie Bennett',
      leadAgent: 'Suivi des prospects IA',
      prepAgent: 'Préparation des tâches IA',
      dealAgent: 'Suivi des opportunités IA',
      approvalAgent: 'Analyse des approbations IA',
      manager: 'Daniel Brooks',
      customer: 'Emma Walsh',
    },
    capabilities: {
      capture: 'Saisie IA',
      followUp: 'Suivi IA',
      pipeline: 'Pipeline',
      prep: 'Préparation des tâches',
      mail: 'E-mail',
      approval: 'Approbations',
    },
    timeline: 'Chronologie',
    lead: {
      kind: 'Prospect',
      title: 'Emma Walsh / Northwind Logistics',
      need: 'Répartition de flotte, 200 camions · depuis un e-mail',
      grade: 'Niveau A',
    },
    deal: {
      kind: 'Opportunité',
      title: 'Plateforme de répartition de flotte (Entreprise)',
      company: 'Northwind Logistics',
      amount: '48 000 $',
      owner: 'Sophie Bennett',
      won: 'Gagnée',
    },
    leadStatuses: {
      new: 'Nouveau',
      working: 'En cours',
      converted: 'Converti',
    },
    stages: {
      qualification: 'Qualification',
      proposal: 'Proposition',
      negotiation: 'Négociation',
      won: 'Gagnée',
    },
    steps: {
      captured: {
        who: 'IA',
        what: 'a créé le prospect à partir d’un e-mail',
      },
      leadFollowUp: {
        who: 'Suivi IA',
        what: 'niveau A, appeler aujourd’hui à 15 h',
      },
      converted: {
        who: 'Sophie Bennett',
        what: 'a converti le prospect en opportunité',
      },
      prepared: {
        who: 'IA',
        what: 'a préparé la démo de demain sur leurs propres itinéraires',
      },
      replied: {
        who: 'Emma Walsh',
        what: 'pourrions-nous payer à 60 jours après facture ?',
      },
      dealFollowUp: {
        who: 'Suivi IA',
        what: 'passage en négociation ; les 60 jours exigent une approbation',
      },
      reviewed: {
        who: 'Analyse IA',
        what: 'approuver sous conditions',
      },
      approved: {
        who: 'Daniel Brooks',
        what: 'a approuvé le délai de 60 jours',
      },
      won: {
        who: 'Sophie Bennett',
        what: 'le contrat signé est revenu',
      },
    },
  },
  // The template's Settings copy, translated in ./settings/.
  settings: settingsFrFR,
  crm: crmFrFR,
};

export default frFR;
