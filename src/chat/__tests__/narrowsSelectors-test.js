/* @flow strict-local */
import Immutable from 'immutable';

import {
  getFirstMessageId,
  getLastMessageId,
  getMessagesForNarrow,
  shouldBeMuted,
  getStreamInNarrow,
  isNarrowValid,
} from '../narrowsSelectors';
import {
  HOME_NARROW,
  HOME_NARROW_STR,
  pm1to1NarrowFromUser,
  streamNarrow,
  topicNarrow,
  MENTIONED_NARROW,
  STARRED_NARROW,
  pmNarrowFromUsersUnsafe,
  keyFromNarrow,
} from '../../utils/narrow';
import { NULL_SUBSCRIPTION } from '../../nullObjects';
import * as eg from '../../__tests__/lib/exampleData';

describe('getMessagesForNarrow', () => {
  const message = eg.streamMessage({ id: 123 });
  const messages = eg.makeMessagesState([message]);
  const outboxMessage = eg.streamOutbox({});

  test('if no outbox messages returns messages with no change', () => {
    const state = eg.reduxState({
      narrows: Immutable.Map({
        [HOME_NARROW_STR]: [123],
      }),
      messages,
      outbox: [],
      users: [eg.selfUser],
      realm: eg.realmState({ user_id: eg.selfUser.user_id, email: eg.selfUser.email }),
    });

    const result = getMessagesForNarrow(state, HOME_NARROW);

    expect(result).toEqual([state.messages.get(123)]);
  });

  test('combine messages and outbox in same narrow', () => {
    const state = eg.reduxState({
      narrows: Immutable.Map({
        [HOME_NARROW_STR]: [123],
      }),
      messages,
      outbox: [outboxMessage],
      caughtUp: {
        [HOME_NARROW_STR]: { older: false, newer: true },
      },
      users: [eg.selfUser],
      realm: eg.realmState({ user_id: eg.selfUser.user_id, email: eg.selfUser.email }),
    });

    const result = getMessagesForNarrow(state, HOME_NARROW);

    expect(result).toEqual([message, outboxMessage]);
  });

  test('do not combine messages and outbox if not caught up', () => {
    const state = eg.reduxState({
      narrows: Immutable.Map({
        [HOME_NARROW_STR]: [123],
      }),
      messages,
      outbox: [outboxMessage],
      users: [eg.selfUser],
      realm: eg.realmState({ user_id: eg.selfUser.user_id, email: eg.selfUser.email }),
    });

    const result = getMessagesForNarrow(state, HOME_NARROW);

    expect(result).toEqual([state.messages.get(123)]);
  });

  test('do not combine messages and outbox in different narrow', () => {
    const state = eg.reduxState({
      narrows: Immutable.Map({
        [keyFromNarrow(pm1to1NarrowFromUser(eg.otherUser))]: [123],
      }),
      messages,
      outbox: [outboxMessage],
      users: [eg.selfUser],
      realm: eg.realmState({ user_id: eg.selfUser.user_id, email: eg.selfUser.email }),
    });

    const result = getMessagesForNarrow(state, pm1to1NarrowFromUser(eg.otherUser));

    expect(result).toEqual([message]);
  });
});

