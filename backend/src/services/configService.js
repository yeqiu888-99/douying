import { query } from '../utils/db.js';

export async function getAppConfig() {
  const rows = await query('SELECT phone_number, service_terms FROM app_config ORDER BY id DESC LIMIT 1');
  if (rows.length === 0) {
    return {
      phone_number: process.env.LAWYER_PHONE || '13800000000',
      service_terms: process.env.SERVICE_TERMS || '默认服务条款说明。',
    };
  }
  return rows[0];
}
