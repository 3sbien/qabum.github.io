import { proxyPazAuth } from '../../lib/paz-auth-proxy.js';
export default function handler(req,res){return proxyPazAuth(req,res,'token');}
