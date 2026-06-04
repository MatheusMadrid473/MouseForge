import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { userRoutes } from './routes/users';
import { systemRoutes } from './routes/system';
import { operationRoutes } from './routes/operations';
import { ensureSuperUser } from './bootstrap/super-user';
import { ensureUserSchema } from './bootstrap/user-schema';
import { APP_VERSION } from './version';
import 'dotenv/config';

const app = Fastify({
  logger: true,
});

app.register(cors, {
  origin: process.env.CORS_ORIGIN?.split(',') || true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

app.register(jwt, {
  secret: process.env.JWT_SECRET || 'mouseforge-secret-key-local',
});

app.register(userRoutes);
app.register(systemRoutes);
app.register(operationRoutes);

app.get('/health', async () => ({
  status: 'ok',
  service: 'mouseforge-api',
  version: APP_VERSION,
  checkedAt: new Date().toISOString(),
}));

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3333;
    await ensureUserSchema();
    await ensureSuperUser();
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
