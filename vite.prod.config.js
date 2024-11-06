// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';
import terser from '@rollup/plugin-terser';
import libAssetsPlugin from '@laynezh/vite-plugin-lib-assets'
// Import ESBuild polyfill plugins
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill';
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill';
import inject from '@rollup/plugin-inject';

export default defineConfig({
  define: {
    global: 'globalThis',
    'process.env': '{}',
  },
  resolve: {
    alias: {
      'process/browser': 'process/browser',
      global: 'globalThis',
      process: 'process/browser',
      buffer: 'buffer',
      // Polyfill Node.js core modules
      ...NodeModulesPolyfillPlugin(),
    },
  },
  optimizeDeps: {
    include: [
      'three',
      'process',
      'buffer',
      'typedarray-pool',
      'box-intersect',
      'clean-pslg',
    ],
    esbuildOptions: {
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
    },
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/entry.js'), // Library entry point
      name: 'ultraglobe',
      fileName: (format) => `ultraglobe.${format}.js`,
      formats: ['es', 'cjs', 'umd'], // Desired formats
    },
    outDir: 'dist',
    sourcemap: true,
    minify: 'esbuild',
    emptyOutDir: true,
    // Disable inlining of assets
    assetsInlineLimit: 0,
    rollupOptions: {
      // Externalize only dependencies, not assets
      external: ['three', 'proj4', 'epsg-index'],
      output: {
        globals: {
          three: 'THREE',
        },
        // Output assets to the 'assets' folder
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [
    // Inject global variables
    libAssetsPlugin({
      include: /\.(gltf|glb|hdr|bin|png|jpe?g|svg|gif|ktx2)(\?.*)?$/,
      limit: 1024 * 8
    }),
    inject({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    // Minify the output
    terser({
      maxWorkers: 4,
    }),
  ],
  assetsInclude: [
    '**/*.gltf',
    '**/*.glb',
    '**/*.hdr',
    '**/*.bin',
    '**/*.png',
    '**/*.jpg',
    '**/*.jpeg',
    '**/*.svg',
    '**/*.gif',
    '**/*.ktx2',
  ],
});