describe('shouldBeMuted', () => {
  const stream = eg.makeStream({
    name: 'stream',
  });

  const subscription = eg.makeSubscription({ stream });
  const mutedSubscription = eg.makeSubscription({ stream, in_home_view: false });

  const message = eg.streamMessage({
    stream,
    subject: 'some topic',
  });

  describe('HOME_NARROW', () => {
    test('private messages are never muted', () => {
      const pmMessage = eg.pmMessage();
      expect(shouldBeMuted(pmMessage, HOME_NARROW, [], [])).toBe(false);
    });

    test('message in a stream is not muted if stream and topic not muted', () => {
      expect(shouldBeMuted(message, HOME_NARROW, [subscription], [])).toBe(false);
    });

    test('message in a stream is muted if stream is not in subscriptions', () => {
      expect(shouldBeMuted(message, HOME_NARROW, [], [])).toBe(true);
    });

    test('message in a stream is muted if the stream is muted', () => {
      expect(shouldBeMuted(message, HOME_NARROW, [mutedSubscription], [])).toBe(true);
    });

    test('message in a stream is muted if the topic is muted and topic matches', () => {
      const mutes = [['stream', 'some topic']];
      expect(shouldBeMuted(message, HOME_NARROW, [subscription], mutes)).toBe(true);
    });
  });

  describe('stream narrow', () => {
    const narrow = streamNarrow('stream');

    test('message not muted even if stream not subscribed', () => {
      expect(shouldBeMuted(message, narrow, [], [])).toBe(false);
    });

    test('message not muted even if stream is muted', () => {
      expect(shouldBeMuted(message, narrow, [mutedSubscription], [])).toBe(false);
    });

    test('message muted if topic is muted', () => {
      const mutes = [['stream', 'some topic']];
      expect(shouldBeMuted(message, narrow, [subscription], mutes)).toBe(true);
    });
  });

  describe('topic narrow', () => {
    const narrow = topicNarrow('stream', 'some topic');

    test('message not muted even if stream not subscribed', () => {
      expect(shouldBeMuted(message, narrow, [], [])).toBe(false);
    });

    test('message not muted even if stream is muted', () => {
      expect(shouldBeMuted(message, narrow, [mutedSubscription], [])).toBe(false);
    });

    test('message not muted even if topic is muted', () => {
      const mutes = [['stream', 'some topic']];
      expect(shouldBeMuted(message, narrow, [subscription], mutes)).toBe(false);
    });
  });

  describe('@-mentions narrow', () => {
    const narrow = MENTIONED_NARROW;

    test('message not muted even if stream not subscribed', () => {
      expect(shouldBeMuted(message, narrow, [], [])).toBe(false);
    });

    test('message not muted even if stream is muted', () => {
      expect(shouldBeMuted(message, narrow, [mutedSubscription], [])).toBe(false);
    });

    test('message not muted even if topic is muted', () => {
      const mutes = [['stream', 'some topic']];
      expect(shouldBeMuted(message, narrow, [subscription], mutes)).toBe(false);
    });
  });
});

describe('getFirstMessageId', () => {
  test('return undefined when there are no messages', () => {
    const state = eg.reduxState({
      narrows: Immutable.Map({
        [HOME_NARROW_STR]: [],
      }),
      outbox: [],
    });

    const result = getFirstMessageId(state, HOME_NARROW);

    expect(result).toEqual(undefined);
  });

  test('returns first message id', () => {
    const state = eg.reduxState({
      narrows: Immutable.Map({
        [HOME_NARROW_STR]: [1, 2, 3],
      }),
      messages: eg.makeMessagesState([
        eg.streamMessage({ id: 1 }),
        eg.streamMessage({ id: 2 }),
        eg.streamMessage({ id: 3 }),
      ]),
      outbox: [],
    });

    const result = getFirstMessageId(state, HOME_NARROW);

    expect(result).toEqual(1);
  });
});

describe('getLastMessageId', () => {
  test('return undefined when there are no messages', () => {
    const state = eg.reduxState({
      narrows: Immutable.Map({
        [HOME_NARROW_STR]: [],
      }),
      messages: eg.makeMessagesState([]),
      outbox: [],
    });

    const result = getLastMessageId(state, HOME_NARROW);

    expect(result).toEqual(undefined);
  });

  test('returns last message id', () => {
    const state = eg.reduxState({
      narrows: Immutable.Map({
        [HOME_NARROW_STR]: [1, 2, 3],
      }),
      messages: eg.makeMessagesState([
        eg.streamMessage({ id: 1 }),
        eg.streamMessage({ id: 2 }),
        eg.streamMessage({ id: 3 }),
      ]),
      outbox: [],
    });

    const result = getLastMessageId(state, HOME_NARROW);

    expect(result).toEqual(3);
  });
});

describe('getStreamInNarrow', () => {
  const stream1 = eg.makeStream({ name: 'stream' });
  const stream2 = eg.makeStream({ name: 'stream2' });
  const stream3 = eg.makeStream({ name: 'stream3' });
  const stream4 = eg.makeStream({ name: 'stream4' });
  const sub1 = { ...eg.makeSubscription({ stream: stream1 }), in_home_view: false };
  const sub2 = { ...eg.makeSubscription({ stream: stream2 }), in_home_view: true };

  const state = eg.reduxState({
    streams: [stream1, stream2, stream3],
    subscriptions: [sub1, sub2],
  });

  test('return subscription if stream in narrow is subscribed', () => {
    const narrow = streamNarrow(stream1.name);

    expect(getStreamInNarrow(state, narrow)).toEqual(sub1);
  });

  test('return stream if stream in narrow is not subscribed', () => {
    const narrow = streamNarrow(stream3.name);

    expect(getStreamInNarrow(state, narrow)).toEqual({ ...stream3, in_home_view: true });
  });

  test('return NULL_SUBSCRIPTION if stream in narrow is not valid', () => {
    const narrow = streamNarrow(stream4.name);

    expect(getStreamInNarrow(state, narrow)).toEqual(NULL_SUBSCRIPTION);
  });

  test('return NULL_SUBSCRIPTION is narrow is not topic or stream', () => {
    expect(getStreamInNarrow(state, pm1to1NarrowFromUser(eg.otherUser))).toEqual(NULL_SUBSCRIPTION);
    expect(getStreamInNarrow(state, topicNarrow(stream4.name, 'topic'))).toEqual(NULL_SUBSCRIPTION);
  });
});

