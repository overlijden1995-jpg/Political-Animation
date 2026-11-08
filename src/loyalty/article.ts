/**
 * "The Loyalty Machine" — long-form analysis, November 2026.
 *
 * Written as structured blocks so the print compositor can flow it into fixed
 * spreads. Everything sourced is attributed in the SOURCES block; analytic
 * judgements are labelled as such in the METHOD block and never presented as
 * measurement.
 */

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h'; text: string; kicker?: string }
  | { type: 'quote'; text: string; who: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'note'; text: string }
  | { type: 'factbox'; title: string; rows: Array<[string, string]> };

export interface Part {
  id: string;
  numeral: string;
  title: string;
  standfirst: string;
  /** plate numerals that fall inside this part — printed on the opening page */
  plates?: string[];
  blocks: Block[];
}

export const STANDING = {
  title: 'The Loyalty Machine',
  subtitle:
    'A link analysis of Donald Trump, his court and his business allies — and what it means that Stephen Miller now holds the door.',
  edition: 'Exhibit book · November 2026',
  byline: 'Prepared for the Bad Actors research series',
  dateline: 'MONTREAL · 8 NOVEMBER 2026',
  version: '1.0',
} as const;

export const METHOD: Block[] = [
  {
    type: 'p',
    text:
      'This is a link analysis, not an investigation. It takes 36 public figures and asks three questions of each: how often do they reach the president, what can they actually command, and how long have they been doing it? The answers are drawn from published reporting between November 2024 and 8 November 2026 — wire services, the major papers, congressional correspondence and the White House’s own daily record. The sourcing is listed page by page.',
  },
  {
    type: 'p',
    text:
      'Four indices are used throughout, each on a 0–100 scale: ACCESS (frequency and informality of contact), FORMAL (statutory or budget authority), LOYALTY (length and consistency of the relationship) and BROKERAGE (links to other nodes in the network). These are editorial judgements. They are not measurements, not polling, and not additive. They exist to make relative position visible; they should never be quoted as data. Where a number is a published fact — a dollar figure, a vote, a date — it carries a citation.',
  },
  {
    type: 'p',
    text:
      'The distinction that matters most in what follows is between access and authority. Access is proximity: who the president sees, who he calls at night, whose articles are printed out and handed to him. Authority is command: who can move money, sign an order, direct an agency, file a charge. A presidency can be analysed as a fight over which of these two currencies buys the other. Most of what has happened in Trump’s second term is best understood as access repeatedly defeating authority.',
  },
  {
    type: 'note',
    text:
      'A note on contested claims. Several assertions in this book are disputed by the administration: that Miller set a 3,000-arrests-per-day target, that he directed the post-shooting narrative in Minneapolis, that he advocated invoking the Insurrection Act. Where a claim rests on anonymous sourcing in a single outlet it is described as reported, not established. Where it rests on a public document, a recorded statement or an on-the-record quote from the principal, it is described as fact.',
  },
];

