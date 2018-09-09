import deepFreeze from 'deep-freeze';

import { HOME_NARROW_STR, privateNarrow } from '../../utils/narrow';
import {
  MESSAGE_FETCH_COMPLETE,
  EVENT_UPDATE_MESSAGE,
  EVENT_REACTION_ADD,
  EVENT_REACTION_REMOVE,
  EVENT_NEW_MESSAGE,
  EVENT_MESSAGE_DELETE,
} from '../../actionConstants';
import { FIRST_UNREAD_ANCHOR } from '../../constants';
import chatReducers from '../../chat/chatReducers';

const privateNarrowStr = JSON.stringify(privateNarrow('mark@example.com'));

describe('messageReducers', () => {
  test.skip('handles unknown action and no previous state by returning initial state', () => {
    const newState = chatReducers(undefined, {});
    expect(newState).toBeDefined();
  });

  describe.skip('EVENT_NEW_MESSAGE', () => {
    test('appends message to state producing a copy of messages', () => {
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [1, 2],
      });

      const action = deepFreeze({
        type: EVENT_NEW_MESSAGE,
        message: { id: 3 },
        caughtUp: {
          [HOME_NARROW_STR]: {
            older: false,
            newer: true,
          },
        },
      });

      const expectedState = {
        [HOME_NARROW_STR]: [1, 2, 3],
      };

      const newState = chatReducers(initialState, action);

      expect(newState).toEqual(expectedState);
      expect(newState).not.toBe(initialState);
    });
  });

  describe.skip('EVENT_MESSAGE_DELETE', () => {
    test('if a message does not exist no changes are made', () => {
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [{ id: 1 }, { id: 2 }],
        [privateNarrowStr]: [],
      });

      const action = deepFreeze({
        type: EVENT_MESSAGE_DELETE,
        messageId: 3,
      });

      const newState = chatReducers(initialState, action);

      expect(newState).toBe(initialState);
    });
    test('if a message exists in one or more narrows delete it from there', () => {
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [1, 2, 3],
        [privateNarrowStr]: [2],
      });
      const action = deepFreeze({
        type: EVENT_MESSAGE_DELETE,
        messageId: 2,
      });
      const expectedState = deepFreeze({
        [HOME_NARROW_STR]: [1, 3],
        [privateNarrowStr]: [],
      });

      const newState = chatReducers(initialState, action);

      expect(newState).toEqual(expectedState);
    });
  });

  describe.skip('EVENT_UPDATE_MESSAGE', () => {
    test('if a message does not exist no changes are made', () => {
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [{ id: 1 }, { id: 2 }],
        [privateNarrowStr]: [],
      });

      const action = deepFreeze({
        type: EVENT_UPDATE_MESSAGE,
        messageId: 3,
      });

      const newState = chatReducers(initialState, action);

      expect(newState).toBe(initialState);
    });

    test('when a message exists in state, new state and new object is created with updated message in every key', () => {
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [{ id: 1 }, { id: 2 }, { id: 3, content: 'Old content' }],
        [privateNarrowStr]: [{ id: 3, content: 'Old content' }],
      });

      const action = deepFreeze({
        type: EVENT_UPDATE_MESSAGE,
        message_id: 3,
        orig_rendered_content: '<p>Old content</p>',
        rendered_content: '<p>New content</p>',
        edit_timestamp: 123,
        prev_rendered_content_version: 1,
        user_id: 5,
      });

      const expectedState = {
        [HOME_NARROW_STR]: [
          { id: 1 },
          { id: 2 },
          {
            id: 3,
            content: '<p>New content</p>',
            last_edit_timestamp: 123,
            edit_history: [
              {
                prev_rendered_content: '<p>Old content</p>',
                prev_rendered_content_version: 1,
                timestamp: 123,
                user_id: 5,
              },
            ],
          },
        ],
        [privateNarrowStr]: [
          {
            id: 3,
            content: '<p>New content</p>',
            last_edit_timestamp: 123,
            edit_history: [
              {
                prev_rendered_content: '<p>Old content</p>',
                prev_rendered_content_version: 1,
                timestamp: 123,
                user_id: 5,
              },
            ],
          },
        ],
      };

      const newState = chatReducers(initialState, action);

      expect(newState).not.toBe(initialState);
      expect(newState).toEqual(expectedState);
    });

    test('when event contains a new subject but no new content only subject is updated', () => {
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [{ id: 1, content: 'Old content', subject: 'Old subject' }],
        [privateNarrowStr]: [{ id: 1, content: 'Old content', subject: 'Old subject' }],
      });

      const action = deepFreeze({
        type: EVENT_UPDATE_MESSAGE,
        message_id: 1,
        subject: 'New topic',
        orig_subject: 'Old subject',
        edit_timestamp: 123,
        user_id: 5,
      });

      const expectedState = {
        [HOME_NARROW_STR]: [
          {
            id: 1,
            content: 'Old content',
            subject: 'New topic',
            last_edit_timestamp: 123,
            edit_history: [
              {
                prev_subject: 'Old subject',
                timestamp: 123,
                user_id: 5,
              },
            ],
          },
        ],
        [privateNarrowStr]: [
          {
            id: 1,
            content: 'Old content',
            subject: 'New topic',
            last_edit_timestamp: 123,
            edit_history: [
              {
                prev_subject: 'Old subject',
                timestamp: 123,
                user_id: 5,
              },
            ],
          },
        ],
      };

      const newState = chatReducers(initialState, action);

      expect(newState).not.toBe(initialState);
      expect(newState).toEqual(expectedState);
    });

    test('when event contains a new subject and a new content, update both and update edit history object', () => {
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [
          {
            id: 1,
            content: 'Old content',
            subject: 'New topic',
            last_edit_timestamp: 123,
            subject_links: [],
            edit_history: [
              {
                prev_subject: 'Old subject',
                timestamp: 123,
                user_id: 5,
              },
            ],
          },
        ],
        [privateNarrowStr]: [
          {
            id: 1,
            content: 'Old content',
            subject: 'New topic',
            last_edit_timestamp: 123,
            subject_links: [],
            edit_history: [
              {
                prev_subject: 'Old subject',
                timestamp: 123,
                user_id: 5,
              },
            ],
          },
        ],
      });

      const action = deepFreeze({
        type: EVENT_UPDATE_MESSAGE,
        message_id: 1,
        orig_rendered_content: '<p>Old content</p>',
        rendered_content: '<p>New content</p>',
        subject: 'New updated topic',
        orig_subject: 'New topic',
        prev_rendered_content_version: 1,
        edit_timestamp: 456,
        user_id: 5,
        subject_links: [],
      });

      const expectedState = {
        [HOME_NARROW_STR]: [
          {
            id: 1,
            content: '<p>New content</p>',
            subject: 'New updated topic',
            last_edit_timestamp: 456,
            subject_links: [],
            edit_history: [
              {
                prev_rendered_content: '<p>Old content</p>',
                prev_rendered_content_version: 1,
                prev_subject: 'New topic',
                timestamp: 456,
                user_id: 5,
              },
              {
                prev_subject: 'Old subject',
                timestamp: 123,
                user_id: 5,
              },
            ],
          },
        ],
        [privateNarrowStr]: [
          {
            id: 1,
            content: '<p>New content</p>',
            subject: 'New updated topic',
            last_edit_timestamp: 456,
            subject_links: [],
            edit_history: [
              {
                prev_rendered_content: '<p>Old content</p>',
                prev_rendered_content_version: 1,
                prev_subject: 'New topic',
                timestamp: 456,
                user_id: 5,
              },
              {
                prev_subject: 'Old subject',
                timestamp: 123,
                user_id: 5,
              },
            ],
          },
        ],
      };

      const newState = chatReducers(initialState, action);

      expect(newState).not.toBe(initialState);
      expect(newState).toEqual(expectedState);
    });
  });

  describe.skip('EVENT_REACTION_ADD', () => {
    test('on event received, add reaction to message with given id', () => {
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [{ id: 1, reactions: [] }, { id: 2, reactions: [] }],
        [privateNarrowStr]: [{ id: 1, reactions: [] }],
      });

      const action = deepFreeze({
        type: EVENT_REACTION_ADD,
        message_id: 2,
        emoji_name: 'hello',
        user: {},
      });

      const expectedState = {
        [HOME_NARROW_STR]: [
          { id: 1, reactions: [] },
          { id: 2, reactions: [{ emoji_name: 'hello', user: {} }] },
        ],
        [privateNarrowStr]: [{ id: 1, reactions: [] }],
      };

      const actualState = chatReducers(initialState, action);

      expect(actualState).toEqual(expectedState);
    });
  });

  describe.skip('EVENT_REACTION_REMOVE', () => {
    test('if message does not contain reaction, no change is made', () => {
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [{ id: 1, reactions: [] }],
      });

      const action = deepFreeze({
        type: EVENT_REACTION_REMOVE,
        message_id: 1,
        emoji_name: 'hello',
        user: {},
      });

      const expectedState = {
        [HOME_NARROW_STR]: [{ id: 1, reactions: [] }],
      };

      const actualState = chatReducers(initialState, action);

      expect(actualState).toEqual(expectedState);
    });

    test('reaction is removed only from specified message, only for given user', () => {
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [
          {
            id: 1,
            reactions: [
              { emoji_name: 'hello', user: { email: 'bob@example.com' } },
              { emoji_name: 'hello', user: { email: 'mark@example.com' } },
              { emoji_name: 'goodbye', user: { email: 'bob@example.com' } },
            ],
          },
        ],
      });

      const action = deepFreeze({
        type: EVENT_REACTION_REMOVE,
        message_id: 1,
        emoji_name: 'hello',
        user: { email: 'bob@example.com' },
      });

      const expectedState = {
        [HOME_NARROW_STR]: [
          {
            id: 1,
            reactions: [
              { emoji_name: 'hello', user: { email: 'mark@example.com' } },
              { emoji_name: 'goodbye', user: { email: 'bob@example.com' } },
            ],
          },
        ],
      };

      const actualState = chatReducers(initialState, action);

      expect(actualState).toEqual(expectedState);
    });
  });

  describe('MESSAGE_FETCH_COMPLETE', () => {
    test.skip('when anchor is FIRST_UNREAD_ANCHOR common messages are not replaced', () => {
      const commonMessages = [{ id: 2, timestamp: 4 }, { id: 3, timestamp: 5 }];
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [{ id: 1, timestamp: 3 }, ...commonMessages],
      });

      const action = deepFreeze({
        type: MESSAGE_FETCH_COMPLETE,
        anchor: FIRST_UNREAD_ANCHOR,
        narrow: [],
        messages: [{ id: 2, timestamp: 4 }, { id: 3, timestamp: 5 }],
      });

      const newState = chatReducers(initialState, action);

      expect(newState[HOME_NARROW_STR]).toEqual(commonMessages);
    });

    test.skip('when anchor is FIRST_UNREAD_ANCHOR deep equal is performed to separate common messages', () => {
      const commonMessages = [{ id: 2, timestamp: 4 }, { id: 3, timestamp: 5 }];
      const changedMessage = { id: 4, timestamp: 6, subject: 'new topic' };
      const initialState = deepFreeze({
        [HOME_NARROW_STR]: [
          { id: 1, timestamp: 3 },
          ...commonMessages,
          { id: 4, timestamp: 6, subject: 'some topic' },
        ],
      });

      const action = deepFreeze({
        type: MESSAGE_FETCH_COMPLETE,
        anchor: FIRST_UNREAD_ANCHOR,
        narrow: [],
        messages: [{ id: 2, timestamp: 4 }, { id: 3, timestamp: 5 }, changedMessage],
      });

      const expectedState = {
        [HOME_NARROW_STR]: [...commonMessages, changedMessage],
      };

      const newState = chatReducers(initialState, action);

      expect(newState[HOME_NARROW_STR]).toEqual(expectedState[HOME_NARROW_STR]);
    });
  });
});
