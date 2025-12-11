import { getAppConfig } from '../services/configService.js';

export async function getConfigHandler(req, res) {
  try {
    const config = await getAppConfig();
    res.json(config);
  } catch (err) {
    console.error('get config error', err);
    res.status(500).json({ message: '无法获取配置' });
  }
}
