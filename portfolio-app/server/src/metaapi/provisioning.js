const MetaApi = require('metaapi.cloud-sdk').default;
const config = require('../config');

let apiInstance = null;

function getMetaApi() {
  if (!config.metaapi.token) {
    throw new Error('METAAPI_TOKEN is not set. Add it to your .env file.');
  }
  if (!apiInstance) {
    apiInstance = new MetaApi(config.metaapi.token);
  }
  return apiInstance;
}

// Maps MetaApi's error shapes (see their SDK docs) to a stable error code the
// frontend can branch on, so the connect form can show "invalid credentials"
// vs "server not found" vs "connection timeout" instead of one generic message.
function classifyProvisioningError(err) {
  const details = err?.details;
  if (details === 'E_AUTH') {
    return { code: 'invalid_credentials', message: 'Invalid login or investor password for this server.' };
  }
  if (details === 'E_SERVER_TIMEZONE') {
    return { code: 'connection_timeout', message: 'Broker did not respond in time. Please try again shortly.' };
  }
  if (details?.code === 'E_SRV_NOT_FOUND') {
    const suggestions = Object.values(details.serversByBrokers || {}).flat();
    return {
      code: 'server_not_found',
      message: suggestions.length
        ? `Server not found. Did you mean: ${suggestions.join(', ')}?`
        : 'Server not found. Double-check the exact server name from your broker.',
    };
  }
  if (details?.code === 'E_RESOURCE_SLOTS') {
    return { code: 'resource_slots', message: 'This account needs additional MetaApi resource slots to connect.' };
  }
  return { code: 'unknown', message: err?.message || 'Unable to connect to this account right now.' };
}

async function provisionAccount({ nickname, broker, server, login, investorPassword, platform }) {
  const api = getMetaApi();
  try {
    const account = await api.metatraderAccountApi.createAccount({
      name: nickname,
      type: 'cloud',
      login,
      platform,
      password: investorPassword,
      server,
      magic: 0,
      reliability: 'high',
    });
    await account.deploy();
    return { metaapiAccountId: account.id, state: account.state };
  } catch (err) {
    const classified = classifyProvisioningError(err);
    const wrapped = new Error(classified.message);
    wrapped.code = classified.code;
    throw wrapped;
  }
}

async function getAccountState(metaapiAccountId) {
  const api = getMetaApi();
  const account = await api.metatraderAccountApi.getAccount(metaapiAccountId);
  return { state: account.state, connectionStatus: account.connectionStatus };
}

async function removeAccount(metaapiAccountId) {
  const api = getMetaApi();
  const account = await api.metatraderAccountApi.getAccount(metaapiAccountId);
  await account.remove();
}

module.exports = { getMetaApi, provisionAccount, getAccountState, removeAccount, classifyProvisioningError };
