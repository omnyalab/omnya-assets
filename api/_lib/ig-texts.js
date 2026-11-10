// Every word the Instagram bot says. Nico's messages (from his note "messaggi insta", 3/11/2026)
// are word for word; the button labels, the public replies and the follow-ups are new.
// Button and quick-reply labels: 20 characters at most (Instagram cuts the rest).

export const BLUEPRINT = 'https://omnyalab.com/the-blueprint';
export const TOWER_BLUEPRINT = 'https://omnyalab.com/the-tower-blueprint';
export const TOWER_FLOORS = 'https://omnyalab.com/the-tower-floors';
export const FILM = 'https://www.omnyalab.com/3d-to-film';
export const BUILD = 'https://www.omnyalab.com/the-build-blueprint';
export const TOWERS = 'https://www.omnyalab.com/the-towers-blueprint';
export const CITY = 'https://www.omnyalab.com/city';
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
const towerBlueprint = `The Tower Blueprint is free on this page, and right under it there’s the full method we use for our towers: ${TOWER_BLUEPRINT}\n\n${towerRest}`;

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

/** The floors reel: the tower messages, the page with the floors. */
const floors = Object.fromEntries(Object.entries(tower).map(([k, v]) => [k, typeof v === 'string' ? v.replace(TOWER_BLUEPRINT, TOWER_FLOORS) : v]));

/**
 * The reels that came after (3D to film, Build, Towers): the messages of their ManyChat automations
 * (docs/DM-INSTAGRAM.md), one DM with the link of the page and no question after it.
 * name = how the DM calls it, page = the sentence about the page, url = the page.
 */
const funnel = ({ name, url, page, replies, opener: first, nudge }) => ({
  url,
  ask: false,
  publicReplies: replies || [`Sent 🙌🏻 check your DMs for ${name}`, 'Just sent it, check your DMs 👀', 'Done! It’s in your DMs 🫶🏻'],
  cantDm: `We can’t send you ${name.replace(/^The /, 'the ')} unless you send us a text, if you want it, just send us a text 🫶🏻`,
  opener: { text: first || `Hey 🙌🏻 ${name} is ready, tap below and I’ll send it over 👇🏻`, button: 'Get the Blueprint' },
  followFirst: { ...followFirst, text: followFirst.text.replace('The Blueprint', name) },
  blueprintFollower: `Here you go 👇🏻 ${page}: ${url}`,
  blueprintNewFollower: `Thanks for the follow 🙌🏻 ${page}: ${url}`,
  nudgeFollow: { ...nudgeFollow, text: nudgeFollow.text.replace('The Blueprint', name) },
  nudgeQuestion: nudge || `Did you get a chance to open ${name}? 👀 If you’re working on a project, the first image is on us 🫶🏻`,
});

const film = funnel({
  name: 'The 3D to film blueprint',
  url: FILM,
  page: 'Our 3D to film method is free on this page, and right under it there’s the Full Blueprint with every prompt we used for this villa',
  replies: ['Sent it to your DMs 👀', 'Check your DMs, the blueprint is there 🙌🏻', 'Just sent you the link, check your DMs 👇🏻'],
  opener: 'Hey, thanks for the comment 🙌🏻 The 3D to film blueprint is ready for you, tap the button below and I’ll send it over 👇🏻',
  nudge: 'Did you get a chance to open the blueprint? 👀 If you’re working on a house, the first image is on us 🫶🏻',
});

const build = funnel({
  name: 'The Build Blueprint',
  url: BUILD,
  page: 'The Build Blueprint is free on this page, and right under it there’s the full method behind the house that builds itself',
});

const towers = funnel({
  name: 'The Towers Blueprint',
  url: TOWERS,
  page: 'The Towers Blueprint is free on this page, and right after it there’s the full method behind the three towers where you choose the view',
});

/** Omnya City (word HOUSE): the messages of the ManyChat flow; the link is personal and is made at the moment (api/_lib/city.js). */
const city = {
  url: CITY,
  ask: false,
  publicReplies: ['Sent you a DM 🏠 your lot is waiting', 'Check your DMs, your house link is there 🔑', 'Done! Check your DMs (or Requests) 🏠'],
  cantDm: 'We can’t send you your house link unless you send us a text, if you want it, just send us a text 🏠',
  opener: { text: 'Hey! Your free house in Omnya City is ready 🏠 Tap below and I’ll send you your personal link. It’s one link, one house, made for your username.', button: 'Get my house' },
  followFirst: { text: 'Almost there! The city is only for followers 🏠 Follow @omnyalab, then tap Done and your link comes right away.', button: 'Done' },
  stillNotFollowing: { text: 'Hmm, I can’t see the follow yet 👀 follow @omnyalab and tap Done again 👇🏻', button: 'Done' },
  link: { text: 'Here’s your link 🔑 Tap Reserve my spot and your house lands on the next free lot. The earlier you tap, the closer to downtown. Your username designs it.', button: 'Reserve my spot' },
  nudgeFollow: { text: 'Still want your house in Omnya City? 🏠 follow @omnyalab and tap Done, your link comes right away 👇🏻', button: 'Done' },
  nudgeQuestion: '',
};

/**
 * Someone taps a button of an old ManyChat DM ("Get the Blueprint", "Following") and we never saw
 * their comment, so we can't know which reel it was: after the follow they get the pages to choose
 * from, as the ManyChat automation "Vecchi tasti Blueprint" did (7/11/2026).
 */
const legacy = {
  ask: false,
  followFirst: { ...followFirst, text: followFirst.text.replace('The Blueprint is ready for you', 'Your Blueprint is ready') },
  link: {
    text: 'Here you go 👇🏻 tap the one you asked for, every page has the free Blueprint and the full method right under it',
    buttons: [['Tower Blueprint', 'tower'], ['3D to film', 'film'], ['Build Blueprint', 'build']],
  },
  nudgeFollow: { ...nudgeFollow, text: nudgeFollow.text.replace('The Blueprint', 'your Blueprint') },
  nudgeQuestion: '',
};

/**
 * The buttons of the DMs ManyChat sent before the bot took over: what they do here, and which
 * messages they belong to when we don't know the person. Instagram gives us the label, not
 * ManyChat's own code. The same words typed as a message count too.
 */
export const oldButtons = {
  'get the blueprint': { payload: 'GET', kind: 'legacy' },
  following: { payload: 'DONE', kind: 'legacy' },
  'get my house': { payload: 'GET', kind: 'city' },
  done: { payload: 'DONE', kind: 'city' },
};

const base = { url: BLUEPRINT, ask: true, publicReplies, cantDm, opener, followFirst, stillNotFollowing, blueprintFollower, blueprintNewFollower, answerProject, answerCurious, nudgeFollow, nudgeQuestion };
const kinds = { tower: { ...tower, url: TOWER_BLUEPRINT }, floors: { ...floors, url: TOWER_FLOORS }, film, build, towers, city, legacy };

/** Every destination the bot knows: 'blueprint', 'tower', 'floors', 'film', 'build', 'towers', 'city' ('legacy' is only for old buttons). */
export const KINDS = ['blueprint', ...Object.keys(kinds)];

/** The texts for a destination; anything unknown gets the normal Blueprint. */
export const textsFor = (kind) => (kinds[kind] ? { ...base, ...kinds[kind] } : base);
