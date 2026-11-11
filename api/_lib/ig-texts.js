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
export const FABLE = 'https://www.omnyalab.com/fable';
export const BOOK_CALL = 'https://omnyalab.com/book/call';
export const WHATSAPP = 'https://wa.me/393792220465';

/**
 * Under the comment: twelve ways to say "I sent it to you in DM", taken in turn and never the same
 * twice in a row under the same reel (lineAt in ig.js), so Instagram's filter doesn't see one line a
 * hundred times (10/11/2026: it held a reply back with "code 20 sub 1772107"). The first six are the
 * ones that were already there. One emoji each, short, the way Nico writes.
 */
const repliesFor = (name) => [
  `Sent 🙌🏻 check your DMs for ${name}`,
  'Just sent it, check your DMs 👀',
  'Done! It’s in your DMs 🫶🏻',
  `Check your DMs, ${name} is there 🙌🏻`,
  `Sent you a DM 👇🏻 enjoy ${name}`,
  'It’s in your inbox now 🙌🏻',
  'sent, it’s waiting for you in your DMs 🫶🏻',
  'just dropped it in your DMs 👀',
  'on its way, check your DMs 🙌🏻',
  `${name} just landed in your DMs 👀`,
  'you got it, check your DMs 👇🏻',
  'all yours, I just sent it in DM 🙌🏻',
];
export const publicReplies = repliesFor('The Blueprint');

/**
 * "Comment your city" (10/11/2026): when the comment is not the word but a city or a country of our
 * own list (ig-places.js), the public reply says the place back, and the DM is the one of always.
 * `place` is the name as the list spells it, never the commenter's own text.
 */
