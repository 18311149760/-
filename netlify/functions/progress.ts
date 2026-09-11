import { getStore } from '@netlify/blobs';
import { getUser } from '@netlify/identity';
import { progressHandler } from '../../lib/progress-api';

export default progressHandler({ getUser, getStore: () => getStore({ name: 'starry-progress-v1', consistency: 'strong' }) });
export const config = { path: '/api/progress' };
