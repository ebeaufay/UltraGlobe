// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';

// Import ESBuild polyfill plugins
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import inject from '@rollup/plugin-inject';

export default defineConfig({
  // Define the root directory (default is the current working directory)
  root: process.cwd(),

  // Base public path when served in development or production
  base: './',

  worker: {
    format: 'es',
  },

  plugins: [
    // Inject global variables where needed
    inject({
      // Automatically inject `process` and `Buffer` where they are used
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
  ],

  // Configure the development server
  server: {
    port: 3000,       // Change the port if needed
    open: true,       // Automatically open the app in the browser
    // proxy: { ... }, // Set up proxy if you're making API calls
  },

  build: {
    outDir: 'dist',            // Output directory
    target: 'esnext',          // JavaScript language target
    sourcemap: true,           // Generate source maps
    minify: 'esbuild',         // Minifier to use ('esbuild', 'terser', or false)
    emptyOutDir: true,         // Empty the output directory before building
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'), // Entry point
      plugins: [
        // Inject plugin to handle globals during build
        inject({
          process: 'process/browser',
          Buffer: ['buffer', 'Buffer'],
        }),
      ],
    },
  },

  resolve: {
    alias: {
      // Polyfill Node.js globals
      global: 'globalThis',
      process: 'process/browser',
      buffer: 'buffer',

      ...NodeModulesPolyfillPlugin({
      }),
    },
  },

  define: {
    global: 'globalThis',
    'process.env': '{}',
  },

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'three',
      'process',
      'buffer',
      'typedarray-pool',
      'box-intersect',
      'clean-pslg',
      // Add other Node.js specific packages here
    ], // Pre-bundle dependencies for faster dev server start
    esbuildOptions: {
      // Configure ESBuild to use the polyfill plugins
      define: {
        global: 'globalThis',
        'process.env': '{}',
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          buffer: true,
          process: true,
        }),
        NodeModulesPolyfillPlugin(),
      ],
      // Enable browser field in package.json to prefer browser-specific modules
      // This is enabled by default in Vite
    },
  },

  // Define how assets are handled
  assetsInclude: [
    '**/*.gltf',
    '**/*.glb',
    '**/*.hdr',
    '**/*.bin',
  ], // Include 3D model formats
});
