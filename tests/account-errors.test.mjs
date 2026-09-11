import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthError } from '@netlify/identity';
import { authErrorMessage } from '../lib/account-errors.ts';

const wrapped = (message, status, json) => AuthError.from(Object.assign(new Error(message), { status, json }));

test('login failures guide unregistered players without claiming which credential is wrong', () => {
  const message = authErrorMessage(wrapped('invalid_grant: Invalid user credentials', 400), 'login', true);
  assert.match(message, /首次游玩请先注册游戏账号/);
  assert.match(message, /游戏密码/);
  assert.doesNotMatch(message, /密码不正确|尚未验证/);
});

test('unconfirmed emails are distinguished from generic invalid_grant errors', () => {
  const message = authErrorMessage(wrapped('invalid_grant: Email not confirmed', 400), 'login', true);
  assert.match(message, /邮箱尚未验证/);
  assert.match(message, /Confirm your mail/);
});

test('registration and reset errors do not blame existing login credentials', () => {
  for (const mode of ['signup', 'reset']) {
    const message = authErrorMessage(wrapped('Password should be at least 10 characters', 422), mode, true);
    assert.match(message, /至少 10 位/);
    assert.doesNotMatch(message, /未能登录/);
  }
  assert.match(authErrorMessage(wrapped('A user with this email address has already been registered', 422), 'signup', true), /已注册过游戏账号/);
});

test('SDK cause status and provider payload are preserved; outages are not password failures', () => {
  assert.match(authErrorMessage(wrapped('', 429), 'login', true), /操作太频繁/);
  assert.match(authErrorMessage(wrapped('Error updating password', 500), 'reset', true), /服务暂时不可用/);
  assert.match(authErrorMessage(wrapped('Bad Request', 400, { error: 'invalid_grant', error_description: 'Email not confirmed' }), 'login', true), /邮箱尚未验证/);
  assert.match(authErrorMessage(new AuthError('Invalid user credentials', 401), 'login', false), /目前没有网络/);
  assert.match(authErrorMessage(null, 'login', true), /操作没有完成/);
});
