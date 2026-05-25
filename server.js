
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ 
    path: path.join(__dirname, '.env'),
    override: true 
});

const app = express();

// Configure CORS from environment
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*';
app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} [${req.method}] ${req.url}`);
    next();
});

// Register API Routes
const apiDir = path.join(__dirname, 'api');
if (fs.existsSync(apiDir)) {
    const apiFiles = fs.readdirSync(apiDir).filter(f => f.endsWith('.js') && !f.startsWith('_'));
    console.log('📦 Registering API Routes:');
    for (const file of apiFiles) {
        const route = `/api/${file.replace('.js', '')}`;
        const absolutePath = path.join(apiDir, file);
        const moduleURL = pathToFileURL(absolutePath).href;
        
        console.log(`  - ${route} -> api/${file}`);
        app.all(route, async (req, res) => {
            try {
                const handler = (await import(`${moduleURL}?update=${Date.now()}`)).default;
                await handler(req, res);
            } catch (err) {
                const errorLog = `${new Date().toISOString()} Error in ${route}: ${err.stack || err}\n`;
                fs.appendFileSync('error.log', errorLog);
                console.error(`Error in ${route}:`, err);
                res.status(500).json({ error: err.message });
            }
        });
    }
}

// Serve static files - ONLY if frontend exists
const frontendPath = path.join(__dirname, '../frontend');

if (fs.existsSync(path.join(frontendPath, 'index.html'))) {
    app.use(express.static(frontendPath, { redirect: false }));

    // Rewrites for SPA-like navigation
    app.get('/admin', (req, res) => res.sendFile(path.resolve(frontendPath, 'admin/admin.html')));
    app.get('/admin-login', (req, res) => res.sendFile(path.resolve(frontendPath, 'admin/admin-login.html')));
    app.get('/payment', (req, res) => res.sendFile(path.resolve(frontendPath, 'payment.html')));
    app.get('/dashboard', (req, res) => res.sendFile(path.resolve(frontendPath, 'dashboard.html')));
    app.get('/', (req, res) => res.sendFile(path.resolve(frontendPath, 'index.html')));
} else {
    // Basic root route for standalone API
    app.get('/', (req, res) => {
        res.json({ message: '🚀 Rental Portal API is running!', status: 'healthy' });
    });
}

const PORT = process.env.PORT || 5501;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Server is running!`);
    console.log(`🔗 Port: ${PORT}`);
    console.log(`\nPress Ctrl+C to stop.\n`);
});
