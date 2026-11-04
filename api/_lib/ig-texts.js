// Every word the Instagram bot says. Nico's messages (from his note "messaggi insta", 3/11/2026)
// are word for word; the button labels, the public replies and the follow-ups are new.
// Button and quick-reply labels: 20 characters at most (Instagram cuts the rest).

export const BLUEPRINT = 'https://omnyalab.com/the-blueprint';
export const TOWER_BLUEPRINT = 'https://omnyalab.com/the-tower-blueprint';
export const BOOK_CALL = 'https://omnyalab.com/book/call';

/** Under the comment, one at random, so Instagram doesn't see the same line a hundred times. */
export const publicReplies = [
  'Sent 🙌🏻 check your DMs for The Blueprint',
  'Just sent it, check your DMs 👀',
  'Done! It’s in your DMs 🫶🏻',
  'Check your DMs, The Blueprint is there 🙌🏻',
  'Sent you a DM 👇🏻 enjoy The Blueprint',
  'It’s in your inbox now 🙌🏻',
];

/** Under the comment when Instagram won't let us write to them. */
export const cantDm = 'We can’t send you the blueprint unless you send us a text, if you want it, just send us a text 🫶🏻';

/** Under the comment a few hours later, when the DM is still unopened. */
export const checkRequests = 'Sometimes it goes on “Request” or “General” check there🫶🏻';

/** First DM, the private reply to the comment: one button, so we can see if they follow. */
export const opener = {
  text: 'Hey 🙌🏻 The Blueprint is ready, tap below and I’ll send it over 👇🏻',
  button: 'Get the Blueprint',
};

/** Not following yet. */
export const followFirst = {
  text: 'Hey, thanks for the comment 🙌🏻 The Blueprint is ready for you, I just need one thing first: follow @omnyalab and I’ll send you the link right away (we post a new before and after every week, so you’ll see the method in action too).\nOnce you’ve followed, just reply “done” here 👇🏻',
  button: 'Done ✅',
};

/** Tapped Done, but the follow isn't there. */
export const stillNotFollowing = {
  text: 'Hmm, I can’t see the follow yet 👀 follow @omnyalab and tap Done again 👇🏻',
  button: 'Done ✅',
};

const rest = `Right under it there’s the full method we use for every reel, from the rough 3D to the final photo (and if you’d rather we do it on your project, the first image is on us).

Quick question so I can point you to the right part: are you working on a project right now, or just curious how we make them? 👀`;

/** Already following when they commented. */
export const blueprintFollower = `Hey, thanks for the comment 🙌🏻 here’s The Blueprint, it’s free: ${BLUEPRINT}\n\n${rest}`;

/** Started following because of the reel. */
export const blueprintNewFollower = `Thanks for the follow 🙌🏻 here’s The Blueprint, it’s free: ${BLUEPRINT}\n\n${rest}`;

/** The two answers under the question. */
export const choices = { project: 'Working on a project', curious: 'Just curious' };

export const answerProject = `Love it 🙌🏻 we can look at it together on a free 30-minute call: ${BOOK_CALL}\n\nOr just tell me a few lines about it here and I’ll get back to you.`;

export const answerCurious = 'Love that 👀 we post a new before and after every week, so keep an eye on the reels. And if a project comes up, the first image is on us 🫶🏻';

/** About 20 hours after their last message (Instagram allows DMs only within 24 hours of it). */
export const nudgeFollow = {
  text: 'Still want The Blueprint? 👀 follow @omnyalab and tap Done, I’ll send it right away 👇🏻',
  button: 'Done ✅',
};

export const nudgeQuestion = 'Did you get a chance to open The Blueprint? 👀 If you’re working on a project, the first image is on us.';

/** Under the tower reels (caption mentions a tower): Nico's tower messages (4/11/2026), the rest as above. */
const towerRest = 'Quick question so I can point you to the right part: are you working on a tower right now, or just curious how we make them? 👀';
const towerBlueprint = `The Tower Blueprint is free on this page, and right under it there’s the full method we use for our towers: ${TOWER_BLUEPRINT}\n\n(and if you’d rather have us do it on your tower, the first image is free, it’s on the same page)\n\n${towerRest}`;

const tower = {
  publicReplies: [
    'Sent 🙌🏻 check your DMs for The Tower Blueprint',
    'Just sent it, check your DMs 👀',
    'Done! It’s in your DMs 🫶🏻',
    'Check your DMs, The Tower Blueprint is there 🙌🏻',
    'Sent you a DM 👇🏻 enjoy The Tower Blueprint',
    'It’s in your inbox now 🙌🏻',
  ],
  cantDm: 'We can’t send you the Tower Blueprint unless you send us a text, if you want it, just send us a text 🫶🏻',
  opener: { text: 'Hey 🙌🏻 The Tower Blueprint is ready, tap below and I’ll send it over 👇🏻', button: 'Get the Blueprint' },
  followFirst: { ...followFirst, text: followFirst.text.replace('The Blueprint', 'The Tower Blueprint') },
  blueprintFollower: `Here you go 👇🏻 ${towerBlueprint}`,
  blueprintNewFollower: `Thanks for the follow 🙌🏻 ${towerBlueprint}`,
  answerCurious: 'Love that 👀 we post a new before and after every week, so keep an eye on the reels. And if a tower comes up, the first image is on us 🫶🏻',
  nudgeFollow: { ...nudgeFollow, text: nudgeFollow.text.replace('The Blueprint', 'The Tower Blueprint') },
  nudgeQuestion: 'Did you get a chance to open The Tower Blueprint? 👀 If you’re working on a tower, the first image is on us.',
};

const base = { publicReplies, cantDm, opener, followFirst, stillNotFollowing, blueprintFollower, blueprintNewFollower, answerProject, answerCurious, nudgeFollow, nudgeQuestion };

/** The texts for a post: 'tower' or anything else (the normal Blueprint). */
export const textsFor = (kind) => (kind === 'tower' ? { ...base, ...tower } : base);