describe('isNarrowValid', () => {
  test('narrowing to a special narrow is always valid', () => {
    const state = eg.reduxState();
    const narrow = STARRED_NARROW;

    const result = isNarrowValid(state, narrow);

    expect(result).toBe(true);
  });

  test('narrowing to an existing stream is valid', () => {
    const stream = eg.makeStream({ name: 'some stream' });

    const state = eg.reduxState({
      streams: [stream],
    });
    const narrow = streamNarrow(stream.name);

    const result = isNarrowValid(state, narrow);

    expect(result).toBe(true);
  });

  test('narrowing to a non-existing stream is invalid', () => {
    const state = eg.reduxState({
      streams: [],
    });
    const narrow = streamNarrow('nonexisting');

    const result = isNarrowValid(state, narrow);

    expect(result).toBe(false);
  });

  test('narrowing to an existing stream is valid regardless of topic', () => {
    const stream = eg.makeStream({ name: 'some stream' });

    const state = eg.reduxState({
      streams: [stream],
    });
    const narrow = topicNarrow(stream.name, 'topic does not matter');

    const result = isNarrowValid(state, narrow);

    expect(result).toBe(true);
  });

  test('narrowing to a PM with existing user is valid', () => {
    const user = eg.makeUser({ name: 'bob' });
    const state = eg.reduxState({
      realm: {
        ...eg.realmState(),
        crossRealmBots: [],
        nonActiveUsers: [],
      },
      streams: [],
      users: [user],
    });
    const narrow = pm1to1NarrowFromUser(user);

    const result = isNarrowValid(state, narrow);

    expect(result).toBe(true);
  });

  test('narrowing to a PM with non-existing user is not valid', () => {
    const user = eg.makeUser({ name: 'bob' });
    const state = eg.reduxState({
      realm: {
        ...eg.realmState(),
        crossRealmBots: [],
        nonActiveUsers: [],
      },
      streams: [],
      users: [],
    });
    const narrow = pm1to1NarrowFromUser(user);

    const result = isNarrowValid(state, narrow);

    expect(result).toBe(false);
  });

  test('narrowing to a group chat with existing users is valid', () => {
    const john = eg.makeUser({ name: 'john' });
    const mark = eg.makeUser({ name: 'mark' });

    const state = eg.reduxState({
      realm: {
        ...eg.realmState(),
        crossRealmBots: [],
        nonActiveUsers: [],
      },
      streams: [],
      users: [john, mark],
    });
    const narrow = pmNarrowFromUsersUnsafe([john, mark]);

    const result = isNarrowValid(state, narrow);

    expect(result).toBe(true);
  });

  test('narrowing to a group chat with non-existing users is not valid', () => {
    const john = eg.makeUser({ name: 'john' });
    const mark = eg.makeUser({ name: 'mark' });
    const state = eg.reduxState({
      realm: {
        ...eg.realmState(),
        crossRealmBots: [],
        nonActiveUsers: [],
      },
      streams: [],
      users: [john],
    });
    const narrow = pmNarrowFromUsersUnsafe([john, mark]);

    const result = isNarrowValid(state, narrow);

    expect(result).toBe(false);
  });

  test('narrowing to a PM with bots is valid', () => {
    const bot = eg.makeCrossRealmBot({ name: 'some-bot' });
    const state = eg.reduxState({
      realm: {
        ...eg.realmState(),
        crossRealmBots: [bot],
        nonActiveUsers: [],
      },
      streams: [],
      users: [],
    });
    const narrow = pm1to1NarrowFromUser(bot);

    const result = isNarrowValid(state, narrow);

    expect(result).toBe(true);
  });

  test('narrowing to non active users is valid', () => {
    const notActiveUser = eg.makeUser({ name: 'not active' });
    const state = eg.reduxState({
      realm: {
        ...eg.realmState(),
        crossRealmBots: [],
        nonActiveUsers: [notActiveUser],
      },
      streams: [],
      users: [],
    });
    const narrow = pm1to1NarrowFromUser(notActiveUser);

    const result = isNarrowValid(state, narrow);

    expect(result).toBe(true);
  });
});
