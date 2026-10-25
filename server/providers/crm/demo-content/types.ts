import type { ApprovalReview } from '../approval-review.js';
import type { OpportunityVerdict, Verdict } from '../ai-entries.js';
import type { TaskPreparation } from '../task-preparation.js';

// Every piece of text the demo dataset writes, in one language, with what
// is derived from a name (the demo accounts' usernames, mailboxes, website
// and email domains), so each language has people and companies of its own.
// The data that is neither (amounts, days, stages, option values, phone
// numbers) lives in demo.ts and is shared by every language; each list here
// follows the order of the matching list there.

// The part a demo account plays: the manager owns records and decides the
// importing administrator's approvals, the second manager is a manager
// besides, and the two sellers own the rest; the importer decides the
// sellers' and the manager's approvals (demo.ts).
export type DemoSeat =
  'manager' | 'secondManager' | 'firstSeller' | 'secondSeller';

export interface DemoAccountText {
  // 3 to 30 lowercase letters, digits, underscores or dots, and at least 5
  // long: the password is the username followed by 123, at least 8.
  readonly username: string;
  readonly name: string;
}

export interface DemoPerson {
  readonly name: string;
  // The local part of the person's email address.
  readonly mailbox: string;
}

export type DemoCity =
  | 'beijing'
  | 'shanghai'
  | 'nanjing'
  | 'suzhou'
  | 'hangzhou'
  | 'guangzhou'
  | 'shenzhen'
  | 'chengdu';

export interface DemoCompany {
  // The company's name.
  readonly name: string;
  // The email addresses' domain, before .example: the demo's people never
  // get a real company's address.
  readonly domain: string;
  // The company's real website.
  readonly website: string;
  // The company's real LinkedIn page, where one was found to be its own;
  // left out otherwise rather than guessed.
  readonly linkedin?: string;
  readonly description: string;
  // The street address, over two lines.
  readonly address: string;
}

export interface DemoLead {
  readonly name: string;
  // The local part of the lead's email address.
  readonly mailbox: string;
  readonly company: string;
  // The lead's original message.
  readonly message: string;
  // What research found about the lead's company, and where the lead
  // works: the long texts of its particulars.
  readonly companyDescription: string;
  readonly address: string;
}

export interface DemoNamedText {
  readonly name: string;
  readonly description: string;
}

// The demo mailboxes' conversations (demo-mail.ts), each written once and
// filled with the dataset's own people: {{customer}} the customer's name,
// {{company}} their company, {{deal}} the opportunity, {{amount}} its
// amount, {{owner}} the mailbox's owner, {{colleague}} the other side of an
// internal exchange.
export type DemoMailTopic =
  // With a deal's contact.
  | 'quotation'
  | 'contractClause'
  | 'discount'
  | 'trialFeedback'
  | 'onboarding'
  | 'budgetPaused'
  | 'needsRecap'
  | 'kickoff'
  | 'declined'
  | 'renewalDeclined'
  | 'acceptance'
  | 'tenderWon'
  | 'requirementGap'
  | 'goLiveCheck'
  | 'competitorChosen'
  | 'discovery'
  | 'introduction'
  | 'requirementCall'
  | 'questionnaire'
  | 'pocSetup'
  | 'proposalFollowUp'
  | 'deploymentRequirements'
  | 'securityReview'
  | 'vendorOnboarding'
  | 'supportQuestion'
  | 'invoice'
  | 'clientProject'
  | 'reconciliation'
  | 'dataSecurity'
  | 'interviewPrep'
  // With a lead.
  | 'firstReply'
  | 'meeting'
  | 'pricing'
  | 'leadMigration'
  | 'leadTechnical'
  | 'leadBudget'
  | 'nurtureCheckIn'
  | 'nurtureCase'
  | 'jobSeeker'
  | 'bounce'
  // Between colleagues.
  | 'internal'
  | 'discountPrep'
  | 'forecast'
  | 'handover'
  // Mail every salesperson gets that concerns no record.
  | 'newsletter'
  | 'eventInvite'
  | 'release'
  | 'officeNotice';

// Who sends the mail that concerns no record, and the delivery system's
// bounces.
export type DemoMailSender =
  'newsletter' | 'events' | 'product' | 'office' | 'postmaster';

export interface DemoMailThread {
  readonly subject: string;
  // In order; who wrote each: the mailbox's owner, the other side, or the
  // delivery system returning the message before it. A message's own
  // subject replaces the reply's; {{subject}} is the thread's.
  readonly messages: readonly {
    readonly from: 'owner' | 'other' | 'postmaster';
    readonly subject?: string;
    readonly body: string;
  }[];
}

