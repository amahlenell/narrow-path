// Copy for the built-in checkpoints. Each points at a real verse in
// scripture.ts. Reward ideas are only *suggestions*: nothing is ever bought
// for you, and you choose together which one to claim.

export type MilestoneContent = {
  days: number;
  place: string; // name of the checkpoint on the path
  blurb: string;
  verseId: string;
  rewardIdeas: string[];
};

export const MILESTONE_CONTENT: MilestoneContent[] = [
  {
    days: 3,
    place: 'The Trailhead',
    blurb: 'Three days in. Starting is the hardest part, and you have started — together.',
    verseId: 'ps-119-105',
    rewardIdeas: ['Pick a song for the path and play it on a walk', 'Home-made hot chocolate and a card for each other'],
  },
  {
    days: 7,
    place: 'Willow Bend',
    blurb: 'A whole week. Notice how it feels to have kept your word to each other.',
    verseId: 'prov-3-5-6',
    rewardIdeas: ['Coffee date', 'Picnic with a thermos and a favourite book to share', 'Ice-cream walk at sunset'],
  },
  {
    days: 14,
    place: 'The Quiet Meadow',
    blurb: 'Two weeks of showing up. This is becoming who you are, not just something you do.',
    verseId: 'prov-4-18',
    rewardIdeas: ['Write each other a letter', 'Cook a favourite meal together', 'Make a playlist for each other'],
  },
  {
    days: 21,
    place: 'Lantern Ridge',
    blurb: 'Three weeks. Habits take root here — and so does trust.',
    verseId: 'col-3-14',
    rewardIdeas: ['Board-game night with good snacks', 'Visit a lookout or beach you have never been to', 'Thrift-shop date: find each other a small gift under $10'],
  },
  {
    days: 30,
    place: 'The River Crossing',
    blurb: 'A month. Pause and give thanks for how far you have come.',
    verseId: 'isa-40-31',
    rewardIdeas: ['Surprise adventure together', 'Day trip somewhere new', 'Camp-out under the stars (separate tents, of course)'],
  },
  {
    days: 50,
    place: 'High Pastures',
    blurb: 'Fifty days. The view is opening up and the path is getting brighter.',
    verseId: 'gal-6-2',
    rewardIdeas: ['Special dinner date', 'Pick a hike and a sunrise to watch', 'A day of serving someone else together'],
  },
  {
    days: 75,
    place: 'The Stone Steps',
    blurb: 'Seventy-five days of choosing each other well.',
    verseId: 'eccl-4-9-10',
    rewardIdeas: ['Make a photo book of the journey so far', 'A day trip with a long, unhurried lunch', 'Try a new craft or class together'],
  },
  {
    days: 100,
    place: 'The Hundredth Hill',
    blurb: 'One hundred days. Whatever else happens, this is real growth.',
    verseId: 'phil-3-13-14',
    rewardIdeas: ['A memorable shared experience', 'A weekend away with family or friends nearby', 'Plant a tree together'],
  },
  {
    days: 180,
    place: 'The Long Ridge',
    blurb: 'Half a year. You can see the cross clearly from here.',
    verseId: 'lam-3-22-23',
    rewardIdeas: ['A proper celebration dinner with your people', 'A day at a place that matters to your story', 'Write a letter to your future wedding-day selves'],
  },
  {
    days: 365,
    place: 'The Foot of the Cross',
    blurb: 'A full year. Give thanks — you walked it side by side.',
    verseId: 'ps-34-18',
    rewardIdeas: ['A meaningful trip together', 'Renew your commitment in prayer with someone you trust', 'A keepsake that marks the year'],
  },
];

const byDays = new Map(MILESTONE_CONTENT.map((m) => [m.days, m]));
export const milestoneContent = (days: number) => byDays.get(days);

/** Gentle ideas for the "reset challenge" — never a punishment. */
export const RESET_CHALLENGES = [
  { id: 'pray_together', title: 'Pray together', body: 'Take ten quiet minutes to pray for each other, out loud or silently side by side.' },
  { id: 'discuss_boundaries', title: 'Talk about boundaries', body: 'Kindly and honestly: what helps you both, and what makes it harder? Agree on one change.' },
  { id: 'write_letter', title: 'Write a letter', body: 'Each write a short letter on why you made this commitment. Read them to each other.' },
  { id: 'plan_date', title: 'Plan a temptation-free date', body: 'Choose something fun, public and full of daylight. Plan it together.' },
  { id: 'read_passage', title: 'Read a passage together', body: 'Read a chapter of the Bible together and share one thing that stood out.' },
] as const;

export type ResetChallengeId = (typeof RESET_CHALLENGES)[number]['id'];

export const RESET_MESSAGES = [
  'You are not starting from nothing. Everything you learned and every day you honoured still happened.',
  'God’s mercy is not used up. Confess, receive forgiveness, and walk again.',
  'This is a new beginning on the same path — and you are still walking it together.',
];
