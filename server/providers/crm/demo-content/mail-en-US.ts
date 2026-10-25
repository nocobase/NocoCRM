import type { DemoContent } from './types.js';

// The demo mailboxes' conversations in English (demo-mail.ts), by topic;
// their placeholders are filled with the dataset's people.
export const enMail: DemoContent['mail'] = {
  quotation: {
    subject: 'Quotation for {{deal}}',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nPlease find the quotation for {{deal}}: {{amount}} in total, including a year of upgrades and support. Let me know if anything needs adjusting.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThanks, we are reviewing it internally. One question: if we add 50 users in a second phase, does the same unit price apply?\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nYes, added users are priced the same, and within a year they can join the same contract. I will send you an estimate for the second phase.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: "Great. Once we have the estimate we will decide at Thursday's meeting and get back to you.\n\n{{customer}}",
      },
    ],
  },
  contractClause: {
    subject: '{{deal}}: contract terms',
    messages: [
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nOur legal team reviewed the contract and has two changes, to clause 7 on data ownership and to the wording of clause 12 on acceptance criteria. Could you confirm them?\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nBoth changes are fine: they adjust the wording only and touch neither the price nor the payment terms, so they need no internal approval on our side. I will send the updated contract tomorrow.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Thanks. If we can sign before the end of the month, our budget will make it too.\n\n{{customer}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThe updated contract is in your inbox, with both changes made as your legal team asked; once you confirm it we can arrange signing.\n\n{{owner}}',
      },
    ],
  },
  discount: {
    subject: 'Pricing for {{deal}}',
    messages: [
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nWe compared a few vendors. Yours fits our needs best, but it is above our budget. Is there any room on {{amount}}?\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nUnderstood. On a three-year term we can take 10% off the annual fee and extend onboarding training from two days to four. Would that work?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'A three-year term is possible. Let me check payment terms with finance; I will reply this week.\n\n{{customer}}',
      },
    ],
  },
  trialFeedback: {
    subject: '{{deal}}: trial feedback',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nYour trial has been running for two weeks. How is it going? Anything you got stuck on?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nGoing well: we have built the approval flow and our tables. Two questions: can it use our Microsoft 365 sign-in, and large imports sometimes time out.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nMicrosoft 365 sign-in is supported out of the box; our engineer will book a time with you tomorrow to set it up. Import time-outs usually mean the batches are too large, so let us try smaller ones.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Thanks, any time after 3 pm tomorrow works.\n\n{{customer}}',
      },
    ],
  },
  onboarding: {
    subject: '{{deal}}: getting started',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThank you for choosing us! Your onboarding consultant will contact you on Monday to plan the rollout.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThanks. One person from IT and one from the business side will work with you. See you on Monday.\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  budgetPaused: {
    subject: '{{deal}}: next steps',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nFollowing up after the last review: is there anything else you need from us?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nProcurement for this project has moved to the next budget cycle, so it is on hold for now. I will reach out as soon as the new cycle opens; we still prefer your solution.\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  firstReply: {
    subject: 'Your enquiry',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nI am {{owner}} and I look after your region. I saw your request on our website. Could we have a 30-minute call about how {{company}} works today and what you would like to change?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nSure, Thursday or Friday morning works. Mainly we want our administrative approvals in one system across our sites.\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  meeting: {
    subject: 'Demo meeting',
    messages: [
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nGood call last time. Our team would like a product demo: does next Tuesday afternoon suit you?\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nNext Tuesday at 2 pm works, online. I will prepare a demo around your use case. Who will attend?\n\n{{owner}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThe invitation is on its way. See you then.\n\n{{owner}}',
      },
    ],
  },
  pricing: {
    subject: 'Pricing question',
    messages: [
      {
        from: 'other',
        body: 'Hello,\n\nWe are evaluating systems for next year. Could you tell us how the Professional and Enterprise editions differ in price, and whether self-hosting is supported?\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nAttached are the price list and a feature comparison; both editions can be self-hosted. When your project starts next year, let us talk in detail.\n\n{{owner}}',
      },
    ],
  },
  internal: {
    subject: 'Discount approval for {{deal}}',
    messages: [
      {
        from: 'other',
        body: '{{owner}},\n\nThe customer on {{deal}} wants 10% off for three years. I have submitted the discount approval; could you look at it today? They want to decide this week.\n\n{{colleague}}',
      },
      {
        from: 'owner',
        body: 'Got it, I will reply this afternoon.\n\n{{owner}}',
      },
    ],
  },
  needsRecap: {
    subject: '{{deal}}: notes from our call',
    messages: [
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nThanks for your time today. Here is what I took away:\n1. Admissions enquiries, applications and offers should run in one system.\n2. Course scheduling checks conflicts by classroom, teacher and teaching hours.\n3. Notices to students and staff stay on your current channels for now.\n\nLet me know if I missed anything; I'll prepare the demo environment from this.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThe notes are right. One more thing: permissions should follow the school, so that each school sees only its own programmes and data.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nPer-school permissions are a matter of roles and data scopes; I will show them in the demo. Would next Tuesday or Wednesday afternoon suit you?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: "Wednesday at 2 pm works. I'll bring our head of academic affairs.\n\n{{customer}}",
      },
    ],
  },
  kickoff: {
    subject: '{{deal}}: project kickoff',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nWe have received the signed contract, thank you! The development team starts next Monday with a week of requirements and prototypes. The project plan is attached; could you confirm the contacts on your side?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nPlan received. Our IT team will handle day-to-day contact, and store operations will sign off the requirements. Does a kickoff meeting on Monday at 10 am work?\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: "It does; I'll send the invitation shortly. At the kickoff we will go through the milestones and acceptance criteria together.\n\n{{owner}}",
      },
    ],
  },
  declined: {
    subject: '{{deal}}: our decision',
    messages: [
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThank you for your support over the past weeks. The group has decided to build the distributor management system in-house with our own IT team, so we will not go ahead this time.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nI understand, and thank you for telling me plainly. If you can, I would love to know what weighed most in the decision; it helps us improve. Do get in touch whenever you need us.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: "Mostly that our IT team wants the system alongside the others it already maintains. On features, yours was very flexible, and we would be glad to look at you again for an independent project. Let's stay in touch.\n\n{{customer}}",
      },
    ],
  },
  renewalDeclined: {
    subject: '{{deal}}: renewal',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThe implementation services contract ends next month. Attached is a renewal proposal continuing the on-site support and quarterly reviews, {{amount}} in total.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThanks. Our own IT team now maintains the system on its own, so management has decided not to renew the implementation services this year; software upgrades and support continue as before. We will come back to you for new projects.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Understood, and thank you for a good year together. Upgrades and support are unaffected, and we carry on with phase two of the production management platform.\n\n{{owner}}',
      },
    ],
  },
  acceptance: {
    subject: '{{deal}}: acceptance',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThe system has run smoothly for two weeks. The acceptance report and test records are attached; could you arrange the sign-off?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThe acceptance report is signed and the scan is attached. Our inspectors love the mobile app; next we would like to bring the equipment register in as well.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: "Thank you! The register can extend the current app; I'll put a proposal together next week.\n\n{{owner}}",
      },
    ],
  },
  tenderWon: {
    subject: '{{deal}}: tender result',
    messages: [
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThe evaluation result has been published: your company has won the tender, and the formal award letter is in the post. Please prepare the contract; we will go through signing next week.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nWonderful news, thank you! I'll prepare the contract in the tender's format and send it for review by Wednesday. The implementation team is ready.\n\n{{owner}}",
      },
    ],
  },
  requirementGap: {
    subject: '{{deal}}: evaluation result',
    messages: [
      {
        from: 'other',
        body: "Hi {{owner}},\n\nAfter the trial the stores told us rostering happens mostly on phones, with offline clock-in and automatic hours. That is quite far from your proposal, so we won't take it further for now.\n\n{{customer}}\n{{company}}",
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nUnderstood; offline clock-in is not our strength. We will keep looking after the membership and supplier collaboration, and if the rostering needs change, we would be glad to talk again.\n\n{{owner}}',
      },
    ],
  },
  goLiveCheck: {
    subject: '{{deal}}: one month after go-live',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThe distributor portal has been live for a month. How is it going: are ordering and statements running smoothly for the distributors? Anything we should improve?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: "Hi {{owner}},\n\nGoing well, the distributors in the first regions use it every day now. Two small requests: statements exported as PDF, and a dashboard of this month's rebates on the home page.\n\n{{customer}}\n{{company}}",
      },
      {
        from: 'owner',
        body: "Noted; both can be configured. I'll have our implementation team go through the details with you next week.\n\n{{owner}}",
      },
    ],
  },
  competitorChosen: {
    subject: '{{deal}}: pilot decision',
    messages: [
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nFor the supply chain pilot we have decided to build it in-house with our own IT team, alongside systems they already maintain. Thank you for the work you put in.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThanks for letting me know, and good luck with the pilot. We remain fully behind the production management platform.\n\n{{owner}}',
      },
    ],
  },
  discovery: {
    subject: '{{deal}}: a few questions',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nA few questions about the inspection data dashboard: does the data come from your current inspection system or is it entered anew? Which measures matter? Roughly how many people will use it?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThe data syncs from the current inspection system. We mainly watch defect rate, inspection completion and time to close a finding; about 40 people, management and site leads, will use it. The budget is being requested separately and should be approved.\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  introduction: {
    subject: 'Enquiry about a safety training system',
    messages: [
      {
        from: 'other',
        body: "Hello,\n\nI'm {{customer}} from the safety department at {{company}}; a colleague recommended you. We want a safety training and exam system for our field and project staff and would like to understand feasibility and rough cost first.\n\n{{customer}}",
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nThanks for reaching out! Training, exams and certificates are quick to build on the platform. I'll send a similar customer's case study first; could we talk by phone tomorrow afternoon?\n\n{{owner}}",
      },
    ],
  },
  requirementCall: {
    subject: 'Patient follow-up app: requirements call',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nAbout the patient follow-up app you mentioned: could we set up a requirements call of about an hour? Would Thursday morning or Friday afternoon suit you?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nFriday at 3 pm works. I will ask the head nurse of our follow-up centre to join; she knows the current process best.\n\n{{customer}}\n{{company}}',
      },
    ],
  },
  questionnaire: {
    subject: '{{deal}}: requirements questionnaire',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nTo estimate the dashboard plugin accurately, here is a short questionnaire on data sources, metric definitions and refresh frequency. Could you fill it in when you have a moment?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThe questionnaire is filled in and attached. One addition: a nightly sync of admissions data is enough, but the head of admissions wants to see it on the phone too.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Thanks, phones are no problem. We will send the quotation on Monday.\n\n{{owner}}',
      },
    ],
  },
  pocSetup: {
    subject: '{{deal}}: proof-of-concept environment',
    messages: [
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nThe proof-of-concept environment is ready; I'll send the address and accounts separately. I suggest importing one branch's sample data first to check the performance rules.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nWe are in. We imported three branches from the eastern region and the results match our manual checks. Next we would like to test report performance with 50,000 rows.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: "Sure, I'll have our engineers prepare a load test and send you the results by Thursday.\n\n{{owner}}",
      },
    ],
  },
  proposalFollowUp: {
    subject: '{{deal}}: proposal',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThank you for joining the demo last week. Attached is the proposal for the supplier collaboration portal: features, implementation plan and the price of {{amount}}.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: "Hi {{owner}},\n\nWe've read it and it meets our expectations. The plan says ten weeks; could it be eight? We would like to launch before our year-end supplier conference.\n\n{{customer}}\n{{company}}",
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nIf supplier onboarding and statements run in parallel, eight weeks is feasible, provided your side sets aside half a day a week for acceptance. I'll send the revised plan.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: "Agreed, we'll have someone every Wednesday afternoon. Looking forward to the new plan.\n\n{{customer}}",
      },
    ],
  },
  deploymentRequirements: {
    subject: '{{deal}}: self-hosted environment',
    messages: [
      {
        from: 'other',
        body: "Hi {{owner}},\n\nI'm {{customer}} from IT at {{company}}. We'd like to prepare servers for the self-hosted deployment early. What configuration do you recommend? We can provide PostgreSQL 14 and a Kubernetes cluster for this project.\n\n{{customer}}",
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nThat environment works as it is: two application replicas with 4 cores and 8 GB each, and PostgreSQL 14 is fully supported. I'll ask our engineers to send the detailed deployment guide.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: "Thanks, we'll request the resources on that basis.\n\n{{customer}}",
      },
    ],
  },
  securityReview: {
    subject: '{{deal}}: information security review',
    messages: [
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nBefore purchasing we need an information security review. Attached is our questionnaire, mostly on encryption, audit logs and database support; could you reply within a week?\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThe questionnaire is filled in and attached. In short: audit logs cover sign-ins, data changes and permission changes, and we can provide our security certification documents.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Received; our security team is reviewing it and I will come back with any questions.\n\n{{customer}}',
      },
    ],
  },
  vendorOnboarding: {
    subject: 'Supplier registration documents',
    messages: [
      {
        from: 'other',
        body: "Hi {{owner}},\n\nBefore signing we need to register you as a supplier. Please upload your business registration, bank details and last year's tax certificate to our procurement portal.\n\n{{customer}}\n{{company}}",
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThe documents are uploaded to the portal; could you check that everything is there?\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Approved. The portal will send you your supplier number shortly.\n\n{{customer}}',
      },
    ],
  },
  supportQuestion: {
    subject: 'A question about permissions',
    messages: [
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThe delivery workbench is working well. One question: we want project managers to see only their own projects, but after we set a data scope on their role they cannot open the project list at all.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nThe list most likely also needs the View permission, with the scope set to records they own. I'll send screenshots of the steps; if it still fails we can look at it together remotely.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: 'Followed the steps and it works now, thanks!\n\n{{customer}}',
      },
    ],
  },
  invoice: {
    subject: '{{deal}}: invoice details',
    messages: [
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nThe first payment is in approval. Please issue the invoice with the billing details attached, quoting the contract number.\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nNoted; the invoice goes out this week and I'll email you the electronic copy first.\n\n{{owner}}",
      },
    ],
  },
  clientProject: {
    subject: '{{deal}}: licence and go-live',
    messages: [
      {
        from: 'other',
        body: "Hi {{owner}},\n\nThe branch performance project for our bank client now runs end to end in the validation environment, and the client plans to go live early next month. Two questions: can this project's licence be invoiced before the year end, and if the client adds two more branches within a year of going live, do they need another licence?\n\n{{customer}}\n{{company}}",
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nWe can sign this month and invoice before the year end. Licences are per server, so more branches on the same servers need no extra licence, and the quote of {{amount}} stands. I'll send the formal quotation tomorrow.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: 'Thanks. Once we have the quotation it goes through our internal approval, which takes about a week.\n\n{{customer}}',
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nThe quotation is in your inbox. If the approval needs anything more from us, just let me know.\n\n{{owner}}',
      },
    ],
  },
  reconciliation: {
    subject: '{{deal}}: daily dealer statements',
    messages: [
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nAs Victoria asked, we're changing the dealer statements to be generated automatically every night, for dealers to confirm in the portal the next day. Only how the statements are produced changes; orders and prices stay as they are. The test environment is ready for your acceptance check.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: 'Hi {{owner}},\n\nWe checked the test environment and the figures match our manual reconciliation. One thing: returns should count on the day they are returned, not on the original order date. Could you adjust that?\n\n{{customer}}\n{{company}}',
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nReturns now count on their return date, and the test environment is updated. Once you confirm, we'll release it at the weekend.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: 'Accepted; please go ahead.\n\n{{customer}}',
      },
    ],
  },
  dataSecurity: {
    subject: '{{deal}}: data security clause',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nAs discussed, the revised contract adds clause 9 on data security: the data stays in your own data centre, our engineers access it remotely only with your authorisation and in your presence, and every action is kept in the audit log. Please review it.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: "Hi {{owner}},\n\nThe clause is in the right direction, but two points need adding: how data is returned and destroyed when the service ends, and your staff's confidentiality obligations when people change roles. We'd like to go through it with your legal team in person.\n\n{{customer}}\n{{company}}",
      },
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nWe agree to add both. Our legal team is free over the next two days; please choose the time.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: 'Then the day after tomorrow in the afternoon. Please send the added wording before the meeting.\n\n{{customer}}',
      },
    ],
  },
  interviewPrep: {
    subject: '{{deal}}: preparing the interview',
    messages: [
      {
        from: 'other',
        body: "Hi {{owner}},\n\nAttached are the three quality check forms our feed mills use today: incoming raw materials, in-process sampling and finished goods release. The quality department would like the results linked with the farms' data, so that a batch problem can be traced back to the farms that used it.\n\n{{customer}}\n{{company}}",
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nThanks for the forms. We've drafted a question list from them: how check items are configured, how non-conforming goods are handled, and how batches map to farms. It's below, and we'll go through it item by item at the interview.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: "We've read the list. The quality department and the managers of two feed mills will join us.\n\n{{customer}}",
      },
    ],
  },
  leadMigration: {
    subject: 'Moving orders and stock data',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nHere are the import templates, one for orders and one for stock. Pick a month of data, fill in the templates, and we will import it and look at the result together.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: "Hi {{owner}},\n\nSeptember's orders and stock are in the templates, about 3,000 rows. Some dealers' names are spelt differently; can the import merge them automatically?\n\n{{customer}}\n{{company}}",
      },
    ],
  },
  leadTechnical: {
    subject: 'Plugin development and source code',
    messages: [
      {
        from: 'other',
        body: "Hello,\n\nI'm {{customer}}, head of engineering at {{company}}. Two questions: can plugins we build be packaged and delivered to our clients for their own deployments? And does the client project licence include source code?\n\n{{customer}}",
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nYour plugins can be packaged and delivered with the application, and the client project licence includes the source rights delivery needs; the licence agreement sets out the scope, and I'll send you a sample.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: "Got the agreement, thanks. We'll study it and come back with any questions.\n\n{{customer}}",
      },
    ],
  },
  leadBudget: {
    subject: 'Which edition for a small team',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nFor a team of 20 covering customers, projects and reports, Standard with our templates is a good start, upgrading as you need. The quotation is attached.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: "Hi {{owner}},\n\nIt's a bit above our department budget. We're a small team; could we pay in instalments, or start with one year to see how it goes?\n\n{{customer}}\n{{company}}",
      },
    ],
  },
  nurtureCheckIn: {
    subject: 'How is the trial going?',
    messages: [
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nIt's been a while; how is the Community edition working for you? The new release adds an approval centre to workflows, which may help in your case.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: "Hi {{owner}},\n\nStill using it, and the processes we tested all work. Our internal project should be approved next month; I'll come to you about a commercial edition right after.\n\n{{customer}}\n{{company}}",
      },
    ],
  },
  nurtureCase: {
    subject: 'A case study from real estate',
    messages: [
      {
        from: 'owner',
        body: 'Hi {{customer}},\n\nA quarterly hello. Attached is a case study from a real estate customer who runs construction progress and supplier management on NocoBase, live for three months now. It may help your research.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: "Thanks, it's very relevant; I'll pass it to our engineering department. Let's talk next quarter.\n\n{{customer}}",
      },
    ],
  },
  jobSeeker: {
    subject: 'Freelance development',
    messages: [
      {
        from: 'other',
        body: 'Hello,\n\nI have three years of experience building NocoBase plugins. My CV is attached; do you have any freelance or contract development work?\n\n{{customer}}',
      },
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nThanks for your interest! I work in sales, so I've passed this to our recruiting team, who will contact you directly.\n\n{{owner}}",
      },
    ],
  },
  bounce: {
    subject: 'Your system needs at {{company}}',
    messages: [
      {
        from: 'owner',
        body: "Hi {{customer}},\n\nI'm {{owner}} from NocoBase. I saw the contact details you left on our website and would like to hear about your company's system needs.\n\n{{owner}}",
      },
      {
        from: 'postmaster',
        subject: 'Undeliverable: {{subject}}',
        body: "Your message couldn't be delivered to:\n\n{{address}}\n\nReason: the recipient address does not exist (550 5.1.1).\n\nMail Delivery System",
      },
    ],
  },
  discountPrep: {
    subject: '{{company}}: discount request',
    messages: [
      {
        from: 'owner',
        body: "{{colleague}},\n\nOn {{deal}} for {{company}}, the customer wants to come down from {{amount}}. I'd request 10% off for a three-year term plus two extra training days. Does that look right? I'll submit the approval today.\n\n{{owner}}",
      },
      {
        from: 'other',
        body: "Fine, a three-year discount is within the standard. Spell out the delivery cost of the extra training days, and attach the customer's budget note to the approval.\n\n{{colleague}}",
      },
    ],
  },
  forecast: {
    subject: "This week's forecast",
    messages: [
      {
        from: 'owner',
        body: '{{colleague}},\n\nBy Friday please update the deals that may close this month: stage, expected close date and risks, especially {{company}}.\n\n{{owner}}',
      },
      {
        from: 'other',
        body: '{{owner}},\n\nDone. The contract terms with {{company}} are mostly settled and the changes from their legal team are made; we expect to sign by month end.\n\n{{colleague}}',
      },
    ],
  },
  handover: {
    subject: '{{company}}: two leads',
    messages: [
      {
        from: 'other',
        body: '{{owner}},\n\nTwo leads came in from {{company}}, one from the business lead and one from the technical lead, about the same client project. Shall we merge them and have you follow up on both?\n\n{{colleague}}',
      },
      {
        from: 'owner',
        body: "{{colleague}},\n\nSure, I'll merge them and bring in presales for the technical questions.\n\n{{owner}}",
      },
    ],
  },
  newsletter: {
    subject: 'Low-Code Weekly, issue 86',
    messages: [
      {
        from: 'other',
        body: 'In this issue:\n\n· How companies weigh the total cost of a low-code platform\n· Three ways AI employees fit into the sales process\n· Case study: a manufacturer replaced ten spreadsheets in three months\n\nRead the full issue on our website. You can unsubscribe at any time.\n\nThe Low-Code Weekly team',
      },
    ],
  },
  eventInvite: {
    subject: 'Invitation: Enterprise Digital Summit 2026',
    messages: [
      {
        from: 'other',
        body: 'Dear {{owner}},\n\nYou are invited to the Enterprise Digital Summit 2026 in Shanghai on 20 November, on the theme "AI and business systems". Places are limited; please register by the end of this month.\n\nThe Summit Committee',
      },
    ],
  },
  release: {
    subject: 'Product update: release notes',
    messages: [
      {
        from: 'other',
        body: 'Hi all,\n\nThe new release is out today. What sales should know:\n1. Workflows gain an approval centre.\n2. AI employees accept file uploads.\n3. Enterprise clustered deployment is simpler.\n\nThe details are in the internal knowledge base; feel free to quote them to customers.\n\nThe Product Team',
      },
    ],
  },
  officeNotice: {
    subject: 'Office network maintenance',
    messages: [
      {
        from: 'other',
        body: 'Hi everyone,\n\nThe office network is under maintenance from 10 pm Saturday to 6 am Sunday. VPN and internal systems will be unavailable; please plan your work accordingly.\n\nOffice Administration',
      },
    ],
  },
};

// Who sends the mail that concerns no record, and the bounces.
export const enMailSenders: DemoContent['mailSenders'] = {
  newsletter: {
    name: 'Low-Code Weekly',
    address: 'newsletter@lowcode-weekly.example',
  },
  events: {
    name: 'Enterprise Digital Summit',
    address: 'invite@digital-summit.example',
  },
  product: { name: 'Product Team', address: 'product@demo.example' },
  office: { name: 'Office Administration', address: 'office@demo.example' },
  postmaster: {
    name: 'Mail Delivery System',
    address: 'postmaster@demo.example',
  },
};
