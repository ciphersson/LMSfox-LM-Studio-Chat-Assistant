#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ExtensionBuilder {
    constructor() {
        this.projectDir = __dirname;
        this.distDir = path.join(this.projectDir, 'dist');
        this.buildDir = path.join(this.projectDir, 'build');
    }
    
    async build() {
        console.log('🚀 Building LM Studio Firefox Extension...\n');
        
        try {
            this.createDirectories();
            this.validateManifest();
            this.copyFiles();
            this.optimizeAssets();
            this.createPackage();
            
            console.log('✅ Build completed successfully!');
            console.log(`📦 Extension package: ${path.join(this.distDir, 'lm-studio-extension.xpi')}`);
            
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            process.exit(1);
        }
    }
    
    createDirectories() {
        console.log('📁 Creating build directories...');
        
        if (fs.existsSync(this.buildDir)) {
            fs.rmSync(this.buildDir, { recursive: true });
        }
        if (fs.existsSync(this.distDir)) {
            fs.rmSync(this.distDir, { recursive: true });
        }
        
        fs.mkdirSync(this.buildDir, { recursive: true });
        fs.mkdirSync(this.distDir, { recursive: true });
    }
    
    validateManifest() {
        console.log('🔍 Validating manifest...');
        
        const manifestPath = path.join(this.projectDir, 'manifest.json');
        if (!fs.existsSync(manifestPath)) {
            throw new Error('manifest.json not found');
        }
        
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        
        // Validate required fields
        const required = ['manifest_version', 'name', 'version', 'description'];
        for (const field of required) {
            if (!manifest[field]) {
                throw new Error(`Missing required field in manifest: ${field}`);
            }
        }
        
        console.log(`✓ Manifest valid - ${manifest.name} v${manifest.version}`);
    }
    
    copyFiles() {
        console.log('📋 Copying extension files...');
        
        const filesToCopy = [
            'manifest.json',
            'popup.html',
            'chat.html',
            'options.html',
            'background.js',
            'content.js',
            'content.css'
        ];
        
        const dirsToCopy = [
            'styles',
            'scripts',
            'icons'
        ];
        
        // Copy individual files
        filesToCopy.forEach(file => {
            const src = path.join(this.projectDir, file);
            const dest = path.join(this.buildDir, file);
            
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dest);
                console.log(`  ✓ ${file}`);
            } else {
                console.log(`  ⚠ ${file} not found, skipping`);
            }
        });
        
        // Copy directories
        dirsToCopy.forEach(dir => {
            const src = path.join(this.projectDir, dir);
            const dest = path.join(this.buildDir, dir);
            
            if (fs.existsSync(src)) {
                this.copyDirectory(src, dest);
                console.log(`  ✓ ${dir}/`);
            } else {
                console.log(`  ⚠ ${dir}/ not found, skipping`);
            }
        });
    }
    
    copyDirectory(src, dest) {
        fs.mkdirSync(dest, { recursive: true });
        
        const items = fs.readdirSync(src);
        items.forEach(item => {
            const srcPath = path.join(src, item);
            const destPath = path.join(dest, item);
            
            if (fs.statSync(srcPath).isDirectory()) {
                this.copyDirectory(srcPath, destPath);
            } else {
                fs.copyFileSync(srcPath, destPath);
            }
        });
    }
    
    optimizeAssets() {
        console.log('⚡ Optimizing assets...');
        
        // Minify CSS files (simple regex-based minification)
        const cssFiles = this.findFiles(this.buildDir, '.css');
        cssFiles.forEach(file => {
            let content = fs.readFileSync(file, 'utf8');
            
            // Remove comments and extra whitespace
            content = content
                .replace(/\/\*[\s\S]*?\*\//g, '')
                .replace(/\s+/g, ' ')
                .replace(/;\s*}/g, '}')
                .replace(/{\s*/g, '{')
                .replace(/;\s*/g, ';')
                .trim();
            
            fs.writeFileSync(file, content);
        });
        
        console.log(`  ✓ Optimized ${cssFiles.length} CSS files`);
    }
    
    createPackage() {
        console.log('📦 Creating extension package...');
        
        try {
            // Use web-ext if available
            execSync('web-ext build --source-dir build --artifacts-dir dist --overwrite-dest', {
                cwd: this.projectDir,
                stdio: 'pipe'
            });
            
            // Rename to .xpi
            const builtFiles = fs.readdirSync(this.distDir);
            const zipFile = builtFiles.find(f => f.endsWith('.zip'));
            
            if (zipFile) {
                const oldPath = path.join(this.distDir, zipFile);
                const newPath = path.join(this.distDir, 'lm-studio-extension.xpi');
                fs.renameSync(oldPath, newPath);
            }
            
        } catch (error) {
            // Fallback: create zip manually
            console.log('  ⚠ web-ext not available, creating manual package...');
            this.createManualPackage();
        }
    }
    
    createManualPackage() {
        const archiver = require('archiver');
        const output = fs.createWriteStream(path.join(this.distDir, 'lm-studio-extension.xpi'));
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        output.on('close', () => {
            console.log(`  ✓ Package created (${archive.pointer()} bytes)`);
        });
        
        archive.on('error', (err) => {
            throw err;
        });
        
        archive.pipe(output);
        archive.directory(this.buildDir, false);
        archive.finalize();
    }
    
    findFiles(dir, extension) {
        const files = [];
        
        function traverse(currentDir) {
            const items = fs.readdirSync(currentDir);
            items.forEach(item => {
                const fullPath = path.join(currentDir, item);
                if (fs.statSync(fullPath).isDirectory()) {
                    traverse(fullPath);
                } else if (fullPath.endsWith(extension)) {
                    files.push(fullPath);
                }
            });
        }
        
        traverse(dir);
        return files;
    }
}

// Run if called directly
if (require.main === module) {
    new ExtensionBuilder().build();
}

module.exports = ExtensionBuilder;
