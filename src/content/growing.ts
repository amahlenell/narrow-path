// "Growing Together" content. All reflections are original; scripture is only
// ever referenced by id from scripture.ts so a verse can't be mis-quoted.

export type Devotional = { id: string; title: string; verseId: string; body: string; together: string };

export const DEVOTIONALS: Devotional[] = [
  {
    id: 'dev-light-for-today',
    title: 'Light for today',
    verseId: 'ps-119-105',
    body: 'A lamp does not light the whole mountain, just the next few steps. Faithfulness is usually small and daily: one honest choice, then another.',
    together: 'Share one small thing that helped you stay faithful this week.',
  },
  {
    id: 'dev-two-are-better',
    title: 'Why we walk together',
    verseId: 'eccl-4-9-10',
    body: 'Accountability is not about being watched; it is about not being alone when the path gets steep. Being someone’s safe place is a gift.',
    together: 'Tell each other how you want to be encouraged on hard days.',
  },
  {
    id: 'dev-new-mercies',
    title: 'Mercy that renews',
    verseId: 'lam-3-22-23',
    body: 'Mercy does not run out overnight. Whatever yesterday held, this morning is a fresh start offered by God, not earned by us.',
    together: 'Pray for each other by name, thanking God for one specific thing you see in the other.',
  },
  {
    id: 'dev-bear-burdens',
    title: 'Carrying one another',
    verseId: 'gal-6-2',
    body: 'Love shows up in the weight we share. Naming a struggle out loud takes some of its power away.',
    together: 'Is there a burden you’ve been carrying quietly? Share it, and pray.',
  },
  {
    id: 'dev-renewed-strength',
    title: 'Strength for the climb',
    verseId: 'isa-40-31',
    body: 'Waiting on God is not passive. It is leaning your whole weight on Him while you keep walking.',
    together: 'Where do you need fresh strength right now? Ask for it together.',
  },
  {
    id: 'dev-pressing-on',
    title: 'Pressing on',
    verseId: 'phil-3-13-14',
    body: 'Forgetting what is behind does not mean pretending it didn’t happen. It means refusing to let it define the direction you face.',
    together: 'What would you like to leave behind, and what are you reaching toward?',
  },
];

export const QUESTIONS: string[] = [
  'What is one way I made you feel loved this week?',
  'What does honouring God in our relationship look like on a normal Tuesday?',
  'When do we find it hardest to stay on the path, and what helps?',
  'What are you most looking forward to about marriage that has nothing to do with the physical side?',
  'How can I pray for you this week?',
  'What boundary are you grateful we have set? What one might help us next?',
  'What is something you’ve never told me you admire about me?',
  'How have you seen God at work in us lately?',
  'What does grace look like between us when one of us struggles?',
  'What dream would you like us to pray about together?',
  'What is a way we could serve someone else as a couple?',
  'What did you learn about yourself this week?',
];

export const HARD_DAY_MESSAGES: string[] = [
  'A hard day is not a failed day. You are still on the path, and you are not walking it alone.',
  'Feeling the pull does not mean you are weak. It means the commitment matters. Step back, pray, and call your partner.',
  'Take a walk, drink some water, text a friend, or pray out loud. Small changes of scene can help a lot.',
  'If today goes badly, grace is still there tomorrow. Honesty with each other is stronger than perfection.',
  'You chose this out of love for God and for each other. Remember why you started.',
];

/** Same pick for both partners on a given day. */
export function pickForDate<T>(items: readonly T[], date: string, offset = 0): T {
  const [y, m, d] = date.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000) + offset;
  return items[((dayNumber % items.length) + items.length) % items.length];
}