// A task done, named by what was to be done, with its result.
export interface DemoDoneTask {
  readonly name: string;
  readonly result: string;
}

export interface DemoContent {
  // The manifest's label for the import.
  readonly label: string;
  // The demo accounts.
  readonly accounts: Readonly<Record<DemoSeat, DemoAccountText>>;
  readonly cities: Readonly<Record<DemoCity, string>>;
  // The eight companies, by index.
  readonly companies: readonly DemoCompany[];
  // Each company's two contacts: the decision maker, then the technical one.
  readonly people: readonly (readonly [DemoPerson, DemoPerson])[];
  readonly contactJobTitles: readonly [string, string];
  readonly contactComments: readonly [string, string];
  // The comments on the company that churned.
  readonly churnComments: string;
  // What took place with each of the eight companies, oldest first, written
  // as comments on its timeline by its owner, some answered by a colleague.
  readonly companyNotes: readonly (readonly DemoNote[])[];
  // The opportunities' names, by index.
  readonly deals: readonly string[];
  readonly leads: readonly DemoLead[];
  // A lead's job title: even positions, then odd ones.
  readonly leadJobTitles: readonly [string, string];
  // The description every demo task carries.
  readonly taskDescription: string;
  // The two tasks placed on the first leads.
  readonly discoveryCall: { readonly name: string; readonly feedback: string };
  readonly productDemo: { readonly name: string; readonly feedback: string };
  // The tasks done on the first two leads before they were converted, and
  // the one done on each invalid lead before it was set aside, with what
  // came of it.
  readonly convertedLeadTasks: readonly [
    readonly DemoDoneTask[],
    readonly DemoDoneTask[],
  ];
  readonly invalidLeadTasks: readonly [DemoDoneTask, DemoDoneTask];
  // The matters of the completed and planned tasks on the first deals.
  readonly completedMatters: readonly string[];
  readonly completedFeedback: readonly string[];
  readonly plannedMatters: readonly string[];
  // Today's two late-evening tasks.
  readonly eveningCall: string;
  readonly ssoConfirmation: string;
  // The matter of a lead's task, by its status.
  readonly leadTaskMatters: {
    readonly completed: string;
    readonly cancelled: string;
    readonly planned: string;
  };
  readonly leadTaskFeedback: string;
  // The steady cadence of tasks around the hand-placed ones.
  readonly cadenceMatters: readonly string[];
  readonly cadenceFeedback: readonly string[];
  readonly mail: Readonly<Record<DemoMailTopic, DemoMailThread>>;
  readonly mailSenders: Readonly<
    Record<DemoMailSender, { readonly name: string; readonly address: string }>
  >;
  // What a reply's subject begins with.
  readonly replyPrefix: string;
  readonly approvals: {
    readonly discount: DemoNamedText;
    readonly paymentTerms: DemoNamedText & { readonly comment: string };
    readonly contractTerms: DemoNamedText;
    readonly commitment: DemoNamedText;
  };
  // The importing administrator's own projects (projects-*.ts).
  readonly projects: DemoProjects;
  // The company's WhatsApp numbers and their conversations (whatsapp-*.ts).
  readonly whatsapp: DemoWhatsApp;
}

// The demo's WhatsApp numbers (demo-whatsapp.ts): their business names, in
// the order of the numbers there, and the conversations, in the order of
// the schedule there, each message's text in the order of that
// conversation's messages. A customer linked to a record
// takes the record's name; one nobody linked shows the profile name or the
// username WhatsApp gives.
export interface DemoWhatsApp {
  readonly displayNames: readonly [string, string];
  readonly conversations: readonly {
    readonly profileName?: string;
    readonly username?: string;
    readonly messages: readonly string[];
  }[];
  // The pictures and files some messages carry (demo-whatsapp.ts `media`),
  // the message's text their caption.
  readonly files: DemoWhatsAppFiles;
}

// A picture or file a demo customer sends: its name when WhatsApp gives one
// (a document's; a photo has none), its type, and its bytes.
export interface DemoWhatsAppFile {
  readonly filename: string | null;
  readonly mimeType: string;
  readonly base64: string;
}
export type DemoWhatsAppFileKey =
  'inspection' | 'sample' | 'loadTest' | 'resume';
export type DemoWhatsAppFiles = Readonly<
  Record<DemoWhatsAppFileKey, DemoWhatsAppFile>
>;

// A person at one of the importer's project companies.
export interface DemoProjectPerson extends DemoPerson {
  readonly jobTitle: string;
}

// A comment as the demo writes it: what took place, then what came of it.
export interface DemoComment {
  readonly heading: string;
  readonly body: string;
}

// A comment on one of the eight companies, and a colleague's reply to it.
export interface DemoNote extends DemoComment {
  readonly reply?: string;
}

