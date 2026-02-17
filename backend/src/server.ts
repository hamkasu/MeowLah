import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { postsRouter } from './routes/posts';
import { lostCatsRouter } from './routes/lost-cats';
import { foundCatsRouter } from './routes/found-cats';
import { memorialsRouter } from './routes/memorials';
import { notificationsRouter } from './routes/notifications';
import { boostsRouter } from './routes/boosts';
import { paymentsRouter } from './routes/payments';
import { errorHandler } from './middleware/error-handler';

const app = express();

// Trust Railway's proxy for correct IP detection (rate limiter, logging)
app.set('trust proxy', 1);

// Security
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, mobile apps)
    if (!origin) return callback(null, true);

    const allowed = [
      env.FRONTEND_URL,
      'http://localhost:3000',
    ];

    if (
      allowed.includes(origin) ||
      // Allow any Railway-deployed frontend
      origin.endsWith('.up.railway.app')
    ) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting — 500 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/v1/', limiter);

// Body parsing & compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('short'));
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/v1/auth', authRouter);
app.use('/v1/users', usersRouter);
app.use('/v1/posts', postsRouter);
app.use('/v1/lost-cats', lostCatsRouter);
app.use('/v1/found-cats', foundCatsRouter);
app.use('/v1/memorials', memorialsRouter);
app.use('/v1/notifications', notificationsRouter);
app.use('/v1/boosts', boostsRouter);
app.use('/v1/payments', paymentsRouter);

// Global error handler
app.use(errorHandler);

// Bind to 0.0.0.0 — required for Railway containers
app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`[MeowLah API] Running on 0.0.0.0:${env.PORT} (${env.NODE_ENV})`);
});

export default app;
