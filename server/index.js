const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

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

// Start Server
const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});