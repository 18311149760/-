export type AuthMode = 'login' | 'signup' | 'recover' | 'reset';

function fields(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
}

export function authErrorMessage(error: unknown, mode: AuthMode | 'logout', online: boolean): string {
  if (!online) return '目前没有网络，请联网后再操作。你可以先以游客身份继续玩。';
  const outer = fields(error), cause = fields(outer.cause), json = fields(cause.json ?? outer.json);
  const status = Number(outer.status ?? cause.status);
  const text = [outer.message, cause.message, json.msg, json.error, json.error_description]
    .filter((value): value is string => typeof value === 'string').join(' ').toLowerCase();

  if (status === 429 || /too many|rate limit/.test(text)) return '操作太频繁，请稍等片刻再试。';
  if (status >= 500) return '账号服务暂时不可用，请稍后重试。你可以先以游客身份继续玩。';
  if (/not confirmed|not verified|email_not_confirmed/.test(text)) {
    return '游戏账号的邮箱尚未验证。请到收件箱或垃圾邮件查找确认邮件，点击 “Confirm your mail” 后再登录。';
  }
  if (mode === 'signup' && /already.*registered|already.*exists/.test(text)) {
    return '这个邮箱已注册过游戏账号，请返回登录，或使用“忘记游戏密码”重置。';
  }
  if ((mode === 'signup' || mode === 'reset') && /weak_password|password.*(?:least|short|weak|length|require)/.test(text)) {
    return '游戏密码不符合要求，请设置至少 10 位的游戏专用密码。';
  }
  if (mode === 'login' && (status === 401 || /invalid_grant|invalid.*credentials|invalid.*password/.test(text))) {
    return '未能登录。首次游玩请先注册游戏账号；已有账号请核对邮箱和游戏密码，忘记后可重置。';
  }
  return '操作没有完成，请稍后重试。你可以先以游客身份继续玩。';
}