export const placeReplies = [
  (place) => `${place}, nice 🙌🏻 check your DMs`,
  (place) => `${place} 👀 love it, I just sent it in DM`,
  (place) => `hello ${place} 🙌🏻 it’s in your DMs`,
  (place) => `${place}, love that 🫶🏻 sent you a DM`,
  (place) => `${place} 🙌🏻 great, check your DMs, it’s there`,
  (place) => `nice one, ${place} 👀 it’s in your inbox now`,
  (place) => `${place}! done, it’s in your DMs 🫶🏻`,
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

/**
 * "Link diretto" (10/11/2026): the one DM that answers the comment already has the link, on a button
 * that opens the page. Until Meta's App Review passes, the taps and messages of people without a role
 * on the app never reach us, so nothing can wait for a tap; the follow is asked in words.
 */
const directFor = (name) => {
  // 11/11 night (Nico, "vai con la 1"): one wording for every DM that answers a comment. Instagram only takes text
  // there (no Advanced Access for the button), so the link goes on its own line right under these words. The follow
  // is asked in words and never checked (Nico, 10/11/2026).
  const s = name.replace(/^The /, '');
  const texts = [
    `As promised 🙌🏻 here’s your free ${s}, it’s all in the link below 👇🏻 and don’t forget to follow @omnyalab so you catch the next one, we drop a new build every week 🔥`,
  ];
  return { text: texts[0], texts, button: 'Get the Blueprint' };
};
export const direct = directFor('The Blueprint');

/**
 * Comment mode (ready, off): the follow is asked first and checked when they comment again, since
 * comments are the one thing Meta delivers from everyone. ask = the DM to the first comment, without
 * the link; almost = they commented again and still don't follow; linkNew / linkFollower = the text
 * over the link button for someone who just followed / already followed; askReplies = under the
 * first comment, in public.
 */
const commentFor = (name) => ({
  ask: `Hey 🙌🏻 ${name} is ready, one step first: follow @omnyalab, then comment DONE under the reel and I’ll send it right over 👇🏻`,
  almost: 'Almost there 👀 follow @omnyalab first, then comment again under the reel and it’s yours',
  linkNew: `Thanks for the follow 🙌🏻 ${name} is ready 👇🏻 we drop a new build every week, so keep an eye on the reels`,
  linkFollower: `Hey 🙌🏻 ${name} is ready 👇🏻 thanks for following, we drop a new build every week`,
  askReplies: ['Check your DMs 👀 one quick step and it’s yours', 'Just sent you a DM 🙌🏻 one quick step first', 'It’s in your DMs 👇🏻 one quick step and it’s yours'],
});
export const comment = commentFor('The Blueprint');

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

const rest = `Right under it there’s the full method we use for every reel, from the rough 3D to the final photo.

Quick question so I can point you to the right part: are you working on a project right now, or just curious how we make them? 👀`;

/** Already following when they commented. */
export const blueprintFollower = `Hey, thanks for the comment 🙌🏻 here’s The Blueprint, it’s free: ${BLUEPRINT}\n\n${rest}`;

/** Started following because of the reel. */
export const blueprintNewFollower = `Thanks for the follow 🙌🏻 here’s The Blueprint, it’s free: ${BLUEPRINT}\n\n${rest}`;

/** The two answers under the question. */
export const choices = { project: 'Working on a project', curious: 'Just curious' };

// 10/11/2026: the free image is over. Who has a project is offered a call or WhatsApp, to see a 3D demo of it.
export const answerProject = `Love it 🙌🏻 the best way is a quick call where I show you a 3D demo of your project, pick a time here: ${BOOK_CALL}\n\nOr text me on WhatsApp and we start from there: ${WHATSAPP}`;

export const answerCurious = 'Love that 👀 we drop a new build every week, so keep an eye on the reels, and if a project comes up just text me here 🫶🏻';

/** About 20 hours after their last message (Instagram allows DMs only within 24 hours of it). */
export const nudgeFollow = {
  text: 'Still want The Blueprint? 👀 follow @omnyalab and tap Done, I’ll send it right away 👇🏻',
  button: 'Done ✅',
};

export const nudgeQuestion = 'Did you get a chance to open The Blueprint? 👀 If you’re working on a project, tell me a few lines about it here and I’ll show you how it could look in 3D';

/** Under the tower reels (caption mentions a tower): Nico's tower messages (4/11/2026), the rest as above. */
const towerRest = 'Quick question so I can point you to the right part: are you working on a tower right now, or just curious how we make them? 👀';
const towerBlueprint = `The Tower Blueprint is free on this page, and right under it there’s the full method we use for our towers: ${TOWER_BLUEPRINT}\n\n${towerRest}`;

const tower = {
  publicReplies: repliesFor('The Tower Blueprint'),
  cantDm: 'We can’t send you the Tower Blueprint unless you send us a text, if you want it, just send us a text 🫶🏻',
  opener: { text: 'Hey 🙌🏻 The Tower Blueprint is ready, tap below and I’ll send it over 👇🏻', button: 'Get the Blueprint' },
  direct: directFor('The Tower Blueprint'),
  comment: commentFor('The Tower Blueprint'),
  followFirst: { ...followFirst, text: followFirst.text.replace('The Blueprint', 'The Tower Blueprint') },
  blueprintFollower: `Here you go 👇🏻 ${towerBlueprint}`,
  blueprintNewFollower: `Thanks for the follow 🙌🏻 ${towerBlueprint}`,
  answerProject: answerProject.replace('your project', 'your tower'),
  answerCurious: 'Love that 👀 we drop a new build every week, so keep an eye on the reels, and if a tower comes up just text me here 🫶🏻',
  nudgeFollow: { ...nudgeFollow, text: nudgeFollow.text.replace('The Blueprint', 'The Tower Blueprint') },
  nudgeQuestion: 'Did you get a chance to open The Tower Blueprint? 👀 If you’re working on a tower, tell me a few lines about it here and I’ll show you how it could look in 3D',
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
  // the page's own lines first, then the twelve of every page (the same line is never there twice)
  publicReplies: [...new Set([...(replies || []), ...repliesFor(replies ? 'the blueprint' : name)])],
  cantDm: `We can’t send you ${name.replace(/^The /, 'the ')} unless you send us a text, if you want it, just send us a text 🫶🏻`,
  opener: { text: first || `Hey 🙌🏻 ${name} is ready, tap below and I’ll send it over 👇🏻`, button: 'Get the Blueprint' },
  direct: directFor(name),
  comment: commentFor(name),
  followFirst: { ...followFirst, text: followFirst.text.replace('The Blueprint', name) },
  blueprintFollower: `Here you go 👇🏻 ${page}: ${url}`,
  blueprintNewFollower: `Thanks for the follow 🙌🏻 ${page}: ${url}`,
  nudgeFollow: { ...nudgeFollow, text: nudgeFollow.text.replace('The Blueprint', name) },
  nudgeQuestion: nudge || `Did you get a chance to open ${name}? 👀 If you’re working on a project, tell me a few lines about it here and I’ll show you how it could look in 3D`,
});

