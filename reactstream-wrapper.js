#!/usr/bin/env node
// reactstream-wrapper.js

const path = require('path');
const { spawn, exec } = require('child_process');
const { transformFileSync } = require('@babel/core');
const fs = require('fs');

// Sprawdź czy reactstream jest dostępny
const reactstreamPath = path.join(__dirname, 'node_modules', '.bin', 'reactstream');
const hasReactstream = fs.existsSync(reactstreamPath);

// Ścieżka do naszego zastępczego serwera podglądu
const previewServerPath = path.join(__dirname, 'server.js');

// Forward all arguments to the appropriate CLI
const args = process.argv.slice(2);

// Handle the analyze command specially
if (args[0] === 'analyze') {
    // Custom analyze logic
    console.log('Analyzing component...');

    // Pobierz ścieżkę pliku z argumentów
    const filePath = args[1] || path.join(__dirname, 'src', 'example.js');

    try {
        // Sprawdź czy plik istnieje
        if (!fs.existsSync(filePath)) {
            console.error(`Error: File not found: ${filePath}`);
            process.exit(1);
        }

        const result = transformFileSync(filePath, {
            presets: ['@babel/preset-env', '@babel/preset-react'],
        });

        // Wyprowadź komentarze o analizie
        console.log('Analysis completed successfully!');
        console.log('Component validation passed.');

        // Sprawdź, czy wypisać więcej szczegółów
        if (args.includes('--verbose')) {
            console.log('Transpiled code:', result.code.substring(0, 500) + '...');
        }

    } catch (error) {
        console.error('Error analyzing component:', error.message);
        process.exit(1);
    }

    process.exit(0);
} else if (args[0] === 'serve') {
    // Obsługa komendy serve - uruchomienie dev serwera

    // Pobierz ścieżkę pliku komponentu
    const componentPath = args[1];
    if (!componentPath) {
        console.error('Error: Component path is required for serve command');
        process.exit(1);
    }

    // Znajdź port w argumentach
    let port = 3010; // domyślnie 3010
    const portArg = args.find(arg => arg.startsWith('--port='));
    if (portArg) {
        port = portArg.split('=')[1];
    }

    console.log(`Starting development server for ${componentPath} on port ${port}...`);

    // Sprawdź czy reactstream jest dostępny, jeśli tak, użyj go
    if (hasReactstream) {
        try {
            const reactstream = spawn(reactstreamPath, args, { stdio: 'inherit' });

            reactstream.on('close', (code) => {
                console.log(`Development server exited with code ${code}`);
                if (code !== 0) {
                    // Jeśli reactstream zakończył się błędem, uruchom nasz zastępczy serwer
                    console.log('Falling back to simple preview server...');
                    startFallbackServer(componentPath, port);
                } else {
                    process.exit(code);
                }
            });

            reactstream.on('error', (error) => {
                console.error(`Error starting reactstream: ${error.message}`);
                console.log('Falling back to simple preview server...');
                startFallbackServer(componentPath, port);
            });
        } catch (error) {
            console.error(`Failed to start reactstream: ${error.message}`);
            console.log('Falling back to simple preview server...');
            startFallbackServer(componentPath, port);
        }
    } else {
        // Jeśli reactstream nie jest dostępny, użyj naszego zastępczego serwera
        console.log('ReactStream not found, using fallback preview server...');
        startFallbackServer(componentPath, port);
    }
} else {
    // For other commands, try to pass through to the original CLI
    if (hasReactstream) {
        const reactstream = spawn(reactstreamPath, args, { stdio: 'inherit' });

        reactstream.on('close', (code) => {
            process.exit(code);
        });
    } else {
        console.error('ReactStream not found. Only "analyze" and "serve" commands are supported in fallback mode.');
        process.exit(1);
    }
}

// Funkcja do uruchamiania zastępczego serwera podglądu
function startFallbackServer(componentPath, port) {
    // Sprawdź czy istnieje plik zastępczego serwera
    if (fs.existsSync(previewServerPath)) {
        // Uruchom zastępczy serwer
        const previewServer = spawn('node', [previewServerPath, componentPath, `--port=${port}`], {
            stdio: 'inherit'
        });

        previewServer.on('close', (code) => {
            console.log(`Fallback preview server exited with code ${code}`);
            process.exit(code);
        });
    } else {
        // Jeśli nie ma pliku serwera, utworz go
        const serverContent = `#!/usr/bin/env node
const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' }));

const componentPath = '${componentPath.replace(/\\/g, '\\\\')}';
const port = ${port};

app.get('/', (req, res) => {
  res.send(\`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Component Preview</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .code { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow: auto; }
        pre { margin: 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Component Preview</h1>
        <p>Viewing component: \${componentPath}</p>
        <div class="code">
          <pre>\${fs.readFileSync(componentPath, 'utf8')}</pre>
        </div>
      </div>
    </body>
    </html>
  \`);
});

app.get('/component-source', (req, res) => {
  try {
    const source = fs.readFileSync(componentPath, 'utf8');
    res.send(source);
  } catch (error) {
    res.status(500).send(\`Error reading component: \${error.message}\`);
  }
});

app.listen(port, () => {
  console.log(\`Preview server running at http://localhost:\${port}\`);
  console.log(\`Serving component: \${componentPath}\`);
});`;

        // Zapisz plik serwera
        const tempServerPath = path.join(__dirname, 'temp-server.js');
        fs.writeFileSync(tempServerPath, serverContent);

        // Uruchom zastępczy serwer
        const previewServer = spawn('node', [tempServerPath], {
            stdio: 'inherit'
        });

        previewServer.on('close', (code) => {
            // Usuń tymczasowy plik serwera
            try {
                fs.unlinkSync(tempServerPath);
            } catch (error) {
                console.error(`Failed to remove temp server file: ${error.message}`);
            }

            console.log(`Fallback preview server exited with code ${code}`);
            process.exit(code);
        });
    }
}
