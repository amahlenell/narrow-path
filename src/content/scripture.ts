// Curated scripture. Text is the King James Version (public domain), so it can
// be shown in full without licensing concerns. Every entry is a real passage
// with its real reference — nothing is paraphrased or invented. Please check
// any verse you add against your own Bible. The reflections are original.

export type Verse = {
  id: string;
  reference: string;
  text: string;
  reflection: string;
  themes: ('daily' | 'milestone' | 'grace' | 'purity' | 'together')[];
};

export const BIBLE_VERSION = 'KJV';

export const VERSES: Verse[] = [
  {
    id: 'ps-119-105',
    reference: 'Psalm 119:105',
    text: 'Thy word is a lamp unto my feet, and a light unto my path.',
    reflection:
      'A lamp lights the next few steps, not the whole mountain. You only need enough light for today — and today you are not walking alone.',
    themes: ['daily', 'milestone'],
  },
  {
    id: 'prov-3-5-6',
    reference: 'Proverbs 3:5-6',
    text: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.',
    reflection:
      'Some days the way ahead feels steep and unclear. Trust is choosing the next faithful step before you can see the view.',
    themes: ['daily'],
  },
  {
    id: 'prov-4-18',
    reference: 'Proverbs 4:18',
    text: 'But the path of the just is as the shining light, that shineth more and more unto the perfect day.',
    reflection:
      'Growth is rarely dramatic. It is more like dawn: quiet, steady, and brighter each day than the last.',
    themes: ['daily', 'milestone'],
  },
  {
    id: 'matt-7-14',
    reference: 'Matthew 7:14',
    text: 'Because strait is the gate, and narrow is the way, which leadeth unto life, and few there be that find it.',
    reflection:
      'A narrow path is not a lonely or joyless one. It is the path that leads somewhere worth arriving. Walk it side by side.',
    themes: ['daily', 'purity'],
  },
  {
    id: 'eccl-4-9-10',
    reference: 'Ecclesiastes 4:9-10',
    text: 'Two are better than one; because they have a good reward for their labour. For if they fall, the one will lift up his fellow: but woe to him that is alone when he falleth; for he hath not another to help him up.',
    reflection:
      'This is why you are doing this together. Accountability is not about catching each other out; it is about being there to lift each other up.',
    themes: ['daily', 'together', 'grace'],
  },
  {
    id: 'gal-6-2',
    reference: 'Galatians 6:2',
    text: "Bear ye one another's burdens, and so fulfil the law of Christ.",
    reflection:
      'Ask each other tonight: what is one thing that felt heavy this week? Carrying it together makes it lighter.',
    themes: ['daily', 'together'],
  },
  {
    id: '1-thess-4-3-4',
    reference: '1 Thessalonians 4:3-4',
    text: 'For this is the will of God, even your sanctification, that ye should abstain from fornication: That every one of you should know how to possess his vessel in sanctification and honour;',
    reflection:
      'Honour is a way of loving someone: protecting who they are becoming, not only what you feel today.',
    themes: ['purity', 'daily'],
  },
  {
    id: '2-tim-2-22',
    reference: '2 Timothy 2:22',
    text: 'Flee also youthful lusts: but follow righteousness, faith, charity, peace, with them that call on the LORD out of a pure heart.',
    reflection:
      'Notice that the verse does not only say what to run from — it says what to run toward. What can you pursue together today?',
    themes: ['purity'],
  },
  {
    id: 'col-3-14',
    reference: 'Colossians 3:14',
    text: 'And above all these things put on charity, which is the bond of perfectness.',
    reflection:
      'Love is the thread that holds everything else together — your boundaries, your patience, your plans for a future together.',
    themes: ['together', 'milestone'],
  },
  {
    id: 'isa-40-31',
    reference: 'Isaiah 40:31',
    text: 'But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
    reflection:
      'Waiting is part of the path, and it is not wasted. Strength is being renewed in you even on the quiet days.',
    themes: ['daily', 'milestone'],
  },
  {
    id: 'lam-3-22-23',
    reference: 'Lamentations 3:22-23',
    text: "It is of the LORD's mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.",
    reflection:
      'Every morning is a fresh start that God has already prepared. Nothing about yesterday has used up His mercy.',
    themes: ['grace', 'daily'],
  },
  {
    id: '1-john-1-9',
    reference: '1 John 1:9',
    text: 'If we confess our sins, he is faithful and just to forgive us our sins, and to cleanse us from all unrighteousness.',
    reflection:
      'Confession is not the end of the story; it is the doorway back into it. God is faithful to forgive — and He asks you to receive that forgiveness.',
    themes: ['grace'],
  },
  {
    id: 'rom-8-1',
    reference: 'Romans 8:1',
    text: 'There is therefore now no condemnation to them which are in Christ Jesus, who walk not after the flesh, but after the Spirit.',
    reflection:
      'Accountability and condemnation are not the same thing. You can take a stumble seriously without believing that God has turned away from you.',
    themes: ['grace'],
  },
  {
    id: 'mic-7-8',
    reference: 'Micah 7:8',
    text: 'Rejoice not against me, O mine enemy: when I fall, I shall arise; when I sit in darkness, the LORD shall be a light unto me.',
    reflection:
      'Falling is not the last word. The same God who lights the path in the morning meets you in the dark.',
    themes: ['grace'],
  },
  {
    id: 'ps-37-23-24',
    reference: 'Psalm 37:23-24',
    text: 'The steps of a good man are ordered by the LORD: and he delighteth in his way. Though he fall, he shall not be utterly cast down: for the LORD upholdeth him with his hand.',
    reflection:
      'You are held while you walk. Even a stumble happens inside the grip of His hand.',
    themes: ['grace', 'daily'],
  },
  {
    id: 'ps-51-10',
    reference: 'Psalm 51:10',
    text: 'Create in me a clean heart, O God; and renew a right spirit within me.',
    reflection:
      'A good prayer to pray out loud together when you want a fresh start: not "make me perfect", but "renew me".',
    themes: ['grace', 'purity'],
  },
  {
    id: 'ps-34-18',
    reference: 'Psalm 34:18',
    text: 'The LORD is nigh unto them that are of a broken heart; and saveth such as be of a contrite spirit.',
    reflection:
      'When you feel sorry and small, God is not far off. He draws near to exactly that place.',
    themes: ['grace'],
  },
  {
    id: 'phil-3-13-14',
    reference: 'Philippians 3:13-14',
    text: 'Brethren, I count not myself to have apprehended: but this one thing I do, forgetting those things which are behind, and reaching forth unto those things which are before, I press toward the mark for the prize of the high calling of God in Christ Jesus.',
    reflection:
      'Even Paul said he had not yet arrived. Pressing on is the whole path — one step, again and again.',
    themes: ['milestone', 'grace'],
  },
  {
    id: 'prov-24-16',
    reference: 'Proverbs 24:16',
    text: 'For a just man falleth seven times, and riseth up again: but the wicked shall fall into mischief.',
    reflection:
      'The mark of a person walking with God is not that they never stumble, but that they keep getting back up.',
    themes: ['grace'],
  },
];

const byId = new Map(VERSES.map((v) => [v.id, v]));
export const verseById = (id: string) => byId.get(id);

/** Deterministic verse of the day: both partners see the same one. */
export function verseOfTheDay(date: string): Verse {
  const pool = VERSES.filter((v) => v.themes.includes('daily'));
  const [y, m, d] = date.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
  return pool[((dayNumber % pool.length) + pool.length) % pool.length];
}

export function verseForReset(seed: number): Verse {
  const pool = VERSES.filter((v) => v.themes.includes('grace'));
  return pool[Math.abs(seed) % pool.length];
}
