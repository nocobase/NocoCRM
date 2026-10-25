import type { DemoContent } from './types.js';
import { enWhatsAppFiles } from './whatsapp-files-en-US.js';

// The demo's WhatsApp conversations in English (demo-whatsapp.ts), in the
// order of its schedule.
export const enWhatsApp: DemoContent['whatsapp'] = {
  displayNames: ['NocoBase Sales', 'NocoBase International'],
  files: enWhatsAppFiles,
  conversations: [
    // Shanghai Electric's decision maker, about the deal at proposal.
    {
      messages: [
        "Hello, this is Sarah Collins from Shanghai Electric's information centre. I picked up your brochure at the industrial expo.",
        'Hi Sarah, thanks for your interest in NocoBase. Could you tell me what you are looking to solve?',
        'Our plants still have shift leaders filling in production reports in Excel, and month-end reconciliation is painful.',
        'Equipment inspections are on paper too, and the problems found are never followed through.',
        'Understood. Those are the two things our manufacturing customers build most often. Reports can be totalled by shift the same day, and scanning an equipment QR code opens its checklist, with any fault becoming a to-do until it is closed.',
        'Could we schedule an online demo next week? I can show you a case from an auto parts plant.',
        "Sure, Tuesday at 10 am. I'll bring in Mr Liu, the production manager.",
        "Great, I'll email you the meeting link shortly.",
        "We've seen the demo. Mr Liu was quite interested, especially in the production dashboard.",
        'He asks whether downtime can be shown by line and by shift.',
        "Yes. Downtime records carry the line and the shift, and the dashboard groups by both. I'll add one in the demo environment for you.",
        "Done. I've emailed you the login so you can try it yourselves.",
        "Got it. We'll have two shift leaders try it over the next few days.",
        'The shift leaders say reporting on the phone works well, but there are too many options for defect causes.',
        'That can be configured per line, so each line only sees its own common causes.',
        "That's good.",
        'One hard requirement on our side: the system must run in our own data centre, not on a public cloud.',
        'No problem. We support on-premises deployment, and the Enterprise edition runs as a cluster, so three plants at once is fine.',
        'Every change must leave an audit log. Group audit checks it every year.',
        'The Enterprise edition has audit logs: who changed which record and when, with the values before and after.',
        'Good. I need both in our project paperwork. Could you send a technical note?',
        'The technical note is in your inbox, with the deployment diagram and the audit log details.',
        'Another question: we have nearly three years of production reports in Excel. Can they be imported?',
        "Yes, they can be bulk-imported once arranged to a template. Send me a sample file and we'll try an import first.",
        "Here's a sample: plant one's data from last year.",
        "The trial import is done: 120,000 rows in under two minutes. About 300 rows have irregular shift values; I've sent you the list.",
        "That fast. We'll fix the irregular ones ourselves.",
        'Group holds an IT review next week. Could you prepare a formal proposal?',
        'Sure. Phase one covers production reporting and inspections for twelve lines in three plants, with phase two connecting MES and ERP in the roadmap. Does that work?',
        'Yes. No price for phase two yet, just the approach.',
        'Understood.',
        "By the way, compared with the other two vendors, what's your biggest difference? The review will certainly ask.",
        "Three things mainly: you can change the data model and the pages yourselves, so later needs don't always go back to a vendor; it runs on-premises with the source under your control; and it's licensed per server, not per user, so a large workforce across three plants doesn't keep raising the cost.",
        "Per-server licensing matters a lot. I'll stress that.",
        "We've read the draft. It's fine overall. Can implementation be done in two months?",
        'Two months for phase one is possible if the reporting forms and checklists are settled in the first week. We can send two consultants on site for a week.',
        'Is the on-site work charged separately?',
        'A week on site is included in the implementation service at no extra charge.',
        'Good.',
        'The review passed. Group has agreed to move to procurement.',
        'Next we need your formal quote; procurement will contact you.',
        "Great news, thank you for your support, Sarah! I'll have the quote ready in a couple of days and send it to you before procurement.",
        'The quote is in your inbox: Enterprise licences for three servers, plus phase-one implementation and first-year maintenance.',
        'Got it. How is maintenance charged from the second year?',
        "From the second year it's 18% of the licence fee a year, including upgrades and remote support on working days.",
        "Understood. I'll go over it with Mr Liu.",
        'Mr Liu wants a one-month pilot at plant one before going live.',
        "That's fine. We'll follow up on everything during the pilot, then roll out to the other two plants.",
        'Then please add the pilot plan to the proposal.',
        "I've sent the updated proposal, with the one-month pilot at plant one and its acceptance criteria.",
        'Hi, we got the proposal. Production wants to know first how many servers the on-premises deployment needs. Is there a list?',
        "Hi Sarah, for all three plants we estimate three application servers and one database server. I'll email you the detailed list today.",
        'Great, thanks.',
        "We've looked at the list. IT asks whether the database can run on the Dameng instance we already have. Could you check?",
        'Also, could you come to the plant next Wednesday afternoon to walk us through the plan?',
      ],
    },
    // United Family Healthcare's decision maker, about the contract.
    {
      messages: [
        'Our finance team would like the payment milestones in the contract to be 30/40/30.',
        "Noted. I'll check with my side and get back to you.",
        "Amanda, 30/40/30 works for us. I've emailed you the revised contract.",
        'Thanks, our legal team will review it this week.',
        'Sounds good. Message me if anything comes up.',
      ],
    },
    // The working lead from Tongwei.
    {
      messages: [
        'Sorry I missed your call today. About dealer reconciliation: we have six warehouses. Can the month-end statements be generated automatically?',
        'Hi Marcus, yes. It totals by dealer and by warehouse, and the month-end statement exports directly. We have a similar case with a feed distributor I could show you.',
        'Sure, Thursday at 2 pm works.',
      ],
    },
    // H World's IT director, the importer's own deal.
    {
      messages: [
        "Hi, this is Chen Lu from H World; we talked at the expo. We'd like to start with a POC.",
        'Hi Chen! Which parts would you like the POC to prove?',
        'Three flows: store inspections, maintenance work orders and franchisee repair requests.',
        'And performance: phase one alone is 2,000 stores in East China.',
        "Understood. We'll generate test data at 2,000 stores' volume and verify a cluster deployment too. Does that work?",
        "Yes. Cheng Hao handles the technical evaluation; I'll bring him in.",
        'Chen, the POC environment is ready and Cheng Hao has the logins.',
        "Good, he'll test it this week.",
        "Cheng Hao says inspections and work orders work end to end. For repairs he'd like a way for franchisees to submit their own requests.",
        "We can add a public repair form: franchisees submit without logging in, and a work order goes to their area's maintenance team automatically.",
        "That's good, please add it.",
        'The repair form is in; Cheng Hao can try it.',
        'The load test results are in: 2,000 stores inspecting at once, responses under a second.',
        'Cheng Hao is quite pleased.',
        "Great! We also verified failover in the cluster: losing one server doesn't interrupt anything.",
        'Audit logs are a must; group security will check. The Enterprise edition has them?',
        'Yes. Every change is recorded and can be searched by person, time or record, and exported for security.',
        'Good.',
        'The POC has passed. Next we need a quote.',
        'Scope is phase one in East China, with three years of maintenance.',
        "Noted. We'll quote the Enterprise edition with three years of maintenance.",
        'The first-year budget is tight. Is there room on price?',
        "I understand. I'll request a first-year discount and tell you as soon as I hear back. Until then I can't promise a figure.",
        "Understood, I'll wait to hear from you.",
        "I've submitted the discount request. The quote will be with you in a couple of days.",
        'OK, no rush, as long as we have it before the review.',
        "Shao Jia from procurement will join the review. She'll compare prices, so be prepared.",
        'Thanks for the heads-up! We can prepare a comparison with the other options if that helps.',
        'Yes, send it before the review.',
        'Got the quote. The review meeting is set for next Monday.',
        'Thanks, Chen. Would you like us to join the review remotely to walk through it?',
        'Yes please. Joy Shao from procurement will be there too, and will mostly ask about the three years of support.',
        'Could you send me the support SLA beforehand?',
      ],
    },
    // Someone nobody knows yet, by username alone.
    {
      username: 'kevin_zhou',
      messages: [
        'Hi, I found this number on your website. Can the community edition be used commercially?',
        "We're a design studio of 20 people and want to build a project management system.",
      ],
    },
    // A systems integrator abroad.
    {
      profileName: 'Ahmed Rahman',
      messages: [
        'Hello, we are a systems integrator in Dubai. Do you have a partner program for the Middle East?',
        "Hi Ahmed, yes we do. Could you tell me which industries you serve? I'll send you the details of our partner program.",
        'Mainly hospitals and logistics companies in the UAE and Saudi Arabia. We have about 30 engineers.',
        "That's a good fit: hospitals are one of our strongest areas. I've emailed you the partner program deck and the reseller terms.",
        "Thanks, I'll go through it with my partners.",
        "We read the deck. Two questions: is Arabic supported in the interface, and can it run fully offline in a customer's data centre?",
        'Arabic is supported, right to left included. And yes, it runs entirely on-premises, with no connection to us required.',
        "Great. Saudi hospitals often require data to stay in the country, so that's essential.",
        'Do partners get a discount on licences?',
        'Yes. Registered partners get a discount on licences, and higher tiers get more. The rates are in the reseller terms I sent.',
        'We have a hospital in Riyadh looking for an asset maintenance system. Could your platform handle medical equipment maintenance?',
        'Yes. Equipment registers, preventive maintenance plans and work orders are a common build. I can share a template you could start from.',
        'Please do.',
        'Sent. It covers equipment, maintenance plans, work orders and spare parts.',
        "My engineers tried the template. They want to know how hard it is to connect to the hospital's existing ERP.",
        "There's a REST API for every table, and workflows can call external APIs. Most ERP integrations take a few days of engineering.",
        'That sounds manageable.',
        "We'd like our team trained before we pitch to the hospital. Do you offer partner training?",
        'Yes, a three-day online course for partner engineers. The next one starts on the first of next month.',
        'Can you hold three seats for us?',
        'Done, three seats are reserved for your company.',
        'The hospital wants a proposal by the end of the month. Could we do a joint call with them next week?',
        'Happy to. Would Tuesday or Wednesday afternoon, Dubai time, work for them?',
        "Wednesday at 2 pm Dubai time. I'll send the invite. Could you also send a draft of the partner agreement before the call?",
      ],
    },
    // A job seeker, set aside as not a customer.
    {
      profileName: 'Leo',
      messages: [
        'Hi, are you still hiring implementation engineers? My CV is attached; could you pass it to whoever handles hiring?',
        'Hi Leo, our openings are on the Careers page of our website, where you can apply directly. This number is for customer enquiries only. Thanks!',
      ],
    },
    // H World's evaluator, about the POC's tests.
    {
      messages: [
        "Hi, this is Howard Cheng from H World's data platform team. Chen asked me to work with you directly on the POC.",
        'Hi Howard! The test environment logins are in your inbox. Message me here any time.',
        "I'm in. Can single sign-on with our membership system be connected in the test environment first?",
        'Yes, OIDC is supported. Just send me the test client ID and the callback address.',
        "I've emailed you the parameters.",
        'Single sign-on is connected. Try logging in with a membership account.',
        'Logging in works. Smooth.',
        "The load test script is ready. We'll simulate 2,000 hotels submitting inspections at the same time in the morning. Anything you need to do on your side?",
        "We'll scale the cluster to three servers and I'll watch the logs during the test. The day after tomorrow at 9 pm?",
        'OK.',
        'Starting the load test.',
        'I see it. Responses are all under 600 ms so far.',
        "Same here, better than expected. Let's test with one server down.",
        'One server is down; requests moved to the other two with no errors.',
        "Good. I'll write up a report for Chen.",
        'Thanks for your work! Let me know if the report needs our architecture diagram.',
      ],
    },
    // Intime's decision maker, the upgrade's contract being stamped.
    {
      messages: [
        'Legal has finished the contract and has no comments. It goes for stamping this week.',
        "Great, thank you Jessica! Send me the scan once it's stamped and I'll schedule the upgrade.",
        'Stamping is in the queue, probably early next week. Does the upgrade need downtime?',
        'No downtime. We run the upgrade after 10 pm and the stores work as usual the next day.',
        'Good, then the evening after the contract comes back.',
        'Noted. Our engineer will confirm the data backup with Michael the day before.',
      ],
    },
    // Digital China's technical manager, the client project's licence.
    {
      messages: [
        "Hi, the branch performance app we're building for a bank client is installed in the validation environment. How is the licence bound to a server?",
        "Hi Steven, the licence is bound to the server's machine code. Export it from the licence page in Settings and send it to me, and I'll generate the licence file.",
        "I've emailed you the machine code.",
        'The licence file is in your inbox. Import it and restart once, and it takes effect.',
        'Imported, all fine. The client asks whether the performance scores can be calculated automatically every month.',
        "Yes: a scheduled workflow works out the scores from the indicator formulas on the first of each month and writes them back. I'll put an example together for you.",
        'Great, thanks.',
        'The example is in your inbox: the scoring workflow and a monthly ranking table.',
      ],
    },
    // XJTLU's head of IT, after the converted lead brought her in.
    {
      messages: [
        "Hello, this is Lisa Warren from XJTLU's IT office. Ryan Cooper passed your proposal on to me.",
        'Hi Lisa! Could we find a time to talk about the admissions dashboard?',
        'Tomorrow afternoon works. What matters most to us is whether each programme’s application figures can update automatically every day.',
        "They can: a daily sync with the admissions system's API, and the dashboard grouped by programme and region. Tomorrow at 3 pm online, then.",
        'The registry would like to see the scheduling too. Could you demo it again next week?',
        "Of course. I'll prepare a scheduling demo focused on classroom clashes and teaching-hour limits. Would a morning next week suit?",
        'Any morning next week works; send me an invite once you pick one.',
        'Will do; the invite comes as soon as the time is set.',
      ],
    },
    // XGIMI's head of IT, after the upgrade went live.
    {
      messages: [
        'Since the upgrade the delivery workbench works well; the project managers say the board is much clearer.',
        'Great to hear, Rebecca! Let me know whenever something needs adjusting.',
        'Could we give our outside installation contractors accounts that only see the projects they are assigned?',
        "Yes: give the contractors a role whose data scope is the projects assigned to them, and open only a few fields. I'll write up the steps for you.",
        'Thanks, appreciated.',
        'The steps are in your inbox; the setup takes about ten minutes.',
        'The contractor accounts are set up and working. We may add an after-sales module at the end of the year; let’s talk then.',
        "Sounds good. Let's meet before the year end to map out the after-sales needs first.",
      ],
    },
    // NARI's head of IT: the platform paused, the dashboard going ahead.
    {
      messages: [
        "Hi, the platform's budget is still waiting for group approval, probably not before the first quarter next year.",
        "Understood, Melissa. We'll park the platform and pick up the original plan once it's approved.",
        'The inspection dashboard, though, fits our department’s own budget, so we can start that now.',
        "Good. Professional is enough for the dashboard; I'll send you a requirements list to confirm first.",
        'The requirements list looks fine. Also, our safety department wants a training and exam system. Could you quote it together?',
        "Yes, we have a ready template for safety training: Standard plus implementation gets it live. I'll send both quotes this week.",
      ],
    },
    // Guangzhou Restaurant's head of IT, on the dealer portal after it went live.
    {
      messages: [
        "Hi, about the dealer management system: we've decided to extend the existing portal for now rather than run it separately.",
        'Understood, Victoria. Whenever the portal needs extending, we’re here.',
        'Dealer orders on the portal have grown a lot lately, and month-end reconciliation is slow. Can it be improved?',
        "Yes: generate the statements every night, so dealers confirm them the next day. I'll have our engineer work it out with Paul.",
        'Good, Paul Jennings looks after the technical side; contact him directly.',
        "The statements are now generated every night, and Paul's team has signed it off.",
        'Got it, thanks.',
        'You’re welcome. Get in touch any time.',
      ],
    },
    // GAC's head of digital, the contract in legal review.
    {
      messages: [
        'We received the revised contract. Linda is still reviewing the data security clause.',
        'Thanks, Victor. Linda can come to us directly with any questions, and our legal team can join a call too.',
        'Linda would like to go through the clauses with your legal team in person.',
        "Of course. Our legal team is free the next two days; I'll arrange the time with Linda.",
        "We've been through the clauses and are largely aligned. Next week it goes for sign-off.",
        'Excellent, thank you Victor! Tell me if anything else is needed for the sign-off.',
      ],
    },
    // New Hope's project manager, before the expansion's interview.
    {
      messages: [
        'I emailed you the quality check forms yesterday. The head of our quality department will join the interview too.',
        "Got them, Frank, and they're very welcome. The interview takes about two hours; we'll send the question list first.",
        'The interview is at 10 am on the day we agreed. We’ll be waiting at the Chengdu headquarters.',
        'Great, two of us will be on site. Could the quality department look over a few items on the list beforehand?',
      ],
    },
    // A lead referred by United Family's head of IT.
    {
      messages: [
        'Hello, this is Laura Hughes from United Family’s IT department. Amanda Ross suggested I contact you.',
        'Hi Laura! Amanda mentioned your evaluation. Is there anything I should prepare first?',
        "I'd like to confirm on-premises deployment and single sign-on first. I've written the details in an email.",
        "I've replied by email: both are supported, with the deployment guide attached.",
      ],
    },
    // A delivery partner's lead, asking for the partner terms.
    {
      messages: [
        'Hi, this is Kevin Foster from Kingsoft Office. Could you send me your partner terms?',
        "Hi Kevin, they're in your inbox. Delivery partners can license per project.",
        'Read them. Per-project licensing suits us well. Our technical lead, Ethan Walsh, will be in touch.',
        "Great, I'll look out for Ethan.",
      ],
    },
    // A nurtured lead building a prototype on the community edition.
    {
      messages: [
        "Hi, we met at the expo. I'm building an R&D project management prototype on the community edition, and the sprint board is done.",
        'Hi Adam! Ask me any time you get stuck.',
        'Can subtasks be expanded on the board?',
        'Use a tree table: the board cards show the subtask count, and opening one shows the details. I’ve emailed you the setup.',
        "Thanks. Once the project's approved we'll talk properly.",
        'Sounds good, I look forward to it.',
      ],
    },
    // A nurtured lead collecting industry cases.
    {
      messages: [
        'Hi, could you send me a few property management case studies?',
        'Hi Megan, two case studies on property and construction management are in your inbox.',
        "Got them; they'll help with next year's planning.",
        "Great. I'll send you a new case study every quarter.",
      ],
    },
    // An invalid lead, looking for freelance work.
    {
      messages: [
        'Hi, I have two years of NocoBase plugin development experience. Do you have any freelance or contract work?',
        'Hello, thanks for your interest. We have no freelance openings at the moment; please follow the careers and partner pages on our website.',
      ],
    },
    // The delivery partner's technical lead, on plugin development.
    {
      messages: [
        "Hi, I'm Ethan Walsh, Kevin Foster's colleague. Where can I read the plugin development docs?",
        "Hi Ethan, they're on the developer pages of our website. I'll send you the link and an example plugin repository.",
        "Got it. I'll take a look and come back to you next week.",
        'Sure, ask any time.',
      ],
    },
    // A new trial, asking about month-end reports.
    {
      messages: [
        'Hi, I found this number on your website. Our team would like to try it first. Is there a trial environment?',
        'Hi Brian, the trial logins are in your inbox. You could start by importing your customer and project spreadsheets.',
        'Imported, very easy. Can the month-end reports be produced automatically?',
        "Yes, set them to generate on the last day of each month. I'll book twenty minutes tomorrow to show you.",
      ],
    },
  ],
};
