import {
  BAD_ACTORS_SECTIONS,
  type BadActorsEpisode,
} from '../agents/badActorsAgent';

/**
 * Episode 01 of "Bad Actors: How Politicians Pretend"
 * Subject: Vice President J.D. Vance (R)
 *
 * Slide start/end and speechStart/speechEnd timestamps match the synthesized
 * AI voiceover master track (`bad-actors/ep01-jd-vance/audio/episode-master.mp3`)
 * generated via `scripts/build_bad_actors_audio.py`.
 */
export const BAD_ACTORS_EP01_JD_VANCE: BadActorsEpisode = {
  seriesTitle: 'Bad Actors: How Politicians Pretend',
  episodeNumber: 1,
  politician: 'J.D. Vance',
  party: 'Republican',
  currentOffice: '50th Vice President of the United States (2025–Present)',
  durationSeconds: 360,
  audioSrc: 'bad-actors/ep01-jd-vance/audio/episode-master.mp3',
  sections: BAD_ACTORS_SECTIONS,
  slides: [
    // -------------------------------------------------------------------------
    // SECTION 1 — POLITICIAN INFO: QUICK BIO (0:00 – 0:30, 30s)
    // -------------------------------------------------------------------------
    {
      id: 'slide-01-bio',
      sectionId: 'bio',
      start: 0.0,
      end: 30.0,
      speechStart: 0.65,
      speechEnd: 29.195,
      headline: 'James David Vance — Quick Dossier',
      subheadline: 'From Middletown & Yale Law to Silicon Valley & the Vice Presidency',
      narration:
        "Bad Actors: How Politicians Pretend. Episode One: J.D. Vance. Born in Middletown, Ohio in 1984, Vance survived a turbulent Rust Belt childhood, served in the Marines, graduated from Yale Law, and joined Peter Thiel's Silicon Valley venture network. After his 2016 memoir Hillbilly Elegy brought fame, he served two years in the Senate before becoming America's 50th Vice President in 2025.",
      layout: 'timeline',
      accentColor: '#38BDF8',
      photo: {
        src: 'bad-actors/ep01-jd-vance/photos/01-official-vp-portrait.jpg',
        caption: 'Official White House Portrait · 50th Vice President',
        dateTag: 'JAN 2025 – PRESENT',
      },
      bullets: [
        {
          tag: '1984 · OHIO',
          title: 'Born James Donald Bowman in Middletown, OH',
          detail: 'Raised largely by grandmother ("Mamaw") amid Rust Belt deindustrialization and family addiction.',
        },
        {
          tag: '2003 – 2013',
          title: 'USMC Iraq Combat Correspondent → Ohio State → Yale Law',
          detail: 'Enlisted in Marines (2003–07), earned B.A. summa cum laude (2009) and Yale J.D. (2013).',
        },
        {
          tag: '2016 – 2020',
          title: 'Mithril Capital (Peter Thiel) & Hillbilly Elegy Bestseller',
          detail: 'Silicon Valley VC principal; became liberal media’s go-to "Never-Trump" Rust Belt translator.',
        },
        {
          tag: '2023 – 2026',
          title: 'U.S. Senator from Ohio (2 yrs) → 50th U.S. Vice President',
          detail: 'Least prior office experience of any modern VP (2 yrs, 7 days in Senate before Jan 20, 2025).',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // SECTION 2 — EXTRAPOLATED IDEOLOGY (0:30 – 1:30, 60s)
    // -------------------------------------------------------------------------
    {
      id: 'slide-02-worldview',
      sectionId: 'ideology',
      start: 30.0,
      end: 61.981,
      speechStart: 30.65,
      speechEnd: 61.581,
      headline: 'The Postliberal "Anti-Regime" Worldview',
      subheadline: 'Blood-and-Soil Nationhood, Pronatalism & Executive Centralization',
      narration:
        'Across speeches and interviews since 2021, Vance presents a consistent postliberal nationalist worldview. Shaped by Catholic theorist Patrick Deneen, tech billionaire Peter Thiel, and blogger Curtis Yarvin, he rejects free-market orthodoxy and classical liberalism alike. In his framing, America is not an idea, but a blood-and-soil homeland besieged by globalist oligarchs, secular elites, mass migration, falling birthrates, and an entrenched administrative regime that must be purged.',
      layout: 'triad',
      accentColor: '#F59E0B',
      photo: {
        src: 'bad-actors/ep01-jd-vance/photos/04-rnc-speech-pointing.jpg',
        caption: 'RNC Acceptance Address · Milwaukee, WI',
        dateTag: 'JULY 17, 2024',
      },
      bullets: [
        {
          tag: 'PATRICK DENEEN',
          title: 'Catholic Postliberal "Aristopopulism"',
          detail: 'Self-described member of the "postliberal right" whose role is "explicitly anti-regime" — replacing liberal individualism with traditionalist hierarchy.',
        },
        {
          tag: 'PETER THIEL',
          title: 'Tech-Billionaire Anti-Institutionalism',
          detail: 'Mentored and funded Vance ($15M Senate Super PAC); frames liberal democracy and regulatory agencies as stagnant obstacles.',
        },
        {
          tag: 'CURTIS YARVIN',
          title: 'Purging the Administrative State',
          detail: 'Cited Yarvin to urge firing "every mid-level bureaucrat" and defying courts: "let the Chief Justice enforce his own ruling."',
        },
        {
          tag: 'NATION AS SOIL',
          title: '"America Is Not Just an Idea — That Is Our Homeland"',
          detail: '2024 RNC climax anchored citizenship in ancestral Kentucky burial plots, pronatalism, and strict border exclusion.',
        },
      ],
    },
    {
      id: 'slide-03-contradictions',
      sectionId: 'ideology',
      start: 61.981,
      end: 90.0,
      speechStart: 62.381,
      speechEnd: 89.239,
      headline: 'Ideological Whiplash: The Contradiction Matrix',
      subheadline: 'Total Inversion Between 2016 Commentator Vance & 2021–2026 MAGA Vance',
      narration:
        "Yet no modern politician has contradicted his own worldview more starkly. In 2016, Vance called Donald Trump cultural heroin, unfit for office, and privately wondered if he was America's Hitler. He scolded working-class voters for blaming immigrants or Chinese trade instead of personal culture. By 2021, seeking Trump's Senate endorsement, he reversed every premise overnight, adopting the exact grievance script he once diagnosed as a fraud.",
      layout: 'contradictions',
      accentColor: '#F59E0B',
      photo: {
        src: 'bad-actors/ep01-jd-vance/photos/02-hillbilly-elegy-2017.jpg',
        caption: '2017 Book Festival Q&A ("Never-Trump" Era)',
        dateTag: 'THEN · 2016–2017',
      },
      secondaryPhoto: {
        src: 'bad-actors/ep01-jd-vance/photos/05-rnc-speech-gesture.jpg',
        caption: '2024 RNC Keynote (MAGA Standard-Bearer)',
        dateTag: 'NOW · 2024–2026',
      },
      contradictions: [
        {
          topic: 'On Donald Trump',
          earlierDate: '2016',
          earlierPosition: '"I\'m a Never-Trump guy... unfit for office... cultural heroin" / privately: "America\'s Hitler?"',
          laterDate: '2024–26',
          laterPosition: '"America\'s last best hope... greatest economy in history for workers."',
        },
        {
          topic: 'Cause of Rust Belt Decline',
          earlierDate: '2016',
          earlierPosition: 'Mocked "pointing the finger at Mexican immigrants, Chinese trade, or Democratic elites."',
          laterDate: '2024–26',
          laterPosition: 'Blames "millions of illegal aliens," NAFTA/China trade & "corrupt Washington insiders."',
        },
        {
          topic: 'Trump Economic Record',
          earlierDate: 'Feb 2020',
          earlierPosition: 'Private DM: "Trump has thoroughly failed to deliver on his economic populism."',
          laterDate: 'Oct 2024',
          laterPosition: 'CBS Debate: "Workers\' wages went through the roof" under Trump.',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // SECTION 3 — VOCABULARY ANALYSIS (1:30 – 2:30, 60s)
    // -------------------------------------------------------------------------
    {
      id: 'slide-04-buzzwords',
      sectionId: 'vocabulary',
      start: 90.0,
      end: 118.953,
      speechStart: 90.65,
      speechEnd: 118.553,
      headline: 'Transcript Scan: Top Buzzword Clusters',
      subheadline: 'Frequency per 1,000 Words Across RNC, CBS Debate, Munich & Media Q&As (n = 2,951 words)',
      narration:
        "Scanning nearly 3,000 words across Vance's convention address, vice presidential debate, Munich speech, and media Q&As reveals a tightly disciplined buzzword engine. Family, children, and Mamaw lead at 7.4 mentions per thousand words. Next come three tied pillars at 4.8 per thousand each: working-class workers, open-border illegal aliens, and ruling-class experts, followed closely by tariffs, factories, and censorship.",
      layout: 'buzzword-bars',
      accentColor: '#A78BFA',
      photo: {
        src: 'bad-actors/ep01-jd-vance/photos/07-munich-qa-mic.jpg',
        caption: 'Security & Policy Q&A · Handheld Microphone',
        dateTag: 'CORPUS SCAN · 7 TEXTS',
      },
      buzzwords: [
        {
          label: 'Family / Children / "Mamaw"',
          hits: 20,
          perThousandWords: 7.4,
          category: 'natalist',
          note: 'Emotional anchor & pronatalist credential',
        },
        {
          label: 'Workers / "Working Man"',
          hits: 13,
          perThousandWords: 4.8,
          category: 'populist',
          note: 'Blue-collar class signifier',
        },
        {
          label: 'Open Border / "Illegal Aliens"',
          hits: 13,
          perThousandWords: 4.8,
          category: 'scapegoat',
          note: 'Universal culprit for housing & budgets',
        },
        {
          label: 'Ruling Class / "Experts"',
          hits: 13,
          perThousandWords: 4.8,
          category: 'anti-elite',
          note: 'Discredits economists, courts & press',
        },
        {
          label: 'Tariffs / Factories / Made in USA',
          hits: 11,
          perThousandWords: 4.1,
          category: 'nationalist',
          note: 'All-purpose industrial cure-all',
        },
        {
          label: '"Censorship" / Free Speech',
          hits: 10,
          perThousandWords: 3.7,
          category: 'epistemic',
          note: 'Flips Jan. 6 & EU norms onto critics',
        },
      ],
    },
    {
      id: 'slide-05-semantics',
      sectionId: 'vocabulary',
      start: 118.953,
      end: 150.0,
      speechStart: 119.353,
      speechEnd: 149.22,
      headline: 'How Vance’s Code Words Operate',
      subheadline: 'Epistemic Shortcuts & Neighborly Softeners Masking Hard-Right Terms',
      narration:
        'Notice how these buzzwords operate as ideological switches. Vance repeats common sense 2.6 times per thousand words specifically to dismiss economists and budget scores without rebuttal. He deploys censorship to flip questions about January 6th or European far-right firewalls back onto critics. Meanwhile, conversational softeners like look, first of all, and frankly disguise hard-edged nativist terms like illegal aliens and regime inside neighborly Midwestern speech.',
      layout: 'code-switches',
      accentColor: '#A78BFA',
      photo: {
        src: 'bad-actors/ep01-jd-vance/photos/08-munich-podium-2025.jpg',
        caption: '61st Munich Security Conference ("Threat From Within")',
        dateTag: 'FEB 14, 2025',
      },
      bullets: [
        {
          tag: '"COMMON SENSE" (2.6 / 1K)',
          title: 'Anti-Evidence Shield',
          detail: '"Economists have PhDs, but they don\'t have common sense" — waves away Wharton $5.8T deficit & tariff inflation models.',
        },
        {
          tag: '"CENSORSHIP" (3.7 / 1K)',
          title: 'Democratic Inversion Switch',
          detail: 'Asked if Trump lost 2020 or about Russian threats in Munich, pivots immediately to "censorship" as "the real threat from within."',
        },
        {
          tag: '"HOMELAND" vs. "IDEA"',
          title: 'Civic Creed → Bloodline Nation',
          detail: 'Explicitly demotes constitutional universalism in favor of 7-generation ancestry and exclusion "on our terms."',
        },
        {
          tag: '"LOOK," · "FIRST OF ALL"',
          title: '3.8 / 1k Disarming Discourse Markers',
          detail: 'Polite courtroom transitions wrap phrases like "regulatory regime" and "25M illegal aliens" in calm suburban cadence.',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // SECTION 4 — RHETORICAL ANALYSIS (2:30 – 4:30, 120s)
    // -------------------------------------------------------------------------
    {
      id: 'slide-06-appeals',
      sectionId: 'rhetoric',
      start: 150.0,
      end: 192.122,
      speechStart: 150.65,
      speechEnd: 191.722,
      headline: 'Appeal Architecture: The Biographical Shield',
      subheadline: 'Converting Personal Trauma Into Moral Immunity Before Pivoting to a Scapegoat',
      narration:
        "Rhetorically, Vance's signature move is the biographical shield. In the October 2024 CBS debate, when pressed on a preemptive strike against Iran, healthcare plans, energy, and abortion, he opened each answer with his mother's addiction, his grandmother's Social Security check, or cold Ohio nights. Personal trauma functions as instant working-class ethos, making factual pushback look callous. From there, he pivots every material hardship, whether housing shortages, hospital wait times, or fentanyl, onto a single external villain: immigrants and out-of-touch coastal elites.",
      layout: 'appeal-funnel',
      accentColor: '#F43F5E',
      photo: {
        src: 'bad-actors/ep01-jd-vance/photos/06-vp-debate-cbs.jpg',
        caption: 'CBS News Vice Presidential Debate · New York City',
        dateTag: 'OCT 1, 2024',
      },
      bullets: [
        {
          tag: 'STEP 1 · BIOGRAPHICAL SHIELD',
          title: 'Answer Policy Question With Childhood Hardship',
          detail: 'Asked about striking Iran, opens with food stamps, Mamaw’s Social Security & Marine GI Bill; closes energy answer with unheated Ohio nights.',
        },
        {
          tag: 'STEP 2 · EMPATHY DISARMAMENT',
          title: 'Perform Warmth Toward Opponent ("Me Too, Man")',
          detail: 'Thanks moderators by first name ("Margaret," "Norah"), praises opponent’s intentions, insulating himself from seeming extreme.',
        },
        {
          tag: 'STEP 3 · UNIVERSAL SCAPEGOAT PIVOT',
          title: 'Route Every Complex Crisis to One Villain',
          detail: '4M-unit housing deficit, hospital crowding, wages, fentanyl, and deficits are all collapsed into "illegal migrants" + "Washington elites."',
        },
      ],
    },
    {
      id: 'slide-07-specificity',
      sectionId: 'rhetoric',
      start: 192.122,
      end: 231.58,
      speechStart: 192.522,
      speechEnd: 231.18,
      headline: 'Specificity vs. Vagueness Audit',
      subheadline: '92.6% Sweeping Assertions — And Why His Rare Numbers Collapse Under Fact-Check',
      narration:
        "How specific are his claims? In our transcript audit, 92.6% of Vance's sentences rely on sweeping generalizations or personal anecdotes rather than verifiable statutes or data. More tellingly, within the 7.4% where he does cite concrete numbers, those specifics routinely collapse under scrutiny: inflating undocumented immigrants to 25 million, falsely claiming Trump salvaged Obamacare, or inventing $100 billion unfrozen for Iran. Pressed by moderators for housing data, he promised a Federal Reserve study on social media later.",
      layout: 'specificity-meter',
      accentColor: '#F43F5E',
      photo: {
        src: 'bad-actors/ep01-jd-vance/photos/06-vp-debate-cbs.jpg',
        caption: 'CBS Debate Fact-Check Audit · Oct 2024',
        dateTag: 'SPECIFICITY: 7.4%',
      },
      specificityStats: {
        vaguePercent: 92.6,
        specificPercent: 7.4,
        totalSentences: 136,
      },
      claims: [
        {
          claim: '"20 to 25 million illegal aliens competing for scarce homes"',
          occasion: 'CBS VP Debate',
          verdict: 'False',
          reality: 'More than double DHS & Pew estimates (~11M undocumented total).',
        },
        {
          claim: '"Donald Trump salvaged Obamacare" instead of destroying it',
          occasion: 'CBS VP Debate',
          verdict: 'False',
          reality: 'Trump backed ACA repeal bills & Supreme Court lawsuits; Vance himself condemned the 2017 GOP repeal.',
        },
        {
          claim: '"Iran received over $100 billion in unfrozen assets"',
          occasion: 'CBS VP Debate',
          verdict: 'False',
          reality: 'No $100B transfer existed; $6B restricted humanitarian oil account remained unspent.',
        },
        {
          claim: '"There\'s a Federal Reserve study we\'ll put up on social media"',
          occasion: 'CBS VP Debate',
          verdict: 'Deferred',
          reality: 'Classic rhetorical IOU when asked directly for empirical housing evidence on stage.',
        },
      ],
    },
    {
      id: 'slide-08-cadence',
      sectionId: 'rhetoric',
      start: 231.58,
      end: 270.0,
      speechStart: 231.98,
      speechEnd: 269.156,
      headline: 'Yale Law Cadence & Saying the Quiet Part Out Loud',
      subheadline: 'Procedural Aggression in Q&As — And Admitting He Will "Create Stories"',
      narration:
        "Unlike Trump's improvisational bluster, Vance argues like a Yale-trained appellate lawyer: calm, polite, and relentlessly aggressive. When CBS moderators noted Springfield's Haitians held legal status, he scolded them: Margaret, the rules were that you guys weren't going to fact-check. In Munich he lectured European allies to drop firewalls against extremists; in the Oval Office he demanded of Volodymyr Zelenskyy, have you said thank you once? Most revealingly, he told CNN's Dana Bash: if I have to create stories so the media pays attention, that's what I'm going to do.",
      layout: 'verbatim-quotes',
      accentColor: '#F43F5E',
      photo: {
        src: 'bad-actors/ep01-jd-vance/photos/08-munich-podium-2025.jpg',
        caption: 'High-Stakes Exchanges: CBS · CNN · Munich · Oval Office',
        dateTag: '2024 – 2025 Q&As',
      },
      quotes: [
        {
          context: 'CBS VP DEBATE · OCT 1, 2024 (ON SPRINGFIELD TPS STATUS)',
          quote: '"Margaret, the rules were that you guys weren\'t going to fact-check, and since you\'re fact-checking me, I think it\'s important to say what\'s actually going on."',
          highlight: "weren't going to fact-check",
        },
        {
          context: 'OVAL OFFICE · FEB 28, 2025 (TO UKRAINIAN PRES. ZELENSKYY)',
          quote: '"Have you said thank you once? In this entire meeting, have you said thank you?" (Zelenskyy had opened the meeting thanking the U.S.)',
          highlight: 'Have you said thank you once?',
        },
        {
          context: 'CNN STATE OF THE UNION · SEPT 15, 2024 (TO DANA BASH)',
          quote: '"If I have to create stories so that the American media actually pays attention to the suffering of the American people, then that\'s what I\'m going to do, Dana."',
          highlight: 'If I have to create stories',
        },
      ],
    },

    // -------------------------------------------------------------------------
    // SECTION 5 — OVERALL ASSESSMENT & CONCLUSION (4:30 – 6:00, 90s)
    // -------------------------------------------------------------------------
    {
      id: 'slide-09-record',
      sectionId: 'conclusion',
      start: 270.0,
      end: 312.004,
      speechStart: 270.65,
      speechEnd: 311.387,
      headline: 'Record Audit: Populist Talk vs. Elite Walk',
      subheadline: 'Senate Roll-Call Votes, Donor Base & 8 Vice Presidential Tie-Breakers (2023–2026)',
      narration:
        "Compare that populist performance to his actual record in office. Despite railing against Wall Street barons for the working man, Vance's Senate career was bankrolled by $15 million from billionaire Peter Thiel, with chief executives as his top donor class. In two years, zero of his 57 sponsored bills became law, he missed over 13% of Senate votes, and earned a 0% score from the AFL-CIO alongside 83% from the anti-tax Club for Growth. As Vice President, he broke Senate ties for the One Big Beautiful Bill Act while dismissing millions losing Medicaid as mere minutiae.",
      layout: 'record-scorecard',
      accentColor: '#10B981',
      photo: {
        src: 'bad-actors/ep01-jd-vance/photos/03-capitol-2017.jpg',
        caption: 'U.S. Capitol · Senate (2023–25) & Senate President (2025–26)',
        dateTag: 'RECORD IN OFFICE',
      },
      scorecard: [
        {
          metric: 'Top Donor Source',
          value: '$15M Thiel + CEOs #1',
          rhetoricContrast: 'RNC: "We\'re done catering to Wall Street; we\'ll commit to the working man."',
        },
        {
          metric: 'Senate Bills Enacted',
          value: '0 of 57 Bills (0%)',
          rhetoricContrast: 'East Palestine rail safety bill stalled; shunned federal earmarks for Ohio.',
        },
        {
          metric: 'Missed Senate Votes',
          value: '13.6% (vs 2.9% median)',
          rhetoricContrast: 'Skipped all 42 campaign-season votes incl. Child Tax Credit & IVF bills.',
        },
        {
          metric: 'Labor vs. Deregulation',
          value: '0% AFL-CIO · 83% CfG',
          rhetoricContrast: '5th furthest-right economic voting record in the U.S. Senate.',
        },
        {
          metric: 'VP Senate Tie-Breakers',
          value: '8 Cast (2025–2026)',
          rhetoricContrast: 'Passed One Big Beautiful Bill Act — called Medicaid cuts "minutiae."',
        },
      ],
    },
    {
      id: 'slide-10-verdict',
      sectionId: 'conclusion',
      start: 312.004,
      end: 360.0,
      speechStart: 312.622,
      speechEnd: 358.794,
      headline: 'Final Verdict: The Translator as Chameleon',
      subheadline: 'Why J.D. Vance Is the Archetypal Case Study in Political Pretension',
      narration:
        "In 2017, Vance warned that Republicans were mired in internal contradictions, pretending a bill cutting healthcare for the poor helped Trump's own voters. Eight years later, he cast the deciding votes to enact that very contradiction, and in 2026 cast another tie-breaker sustaining military action in Venezuela despite campaigning against foreign entanglements. That is what makes J.D. Vance an emblematic case study for Bad Actors. Unlike cruder demagogues, he knows better because he once wrote the critique himself. His art is translation: dressing elite deregulation and executive loyalty in the borrowed flannel of forgotten America.",
      layout: 'verdict',
      accentColor: '#10B981',
      photo: {
        src: 'bad-actors/ep01-jd-vance/photos/01-official-vp-portrait.jpg',
        caption: 'Bad Actors Profile #01 · Vice President J.D. Vance',
        dateTag: 'SERIES VERDICT',
      },
      bullets: [
        {
          tag: '2017 SELF-PROPHECY',
          title: '"Mired in Internal Contradictions" (NYT Op-Ed)',
          detail: 'Vance himself wrote that cutting healthcare subsidies for the poor while claiming to help Trump voters was "a moral and political failure."',
        },
        {
          tag: '2025–2026 EXECUTION',
          title: 'Enacting What He Once Condemned',
          detail: 'Cast 3 tie-breakers for Medicaid-cutting tax reconciliation (July 2025) and a tie-breaker sustaining Venezuela military action (Jan 2026).',
        },
        {
          tag: 'CORE PRETENSION',
          title: 'Elite Deregulation in Working-Class Vernacular',
          detail: 'Uses authentic Middletown memory and Yale Law polish to sell billionaire-aligned postliberal power as blue-collar rebellion.',
        },
      ],
    },
  ],
};
