import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import axios from 'axios';


const __dirname = path.resolve();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Promisify fs methods
const writeFile = fs.promises.writeFile;
const unlink = fs.promises.unlink;

// Socket.IO Logic
io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });

  socket.on('leave_room', (roomId) => {
    socket.leave(roomId);
  });

  socket.on('code_update', ({ room, newCode }) => {
    socket.to(room).emit('code_update', { room, newCode });
  });
});

// Code Execution Endpoint
app.post('/run', async (req, res) => {
  const { code, language, input = '' } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Missing code or language' });
  }

  const isWin = process.platform === 'win32';
  const config = {
    cpp: {
      file: 'code.cpp',
      compile: isWin ? ['g++', 'code.cpp', '-o', 'code.exe'] : ['g++', 'code.cpp', '-o', 'code.out'],
      run: isWin ? ['code.exe'] : ['./code.out']
    },
    python: { 
      file: 'code.py',
      run: ['python3', 'code.py'] 
    },
    javascript: { 
      file: 'code.js',
      run: ['node', 'code.js'] 
    }
  }[language];

  if (!config) {
    return res.status(400).json({ error: 'Unsupported language' });
  }

  try {
    // Clean up previous files
    if (language === 'cpp') {
      const outFile = isWin ? 'code.exe' : 'code.out';
      if (fs.existsSync(outFile)) await unlink(outFile);
    }
    if (fs.existsSync(config.file)) await unlink(config.file);

    // Write new code to file
    await writeFile(config.file, code);

    // For compiled languages, compile first
    if (language === 'cpp') {
      await new Promise((resolve, reject) => {
        const compile = spawn(config.compile[0], config.compile.slice(1));
        
        let errorOutput = '';
        compile.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });

        compile.on('close', (code) => {
          if (code !== 0) return reject(new Error(`Compilation failed: ${errorOutput}`));
          resolve();
        });
      });
    }

    // Execute the code
    const child = spawn(config.run[0], config.run.slice(1));

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    child.stdin.write(input);
    child.stdin.end();

    child.on('close', (code) => {
      if (code !== 0) {
        return res.json({ output: errorOutput || `Process exited with code ${code}` });
      }
      res.json({ output });
    });

  } catch (err) {
    res.status(500).json({ output: err.message });
  }
});

app.use(express.static(path.join(__dirname, "./client/dist")));
try{
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, "./client", "dist", "index.html"));
  });
}
catch(err){
  console.log(err);
  
}

// Ping the server every 13 minutes
cron.schedule('*/13 * * * *', async () => {
  try {
    const res = await axios.get('https://codelive-mtt1.onrender.com');
    console.log(`Ping successful: ${res.status}`);
  } catch (error) {
    console.error('Ping failed:', error.message);
  }
});

// Start Server
const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});