export const PARTS: Part[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'event',
    numeral: 'I',
    plates: ['04'],
    title: 'The Event',
    standfirst:
      'On 6 November 2026, three days after the worst Republican defeat in half a century, the president replaced his chief of staff with the author of the policy the voters had just rejected.',
    blocks: [
      {
        type: 'p',
        text:
          'The announcement was four sentences on Truth Social and it took less than a minute to read. Susie Wiles, the first woman to serve as White House chief of staff, would move to the president’s political operation. Stephen Miller, the deputy chief of staff for policy and homeland security adviser, would become chief of staff on Monday, 9 November 2026. “Stephen’s been with me from the beginning,” the president told reporters in Florida. Asked why he had made the change, he said: “I wanted to make a change.” Asked what he wanted Miller to do differently, he said: “Just run things well.”',
      },
      {
        type: 'p',
        text:
          'Everything about the timing is legible. The midterms had delivered the Democrats both chambers of Congress — a Senate majority of 54 seats, a House majority that would finish above 250, seven Republican Senate seats lost including Texas, Ohio, Kansas, Iowa, Maine, North Carolina and South Carolina. The president’s approval stood in the high thirties in the exit polling, with roughly three-quarters of voters saying the economy was hurting them personally. The war with Iran, eight months old, had killed 21 American service members and wounded more than 800, and had pushed petrol prices into the political foreground. Two days after the vote, the president acknowledged that the war had been “a piece of it”.',
      },
      {
        type: 'p',
        text:
          'The conventional response to a defeat of that scale is a turn toward the centre: a new chief of staff with congressional relationships, a Treasury or homeland security concession, an economic package designed to be signed. What happened instead was the promotion of the single most identifiable architect of the enforcement programme that had just been repudiated — a man who had spent twenty months building a deportation machinery that polling had turned against, and who had survived the one controversy, the Minneapolis shootings in January 2026, that many Republicans inside the administration assumed would end him.',
      },
      {
        type: 'quote',
        text:
          'One of the disconnects right now is that the Republican midterm losses were a decisive rebuke of the president and his actions in office. But putting in Miller — who is deeply ideological and also the most powerful policy staffer in the modern history of the presidency — is doubling down on Trump’s agenda, not switching course.',
        who: 'Maggie Haberman, The New York Times, 6 November 2026',
      },
      {
        type: 'p',
        text:
          'Why does the chief of staff matter so much more in this administration than in most? Because the office is the only place where access and authority can be converted into one another. The chief of staff controls the paper that reaches the desk, the people who get minutes with the president, the hiring and firing inside the Executive Office, and the sequencing of decisions. In a normal White House that makes the chief a manager with political weight. In a White House where the president is the sole authorising authority and where policy is drafted by a very small shop, it makes the chief the effective chief executive of the domestic state.',
      },
      {
        type: 'p',
        text:
          'That is the structural argument of this book, and the ten diagrams that follow are its evidence. The promotion did not simply move a loyalist up a rung. It merged two functions that the American system had kept apart since 1978: the function of deciding what the president hears, and the function of deciding what the government does. Miller already had the second. On 9 November he acquired the first.',
      },
      {
        type: 'factbox',
        title: 'THE CHANGE, IN SIX LINES',
        rows: [
          ['Announced', '6 November 2026, Truth Social'],
          ['Effective', 'Monday, 9 November 2026'],
          ['Out', 'Susie Wiles → Trump political operation'],
          ['In', 'Stephen Miller, 41, deputy CoS for policy and homeland security adviser'],
          ['Context', 'Republicans lost the House and Senate on 3 November 2026'],
          ['Precedent', 'Youngest chief of staff since Hamilton Jordan (1979)'],
        ],
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'core',
    numeral: 'II',
    plates: ['01', '02'],
    title: 'The Core',
    standfirst:
      'There is no single “Trump loyalist”. There are five concentric tiers, and only about a dozen people in them can independently change what the government does.',
    blocks: [
      {
        type: 'p',
        text:
          '“Loyalist” is used as if it described a type of person. It describes a position in a network. The useful question is not whether someone is loyal but what they are loyal to — the man, the programme, or the transaction — and what they can do when the three diverge. Sorting the cast that way produces four tiers — the court, the instruments, the transaction, the exits — and a sharper picture than the left-right labels do. The four rings of Figure 02 are those tiers, drawn to scale of access.',
      },
      {
        type: 'h',
        text: 'Tier one: the court',
        kicker: 'NO SENATE VOTE REQUIRED',
      },
      {
        type: 'p',
        text:
          'The innermost tier is staff. These are the people who do not need a confirmation hearing, a security-clearance fight or a financial disclosure to acquire power; they need proximity. Miller, the communications director Steven Cheung, the deputy chief of staff Dan Scavino, the executive assistant Natalie Harp, the personal counsel Boris Epshteyn, the incoming press secretary Katie Zacharia. With the exception of Miller, none commands an agency. Together they decide what the president reads, signs, says and sees.',
      },
      {
        type: 'p',
        text:
          'Harp is the purest illustration of the type. She holds no portfolio and gives no interviews. She prints articles for the president, posts for him, and is a near-constant presence on Marine One and in the Oval. Reporting has described her showing him clips shortly before he banned several outlets from the White House in September 2026. That is not authority, but in a presidency organised around one person’s attention it is a form of power that no cabinet secretary can match — the power to shape the input.',
      },
      {
        type: 'p',
        text:
          'Scavino is the continuity case: a caddie at a Trump golf course in the 1990s, the operator of the candidate’s social media in 2016, a deputy chief of staff in both terms. He has never held policy authority and has never been out of the room. Cheung is the enforcer: the president calls him “my sumo wrestler” and “Luca Brasi,” and when the press secretary’s office fell vacant he simply kept the larger office. Epshteyn is the legal fixer whose channel to the president survived a 2024 internal review that found no wrongdoing, and whose existence is a permanent alternative route into the Oval for anyone with a legal theory and no standing.',
      },
      {
        type: 'h',
        text: 'Tier two: the instruments',
        kicker: 'CONFIRMED, AND THEREFORE REPLACEABLE',
      },
      {
        type: 'p',
        text:
          'The second tier holds confirmed officers who command real machinery: Marco Rubio at State and, unusually, the National Security Council; Russell Vought at the Office of Management and Budget; Todd Blanche at Justice; Pete Hegseth at Defense; Scott Bessent at Treasury; Markwayne Mullin at Homeland Security; Jay Clayton at the Office of the Director of National Intelligence. They have authority — budgets, prosecutions, deployments, diplomatic recognition — and they have it at the president’s pleasure.',
      },
      {
        type: 'p',
        text:
          'What distinguishes them from the court is that they can be removed by a process, and therefore can be disciplined by one. The 2026 record shows what that means in practice. Kristi Noem was removed from Homeland Security in March after hearings and a shooting scandal; Pam Bondi was fired from Justice in April, reportedly for insufficient aggression in pursuing the president’s opponents; Lori Chavez-DeRemer resigned from Labor under an inspector-general cloud; Tulsi Gabbard resigned from the intelligence directorate in May. Four cabinet-level departures in three months, all women, all replaced by men. The men stayed.',
      },
      {
        type: 'p',
        text:
          'The most consequential of these is Vought, and he is the least visible. As budget director he controls the machinery that converts an instruction into an appropriations decision, a staffing table, a grant condition, an agency’s survival. Miller can demand that an agency do something; Vought decides whether the agency still exists in a form capable of doing it. Reporting on Project 2025 identified Vought as its principal architect; he is now its principal implementer, and he was never asked a single question about it in a general-election debate.',
      },
      {
        type: 'h',
        text: 'Tier three: the transaction',
        kicker: 'MONEY, PLATFORMS, AND THE PRICE OF ACCESS',
      },
      {
        type: 'p',
        text:
          'The third tier is the donor and family-adjacent class: Elon Musk, David Sacks, Mark Zuckerberg, Larry Ellison, Marc Andreessen, and the envoys Jared Kushner and Steve Witkoff. Their loyalty is conditional and priced. They are not loyal to a programme; they are loyal to a regulatory posture. The relationships survive reversals that would end a staff career — Musk’s public break with the president in mid-2025 is the obvious case — because the currency is different.',
      },
      {
        type: 'p',
        text:
          'The mechanics are visible in the record. Sacks, as AI and crypto czar, pushed a light-touch framework, won the GENIUS Act for stablecoins in July 2025, and then — from outside government — helped talk the president out of an executive order creating a government testing regime for advanced AI models in May 2026. Andreessen, Horowitz and their spouses gave roughly $18 million to Trump-aligned committees; the Fairshake crypto super PAC raised more than $99 million, nearly all of it from a handful of firms. In several documented cases the SEC closed investigations into crypto firms weeks after those firms or their founders gave money. No bribery has been alleged by any prosecutor. The point is structural: when access is the product, nothing illegal needs to happen for the market to work.',
      },
      {
        type: 'p',
        text:
          'The family and the envoys sit at the top of this tier, because removal is not available to them. Kushner, Witkoff, Lara Trump and Donald Trump Jr. cannot be fired, and the price of their access is not a donation but a position — in a fund, a negotiation, a party. Kushner is the extreme case. He is described by the White House as an unpaid volunteer, has never been designated a special government employee, and has not filed the disclosure that designation would require — while co-leading Gaza and Iran negotiations and managing a private-equity firm with roughly $6.16 billion under management, about 99% of it from foreign nationals, with the Saudi Public Investment Fund as its largest single backer. Senate Finance estimated that Affinity collected about $129 million in fees from the Saudi government’s investment arm between 2021 and 2025.',
      },
      {
        type: 'p',
        text:
          'The Gulf clients have begun to discover the limits of the arrangement. Bloomberg reported in May 2026 that officials in Riyadh and Doha, having invested in Affinity partly to anchor ties with the Trump family, were angered that the administration went to war with Iran over their objections. That is the transaction tier’s real weakness: it buys influence, not control, and it cannot be relied upon to deliver a policy.',
      },
      {
        type: 'h',
        text: 'Tier four: the exits',
        kicker: 'THE FILTER',
      },
      {
        type: 'p',
        text:
          'The outermost tier is everyone who has left. It is the most analytically useful group, because each exit is a data point about the threshold. Wiles had the president’s trust, ran his campaign, and was blamed for the defeat in front of others on election night. Bondi had defended him at his first impeachment trial and campaigned for him three times, and was fired for not moving fast enough against his enemies. Noem had been the public face of the deportation programme and was removed when the programme produced a domestic political catastrophe. Gabbard had switched parties for him; the war made the conversion untenable.',
      },
      {
        type: 'p',
        text:
          'The pattern is not that loyalty is unrewarded. It is that loyalty is necessary and insufficient: what gets rewarded is visible aggression on the president’s behalf, and what gets removed is any appearance of restraint. That is why the succession of replacements — Bondi to her own deputy, Noem to a senator who campaigned on enforcement, Wiles to the policy author — all point in the same direction. Turnover in this administration is not disorder. It is selection.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'miller',
    numeral: 'III',
    plates: ['05', '08', '09', '03'],
    title: 'Miller',
    standfirst:
      'He is not a newcomer to power, and that is precisely the point. The promotion formalises an authority he had already assembled piece by piece.',
    blocks: [
      {
        type: 'p',
        text:
          'Stephen Miller was born in Santa Monica in August 1985, wrote a combative conservative column at Duke, went to work for Senator Jeff Sessions, and joined Donald Trump’s campaign in 2016 as a speechwriter and policy adviser at a moment when restricting immigration was not a mainstream Republican position. He served all four years of the first term as senior adviser, where he was the principal architect of the travel restrictions and the “zero tolerance” policy that separated thousands of children from their parents, and a driving force behind the attempt to end DACA.',
      },
      {
        type: 'p',
        text:
          'Between the terms he did something more useful than waiting. He founded America First Legal in 2021, a litigation and advocacy organisation that sued the Biden administration, challenged corporate diversity programmes, and — critically — kept a network of lawyers employed, credentialed and ideologically aligned. When the second term began, that network supplied personnel. Presidents reward the people who built infrastructure for them while out of power; Miller built a small one.',
      },
      {
        type: 'p',
        text:
          'In January 2025 he returned as deputy chief of staff for policy and homeland security adviser — a combination that had no real precedent. The policy shop writes the instructions; the homeland security adviser convenes the machinery that executes them. Holding both meant that Miller did not have to persuade a cabinet secretary to adopt his design, because he was often speaking to the department in two voices at once. Reporting described him telephoning mid-level officials directly, at all hours, and setting an internal target of 3,000 arrests a day — a number with no basis in operational capacity, and one that converted enforcement into a quota.',
      },
      {
        type: 'p',
        text:
          'His portfolio expanded well past immigration. By early 2026 he had a hand in foreign policy questions, in the campaign against universities over “woke” curricula, in District of Columbia governance, in transgender policy and in the administration’s posture toward pro-Palestinian protest. Colleagues described him to NBC as “the hammer.” The White House press secretary described him as bringing “all corners of the government” together. One person close to the president put it more sharply: “I think it’s kind of Stephen versus the entirety of the federal government.”',
      },
      {
        type: 'quote',
        text:
          'He does not merely advise Trump; he translates Trump’s instincts into enforceable action. If Miller supplies the ideology, Vought supplies the machinery.',
        who: 'Analytic summary of the division of labour reported across NYT, NBC and PBS Frontline, 2026',
      },
      {
        type: 'p',
        text:
          'The Minneapolis episode is the hinge. In January 2026 federal agents shot and killed two American citizens during enforcement operations, provoking nationwide protests. Much of the administration assumed Miller’s authority would recede; several Republicans said so publicly. It did not. He adjusted tactics — less visible raiding, more pressure through paperwork, detention and agreements with third countries — and kept the design authority. In the spring, four cabinet officials left; he did not.',
      },
      {
        type: 'p',
        text:
          'Then came the defeat. The party lost both chambers, seven Senate seats, and roughly two-thirds of the country’s confidence on the economy. The president’s own explanation for the loss conceded the war. His vice president went further and blamed the war outright, in writing, which is the closest thing to a public rupture inside the administration since January 2021. And in that moment the president chose the enforcement architect.',
      },
      {
        type: 'h',
        text: 'What the title actually adds',
        kicker: 'FOUR INSTRUMENTS',
      },
      {
        type: 'p',
        text:
          'A chief of staff gains four things a deputy does not have. First, the paper: all decision memoranda, executive orders and agency correspondence route through the office, which means the chief decides what the president is asked to decide. Miller was already one of a handful of staffers who approved every executive order; now he controls the sequence in which they arrive.',
      },
      {
        type: 'p',
        text:
          'Second, personnel. The Presidential Personnel Office sits inside the chief’s operational ambit. In an administration that has just lost a congressional majority and expects subpoenas in January, control of appointments — who is confirmed, who is acting, who is simply never replaced — is control of what the government can still do.',
      },
      {
        type: 'p',
        text:
          'Third, Congress. This is the counter-intuitive one. The incoming Democratic majorities will demand witnesses. The chief of staff is the officer who decides who testifies, what documents are asserted over, and how the White House negotiates the terms of oversight. A president facing hostile committees typically appoints a conciliator to that job. This president appointed the witness the committees most want.',
      },
      {
        type: 'p',
        text:
          'Fourth, and most important, the definition of what is possible. Staff who bring the president an option he already wants are rewarded; staff who bring him constraints are removed. Wiles’s principal value was that she could tell him no, and that she was credited with keeping the operation politically coherent. Miller’s is that he tells him yes with a legal theory attached.',
      },
      {
        type: 'factbox',
        title: 'THE MILLER FILE',
        rows: [
          ['Born', '23 August 1985, Santa Monica, California'],
          ['Education', 'Duke University, BA political science, 2007'],
          ['2016', 'Joins Trump campaign as speechwriter and policy adviser'],
          ['2017–21', 'Senior adviser; travel restrictions, zero-tolerance, DACA'],
          ['2021–25', 'Founder, America First Legal'],
          ['2025–26', 'Deputy chief of staff for policy; homeland security adviser'],
          ['9 Nov 2026', 'White House chief of staff; youngest since Hamilton Jordan'],
        ],
      },
      {
        type: 'h',
        text: 'The risk he now owns',
        kicker: 'THREE FAILURE MODES',
      },
      {
        type: 'p',
        text:
          'The first is legal. The oversight committees have already named him. Robert Garcia, the incoming chair of House Oversight, told him to “lawyer up” within hours of the announcement; Hakeem Jeffries, the incoming Speaker, called him “a dangerous xenophobe and a reckless extremist who has American blood on his hands.” Those are political statements, not charges. But the attorney general has publicly described himself as Miller’s lawyer, which removes the ordinary buffer between a White House policy and a prosecution decision. When the investigations arrive, the Justice Department’s independence will be tested by the man who used to defend the president in court and now defends the chief of staff’s policies.',
      },
      {
        type: 'p',
        text:
          'The second is institutional. Enforcement without appropriations is a press release. The Democratic House will not fund the detention expansion; the Democratic Senate will not confirm replacements for departing officials. A chief of staff who has spent his career designing demand-side policy now has to run a supply-constrained government, and his skill set is not obviously adapted to that.',
      },
      {
        type: 'p',
        text:
          'The third is political, and it is the one the president evidently does not regard as a risk. The administration’s own base is fracturing over the war and the Epstein files. Elevating the enforcement architect tells the anti-war faction — Carlson, Greene, Massie, Kent — that the party has chosen the other side of the civil war. Two years before an open presidential primary, with the vice president’s inheritance suddenly uncertain, that is a decision with consequences the chief of staff will have to manage from inside the building.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'money',
    numeral: 'IV',
    plates: ['06', '10'],
    title: 'The Money Wing',
    standfirst:
      'The business alliance that bought deregulation is the part of the coalition least able to survive a Democratic Congress — and the part with the most to lose.',
    blocks: [
      {
        type: 'p',
        text:
          'The photograph of the tech chief executives in the front row at the January 2025 inauguration has become the emblem of the period, and by November 2026 it reads less like a coronation than a list of future witnesses. Musk, Bezos, Zuckerberg, Pichai and Cook seated together behind the new president; within twenty-two months, one of them had publicly broken with him, one had been sanctioned by his own industry’s politics, and all of them were exposed to subpoenas from a Congress their money had helped to lose.',
      },
      {
        type: 'p',
        text:
          'The alliance was always a transaction, and it was priced honestly. The industry wanted three things: no AI licensing regime, a permissive crypto framework, and relief from antitrust and content liability. It largely got them. Sacks, as czar, ran a light-touch policy shop and then left government to chair the President’s Council of Advisors on Science and Technology, which was stocked with Zuckerberg, Andreessen, Ellison, Huang, Brin, Dell, Safra Catz and Lisa Su. When a government testing order for frontier models reached the president in May 2026, Sacks, Musk and Zuckerberg called him; the order was pulled.',
      },
      {
        type: 'p',
        text:
          'The crypto wing was more direct. The GENIUS Act passed in July 2025 with bipartisan support. The SEC ended or dropped enforcement actions against a series of firms whose founders or executives had given to Trump committees or the inaugural fund, in several cases within weeks of the donation. The president pardoned Changpeng Zhao of Binance. Meanwhile the family’s own ventures — World Liberty Financial, the $TRUMP meme coin, American Bitcoin — produced, by Reuters’ estimate, at least $2.3 billion for the Trumps while more than a million investors lost roughly the same amount. The president’s 2025 disclosure, released in June 2026, recorded more than $1.4 billion in crypto-related income.',
      },
      {
        type: 'p',
        text:
          'Of all of it, the envoys are the most consequential, because they combine the business wing with the family wing and put both inside the diplomatic chain. Kushner’s Affinity manages about $6.16 billion, roughly 99% foreign-sourced, with Riyadh the largest backer, while he negotiates Gaza and Iran as an unpaid volunteer with no filed disclosure. Witkoff co-founded World Liberty Financial with the president and his sons before taking the Middle East, Ukraine and Iran files; a firm controlled by the Emirati national security adviser bought 49% of the venture days before the inauguration for $500 million, $31 million of which went to Witkoff family entities. Forbes put his personal gain from the crypto venture at roughly $280 million, lifting his net worth 15% during his government service.',
      },
      {
        type: 'note',
        text:
          'None of the individuals above has been charged with any crime in connection with these dealings. Both firms deny any connection between policy and investment. The analytic claim here is narrower and harder to litigate: the administration has not constructed a firewall between the officials who negotiate with foreign governments and the private firms that take those governments’ money. Where there is no firewall, the only control is the official’s own judgement — and judgement is not an accountability mechanism.',
      },
      {
        type: 'p',
        text:
          'The midterms changed the arithmetic. Democrats campaigned against the tech-right alliance and won on the cost of living, and the first record-preservation letters have gone to Nvidia and Amazon. A Democratic House can subpoena; a Democratic Senate can refuse confirmations; neither can easily unwind a completed merger, but both can make the next four years of AI policy expensive. The firms that bought deregulation now have to decide whether the purchase retains value when the seller has lost the legislature.',
      },
      {
        type: 'p',
        text:
          'That is the strategic trap the money wing now occupies. It cannot publicly abandon a president who still controls the agencies for two more years, and it cannot afford to be photographed with him going into a primary season in which the Democratic nominee will run against exactly that photograph. The result is likely to be a quiet widening of distance: fewer Mar-a-Lago dinners, more statements about the importance of bipartisanship, continued donations to both sides. The alliance will not break. It will depreciate.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'filter',
    numeral: 'V',
    plates: ['07'],
    title: 'The Filter',
    standfirst:
      'Seven senior departures in 2026, five of them women, all replaced in the same direction. Turnover is the selection mechanism, not a symptom.',
    blocks: [
      {
        type: 'p',
        text:
          'The received interpretation of high staff turnover is dysfunction: a chaotic president, an exhausted staff, a government running on acting officials. That interpretation is wrong here, or at least incomplete. Read the exits as a sequence and a rule appears.',
      },
      {
        type: 'p',
        text:
          'Noem went first, in March, after hearings and after federal agents killed two American citizens in Minneapolis. She was the public face of the deportation programme and the programme did not change; the face did. Bondi went in April, reportedly because the Justice Department was not moving aggressively enough against the president’s political opponents — she was replaced by the deputy who had been his personal defence lawyer. Chavez-DeRemer resigned from Labor under an inspector-general investigation and was replaced by her deputy. Gabbard resigned from the intelligence directorate, citing her husband’s illness, amid friction over the Iran war, and was replaced by a Wall Street lawyer with three Trump appointments to his name.',
      },
      {
        type: 'p',
        text:
          'Then the summer: the press secretary left, the deputy press secretary left, the White House counsel left, the legislative affairs director left, and one of the two operational deputy chiefs of staff left for the campaign and did not return. By November the building had fewer senior staff than at any point in the term, and the survivors were the ones who had been there longest. A White House official told Semafor the quiet part: “the people that have been with POTUS the longest will benefit.”',
      },
      {
        type: 'p',
        text:
          'Wiles was the last of the restraining layer. She was, by every account, the one person who could tell the president no and be heard; the exposé published at the end of 2025 — in which she was quoted calling the vice president a conspiracy theorist and the budget director “a right-wing absolute zealot” — did not remove her, because the president valued the function. The election did. Trump blamed her for the defeat in front of others on election night, and four days later she was moved to the political operation and replaced by the man whose policies the voters had just rejected.',
      },
      {
        type: 'quote',
        text:
          'Stephen Miller should lawyer up.',
        who: 'Rep. Robert Garcia, incoming chair, House Oversight Committee, 6 November 2026',
      },
      {
        type: 'p',
        text:
          'Notice what the filter optimises for. It does not remove people who fail. Noem’s department killed two citizens; she got an envoy post. Bondi’s department mishandled the Epstein files; she got a private-sector send-off and a thank-you. It removes people who restrain, who hesitate, who generate the appearance of independence — and it replaces them with people who will do the same thing faster. Failure is survivable. Friction is not.',
      },
      {
        type: 'p',
        text:
          'The consequence is a government with fewer people able to say no and more people with an incentive to say yes early. That is not a claim about anyone’s character. It is a claim about what the selection pressure selects, and it is the same claim the diagrams in this book make visually: the arrows only ever point one way.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'future',
    numeral: 'VI',
    title: 'The Two Years',
    standfirst:
      'A hostile Congress, a war that is not over, a base in civil war, and an open succession. What the promotion tells us about how this ends.',
    blocks: [
      {
        type: 'p',
        text:
          'Begin with the calendar. The 120th Congress convenes in January 2027 with Democratic majorities in both chambers. It can subpoena, hold contempt votes, refuse confirmations, and — with a two-thirds vote that does not exist — impeach. It cannot repeal the enforcement machinery by itself, and it cannot reverse a war. What it can do is make every remaining appointment a fight and every remaining dollar conditional. That is the terrain on which Miller will spend his tenure.',
      },
      {
        type: 'p',
        text:
          'The second fact is the war. Miller’s pitch for the job, as reported, was that the president needed to wind it down — a striking position for a man whose public identity is domestic enforcement, and evidence that he understands the political constraint better than his reputation suggests. He is not the anti-war faction’s candidate. He is the candidate who recognises that the war is the reason the party lost, and who may be willing to trade a foreign-policy concession for domestic room.',
      },
      {
        type: 'p',
        text:
          'The third fact is the fracture. The MAGA coalition that won in 2024 has split three ways: an institutionalist-populist core around the White House, a transaction-driven tech and donor wing that wants deregulation and nothing else, and an anti-interventionist faction that has left the tent and is talking about a new party. Tucker Carlson hosted Marjorie Taylor Greene, Thomas Massie and Joe Kent at his home in Maine in August to plan it. Massie lost his primary to a Trump-endorsed challenger; Greene resigned from Congress; Kent resigned from the administration over the war. The president’s response was to call them traitors and losers, and then to promote the man whose portfolio they most oppose.',
      },
      {
        type: 'p',
        text:
          'The fourth fact is the succession. The vice president was the heir until 3 November. He remains the most likely nominee on paper, with early polling leads and a deference network that includes Rubio and Youngkin. But he publicly blamed the war for the defeat, he has spoken about family considerations, and the secretary of state — who now holds two of the most powerful foreign-policy jobs in the government — has been conspicuously visible in the states that matter. Trump has not endorsed anyone. An open primary with a defeated incumbent’s shadow over it is the most volatile political object in the country.',
      },
      {
        type: 'h',
        text: 'Three readings of the promotion',
        kicker: 'HOW TO INTERPRET WHAT HAPPENED',
      },
      {
        type: 'p',
        text:
          'The first reading is loyalty as its own argument. The president has spent a decade rewarding the people who stayed, and Miller stayed through the first impeachment, the 2020 loss, the litigation, the indictments and the interregnum. On this reading, the appointment is the predictable payment of a debt, and its policy content is secondary.',
      },
      {
        type: 'p',
        text:
          'The second reading is governance collapse by design. The president has concluded that he cannot legislate, so he will govern by instruction; that he cannot persuade, so he will enforce; and that he cannot be held to account by a Congress he does not control unless the executive refuses to be. On this reading, the appointment is a declaration that the next two years will be conducted through executive instruments and tested in court — and that the person running the White House will be the person who has spent his career designing those instruments.',
      },
      {
        type: 'p',
        text:
          'The third reading is the one this book finds most convincing, because it is the only one that explains the timing. The president did not need a new chief of staff; Wiles was, by his own account, doing an outstanding job until the votes came in. He needed a signal. In a single personnel move he told the base that the agenda was unchanged, told the donors that deregulation continued, told the incoming Congress that oversight would be resisted at the top, and told the anti-war faction that its price for returning had gone up. The cost was the last senior official who could say no.',
      },
      {
        type: 'p',
        text:
          'Whether that is a strategy or an instinct is unknowable, and probably a distinction without a difference in this presidency. What is knowable is the structure it produces, and structure is what the diagrams in this book measure: one person at the centre, a court with no confirmation requirement, a set of instruments that obey, a transaction class that pays, and an exit door that only opens in one direction.',
      },
      {
        type: 'quote',
        text:
          'The mission now is more clear than ever: Fight with all of our soul to support our President and defend this magnificent Republic.',
        who: 'Stephen Miller, first statement as incoming chief of staff, 6 November 2026',
      },
      {
        type: 'p',
        text:
          'That sentence is worth reading twice. It is addressed to one man, and it identifies the country as something to be defended from — the note of a chief of staff who understands his job as loyalty rather than management. Presidents have had chiefs like that before. They have rarely had one who also wrote the policy.',
      },
    ],
  },
];

export const SOURCES: Array<{ group: string; items: string[] }> = [
  {
    group: 'THE PROMOTION',
    items: [
      'The New York Times, “Trump Elevates Stephen Miller, a Fiery Hard-Liner, to Chief of Staff,” 6–7 Nov 2026, incl. Maggie Haberman analysis.',
      'The New York Times, “Democrats Seize Control of Congress as Voters Rebuke Trump,” 3–4 Nov 2026.',
      'Reuters, “Factbox: Before his promotion, Stephen Miller designed Trump’s immigration crackdown,” 6 Nov 2026.',
      'Al Jazeera, “Trump names Stephen Miller as new chief of staff, replacing Susie Wiles,” 6 Nov 2026.',
      'Los Angeles Times, “Trump taps Stephen Miller as chief of staff, doubling down after rout,” 6 Nov 2026.',
      'Bloomberg, “Trump Taps Miller to Replace Wiles as Chief of Staff,” 6 Nov 2026.',
      'NBC News live coverage, 6–7 Nov 2026, incl. Todd Blanche remarks and CPAC Mar-a-Lago speech.',
      'The Hill, “Susie Wiles out, Stephen Miller in, as Trump’s chief of staff,” 6 Nov 2026.',
      'Time, “Stephen Miller to Be Trump’s New Chief of Staff, Replacing Susie Wiles,” 6 Nov 2026.',
      'Duke Chronicle, “Duke alumnus Stephen Miller promoted to White House chief of staff,” 6 Nov 2026.',
    ],
  },
  {
    group: 'THE MIDTERMS AND THE WAR',
    items: [
      'BBC News live results, 2026 US midterm elections, 4–6 Nov 2026 (Senate 54 D; House 250+ D).',
      'The Washington Post, “Democrats win control of House, Senate as voters spurn Trump,” 3–4 Nov 2026.',
      'CBS News live updates, 3–5 Nov 2026; exit polling on the economy and the Iran war.',
      'The Irish Times, “Trump responds to US midterms defeat,” 4 Nov 2026 (presidential quotes on Iran).',
      'PBS Frontline, “The War Cabinet,” first broadcast 26 May 2026.',
      'The Guardian / Reuters, coverage of the eight-month Iran war and casualty figures, 2026.',
    ],
  },
  {
    group: 'THE COURT AND THE CABINET',
    items: [
      'Semafor, “Trump’s White House inner circle is shrinking,” 31 Aug 2026.',
      'Politico, “Who has Oval walk-in privileges?”, 14 Feb 2025; “‘The writing on the wall’: Trump’s staff departs,” 23 Aug 2026.',
      'The Daily Beast, “West Wing Is Crumbling as Trump’s Behavior Triggers Exodus,” 15 Aug 2026; Natalie Harp profile, 13 Aug 2026.',
      'NBC News, “Trump’s ‘hammer’: Stephen Miller’s power extends far beyond immigration,” 24 Feb 2026.',
      'People, “Everyone Who Has Left or Been Fired from Donald Trump’s Second Administration,” updated 6 Nov 2026.',
      'BBC News, “Trump removes US Attorney General Pam Bondi,” 3 Apr 2026.',
      'The 19th, “Tulsi Gabbard is fourth woman Trump’s Cabinet has lost in three months,” 2026.',
      'Vanity Fair / Chris Whipple, Wiles profile and excerpts, Dec 2025–2026.',
    ],
  },
  {
    group: 'MONEY, ENVOYS AND THE DONOR CLASS',
    items: [
      'Reuters, “Under the Trump crypto playbook, the family always wins. Investors don’t,” 9 Jun 2026.',
      'Senate Finance Committee (Wyden) and House Oversight (Garcia) letters re Kushner and Affinity Partners, 19 Mar and 16 Apr 2026.',
      'House Oversight Committee minority letter re Affinity and Phoenix Financial, 5 Oct 2026.',
      'Bloomberg, “Kushner disappoints Mideast clients who spent millions seeking sway,” 14 May 2026.',
      'The New York Times, “Democrats Demand Answers on Jared Kushner’s Mideast Business Dealings,” 19 Mar 2026; Witkoff investigation, Jan 2026.',
      'Forbes, “How Peace Envoy Steve Witkoff Got Richer Thanks To Trump And Elon Musk,” 4 Apr 2026.',
      'Rep. Greg Stanton, floor correspondence to Secretary Rubio re Witkoff and Kushner conflicts, 3 Jun 2026.',
      'The Atlantic, “The Venture-Capital Populist” (David Sacks), June 2026 issue.',
      'Fortune, “Tech billionaires convinced Trump to back off an AI executive order,” 22 May 2026.',
      'Financial Times, “How dozens of Trump’s donors have benefited from his second term,” 2025.',
      'The Guardian, “Tech barons cozied up to Trump. What will they do in newly blue America?”, 5 Nov 2026.',
    ],
  },
  {
    group: 'THE FRACTURE',
    items: [
      'Brookings, “MAGA Republicans won the party but may lose the future,” 4 Jun 2026.',
      'The Conversation, “Is Trump losing the support of his Maga base?”, 30 Apr 2026.',
      'Wired / Raw Story, reporting on the Carlson–Greene–Massie–Kent meeting in Maine, Aug 2026.',
      'CBS News, “Vance blames Iran conflict for GOP midterm defeats,” 4 Nov 2026.',
      'NBC News, “As Vance locks down early 2028 support…,” Jan 2026; Mundo América, Vance–Rubio succession analysis, 4 Nov 2026.',
    ],
  },
  {
    group: 'METHOD AND CAVEATS',
    items: [
      'All four indices (access, formal, loyalty, brokerage) are editorial judgements constructed for this exhibit; they are not measurements and are not comparable to any external dataset.',
      'Timeline dates are to the day where reported and to the month where only a month is public.',
      'Tenure bars are drawn from public biographies and financial disclosures; edges are approximate months.',
      'Where a claim rests on anonymous sourcing in a single outlet it is described as reported rather than established.',
    ],
  },
];
