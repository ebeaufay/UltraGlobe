const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const ImageMinimizerPlugin = require("image-minimizer-webpack-plugin");

const sourceDir = path.resolve(__dirname);
const DEFAULT_WEBPACK_PORT = 3001;

module.exports = {
  mode: "production",
  entry: './src/entry.js',

  output: {
    filename: "ultraglobe.min.js",
    path: path.resolve(__dirname, 'dist'),
    globalObject: 'this',
    library: {
      name: 'ultraglobe',
      type: 'umd',
    },
  },
  externals: [
    /^three($|\/)/,        // Externalize 'three' and all its subpaths
    /^proj4($|\/)/,        // Externalize 'proj4' and all its subpaths
    /^epsg-index($|\/)/,   // Externalize 'epsg-index' and all its subpaths
  ],
  plugins: [
    //new BundleAnalyzerPlugin(),
    new webpack.ProgressPlugin(),
    new MiniCssExtractPlugin({
      filename: "[name].bundle.[hash].css"
    }),
    new CopyPlugin({
      patterns: [
        { from: "node_modules/three/examples/jsm/libs/draco", to: "draco-decoders" },
        { from: "node_modules/three/examples/jsm/libs/basis", to: "ktx2-decoders" }
      ],
    }),
  ],

  devtool: "source-map",

  module: {
    rules: [
      {
        test: /\.s[ac]ss$/,
        use: [
          // inserts <link/> tag to generated CSS file, inside the generated index.html
          { loader: MiniCssExtractPlugin.loader },
          "css-loader",
          "resolve-url-loader",
          // Compiles Sass to CSS
          {
            loader: "sass-loader",
            options: {
              sourceMap: true // resolve-url-loader needs sourcemaps, regardless of devtool (cf. resolve-url-loader's README)
            }
          }
        ]
      },
      {
        test: /\.css$/i,
        use: [
          { loader: MiniCssExtractPlugin.loader },
          "style-loader",
          "css-loader",
        ]
      },
      {
        test: /\.html$/i,
        loader: "html-loader"
      },
      { // loader for fonts
        test: /\.(eot|woff|woff2|otf|ttf|svg)$/,
        use: [{
          loader: "file-loader",
          options: {
            name: "fonts/[name].[ext]"
          }
        }]
      },
      { // loader for shaders
        test: /\.glsl$/,
        loader: 'webpack-glsl-loader'
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ktx2|bin)$/i,
        type: 'asset', // Use 'asset' which automatically chooses between 'inline' and 'resource'
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024, // 8 KB
          },
        },
        generator: {
          filename: 'assets/[hash][ext][query]',
        },
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            presets: [
              ["@babel/preset-env", {
                modules: false, // Preserve ES6 modules for tree shaking
                targets: "> 0.25%, not dead" // Adjust based on your support matrix
              }],
              "@babel/preset-react",
              "@babel/preset-typescript"
            ],
          },
        },
      },

      {
        test: /\.wasm$/,
        type: "webassembly/async",
      },
      {
        test: /\.worker\.js$/,
        loader: 'worker-loader',
        /* options: {
          inline: 'no-fallback', // You can also set `inline: 'no-fallback'` to inline the worker completely
        }, */
      },
    ],
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      parallel: true,
      terserOptions: {
        ecma: undefined,
        parse: {},
        compress: {},
        format: {
          comments: false, // Remove comments
        },
        mangle: true, // Note `mangle.properties` is `false` by default.
        module: false,
        // Deprecated
        output: null,
        format: null,
        toplevel: false,
        nameCache: null,
        ie8: false,
        keep_classnames: undefined,
        keep_fnames: false,
        safari10: false,
      },
      exclude: []
    }),
    new ImageMinimizerPlugin({
      minimizer: {
        implementation: ImageMinimizerPlugin.imageminMinify,
        options: {

          plugins: [
            ["gifsicle", { interlaced: true }],
            ["jpegtran", { progressive: true }],
            ["optipng", { optimizationLevel: 5 }],
            [
              "svgo",
              {
                plugins: [
                  {
                    name: "preset-default",
                    params: {
                      overrides: {
                        removeViewBox: false,
                        addAttributesToSVGElement: {
                          params: {
                            attributes: [
                              { xmlns: "http://www.w3.org/2000/svg" },
                            ],
                          },
                        },
                      },
                    },
                  },
                ],
              },
            ],
          ],
        },
      },
    })
    ]
  },
  devServer: {
    hot: true,
    open: true,
    port: DEFAULT_WEBPACK_PORT
  },
  resolve: {
    alias: {
      three: path.resolve('./node_modules/three'),
    },
    extensions: [".js", ".jsx", ".json", ".ts", ".tsx"],// other stuff
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify")
    }
  },
  experiments: {
    asyncWebAssembly: true,
  },
};