const film = funnel({
  name: 'The 3D to film blueprint',
  url: FILM,
  page: 'Our 3D to film method is free on this page, and right under it there’s the Full Blueprint with every prompt we used for this villa',
  replies: ['Sent it to your DMs 👀', 'Check your DMs, the blueprint is there 🙌🏻', 'Just sent you the link, check your DMs 👇🏻'],
  opener: 'Hey, thanks for the comment 🙌🏻 The 3D to film blueprint is ready for you, tap the button below and I’ll send it over 👇🏻',
  nudge: 'Did you get a chance to open the blueprint? 👀 If you’re working on a house, tell me a few lines about it here and I’ll show you how it could look in 3D',
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
  publicReplies: [
    'Sent you a DM 🏠 your lot is waiting',
    'Check your DMs, your house link is there 🔑',
    'Done! Check your DMs (or Requests) 🏠',
    'your house link is in your DMs 🏠',
    'just sent it, your house is waiting in your DMs 🔑',
    'check your DMs, your lot is ready 🏠',
    'sent 🏠 your link is in your DMs',
    'it’s in your DMs now, go get your house 🔑',
    'done, your house link just landed in your DMs 🏠',
    'you’re in 🏠 check your DMs for your link',
  ],
  cantDm: 'We can’t send you your house link unless you send us a text, if you want it, just send us a text 🏠',
  opener: { text: 'Hey! Your free house in Omnya City is ready 🏠 Tap below and I’ll send you your personal link. It’s one link, one house, made for your username.', button: 'Get my house' },
  direct: (() => {
    // five ways, in turn, as for the Blueprints: the first is the one that was there
    const texts = [
      'Hey 🙌🏻 your house in Omnya City is ready 🏠 tap below, it’s one link, one house, made for your username, and follow @omnyalab so you watch the city grow',
      'Here you go 🏠 your house in Omnya City is right below, it’s one link, one house, made for your username, and follow @omnyalab so you watch the city grow',
      'Thanks for the comment 🙌🏻 your house in Omnya City is one tap away, one link, one house, made for your username, and follow @omnyalab so you watch the city grow',
      'Hey, your lot is waiting 🏠 tap below for your house in Omnya City, it’s one link, one house, made for your username, and follow @omnyalab so you watch the city grow',
      'As promised 🔑 tap below for your house in Omnya City, one link, one house, made for your username, and follow @omnyalab so you watch the city grow',
    ];
    return { text: texts[0], texts, button: 'Get my house' };
  })(),
  comment: {
    ask: 'Hey 🙌🏻 your house in Omnya City is ready 🏠 one step first, the city is only for followers: follow @omnyalab, then comment DONE under the reel and I’ll send your link right over',
    almost: 'Almost there 👀 follow @omnyalab first, then comment again under the reel and the house is yours',
    linkNew: 'Thanks for the follow 🙌🏻 your house in Omnya City is ready 🏠 tap below, it’s one link, one house, made for your username',
    linkFollower: 'Hey 🙌🏻 your house in Omnya City is ready 🏠 tap below, it’s one link, one house, made for your username',
    askReplies: ['Check your DMs 🏠 one quick step and the house is yours', 'Just sent you a DM 🔑 one quick step first', 'It’s in your DMs 🏠 one quick step and it’s yours'],
  },
  followFirst: { text: 'Almost there! The city is only for followers 🏠 Follow @omnyalab, then tap Done and your link comes right away.', button: 'Done' },
  stillNotFollowing: { text: 'Hmm, I can’t see the follow yet 👀 follow @omnyalab and tap Done again 👇🏻', button: 'Done' },
  link: { text: 'Here’s your link 🔑 Tap Reserve my spot and your house lands on the next free lot. The earlier you tap, the closer to downtown. Your username designs it.', button: 'Reserve my spot' },
  nudgeFollow: { text: 'Still want your house in Omnya City? 🏠 follow @omnyalab and tap Done, your link comes right away 👇🏻', button: 'Done' },
  nudgeQuestion: '',
};

/**
 * FABLE (10/11/2026): the reel says "Comment FABLE to get the link". The page, /fable, opens with the
 * Higgsfield offer (Nico's affiliate link) and has the free Tower Blueprint card right under it. Here
 * the bot talks about "the link", never about a blueprint: twelve public replies and five DMs, taken
 * in turn like the others, the button says "Get the link".
 */
const fable = {
  url: FABLE,
  ask: false,
  publicReplies: [
    'sent 🙌🏻 the link is in your DMs',
    'Just sent it, check your DMs 👀',
    'Done! The link is in your DMs 🫶🏻',
    'Check your DMs, the link is there 🙌🏻',
    'Sent you a DM 👇🏻 the link is inside',
    'It’s in your inbox now 🙌🏻',
    'sent, the link is waiting in your DMs 🫶🏻',
    'just dropped the link in your DMs 👀',
    'on its way, check your DMs 🙌🏻',
    'the link just landed in your DMs 👀',
    'you got it, check your DMs 👇🏻',
    'all yours, I just sent the link in DM 🙌🏻',
  ],
  cantDm: 'We can’t send you the link unless you send us a text, if you want it, just send us a text 🫶🏻',
  opener: { text: 'Hey 🙌🏻 the link is ready, tap below and I’ll send it over 👇🏻', button: 'Get the link' },
  direct: (() => {
    // five ways, in turn, as for the Blueprints; every one asks for the follow in words and none checks it
    const texts = [
      'Hey 🙌🏻 here’s the link 👇🏻 follow @omnyalab so you catch the next one, we drop a new build every week',
      'Here you go 🙌🏻 the link is right below, and follow @omnyalab so you catch the next one, we drop a new build every week',
      'Thanks for the comment 🫶🏻 the link is one tap away 👇🏻 follow @omnyalab so you catch the next one, there’s a new build every week',
      'Hey, got your comment 👀 the link is ready for you below, follow @omnyalab so you catch the next one, a new build drops every week',
      'As promised 🙌🏻 tap below for the link, and follow @omnyalab so you catch the next one, we post a new build every week',
    ];
    return { text: texts[0], texts, button: 'Get the link' };
  })(),
  comment: commentFor('the link'),
  followFirst: { ...followFirst, text: followFirst.text.replace('The Blueprint is ready for you', 'the link is ready for you') },
  blueprintFollower: `Here you go 👇🏻 the Higgsfield offer is on this page, and right under it there’s our free Tower Blueprint to build with it: ${FABLE}`,
  blueprintNewFollower: `Thanks for the follow 🙌🏻 the Higgsfield offer is on this page, and right under it there’s our free Tower Blueprint to build with it: ${FABLE}`,
  nudgeFollow: { ...nudgeFollow, text: nudgeFollow.text.replace('The Blueprint', 'the link') },
  nudgeQuestion: 'Did you get a chance to open the link? 👀 If you’re working on a project, tell me a few lines about it here and I’ll show you how it could look in 3D',
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

const base = { url: BLUEPRINT, ask: true, publicReplies, placeReplies, cantDm, opener, direct, comment, followFirst, stillNotFollowing, blueprintFollower, blueprintNewFollower, answerProject, answerCurious, nudgeFollow, nudgeQuestion };
const kinds = { tower: { ...tower, url: TOWER_BLUEPRINT }, floors: { ...floors, url: TOWER_FLOORS }, film, build, towers, city, fable, legacy };

/** Every destination the bot knows: 'blueprint', 'tower', 'floors', 'film', 'build', 'towers', 'city', 'fable' ('legacy' is only for old buttons). */
export const KINDS = ['blueprint', ...Object.keys(kinds)];

/** The texts for a destination; anything unknown gets the normal Blueprint. */
export const textsFor = (kind) => (kinds[kind] ? { ...base, ...kinds[kind] } : base);
