// English is the source of truth: every key here must also exist in tl.ts and
// ceb.ts (their `Record<MessageKey, string>` type fails the build otherwise).
// Use {n}-style placeholders for values filled in at runtime.
export const en = {
  // Bottom nav + settings
  "nav.home": "Home",
  "nav.info": "Info",
  "nav.settings": "Settings",
  "nav.privacy":
    "Protected under RA 10173 — Data Privacy Act of 2012. Your identity is never shared with school staff.",
  "nav.helpHub": "Help Hub",
  "nav.signOut": "Sign out",
  "settings.language": "Language",
  "settings.appearance": "Appearance",
  "settings.light": "Light",
  "settings.dark": "Dark",
  "settings.system": "System",

  "common.back": "Back",
  "common.send": "Send",
  "common.cancel": "Cancel",

  // Student home
  "student.anonymous": "Anonymous Student",
  "greet.morning": "Good morning",
  "greet.afternoon": "Good afternoon",
  "greet.evening": "Good evening",
  "home.heading": "What would you like to report?",
  "home.sub": "Your report is anonymous. We're here to help.",
  "home.bullying.title": "Bullying",
  "home.bullying.desc": "Repeated harmful behavior targeting someone",
  "home.bullying.cta": "Tap to report →",

  // My Reports
  "reports.title": "My Reports",
  "reports.seeAll": "See All",
  "reports.showLess": "Show less",
  "reports.empty": "You haven't submitted any reports yet. Anything you share stays confidential.",
  "thread.bullying": "Bullying",
  "thread.conflict": "Conflict",
  "thread.view": "View",
  "thread.hide": "Hide",
  "thread.followUp": "follow-up ({n})",
  "thread.reportStatus": "report status",
  "thread.title": "Follow-up thread",
  "thread.empty": "No messages yet. A staff member will follow up here once your report is reviewed.",
  "thread.placeholder": "Send a message...",
  "status.unresolved": "Under Review",
  "status.in_process": "In Progress",
  "status.resolved": "Closed",
  "sev.pending": "Pending review",
  "sev.precursor": "Precursor",
  "sev.minor": "Minor",
  "sev.less_serious": "Less serious",
  "sev.serious": "Serious",
  "sev.complex": "Complex",
  "ref.case": "Case No.",
  "ref.incident": "Incident Report No.",

  // Bells
  "bell.notifications": "Notifications",
  "bell.noNotifications": "No notifications yet.",
  "bell.replied": "Your counselor replied to your report.",
  "bell.reportStatus": "Report status",
  "bell.noStatus": "No status updates yet.",
  "bell.update": "Update",
  "bell.closed": "Closed",

  // Report status page + tracker
  "status.pageTitle": "Report status",
  "status.submitted": "Submitted {date}",
  "status.unavailable": "Status tracking isn't available for this report yet.",
  "stage.case_filed": "Case Assessment",
  "stage.meeting": "Ongoing Action",
  "stage.investigation": "Ongoing Action",
  "stage.case_closed": "Case Closed",
  "tracker.nextUpdate": "Estimated time:",
  "tracker.report": "Report",
  "tracker.filed":
    "Your case is already filed. Within 24 hours of receiving this report, the Learner Formation Officer will assess the details and decide the next steps.",
  "tracker.filed.complex":
    "Your case is already filed. Within 24 hours of receiving this report, the Learner Formation Officer will assess the details and decide the next steps. Because this is a complex case, the school head will also be involved.",
  "tracker.ongoing.default":
    "The Learner Formation Officer is carrying out the action needed on your case — planning next steps, holding any meetings needed, and investigating based on the information you have given, alongside counseling and support for anyone affected.",
  "tracker.ongoing.precursor":
    "The Learner Formation Officer is addressing the situation early — planning next steps, holding any meetings needed, and looking into what happened based on the information you have given, with guidance and support for everyone involved so it does not grow into something bigger.",
  "tracker.ongoing.minor":
    "The Learner Formation Officer is handling your case — planning next steps, holding any meetings needed, and following up based on the information you have given, alongside counseling and support for anyone affected.",
  "tracker.ongoing.serious":
    "The Guidance Counselor and the Learner Formation Officer are carrying out formal interventions for your case — holding any meetings needed and investigating based on the information you have given, alongside counseling and support for anyone affected.",
  "tracker.ongoing.complex":
    "The school head is leading the response to your case, together with the Guidance Counselor and the Learner Formation Officer — holding any meetings needed, investigating, and coordinating with law enforcement where needed. Counseling and support are being arranged for anyone affected.",
  "tracker.period.assessment": "within 24 hours",
  "tracker.period.ongoing": "around 5 school days",
  "tracker.tail":
    "This process will involve collecting evidence and interviewing witnesses (if there are any), and will take a maximum of 5 school days.",
  "tracker.closed":
    "Your report has been acted on. Please report to Amoma again if any similar situations happen again.",

  // Trend chart
  "trend.title": "Trend Insights",
  "trend.types": "Report Types",
  "trend.resolution": "Resolution Rate",
  "trend.thisMonth": "Reports This Month",
  "trend.bullying": "Bullying",
  "trend.resolvedPct": "of your reports have been resolved",
  "trend.underReview": "Under Review",
  "trend.ongoing": "Ongoing",
  "trend.resolved": "Resolved",
  "trend.week": "Wk {n}",
  "trend.none": "You haven't submitted any reports yet.",

  // Safety check
  "dc.title": "Safety Check",
  "dc.intro": "Before we begin, we need to make sure you're safe right now.",
  "dc.question": "Is anyone in immediate danger right now?",
  "dc.questionSub": "This includes you, the person being bullied, or anyone else involved.",
  "dc.dangerDefinition":
    "Immediate danger means someone is seriously hurt, or about to be, right now — for example a stabbing or attack, a knife or other weapon brought in, or a threat to seriously hurt or kill. If it isn't like this, choose No — you can still file your report.",
  "dc.yes": "Yes, someone is in danger",
  "dc.yesSub": "I'll see the school's number right away",
  "dc.no": "No, we are safe right now",
  "dc.noSub": "Continue to file your report",
  "dc.protected": "Your identity is protected. Teachers cannot see who submitted this report.",
  "dc.notAlone": "You're Not Alone",
  "dc.urgent":
    "Your report is marked URGENT. A counselor will be notified immediately. If you need help right away, call your school:",
  "dc.continue": "Continue Filing Report",
  "dc.warnTitle":
    "Warning: False Reports Are Punishable by Law",
  "dc.warnBody":
    "Knowingly making a threat, or spreading false information, about an attempt to kill, injure or scare anyone, or to damage property using explosives or similar means, is a crime. Under [[Presidential Decree No. 1727 (October 8, 1980)]], it is punishable by up to 5 years in prison, a fine of up to ₱40,000, or both.",
  "dc.warnOk": "I understand",
  "dc.schoolNumber": "School number",
  "dc.schoolNumberSub": "Tap to call for help right away",
  "dc.goBack": "Go back",

  // Report form
  "f.pageTitle": "Bullying Report",
  "f.urgentBadge": "URGENT",
  "f.occurred": "What Occurred?",
  "f.occurredPh": "Tell us exactly what happened, and let us know if you were hurt in any way.",
  "f.typeQ": "What type of bullying was this?",
  "f.typeHint": "Select all that apply — an incident can involve more than one type.",
  "f.otherPh": "Other (optional)",
  "f.peopleTitle": "Who Are the People Involved?",
  "f.victimQ": "Who was the victim?",
  "f.victimPh": "Grade 10, Section Obsidian",
  "f.oppressorQ": "Who is the oppressor?",
  "f.oppressorPh": "Grade 11, Section Resourceful",
  "f.oppressorNamePh": "Add name if possible (optional)",
  "f.whereWhen": "Where and When Did It Happen?",
  "f.date": "What date?",
  "f.time": "What time?",
  "f.place": "Where did it happen?",
  "f.placePh": "e.g. Canteen, Grade 10 classroom, group chat",
  "f.evidenceTitle": "Do You Have Any Evidence?",
  "f.evidenceSub": "Optional — attach a photo, video, or screenshot.",
  "f.evidenceTap": "Tap to attach a photo, video, or screenshot",
  "f.evidenceNote":
    "Files are encrypted at rest. Only your assigned counselor and school admin (for audits) can access them.",
  "f.descError": "Please fill in the description before continuing.",
  "f.continueReview": "Continue to Review",
  "f.reviewTitle": "Report Review",
  "f.reviewSub": "Confirm everything looks right before submitting.",
  "f.urgentNotice":
    "This report is marked URGENT. It will be routed to the top of the counselor's queue immediately.",
  "f.typeOfBullying": "Type of Bullying",
  "f.whereWhenReview": "Where and when did it happen?",
  "f.evidence": "Evidence",
  "f.filesAttached": "{n} file(s) attached",
  "f.notProvided": "Not provided",
  "f.anonTitle": "Your Anonymity is Protected",
  "f.anonBody":
    "Your name and identity will never be shared with teachers or the people named in this report. Only the system can trace this report for abuse-prevention purposes, as required by RA 10173.",
  "f.submitAnon": "Submit this report anonymously",
  "f.submit": "Submit Report",
  "f.submitting": "Submitting...",
  "f.submitError": "We couldn't submit your report right now. Please try again.",

  // Data privacy notice (shown after the report review, before submitting)
  "f.continue": "Continue",
  "dp.title": "Data Privacy Notice",
  "dp.sub": "Please read this before you submit your report.",
  "dp.recorded.title": "Your report will be recorded",
  "dp.recorded.body":
    "What you tell us — what happened, who was involved, when and where, and any evidence you attach — is saved in Amoma as a record of this case.",
  "dp.why.title": "Why we keep it",
  "dp.why.body":
    "We use it to assess your report, protect the learners involved, and act on the case. We use it only for this purpose.",
  "dp.who.title": "Who can see it",
  "dp.who.body":
    "Only authorized school personnel: the Learner Formation Officer, the School Head, and the teacher assigned to your case. System administrators can access records only for maintenance and security.",
  "dp.identity.title": "Your identity",
  "dp.identity.body":
    "Your name is not shown to teachers or the people named in your report. Only the system can trace a report, for abuse-prevention purposes.",
  "dp.rights.title": "Your rights",
  "dp.rights.body":
    "Under the Data Privacy Act of 2012 (RA 10173), you may ask about, correct, or object to the use of your information. You can reach us through the Help Hub.",
  "dp.agree": "I agree — I understand that this report will be recorded, and I have read this Data Privacy Notice.",

  // Bullying types and their follow-up questions
  "type.social": "Social",
  "type.cyber": "Cyber",
  "type.physical": "Physical",
  "type.verbal": "Verbal",
  "type.emotional": "Emotional",
  "type.gender_based": "Gender-based",
  "tq.cyber": "Which social media or app did it happen on?",
  "tq.physical": "Were you hurt?",
  "tq.verbal": "What kind of words were used?",
  "tq.social": "What happened?",
  "tq.emotional": "What happened?",
  "tq.gender_based": "What was it about?",

  // Confirmation
  "cf.submitted": "Report Submitted",
  "cf.urgentSuffix": " — Urgent",
  "cf.sub": "Thank you for speaking up. Your report is confidential and being reviewed.",
  "cf.subUrgent": "Your counselor has been notified immediately. If you need help right away, call your school's number.",
  "cf.number": "Your Incident Report No.",
  "cf.numberNote": "Use this number to check the status of your report. No one can identify you from this number.",
  "cf.next": "What happens next",
  "cf.s1": "Your counselor will review your report within 24 hours.",
  "cf.s2": "You'll see the status update to 'Under Review' in My Reports.",
  "cf.s3":
    "Your counselor won't call you to the office or reach out by name — any follow-up happens right here, anonymously, in your report's thread.",
  "cf.s4": "Your counselor may take action without revealing your identity.",
  "cf.s4urgent": "If needed, the counselor may take action without revealing your identity.",
  "cf.home": "Back to Home",
  "cf.homeSub": "Return home — you can check on this report anytime from My Reports.",

  // Help Hub
  "help.title": "Help Hub",
  "help.sub": "Get in touch with us or report a problem with the app.",
  "help.contact": "Contact us",
  "bug.title": "Report a bug",
  "bug.sub": "Found something that isn't working right? Let us know and we'll take a look.",
  "bug.login": "Trouble logging in",
  "bug.report_submission": "Problem submitting a report",
  "bug.notifications": "Notifications not working",
  "bug.app_bug": "Something in the app is broken",
  "bug.other": "Others",
  "bug.otherPh": "Briefly, what's this about?",
  "bug.descPh": "Describe what happened...",
  "bug.send": "Send report",
  "bug.sending": "Sending...",
  "bug.thanks": "Thanks for letting us know.",
  "bug.thanksSub": "Our team will look into it. You can send another report anytime.",
  "bug.another": "Send another",
} as const;

export type MessageKey = keyof typeof en;
