// Common false beliefs Christians carry, paired with a short biblical correction.
// "challenge" is optional — a concrete next step, not just something to read.
// "locked" entries are placeholder "Coming soon" slots — never spun, never
// discoverable, shown in the Belief Log only to reserve their place.
const FALSE_BELIEFS = [
  {
    id: 'fb-01',
    belief: "Everything happens for a reason, so I shouldn't grieve.",
    explanation: 'God working things for good does not cancel out real sorrow — Jesus himself wept, and Scripture tells believers to mourn with those who mourn.',
    reference: 'Read John 11:35 and Romans 12:15',
  },
  {
    id: 'fb-02',
    belief: "I keep falling into the same sin — I can't just repent and act the same with God.",
    explanation: 'We should keep our eyes on Jesus and what He achieved on the cross, not our sins. He forgives us when we repent with a willing heart — everyone goes through this.',
    reference: 'Read Hebrews 12:1-12, 1 John 1:9, Romans 8:1, and Romans 7:19, 24-25',
  },
  {
    id: 'fb-03',
    belief: 'God will only save me if I have works.',
    explanation: "The Bible clearly states that we're saved through faith by grace, not by works. Our works come when we're secure in the identity Jesus gave us, and He works through us.",
    reference: 'Read Ephesians 2:8-9, Titus 3:5, and Philippians 2:13',
  },
  {
    id: 'fb-04',
    belief: "If I don't feel something while praying or reading, I must not be doing it right.",
    explanation: "Feeling is a gift, but don't confuse it with the Giver. God can withhold that sense of feeling to test our loyalty — we should seek Him even when it feels like talking to a ceiling.",
    reference: 'Read 2 Corinthians 5:7, Psalm 42:5, Hebrews 11:6, and Psalm 63:1',
  },
  {
    id: 'fb-05',
    belief: 'Following God means my life will become easy and comfortable.',
    explanation: 'Jesus says quite the opposite — we will be persecuted, hated, and under spiritual warfare.',
    reference: 'Read 2 Corinthians 4:8-9, John 16:33, and 2 Timothy 3:12',
  },
  {
    id: 'fb-06',
    belief: 'God is disappointed in me.',
    explanation: 'If you belong to Christ, He sees you through the righteousness of Jesus, not your latest failure. Conviction from the Spirit draws you toward Him — shame that says "God is done with you" does not come from Him.',
    reference: 'Read Romans 8:1, 2 Corinthians 5:21, Hebrews 4:15-16, and 2 Corinthians 7:10',
  },
  {
    id: 'fb-07',
    belief: "Once I sin, I have to 'get right' before God will hear my prayers again.",
    explanation: "You don't need to earn your way back into God's hearing. You're invited to come boldly, in the middle of the mess, not after you've cleaned it up — in fact, without God you won't even be able to clean it up.",
    reference: 'Read Hebrews 4:15-16, Romans 5:8, and John 15:1-5',
  },
  {
    id: 'fb-08',
    belief: "If I were a 'real Christian,' I wouldn't still struggle with this sin.",
    explanation: "Even Paul described an ongoing internal battle between what he wanted to do and what he actually did. Struggling against sin is evidence you're alive to it, not evidence you've failed.",
    reference: 'Read Romans 7 and Galatians 5',
  },
  {
    id: 'fb-09',
    belief: "Doubting means I have weak faith, or I'm a bad Christian.",
    explanation: "Doubt honestly brought to God is not the opposite of faith — it's often how faith grows. Thomas doubted, and even John the Baptist sent his own disciples to ask if Jesus was really the Messiah. Sometimes those worried thoughts are just a knock on the door from the enemy — don't open it.",
    reference: 'Read John 20 and Jude 1:22',
  },
  {
    id: 'fb-10',
    belief: "God won't give you more than you can handle.",
    explanation: "That's a misquote of a verse about resisting temptation, not general suffering. Paul actually wrote that he was crushed beyond his own strength, so he'd rely on God instead of himself.",
    reference: 'Read 1 Corinthians 10:13 and 2 Corinthians 1',
  },
  {
    id: 'fb-11',
    belief: "Maybe God doesn't want me to spread the gospel — that's for other people, not me.",
    explanation: 'It\'s literally a command Jesus gave before He rose to Heaven. It isn\'t something for "special" Christians, nor is it optional — it\'s a commandment He gave us.',
    reference: 'Read Matthew 28:18-20',
  },
  {
    id: 'fb-12',
    belief: "I haven't been doing well, so God must love me less.",
    explanation: "God's love for us isn't earned by our performance — it's rooted in His Son, and He Himself said His love for us is unconditional.",
    reference: 'Read John 16:27, John 3:16, Romans 5:8, and 1 John 4:9-10',
  },
  {
    id: 'fb-13',
    belief: 'Feeling guilty means the Holy Spirit is convicting me.',
    explanation: "Conviction leads you to repentance, and toward God. It doesn't make you feel hopeless shame.",
    reference: 'Read Romans 8:26, John 14:26, Galatians 5:22-23, and Romans 8:1',
  },
  {
    id: 'fb-14',
    belief: "I'll just pray and God will forgive me.",
    explanation: "That's true when we're resisting sin and stumble along the way — not when we deliberately give in because \"we're forgiven anyway.\"",
    reference: 'Read Romans 2:4',
  },
  {
    id: 'fb-15',
    belief: "I need to understand everything that's going on to be able to walk with Jesus.",
    explanation: "The Bible says the exact opposite. We need to surrender to Him — He makes our paths straight. We were never meant to hold everything together; in fact, we can't.",
    reference: 'Read Proverbs 3:5-6, 2 Corinthians 5:7, Psalm 37:5, Proverbs 16:9, 1 Peter 5:7, Romans 12:1, and James 4:7',
  },
  {
    id: 'fb-16',
    belief: "If God hasn't answered yet, it must mean no.",
    explanation: "First, God's timing isn't ours — He sees the past, present, future, and the unseen. Second, He might already be answering your prayer, just not in the way you imagined.",
    reference: 'Read Isaiah 55:8-9, Ecclesiastes 3:11, Habakkuk 2:3, and Ephesians 3:20',
  },
  { id: 'fb-17', belief: 'Coming soon', explanation: '', reference: '', locked: true },
  { id: 'fb-18', belief: 'Coming soon', explanation: '', reference: '', locked: true },
  { id: 'fb-19', belief: 'Coming soon', explanation: '', reference: '', locked: true },
  { id: 'fb-20', belief: 'Coming soon', explanation: '', reference: '', locked: true },
  { id: 'fb-21', belief: 'Coming soon', explanation: '', reference: '', locked: true },
  { id: 'fb-22', belief: 'Coming soon', explanation: '', reference: '', locked: true },
  { id: 'fb-23', belief: 'Coming soon', explanation: '', reference: '', locked: true },
  { id: 'fb-24', belief: 'Coming soon', explanation: '', reference: '', locked: true },
  { id: 'fb-25', belief: 'Coming soon', explanation: '', reference: '', locked: true },
  { id: 'fb-26', belief: 'Coming soon', explanation: '', reference: '', locked: true },
];