// The importing administrator's own projects, at real companies, so that the
// account importing the demo shows every part of the CRM at work: a new lead
// the AI has just followed up, a converted lead whose deal is at proposal
// with an approval out and a meeting the AI prepared, a deal in negotiation
// with an overdue task, and a won customer with an expansion under way. The
// AI's results are written here as the cards keep them, so the import needs
// no model. Each project's company is named for real; its people, its
// exchanges and the deal are the demo's own. The record layout (stages,
// days, amounts) is demo.ts's.
export interface DemoProjects {
  // The lead from SF Express, new and followed up by the AI.
  readonly sf: {
    readonly company: string;
    readonly domain: string;
    readonly person: DemoProjectPerson;
    readonly message: string;
  };
  // H World: the lead that became a deal at proposal.
  readonly hworld: {
    readonly company: DemoCompany;
    // The decision maker (who wrote the lead), the evaluator, and the
    // buyer the AI proposes adding to the deal.
    readonly people: readonly [
      DemoProjectPerson,
      DemoProjectPerson,
      DemoProjectPerson,
    ];
    readonly message: string;
    readonly deal: string;
    // Done on the lead before it was converted, its result written.
    readonly leadTask: DemoDoneTask;
    readonly discovery: DemoComment;
    readonly poc: DemoComment;
    // Done two days ago, its result written.
    readonly quoteSent: DemoComment;
    // Tomorrow's meeting, which the AI prepared.
    readonly review: string;
    readonly reviewDescription: string;
    readonly approval: DemoNamedText;
    // The manager's comment @-mentioning the importer, {{name}} their name.
    readonly mention: string;
  };
  // GAC: a deal in negotiation.
  readonly gac: {
    readonly company: DemoCompany;
    readonly people: readonly [DemoProjectPerson, DemoProjectPerson];
    readonly deal: string;
    // The task the AI's accepted follow-up planned, done since.
    readonly alignment: DemoComment;
    readonly legal: DemoComment;
    // Overdue since yesterday.
    readonly signing: string;
    // Today's.
    readonly followLegal: string;
    readonly approval: DemoNamedText & { readonly comment: string };
    // The importer's comment, and the manager's reply to it.
    readonly note: string;
    readonly reply: string;
  };
  // New Hope: won, and an expansion at qualification.
  readonly newHope: {
    readonly company: DemoCompany;
    readonly people: readonly [DemoProjectPerson, DemoProjectPerson];
    readonly deal: string;
    readonly expansion: string;
    readonly kickoff: DemoComment;
    readonly training: DemoComment;
    readonly interview: string;
    // The task the manager assigns the importer.
    readonly renewal: string;
  };
  // The importer's conversations with the CRM's assistant, oldest
  // first: what they asked and what it answered, written in as the chat
  // keeps them (demo.ts).
  readonly chats: readonly DemoChat[];
  // What the AI found on the web about the projects' companies, as their
  // Signals tabs keep them (company-signals.ts): written straight in, so
  // the demo shows them without a model. Only real, neutral news a search
  // found, with its real sources.
  readonly signals: readonly DemoSignal[];
  // The AI's results, as each card keeps them.
  readonly ai: {
    readonly sfLead: Verdict;
    readonly hworldLead: Verdict;
    readonly hworldDeal: OpportunityVerdict;
    readonly hworldPrep: TaskPreparation;
    readonly gacDeal: OpportunityVerdict;
    readonly newHopeExpansion: OpportunityVerdict;
    // The sellers' and the manager's approvals the importer decides.
    readonly reviewDiscount: ApprovalReview;
    readonly reviewContract: ApprovalReview;
    readonly reviewPayment: ApprovalReview;
  };
}

// A conversation with the assistant: its title, and its messages in order,
// the person's first.
export interface DemoChat {
  readonly title: string;
  readonly messages: readonly {
    readonly role: 'user' | 'assistant';
    readonly text: string;
  }[];
}

// A company signal of the demo: a real event a search found, with its real
// date and sources (never an invented one: these are real companies), how
// many days before the import it was found, and whether it is still new.
export interface DemoSignal {
  // A project's company by its key, or one of the other demo companies by
  // its index in the language's `companies` (demo.ts).
  readonly company: 'hworld' | 'gac' | 'newHope' | number;
  readonly type: 'funding' | 'hiring' | 'leadership' | 'business' | 'risk';
  readonly title: string;
  readonly summary: string;
  readonly occurredOn: string;
  readonly foundDaysAgo: number;
  // As found: nobody has dismissed it.
  readonly status: 'new';
  readonly sources: readonly { title: string; url: string; site: string }[];
}
